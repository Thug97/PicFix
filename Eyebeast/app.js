/**
 * Eyebeast — Real-Time Eye Health Monitor
 * Pure client-side. No data leaves the device.
 *
 * Key metrics:
 *  – Eye Aspect Ratio (EAR) per frame
 *  – Blink detection (EAR < threshold for N consecutive frames)
 *  – Blinks Per Minute (60-second rolling window)
 *  – Eye Strain Risk (Low / Medium / High)
 *  – Average EAR (10-second window)
 *  – Last blink gap (seconds)
 *  – Session timer (hh:mm:ss)
 *  – 20-20-20 break countdown (20 min)
 */

// ── Constants ─────────────────────────────────────────────────────────────
// Adaptive threshold: we compute a personal baseline from the user's open EAR
// and set threshold at (baseline × BLINK_RATIO). Falls back to FALLBACK_EAR_THRESHOLD
// until enough samples are collected.
const BLINK_RATIO = 0.72;   // EAR must drop below 72% of open baseline
const FALLBACK_EAR_THRESHOLD = 0.23; // used before baseline stabilises
const EAR_SMOOTH_ALPHA = 0.35;  // exponential smooth (higher = more reactive)
const CONSEC_FRAMES = 1;     // 1 frame minimum — catches rapid blinks
const REFRACTORY_MS = 180;   // min ms between blinks (avoids double-count)
const BASELINE_WINDOW_MS = 8000;  // rolling window for open-EAR baseline
const BPM_WINDOW_MS = 60000; // 60-second rolling window for BPM
const LOW_BPM_THRESHOLD = 15;
const HIGH_BPM_THRESHOLD = 20;
const BREAK_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

// MediaPipe Face Mesh landmark indices for each eye (6 points)
// Format: [outer, top1, top2, inner, bot1, bot2]
const LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144];

// ── State ─────────────────────────────────────────────────────────────────
let blinkCounter = 0;         // total session blinks
let consecFrames = 0;         // consecutive sub-threshold frames
let blinkTimestamps = [];        // timestamps of all blinks (full session)
let lastBlinkTime = null;      // for blink gap & refractory period
let earHistory = [];        // {ts, ear} for avg EAR over 10 s
let allEarSamples = [];        // full-session EAR samples for summary
let faceMesh = null;
let camera = null;
let sessionStart = Date.now();
let breakStart = Date.now();
let alertDismissed = false;     // low-blink alert dismissed flag
let tickInterval = null;      // reference for the 1Hz timer
let peakBpm = 0;        // highest BPM seen this session
let lowBpmEvents = 0;        // how many 1-Hz ticks had BPM < 15
let breaksTaken = 0;        // how many 20-20-20 breaks were dismissed
let sessionStopped = false;    // guard: prevent double-stop

// ── Blink detection state ─────────────────────────────────────────────────
let smoothedEAR = -1;       // exponentially smoothed EAR
let openEarBaseline = [];       // {ts, ear} — recent open-eye EAR samples
let currentEARThreshold = FALLBACK_EAR_THRESHOLD;
let inBlink = false;    // true while eye is below threshold

// ── DOM Refs ──────────────────────────────────────────────────────────────
const video = document.getElementById('webcamVideo');
const canvas = document.getElementById('overlayCanvas');
const ctx = canvas.getContext('2d');
const camOverlayText = document.getElementById('camOverlayText');
const camStatus = document.getElementById('camStatus');
const liveDot = document.getElementById('liveDot');

const bpmValueEl = document.getElementById('bpmValue');
const bpmBadgeEl = document.getElementById('bpmBadge');
const bpmCard = document.getElementById('bpmCard');
const riskValueEl = document.getElementById('riskValue');
const riskSubEl = document.getElementById('riskSub');
const riskIconEl = document.getElementById('riskIcon');
const riskCard = document.getElementById('riskCard');
const riskGaugeFill = document.getElementById('riskGaugeFill');
const earValueEl = document.getElementById('earValue');
const avgEarEl = document.getElementById('avgEarValue');
const blinkGapEl = document.getElementById('binkGapValue');
const totalBlinksEl = document.getElementById('totalBlinks');
const blinkIconEl = document.getElementById('blinkIcon');
const blinkLabelEl = document.getElementById('blinkStateLabel');
const sessionTimerEl = document.getElementById('sessionTimer');
const breakTimerEl = document.getElementById('breakTimer');
const alertBanner = document.getElementById('alertBanner');
const alertDismissBtn = document.getElementById('alertDismiss');
const breakBanner = document.getElementById('breakAlertBanner');
const breakDismissBtn = document.getElementById('breakAlertDismiss');
const stopSessionBtn = document.getElementById('stopSessionBtn');

