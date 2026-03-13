// Focus Timer App with Pomodoro, Countdown, and Stopwatch

/**
 * FOCUS TIMER MODULE
 * Pomodoro timer, countdown timer, and stopwatch functionality
 * Integrates with progress tracking and notifications
 */

// ============================================
// TIMER STATE VARIABLES
// ============================================

let timerInterval = null;           // Current timer interval ID
let timerMode = "pomodoro";         // 'pomodoro', 'countdown', or 'stopwatch'
let timerSeconds = 25 * 60;         // Current timer value in seconds
let timerInitialSeconds = 25 * 60;  // Initial timer value for progress tracking
let timerPomodoroPhase = "work";    // 'work', 'break', or 'longbreak'
let timerPomodoroWorkMins = 25;     // Focus session length
let timerPomodoroBreakMins = 5;     // Short break length
let timerPomodoroLongBreakMins = 15; // Long break after 4 cycles
let timerPomodoroCompletedCycles = 0; // Number of completed Pomodoro cycles
let timerLaps = [];                 // Stopwatch lap times
let timerSessionLabel = "Focus Time"; // User-defined session name
let timerHistory = [];              // History of past timer sessions
let sessionFocusTrackedSeconds = 0; // Seconds tracked in current session for XP

/**
 * Initialize timer UI and load history
 */
function initTimer() {
  loadTimerHistory();
  updateTimerDisplay(); 
  updateTimerUI();
  renderTimerHistory();
}

/**
 * Change timer mode (pomodoro, countdown, stopwatch)
 * @param {string} mode - 'pomodoro', 'countdown', or 'stopwatch'
 */
function setTimerMode(mode) { 
  timerMode = mode; 
  document.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
  const tab = safeEl(`tab-${mode}`);
  if (tab) tab.classList.add('active');
  
  if (mode === "pomodoro") {
    timerPomodoroPhase = "work";
    timerPomodoroCompletedCycles = 0;
    timerSessionLabel = "Focus Time";
  } else if (mode === "stopwatch") {
    timerSessionLabel = "Stopwatch";
    safeEl("timer-lap-btn")?.style.setProperty("display", "inline-block");
  } else {
    timerSessionLabel = "Timer";
  }
  
  resetTimer(); 
  updateTimerUI();
}

/**
 * Update UI based on current timer mode
 */
function updateTimerUI() {
  const presetsDiv = safeEl("timer-presets");
  const lapsDiv = safeEl("timer-laps-container");
  const lapBtn = safeEl("timer-lap-btn");
  const labelInput = safeEl("timer-session-label");
  
  if (timerMode === "stopwatch") {
    if (presetsDiv) presetsDiv.style.display = "none";
    if (lapsDiv) lapsDiv.style.display = "block";
    if (lapBtn) lapBtn.style.display = "inline-block";
    if (labelInput) labelInput.style.display = "block";
  } else {
    if (presetsDiv) presetsDiv.style.display = "flex";
    if (lapsDiv) lapsDiv.style.display = "none";
    if (lapBtn) lapBtn.style.display = "none";
    if (labelInput) labelInput.style.display = timerMode === "countdown" ? "block" : "none";
  }
  
  updateProgressCircle();
  updateTimerLabel();
}

/**
 * Update timer label display (shows current phase or custom label)
 */
function updateTimerLabel() {
  const label = safeEl("timer-label");
  const cycleInfo = safeEl("timer-cycle-info");
  const customLabel = safeEl("timer-session-label")?.value?.trim();
  
  if (!label) return;
  
  if (timerMode === "pomodoro") {
    label.innerText = timerPomodoroPhase === "work" ? "🍅 Focus Time" : "☕ Break Time";
    if (cycleInfo) cycleInfo.innerText = `Cycle ${timerPomodoroCompletedCycles + 1}/4`;
  } else if (timerMode === "stopwatch") {
    label.innerText = customLabel || "⏲ Stopwatch";
    if (cycleInfo) cycleInfo.innerText = "";
  } else {
    label.innerText = customLabel || "⏱ Timer";
    if (cycleInfo) cycleInfo.innerText = "";
  }
}

/**
 * Set countdown timer to quick preset (5, 10, 15, 25, 30, 45, 60 minutes)
 * @param {number} mins - Minutes for quick timer
 */
