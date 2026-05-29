# Chrome Web Store Listing — Yomi-Subs

## Extension name
**Yomi-Subs: Real-Time Japanese Transcription**

---

## Short description (132 chars max)
Live Japanese subtitles on any video tab — powered by local Whisper AI or OpenAI API. Yomitan-compatible overlay.

_(131 chars — within limit)_

---

## Full description

Yomi-Subs captures the audio from any browser tab and displays real-time Japanese subtitles as a clean, selectable overlay directly on the video — no third-party caption service required.

**How it works**

Two transcription modes are supported:

- **Local mode (default)** — Audio is sent to a local Python server running [faster-whisper](https://github.com/SYSTRAN/faster-whisper) on your own machine. Nothing leaves your computer. Supports GPU acceleration automatically.
- **OpenAI Whisper API mode** — Audio chunks are sent securely to OpenAI's Whisper API using your own API key. No backend installation needed.

**Features**

- 🎌 Real-time Japanese subtitles with sub-2-second latency (local mode)
- 📖 Yomitan-compatible — hover any character to look up words instantly
- 📸 OCR mode — high-contrast, blur-free overlay for screenshot-based OCR tools
- ⌨️ Keyboard shortcut: Alt+Shift+T to toggle transcription
- ⚙️ Configurable: font size, subtitle position (top/center/bottom), chunk duration
- 🔑 OpenAI API key stored securely in Chrome's sync storage — never hardcoded
- 🎯 Auto-sync: automatically rewinds video to align first subtitle with dialogue
- 🔇 Optional silent mode: disable audio monitor for headless transcription

**Requirements (local mode)**

- Python 3.9+ installed on your machine
- Run the included `Launch-TranscribeJP.app` (macOS) or `Yomi-Subs-Launcher.exe` (Windows)
- The launcher automatically creates a Python virtualenv and installs all dependencies

**Privacy**

- Local mode: all audio is processed on your own hardware. Zero data sent externally.
- OpenAI mode: audio chunks are sent to OpenAI's API per their [privacy policy](https://openai.com/policies/privacy-policy). No data is stored by this extension.
- No analytics, no tracking, no third-party services beyond the optional OpenAI API.

---

## Category
**Productivity** _(or "Accessibility")_

---

## Primary language
English

## Supported languages
Japanese (transcription output), English (UI)

---

## Privacy practices disclosure

| Data type | Collected | Explanation |
|-----------|-----------|-------------|
| Tab audio | Processed locally or via OpenAI API | Only the active tab's audio is captured while recording is active |
| OpenAI API key | Stored in chrome.storage.sync | Never transmitted anywhere except directly to api.openai.com |
| Subtitles / transcriptions | Not stored | Displayed transiently; discarded after 6 seconds |
| Personal data | None collected | — |

**Does the extension use remote code?** No.
**Does the extension modify web request headers?** No.
**Does the extension collect user data for sale?** No.