// Modal
const summaryModal = document.getElementById('summaryModal');
const summaryDuration = document.getElementById('summaryDuration');
const summaryRatingBanner = document.getElementById('summaryRatingBanner');
const summaryRatingIcon = document.getElementById('summaryRatingIcon');
const summaryRatingText = document.getElementById('summaryRatingText');
const summaryTotalBlinks = document.getElementById('summaryTotalBlinks');
const summaryAvgBpm = document.getElementById('summaryAvgBpm');
const summaryPeakBpm = document.getElementById('summaryPeakBpm');
const summaryAvgEar = document.getElementById('summaryAvgEar');
const summaryLowBpmEl = document.getElementById('summaryLowBpmEvents');
const summaryBreaksTaken = document.getElementById('summaryBreaksTaken');
const summaryInsight = document.getElementById('summaryInsight');
const summaryClose = document.getElementById('summaryClose');
const summaryNewSession = document.getElementById('summaryNewSession');
const timelineCanvas = document.getElementById('timelineCanvas');

// ── Utility: Euclidean distance ───────────────────────────────────────────
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── EAR Calculation ───────────────────────────────────────────────────────
/**
 * Eye Aspect Ratio:
 *   EAR = (|p2-p6| + |p3-p5|) / (2 × |p1-p4|)
 * indices: [outer, top1, top2, inner, bot1, bot2]  → p1…p6
 */
function calcEAR(landmarks, indices) {
  const [i1, i2, i3, i4, i5, i6] = indices;
  const p1 = landmarks[i1], p2 = landmarks[i2], p3 = landmarks[i3];
  const p4 = landmarks[i4], p5 = landmarks[i5], p6 = landmarks[i6];
  const vert = dist(p2, p6) + dist(p3, p5);
  const horiz = 2 * dist(p1, p4);
  return horiz > 0 ? vert / horiz : 0;
}

// ── Adaptive EAR threshold ────────────────────────────────────────────────
/**
 * Keeps a rolling 8-second buffer of EAR values when the eye is clearly
 * open (above fallback threshold). Computes the median of that buffer as
 * the personal open-eye baseline, then sets the blink threshold at
 * baseline × BLINK_RATIO. This adapts to lighting conditions and individual
 * face geometry without any manual calibration.
 */
function updateAdaptiveThreshold(rawEAR) {
  const now = Date.now();
  if (rawEAR > FALLBACK_EAR_THRESHOLD) {
    openEarBaseline.push({ ts: now, ear: rawEAR });
  }
  // Trim to rolling window
  openEarBaseline = openEarBaseline.filter(e => e.ts > now - BASELINE_WINDOW_MS);

  if (openEarBaseline.length >= 20) {
    // Median of recent open-eye samples — robust to outliers
    const sorted = openEarBaseline.map(e => e.ear).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    currentEARThreshold = median * BLINK_RATIO;
  }
  // else keep FALLBACK_EAR_THRESHOLD
}

// ── Exponential EAR smoothing ─────────────────────────────────────────────
// Reduces frame-to-frame noise caused by poor lighting or landmark jitter.
function smoothEAR(rawEAR) {
  if (smoothedEAR < 0) { smoothedEAR = rawEAR; return rawEAR; }
  smoothedEAR = EAR_SMOOTH_ALPHA * rawEAR + (1 - EAR_SMOOTH_ALPHA) * smoothedEAR;
  return smoothedEAR;
}

// ── BPM (60-second rolling window) ───────────────────────────────────────
function calcBPM() {
  const now = Date.now();
  const cutoff = now - BPM_WINDOW_MS;
  blinkTimestamps = blinkTimestamps.filter(t => t > cutoff);
  return blinkTimestamps.length; // blinks in last 60 s
}

// ── Average EAR (10-second window) ───────────────────────────────────────
function calcAvgEAR(ear) {
  const now = Date.now();
  const cutoff = now - 10000;
  earHistory.push({ ts: now, ear });
  earHistory = earHistory.filter(e => e.ts > cutoff);
  allEarSamples.push(ear); // store for session summary
  const sum = earHistory.reduce((a, e) => a + e.ear, 0);
  return earHistory.length > 0 ? (sum / earHistory.length).toFixed(3) : '—';
}

