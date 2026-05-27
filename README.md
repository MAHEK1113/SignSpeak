# SignSpeak
Real-time ASL sign language to text translator built with MediaPipe Hands &amp; vanilla JS. Detects 21 hand landmarks in-browser, classifies gestures into letters with zero backend. Features live skeleton overlay, Web Speech API, particle mesh UI. No install — just open and sign.
<div align="center">

<br/>

**Real-time ASL alphabet detection in the browser — powered by MediaPipe Hands & vanilla JS.**  
Zero backend. Zero install. Just your hand and a webcam.

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-7B8FFF?style=for-the-badge&logoColor=white)](https://sign-speak-orpin.vercel.app/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe_Hands-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-22D3A4?style=for-the-badge)](LICENSE)

<br/>

</div>

---

## ✨ What is SignSpeak?

SignSpeak translates **American Sign Language (ASL)** hand gestures into text — live, in your browser, with no server involved. Point your webcam, show your hand, and watch letters appear in real time.

It's built entirely with **vanilla JavaScript** and **Google's MediaPipe Hands** — no React, no Python, no cloud API. Everything runs locally on your machine.

```
Your Hand  →  Webcam  →  MediaPipe (21 landmarks)  →  Classifier  →  Text  →  🔊 Speech
```

---

## 🎬 How to operate

<div align="center">



| Start Camera | Sign a Letter | Text Output |
|:---:|:---:|:---:|
| 📷 Allow webcam | ✋ Hold a gesture | 💬 Letter appears |

</div>

---

## 🔥 Features

| Feature | Details |
|---|---|
| 🖐️ **Real-time detection** | 30+ FPS landmark tracking via MediaPipe |
| 🔤 **ASL Alphabet** | Supports A–Y static hand gestures |
| 🦴 **Skeleton overlay** | Live hand landmark visualization on camera |
| 🔊 **Text-to-Speech** | Built-in Web Speech API read-aloud |
| 📋 **Copy to clipboard** | One-click copy of translated text |
| ⌨️ **Keyboard shortcuts** | Space & Backspace supported |
| 📊 **Confidence meter** | Real-time prediction confidence display |
| 🎨 **Particle mesh UI** | Animated dark-theme interface |
| 🔒 **100% private** | No data ever leaves your browser |
| 📦 **Zero dependencies** | Single HTML file, no npm, no build step |

---

## 🧠 How It Works

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────┐
│   Webcam    │───▶│  MediaPipe Hands  │───▶│  classifier.js  │───▶│  Output  │
│  (WebRTC)   │    │  21 landmarks/   │    │  Finger angles  │    │  Letter  │
│             │    │  frame @ 30fps   │    │  & distances    │    │  + Text  │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────────┘
```

**MediaPipe** gives us 21 3D hand keypoints every frame. The custom **classifier** analyses finger extension states, tip distances, and thumb positions to map the hand shape to an ASL letter — all in ~2ms.

### Hand Landmark Map
```
        8   12  16  20
        |   |   |   |
        7   11  15  19
        |   |   |   |
    4   6   10  14  18
    |   |   |   |   |
    3   5───9──13──17
    |   |
    2   |
    |   |
    1   |
     \  |
      0 (WRIST)
```

---

## 🚀 Quick Start

### Option 1 — Direct Link
```bash
# 1. Paste this link directly to your browser(https://sign-speak-orpin.vercel.app)
```

### Option 2 — Single File (Easiest)
```bash
# 1. Download SignSpeak.html
# 2. Open VS Code → install "Live Server" extension
# 3. Right-click SignSpeak.html → "Open with Live Server"
# 4. Allow camera → Start signing!
```

### Option 3 — Clone & Serve
```bash
git clone https://github.com/MAHEK1113/signspeak.git
cd signspeak

# Python
python -m http.server 8080

# OR Node.js
npx serve .
```

Then open **`http://localhost:8080`**

> ⚠️ Must run via a local server — camera API requires `http://` not `file://`

---

## 📁 Project Structure

```
signspeak/
├── 📄 SignSpeak.html      ← Everything in one file (CSS + JS + HTML)
│
│   ── OR modular version ──
│
├── 📄 index.html          ← Main page
├── 📁 css/
│   └── style.css          ← Dark theme, animations, layout
└── 📁 js/
    ├── classifier.js      ← ASL gesture classifier (rule-based)
    └── app.js             ← Camera, MediaPipe, UI logic
```

---

## 🔤 Supported Gestures

<div align="center">

| ✅ Supported | Gesture Description |
|:---:|---|
| **A** | Fist with thumb to the side |
| **B** | Four fingers straight up, thumb folded |
| **D** | Index up, thumb touching middle finger |
| **F** | Index + thumb touching, others extended |
| **I** | Pinky finger only extended |
| **L** | Index up + thumb out (L-shape) |
| **O** | All fingers curved into an O |
| **V** | Index + middle up in V/peace sign |
| **W** | Index + middle + ring up wide |
| **Y** | Thumb + pinky out (hang loose 🤙) |
| *...more* | See `classifier.js` for full list |

</div>

---

## 🛠️ Tech Stack

<div align="center">

| Technology | Role |
|---|---|
| [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | 21-point 3D hand tracking |
| [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | Skeleton overlay rendering |
| [WebRTC / getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | Webcam access |
| [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Text-to-speech output |
| Vanilla JS / HTML5 / CSS3 | UI, logic, animations |

**No frameworks. No npm. No backend. No cloud.**

</div>

---

## 🚀 Roadmap

- [x] Rule-based ASL classifier (A–Y static gestures)
- [x] Real-time skeleton overlay
- [x] Text-to-speech output
- [x] Confidence scoring
- [ ] TensorFlow.js model trained on real ASL dataset
- [ ] Dynamic gesture support (J, Z require motion)
- [ ] Indian Sign Language (ISL) support
- [ ] Word-level prediction with LLM autocomplete
- [ ] Mobile PWA version
- [ ] Multi-language output

---

## 🤝 Contributing

Contributions are welcome! The best place to start is `js/classifier.js` — each letter rule is just 3–5 lines.



---

## 📄 License

MIT — free to use, fork, and showcase in your own portfolio.

---

<div align="center">

**Built with ♥ for accessibility**

*If this project helped you, consider giving it a ⭐ — it helps others find it!*

[![Star on GitHub](https://img.shields.io/github/stars/yourusername/signspeak?style=social)](https://github.com/yourusername/signspeak)

</div>
