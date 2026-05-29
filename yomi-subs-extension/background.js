// Service worker — coordinates tabCapture, offscreen document, and subtitle routing.
// All chrome.offscreen calls live here; the offscreen document handles the actual MediaRecorder.

let capturingTabId = null;
let isRecording = false;

// ── Message bus ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  switch (message.action) {
    case "start":
      handleStart(message);
      break;
    case "stop":
      handleStop();
      break;
    case "forward_subtitle":
      chrome.tabs.sendMessage(message.targetTabId, {
        action: "new_subtitle",
        text: message.text,
        translation: message.translation ?? null
      }).catch(() => {});
      break;
    case "status_update":
      // Relay status to popup (popup may or may not be open — ignore errors)
      broadcastStatus(message.status);
      break;
  }
  return false;
});

// ── Keyboard shortcut ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-transcription") {
    if (isRecording) {
      handleStop();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const settings = await loadSettings();
        handleStart({
          tabId: tab.id,
          delayVideo: settings.delayVideo,
          delayValue: settings.delayValue,
          settings
        });
      }
    }
  } else if (command === "toggle-overlay") {
    // Hide/show the overlay without stopping transcription
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle_overlay" }).catch(() => {});
    }
  }
});

// ── Core logic ───────────────────────────────────────────────────────────────

async function handleStart(message) {
  capturingTabId = message.tabId;
  isRecording = true;

  const settings = message.settings || (await loadSettings());

  chrome.tabs.sendMessage(capturingTabId, {
    action: "init_sync",
    delayVideo: message.delayVideo ?? settings.delayVideo,
    delayValue: message.delayValue ?? settings.delayValue,
    settings
  }).catch(() => {});

  await startCapture(capturingTabId, settings);
}

async function handleStop() {
  isRecording = false;

  // Tell the offscreen document to stop its MediaRecorder / WebSocket
  chrome.runtime.sendMessage({ action: "stop_recording" }).catch(() => {});

  try {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) await chrome.offscreen.closeDocument();
  } catch (_) {}

  capturingTabId = null;
  broadcastStatus("stopped");
}

async function startCapture(tabId, settings) {
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(id);
      }
    });
  }).catch((err) => {
    broadcastStatus(`error:${err.message}`);
    return null;
  });

  if (!streamId) return;

  const hasDocument = await chrome.offscreen.hasDocument();
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: "Capturing tab audio for Japanese transcription"
    });
  }

  chrome.runtime.sendMessage({
    action: "start_recording",
    streamId,
    targetTabId: tabId,
    settings
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadSettings() {
  return chrome.storage.sync.get({
    mode: "local",
    openaiApiKey: "",
    wsUrl: "ws://localhost:8765",
    chunkDuration: 2,
    chunkDurationOpenAI: 4,
    delayVideo: true,
    delayValue: 2.0,
    fontSize: 34,
    subtitlePosition: "bottom",
    ocrMode: false,
    audioMonitor: true,
    translateEnabled: false,
    googleApiKey: "",
    targetLang: "en"
  });
}

function broadcastStatus(status) {
  // chrome.runtime.sendMessage to popup — fails silently if popup is closed
  chrome.runtime.sendMessage({ action: "status_update", status }).catch(() => {});
}