// ── Risk Classification ───────────────────────────────────────────────────
function classifyRisk(bpm) {
  if (bpm < LOW_BPM_THRESHOLD) return 'high';
  if (bpm <= HIGH_BPM_THRESHOLD) return 'med';
  return 'low';
}

// ── Update UI ─────────────────────────────────────────────────────────────
function updateUI(ear, hasFace) {
  const bpm = calcBPM();
  const risk = hasFace ? classifyRisk(bpm) : null;

  // EAR display
  earValueEl.textContent = ear > 0 ? ear.toFixed(3) : '—';

  // Average EAR
  if (ear > 0) avgEarEl.textContent = calcAvgEAR(ear);

  // BPM
  if (hasFace && bpm !== null) {
    bpmValueEl.textContent = bpm;
    bpmBadgeEl.textContent = bpm >= LOW_BPM_THRESHOLD && bpm <= HIGH_BPM_THRESHOLD ? 'Normal' : bpm < LOW_BPM_THRESHOLD ? 'Low' : 'High';
    bpmCard.classList.add('active');
  } else {
    bpmValueEl.textContent = '—';
    bpmBadgeEl.textContent = '—';
  }

  // Risk gauge + card
  if (hasFace && risk) {
    const riskLabels = { low: 'Low', med: 'Medium', high: 'High' };
    const riskIcons = { low: '🛡️', med: '⚠️', high: '🚨' };
    const riskSubs = {
      low: 'Blink rate is healthy (>20 BPM)',
      med: 'Blink rate is within normal range',
      high: 'Blink rate dangerously low (<15 BPM)'
    };
    const gaugeWidths = { low: 18, med: 55, high: 90 };
    const gaugeColors = { low: 'var(--risk-low)', med: 'var(--risk-med)', high: 'var(--risk-high)' };

    riskValueEl.textContent = riskLabels[risk];
    riskValueEl.className = `metric-value risk-value risk-${risk}`;
    riskIconEl.textContent = riskIcons[risk];
    riskSubEl.textContent = riskSubs[risk];
    riskGaugeFill.style.width = gaugeWidths[risk] + '%';
    riskGaugeFill.style.background = gaugeColors[risk];
    riskCard.className = `metric-card risk-card state-${risk}`;

    // Alert banner for high risk
    if (risk === 'high' && !alertDismissed) {
      alertBanner.classList.remove('hidden');
    } else if (risk !== 'high') {
      alertDismissed = false;
      alertBanner.classList.add('hidden');
    }
  } else {
    riskValueEl.textContent = '—';
    riskSubEl.textContent = 'Waiting for face detection…';
    riskCard.className = 'metric-card risk-card';
    riskGaugeFill.style.width = '0%';
  }

  // Blink state label
  if (!hasFace) {
    blinkIconEl.textContent = '😐';
    blinkLabelEl.textContent = 'No face detected';
  }
}

// ── Session Timer ─────────────────────────────────────────────────────────
function updateSessionTimer() {
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  sessionTimerEl.textContent = `${h}:${m}:${s}`;
}

// ── 20-20-20 Break Timer ──────────────────────────────────────────────────
function updateBreakTimer() {
  const elapsed = Date.now() - breakStart;
  const remaining = Math.max(0, BREAK_INTERVAL_MS - elapsed);
  const m = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  breakTimerEl.textContent = `${m}:${s}`;

  if (remaining === 0) {
    breakBanner.classList.remove('hidden');
    // show 20-second break prompt, then reset
    setTimeout(() => {
      breakBanner.classList.add('hidden');
      breakStart = Date.now();
    }, 20000);
    breakStart = Date.now() + BREAK_INTERVAL_MS; // prevent re-trigger
  }
}

// ── Blink Animation ───────────────────────────────────────────────────────
function triggerBlinkAnimation() {
  blinkIconEl.classList.add('blink-anim');
  blinkLabelEl.textContent = 'Blink detected!';
  setTimeout(() => {
    blinkIconEl.classList.remove('blink-anim');
    blinkLabelEl.textContent = 'Eyes open';
  }, 120);
}

