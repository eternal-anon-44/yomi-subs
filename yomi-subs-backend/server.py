"""
Yomi-Subs v2 — Local Transcription Backend
Runs a WebSocket server that receives raw audio chunks (webm/opus) from the
Chrome extension, transcribes them with faster-whisper, and returns Japanese text.

Requires: pip install -r requirements.txt
"""

import asyncio
import io
import sys
import threading
import tkinter as tk
from tkinter import scrolledtext

import av
import numpy as np
import websockets
from faster_whisper import WhisperModel

# ── Configuration ─────────────────────────────────────────────────────────────

WS_HOST = "localhost"
WS_PORT = 8765
WHISPER_MODEL = "small"   # tiny / base / small / medium / large-v3
BEAM_SIZE = 2             # lower = faster, higher = more accurate


# ── GUI ───────────────────────────────────────────────────────────────────────

class StdoutRedirect:
    """Redirect stdout/stderr to a tkinter ScrolledText widget."""
    def __init__(self, widget: scrolledtext.ScrolledText):
        self.widget = widget

    def write(self, text: str):
        self.widget.insert(tk.END, text)
        self.widget.see(tk.END)

    def flush(self):
        pass


class YomiSubsApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Yomi-Subs v2 — Local Backend")
        self.root.geometry("620x520")
        self.root.configure(bg="#0f0f13")
        self.root.resizable(True, True)

        self.model: WhisperModel | None = None
        self.server_thread: threading.Thread | None = None
        self.loop: asyncio.AbstractEventLoop | None = None
        self._stop_event = threading.Event()

        self._build_ui()
        sys.stdout = StdoutRedirect(self.log)
        sys.stderr = StdoutRedirect(self.log)

    def _build_ui(self):
        # Title row
        hdr = tk.Frame(self.root, bg="#0f0f13")
        hdr.pack(fill=tk.X, padx=24, pady=(18, 8))
        tk.Label(hdr, text="字 Yomi-Subs Engine", font=("Segoe UI", 20, "bold"),
                 bg="#0f0f13", fg="#e63946").pack(side=tk.LEFT)
        tk.Label(hdr, text="v2", font=("Segoe UI", 11),
                 bg="#0f0f13", fg="#555").pack(side=tk.LEFT, padx=6, pady=4)

        # Status indicator
        self.status_var = tk.StringVar(value="● Offline")
        self.status_lbl = tk.Label(self.root, textvariable=self.status_var,
                                   font=("Segoe UI", 10), bg="#0f0f13", fg="#555")
        self.status_lbl.pack()

        # Buttons
        btn_frame = tk.Frame(self.root, bg="#0f0f13")
        btn_frame.pack(fill=tk.X, padx=24, pady=10)

        self.start_btn = tk.Button(
            btn_frame, text="START ENGINE", font=("Segoe UI", 11, "bold"),
            command=self.start_server, bg="#e63946", fg="white",
            height=2, bd=0, activebackground="#c1121f", activeforeground="white",
            cursor="hand2"
        )
        self.start_btn.pack(fill=tk.X, pady=(0, 6))

        self.stop_btn = tk.Button(
            btn_frame, text="STOP ENGINE", font=("Segoe UI", 11, "bold"),
            command=self.stop_server, bg="#2a2a36", fg="#888",
            state=tk.DISABLED, height=2, bd=0, cursor="hand2"
        )
        self.stop_btn.pack(fill=tk.X)

        # Log area — monospace CJK font so Japanese output is readable
        self._log_font_size = tk.IntVar(value=20)
        self.log = scrolledtext.ScrolledText(
            self.root, wrap=tk.WORD, height=14,
            bg="#000000", fg="#00ff41",
            font=("MS Gothic", 20), insertbackground="#00ff41"
        )
        self.log.pack(padx=24, pady=(12, 4), fill=tk.BOTH, expand=True)

        # Font size slider
        fs_frame = tk.Frame(self.root, bg="#0f0f13")
        fs_frame.pack(fill=tk.X, padx=24, pady=(0, 10))
        tk.Label(fs_frame, text="Font size", font=("Segoe UI", 9),
                 bg="#0f0f13", fg="#555").pack(side=tk.LEFT)
        tk.Scale(
            fs_frame, from_=10, to=40, orient=tk.HORIZONTAL,
            variable=self._log_font_size, command=self._on_font_size,
            bg="#0f0f13", fg="#888", troughcolor="#1a1a24",
            highlightthickness=0, bd=0, length=180, showvalue=True,
            font=("Segoe UI", 8)
        ).pack(side=tk.LEFT, padx=(8, 0))

        # Footer
        tk.Label(self.root,
                 text=f"WebSocket: ws://{WS_HOST}:{WS_PORT}  |  Model: {WHISPER_MODEL}",
                 font=("Segoe UI", 9), bg="#0f0f13", fg="#333").pack(pady=(0, 8))

    # ── Server lifecycle ──────────────────────────────────────────────────────

    def start_server(self):
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        self._stop_event.clear()
        self.server_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.server_thread.start()

    def _run_loop(self):
        self._load_model()
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._serve())
        except Exception as exc:
            print(f"⚠ Server error: {exc}")
        finally:
            self.loop.close()

    def stop_server(self):
        self._stop_event.set()
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self._set_status("● Offline", "#555")
        print("🛑 Engine stopped.")

    # ── Model loading ─────────────────────────────────────────────────────────

    def _load_model(self):
        print(f"🔍 Loading Whisper model '{WHISPER_MODEL}'…")
        self._set_status("● Loading model…", "#f4a261")
        try:
            self.model = WhisperModel(WHISPER_MODEL, device="cuda", compute_type="float16")
            print("✅ GPU acceleration active (CUDA / float16).")
        except Exception:
            print("⚠ GPU unavailable — falling back to CPU (int8).")
            self.model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
            print("✅ CPU mode active.")
        self._set_status(f"● Online — ws://{WS_HOST}:{WS_PORT}", "#2a9d8f")

    # ── WebSocket server ──────────────────────────────────────────────────────

    async def _serve(self):
        print(f"🌐 Listening on ws://{WS_HOST}:{WS_PORT}")
        async with websockets.serve(self._handle_client, WS_HOST, WS_PORT):
            await asyncio.Future()  # run forever until loop.stop()

    async def _handle_client(self, websocket):
        addr = websocket.remote_address
        print(f"🔌 Client connected: {addr}")
        try:
            async for chunk in websocket:
                text = await asyncio.get_event_loop().run_in_executor(
                    None, self._transcribe_chunk, chunk
                )
                if text:
                    print(f"▶ {text}")
                    await websocket.send(text)
        except websockets.exceptions.ConnectionClosed:
            print(f"❌ Client disconnected: {addr}")
        except Exception as exc:
            print(f"⚠ Handler error: {exc}")

    # ── Transcription ─────────────────────────────────────────────────────────

    def _transcribe_chunk(self, raw_bytes: bytes) -> str:
        """Decode webm/opus → 16 kHz mono PCM → faster-whisper transcription."""
        try:
            container = av.open(io.BytesIO(raw_bytes))
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            frames = []
            for frame in container.decode(audio=0):
                for r in resampler.resample(frame):
                    frames.append(r.to_ndarray())
            # Flush the resampler
            for r in resampler.resample(None):
                frames.append(r.to_ndarray())

            if not frames:
                return ""

            pcm = np.concatenate(frames, axis=1).flatten().astype(np.float32) / 32768.0

            segments, _ = self.model.transcribe(
                pcm,
                language="ja",
                beam_size=BEAM_SIZE,
                vad_filter=True,           # skip silent chunks
                condition_on_previous_text=False
            )
            return "".join(seg.text for seg in segments).strip()

        except Exception as exc:
            print(f"⚠ Chunk decode error: {exc}")
            return ""

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _set_status(self, text: str, color: str):
        """Thread-safe status label update."""
        self.root.after(0, lambda: (
            self.status_var.set(text),
            self.status_lbl.config(fg=color)
        ))

    def _on_font_size(self, _=None):
        self.log.config(font=("MS Gothic", self._log_font_size.get()))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    root = tk.Tk()
    app = YomiSubsApp(root)
    root.mainloop()
