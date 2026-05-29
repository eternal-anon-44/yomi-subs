// Offscreen document — runs in a hidden page that has full Web API access.
// Handles MediaRecorder, chunking, transcription (local WebSocket or OpenAI),
// and optional live translation (Google Translate API).

let mediaRecorder = null;
let socket = null;
let chunkInterval = null;
let targetTabId = null;
let currentSettings = {};
let audioCtx = null;

// ── Message bus ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === "start_recording") {
    currentSettings = message.settings || {};
    targetTabId = message.targetTabId;
    await beginRecording(message.streamId);
  } else if (message.action === "stop_recording") {
    cleanup();
  }
});

// ── Setup ────────────────────────────────────────────────────────────────────

async function beginRecording(streamId) {
  sendStatus("connecting");

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
  } catch (err) {
    sendStatus("error:mic_access_denied");
    return;
  }

  // Route audio back to the tab's speakers so the user can still hear it.
  // Disable via Settings if the user wants silent (headless) transcription.
  if (currentSettings.audioMonitor !== false) {
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(audioCtx.destination);
  }

  const mode = currentSettings.mode || "local";
  if (mode === "openai") {
    startOpenAIMode(stream);
  } else {
    startLocalMode(stream);
  }
}

// ── Local mode — faster-whisper WebSocket ────────────────────────────────────

function startLocalMode(stream) {
  const wsUrl = currentSettings.wsUrl || "ws://localhost:8765";
  const chunkMs = (currentSettings.chunkDuration || 2) * 1000;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    sendStatus("recording");
    setupChunkedRecorder(stream, chunkMs, (blob) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(blob);
        sendStatus("processing");
      }
    });
  };

  socket.onerror = () => {
    sendStatus("error:ws_connection_failed");
    cleanup();
  };

  socket.onclose = (evt) => {
    // Code 1000 = normal close triggered by stopCapture
    if (evt.code !== 1000) sendStatus("error:ws_disconnected");
  };

  socket.onmessage = async (evt) => {
    const text = evt.data?.trim();
    if (!text) return;
    sendStatus("recording");
    const translation = await maybeTranslate(text);
    forwardSubtitle(text, translation);
  };
}

// ── OpenAI API mode ──────────────────────────────────────────────────────────

function startOpenAIMode(stream) {
  const apiKey = currentSettings.openaiApiKey;
  if (!apiKey) {
    sendStatus("error:no_api_key");
    cleanup();
    return;
  }

  // OpenAI requires a minimum ~0.1 s of audio; 4 s chunks give good accuracy.
  const chunkMs = (currentSettings.chunkDurationOpenAI || 4) * 1000;
  sendStatus("recording");

  setupChunkedRecorder(stream, chunkMs, async (blob) => {
    sendStatus("processing");
    try {
      const text = await callWhisperAPI(blob, apiKey);
      if (text?.trim()) {
        sendStatus("recording");
        const translation = await maybeTranslate(text.trim());
        forwardSubtitle(text.trim(), translation);
      } else {
        sendStatus("recording");
      }
    } catch (err) {
      console.error("[YomiSubs] OpenAI error:", err.message);
      sendStatus(`error:${err.message.slice(0, 60)}`);
      // Don't cleanup — transient errors (rate limit) should self-recover.
    }
  });
}

async function callWhisperAPI(audioBlob, apiKey) {
  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  form.append("model", "whisper-1");
  form.append("language", "ja");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

// ── Google Translate ──────────────────────────────────────────────────────────

// Returns the translated string, or null if translation is disabled / fails.
// Errors are non-fatal — the Japanese subtitle is always shown regardless.
async function maybeTranslate(text) {
  if (!currentSettings.translateEnabled) return null;
  const key = currentSettings.googleApiKey?.trim();
  if (!key) return null;

  try {
    return await callGoogleTranslate(text, currentSettings.targetLang || "en", key);
  } catch (err) {
    console.warn("[YomiSubs] Translation error (non-fatal):", err.message);
    return null;
  }
}

async function callGoogleTranslate(text, targetLang, apiKey) {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "ja",
        target: targetLang,
        format: "text"
      })
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data?.translations?.[0]?.translatedText ?? null;
}

// ── Shared recording helper ───────────────────────────────────────────────────

// Continuously records in fixed-length chunks and calls onChunk(blob) for each.
// Uses a stop/start cycle so we never miss audio between chunks.
function setupChunkedRecorder(stream, chunkMs, onChunk) {
  const mimeType = "audio/webm;codecs=opus";
  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (evt) => {
    if (evt.data.size > 0) onChunk(evt.data);
  };

  mediaRecorder.start();

  chunkInterval = setInterval(() => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      mediaRecorder.start();
    }
  }, chunkMs);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function cleanup() {
  if (chunkInterval) { clearInterval(chunkInterval); chunkInterval = null; }
  if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
  mediaRecorder = null;
  if (socket) { socket.close(1000, "stop"); socket = null; }
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendStatus(status) {
  chrome.runtime.sendMessage({ action: "status_update", status }).catch(() => {});
}

function forwardSubtitle(text, translation = null) {
  chrome.runtime.sendMessage({
    action: "forward_subtitle",
    targetTabId,
    text,
    translation
  }).catch(() => {});
}