// ── MediaPipe Face Mesh Results Handler ───────────────────────────────────
function onResults(results) {
  // resize canvas to match video
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const hasFace = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;

  if (!hasFace) {
    consecFrames = 0;
    inBlink = false;
    updateUI(0, false);
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];

  // Draw subtle iris / eye contour overlay
  drawEyeOverlay(landmarks);

  // ── Raw EAR ──────────────────────────────────────────────────────────────
  const leftEAR = calcEAR(landmarks, LEFT_EYE_IDX);
  const rightEAR = calcEAR(landmarks, RIGHT_EYE_IDX);
  const rawEAR = (leftEAR + rightEAR) / 2;

  // ── Smoothing & adaptive threshold ───────────────────────────────────────
  const ear = smoothEAR(rawEAR);
  updateAdaptiveThreshold(rawEAR);

  // ── Blink detection ───────────────────────────────────────────────────────
  // State machine: OPEN → CLOSING (eye drops below threshold) → OPEN (blink registered on re-open)
  // Refractory period prevents counting the same blink multiple times.
  const now = Date.now();
  const refractoryOk = lastBlinkTime === null || (now - lastBlinkTime) >= REFRACTORY_MS;

  if (ear < currentEARThreshold) {
    consecFrames++;
    if (!inBlink && consecFrames >= CONSEC_FRAMES) {
      inBlink = true; // eye is now closing
    }
  } else {
    if (inBlink && refractoryOk) {
      // Eye just reopened → confirmed blink
      blinkCounter++;
      blinkTimestamps.push(now);

      if (lastBlinkTime !== null) {
        const gap = ((now - lastBlinkTime) / 1000).toFixed(1);
        blinkGapEl.textContent = gap + 's';
      }
      lastBlinkTime = now;
      totalBlinksEl.textContent = blinkCounter;
      triggerBlinkAnimation();
    }
    inBlink = false;
    consecFrames = 0;
  }

  updateUI(ear, true);
}

// ── Draw Eye Contour ──────────────────────────────────────────────────────
function drawEyeOverlay(landmarks) {
  const w = canvas.width, h = canvas.height;

  function drawEye(indices, color) {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const lm = landmarks[idx];
      const x = lm.x * w, y = lm.y * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawEye(LEFT_EYE_IDX, 'rgba(0,212,255,0.7)');
  drawEye(RIGHT_EYE_IDX, 'rgba(0,212,255,0.7)');
}

// ── Init MediaPipe Face Mesh ───────────────────────────────────────────────
async function initFaceMesh() {
  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(onResults);
}

// ── Init Camera ───────────────────────────────────────────────────────────
async function initCamera() {
  try {
    camStatus.textContent = 'Requesting camera…';

    camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: 640,
      height: 480,
    });

    await camera.start();

    // Camera started successfully — hide overlay
    camOverlayText.classList.add('hidden');
    camStatus.textContent = 'Live';
    liveDot.classList.add('active');
    bpmCard.classList.add('active');

  } catch (err) {
    camStatus.textContent = 'Camera denied';
    camOverlayText.innerHTML = `
      <span style="font-size:2rem">🚫</span>
      <p style="color:var(--risk-high);font-weight:600">Camera access denied</p>
      <p>Please allow webcam access and reload the page.</p>
    `;
    console.error('Camera error:', err);
  }
}

// ── Alert Dismiss Handlers ────────────────────────────────────────────────
alertDismissBtn.addEventListener('click', () => {
  alertBanner.classList.add('hidden');
  alertDismissed = true;
});

breakDismissBtn.addEventListener('click', () => {
  breakBanner.classList.add('hidden');
  breakStart = Date.now();
  breaksTaken++;
});

