# 字 Yomi-Subs v2

**Real-time Japanese transcription overlay for any browser tab.**

Yomi-Subs captures audio from any Chrome tab and overlays live Japanese subtitles directly on the video — no third-party caption service required. Compatible with [Yomitan](https://github.com/themoeway/yomitan) for instant hover lookups.

<!-- Replace with a real screenshot -->
> 📸 _Screenshots coming soon — see [store-assets/](store-assets/) for the store listing._

---

## Features

| Feature | Detail |
|---------|--------|
| 🎌 Real-time Japanese subs | Sub-2-second latency in local mode |
| 🤖 Dual transcription backend | Local faster-whisper **or** OpenAI Whisper API |
| 📖 Yomitan-compatible | Hover-lookup works on rendered subtitles |
| 📸 OCR mode | High-contrast, blur-free overlay for screenshot OCR |
| ⌨️ Keyboard shortcut | `Alt+Shift+T` to toggle on/off |
| 🎛 Settings panel | Font size, position, chunk duration, API key |
| 🔄 Video auto-sync | Rewinds video to align with first subtitle |
| 🔇 Silent mode | Optional — disable audio monitor for headless use |

---

## How it works

```
Browser tab audio
       │
       ▼
 Chrome Extension (tabCapture + offscreen MediaRecorder)
       │
  ┌────┴────────────────────────────────┐
  │ Local mode          OpenAI API mode │
  │ WebSocket → Python  HTTPS → OpenAI  │
  │ faster-whisper      whisper-1 model │
  └────────────────────────────────────┘
       │
       ▼
  Japanese text → content.js → subtitle overlay
```

---

## Installation

### Quickest way — download the release ZIP

1. Go to the [Releases page](https://github.com/eternal-anon-44/yomi-subs/releases)
2. Download **`extension-v2.zip`** from the latest release
3. Unzip it anywhere on your machine
4. Open Chrome → `chrome://extensions/`
5. Enable **Developer mode** (toggle, top-right corner)
6. Click **Load unpacked** → select the `yomi-subs-extension/` folder inside the unzipped folder
7. The Yomi-Subs icon appears in your toolbar

### From source

```bash
git clone https://github.com/eternal-anon-44/yomi-subs.git
```

Then follow steps 4–7 above, pointing Load unpacked at `yomi-subs/yomi-subs-v2/yomi-subs-extension/`.

---

## Setup — Local backend (recommended)

The local backend runs faster-whisper on your own hardware. No API key needed.

### macOS
Double-click **`Launch-TranscribeJP.app`** in the project folder.  
On first run it creates a Python virtualenv and installs all dependencies automatically.

> If macOS says "unidentified developer": right-click → Open → Open anyway.  
> The app is ad-hoc signed with `codesign --sign -`.

### Windows
Run **`Yomi-Subs-Launcher.exe`** (build it with `build-exe.bat` if it doesn't exist),  
or right-click `launcher.ps1` → **Run with PowerShell**.

### Linux / advanced
```bash
bash start.sh
```

### Requirements
- Python 3.9 or higher
- CUDA GPU (optional — auto-detected; falls back to CPU int8)

---

## Setup — OpenAI Whisper API mode

No local backend needed. Audio is sent to OpenAI's API from the extension directly.

1. Get an API key from <https://platform.openai.com>
2. Click the Yomi-Subs toolbar icon → **Settings** tab
3. Select **OpenAI Whisper API**
4. Paste your API key (stored locally in Chrome's encrypted storage)
5. Click **Save Settings**

Costs roughly **$0.006 per minute** of audio at current OpenAI pricing.

---

## Configuration

All settings are in the extension popup → **Settings** tab:

| Setting | Default | Description |
|---------|---------|-------------|
| Mode | Local | `local` = faster-whisper backend, `openai` = OpenAI API |
| WebSocket URL | `ws://localhost:8765` | URL of the local backend |
| OpenAI API key | _(empty)_ | Your OpenAI key for API mode |
| Chunk duration (local) | 2 s | Audio chunk size — lower = more responsive |
| Chunk duration (OpenAI) | 4 s | Minimum 3 s recommended for API mode |
| Font size | 34 px | Subtitle font size |
| Subtitle position | Bottom | Top / Center / Bottom |
| OCR mode | Off | High-contrast overlay for external OCR tools |
| Audio monitor | On | Route tab audio through speakers (disable for silent mode) |

### Keyboard shortcut
`Alt+Shift+T` — toggles transcription on/off globally.  
Customise in `chrome://extensions/shortcuts`.

---

## Backend configuration

Edit the constants at the top of `yomi-subs-backend/server.py`:

```python
WS_HOST      = "localhost"
WS_PORT      = 8765
WHISPER_MODEL = "small"   # tiny / base / small / medium / large-v3
BEAM_SIZE    = 2          # lower = faster, higher = more accurate
```

---

## Project structure

```
yomi-subs-v2/
├── yomi-subs-extension/    Chrome extension (load this folder in Chrome)
│   ├── manifest.json
│   ├── background.js       Service worker — tabCapture, keyboard shortcut
│   ├── offscreen.js        MediaRecorder + WebSocket / OpenAI API
│   ├── content.js          Subtitle overlay renderer
│   ├── content.css         Subtitle styles + OCR mode
│   ├── popup.html/.js      Settings & control UI
│   └── icons/              Placeholder icons (replace before publishing)
├── yomi-subs-backend/
│   ├── server.py           Python WebSocket server with faster-whisper
│   └── requirements.txt
├── store-assets/           Chrome Web Store submission materials
├── Launch-TranscribeJP.app macOS launcher (ad-hoc signed)
├── launcher.ps1            Windows PowerShell launcher
├── build-exe.bat           Compiles launcher.ps1 → .exe via ps2exe
├── start.sh                Linux / universal launcher
├── .env.example            Environment variable reference
└── README.md
```

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first.

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Keep JS files as plain ES2022 (no bundler needed — Chrome loads them directly)
3. Keep Python code compatible with Python 3.9+
4. Test with both `local` and `openai` modes before submitting
5. Open a PR against `main`

---

## Roadmap

- [ ] Live Japanese → English translation overlay (Google Translate API)
- [ ] Subtitle history panel / export to SRT
- [ ] Furigana rendering for kanji-heavy output
- [ ] Firefox port

---

## License

[MIT](LICENSE) — © 2026 eternal-anon-44