function setQuickTimer(mins) {
  if (timerMode === "stopwatch") return;
  const input = safeEl("focus-minutes-input");
  if (input) input.value = mins;
  timerSeconds = mins * 60;
  timerInitialSeconds = timerSeconds;
  updateTimerDisplay();
  updateProgressCircle();
}

/**
 * Set custom countdown timer from user input
 */
function setCountdownMinutes() {
  const mins = Math.max(1, parseInt((safeEl("focus-minutes-input")?.value || "25"), 10));
  timerSeconds = mins * 60;
  timerInitialSeconds = timerSeconds;
  updateTimerDisplay();
  updateProgressCircle();
  
  const customLabel = safeEl("timer-session-label")?.value?.trim();
  if (customLabel) timerSessionLabel = customLabel;
  updateTimerLabel();
}

/**
 * Start the timer countdown or stopwatch
 */
function startTimer() {
  if (timerInterval) return;
  
  const startBtn = safeEl("timer-start-btn");
  const pauseBtn = safeEl("timer-pause-btn");
  if (startBtn) startBtn.style.display = "none";
  if (pauseBtn) pauseBtn.style.display = "inline-block";
  
  timerInterval = setInterval(() => {
    sessionFocusTrackedSeconds += 1;
    
    if (timerMode === "countdown" || timerMode === "pomodoro") {
      timerSeconds = Math.max(0, timerSeconds - 1);
      if (timerSeconds === 0) {
        handleTimerComplete();
      }
    } else {
      timerSeconds += 1;
    }
    
    updateTimerDisplay();
    updateProgressCircle();
  }, 1000);
}

/**
 * Handle timer completion: play sound, show notifications, auto-advance cycles
 */
async function handleTimerComplete() {
  pauseTimer();
  playTimerSound();
  
  if (timerMode === "pomodoro") {
    if (timerPomodoroPhase === "work") {
      timerPomodoroCompletedCycles += 1;
      
      if (notificationSettings.enabled && notificationSettings.timer) {
        showSystemNotification(
          "🍅 Pomodoro Complete",
          "Great work! Time for a break.",
          "timer"
        );
        addNotificationToList({
          type: 'timer',
          title: 'Pomodoro Complete',
          body: `Cycle ${timerPomodoroCompletedCycles} finished`,
          timestamp: Date.now()
        });
      }
      
      if (timerPomodoroCompletedCycles % 4 === 0) {
        timerPomodoroPhase = "longbreak";
        timerSeconds = timerPomodoroLongBreakMins * 60;
        alert("🎉 Great work! Time for a long break (15 min).");
      } else {
        timerPomodoroPhase = "break";
        timerSeconds = timerPomodoroBreakMins * 60;
        alert("✅ Focus session complete! Time for a short break (5 min).");
      }
    } else {
      timerPomodoroPhase = "work";
      timerSeconds = timerPomodoroWorkMins * 60;
      alert("🍅 Break over! Ready for the next focus session?");
    }
    
    timerInitialSeconds = timerSeconds;
    updateTimerDisplay();
    updateTimerLabel();
    updateProgressCircle();
    
    if (confirm("Auto-start next cycle?")) {
      startTimer();
    }
  } else {
    await saveTimerSession();
    
    if (notificationSettings.enabled && notificationSettings.timer) {
      showSystemNotification(
        "⏰ Timer Complete",
        `${timerSessionLabel} finished`,
        "timer"
      );
      addNotificationToList({
        type: 'timer',
        title: 'Timer Complete',
        body: `${timerSessionLabel} finished`,
        timestamp: Date.now()
      });
    }
    
    alert("⏰ Timer complete!");
  }
}

function playTimerSound() {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTgIGWi77eifTRAMUKfj8LZjHAY4ktfxzHksBSR3x/DdkEAKFF606OuoVRQKRp/g8r5sIQU=');
  audio.volume = 0.3;
  audio.play().catch(() => {});
}

async function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const startBtn = safeEl("timer-start-btn");
  const pauseBtn = safeEl("timer-pause-btn");
  if (startBtn) startBtn.style.display = "inline-block";
  if (pauseBtn) pauseBtn.style.display = "none";
  
  if (sessionFocusTrackedSeconds > 0) {
    const gained = sessionFocusTrackedSeconds;
    sessionFocusTrackedSeconds = 0;
    await addFocusProgressSeconds(gained);
  }
}

