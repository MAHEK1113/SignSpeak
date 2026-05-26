/**
 * app.js — SignSpeak core application logic
 * Handles: camera, MediaPipe Hands, gesture classification, UI
 */

// ══════════════════════════════════════════════
//  State
// ══════════════════════════════════════════════
const state = {
  isRunning: false,
  outputText: '',
  letterCount: 0,
  startTime: null,
  lastLetter: null,
  lastLetterTime: 0,
  confidenceHistory: [],
  mode: 'letter',        // 'letter' | 'word'
  letterBuffer: [],
  fps: 0,
  frameCount: 0,
  fpsTimer: null,
  mirrored: false,
};

const LETTER_COOLDOWN = 1200;   // ms between letters being added
const CONFIDENCE_THRESHOLD = 0.65;

// ══════════════════════════════════════════════
//  DOM refs
// ══════════════════════════════════════════════
const videoEl       = document.getElementById('videoEl');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx           = overlayCanvas.getContext('2d');
const startBtn      = document.getElementById('startBtn');
const stopBtn       = document.getElementById('stopBtn');
const flipBtn       = document.getElementById('flipBtn');
const textOutput    = document.getElementById('textOutput');
const badgeLetter   = document.getElementById('badgeLetter');
const badgeConf     = document.getElementById('badgeConf');
const historyTrack  = document.getElementById('historyTrack');
const wordCount     = document.getElementById('wordCount');
const sessionTime   = document.getElementById('sessionTime');
const accuracy      = document.getElementById('accuracy');
const fpsBadge      = document.getElementById('fpsBadge');
const cameraPrompt  = document.getElementById('cameraPrompt');
const speakBtn      = document.getElementById('speakBtn');
const copyBtn       = document.getElementById('copyBtn');
const clearBtn      = document.getElementById('clearBtn');
const spaceBtn      = document.getElementById('spaceBtn');
const backspaceBtn  = document.getElementById('backspaceBtn');

// ══════════════════════════════════════════════
//  Animated background
// ══════════════════════════════════════════════
(function initBackground() {
  const canvas = document.getElementById('bgCanvas');
  const c = canvas.getContext('2d');
  let W, H;
  const particles = [];
  const COLORS = ['rgba(123,143,255,', 'rgba(167,139,250,', 'rgba(34,211,164,'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Create particles
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  function draw() {
    c.clearRect(0, 0, W, H);

    // Draw mesh lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 140) {
          c.beginPath();
          c.moveTo(particles[i].x, particles[i].y);
          c.lineTo(particles[j].x, particles[j].y);
          const alpha = (1 - d/140) * 0.08;
          c.strokeStyle = `rgba(123,143,255,${alpha})`;
          c.lineWidth = 0.5;
          c.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fillStyle = p.color + p.alpha + ')';
      c.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    // Gradient vignette
    const grad = c.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.9);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(7,8,16,0.6)');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    requestAnimationFrame(draw);
  }

  draw();
})();

// ══════════════════════════════════════════════
//  Alphabet grid
// ══════════════════════════════════════════════
(function buildAlphabetGrid() {
  const grid = document.getElementById('alphabetGrid');
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const cell = document.createElement('div');
    cell.className = 'alpha-cell';
    cell.id = `alpha-${letter}`;
    cell.textContent = letter;
    grid.appendChild(cell);
  }
})();

function highlightAlphabet(letter) {
  document.querySelectorAll('.alpha-cell').forEach(c => c.classList.remove('active'));
  const cell = document.getElementById(`alpha-${letter}`);
  if (cell) cell.classList.add('active');
}

// ══════════════════════════════════════════════
//  MediaPipe setup
// ══════════════════════════════════════════════
let hands = null;
let camera = null;

async function initMediaPipe() {
  hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  hands.onResults(onResults);
}

// ══════════════════════════════════════════════
//  Results handler
// ══════════════════════════════════════════════
function onResults(results) {
  // FPS counter
  state.frameCount++;

  // Resize canvas
  overlayCanvas.width  = videoEl.videoWidth  || overlayCanvas.offsetWidth;
  overlayCanvas.height = videoEl.videoHeight || overlayCanvas.offsetHeight;

  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // Draw skeleton
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
      color: 'rgba(123,143,255,0.5)',
      lineWidth: 2,
    });

    // Draw dots
    drawLandmarks(ctx, landmarks, {
      color: '#7b8fff',
      fillColor: 'rgba(167,139,250,0.8)',
      lineWidth: 1,
      radius: 4,
    });

    // Classify
    const { letter, confidence } = GestureClassifier.classify(landmarks);

    // Update badge
    badgeLetter.textContent = letter;
    badgeConf.textContent   = Math.round(confidence * 100) + '%';

    if (letter !== '?') highlightAlphabet(letter);

    // Average confidence
    if (letter !== '?') {
      state.confidenceHistory.push(confidence);
      if (state.confidenceHistory.length > 20)
        state.confidenceHistory.shift();
      const avg = state.confidenceHistory.reduce((a, b) => a + b, 0) / state.confidenceHistory.length;
      accuracy.textContent = Math.round(avg * 100) + '%';
    }

    // Auto-add letter
    const now = Date.now();
    if (
      letter !== '?' &&
      confidence >= CONFIDENCE_THRESHOLD &&
      (letter !== state.lastLetter || now - state.lastLetterTime > LETTER_COOLDOWN)
    ) {
      addLetter(letter);
      state.lastLetter = letter;
      state.lastLetterTime = now;

      // Flash badge
      badgeLetter.classList.remove('flash');
      void badgeLetter.offsetWidth;
      badgeLetter.classList.add('flash');
    }

  } else {
    badgeLetter.textContent = '—';
    badgeConf.textContent   = '0%';
    document.querySelectorAll('.alpha-cell').forEach(c => c.classList.remove('active'));
  }

  // Session timer
  if (state.startTime) {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    sessionTime.textContent = elapsed < 60 ? elapsed + 's' : Math.floor(elapsed/60) + 'm';
  }
}

