/**
 * classifier.js
 * Rule-based ASL static hand gesture classifier.
 * Uses MediaPipe 21 landmark positions to infer letters.
 *
 * Landmarks: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
 * 0=WRIST, 1-4=THUMB, 5-8=INDEX, 9-12=MIDDLE, 13-16=RING, 17-20=PINKY
 */

window.GestureClassifier = (function () {

  // ── Helper: is finger extended? ────────────────────────────────────
  // Tip (n+3) is above knuckle (n+1) → extended
  function isExtended(lm, mcp, tip) {
    // Using y-axis: smaller y = higher in image (top)
    return lm[tip].y < lm[mcp].y;
  }

  function fingerExtended(lm, finger) {
    // finger: 'index' | 'middle' | 'ring' | 'pinky' | 'thumb'
    const map = {
      index:  { mcp: 5, pip: 6, dip: 7, tip: 8  },
      middle: { mcp: 9, pip:10, dip:11, tip: 12 },
      ring:   { mcp:13, pip:14, dip:15, tip: 16 },
      pinky:  { mcp:17, pip:18, dip:19, tip: 20 },
    };
    if (finger === 'thumb') {
      // Thumb extension: tip x far from wrist x (mirrored)
      return Math.abs(lm[4].x - lm[0].x) > 0.15;
    }
    const f = map[finger];
    return lm[f.tip].y < lm[f.pip].y;
  }

  function allCurled(lm, fingers = ['index','middle','ring','pinky']) {
    return fingers.every(f => !fingerExtended(lm, f));
  }

  function dist(a, b) {
    return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
  }

  // ── Classifier ─────────────────────────────────────────────────────
  function classify(landmarks) {
    const lm = landmarks;

    const I = fingerExtended(lm, 'index');
    const M = fingerExtended(lm, 'middle');
    const R = fingerExtended(lm, 'ring');
    const P = fingerExtended(lm, 'pinky');
    const T = fingerExtended(lm, 'thumb');

    // Derived measurements
    const indexTipY  = lm[8].y;
    const middleTipY = lm[12].y;
    const ringTipY   = lm[16].y;
    const pinkyTipY  = lm[20].y;
    const wristY     = lm[0].y;

    const thumbTip   = lm[4];
    const indexTip   = lm[8];
    const middleTip  = lm[12];
    const ringTip    = lm[16];
    const pinkyTip   = lm[20];

    const thumbIndex   = dist(thumbTip, indexTip);
    const thumbMiddle  = dist(thumbTip, middleTip);
    const thumbPinky   = dist(thumbTip, pinkyTip);
    const indexMiddle  = dist(indexTip, middleTip);

    // ─ A: Fist, thumb to the side ─────────────────────────────────
    if (!I && !M && !R && !P && T) {
      // thumb out, all others curled
      return { letter: 'A', confidence: 0.82 };
    }

    // ─ B: Four fingers up, thumb across palm ──────────────────────
    if (I && M && R && P && !T) {
      return { letter: 'B', confidence: 0.85 };
    }

    // ─ C: Curved hand, C shape ────────────────────────────────────
    if (!I && !M && !R && !P && !T &&
        lm[8].y > lm[5].y && lm[12].y > lm[9].y &&
        thumbIndex < 0.25) {
      return { letter: 'C', confidence: 0.75 };
    }

    // ─ D: Index up, others curl, thumb touches middle ─────────────
    if (I && !M && !R && !P && thumbMiddle < 0.1) {
      return { letter: 'D', confidence: 0.78 };
    }

    // ─ E: All fingers curled, thumb tucked ────────────────────────
    if (!I && !M && !R && !P && !T &&
        thumbIndex < 0.12) {
      return { letter: 'E', confidence: 0.72 };
    }

    // ─ F: Index+thumb touch, others extended ──────────────────────
    if (thumbIndex < 0.07 && M && R && P && !I) {
      return { letter: 'F', confidence: 0.76 };
    }

    // ─ G: Index pointing sideways, thumb parallel ─────────────────
    if (I && !M && !R && !P && T &&
        Math.abs(lm[8].x - lm[5].x) > 0.1) {
      return { letter: 'G', confidence: 0.7 };
    }

    // ─ H: Index + middle extended horizontally ────────────────────
    if (I && M && !R && !P &&
        Math.abs(indexTipY - middleTipY) < 0.05) {
      return { letter: 'H', confidence: 0.72 };
    }

    // ─ I: Pinky up only ───────────────────────────────────────────
    if (!I && !M && !R && P && !T) {
      return { letter: 'I', confidence: 0.85 };
    }

    // ─ K: Index + middle up, thumb between ───────────────────────
    if (I && M && !R && !P && T &&
        thumbMiddle < 0.15) {
      return { letter: 'K', confidence: 0.7 };
    }

    // ─ L: L shape — index up, thumb out ──────────────────────────
    if (I && !M && !R && !P && T &&
        Math.abs(lm[4].y - lm[0].y) > 0.12) {
      return { letter: 'L', confidence: 0.84 };
    }

    // ─ M: Three fingers over thumb ────────────────────────────────
    if (!I && !M && !R && !P && T &&
        lm[6].y > lm[4].y && lm[10].y > lm[4].y) {
      return { letter: 'M', confidence: 0.65 };
    }

    // ─ O: All fingers curved into O with thumb ────────────────────
    if (thumbIndex < 0.08 && !I && !M && !R && !P) {
      return { letter: 'O', confidence: 0.78 };
    }

    // ─ R: Index + middle crossed ──────────────────────────────────
    if (I && M && !R && !P && !T &&
        lm[8].x < lm[12].x && Math.abs(lm[8].x - lm[12].x) < 0.06) {
      return { letter: 'R', confidence: 0.72 };
    }

    // ─ S: Fist with thumb over fingers ───────────────────────────
    if (!I && !M && !R && !P && !T) {
      return { letter: 'S', confidence: 0.7 };
    }

    // ─ U: Index + middle up together ──────────────────────────────
    if (I && M && !R && !P && !T &&
        indexMiddle < 0.08) {
      return { letter: 'U', confidence: 0.75 };
    }

    // ─ V: Index + middle in V shape ──────────────────────────────
    if (I && M && !R && !P && !T &&
        indexMiddle >= 0.08) {
      return { letter: 'V', confidence: 0.8 };
    }

    // ─ W: Three fingers up wide ───────────────────────────────────
    if (I && M && R && !P && !T) {
      return { letter: 'W', confidence: 0.77 };
    }

    // ─ Y: Thumb + pinky out (hang loose) ─────────────────────────
    if (!I && !M && !R && P && T &&
        thumbPinky > 0.3) {
      return { letter: 'Y', confidence: 0.84 };
    }

    // ─ Unknown ────────────────────────────────────────────────────
    return { letter: '?', confidence: 0 };
  }

  return { classify };
})();