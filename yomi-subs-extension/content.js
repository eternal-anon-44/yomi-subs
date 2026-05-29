// Injected into every page — renders the subtitle overlay and handles
// the optional video auto-sync feature.

let container = document.getElementById("yomi-subs-container");
if (!container) {
  container = document.createElement("div");
  container.id = "yomi-subs-container";
}

let shouldApplyVideoDelay = false;
let currentDelayValue = 2.0;
let overlayVisible = true;

// ── Message handlers ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  switch (message.action) {
    case "init_sync":
      shouldApplyVideoDelay = message.delayVideo;
      currentDelayValue = message.delayValue;
      applyDisplaySettings(message.settings || {});
      break;

    case "update_settings":
      applyDisplaySettings(message.settings || {});
      break;

    case "new_subtitle":
      if (overlayVisible) handleNewSubtitle(message.text);
      break;

    case "toggle_overlay":
      overlayVisible = !overlayVisible;
      if (!overlayVisible) {
        clearTimeout(window._yomiTimeout);
        container.innerHTML = "";
        container.style.display = "none";
      } else {
        container.style.display = "";
      }
      break;
  }
});

// ── Subtitle rendering ────────────────────────────────────────────────────────

function handleNewSubtitle(text) {
  // Auto-sync: rewind video once so the first subtitle aligns with the dialogue.
  if (shouldApplyVideoDelay) {
    const video = document.querySelector("video");
    if (video && !video.paused && video.currentTime > currentDelayValue) {
      video.currentTime -= currentDelayValue;
      shouldApplyVideoDelay = false;
    }
  }

  positionContainer();
  renderSubtitle(text);
}

function renderSubtitle(text) {
  // Use textContent (not innerHTML) to prevent XSS from transcribed content
  container.innerHTML = "";
  const span = document.createElement("span");
  span.className = "yomi-subtitle-text";
  span.textContent = text;
  container.appendChild(span);

  clearTimeout(window._yomiTimeout);
  window._yomiTimeout = setTimeout(() => {
    container.innerHTML = "";
  }, 6000);
}

// ── Positioning ───────────────────────────────────────────────────────────────

function positionContainer() {
  let target = document.body;

  // Prefer fullscreen element, then the video's parent
  if (document.fullscreenElement) {
    target = document.fullscreenElement;
  } else {
    const video = document.querySelector("video");
    if (video?.parentElement) {
      target = video.parentElement;
      // Need a positioned ancestor for absolute children to work correctly
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
      }
    }
  }

  if (container.parentElement !== target) {
    target.appendChild(container);
  }
}

// Keep container in the right spot when the user enters/exits fullscreen
document.addEventListener("fullscreenchange", () => {
  if (container.innerHTML) positionContainer();
});

// ── Settings → CSS custom properties ─────────────────────────────────────────

function applyDisplaySettings(settings) {
  if (settings.fontSize) {
    container.style.setProperty("--yomi-font-size", settings.fontSize + "px");
  }
  if (settings.subtitlePosition) {
    container.dataset.position = settings.subtitlePosition;
  }
  container.classList.toggle("yomi-ocr-mode", !!settings.ocrMode);
}
