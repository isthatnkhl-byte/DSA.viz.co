# 🎙️ Free LiveKit Voice Agent Worker (Groq + Kokoro-82M)

This background worker replaces costly commercial voice APIs (ElevenLabs/Cartesia) with a **100% free-for-life architecture** combining:

* **Orchestration**: [LiveKit Agents](https://docs.livekit.io/agents/) (WebRTC real-time audio pipeline with instant barge-in/interruption).
* **Brain (LLM)**: [Groq Cloud](https://console.groq.com) running `llama-3.3-70b-versatile` (>800 tokens/sec at **$0.00 cost** on free developer tier).
* **Voice (TTS)**: [Kokoro-82M](https://github.com/hexgrad/kokoro) (Ultra-natural 24kHz open-source neural voice model running in under 60ms).
* **VAD (Interruptibility)**: [Silero VAD](https://github.com/snakers4/silero-vad) (Local CPU voice activity detection).

---

## ⚡ Quick Start (5 Minutes)

### 1. Get Free Keys (No Credit Card Needed)
1. **LiveKit Cloud**: Sign up at [cloud.livekit.io](https://cloud.livekit.io) (Free 50 GB/month). Create a project and grab:
   * `LIVEKIT_URL`
   * `LIVEKIT_API_KEY`
   * `LIVEKIT_API_SECRET`
2. **Groq Cloud**: Sign up at [console.groq.com](https://console.groq.com) (100% Free developer rate limits). Create an API key (`GROQ_API_KEY`).
3. **Deepgram**: Sign up at [console.deepgram.com](https://console.deepgram.com) (Free $200 trial credits without card) for `DEEPGRAM_API_KEY`.

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your keys in `.env`.

### 3. Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. (Optional) Download Kokoro-82M ONNX Model Weights for Offline Inference
To run Kokoro locally on CPU/GPU without relying on external endpoints:
```bash
# Download model weights (~300MB)
wget -O kokoro-v0_19.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx
wget -O voices.json https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.json
```

### 5. Start the Agent Worker
```bash
python3 agent.py dev
```
The agent connects to your LiveKit Cloud room and stands by to interview candidates in real time with sub-150ms speech latency!

---

## 🎭 Available Kokoro Voices
Change `KOKORO_VOICE` in your `.env`:
* `af_bella` (American Female - Warm, natural, composed)
* `af_sarah` (American Female - Professional, articulate)
* `am_adam` (American Male - Deep, steady executive tone)
* `am_michael` (American Male - Calm interviewer cadence)
* `bf_emma` (British Female - Crisp, clear)
* `bm_george` (British Male - Structured pacing)
