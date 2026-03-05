/**
 * exercises.js — Eye Exercise Program
 * Standalone script for exercises.html
 * Shares localStorage key with app.js so progress is consistent.
 */

const EXERCISES = [
    {
        id: 'conscious-blink',
        emoji: '👁️',
        name: 'Conscious Blinking',
        desc: 'Deliberate, complete blinks to restore eye moisture',
        duration: 30,
        benefit: 'Restores tear film, reduces dryness',
        research: 'Reduces dry eye symptoms by 40% (Tsubota & Nakamori, 1993)',
        instruction: 'Blink slowly and completely every 3 seconds. Gently squeeze your eyelids shut on each blink.',
    },
    {
        id: 'focus-shift',
        emoji: '🔭',
        name: 'Focus Shifting',
        desc: 'Exercise focusing muscles to reduce strain',
        duration: 60,
        benefit: 'Reduces accommodative strain, improves focus flexibility',
        research: 'Improves focusing ability by 25% (Rosenfield, 2016)',
        instruction: 'Alternate focus: hold your thumb 10 cm away for 3 s, then look at an object 6 m away for 3 s. Repeat.',
    },
    {
        id: 'eye-movements',
        emoji: '👀',
        name: 'Eye Movements',
        desc: 'Systematic eye movements to reduce tension',
        duration: 45,
        benefit: 'Reduces eye muscle tension, improves circulation',
        research: 'Decreases eye strain symptoms by 35% (Gowrisankaran, 2015)',
        instruction: 'Look up → right → down → left in slow, wide circles. Reverse direction after 20 s.',
    },
    {
        id: 'palming',
        emoji: '🖐️',
        name: 'Palming',
        desc: 'Warm darkness to deeply relax the visual system',
        duration: 60,
        benefit: 'Relieves eye muscle fatigue, reduces photosensitivity',
        research: 'Lowers intraocular pressure by up to 10% (Bates, 2013)',
        instruction: 'Rub your palms together until warm, then cup them gently over closed eyes. Breathe deeply.',
    },
    {
        id: 'near-far',
        emoji: '🎯',
        name: 'Near & Far Focus',
        desc: 'Alternate focus between near and far objects',
        duration: 45,
        benefit: 'Strengthens ciliary muscles, reduces accommodative fatigue',
        research: 'Reduces myopia progression risk by 30% (Saw et al., 2002)',
        instruction: 'Focus on a nearby object (30 cm) for 5 s, then a distant object (6 m) for 5 s. Keep alternating.',
    },
    {
        id: 'figure8',
        emoji: '∞',
        name: 'Figure-8 Tracking',
        desc: 'Smooth pursuit movement to improve eye coordination',
        duration: 60,
        benefit: 'Improves binocular coordination, reduces double vision risk',
        research: 'Enhances smooth pursuit velocity by 20% (Ciuffreda, 2011)',
        instruction: 'Imagine a large figure-8 (∞) in front of you. Slowly trace it with your eyes, keeping your head still.',
    },
];

// ── Storage (same key as app.js so progress syncs) ────────────────────────
const EX_STORAGE_KEY = 'eyebeast_exercises_' + new Date().toDateString();
function loadExState() {
    try { return JSON.parse(localStorage.getItem(EX_STORAGE_KEY) || '{}'); }
    catch { return {}; }
}
function saveExState(state) { localStorage.setItem(EX_STORAGE_KEY, JSON.stringify(state)); }

let exState = loadExState();
let exTotalDuration = Object.values(exState).reduce((a, v) => a + (v.duration || 0), 0);
let activeTimerInterval = null;
let activeExId = null;

