// Popup controller — loads/saves settings, drives the UI, relays start/stop.

const DEFAULTS = {
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
  audioMonitor: true
};

// ── Element refs ──────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const statusDot  = $("statusDot");
const statusText = $("statusText");
const startBtn   = $("startBtn");
const stopBtn    = $("stopBtn");
const delaySlider = $("delaySlider");
const delayVal   = $("delayVal");
const syncDelay  = $("syncDelay");

// Settings panel
const modeLocal    = $("modeLocal");
const modeOpenAI   = $("modeOpenAI");
const localPanel   = $("localPanel");
const openaiPanel  = $("openaiPanel");
const wsUrlInput   = $("wsUrl");
const apiKeyInput  = $("apiKey");
const toggleKey    = $("toggleKey");
const openaiChunk  = $("openaiChunk");
const openaiChunkVal = $("openaiChunkVal");
const fontSizeSlider = $("fontSize");
const fontSizeVal  = $("fontSizeVal");
const positionSel  = $("subtitlePosition");
const ocrMode      = $("ocrMode");
const audioMonitor = $("audioMonitor");
const saveBtn      = $("saveBtn");
const saveStatus   = $("saveStatus");

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Status display ────────────────────────────────────────────────────────────

const STATUS_MAP = {
  connecting: { cls: "conn",    text: "Connecting…" },
  recording:  { cls: "rec",     text: "Recording" },
  processing: { cls: "proc",    text: "Processing…" },
  stopped:    { cls: "stopped", text: "Stopped" },
  ready:      { cls: "ready",   text: "Ready" }
};

function setStatus(raw) {
  const key = raw?.startsWith("error:") ? "error" : raw;
  if (key === "error") {
    statusDot.className = "status-dot error";
    statusText.textContent = "Error: " + raw.slice(6);
    statusText.style.color = "#f4a261";
    return;
  }
  const s = STATUS_MAP[key] || STATUS_MAP.ready;
  statusDot.className = `status-dot ${s.cls}`;
  statusText.textContent = s.text;
  statusText.style.color = "";
}

// Receive status updates pushed from the background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "status_update") setStatus(msg.status);
});

// ── Load settings into UI ─────────────────────────────────────────────────────

async function loadSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);

  (s.mode === "openai" ? modeOpenAI : modeLocal).checked = true;
  toggleModePanel(s.mode);

  wsUrlInput.value     = s.wsUrl;
  apiKeyInput.value    = s.openaiApiKey;
  delaySlider.value    = s.delayValue;
  delayVal.textContent = parseFloat(s.delayValue).toFixed(1) + " s";
  syncDelay.checked    = s.delayVideo;

  openaiChunk.value          = s.chunkDurationOpenAI;
  openaiChunkVal.textContent = s.chunkDurationOpenAI + " s";

  fontSizeSlider.value    = s.fontSize;
  fontSizeVal.textContent = s.fontSize + " px";

  positionSel.value    = s.subtitlePosition;
  ocrMode.checked      = s.ocrMode;
  audioMonitor.checked = s.audioMonitor;

  return s;
}

// ── Save settings ─────────────────────────────────────────────────────────────

async function saveSettings() {
  const mode = document.querySelector("input[name='mode']:checked").value;
  const settings = {
    mode,
    openaiApiKey:       apiKeyInput.value.trim(),
    wsUrl:              wsUrlInput.value.trim() || DEFAULTS.wsUrl,
    chunkDuration:      parseFloat(delaySlider.value),
    chunkDurationOpenAI: parseInt(openaiChunk.value, 10),
    delayVideo:         syncDelay.checked,
    delayValue:         parseFloat(delaySlider.value),
    fontSize:           parseInt(fontSizeSlider.value, 10),
    subtitlePosition:   positionSel.value,
    ocrMode:            ocrMode.checked,
    audioMonitor:       audioMonitor.checked
  };

  await chrome.storage.sync.set(settings);

  // Push display changes to any active content scripts immediately
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: "update_settings", settings }).catch(() => {});
  }

  saveStatus.textContent = "✓ Saved";
  setTimeout(() => { saveStatus.textContent = ""; }, 2000);

  return settings;
}

// ── Mode panel toggle ─────────────────────────────────────────────────────────

function toggleModePanel(mode) {
  localPanel.style.display  = mode === "local"  ? "block" : "none";
  openaiPanel.style.display = mode === "openai" ? "block" : "none";
}

modeLocal.addEventListener("change",  () => toggleModePanel("local"));
modeOpenAI.addEventListener("change", () => toggleModePanel("openai"));

// ── Live slider labels ────────────────────────────────────────────────────────

delaySlider.addEventListener("input", () => {
  delayVal.textContent = parseFloat(delaySlider.value).toFixed(1) + " s";
});

openaiChunk.addEventListener("input", () => {
  openaiChunkVal.textContent = openaiChunk.value + " s";
});

fontSizeSlider.addEventListener("input", () => {
  fontSizeVal.textContent = fontSizeSlider.value + " px";
});

// ── API key visibility toggle ─────────────────────────────────────────────────

toggleKey.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleKey.textContent = isPassword ? "🙈" : "👁";
});

// ── Start / Stop ──────────────────────────────────────────────────────────────

startBtn.addEventListener("click", async () => {
  const settings = await saveSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  setStatus("connecting");
  chrome.runtime.sendMessage({
    action: "start",
    tabId: tab.id,
    delayVideo: settings.delayVideo,
    delayValue: settings.delayValue,
    settings
  });
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stop" });
  setStatus("stopped");
});

saveBtn.addEventListener("click", saveSettings);

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