// ── Stop Session ─────────────────────────────────────────────────────────
function stopSession() {
  if (sessionStopped) return;
  sessionStopped = true;

  // Halt camera and tick
  if (camera) camera.stop();
  if (tickInterval) clearInterval(tickInterval);

  // ── Compute summary stats ──────────────────────────────────────────────
  const durationMs = Date.now() - sessionStart;
  const durationSec = Math.floor(durationMs / 1000);
  const h = String(Math.floor(durationSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0');
  const s = String(durationSec % 60).padStart(2, '0');
  const durationStr = `${h}:${m}:${s}`;

  const durationMin = durationMs / 60000;
  const avgBpm = durationMin > 0 ? Math.round(blinkCounter / durationMin) : 0;
  const avgEarVal = allEarSamples.length > 0
    ? (allEarSamples.reduce((a, b) => a + b, 0) / allEarSamples.length).toFixed(3)
    : '—';

  // Overall session risk: based on avg BPM
  let rating, ratingClass, ratingIcon, ratingText;
  if (avgBpm < LOW_BPM_THRESHOLD) {
    rating = 'high'; ratingClass = 'rating-high';
    ratingIcon = '🚨'; ratingText = 'High Strain — Blink rate was consistently low';
  } else if (avgBpm <= HIGH_BPM_THRESHOLD) {
    rating = 'med'; ratingClass = 'rating-med';
    ratingIcon = '⚠️'; ratingText = 'Moderate Strain — Blink rate was within normal range';
  } else {
    rating = 'low'; ratingClass = '';
    ratingIcon = '🛡️'; ratingText = 'Healthy Session — Great blink rate throughout!';
  }

  // ── Populate modal ────────────────────────────────────────────────────
  summaryDuration.textContent = durationStr;
  summaryTotalBlinks.textContent = blinkCounter;
  summaryAvgBpm.textContent = avgBpm;
  summaryPeakBpm.textContent = peakBpm;
  summaryAvgEar.textContent = avgEarVal;
  summaryLowBpmEl.textContent = lowBpmEvents;
  summaryBreaksTaken.textContent = breaksTaken;

  // Rating banner
  summaryRatingBanner.className = `modal-rating-banner ${ratingClass}`;
  summaryRatingIcon.textContent = ratingIcon;
  summaryRatingText.textContent = ratingText;

  // Insight message
  let insight = '';
  if (avgBpm < LOW_BPM_THRESHOLD) {
    insight = `<strong>⚠️ Attention needed:</strong> Your average blink rate of <strong>${avgBpm} BPM</strong> was below the healthy minimum of 15 BPM. This significantly increases your risk of dry eyes and eye fatigue. Consider enabling a blink reminder tool and taking more frequent breaks.`;
  } else if (avgBpm <= HIGH_BPM_THRESHOLD) {
    insight = `<strong>✅ Looking good:</strong> Your average blink rate of <strong>${avgBpm} BPM</strong> was within the healthy 15–20 BPM range. ${lowBpmEvents > 5 ? 'You had some low-rate periods — keep an eye on screen time.' : 'Keep up the good habits!'}`;
  } else {
    insight = `<strong>🌟 Excellent session:</strong> Your average blink rate of <strong>${avgBpm} BPM</strong> exceeded the healthy baseline. Your eyes were well-lubricated throughout this session.`;
  }
  summaryInsight.innerHTML = insight;

  // ── Draw blink timeline chart ─────────────────────────────────────────
  drawTimeline();

  // Show modal
  summaryModal.classList.remove('hidden');

  // ── Morph button to green Start ──
  stopSessionBtn.className = 'start-btn';
  stopSessionBtn.innerHTML = '<span class="stop-icon">▶</span> Start New Session';
}

// ── Blink Activity Timeline Chart ────────────────────────────────────────
function drawTimeline() {
  const W = timelineCanvas.offsetWidth || 600;
  const H = 64;
  timelineCanvas.width = W;
  timelineCanvas.height = H;
  const tCtx = timelineCanvas.getContext('2d');

  tCtx.clearRect(0, 0, W, H);

  if (blinkTimestamps.length < 2) {
    tCtx.fillStyle = 'rgba(0,0,0,0.15)';
    tCtx.font = '12px Inter, sans-serif';
    tCtx.textAlign = 'center';
    tCtx.fillText('Not enough data to render timeline', W / 2, H / 2 + 4);
    return;
  }

  const sessionDuration = Date.now() - sessionStart;
  const barW = Math.max(2, W / 120);

  // Background grid lines
  tCtx.strokeStyle = 'rgba(0,0,0,0.08)';
  tCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * H;
    tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(W, y); tCtx.stroke();
  }

  // Draw a spike for each blink
  blinkTimestamps.forEach(ts => {
    const x = ((ts - sessionStart) / sessionDuration) * W;
    const gradient = tCtx.createLinearGradient(x, H, x, 0);
    gradient.addColorStop(0, 'rgba(0,153,187,0)');
    gradient.addColorStop(1, 'rgba(0,153,187,0.85)');
    tCtx.fillStyle = gradient;
    tCtx.fillRect(x - barW / 2, 0, barW, H);
  });

  // Baseline labels
  tCtx.fillStyle = 'rgba(0,0,0,0.3)';
  tCtx.font = '10px Inter, sans-serif';
  tCtx.textAlign = 'left';
  tCtx.fillText('Start', 4, H - 4);
  tCtx.textAlign = 'right';
  tCtx.fillText('End', W - 4, H - 4);
}

// ── Tick (1 Hz) ───────────────────────────────────────────────────────────
tickInterval = setInterval(() => {
  if (sessionStopped) return;
  updateSessionTimer();
  updateBreakTimer();
  // Track peak BPM and low-BPM events
  const currentBpm = calcBPM();
  if (currentBpm > peakBpm) peakBpm = currentBpm;
  if (currentBpm > 0 && currentBpm < LOW_BPM_THRESHOLD) lowBpmEvents++;
}, 1000);

// ── Stop button & Modal wiring ────────────────────────────────────────────
stopSessionBtn.addEventListener('click', () => {
  if (!sessionStopped) {
    stopSession();
  } else {
    startNewSession();
  }
});

// ── Start New Session (without page reload) ─────────────────────────
async function startNewSession() {
  // Reset all state
  blinkCounter = 0;
  consecFrames = 0;
  blinkTimestamps = [];
  lastBlinkTime = null;
  earHistory = [];
  allEarSamples = [];
  peakBpm = 0;
  lowBpmEvents = 0;
  breaksTaken = 0;
  sessionStopped = false;
  alertDismissed = false;
  sessionStart = Date.now();
  breakStart = Date.now();
  // Reset adaptive blink detection
  smoothedEAR = -1;
  openEarBaseline = [];
  currentEARThreshold = FALLBACK_EAR_THRESHOLD;
  inBlink = false;


  // Reset UI counters
  totalBlinksEl.textContent = '0';
  bpmValueEl.textContent = '—';
  bpmBadgeEl.textContent = '—';
  earValueEl.textContent = '—';
  avgEarEl.textContent = '—';
  blinkGapEl.textContent = '—';
  riskValueEl.textContent = '—';
  riskSubEl.textContent = 'Calibrating…';
  riskCard.className = 'metric-card risk-card';
  riskGaugeFill.style.width = '0%';
  blinkIconEl.textContent = '😐';
  blinkLabelEl.textContent = 'Waiting for face…';
  sessionTimerEl.textContent = '00:00:00';
  breakTimerEl.textContent = '20:00';
  alertBanner.classList.add('hidden');
  summaryModal.classList.add('hidden');

  // Revert button back to red Stop
  stopSessionBtn.className = 'stop-btn';
  stopSessionBtn.innerHTML = '<span class="stop-icon">⏹</span> Stop Session';

  // Restart live dot
  liveDot.classList.add('active');
  camStatus.textContent = 'Live';
  camOverlayText.classList.add('hidden');

  // Restart camera
  await initCamera();

  // Restart tick
  tickInterval = setInterval(() => {
    if (sessionStopped) return;
    updateSessionTimer();
    updateBreakTimer();
    const currentBpm = calcBPM();
    if (currentBpm > peakBpm) peakBpm = currentBpm;
    if (currentBpm > 0 && currentBpm < LOW_BPM_THRESHOLD) lowBpmEvents++;
  }, 1000);
}

summaryClose.addEventListener('click', () => {
  summaryModal.classList.add('hidden');
});

summaryNewSession.addEventListener('click', () => {
  location.reload();
});

// ── Welcome / Onboarding Modal ─────────────────────────────────────────────
(function initWelcome() {
  const modal = document.getElementById('welcomeModal');
  const startBtn = document.getElementById('welcomeStart');
  const dontShowChk = document.getElementById('welcomeDontShow');

  const SEEN_KEY = 'eyebeast_welcome_seen';

  function dismissAndStart() {
    if (dontShowChk.checked) {
      localStorage.setItem(SEEN_KEY, '1');
    }
    modal.classList.add('hidden');
    bootstrap();
  }

  if (localStorage.getItem(SEEN_KEY)) {
    // Returning user — skip modal and go straight to app
    modal.classList.add('hidden');
    bootstrap();
  } else {
    // New user — show modal first, start app on dismiss
    startBtn.addEventListener('click', dismissAndStart);
  }
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function bootstrap() {
  await initFaceMesh();
  await initCamera();
}