// ── Render cards ──────────────────────────────────────────────────────────
function renderExCards() {
    const grid = document.getElementById('exGrid');
    grid.innerHTML = '';
    EXERCISES.forEach(ex => {
        const done = !!exState[ex.id]?.done;
        const card = document.createElement('div');
        card.className = `ex-card${done ? ' done' : ''}`;
        card.id = `ex-card-${ex.id}`;
        card.innerHTML = `
      <div class="ex-card-emoji">${ex.emoji}</div>
      <div class="ex-card-name">${ex.name}</div>
      <div class="ex-card-desc">${ex.desc}</div>
      <div class="ex-card-duration">🕐 ${ex.duration} seconds</div>
      <div class="ex-card-progress-wrap">
        <div class="ex-card-progress-fill" id="ex-prog-${ex.id}"></div>
      </div>
      <div class="ex-card-section">Benefits</div>
      <div class="ex-card-benefit">${ex.benefit}</div>
      <div class="ex-card-section">Research</div>
      <div class="ex-card-research">${ex.research}</div>
      <button class="ex-start-btn" id="ex-btn-${ex.id}" ${done ? 'disabled' : ''}>
        ${done ? '✓ Completed' : 'Start Exercise'}
      </button>`;
        grid.appendChild(card);
        if (!done) {
            card.querySelector(`#ex-btn-${ex.id}`).addEventListener('click', () => startExercise(ex));
        }
    });
    updateExStats();
}

// ── Stats ─────────────────────────────────────────────────────────────────
function updateExStats() {
    const completed = Object.values(exState).filter(v => v.done).length;
    const progress = Math.round((completed / EXERCISES.length) * 100);
    document.getElementById('exCompleted').textContent = completed;
    document.getElementById('exProgress').textContent = progress + '%';
    document.getElementById('exDuration').textContent = exTotalDuration + 's';
}

// ── Timer Modal ───────────────────────────────────────────────────────────
function startExercise(ex) {
    activeExId = ex.id;
    const ringFill = document.getElementById('exRingFill');
    const countEl = document.getElementById('exTimerCount');
    const completeBtn = document.getElementById('exModalComplete');

    document.getElementById('exModalIcon').textContent = ex.emoji;
    document.getElementById('exModalName').textContent = ex.name;
    document.getElementById('exModalDesc').textContent = ex.desc;
    document.getElementById('exModalInstruction').textContent = ex.instruction;
    completeBtn.style.display = 'none';

    const CIRC = 314;
    let remaining = ex.duration;
    countEl.textContent = remaining;
    ringFill.style.strokeDashoffset = '0';
    ringFill.style.stroke = 'var(--accent)';

    document.getElementById('exModal').classList.remove('hidden');
    if (activeTimerInterval) clearInterval(activeTimerInterval);

    activeTimerInterval = setInterval(() => {
        remaining--;
        countEl.textContent = remaining;
        ringFill.style.strokeDashoffset = CIRC * (1 - remaining / ex.duration);
        if (remaining <= 0) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
            countEl.textContent = '✓';
            ringFill.style.stroke = 'var(--risk-low)';
            completeBtn.style.display = 'inline-flex';
        }
    }, 1000);
}

function completeExercise() {
    if (!activeExId) return;
    const ex = EXERCISES.find(e => e.id === activeExId);
    exState[activeExId] = { done: true, completedAt: Date.now(), duration: ex.duration };
    exTotalDuration += ex.duration;
    saveExState(exState);
    closeExModal();
    renderExCards();
}

function closeExModal() {
    if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
    document.getElementById('exModal').classList.add('hidden');
    document.getElementById('exRingFill').style.stroke = 'var(--accent)';
    activeExId = null;
}

// ── Event listeners ───────────────────────────────────────────────────────
document.getElementById('exModalCancel').addEventListener('click', closeExModal);
document.getElementById('exModalComplete').addEventListener('click', completeExercise);
document.getElementById('exResetBtn').addEventListener('click', () => {
    if (!confirm('Reset all daily exercise progress?')) return;
    localStorage.removeItem(EX_STORAGE_KEY);
    exState = {};
    exTotalDuration = 0;
    renderExCards();
});

// ── Boot ──────────────────────────────────────────────────────────────────
renderExCards();