// ══════════════════════════════════════════════
//  Text output management
// ══════════════════════════════════════════════
function addLetter(letter) {
  state.outputText += letter;
  state.letterCount++;
  wordCount.textContent = state.letterCount;
  renderOutput();
  addToHistory(letter);
}

function addSpace() {
  state.outputText += ' ';
  renderOutput();
  addToHistory('⎵');
}

function backspace() {
  state.outputText = state.outputText.slice(0, -1);
  renderOutput();
}

function renderOutput() {
  if (state.outputText === '') {
    textOutput.innerHTML = '<span class="placeholder-text">Your translated text will appear here as you sign…</span>';
  } else {
    textOutput.textContent = state.outputText;
  }
}

function addToHistory(letter) {
  const item = document.createElement('div');
  item.className = 'history-item';
  item.textContent = letter;
  historyTrack.appendChild(item);
  historyTrack.scrollLeft = historyTrack.scrollWidth;

  // Keep max 30 items
  if (historyTrack.children.length > 30) {
    historyTrack.removeChild(historyTrack.firstChild);
  }
}

function clearOutput() {
  state.outputText = '';
  state.letterCount = 0;
  wordCount.textContent = 0;
  historyTrack.innerHTML = '';
  renderOutput();
}

// ══════════════════════════════════════════════
//  Camera control
// ══════════════════════════════════════════════
async function startCamera() {
  await initMediaPipe();

  camera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480,
    facingMode: 'user',
  });

  await camera.start();
  state.isRunning = true;
  state.startTime = Date.now();

  cameraPrompt.classList.add('hidden');
  startBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');

  // FPS counter
  state.fpsTimer = setInterval(() => {
    fpsBadge.textContent = state.frameCount + ' fps';
    state.frameCount = 0;
  }, 1000);

  showToast('Camera started — show your hand!');
}

function stopCamera() {
  if (camera) camera.stop();
  state.isRunning = false;
  state.startTime = null;

  clearInterval(state.fpsTimer);
  fpsBadge.textContent = '— fps';
  badgeLetter.textContent = '—';
  badgeConf.textContent = '0%';
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  sessionTime.textContent = '0s';

  cameraPrompt.classList.remove('hidden');
  startBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
}

// ══════════════════════════════════════════════
//  Utility
// ══════════════════════════════════════════════
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function speakText() {
  if (!state.outputText.trim()) return;
  const utter = new SpeechSynthesisUtterance(state.outputText);
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
  showToast('Speaking text…');
}

function copyText() {
  if (!state.outputText.trim()) return;
  navigator.clipboard.writeText(state.outputText).then(() => {
    showToast('Copied to clipboard!');
  });
}

// ══════════════════════════════════════════════
//  Mode selector
// ══════════════════════════════════════════════
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    showToast(`Mode: ${state.mode === 'letter' ? 'Letter by Letter' : 'Word Mode'}`);
  });
});

// ══════════════════════════════════════════════
//  Event listeners
// ══════════════════════════════════════════════
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click',  stopCamera);
speakBtn.addEventListener('click', speakText);
copyBtn.addEventListener('click',  copyText);
clearBtn.addEventListener('click', clearOutput);
spaceBtn.addEventListener('click', addSpace);
backspaceBtn.addEventListener('click', backspace);

flipBtn.addEventListener('click', () => {
  state.mirrored = !state.mirrored;
  videoEl.style.transform       = state.mirrored ? 'scaleX(1)' : 'scaleX(-1)';
  overlayCanvas.style.transform = state.mirrored ? 'scaleX(1)' : 'scaleX(-1)';
  showToast(state.mirrored ? 'Camera flipped' : 'Camera normal');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    addSpace();
  }
  if (e.code === 'Backspace' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    backspace();
  }
});

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── Init ──────────────────────────────────────
renderOutput();