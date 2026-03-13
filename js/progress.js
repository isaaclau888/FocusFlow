// Progress Tracking, XP, Levels, and Badges

function calcLevelFromXP(xp) { 
  return Math.max(1, Math.floor((xp || 0) / 100) + 1); 
}

function minutesToLabel(seconds) {
  const mins = Math.floor((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * PROGRESS TRACKING MODULE
 * XP system, levels, badges, leaderboard, and achievement tracking
 */

// ============================================
// PROGRESS STATE VARIABLES
// ============================================

/**
 * Calculate achievement badges based on user's progress
 * @param {Object} p - User progress object
 * @returns {string[]}
 */
function computeBadges(p) {
  const b = new Set(p.badges || []);
  if ((p.tasksCompleted || 0) >= 1) b.add("First Steps");
  if ((p.tasksCompleted || 0) >= 10) b.add("Task Master");
  if ((p.tasksCompleted || 0) >= 50) b.add("Task Legend");
  if ((p.focusSeconds || 0) >= 60 * 60) b.add("Focus Rookie");
  if ((p.focusSeconds || 0) >= 10 * 60 * 60) b.add("Focus Pro");
  if ((p.focusSeconds || 0) >= 50 * 60 * 60) b.add("Focus Master");
  if ((p.examsCompleted || 0) >= 5) b.add("Exam Ready");
  if ((p.examsCompleted || 0) >= 20) b.add("Exam Master");
  if ((p.flashcardsStudied || 0) >= 100) b.add("Flashcard Scholar");
  if ((p.flashcardsStudied || 0) >= 500) b.add("Flashcard Genius");
  if ((p.streakDays || 0) >= 7) b.add("Streak Warrior");
  if ((p.streakDays || 0) >= 30) b.add("Streak Legend");
  if ((p.level || 1) >= 5) b.add("Rising Star");
  if ((p.level || 1) >= 10) b.add("Legendary Scholar");
  return Array.from(b);
}

/**
 * Ensure user has a progress document in Firestore
 */
async function ensureProgressDoc() {
  if (!auth.currentUser) return;
  const ref = db.collection("user_progress").doc(auth.currentUser.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || (auth.currentUser.email || "guest").split("@")[0],
      xp: 0,
      points: 0,
      level: 1,
      tasksCompleted: 0,
      examsCompleted: 0,
      flashcardsStudied: 0,
      focusSeconds: 0,
      streakDays: 1,
      lastActiveDate: todayKey(),
      badges: [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

/**
 * Get current user's progress data
 * @returns {Promise<Object|null>}
 */
async function getProgress() {
  if (!auth.currentUser) return null;
  const snap = await db.collection("user_progress").doc(auth.currentUser.uid).get();
  return snap.exists ? snap.data() : null;
}

/**
 * Award progress to user (XP, points, task completion, etc.)
 * @param {Object} delta - Progress deltas to add
 */
async function awardProgress(delta) {
  if (!auth.currentUser) return;
  await ensureProgressDoc();
  const cur = await getProgress();
  if (!cur) return;

  const next = { ...cur };
  next.tasksCompleted = (next.tasksCompleted || 0) + (delta.tasksCompleted || 0);
  next.examsCompleted = (next.examsCompleted || 0) + (delta.examsCompleted || 0);
  next.flashcardsStudied = (next.flashcardsStudied || 0) + (delta.flashcardsStudied || 0);
  next.focusSeconds = (next.focusSeconds || 0) + (delta.focusSeconds || 0);
  next.xp = (next.xp || 0) + (delta.xp || 0);
  next.points = (next.points || 0) + (delta.points || 0);
  next.lastActiveDate = todayKey();

  if (cur.lastActiveDate && cur.lastActiveDate !== todayKey()) {
    next.streakDays = cur.lastActiveDate === yesterdayKey() ? (cur.streakDays || 1) + 1 : 1;
  }

  next.level = calcLevelFromXP(next.xp);
  next.badges = computeBadges(next);

  await db.collection("user_progress").doc(auth.currentUser.uid).set({
    displayName: auth.currentUser.displayName || (auth.currentUser.email || "guest").split("@")[0],
    xp: next.xp,
    points: next.points,
    level: next.level,
    tasksCompleted: next.tasksCompleted,
    examsCompleted: next.examsCompleted,
    flashcardsStudied: next.flashcardsStudied,
    focusSeconds: next.focusSeconds,
    streakDays: next.streakDays,
    lastActiveDate: next.lastActiveDate,
    badges: next.badges,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  refreshProgressView();
}

async function refreshProgressView() {
  const p = await getProgress();
  if (!p) return;
  const set = (id, v) => { const el = safeEl(id); if (el) el.innerText = v; };
  set("prog-level", p.level || 1);
  set("prog-xp", p.xp || 0);
  set("prog-points", p.points || 0);
  set("prog-streak", `${p.streakDays || 0} days`);
  set("prog-tasks", p.tasksCompleted || 0);
  set("prog-exams", p.examsCompleted || 0);
  set("prog-flashcards", p.flashcardsStudied || 0);
  set("prog-focus", minutesToLabel(p.focusSeconds || 0));
  set("taskbar-points", `⭐ ${p.points || 0}`);

  const setW = (id, ratio) => {
    const el = safeEl(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%`;
  };
  setW("viz-tasks", (p.tasksCompleted || 0) / 10);
  setW("viz-focus", (p.focusSeconds || 0) / (10 * 60 * 60));
  setW("viz-level", (p.level || 1) / 10);

  const badges = safeEl("prog-badges");
  if (badges) {
    badges.innerHTML = "";
    const arr = p.badges || [];
    if (!arr.length) badges.innerHTML = "<span style='color:#888;'>No badges yet</span>";
    arr.forEach((b) => {
      const chip = document.createElement("span");
      chip.className = "badge-chip";
      chip.innerText = b;
      badges.appendChild(chip);
    });
  }
}

async function logTaskComplete(n = 1) {
  const c = Math.max(1, parseInt(n, 10) || 1);
  await awardProgress({ tasksCompleted: c, xp: c * 20, points: c * 10 });
}

async function logExamComplete(n = 1) {
  const c = Math.max(1, parseInt(n, 10) || 1);
  await awardProgress({ examsCompleted: c, xp: c * 60, points: c * 30 });
}

async function logFlashcardReviewed(n = 1) {
  const c = Math.max(1, parseInt(n, 10) || 1);
  await awardProgress({ flashcardsStudied: c, xp: c * 8, points: c * 4 });
}

async function addFocusProgressSeconds(sec) {
  const s = Math.max(0, parseInt(sec || 0, 10));
  if (s <= 0) return;
  await awardProgress({ focusSeconds: s, xp: Math.floor(s / 60), points: Math.floor(s / 300) });
}