async function resetTimer() {
  await pauseTimer();
  timerLaps = [];
  renderLaps();
  
  if (timerMode === "countdown") {
    const mins = Math.max(1, parseInt((safeEl("focus-minutes-input")?.value || "25"), 10));
    timerSeconds = mins * 60;
    timerInitialSeconds = timerSeconds;
  } else if (timerMode === "pomodoro") {
    timerPomodoroPhase = "work";
    timerPomodoroCompletedCycles = 0;
    timerSeconds = timerPomodoroWorkMins * 60;
    timerInitialSeconds = timerSeconds;
  } else {
    timerSeconds = 0;
    timerInitialSeconds = 0;
  }
  
  updateTimerDisplay();
  updateTimerLabel();
  updateProgressCircle();
}

function updateTimerDisplay() {
  const el = safeEl("focus-timer-display");
  if (!el) return;
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;
  
  if (h > 0) {
    el.innerText = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  } else {
    el.innerText = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
}

function updateProgressCircle() {
  const circle = safeEl("timer-progress-circle");
  if (!circle) return;
  
  const circumference = 534.07;
  let progress = 0;
  
  if (timerMode === "stopwatch") {
    circle.style.strokeDashoffset = "0";
    circle.style.stroke = "#2196F3";
    return;
  }
  
  if (timerInitialSeconds > 0) {
    progress = (timerInitialSeconds - timerSeconds) / timerInitialSeconds;
  }
  
  const offset = circumference - (progress * circumference);
  circle.style.strokeDashoffset = offset;
  
  if (timerMode === "pomodoro") {
    circle.style.stroke = timerPomodoroPhase === "work" ? "#4CAF50" : "#FF9800";
  } else {
    circle.style.stroke = "#4CAF50";
  }
}

function recordLap() {
  if (timerMode !== "stopwatch") return;
  const lapTime = timerSeconds;
  const lapNum = timerLaps.length + 1;
  timerLaps.push({ num: lapNum, time: lapTime });
  renderLaps();
}

function renderLaps() {
  const list = safeEl("timer-laps-list");
  if (!list) return;
  
  if (timerLaps.length === 0) {
    list.innerHTML = "<div style='text-align:center; color:#999; padding:8px;'>No laps recorded</div>";
    return;
  }
  
  list.innerHTML = timerLaps.map(lap => {
    const h = Math.floor(lap.time / 3600);
    const m = Math.floor((lap.time % 3600) / 60);
    const s = lap.time % 60;
    const timeStr = h > 0 
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `<div class="timer-lap-item"><span>Lap ${lap.num}</span><span>${timeStr}</span></div>`;
  }).join("");
}

async function saveTimerSession() {
  const duration = timerMode === "stopwatch" ? timerSeconds : timerInitialSeconds;
  const session = {
    label: timerSessionLabel || (timerMode === "pomodoro" ? "Pomodoro" : "Timer"),
    duration: duration,
    mode: timerMode,
    timestamp: Date.now()
  };
  
  timerHistory.unshift(session);
  if (timerHistory.length > 20) timerHistory = timerHistory.slice(0, 20);
  
  await saveTimerHistory();
  renderTimerHistory();
}

async function saveTimerHistory() {
  if (!auth.currentUser) return;
  try {
    await db.collection("user_data").doc(auth.currentUser.uid).set({
      timerHistory: timerHistory
    }, { merge: true });
  } catch (err) {
    console.error("Save timer history error:", err);
  }
}

async function loadTimerHistory() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
    const data = snap.exists ? snap.data() : {};
    timerHistory = Array.isArray(data.timerHistory) ? data.timerHistory : [];
  } catch (err) {
    console.error("Load timer history error:", err);
  }
}

function renderTimerHistory() {
  const list = safeEl("timer-history-list");
  if (!list) return;
  
  if (timerHistory.length === 0) {
    list.innerHTML = "<div style='text-align:center; color:#999; padding:12px; font-size:11px;'>No sessions yet</div>";
    return;
  }
  
  list.innerHTML = timerHistory.map(session => {
    const duration = Math.floor(session.duration / 60);
    const date = new Date(session.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    return `
      <div class="timer-history-item">
        <div>
          <div class="history-label">${session.label || 'Session'}</div>
          <div class="history-time">${dateStr} ${timeStr}</div>
        </div>
        <div class="history-duration">${duration}min</div>
      </div>
    `;
  }).join("");
}

async function clearTimerHistory() {
  if (!confirm("Clear all timer history?")) return;
  timerHistory = [];
  await saveTimerHistory();
  renderTimerHistory();
}
