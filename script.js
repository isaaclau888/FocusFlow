const firebaseConfig = {
  apiKey: "AIzaSyBR79eB-_7wLoQ-ksdJgOWHP8b0T5tcKhE",
  authDomain: "focusflow-96f7b.firebaseapp.com",
  projectId: "focusflow-96f7b",
  storageBucket: "focusflow-96f7b.firebasestorage.app",
  messagingSenderId: "572430071040",
  appId: "1:572430071040:web:2367a760cc47b24ff86fe5"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let topZ = 100;
let openApps = new Set();
let activeChat = null;
let chatListener = null;
let isAdminOwner = false;
let adminSelectedUid = null;
let adminEmails = [];

const DEFAULT_ADMIN_EMAILS = ["isaaclau888@yahoo.com", "isaaclau888@gmail.com"];

let timerInterval = null;
let timerMode = "pomodoro";
let timerSeconds = 25 * 60;
let timerInitialSeconds = 25 * 60;
let timerPomodoroPhase = "work";
let timerPomodoroWorkMins = 25;
let timerPomodoroBreakMins = 5;
let timerPomodoroLongBreakMins = 15;
let timerPomodoroCompletedCycles = 0;
let timerLaps = [];
let timerSessionLabel = "Focus Time";
let timerHistory = [];
let sessionFocusTrackedSeconds = 0;

let notificationSettings = {
  enabled: false,
  class: true,
  exam: true,
  message: true,
  todo: true,
  timer: true
};
let notificationList = [];
let notificationCheckInterval = null;
let lastMessageCount = 0;
let notifiedSchedules = new Set();
let notifiedExams = new Set();

let calendarCursor = new Date();
let calendarSchedules = [];
let todoList = [];
let examList = [];
let flashcardList = [];
let flashcardSets = [];
let currentFlashSetId = null;
let examCountdownInterval = null;
let stockMarketInterval = null;
let currentFlashcardId = null;
let flashShowBack = false;
let flashDeckTitle = "My Flashcard Set";
let flashSearchTerm = "";
let flashShuffleMode = false;
let flashFavoritesOnly = false;
let flashReviewedSession = 0;
let flashMode = "study";
let flashLearnReveal = false;
let flashWriteFeedback = "";
let flashWriteCorrect = false;
let flashMatchPairs = [];
let flashMatchSelectedTerm = null;
let flashMatchSelectedDef = null;
let flashMatchMatchedIds = new Set();
let flashImportFormat = "json";
let musicCurrentIndex = 0;
let musicIsPlaying = false;
let selectedStockSymbol = "TECHX";
let stockGame = {
  coins: 1500,
  prices: {},
  holdings: {},
  trades: [],
  history: {}
};
const musicTracks = [
  { title: "Focus Drift", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Deep Work Flow", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Calm Momentum", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];
const stockCatalog = [
  { symbol: "TECHX", name: "Tech X", base: 120, vol: 0.035 },
  { symbol: "GREEN", name: "Green Power", base: 78, vol: 0.028 },
  { symbol: "MEDIQ", name: "MediQ", base: 95, vol: 0.032 },
  { symbol: "ROBO", name: "RoboWorks", base: 142, vol: 0.04 },
  { symbol: "FOOD", name: "FoodChain", base: 56, vol: 0.025 },
  { symbol: "SPACE", name: "SpaceLift", base: 210, vol: 0.05 }
];
let calendarView = 'month';
let currentEditingEventId = null;
let currentEditingTodoId = null;
let todoFilterPriority = 'all';
let eventFilterType = 'all';

const appMeta = {
  notes: { title: "Notes", icon: "https://img.icons8.com/fluency/16/notebook.png" },
  browser: { title: "Browser", icon: "https://img.icons8.com/fluency/16/globe.png" },
  settings: { title: "Settings", icon: "https://img.icons8.com/fluency/16/settings.png" },
  taskmgr: { title: "Task Manager", icon: "https://img.icons8.com/fluency/16/activity-history.png" },
  weather: { title: "Weather", icon: "https://img.icons8.com/fluency/16/weather.png" },
  social: { title: "Social Hub", icon: "https://img.icons8.com/fluency/16/group.png" },
  focus: { title: "Focus Timer", icon: "https://img.icons8.com/fluency/16/time.png" },
  calendar: { title: "Calendar", icon: "https://img.icons8.com/fluency/16/calendar.png" },
  todolist: { title: "To-Do List", icon: "https://img.icons8.com/fluency/16/task.png" },
  exams: { title: "Exam/Test Planner", icon: "https://img.icons8.com/fluency/16/test-passed.png" },
  music: { title: "Music Player", icon: "https://img.icons8.com/fluency/16/musical-notes.png" },
  stocks: { title: "Stock Market Simulator", icon: "https://img.icons8.com/fluency/16/combo-chart.png" },
  flashcards: { title: "Flashcards", icon: "https://img.icons8.com/fluency/16/stack-of-photos.png" },
  progress: { title: "Progress", icon: "https://img.icons8.com/fluency/16/combo-chart.png" },
  leaderboard: { title: "Leaderboard", icon: "https://img.icons8.com/fluency/16/trophy.png" },
  admin: { title: "Admin Panel", icon: "https://img.icons8.com/fluency/16/lock.png" }
};

function safeEl(id) { return document.getElementById(id); }

function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

function uniqueEmails(list) {
  return Array.from(new Set((list || []).map(normalizeEmail).filter(Boolean)));
}

function updateSettingsProfile(user) {
  if (!user) return;
  const name = user.displayName || (user.email || "guest").split("@")[0];
  const avatar = safeEl("settings-avatar");
  const nameEl = safeEl("settings-name-display");
  const nameInput = safeEl("set-display-name");
  const googleStatus = safeEl("google-status-pill");
  const pwSection = safeEl("password-section");

  if (nameEl) nameEl.innerText = name;
  if (nameInput) nameInput.value = name;
  if (avatar) {
    const photo = user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    avatar.style.backgroundImage = `url('${photo}')`;
  }

  if (googleStatus) {
    const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
    if (isGoogle) {
      googleStatus.innerText = "Google Linked";
      googleStatus.style.background = "#e6f4ea";
      googleStatus.style.color = "#137333";
      if (pwSection) pwSection.style.display = "none";
    } else {
      googleStatus.innerText = "Email Account";
      googleStatus.style.background = "#fff3cd";
      googleStatus.style.color = "#856404";
      if (pwSection) pwSection.style.display = "block";
    }
  }
}

async function ensureAdminOwnerAccess() {
  if (!auth.currentUser) return;
  const icon = safeEl("admin-app-icon");
  isAdminOwner = false;
  try {
    const ref = db.collection("app_config").doc("admin_access");
    const snap = await ref.get();
    if (!snap.exists) {
      const defaults = uniqueEmails(DEFAULT_ADMIN_EMAILS);
      await ref.set({
        emails: defaults,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      adminEmails = defaults;
    } else {
      const d = snap.data() || {};
      adminEmails = uniqueEmails(d.emails || []);
      if (!adminEmails.length) {
        adminEmails = uniqueEmails(DEFAULT_ADMIN_EMAILS);
        await ref.set({ emails: adminEmails, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    const currentEmail = normalizeEmail(auth.currentUser.email);
    isAdminOwner = adminEmails.includes(currentEmail);
  } catch (e) {
    console.error("admin_access check failed", e);
  }
  if (icon) icon.style.display = isAdminOwner ? "flex" : "none";
}

async function saveAdminEmails(nextEmails) {
  const emails = uniqueEmails(nextEmails);
  await db.collection("app_config").doc("admin_access").set({
    emails,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  adminEmails = emails;
  const currentEmail = normalizeEmail(auth.currentUser?.email || "");
  isAdminOwner = adminEmails.includes(currentEmail);
  const icon = safeEl("admin-app-icon");
  if (icon) icon.style.display = isAdminOwner ? "flex" : "none";
}

function renderAdminEmails() {
  const list = safeEl("admin-admins-list");
  if (!list) return;
  list.innerHTML = "";
  if (!adminEmails.length) {
    list.innerHTML = "<div style='color:#888;'>No admins configured</div>";
    return;
  }
  adminEmails.forEach((email) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "4px 0";
    const left = document.createElement("span");
    left.style.fontSize = "12px";
    left.innerText = email;
    row.appendChild(left);

    if (isAdminOwner) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "kill-btn";
      removeBtn.innerText = "Remove";
      removeBtn.onclick = () => removeAdminEmail(email);
      row.appendChild(removeBtn);
    }

    list.appendChild(row);
  });
}

async function addAdminEmail() {
  if (!isAdminOwner) return alert("Admin access required.");
  const input = safeEl("admin-new-email");
  const email = normalizeEmail(input?.value || "");
  if (!email || !email.includes("@") || !email.includes(".")) return alert("Enter a valid email.");
  if (adminEmails.includes(email)) return alert("That email is already an admin.");
  await saveAdminEmails([...adminEmails, email]);
  if (input) input.value = "";
  renderAdminEmails();
}

async function removeAdminEmail(email) {
  if (!isAdminOwner) return alert("Admin access required.");
  const normalized = normalizeEmail(email);
  const next = adminEmails.filter((e) => e !== normalized);
  if (!next.length) return alert("At least one admin is required.");
  await saveAdminEmails(next);
  renderAdminEmails();
}

auth.onAuthStateChanged(async (user) => {
  const login = safeEl("login-screen");
  const os = safeEl("os-interface");
  const loader = safeEl("loading-screen");

  try {
    if (user) {
      const displayName = user.displayName || (user.email || "guest").split("@")[0];
      if (login) login.style.display = "none";
      if (os) os.style.display = "block";
      if (safeEl("user-display-name")) safeEl("user-display-name").innerText = displayName;

      updateSettingsProfile(user);

      await db.collection("users").doc(user.uid).set({
        email: user.email || "",
        displayName
      }, { merge: true });

      await ensureProgressDoc();
      await ensureAdminOwnerAccess();

      loadFriends();
      loadFriendRequests();
      loadBlockedUsers();
      await refreshProgressView();
      loadCalendarSchedules();
      loadTodoList();
      loadExamList();
      loadFlashcards();
      loadStockGame();
      loadNotificationSettings();

      const doc = await db.collection("user_data").doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.notes && safeEl("note-textarea")) safeEl("note-textarea").value = data.notes;
        if (data.wallpaper) applyWallpaper(data.wallpaper);
      }
    } else {
      if (login) login.style.display = "flex";
      if (os) os.style.display = "none";
    }
  } catch (err) {
    console.error("Startup error", err);
    if (user) {
      if (login) login.style.display = "none";
      if (os) os.style.display = "block";
    }
  } finally {
    if (loader) {
      loader.classList.add("loader-hidden");
      setTimeout(() => { loader.style.display = "none"; }, 800);
    }
  }
});

function googleLogin() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function emailLogin() {
  const email = safeEl("email")?.value || "";
  const pass = safeEl("password")?.value || "";
  auth.signInWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
}
function emailRegister() {
  const email = safeEl("email")?.value || "";
  const pass = safeEl("password")?.value || "";
  auth.createUserWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
}
function forgotPassword() {
  const email = safeEl("email")?.value || "";
  if (!email) return alert("Enter your email");
  auth.sendPasswordResetEmail(email).then(() => alert("Reset email sent")).catch((e) => alert(e.message));
}
function toggleAuthMode(reg) {
  const login = safeEl("login-actions");
  const register = safeEl("register-actions");
  if (!login || !register) return;
  login.style.display = reg ? "none" : "block";
  register.style.display = reg ? "block" : "none";
}
function logout() { auth.signOut(); }

function saveNotes() {
  if (!auth.currentUser) return;
  db.collection("user_data").doc(auth.currentUser.uid).set({ notes: safeEl("note-textarea")?.value || "" }, { merge: true });
}

function applyWallpaper(value) {
  const wp = document.querySelector(".wallpaper");
  if (!wp) return;
  if ((value + "").includes("gradient(")) {
    wp.style.backgroundImage = "none";
    wp.style.background = value;
  } else {
    wp.style.background = "";
    wp.style.backgroundImage = `url('${value}')`;
    wp.style.backgroundSize = "cover";
    wp.style.backgroundPosition = "center";
  }
}

function changeWallpaper(url) {
  if (!auth.currentUser || !url) return;
  applyWallpaper(url);
  db.collection("user_data").doc(auth.currentUser.uid).set({ wallpaper: url }, { merge: true });
}

function changeWallpaperGradient(gradient) {
  if (!auth.currentUser || !gradient) return;
  applyWallpaper(gradient);
  db.collection("user_data").doc(auth.currentUser.uid).set({ wallpaper: gradient }, { merge: true });
}

function updateDisplayName() {
  const newName = safeEl("set-display-name")?.value || "";
  if (!auth.currentUser || !newName) return;
  auth.currentUser.updateProfile({ displayName: newName }).then(() => {
    if (safeEl("settings-name-display")) safeEl("settings-name-display").innerText = newName;
    if (safeEl("user-display-name")) safeEl("user-display-name").innerText = newName;
  });
}

function updatePassword() {
  const pass = safeEl("new-password")?.value || "";
  if (!auth.currentUser || !pass) return;
  auth.currentUser.updatePassword(pass).then(() => alert("Password updated")).catch((e) => alert(e.message));
}

function bringToFront(el) { topZ += 1; el.style.zIndex = topZ; }

function dragWindow(handleOrElmnt) {
  let handle = handleOrElmnt;
  let target = null;
  if (handleOrElmnt?.classList?.contains("app-icon")) target = handleOrElmnt;
  else if (handleOrElmnt?.classList?.contains("window")) {
    target = handleOrElmnt;
    const hdr = handleOrElmnt.querySelector(".window-header");
    if (hdr) handle = hdr;
  } else {
    handle = handleOrElmnt;
    target = handle?.parentElement || null;
  }
  if (!handle || !target) return;

  handle.onmousedown = function (e) {
    if (["INPUT", "BUTTON", "TEXTAREA", "A", "SELECT", "LABEL", "OPTION"].includes(e.target.tagName)) return;
    if (target.classList.contains("maximized")) return;
    bringToFront(target);
    let pos3 = e.clientX;
    let pos4 = e.clientY;
    document.onmousemove = function (ev) {
      const pos1 = pos3 - ev.clientX;
      const pos2 = pos4 - ev.clientY;
      pos3 = ev.clientX;
      pos4 = ev.clientY;
      target.style.top = (target.offsetTop - pos2) + "px";
      target.style.left = (target.offsetLeft - pos1) + "px";
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function makeResizable(win) {
  if (win._resizableInitialized) return;
  win._resizableInitialized = true;
  const handle = win.querySelector(".resize-handle");
  if (!handle) return;
  handle.onmousedown = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (win.classList.contains("maximized")) return;
    bringToFront(win);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.offsetWidth;
    const startH = win.offsetHeight;
    document.onmousemove = function (ev) {
      win.style.width = Math.max(320, startW + (ev.clientX - startX)) + "px";
      win.style.height = Math.max(220, startH + (ev.clientY - startY)) + "px";
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function openApp(id) {
  if (id === "admin" && !isAdminOwner) return alert("Admin Panel is restricted to admin accounts.");
  const win = safeEl("window-" + id);
  if (!win) return;
  win.style.display = "flex";
  openApps.add(id);
  bringToFront(win);
  makeResizable(win);
  updateTaskbar();
  updateTaskManager();

  if (id === "social") { loadFriends(); loadFriendRequests(); loadBlockedUsers(); }
  if (id === "focus") initFocusTimer();
  if (id === "calendar") { renderCalendar(); loadCalendarSchedules(); }
  if (id === "todolist") loadTodoList();
  if (id === "exams") {
    loadExamList();
    startExamCountdownTicker();
  }
  if (id === "music") initMusicApp();
  if (id === "stocks") {
    loadStockGame();
    startStockMarket();
  }
  if (id === "flashcards") {
    loadFlashcards();
    renderFlashcardStudy();
  }
  if (id === "progress") {
    refreshProgressView().catch((err) => console.error("Error refreshing progress:", err));
  }
  if (id === "leaderboard") loadLeaderboard();
  if (id === "admin") loadAdminPanel();
}

function closeApp(id) {
  const win = safeEl("window-" + id);
  if (!win) return;
  win.style.display = "none";
  openApps.delete(id);
  if (id === "exams" && examCountdownInterval) {
    clearInterval(examCountdownInterval);
    examCountdownInterval = null;
  }
  if (id === "stocks" && stockMarketInterval) {
    clearInterval(stockMarketInterval);
    stockMarketInterval = null;
  }
  updateTaskbar();
  updateTaskManager();
}

function minimizeApp(id) { const win = safeEl("window-" + id); if (win) win.style.display = "none"; }
function toggleMaximize(id) { const win = safeEl("window-" + id); if (win) win.classList.toggle("maximized"); }

function updateTaskbar() {
  const bar = safeEl("active-apps-bar");
  if (!bar) return;
  bar.innerHTML = "";
  openApps.forEach((id) => {
    if (!appMeta[id]) return;
    const btn = document.createElement("button");
    btn.className = "active-app-btn";
    btn.innerHTML = `<img src=\"${appMeta[id].icon}\"> <span>${appMeta[id].title}</span>`;
    btn.onclick = () => {
      const win = safeEl("window-" + id);
      if (!win) return;
      win.style.display = "flex";
      bringToFront(win);
    };
    bar.appendChild(btn);
  });
}

function updateTaskManager() {
  const list = safeEl("task-list");
  if (!list) return;
  list.innerHTML = "";
  openApps.forEach((id) => {
    const title = appMeta[id]?.title || id;
    list.innerHTML += `<tr><td>${title}</td><td><span style=\"color:#27c93f\">Active</span></td><td><button class=\"btn-save\" onclick=\"logTaskComplete(1)\">Complete</button> <button class=\"kill-btn\" onclick=\"closeApp('${id}')\">End Task</button></td></tr>`;
  });
}

function navigateBrowser() {
  let url = safeEl("browser-url")?.value || "";
  if (!url.includes(".")) url = "https://www.bing.com/search?q=" + encodeURIComponent(url);
  else if (!url.startsWith("http")) url = "https://" + url;
  const frame = safeEl("browser-frame");
  if (frame) frame.src = url;
}

setInterval(() => {
  const c = safeEl("clock");
  if (c) c.innerText = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}, 1000);

function calcLevelFromXP(xp) { return Math.max(1, Math.floor((xp || 0) / 100) + 1); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function minutesToLabel(seconds) {
  const mins = Math.floor((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

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

async function getProgress() {
  if (!auth.currentUser) return null;
  const snap = await db.collection("user_progress").doc(auth.currentUser.uid).get();
  return snap.exists ? snap.data() : null;
}

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

async function loadLeaderboard() {
  const body = safeEl("leaderboard-body");
  if (!body) return;
  body.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  const snap = await db.collection("user_progress").orderBy("xp", "desc").limit(100).get();
  if (snap.empty) {
    body.innerHTML = "<tr><td colspan='5'>No users yet</td></tr>";
    return;
  }
  body.innerHTML = "";
  let rank = 1;
  snap.forEach((doc) => {
    const d = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${rank++}</td><td>${d.displayName || "Unknown"}</td><td>${d.level || 1}</td><td>${d.xp || 0}</td><td>${(d.badges || []).length}</td>`;
    body.appendChild(tr);
  });
}

async function isBlockedBetween(userA, userB) {
  const a = await db.collection("blocks").where("owner", "==", userA).where("target", "==", userB).limit(1).get();
  if (!a.empty) return true;
  const b = await db.collection("blocks").where("owner", "==", userB).where("target", "==", userA).limit(1).get();
  return !b.empty;
}

async function sendFriendRequest() {
  const email = safeEl("friend-email")?.value || "";
  if (!email) return alert("Enter an email");
  if (!auth.currentUser) return;
  if (email === auth.currentUser.email) return alert("You cannot send a request to yourself");

  const snap = await db.collection("users").where("email", "==", email).get();
  if (snap.empty) return alert("User not found");
  const friendDoc = snap.docs[0];
  const friendId = friendDoc.id;

  if (await isBlockedBetween(auth.currentUser.uid, friendId)) return alert("Blocked relationship prevents request.");

  const existing = await db.collection("friends").where("owner", "==", auth.currentUser.uid).where("friend", "==", friendId).get();
  if (!existing.empty) return alert("Already friends");

  await db.collection("friend_requests").add({
    from: auth.currentUser.uid,
    to: friendId,
    fromName: auth.currentUser.displayName || (auth.currentUser.email || "").split("@")[0],
    status: "pending",
    ts: firebase.firestore.FieldValue.serverTimestamp()
  });

  if (safeEl("friend-email")) safeEl("friend-email").value = "";
  alert("Friend request sent");
}

async function loadFriendRequests() {
  if (!auth.currentUser) return;
  const container = safeEl("incoming-requests");
  if (!container) return;
  container.innerHTML = "";
  const snap = await db.collection("friend_requests").where("to", "==", auth.currentUser.uid).where("status", "==", "pending").get();
  if (snap.empty) {
    container.innerHTML = "<div style='color:#888;'>No incoming requests</div>";
    return;
  }
  for (const doc of snap.docs) {
    const d = doc.data();
    if (await isBlockedBetween(auth.currentUser.uid, d.from)) continue;
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "6px 0";
    const left = document.createElement("div");
    left.innerText = d.fromName || "Unknown";
    const right = document.createElement("div");
    const a = document.createElement("button"); a.className = "btn-save"; a.innerText = "Accept"; a.onclick = () => acceptFriendRequest(doc.id);
    const de = document.createElement("button"); de.className = "kill-btn"; de.innerText = "Decline"; de.onclick = () => declineFriendRequest(doc.id);
    const bl = document.createElement("button"); bl.className = "kill-btn"; bl.innerText = "Block"; bl.onclick = () => blockUser(d.from);
    right.appendChild(a); right.appendChild(de); right.appendChild(bl);
    row.appendChild(left); row.appendChild(right);
    container.appendChild(row);
  }
}

async function acceptFriendRequest(id) {
  const ref = db.collection("friend_requests").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data();
  if (await isBlockedBetween(auth.currentUser.uid, d.from)) return alert("Blocked relationship.");
  await db.collection("friends").add({ owner: auth.currentUser.uid, friend: d.from });
  await db.collection("friends").add({ owner: d.from, friend: auth.currentUser.uid });
  await ref.update({ status: "accepted", acceptedAt: firebase.firestore.FieldValue.serverTimestamp() });
  loadFriends();
  loadFriendRequests();
}

async function declineFriendRequest(id) {
  await db.collection("friend_requests").doc(id).set({ status: "declined", decidedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  loadFriendRequests();
}

async function loadFriends() {
  const list = safeEl("friends-list");
  if (!list || !auth.currentUser) return;
  list.innerHTML = "";

  const self = document.createElement("div");
  self.style.padding = "6px 0";
  self.innerHTML = "<span style='cursor:pointer;'>Saved Messages</span>";
  self.onclick = () => openChat(auth.currentUser.uid, "Saved Messages");
  list.appendChild(self);

  const snap = await db.collection("friends").where("owner", "==", auth.currentUser.uid).get();
  for (const doc of snap.docs) {
    const fid = doc.data().friend;
    if (await isBlockedBetween(auth.currentUser.uid, fid)) continue;
    const userDoc = await db.collection("users").doc(fid).get();
    if (!userDoc.exists) continue;
    const user = userDoc.data();

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "6px 0";

    const left = document.createElement("span");
    left.style.cursor = "pointer";
    left.innerText = user.displayName || user.email || "Unknown";
    left.onclick = () => openChat(fid, left.innerText);

    const right = document.createElement("div");
    const u = document.createElement("button"); u.className = "btn-save"; u.innerText = "Unfriend"; u.onclick = () => unfriendUser(fid);
    const b = document.createElement("button"); b.className = "kill-btn"; b.innerText = "Block"; b.onclick = () => blockUser(fid);
    right.appendChild(u); right.appendChild(b);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
}

async function unfriendUser(friendId) {
  if (!auth.currentUser) return;
  const mine = await db.collection("friends").where("owner", "==", auth.currentUser.uid).where("friend", "==", friendId).get();
  const theirs = await db.collection("friends").where("owner", "==", friendId).where("friend", "==", auth.currentUser.uid).get();
  const ops = [];
  mine.forEach((d) => ops.push(db.collection("friends").doc(d.id).delete()));
  theirs.forEach((d) => ops.push(db.collection("friends").doc(d.id).delete()));
  await Promise.all(ops);
  if (activeChat === friendId) {
    activeChat = null;
    if (safeEl("chat-header")) safeEl("chat-header").innerText = "Select a friend";
    if (safeEl("chat-messages")) safeEl("chat-messages").innerHTML = "";
  }
  loadFriends();
}

async function blockUser(friendId) {
  if (!auth.currentUser) return;
  const existing = await db.collection("blocks").where("owner", "==", auth.currentUser.uid).where("target", "==", friendId).limit(1).get();
  if (existing.empty) {
    await db.collection("blocks").add({ owner: auth.currentUser.uid, target: friendId, ts: firebase.firestore.FieldValue.serverTimestamp() });
  }
  await unfriendUser(friendId);
  loadBlockedUsers();
  loadFriendRequests();
}

async function loadBlockedUsers() {
  if (!auth.currentUser) return;
  const list = safeEl("blocked-list");
  if (!list) return;
  list.innerHTML = "";
  const snap = await db.collection("blocks").where("owner", "==", auth.currentUser.uid).get();
  if (snap.empty) {
    list.innerHTML = "<div style='color:#888;'>No blocked users</div>";
    return;
  }
  for (const doc of snap.docs) {
    const uid = doc.data().target;
    const u = await db.collection("users").doc(uid).get();
    const name = u.exists ? (u.data().displayName || u.data().email || "Unknown") : "Unknown";
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "6px 0";
    row.innerHTML = `<span>${name}</span>`;
    const b = document.createElement("button");
    b.className = "btn-save";
    b.innerText = "Unblock";
    b.onclick = () => unblockUser(doc.id);
    row.appendChild(b);
    list.appendChild(row);
  }
}

async function unblockUser(blockDocId) {
  await db.collection("blocks").doc(blockDocId).delete();
  loadBlockedUsers();
  loadFriendRequests();
}

function openChat(friendId, name) {
  activeChat = friendId;
  if (safeEl("chat-header")) safeEl("chat-header").innerText = name;
  listenMessages();
}

function listenMessages() {
  if (!auth.currentUser || !activeChat) return;
  if (chatListener) chatListener();
  
  let isFirstLoad = true;
  
  chatListener = db.collection("messages").orderBy("time").onSnapshot((snapshot) => {
    const box = safeEl("chat-messages");
    if (!box) return;
    box.innerHTML = "";
    
    const messages = [];
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const me = auth.currentUser.uid;
      const visible = (msg.sender === me && msg.chat === activeChat) || (msg.sender === activeChat && msg.chat === me) || (activeChat === me && msg.chat === me);
      if (!visible) return;
      
      messages.push(msg);
      
      const div = document.createElement("div");
      div.className = "message" + (msg.sender === me ? " own" : "");
      div.innerHTML = `${msg.text || ""}${msg.file ? `<br><a href='${msg.file}' target='_blank'>Download</a>` : ""}`;
      box.appendChild(div);
    });
    
    // Detect new incoming messages (not from current user)
    if (!isFirstLoad && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== auth.currentUser.uid && lastMsg.sender === activeChat) {
        // Get sender name
        db.collection("users").doc(lastMsg.sender).get().then(userDoc => {
          const senderName = userDoc.exists ? (userDoc.data().displayName || "Someone") : "Someone";
          notifyNewMessage(senderName, lastMsg.text || "Sent a file");
        });
      }
    }
    
    isFirstLoad = false;
    
    // Scroll to bottom
    if (box) box.scrollTop = box.scrollHeight;
  });
}

async function sendMessage() {
  if (!auth.currentUser || !activeChat) return;
  const input = safeEl("chat-input");
  const fileEl = safeEl("file-upload");
  const file = fileEl?.files?.[0] || null;
  let fileURL = null;

  if (file) {
    const ref = storage.ref("chatFiles/" + Date.now() + "_" + file.name);
    await ref.put(file);
    fileURL = await ref.getDownloadURL();
  }

  await db.collection("messages").add({
    chat: activeChat,
    sender: auth.currentUser.uid,
    text: input?.value || "",
    file: fileURL,
    time: firebase.firestore.FieldValue.serverTimestamp()
  });

  if (input) input.value = "";
  if (fileEl) fileEl.value = "";
}

function initFocusTimer() { 
  loadTimerHistory();
  updateTimerDisplay(); 
  updateTimerUI();
  renderTimerHistory();
}

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

function setQuickTimer(mins) {
  if (timerMode === "stopwatch") return;
  const input = safeEl("focus-minutes-input");
  if (input) input.value = mins;
  timerSeconds = mins * 60;
  timerInitialSeconds = timerSeconds;
  updateTimerDisplay();
  updateProgressCircle();
}

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

// ====== NOTIFICATION SYSTEM ======

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Your browser does not support notifications");
    return;
  }
  
  const permission = await Notification.requestPermission();
  notificationSettings.enabled = permission === "granted";
  
  const statusEl = safeEl("notif-status");
  const btn = safeEl("notif-enable-btn");
  const icon = safeEl("notification-icon");
  const divider = safeEl("notif-divider");
  
  if (permission === "granted") {
    if (statusEl) statusEl.innerText = "✓ Notifications are enabled";
    if (statusEl) statusEl.style.color = "#fff";
    if (statusEl) statusEl.style.background = "#4CAF50";
    if (statusEl) statusEl.style.borderColor = "#4CAF50";
    if (btn) btn.disabled = true;
    if (btn) btn.innerText = "✓ Enabled";
    if (btn) btn.style.background = "#4CAF50";
    if (icon) icon.style.display = "block";
    if (divider) divider.style.display = "block";
    
    startNotificationChecks();
    showSystemNotification("Notifications Enabled", "You'll receive reminders for classes, exams, and messages", "timer");
  } else if (permission === "denied") {
    if (statusEl) statusEl.innerText = "✗ Denied - Check your browser settings to enable";
    if (statusEl) statusEl.style.color = "#fff";
    if (statusEl) statusEl.style.background = "#f44336";
    if (statusEl) statusEl.style.borderColor = "#f44336";
  }
  
  await saveNotificationSettings();
}

async function saveNotificationSettings() {
  if (!auth.currentUser) return;
  
  const classCheck = safeEl("notif-class");
  const examCheck = safeEl("notif-exam");
  const messageCheck = safeEl("notif-message");
  const todoCheck = safeEl("notif-todo");
  const timerCheck = safeEl("notif-timer");
  
  if (classCheck) notificationSettings.class = classCheck.checked;
  if (examCheck) notificationSettings.exam = examCheck.checked;
  if (messageCheck) notificationSettings.message = messageCheck.checked;
  if (todoCheck) notificationSettings.todo = todoCheck.checked;
  if (timerCheck) notificationSettings.timer = timerCheck.checked;
  
  await db.collection("user_data").doc(auth.currentUser.uid).set({
    notificationSettings: notificationSettings
  }, { merge: true });
}

async function loadNotificationSettings() {
  if (!auth.currentUser) return;
  
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  
  if (data.notificationSettings) {
    notificationSettings = { ...notificationSettings, ...data.notificationSettings };
  }
  
  const classCheck = safeEl("notif-class");
  const examCheck = safeEl("notif-exam");
  const messageCheck = safeEl("notif-message");
  const todoCheck = safeEl("notif-todo");
  const timerCheck = safeEl("notif-timer");
  
  if (classCheck) classCheck.checked = notificationSettings.class;
  if (examCheck) examCheck.checked = notificationSettings.exam;
  if (messageCheck) messageCheck.checked = notificationSettings.message;
  if (todoCheck) todoCheck.checked = notificationSettings.todo;
  if (timerCheck) timerCheck.checked = notificationSettings.timer;
  
  const statusEl = safeEl("notif-status");
  const btn = safeEl("notif-enable-btn");
  const icon = safeEl("notification-icon");
  const divider = safeEl("notif-divider");
  
  if (notificationSettings.enabled && Notification.permission === "granted") {
    if (statusEl) statusEl.innerText = "✓ Notifications are enabled";
    if (statusEl) statusEl.style.color = "#fff";
    if (statusEl) statusEl.style.background = "#4CAF50";
    if (statusEl) statusEl.style.borderColor = "#4CAF50";
    if (btn) btn.disabled = true;
    if (btn) btn.innerText = "✓ Enabled";
    if (btn) btn.style.background = "#4CAF50";
    if (icon) icon.style.display = "block";
    if (divider) divider.style.display = "block";
    startNotificationChecks();
  } else if (Notification.permission === "denied") {
    if (statusEl) statusEl.innerText = "✗ Denied - Check your browser settings to enable";
    if (statusEl) statusEl.style.color = "#fff";
    if (statusEl) statusEl.style.background = "#f44336";
    if (statusEl) statusEl.style.borderColor = "#f44336";
  }
}

function startNotificationChecks() {
  if (notificationCheckInterval) return;
  
  notificationCheckInterval = setInterval(() => {
    checkScheduleNotifications();
    checkExamNotifications();
    checkTodoNotifications();
  }, 60000); // Check every minute
  
  // Initial check
  setTimeout(() => {
    checkScheduleNotifications();
    checkExamNotifications();
    checkTodoNotifications();
  }, 5000);
}

function checkScheduleNotifications() {
  if (!notificationSettings.enabled || !notificationSettings.class) return;
  
  const now = new Date();
  const reminderMinutes = 10;
  
  calendarSchedules.forEach(schedule => {
    if (!schedule.date || !schedule.startTime) return;
    
    const [year, month, day] = schedule.date.split('-').map(Number);
    const [hours, minutes] = schedule.startTime.split(':').map(Number);
    const scheduleTime = new Date(year, month - 1, day, hours, minutes);
    const diffMs = scheduleTime - now;
    const diffMins = Math.floor(diffMs / 60000);
    
    const key = `${schedule.id}_${schedule.date}_${schedule.startTime}`;
    
    if (diffMins > 0 && diffMins <= reminderMinutes && !notifiedSchedules.has(key)) {
      notifiedSchedules.add(key);
      showSystemNotification(
        `Class Starting in ${diffMins} min`,
        `${schedule.title}${schedule.location ? ' at ' + schedule.location : ''}`,
        'class'
      );
      addNotificationToList({
        type: 'class',
        title: `Class Starting Soon`,
        body: `${schedule.title} starts in ${diffMins} minutes${schedule.location ? ' at ' + schedule.location : ''}`,
        timestamp: Date.now()
      });
    }
  });
}

function checkExamNotifications() {
  if (!notificationSettings.enabled || !notificationSettings.exam) return;
  
  const now = new Date();
  
  examList.forEach(exam => {
    if (!exam.date || !exam.time) return;
    
    const [year, month, day] = exam.date.split('-').map(Number);
    const [hours, minutes] = exam.time.split(':').map(Number);
    const examTime = new Date(year, month - 1, day, hours, minutes);
    const diffMs = examTime - now;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    const key1Day = `${exam.id}_1day`;
    const key1Hour = `${exam.id}_1hour`;
    
    if (diffDays === 1 && diffHours >= 23 && diffHours <= 25 && !notifiedExams.has(key1Day)) {
      notifiedExams.add(key1Day);
      showSystemNotification(
        '📚 Exam Tomorrow',
        `${exam.subject} exam at ${exam.time}`,
        'exam'
      );
      addNotificationToList({
        type: 'exam',
        title: 'Exam Tomorrow',
        body: `${exam.subject} exam at ${exam.time}`,
        timestamp: Date.now()
      });
    } else if (diffHours === 1 && !notifiedExams.has(key1Hour)) {
      notifiedExams.add(key1Hour);
      showSystemNotification(
        '⚠️ Exam in 1 Hour',
        `${exam.subject} exam starting soon!`,
        'exam'
      );
      addNotificationToList({
        type: 'exam',
        title: 'Exam in 1 Hour',
        body: `${exam.subject} exam starting soon!`,
        timestamp: Date.now()
      });
    }
  });
}

function checkTodoNotifications() {
  if (!notificationSettings.enabled || !notificationSettings.todo) return;
  
  const now = new Date();
  const today = todayKey();
  
  todoList.forEach(todo => {
    if (!todo.deadline || todo.completed) return;
    
    const [year, month, day] = todo.deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const diffMs = deadlineDate - now;
    const diffDays = Math.floor(diffMs / 86400000);
    
    const key = `${todo.id}_${today}`;
    
    if (diffDays === 0 && !notifiedSchedules.has(key)) {
      notifiedSchedules.add(key);
      showSystemNotification(
        '📝 Todo Due Today',
        todo.title,
        'todo'
      );
      addNotificationToList({
        type: 'todo',
        title: 'Todo Due Today',
        body: todo.title,
        timestamp: Date.now()
      });
    }
  });
}

function showSystemNotification(title, body, type) {
  if (!notificationSettings.enabled || Notification.permission !== "granted") return;
  
  const notif = new Notification(title, {
    body: body,
    icon: 'https://img.icons8.com/fluency/96/notification.png',
    badge: 'https://img.icons8.com/fluency/96/notification.png',
    tag: type,
    requireInteraction: false
  });
  
  notif.onclick = () => {
    window.focus();
    notif.close();
    
    if (type === 'class') openApp('calendar');
    else if (type === 'exam') openApp('exams');
    else if (type === 'message') openApp('social');
    else if (type === 'todo') openApp('todo');
  };
}

function addNotificationToList(notif) {
  notificationList.unshift(notif);
  if (notificationList.length > 50) notificationList = notificationList.slice(0, 50);
  
  updateNotificationBadge();
  renderNotificationList();
}

function updateNotificationBadge() {
  const badge = safeEl("notification-badge");
  const count = notificationList.length;
  
  if (badge) {
    if (count > 0) {
      badge.innerText = count > 99 ? "99+" : count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

function renderNotificationList() {
  const list = safeEl("notification-list");
  if (!list) return;
  
  if (notificationList.length === 0) {
    list.innerHTML = "<div style='text-align:center; color:#999; padding:20px; font-size:12px;'>No notifications</div>";
    return;
  }
  
  list.innerHTML = notificationList.map((notif, idx) => {
    const timeAgo = getTimeAgo(notif.timestamp);
    return `
      <div class="notification-item ${notif.type}" onclick="notificationClick(${idx})">
        <div class="notif-title">${notif.title}</div>
        <div class="notif-body">${notif.body}</div>
        <div class="notif-time">${timeAgo}</div>
      </div>
    `;
  }).join("");
}

function notificationClick(idx) {
  const notif = notificationList[idx];
  if (!notif) return;
  
  if (notif.type === 'class') openApp('calendar');
  else if (notif.type === 'exam') openApp('exams');
  else if (notif.type === 'message') openApp('social');
  else if (notif.type === 'todo') openApp('todo');
  
  toggleNotificationPanel();
}

function toggleNotificationPanel() {
  const panel = safeEl("notification-panel");
  if (!panel) return;
  
  if (panel.style.display === "none") {
    panel.style.display = "block";
    renderNotificationList();
  } else {
    panel.style.display = "none";
  }
}

function clearAllNotifications() {
  if (!confirm("Clear all notifications?")) return;
  notificationList = [];
  updateNotificationBadge();
  renderNotificationList();
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function notifyNewMessage(senderName, messageText) {
  if (!notificationSettings.enabled || !notificationSettings.message) return;
  
  showSystemNotification(
    `💬 ${senderName}`,
    messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
    'message'
  );
  
  addNotificationToList({
    type: 'message',
    title: `New message from ${senderName}`,
    body: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
    timestamp: Date.now()
  });
}

function prevMonth() {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
}
function nextMonth() {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
}
function renderCalendar() {
  const title = safeEl("calendar-title");
  const grid = safeEl("calendar-grid");
  if (!title || !grid) return;
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  title.innerText = new Date(y, m, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  grid.innerHTML = "";
  for (let i = 0; i < first; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell muted";
    grid.appendChild(blank);
  }
  for (let d = 1; d <= days; d++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.innerText = d;
    if (today.getFullYear() === y && today.getMonth() === m && today.getDate() === d) cell.classList.add("today");
    grid.appendChild(cell);
  }
}

async function loadCalendarSchedules() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  calendarSchedules = Array.isArray(data.schedules) ? data.schedules : [];
  renderCalendarSchedules();
}

async function loadTodoList() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  todoList = Array.isArray(data.todos) ? data.todos : [];
  renderTodoList();
}

async function saveCalendarSchedules() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ schedules: calendarSchedules }, { merge: true });
}

async function saveTodoList() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ todos: todoList }, { merge: true });
}

async function loadExamList() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  examList = Array.isArray(data.exams) ? data.exams : [];
  renderExamList();
}

async function saveExamList() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ exams: examList }, { merge: true });
}

async function loadFlashcards() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  if (Array.isArray(data.flashcardsSets) && data.flashcardsSets.length) {
    flashcardSets = data.flashcardsSets.map(normalizeFlashSet);
    currentFlashSetId = data.currentFlashSetId || flashcardSets[0].id;
  } else {
    const legacyCards = Array.isArray(data.flashcards) ? data.flashcards.map(normalizeFlashCard) : [];
    const legacyTitle = (data.flashcardsMeta && data.flashcardsMeta.title) ? data.flashcardsMeta.title : "My Flashcard Set";
    flashcardSets = [normalizeFlashSet({ id: `set_${Date.now()}`, title: legacyTitle, cards: legacyCards })];
    currentFlashSetId = flashcardSets[0].id;
  }

  syncCurrentFlashSet();
  flashReviewedSession = 0;
  flashMode = "study";
  flashLearnReveal = false;
  flashWriteFeedback = "";
  flashWriteCorrect = false;
  flashMatchMatchedIds = new Set();
  renderFlashSetSelector();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
}

async function saveFlashcards() {
  if (!auth.currentUser) return;
  commitCurrentFlashSet();
  await db.collection("user_data").doc(auth.currentUser.uid).set({
    flashcardsSets: flashcardSets,
    currentFlashSetId,
    flashcards: flashcardList,
    flashcardsMeta: { title: flashDeckTitle }
  }, { merge: true });
}

function getCurrentFlashSet() {
  return flashcardSets.find((s) => s.id === currentFlashSetId) || null;
}

function defaultFlashSetStats() {
  return {
    attempts: 0,
    correct: 0,
    reviewed: 0,
    lastStudyDate: "",
    streakDays: 0
  };
}

function normalizeFlashCard(c) {
  return {
    id: c.id || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subject: c.subject || "General",
    front: c.front || "",
    back: c.back || "",
    starred: !!c.starred,
    srsHard: Math.max(0, parseInt(c.srsHard || 0, 10) || 0),
    srsGood: Math.max(0, parseInt(c.srsGood || 0, 10) || 0),
    createdAt: c.createdAt || Date.now()
  };
}

function normalizeFlashSet(s) {
  const stats = { ...defaultFlashSetStats(), ...(s.stats || {}) };
  return {
    id: s.id || `set_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    title: s.title || "Untitled Set",
    cards: Array.isArray(s.cards) ? s.cards.map(normalizeFlashCard) : [],
    stats
  };
}

function commitCurrentFlashSet() {
  const set = getCurrentFlashSet();
  if (!set) return;
  set.title = flashDeckTitle;
  set.cards = flashcardList;
  set.stats = { ...defaultFlashSetStats(), ...(set.stats || {}) };
}

function syncCurrentFlashSet() {
  let set = getCurrentFlashSet();
  if (!set) {
    if (!flashcardSets.length) {
      flashcardSets = [{ id: `set_${Date.now()}`, title: "My Flashcard Set", cards: [] }];
    }
    currentFlashSetId = flashcardSets[0].id;
    set = flashcardSets[0];
  }
  flashDeckTitle = set.title || "My Flashcard Set";
  set.stats = { ...defaultFlashSetStats(), ...(set.stats || {}) };
  flashcardList = Array.isArray(set.cards) ? set.cards.map(normalizeFlashCard) : [];
  if (!flashcardList.some((c) => c.id === currentFlashcardId)) {
    currentFlashcardId = flashcardList.length ? flashcardList[0].id : null;
  }
  const titleInput = safeEl("flash-deck-title");
  if (titleInput) titleInput.value = flashDeckTitle;
}

function renderFlashSetSelector() {
  const sel = safeEl("flash-set-select");
  if (!sel) return;
  sel.innerHTML = "";
  flashcardSets.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.innerText = `${s.title} (${(s.cards || []).length})`;
    if (s.id === currentFlashSetId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function selectFlashSet(id) {
  commitCurrentFlashSet();
  currentFlashSetId = id;
  syncCurrentFlashSet();
  flashReviewedSession = 0;
  flashLearnReveal = false;
  flashWriteFeedback = "";
  flashWriteCorrect = false;
  flashMatchMatchedIds = new Set();
  renderFlashSetSelector();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
  saveFlashcards();
}

function createFlashSet() {
  const name = prompt("New set name:", "New Set");
  if (!name) return;
  commitCurrentFlashSet();
  const set = { id: `set_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, title: name.trim(), cards: [] };
  flashcardSets.push(normalizeFlashSet(set));
  currentFlashSetId = set.id;
  syncCurrentFlashSet();
  renderFlashSetSelector();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
  saveFlashcards();
}

function deleteFlashSet() {
  if (flashcardSets.length <= 1) return alert("You need at least one set.");
  const set = getCurrentFlashSet();
  if (!set) return;
  if (!confirm(`Delete set \"${set.title}\"?`)) return;
  flashcardSets = flashcardSets.filter((s) => s.id !== currentFlashSetId);
  currentFlashSetId = flashcardSets[0].id;
  syncCurrentFlashSet();
  renderFlashSetSelector();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
  saveFlashcards();
}

function setFlashMode(mode) {
  flashMode = mode;
  flashLearnReveal = false;
  flashWriteFeedback = "";
  flashWriteCorrect = false;
  if (mode === "match") startMatchGame();
  updateFlashModeButtons();
  renderFlashMode();
}

function updateFlashModeButtons() {
  ["study", "learn", "write", "match"].forEach((m) => {
    const b = safeEl(`flash-mode-${m}`);
    if (b) b.classList.toggle("active", flashMode === m);
  });
}

function renderFlashMode() {
  updateFlashModeButtons();
  if (flashMode === "study") renderFlashcardStudy();
  else if (flashMode === "learn") renderLearnMode();
  else if (flashMode === "write") renderWriteMode();
  else renderMatchMode();
  const actions = safeEl("flash-study-actions");
  if (actions) actions.style.display = flashMode === "study" ? "flex" : "none";
}

function updateFlashDeckTitle() {
  const input = safeEl("flash-deck-title");
  flashDeckTitle = (input?.value || "My Flashcard Set").trim() || "My Flashcard Set";
  commitCurrentFlashSet();
  renderFlashSetSelector();
  updateFlashHeader();
  saveFlashcards();
}

function setFlashSearch(v) {
  flashSearchTerm = (v || "").toLowerCase().trim();
  renderFlashcardList();
  renderFlashcardStudy();
}

function toggleFlashFavoritesOnly() {
  flashFavoritesOnly = !flashFavoritesOnly;
  const btn = safeEl("flash-fav-filter-btn");
  if (btn) btn.innerText = flashFavoritesOnly ? "Starred Only" : "Starred";
  renderFlashcardList();
  renderFlashcardStudy();
}

function toggleFlashShuffle() {
  flashShuffleMode = !flashShuffleMode;
  const btn = safeEl("flash-shuffle-btn");
  if (btn) btn.innerText = flashShuffleMode ? "Shuffle: On" : "Shuffle: Off";
}

function updateFlashHeader() {
  const meta = safeEl("flash-deck-meta");
  const statsEl = safeEl("flash-set-stats");
  if (!meta) return;
  const total = flashcardList.length;
  const starred = flashcardList.filter((c) => c.starred).length;
  meta.innerText = `${total} cards • ${starred} starred`;

  const set = getCurrentFlashSet();
  const stats = { ...defaultFlashSetStats(), ...(set?.stats || {}) };
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  if (statsEl) statsEl.innerText = `Accuracy: ${accuracy}% • Streak: ${stats.streakDays}d • Total Reviewed: ${stats.reviewed}`;

  const fill = safeEl("flash-progress-fill");
  const label = safeEl("flash-progress-label");
  if (fill) fill.style.width = `${Math.min(100, Math.round((flashReviewedSession / Math.max(1, total)) * 100))}%`;
  if (label) label.innerText = `${flashReviewedSession} reviewed this session`;
}

function updateSetStudyStats(correct, reviewedInc = 0) {
  const set = getCurrentFlashSet();
  if (!set) return;
  const stats = { ...defaultFlashSetStats(), ...(set.stats || {}) };
  stats.attempts += 1;
  if (correct) stats.correct += 1;
  stats.reviewed += reviewedInc;
  const today = todayKey();
  if (stats.lastStudyDate !== today) {
    if (!stats.lastStudyDate) stats.streakDays = 1;
    else stats.streakDays = (stats.lastStudyDate === yesterdayKey()) ? (stats.streakDays || 0) + 1 : 1;
    stats.lastStudyDate = today;
  }
  set.stats = stats;
}

function weightedNextIndex(pool, currentIndex) {
  const candidates = pool.map((c, idx) => ({ c, idx })).filter((x) => x.idx !== currentIndex);
  if (!candidates.length) return currentIndex;
  const weighted = candidates.map((x) => {
    const hard = Math.max(0, parseInt(x.c.srsHard || 0, 10) || 0);
    const good = Math.max(0, parseInt(x.c.srsGood || 0, 10) || 0);
    const weight = Math.max(1, 1 + hard * 2 - Math.floor(good * 0.5));
    return { ...x, weight };
  });
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.idx;
  }
  return weighted[weighted.length - 1].idx;
}

function getFilteredFlashcards() {
  return flashcardList.filter((c) => {
    if (flashFavoritesOnly && !c.starred) return false;
    if (!flashSearchTerm) return true;
    const blob = `${c.subject} ${c.front} ${c.back}`.toLowerCase();
    return blob.includes(flashSearchTerm);
  });
}

async function addFlashcard() {
  const subject = (safeEl("flash-subject")?.value || "").trim();
  const front = (safeEl("flash-front")?.value || "").trim();
  const back = (safeEl("flash-back")?.value || "").trim();
  if (!subject || !front || !back) {
    return alert("Please enter subject, front, and back.");
  }

  const card = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subject,
    front,
    back,
    starred: false,
    srsHard: 0,
    srsGood: 0,
    createdAt: Date.now()
  };

  flashcardList.push(card);
  currentFlashcardId = card.id;
  flashShowBack = false;

  if (safeEl("flash-subject")) safeEl("flash-subject").value = "";
  if (safeEl("flash-front")) safeEl("flash-front").value = "";
  if (safeEl("flash-back")) safeEl("flash-back").value = "";

  await saveFlashcards();
  updateFlashHeader();
  renderFlashSetSelector();
  renderFlashcardList();
  renderFlashMode();
}

async function removeFlashcard(id) {
  flashcardList = flashcardList.filter((c) => c.id !== id);
  if (currentFlashcardId === id) {
    currentFlashcardId = flashcardList.length ? flashcardList[0].id : null;
    flashShowBack = false;
  }
  await saveFlashcards();
  updateFlashHeader();
  renderFlashSetSelector();
  renderFlashcardList();
  renderFlashMode();
}

async function toggleFlashcardStar(id) {
  const card = flashcardList.find((c) => c.id === id);
  if (!card) return;
  card.starred = !card.starred;
  await saveFlashcards();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
}

function selectFlashcard(id) {
  currentFlashcardId = id;
  flashShowBack = false;
  renderFlashcardList();
  renderFlashMode();
}

function flipFlashcard() {
  if (!currentFlashcardId) return;
  flashShowBack = !flashShowBack;
  renderFlashMode();
}

function nextFlashcard() {
  const pool = getFilteredFlashcards();
  if (!pool.length) return;
  const currentIndex = pool.findIndex((c) => c.id === currentFlashcardId);
  if (pool.length === 1) {
    flashShowBack = false;
    renderFlashMode();
    return;
  }
  let nextIndex = currentIndex;
  if (flashShuffleMode || currentIndex < 0 || flashMode !== "study") {
    nextIndex = weightedNextIndex(pool, currentIndex);
  } else {
    nextIndex = (currentIndex + 1) % pool.length;
  }
  currentFlashcardId = pool[nextIndex].id;
  flashShowBack = false;
  renderFlashcardList();
  renderFlashMode();
}

async function markFlashcardReviewed() {
  if (!currentFlashcardId) return;
  const card = flashcardList.find((c) => c.id === currentFlashcardId);
  if (card) card.srsGood = Math.max(0, (card.srsGood || 0) + 1);
  updateSetStudyStats(true, 1);
  await logFlashcardReviewed(1);
  flashReviewedSession += 1;
  await saveFlashcards();
  updateFlashHeader();
  nextFlashcard();
}

async function markFlashcardHard() {
  if (!currentFlashcardId) return;
  const card = flashcardList.find((c) => c.id === currentFlashcardId);
  if (card) card.srsHard = Math.max(0, (card.srsHard || 0) + 1);
  updateSetStudyStats(false, 0);
  await saveFlashcards();
  updateFlashHeader();
  nextFlashcard();
}

function renderFlashcardList() {
  const list = safeEl("flashcard-list");
  if (!list) return;
  list.innerHTML = "";

  const cards = getFilteredFlashcards();
  if (!cards.length) {
    list.innerHTML = "<div style='color:#888; font-size:12px;'>No flashcards yet.</div>";
    return;
  }

  cards.forEach((card) => {
    const row = document.createElement("div");
    row.className = "flashcard-row" + (card.id === currentFlashcardId ? " active" : "");
    row.innerHTML = `
      <span class="flashcard-row-star ${card.starred ? "starred" : ""}" onclick="toggleFlashcardStar('${card.id}')">★</span>
      <div style="flex:1; min-width:0;">
        <div class="flashcard-row-subject">${card.subject}</div>
        <div class="flashcard-row-front">${card.front}</div>
      </div>
      <button class="kill-btn" style="padding:4px 8px;" onclick="removeFlashcard('${card.id}')">Delete</button>
    `;
    row.onclick = (e) => {
      if (e.target.tagName === "BUTTON" || e.target.classList.contains("flashcard-row-star")) return;
      selectFlashcard(card.id);
    };
    list.appendChild(row);
  });
}

function renderFlashcardStudy() {
  const wrap = safeEl("flashcard-study");
  if (!wrap) return;
  const pool = getFilteredFlashcards();
  if (!pool.length) {
    wrap.innerHTML = "<div class='flashcard-empty'>No flashcards yet. Add one to start studying.</div>";
    return;
  }
  if (!currentFlashcardId) currentFlashcardId = pool[0].id;

  const card = pool.find((c) => c.id === currentFlashcardId) || pool[0];
  if (card && currentFlashcardId !== card.id) currentFlashcardId = card.id;
  if (!card) {
    wrap.innerHTML = "<div class='flashcard-empty'>No flashcards yet. Add one to start studying.</div>";
    return;
  }

  const idx = Math.max(0, pool.findIndex((c) => c.id === card.id));

  wrap.innerHTML = `
    <div class="flashcard-card ${flashShowBack ? "back" : "front"}" onclick="flipFlashcard()">
      <div class="flashcard-label">${flashShowBack ? "DEFINITION" : "TERM"} • ${card.subject} • ${idx + 1}/${pool.length}</div>
      <div class="flashcard-content">${flashShowBack ? card.back : card.front}</div>
    </div>
  `;
}

function renderLearnMode() {
  const wrap = safeEl("flashcard-study");
  if (!wrap) return;
  const pool = getFilteredFlashcards();
  if (!pool.length) {
    wrap.innerHTML = "<div class='flashcard-empty'>No cards available for Learn mode.</div>";
    return;
  }
  if (!currentFlashcardId) currentFlashcardId = pool[0].id;
  const card = pool.find((c) => c.id === currentFlashcardId) || pool[0];
  if (!card) return;
  currentFlashcardId = card.id;
  const label = flashLearnReveal ? "Definition" : "Prompt";
  const content = flashLearnReveal ? card.back : card.front;
  wrap.innerHTML = `
    <div class="flashcard-card ${flashLearnReveal ? "back" : "front"}">
      <div class="flashcard-label">Learn • ${label} • ${card.subject}</div>
      <div class="flashcard-content">${content}</div>
      <div style="display:flex; gap:8px; margin-top:auto;">
        ${flashLearnReveal ? `<button class='btn-save' onclick='learnAgain()'>Again</button><button class='btn-main' onclick='learnGood()'>Good</button>` : `<button class='btn-main' onclick='revealLearnAnswer()'>Show Answer</button>`}
      </div>
    </div>
  `;
}

function revealLearnAnswer() {
  flashLearnReveal = true;
  renderLearnMode();
}

function learnAgain() {
  flashLearnReveal = false;
  const card = flashcardList.find((c) => c.id === currentFlashcardId);
  if (card) card.srsHard = Math.max(0, (card.srsHard || 0) + 1);
  updateSetStudyStats(false, 0);
  saveFlashcards();
  updateFlashHeader();
  nextFlashcard();
}

async function learnGood() {
  flashLearnReveal = false;
  const card = flashcardList.find((c) => c.id === currentFlashcardId);
  if (card) card.srsGood = Math.max(0, (card.srsGood || 0) + 1);
  updateSetStudyStats(true, 1);
  flashReviewedSession += 1;
  updateFlashHeader();
  await logFlashcardReviewed(1);
  await saveFlashcards();
  nextFlashcard();
}

function renderWriteMode() {
  const wrap = safeEl("flashcard-study");
  if (!wrap) return;
  const pool = getFilteredFlashcards();
  if (!pool.length) {
    wrap.innerHTML = "<div class='flashcard-empty'>No cards available for Write mode.</div>";
    return;
  }
  if (!currentFlashcardId) currentFlashcardId = pool[0].id;
  const card = pool.find((c) => c.id === currentFlashcardId) || pool[0];
  if (!card) return;
  currentFlashcardId = card.id;
  const feedbackColor = flashWriteCorrect ? "#137333" : "#b42318";
  wrap.innerHTML = `
    <div class="flashcard-card front">
      <div class="flashcard-label">Write • ${card.subject}</div>
      <div class="flashcard-content" style="font-size:22px;">${card.front}</div>
      <input id="flash-write-input" type="text" placeholder="Type the answer..." style="width:100%; padding:10px; border:1px solid #d0d7e8; border-radius:8px; box-sizing:border-box;">
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="btn-save" onclick="checkWriteAnswer()">Check</button>
        <button class="btn-save" onclick="nextWriteCard()">Skip</button>
      </div>
      ${flashWriteFeedback ? `<div style='margin-top:8px; color:${feedbackColor}; font-size:13px;'>${flashWriteFeedback}</div>` : ""}
    </div>
  `;
}

async function checkWriteAnswer() {
  const pool = getFilteredFlashcards();
  const card = pool.find((c) => c.id === currentFlashcardId) || pool[0];
  if (!card) return;
  const input = (safeEl("flash-write-input")?.value || "").trim().toLowerCase();
  const answer = (card.back || "").trim().toLowerCase();
  if (!input) return;
  const ok = input === answer || answer.includes(input);
  flashWriteCorrect = ok;
  if (ok) {
    flashWriteFeedback = "Correct. Great work.";
    const cardRef = flashcardList.find((c) => c.id === currentFlashcardId);
    if (cardRef) cardRef.srsGood = Math.max(0, (cardRef.srsGood || 0) + 1);
    updateSetStudyStats(true, 1);
    flashReviewedSession += 1;
    updateFlashHeader();
    await logFlashcardReviewed(1);
    await saveFlashcards();
  } else {
    const cardRef = flashcardList.find((c) => c.id === currentFlashcardId);
    if (cardRef) cardRef.srsHard = Math.max(0, (cardRef.srsHard || 0) + 1);
    updateSetStudyStats(false, 0);
    await saveFlashcards();
    flashWriteFeedback = `Not quite. Correct answer: ${card.back}`;
  }
  renderWriteMode();
}

function nextWriteCard() {
  flashWriteFeedback = "";
  flashWriteCorrect = false;
  nextFlashcard();
}

function startMatchGame() {
  const pool = getFilteredFlashcards().slice(0, 6);
  flashMatchPairs = pool.map((c) => ({ id: c.id, term: c.front, def: c.back }));
  flashMatchMatchedIds = new Set();
  flashMatchSelectedTerm = null;
  flashMatchSelectedDef = null;
}

function renderMatchMode() {
  const wrap = safeEl("flashcard-study");
  if (!wrap) return;
  if (!flashMatchPairs.length) startMatchGame();
  if (!flashMatchPairs.length) {
    wrap.innerHTML = "<div class='flashcard-empty'>Need at least 1 card for Match mode.</div>";
    return;
  }
  const terms = flashMatchPairs.filter((p) => !flashMatchMatchedIds.has(p.id));
  const defs = terms.slice().sort(() => Math.random() - 0.5);
  if (!terms.length) {
    wrap.innerHTML = `
      <div class='flashcard-card back'>
        <div class='flashcard-label'>Match</div>
        <div class='flashcard-content'>Nice. You matched them all.</div>
        <button class='btn-main' onclick='startMatchGame(); renderMatchMode();'>Play Again</button>
      </div>
    `;
    return;
  }
  const termHtml = terms.map((t) => `<button class='btn-save' style='text-align:left;${flashMatchSelectedTerm===t.id?"outline:2px solid #5a9bff;":""}' onclick='pickMatchTerm("${t.id}")'>${t.term}</button>`).join("");
  const defHtml = defs.map((d) => `<button class='btn-save' style='text-align:left;${flashMatchSelectedDef===d.id?"outline:2px solid #5a9bff;":""}' onclick='pickMatchDef("${d.id}")'>${d.def}</button>`).join("");
  wrap.innerHTML = `
    <div class='flashcard-card front'>
      <div class='flashcard-label'>Match • ${flashMatchMatchedIds.size}/${flashMatchPairs.length}</div>
      <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;'>
        <div style='display:flex;flex-direction:column;gap:6px;'>${termHtml}</div>
        <div style='display:flex;flex-direction:column;gap:6px;'>${defHtml}</div>
      </div>
    </div>
  `;
}

async function pickMatchTerm(id) {
  flashMatchSelectedTerm = id;
  await resolveMatchAttempt();
  renderMatchMode();
}

async function pickMatchDef(id) {
  flashMatchSelectedDef = id;
  await resolveMatchAttempt();
  renderMatchMode();
}

async function resolveMatchAttempt() {
  if (!flashMatchSelectedTerm || !flashMatchSelectedDef) return;
  if (flashMatchSelectedTerm === flashMatchSelectedDef) {
    const cardRef = flashcardList.find((c) => c.id === flashMatchSelectedTerm);
    if (cardRef) cardRef.srsGood = Math.max(0, (cardRef.srsGood || 0) + 1);
    updateSetStudyStats(true, 1);
    flashMatchMatchedIds.add(flashMatchSelectedTerm);
    flashReviewedSession += 1;
    updateFlashHeader();
    await logFlashcardReviewed(1);
    await saveFlashcards();
  } else {
    const cardRef = flashcardList.find((c) => c.id === flashMatchSelectedTerm);
    if (cardRef) cardRef.srsHard = Math.max(0, (cardRef.srsHard || 0) + 1);
    updateSetStudyStats(false, 0);
    await saveFlashcards();
  }
  flashMatchSelectedTerm = null;
  flashMatchSelectedDef = null;
}

function triggerFlashImport(format) {
  flashImportFormat = format === "csv" ? "csv" : "json";
  const input = safeEl("flash-import-file");
  if (!input) return;
  input.value = "";
  input.accept = flashImportFormat === "csv" ? ".csv,text/csv" : ".json,application/json";
  input.click();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseFlashCsv(text) {
  const lines = (text || "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const iSubject = idx("subject");
  const iFront = idx("front");
  const iBack = idx("back");
  const iStarred = idx("starred");
  const iHard = idx("srshard");
  const iGood = idx("srsgood");
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return normalizeFlashCard({
      subject: iSubject >= 0 ? cols[iSubject] : "General",
      front: iFront >= 0 ? cols[iFront] : "",
      back: iBack >= 0 ? cols[iBack] : "",
      starred: iStarred >= 0 ? /true|1|yes/i.test(cols[iStarred] || "") : false,
      srsHard: iHard >= 0 ? parseInt(cols[iHard] || "0", 10) || 0 : 0,
      srsGood: iGood >= 0 ? parseInt(cols[iGood] || "0", 10) || 0 : 0
    });
  }).filter((c) => c.front && c.back);
}

async function handleFlashImportFile(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  const text = await file.text();
  let imported = [];
  let importedTitle = "";
  if (flashImportFormat === "csv" || /\.csv$/i.test(file.name)) {
    imported = parseFlashCsv(text);
  } else {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      imported = parsed.map(normalizeFlashCard);
    } else if (parsed && Array.isArray(parsed.cards)) {
      importedTitle = parsed.title || "";
      imported = parsed.cards.map(normalizeFlashCard);
    }
  }
  if (!imported.length) return alert("No valid cards found in file.");

  const replace = confirm("Replace current set cards? Click Cancel to append.");
  if (replace) {
    flashcardList = imported;
    if (importedTitle) flashDeckTitle = importedTitle;
    const set = getCurrentFlashSet();
    if (set) set.stats = defaultFlashSetStats();
  } else {
    flashcardList = flashcardList.concat(imported);
  }
  currentFlashcardId = flashcardList.length ? flashcardList[0].id : null;
  flashReviewedSession = 0;
  await saveFlashcards();
  syncCurrentFlashSet();
  renderFlashSetSelector();
  updateFlashHeader();
  renderFlashcardList();
  renderFlashMode();
}

function exportCurrentFlashSetJSON() {
  const set = getCurrentFlashSet();
  if (!set) return;
  const payload = {
    title: set.title,
    stats: set.stats || defaultFlashSetStats(),
    cards: (set.cards || []).map(normalizeFlashCard),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(set.title || "flashcards").replace(/\s+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurrentFlashSetCSV() {
  const set = getCurrentFlashSet();
  if (!set) return;
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["subject", "front", "back", "starred", "srsHard", "srsGood"],
    ...(set.cards || []).map((c) => [c.subject, c.front, c.back, !!c.starred, c.srsHard || 0, c.srsGood || 0])
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(set.title || "flashcards").replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getExamDateTime(exam) {
  const t = exam.time && exam.time.trim() ? exam.time : "23:59";
  return new Date(`${exam.date}T${t}:00`);
}

function formatCountdown(ms) {
  if (ms <= 0) return "Started";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  return `${h}h ${m}m ${s}s`;
}

function getNextUpcomingExam() {
  const now = Date.now();
  const upcoming = examList
    .filter((e) => !e.completed && e.date)
    .map((e) => ({ ...e, ts: getExamDateTime(e).getTime() }))
    .filter((e) => Number.isFinite(e.ts) && e.ts >= now)
    .sort((a, b) => a.ts - b.ts);
  return upcoming.length ? upcoming[0] : null;
}

function updateNextExamCountdown() {
  const el = safeEl("exam-next-countdown");
  if (!el) return;
  const next = getNextUpcomingExam();
  if (!next) {
    el.innerText = "No upcoming exams";
    return;
  }
  const diff = next.ts - Date.now();
  el.innerText = `${next.title}: ${formatCountdown(diff)}`;
}

function startExamCountdownTicker() {
  updateNextExamCountdown();
  if (examCountdownInterval) clearInterval(examCountdownInterval);
  examCountdownInterval = setInterval(() => {
    updateNextExamCountdown();
    const win = safeEl("window-exams");
    if (win && win.style.display === "flex") renderExamList();
  }, 1000);
}

async function addExamItem() {
  const title = (safeEl("exam-title")?.value || "").trim();
  const type = safeEl("exam-type")?.value || "Exam";
  const subject = (safeEl("exam-subject")?.value || "").trim();
  const date = safeEl("exam-date")?.value || "";
  const time = safeEl("exam-time")?.value || "";
  const location = (safeEl("exam-location")?.value || "").trim();

  if (!title || !subject || !date) {
    return alert("Please enter exam title, subject, and date.");
  }

  examList.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    type,
    subject,
    date,
    time,
    location,
    completed: false,
    createdAt: Date.now()
  });

  if (safeEl("exam-title")) safeEl("exam-title").value = "";
  if (safeEl("exam-subject")) safeEl("exam-subject").value = "";
  if (safeEl("exam-date")) safeEl("exam-date").value = "";
  if (safeEl("exam-time")) safeEl("exam-time").value = "";
  if (safeEl("exam-location")) safeEl("exam-location").value = "";

  await saveExamList();
  renderExamList();
  startExamCountdownTicker();
}

async function removeExamItem(id) {
  examList = examList.filter((e) => e.id !== id);
  await saveExamList();
  renderExamList();
  updateNextExamCountdown();
}

async function toggleExamCompleted(id) {
  const exam = examList.find((e) => e.id === id);
  if (!exam) return;
  const wasCompleted = !!exam.completed;
  exam.completed = !exam.completed;
  await saveExamList();
  renderExamList();
  updateNextExamCountdown();
  if (!wasCompleted && exam.completed) {
    await logExamComplete(1);
  }
}

function renderExamList() {
  const list = safeEl("exam-list");
  if (!list) return;
  list.innerHTML = "";

  if (!examList.length) {
    list.innerHTML = "<div style='color:#888; padding:10px;'>No exams/tests added yet.</div>";
    updateNextExamCountdown();
    return;
  }

  const sorted = examList.slice().sort((a, b) => getExamDateTime(a) - getExamDateTime(b));
  const now = Date.now();

  sorted.forEach((exam) => {
    const row = document.createElement("div");
    row.className = "exam-item";
    if (exam.completed) row.classList.add("completed");

    const target = getExamDateTime(exam).getTime();
    const countdown = Number.isFinite(target) ? formatCountdown(target - now) : "Invalid date";

    row.innerHTML = `
      <div class="exam-item-main">
        <div>
          <div class="exam-title-row">
            <span class="exam-type-pill">${exam.type}</span>
            <strong>${exam.title}</strong>
          </div>
          <div class="exam-meta">${exam.subject} • ${exam.date}${exam.time ? ` ${exam.time}` : ""}${exam.location ? ` • ${exam.location}` : ""}</div>
        </div>
        <div class="exam-countdown">${exam.completed ? "Completed" : countdown}</div>
      </div>
      <div class="exam-actions">
        <button class="btn-save" onclick="toggleExamCompleted('${exam.id}')">${exam.completed ? "Mark Active" : "Mark Done"}</button>
        <button class="kill-btn" onclick="removeExamItem('${exam.id}')">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateNextExamCountdown();
}

async function addCalendarSchedule() {
  const title = (safeEl("event-title")?.value || "").trim();
  const type = safeEl("event-type")?.value || "Event";
  const date = safeEl("event-date")?.value || "";
  const recurring = safeEl("event-recurring")?.value || "none";
  const startTime = safeEl("event-start-time")?.value || "";
  const endTime = safeEl("event-end-time")?.value || "";
  const location = (safeEl("event-location")?.value || "").trim();
  const description = (safeEl("event-description")?.value || "").trim();

  if (!title || !date || !startTime) return alert("Please enter title, date, and start time.");

  calendarSchedules.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title, type, date, recurring, startTime, endTime, location, description
  });

  if (safeEl("event-title")) safeEl("event-title").value = "";
  if (safeEl("event-date")) safeEl("event-date").value = "";
  if (safeEl("event-start-time")) safeEl("event-start-time").value = "";
  if (safeEl("event-end-time")) safeEl("event-end-time").value = "";
  if (safeEl("event-location")) safeEl("event-location").value = "";
  if (safeEl("event-description")) safeEl("event-description").value = "";

  await saveCalendarSchedules();
  renderCalendarSchedules();
}

async function removeCalendarSchedule(id) {
  calendarSchedules = calendarSchedules.filter((s) => s.id !== id);
  await saveCalendarSchedules();
  renderCalendarSchedules();
}

function renderCalendarSchedules() {
  const list = safeEl("calendar-schedule-list");
  if (!list) return;
  list.innerHTML = "";
  if (!calendarSchedules.length) {
    list.innerHTML = "<div style='color:#888;'>No schedules yet</div>";
    return;
  }
  calendarSchedules.slice().sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).forEach((s) => {
    const row = document.createElement("div");
    row.className = "schedule-item";
    const timeRange = s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime;
    const recurringBadge = s.recurring !== "none" ? ` • ${s.recurring}` : "";
    row.innerHTML = `<div><span class='schedule-type ${s.type.toLowerCase()}'>${s.type}</span> <strong>${s.title}</strong><div style='font-size:11px;color:#666;'>${s.date} • ${timeRange}${recurringBadge}${s.location ? " • 📍 " + s.location : ""}</div>${s.description ? `<div style='font-size:11px;color:#888;margin-top:2px;'>${s.description}</div>` : ""}</div>`;
    const del = document.createElement("button");
    del.className = "kill-btn";
    del.innerText = "Remove";
    del.onclick = () => removeCalendarSchedule(s.id);
    row.appendChild(del);
    list.appendChild(row);
  });
}

async function addTodo() {
  const title = (safeEl("todo-title")?.value || "").trim();
  const description = (safeEl("todo-description")?.value || "").trim();
  const subject = (safeEl("todo-subject")?.value || "").trim();
  const dueDate = safeEl("todo-due-date")?.value || "";
  const priority = safeEl("todo-priority")?.value || "Medium";

  if (!title) return alert("Please enter a task title.");

  todoList.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title, description, subject, dueDate, priority, completed: false
  });

  if (safeEl("todo-title")) safeEl("todo-title").value = "";
  if (safeEl("todo-description")) safeEl("todo-description").value = "";
  if (safeEl("todo-subject")) safeEl("todo-subject").value = "";
  if (safeEl("todo-due-date")) safeEl("todo-due-date").value = "";
  if (safeEl("todo-priority")) safeEl("todo-priority").value = "Medium";

  await saveTodoList();
  renderTodoList();
}

async function removeTodo(id) {
  todoList = todoList.filter((t) => t.id !== id);
  await saveTodoList();
  renderTodoList();
}

async function toggleTodoComplete(id) {
  const todo = todoList.find((t) => t.id === id);
  if (todo) {
    const wasCompleted = !!todo.completed;
    todo.completed = !todo.completed;
    await saveTodoList();
    renderTodoList();
    if (!wasCompleted && todo.completed) {
      await logTaskComplete(1);
    }
  }
}

function renderTodoList() {
  const list = safeEl("todo-list");
  if (!list) return;
  list.innerHTML = "";
  if (!todoList.length) {
    list.innerHTML = "<div style='color:#888;'>No tasks yet</div>";
    return;
  }
  todoList.slice().sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return (a.dueDate ? -1 : 1);
  }).forEach((t) => {
    const row = document.createElement("div");
    row.className = "todo-item";
    row.style.opacity = t.completed ? "0.6" : "1";
    const priorityColor = t.priority === "High" ? "#ff6b6b" : t.priority === "Medium" ? "#ffa94d" : "#69db7c";
    const dueInfo = t.dueDate ? ` • Due: ${t.dueDate}` : "";
    row.innerHTML = `<input type='checkbox' ${t.completed ? "checked" : ""} onchange="toggleTodoComplete('${t.id}')" style='margin-right:8px;'><div style='flex:1;'><span style='text-decoration:${t.completed ? "line-through" : "none"};'><strong>${t.title}</strong></span><div style='font-size:11px;color:#666;'>${t.subject ? "📚 " + t.subject : ""}${dueInfo}</div>${t.description ? `<div style='font-size:11px;color:#888;margin-top:2px;'>${t.description}</div>` : ""}</div><span style='background:${priorityColor};color:white;padding:2px 6px;border-radius:3px;font-size:10px;margin:0 4px;'>${t.priority}</span>`;
    const del = document.createElement("button");
    del.className = "kill-btn";
    del.style.marginLeft = "4px";
    del.innerText = "Delete";
    del.onclick = () => removeTodo(t.id);
    row.appendChild(del);
    list.appendChild(row);
  });
}

async function fetchWeather() {
  const city = safeEl("weather-city-input")?.value || "";
  if (!city) return;
  const pirateKey = "vjLZgtPHkOp3lVEMUhVsieWIQFOHS3FC";
  const iconMap = {
    "clear-day": "01d", "clear-night": "01n", rain: "10d", snow: "13d", sleet: "13d", wind: "50d", fog: "50d", cloudy: "04d", "partly-cloudy-day": "02d", "partly-cloudy-night": "02n"
  };

  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.length) return alert("City not found.");
    const { lat, lon, display_name } = geoData[0];

    const weatherRes = await fetch(`https://api.pirateweather.net/forecast/${pirateKey}/${lat},${lon}?units=si`);
    const data = await weatherRes.json();
    const current = data.currently || {};

    if (safeEl("weather-temp")) safeEl("weather-temp").innerText = `${Math.round(current.temperature || 0)}°C`;
    if (safeEl("weather-location")) safeEl("weather-location").innerText = (display_name || "").split(",")[0] || city;
    if (safeEl("weather-desc")) safeEl("weather-desc").innerText = current.summary || "";
    if (safeEl("weather-humidity")) safeEl("weather-humidity").innerText = `${Math.round((current.humidity || 0) * 100)}%`;
    if (safeEl("weather-wind")) safeEl("weather-wind").innerText = `${Math.round(current.windSpeed || 0)} km/h`;
    if (safeEl("weather-icon")) safeEl("weather-icon").src = `https://openweathermap.org/img/wn/${iconMap[current.icon] || "01d"}@2x.png`;

    const fc = safeEl("forecast-container");
    if (fc) {
      fc.innerHTML = "";
      ((data.daily && data.daily.data) || []).slice(1, 6).forEach((day) => {
        const dayName = new Date(day.time * 1000).toLocaleDateString("en-US", { weekday: "short" });
        fc.innerHTML += `<div class='forecast-item'><span class='forecast-day'>${dayName}</span><img class='forecast-img' src='https://openweathermap.org/img/wn/${iconMap[day.icon] || "01d"}.png'><span class='forecast-temp'>${Math.round(day.temperatureHigh || 0)}°</span></div>`;
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadAdminPanel() {
  if (!isAdminOwner) return;
  renderAdminEmails();
  const body = safeEl("admin-users-body");
  if (!body) return;
  body.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  const usersSnap = await db.collection("users").limit(200).get();
  if (usersSnap.empty) {
    body.innerHTML = "<tr><td colspan='4'>No users found</td></tr>";
    return;
  }

  body.innerHTML = "";
  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() || {};
    const pSnap = await db.collection("user_progress").doc(userDoc.id).get();
    const p = pSnap.exists ? pSnap.data() : { level: 1, xp: 0 };
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${u.displayName || u.email || userDoc.id}</td><td>${p.level || 1}</td><td>${p.xp || 0}</td>`;
    const td = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "btn-save";
    btn.innerText = "Edit";
    btn.onclick = () => adminSelectUser(userDoc.id, u.displayName || u.email || userDoc.id);
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function adminSelectUser(uid, label) {
  if (!isAdminOwner) return;
  adminSelectedUid = uid;
  if (safeEl("admin-selected-user")) safeEl("admin-selected-user").innerText = `Selected: ${label}`;

  const snap = await db.collection("user_progress").doc(uid).get();
  const p = snap.exists ? snap.data() : {};
  const setVal = (id, v) => { const el = safeEl(id); if (el) el.value = v ?? ""; };
  setVal("admin-xp", p.xp || 0);
  setVal("admin-level", p.level || 1);
  setVal("admin-points", p.points || 0);
  setVal("admin-tasks", p.tasksCompleted || 0);
  setVal("admin-exams", p.examsCompleted || 0);
  setVal("admin-focus", p.focusSeconds || 0);
  setVal("admin-badges", (p.badges || []).join(", "));
}

async function adminApplyUpdates() {
  if (!isAdminOwner) return;
  if (!adminSelectedUid) return alert("Select a user first.");

  const num = (id, fallback) => {
    const v = parseInt((safeEl(id)?.value || "").trim(), 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const badgesText = (safeEl("admin-badges")?.value || "").trim();
  const badges = badgesText ? badgesText.split(",").map((s) => s.trim()).filter(Boolean) : [];

  await db.collection("user_progress").doc(adminSelectedUid).set({
    xp: Math.max(0, num("admin-xp", 0)),
    level: Math.max(1, num("admin-level", 1)),
    points: Math.max(0, num("admin-points", 0)),
    tasksCompleted: Math.max(0, num("admin-tasks", 0)),
    examsCompleted: Math.max(0, num("admin-exams", 0)),
    focusSeconds: Math.max(0, num("admin-focus", 0)),
    badges,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  alert("User progress updated.");
  loadAdminPanel();
  if (auth.currentUser && adminSelectedUid === auth.currentUser.uid) {
    refreshProgressView();
    loadLeaderboard();
  }
}

async function adminResetSelectedUserProgress() {
  if (!isAdminOwner) return alert("Admin access required.");
  if (!adminSelectedUid) return alert("Select a user first.");
  
  if (!confirm("Are you sure you want to reset this user's progress? This cannot be undone.")) return;

  const defaultProgress = {
    uid: adminSelectedUid,
    displayName: (await db.collection("users").doc(adminSelectedUid).get()).data()?.displayName || "User",
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
  };

  await db.collection("user_progress").doc(adminSelectedUid).set(defaultProgress);
  alert("User progress reset successfully.");
  loadAdminPanel();
  if (auth.currentUser && adminSelectedUid === auth.currentUser.uid) {
    refreshProgressView();
    loadLeaderboard();
  }
}

async function adminResetAllUsersProgress() {
  if (!isAdminOwner) return alert("Admin access required.");
  
  if (!confirm("Are you ABSOLUTELY SURE you want to reset ALL users' progress? This cannot be undone and will affect everyone.")) return;
  if (!confirm("This is your last chance. Click OK to confirm resetting ALL users' progress.")) return;

  try {
    const batch = db.batch();
    const usersSnap = await db.collection("user_progress").get();
    
    usersSnap.forEach((doc) => {
      const userData = doc.data();
      const resetData = {
        uid: userData.uid,
        displayName: userData.displayName || "User",
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
      };
      batch.set(doc.ref, resetData);
    });

    await batch.commit();
    alert("All users' progress has been reset successfully.");
    loadAdminPanel();
    if (auth.currentUser) {
      refreshProgressView();
      loadLeaderboard();
    }
  } catch (err) {
    console.error("Error resetting all progress:", err);
    alert("Failed to reset all users' progress.");
  }
}

// ========== ENHANCED CALENDAR FUNCTIONS ==========

function setCalendarView(view) {
  calendarView = view;
  ['month', 'week', 'day'].forEach(v => {
    const btn = safeEl(`${v}-view-btn`);
    const viewEl = safeEl(`${v}-view`);
    if (btn) btn.classList.toggle('active', v === view);
    if (viewEl) viewEl.style.display = v === view ? 'block' : 'none';
  });
  renderCalendar();
}

function goToToday() {
  calendarCursor = new Date();
  renderCalendar();
}

function toggleEventForm() {
  const modal = safeEl('event-form-modal');
  if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
  currentEditingEventId = null;
  clearEventForm();
}

function closeEventForm() {
  const modal = safeEl('event-form-modal');
  if (modal) modal.style.display = 'none';
  currentEditingEventId = null;
  clearEventForm();
}

function clearEventForm() {
  if (safeEl('event-title')) safeEl('event-title').value = '';
  if (safeEl('event-type')) safeEl('event-type').value = 'Event';
  if (safeEl('event-color')) safeEl('event-color').value = '#4facfe';
  if (safeEl('event-date')) safeEl('event-date').value = '';
  if (safeEl('event-start-hour')) safeEl('event-start-hour').value = '09';
  if (safeEl('event-start-minute')) safeEl('event-start-minute').value = '00';
  if (safeEl('event-start-ampm')) safeEl('event-start-ampm').value = 'AM';
  if (safeEl('event-end-hour')) safeEl('event-end-hour').value = '10';
  if (safeEl('event-end-minute')) safeEl('event-end-minute').value = '00';
  if (safeEl('event-end-ampm')) safeEl('event-end-ampm').value = 'AM';
  if (safeEl('event-recurring')) safeEl('event-recurring').value = 'none';
  if (safeEl('event-location')) safeEl('event-location').value = '';
  if (safeEl('event-description')) safeEl('event-description').value = '';
}

// Helper function to convert 12-hour time to 24-hour format
function to24Hour(hour, minute, ampm) {
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

// Helper function to convert 24-hour time to 12-hour format
function to12Hour(time24) {
  if (!time24) return { hour: '09', minute: '00', ampm: 'AM' };
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return { hour: String(hour).padStart(2, '0'), minute: m || '00', ampm };
}

async function saveEvent() {
  const title = (safeEl('event-title')?.value || '').trim();
  const type = safeEl('event-type')?.value || 'Event';
  const color = safeEl('event-color')?.value || '#4facfe';
  const date = safeEl('event-date')?.value || '';
  
  const startHour = safeEl('event-start-hour')?.value || '09';
  const startMinute = safeEl('event-start-minute')?.value || '00';
  const startAmpm = safeEl('event-start-ampm')?.value || 'AM';
  const startTime = to24Hour(startHour, startMinute, startAmpm);
  
  const endHour = safeEl('event-end-hour')?.value || '10';
  const endMinute = safeEl('event-end-minute')?.value || '00';
  const endAmpm = safeEl('event-end-ampm')?.value || 'AM';
  const endTime = to24Hour(endHour, endMinute, endAmpm);
  
  const recurring = safeEl('event-recurring')?.value || 'none';
  const location = (safeEl('event-location')?.value || '').trim();
  const description = (safeEl('event-description')?.value || '').trim();

  if (!title || !date || !startTime) return alert('Please enter title, date, and start time.');

  if (currentEditingEventId) {
    const event = calendarSchedules.find(e => e.id === currentEditingEventId);
    if (event) {
      event.title = title;
      event.type = type;
      event.color = color;
      event.date = date;
      event.startTime = startTime;
      event.endTime = endTime;
      event.recurring = recurring;
      event.location = location;
      event.description = description;
    }
  } else {
    calendarSchedules.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title, type, color, date, startTime, endTime, recurring, location, description, createdAt: Date.now()
    });
  }

  await saveCalendarSchedules();
  renderCalendar();
  renderCalendarSchedules();
  closeEventForm();
}

function editEvent(id) {
  const event = calendarSchedules.find(e => e.id === id);
  if (!event) return;
  
  currentEditingEventId = id;
  if (safeEl('event-title')) safeEl('event-title').value = event.title || '';
  if (safeEl('event-type')) safeEl('event-type').value = event.type || 'Event';
  if (safeEl('event-color')) safeEl('event-color').value = event.color || '#4facfe';
  if (safeEl('event-date')) safeEl('event-date').value = event.date || '';
  
  // Convert start time to 12-hour format
  const startTime12 = to12Hour(event.startTime);
  if (safeEl('event-start-hour')) safeEl('event-start-hour').value = startTime12.hour;
  if (safeEl('event-start-minute')) safeEl('event-start-minute').value = startTime12.minute;
  if (safeEl('event-start-ampm')) safeEl('event-start-ampm').value = startTime12.ampm;
  
  // Convert end time to 12-hour format
  const endTime12 = to12Hour(event.endTime);
  if (safeEl('event-end-hour')) safeEl('event-end-hour').value = endTime12.hour;
  if (safeEl('event-end-minute')) safeEl('event-end-minute').value = endTime12.minute;
  if (safeEl('event-end-ampm')) safeEl('event-end-ampm').value = endTime12.ampm;
  
  if (safeEl('event-recurring')) safeEl('event-recurring').value = event.recurring || 'none';
  if (safeEl('event-location')) safeEl('event-location').value = event.location || '';
  if (safeEl('event-description')) safeEl('event-description').value = event.description || '';
  
  const modal = safeEl('event-form-modal');
  if (modal) modal.style.display = 'flex';
  const title = safeEl('event-form-title');
  if (title) title.innerText = 'Edit Event';
}

function renderCalendar() {
  const grid = safeEl('calendar-grid');
  const title = safeEl('calendar-title');
  
  if (!title || !grid) return;
  
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  
  title.innerText = new Date(y, m, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
  grid.innerHTML = '';
  grid.className = 'calendar-grid-enhanced';
  
  for (let i = 0; i < first; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-cell-enhanced muted';
    grid.appendChild(blank);
  }
  
  for (let d = 1; d <= days; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell-enhanced';
    
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const eventsOnDate = calendarSchedules.filter(e => e.date === dateStr);
    
    const dateDiv = document.createElement('div');
    dateDiv.className = 'calendar-cell-date';
    dateDiv.innerText = d;
    cell.appendChild(dateDiv);
    
    if (today.getFullYear() === y && today.getMonth() === m && today.getDate() === d) {
      cell.classList.add('today');
    }
    
    if (eventsOnDate.length > 0) {
      const eventsDiv = document.createElement('div');
      eventsDiv.className = 'calendar-cell-events';
      eventsOnDate.slice(0, 3).forEach(event => {
        const eventDot = document.createElement('div');
        eventDot.className = 'calendar-event-dot';
        eventDot.style.background = event.color || '#007aff';
        eventDot.innerText = event.title;
        eventDot.title = `${event.startTime} - ${event.title}`;
        eventDot.onclick = (e) => {
          e.stopPropagation();
          editEvent(event.id);
        };
        eventsDiv.appendChild(eventDot);
      });
      if (eventsOnDate.length > 3) {
        const more = document.createElement('div');
        more.style.fontSize = '10px';
        more.style.color = '#888';
        more.innerText = `+${eventsOnDate.length - 3} more`;
        eventsDiv.appendChild(more);
      }
      cell.appendChild(eventsDiv);
    }
    
    cell.onclick = () => {
      if (safeEl('event-date')) safeEl('event-date').value = dateStr;
      toggleEventForm();
    };
    
    grid.appendChild(cell);
  }
}

function renderCalendarSchedules() {
  const list = safeEl('calendar-schedule-list');
  if (!list) return;
  list.innerHTML = '';
  
  let filtered = calendarSchedules.slice();
  
  if (eventFilterType !== 'all') {
    filtered = filtered.filter(e => e.type === eventFilterType);
  }
  
  const searchTerm = (safeEl('event-search')?.value || '').toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(e => 
      (e.title || '').toLowerCase().includes(searchTerm) ||
      (e.description || '').toLowerCase().includes(searchTerm) ||
      (e.location || '').toLowerCase().includes(searchTerm)
    );
  }
  
  if (!filtered.length) {
    list.innerHTML = "<div style='color:#888;padding:20px;text-align:center;'>No events found</div>";
    return;
  }
  
  filtered.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).forEach(s => {
    const row = document.createElement('div');
    row.className = 'schedule-item-enhanced';
    row.style.borderLeftColor = s.color || '#007aff';
    
    const header = document.createElement('div');
    header.className = 'schedule-item-header';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'schedule-item-title';
    titleDiv.innerText = s.title;
    header.appendChild(titleDiv);
    
    const actions = document.createElement('div');
    actions.className = 'schedule-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-save';
    editBtn.innerText = '✏️';
    editBtn.style.padding = '4px 8px';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      editEvent(s.id);
    };
    actions.appendChild(editBtn);
    
    const delBtn = document.createElement('button');
    delBtn.className = 'kill-btn';
    delBtn.innerText = '🗑️';
    delBtn.style.padding = '4px 8px';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      removeCalendarSchedule(s.id);
    };
    actions.appendChild(delBtn);
    
    header.appendChild(actions);
    row.appendChild(header);
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'schedule-type';
    typeSpan.innerText = s.type;
    typeSpan.style.background = s.color || '#007aff';
    typeSpan.style.color = 'white';
    row.appendChild(typeSpan);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'schedule-item-time';
    const timeRange = s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime;
    const recurringBadge = s.recurring !== 'none' ? ` • ${s.recurring}` : '';
    timeDiv.innerText = `📅 ${s.date} • ⏰ ${timeRange}${recurringBadge}`;
    row.appendChild(timeDiv);
    
    if (s.location) {
      const locDiv = document.createElement('div');
      locDiv.className = 'schedule-item-meta';
      locDiv.innerText = `📍 ${s.location}`;
      row.appendChild(locDiv);
    }
    
    if (s.description) {
      const descDiv = document.createElement('div');
      descDiv.className = 'schedule-item-meta';
      descDiv.innerText = s.description;
      row.appendChild(descDiv);
    }
    
    list.appendChild(row);
  });
}

function filterEvents() {
  renderCalendarSchedules();
}

function filterEventsByType(type) {
  eventFilterType = type;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
  });
  renderCalendarSchedules();
}

// ========== ENHANCED TODO FUNCTIONS ==========

function toggleTodoForm() {
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
  currentEditingTodoId = null;
  clearTodoForm();
}

function closeTodoForm() {
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = 'none';
  currentEditingTodoId = null;
  clearTodoForm();
}

function clearTodoForm() {
  if (safeEl('todo-title')) safeEl('todo-title').value = '';
  if (safeEl('todo-description')) safeEl('todo-description').value = '';
  if (safeEl('todo-subject')) safeEl('todo-subject').value = '';
  if (safeEl('todo-due-date')) safeEl('todo-due-date').value = '';
  if (safeEl('todo-priority')) safeEl('todo-priority').value = 'Medium';
  if (safeEl('todo-tags')) safeEl('todo-tags').value = '';
  if (safeEl('todo-subtasks')) safeEl('todo-subtasks').value = '';
}

async function saveTodo() {
  const title = (safeEl('todo-title')?.value || '').trim();
  const description = (safeEl('todo-description')?.value || '').trim();
  const subject = (safeEl('todo-subject')?.value || '').trim();
  const dueDate = safeEl('todo-due-date')?.value || '';
  const priority = safeEl('todo-priority')?.value || 'Medium';
  const tagsInput = (safeEl('todo-tags')?.value || '').trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  const subtasksInput = (safeEl('todo-subtasks')?.value || '').trim();
  const subtasks = subtasksInput ? subtasksInput.split('\n').map(s => {
    const text = s.trim().replace(/^-\s*/, '');
    return text ? { text, completed: false, id: `${Date.now()}_${Math.random().toString(36).slice(2, 4)}` } : null;
  }).filter(Boolean) : [];

  if (!title) return alert('Please enter a task title.');

  if (currentEditingTodoId) {
    const todo = todoList.find(t => t.id === currentEditingTodoId);
    if (todo) {
      todo.title = title;
      todo.description = description;
      todo.subject = subject;
      todo.dueDate = dueDate;
      todo.priority = priority;
      todo.tags = tags;
      todo.subtasks = subtasks;
    }
  } else {
    todoList.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title, description, subject, dueDate, priority, tags, subtasks,
      completed: false,
      createdAt: Date.now()
    });
  }

  await saveTodoList();
  renderTodoList();
  closeTodoForm();
}

function editTodo(id) {
  const todo = todoList.find(t => t.id === id);
  if (!todo) return;
  
  currentEditingTodoId = id;
  if (safeEl('todo-title')) safeEl('todo-title').value = todo.title || '';
  if (safeEl('todo-description')) safeEl('todo-description').value = todo.description || '';
  if (safeEl('todo-subject')) safeEl('todo-subject').value = todo.subject || '';
  if (safeEl('todo-due-date')) safeEl('todo-due-date').value = todo.dueDate || '';
  if (safeEl('todo-priority')) safeEl('todo-priority').value = todo.priority || 'Medium';
  if (safeEl('todo-tags')) safeEl('todo-tags').value = (todo.tags || []).join(', ');
  if (safeEl('todo-subtasks')) safeEl('todo-subtasks').value = (todo.subtasks || []).map(s => `- ${s.text}`).join('\n');
  
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = 'flex';
  const title = safeEl('todo-form-title');
  if (title) title.innerText = 'Edit Task';
}

async function toggleSubtask(todoId, subtaskId) {
  const todo = todoList.find(t => t.id === todoId);
  if (!todo || !todo.subtasks) return;
  
  const subtask = todo.subtasks.find(s => s.id === subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    await saveTodoList();
    renderTodoList();
  }
}

function renderTodoList() {
  const list = safeEl('todo-list');
  if (!list) return;
  list.innerHTML = '';
  
  let filtered = todoList.slice();
  
  const statusFilter = safeEl('todo-filter-status')?.value || 'all';
  const today = new Date().toISOString().split('T')[0];
  
  if (statusFilter === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  } else if (statusFilter === 'overdue') {
    filtered = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  }
  
  if (todoFilterPriority !== 'all') {
    filtered = filtered.filter(t => t.priority === todoFilterPriority);
  }
  
  const searchTerm = (safeEl('todo-search')?.value || '').toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(t => 
      (t.title || '').toLowerCase().includes(searchTerm) ||
      (t.description || '').toLowerCase().includes(searchTerm) ||
      (t.subject || '').toLowerCase().includes(searchTerm) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  const sortBy = safeEl('todo-sort')?.value || 'dueDate';
  filtered.sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    } else if (sortBy === 'priority') {
      const pOrder = { High: 0, Medium: 1, Low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    } else if (sortBy === 'created') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });
  
  updateTodoStats();
  
  if (!filtered.length) {
    list.innerHTML = "<div style='color:#888;padding:40px;text-align:center;'>No tasks found. Create one to get started!</div>";
    return;
  }
  
  filtered.forEach(todo => {
    const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < today;
    
    const row = document.createElement('div');
    row.className = 'todo-item-enhanced';
    if (todo.completed) row.classList.add('completed');
    if (isOverdue) row.classList.add('overdue');
    
    const header = document.createElement('div');
    header.className = 'todo-item-header';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-item-checkbox';
    checkbox.checked = todo.completed;
    checkbox.onchange = () => toggleTodoComplete(todo.id);
    header.appendChild(checkbox);
    
    const content = document.createElement('div');
    content.className = 'todo-item-content';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'todo-item-title';
    if (todo.completed) titleDiv.classList.add('completed');
    titleDiv.innerText = todo.title;
    content.appendChild(titleDiv);
    
    if (todo.description) {
      const descDiv = document.createElement('div');
      descDiv.className = 'todo-item-description';
      descDiv.innerText = todo.description;
      content.appendChild(descDiv);
    }
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'todo-item-meta';
    if (todo.subject) metaDiv.innerHTML += `<span>📚 ${todo.subject}</span>`;
    if (todo.dueDate) {
      const dueText = isOverdue ? `⚠️ Overdue: ${todo.dueDate}` : `📅 Due: ${todo.dueDate}`;
      metaDiv.innerHTML += `<span style='color:${isOverdue ? "#ff6b6b" : "inherit"}'>${dueText}</span>`;
    }
    if (metaDiv.innerHTML) content.appendChild(metaDiv);
    
    if (todo.tags && todo.tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'todo-item-tags';
      todo.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'todo-tag';
        tagSpan.innerText = tag;
        tagsDiv.appendChild(tagSpan);
      });
      content.appendChild(tagsDiv);
    }
    
    if (todo.subtasks && todo.subtasks.length > 0) {
      const subtasksDiv = document.createElement('div');
      subtasksDiv.className = 'todo-subtasks';
      const completedCount = todo.subtasks.filter(s => s.completed).length;
      const totalCount = todo.subtasks.length;
      subtasksDiv.innerHTML = `<div style='margin-bottom:4px;font-size:11px;color:#666;'>Subtasks: ${completedCount}/${totalCount}</div>`;
      todo.subtasks.forEach(subtask => {
        const stDiv = document.createElement('div');
        stDiv.className = 'todo-subtask';
        const stCheck = document.createElement('input');
        stCheck.type = 'checkbox';
        stCheck.checked = subtask.completed;
        stCheck.onchange = () => toggleSubtask(todo.id, subtask.id);
        stDiv.appendChild(stCheck);
        const stText = document.createElement('span');
        stText.innerText = subtask.text;
        if (subtask.completed) stText.style.textDecoration = 'line-through';
        stDiv.appendChild(stText);
        subtasksDiv.appendChild(stDiv);
      });
      content.appendChild(subtasksDiv);
    }
    
    header.appendChild(content);
    
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `todo-priority-badge todo-priority-${todo.priority.toLowerCase()}`;
    priorityBadge.innerText = todo.priority;
    header.appendChild(priorityBadge);
    
    row.appendChild(header);
    
    const actions = document.createElement('div');
    actions.className = 'todo-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'todo-btn-edit';
    editBtn.innerText = '✏️ Edit';
    editBtn.onclick = () => editTodo(todo.id);
    actions.appendChild(editBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-btn-delete';
    deleteBtn.innerText = '🗑️ Delete';
    deleteBtn.onclick = () => removeTodo(todo.id);
    actions.appendChild(deleteBtn);
    
    row.appendChild(actions);
    list.appendChild(row);
  });
}

function updateTodoStats() {
  const total = todoList.length;
  const completed = todoList.filter(t => t.completed).length;
  const active = total - completed;
  const today = new Date().toISOString().split('T')[0];
  const overdue = todoList.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
  
  if (safeEl('todo-stat-total')) safeEl('todo-stat-total').innerText = total;
  if (safeEl('todo-stat-active')) safeEl('todo-stat-active').innerText = active;
  if (safeEl('todo-stat-completed')) safeEl('todo-stat-completed').innerText = completed;
  if (safeEl('todo-stat-overdue')) safeEl('todo-stat-overdue').innerText = overdue;
  
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const fill = safeEl('todo-progress-fill');
  const text = safeEl('todo-progress-text');
  if (fill) fill.style.width = percent + '%';
  if (text) text.innerText = `${percent}% Complete (${completed}/${total})`;
}

function filterTodos() {
  renderTodoList();
}

function sortTodos() {
  renderTodoList();
}

function filterByPriority(priority) {
  todoFilterPriority = priority;
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-priority') === priority);
  });
  renderTodoList();
}

async function clearCompletedTodos() {
  if (!confirm('Are you sure you want to delete all completed tasks?')) return;
  todoList = todoList.filter(t => !t.completed);
  await saveTodoList();
  renderTodoList();
}

function exportTodos() {
  const data = todoList.map(t => ({
    title: t.title,
    description: t.description || '',
    subject: t.subject || '',
    dueDate: t.dueDate || '',
    priority: t.priority,
    completed: t.completed,
    tags: (t.tags || []).join(', '),
    subtasks: (t.subtasks || []).map(s => s.text).join('; ')
  }));
  
  const csv = [
    ['Title', 'Description', 'Subject', 'Due Date', 'Priority', 'Completed', 'Tags', 'Subtasks'],
    ...data.map(row => [
      row.title, row.description, row.subject, row.dueDate, 
      row.priority, row.completed, row.tags, row.subtasks
    ])
  ].map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focusflow-tasks-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== MUSIC APP ==========
function initMusicApp() {
  const audio = safeEl("music-audio");
  if (!audio) return;

  if (!audio.dataset.bound) {
    audio.dataset.bound = "1";
    audio.onended = () => nextTrack();
  }

  renderMusicPlaylist();
  setMusicVolume(safeEl("music-volume")?.value || 0.6);

  if (!audio.src) {
    playTrack(musicCurrentIndex, false);
  } else {
    updateMusicNowPlaying();
  }
}

function renderMusicPlaylist() {
  const list = safeEl("music-playlist");
  if (!list) return;
  list.innerHTML = "";
  musicTracks.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = "music-track-row" + (idx === musicCurrentIndex ? " active" : "");
    row.innerHTML = `<div><strong>${t.title}</strong><div style='font-size:11px;color:#667085;'>${t.artist}</div></div>`;
    row.onclick = () => playTrack(idx, true);
    list.appendChild(row);
  });
}

function updateMusicNowPlaying() {
  const track = musicTracks[musicCurrentIndex];
  if (safeEl("music-track-title")) safeEl("music-track-title").innerText = track?.title || "No track selected";
  if (safeEl("music-track-meta")) safeEl("music-track-meta").innerText = track ? `${track.artist}` : "Pick a song from the playlist";
  if (safeEl("music-play-btn")) safeEl("music-play-btn").innerText = musicIsPlaying ? "Pause" : "Play";
  renderMusicPlaylist();
}

function playTrack(index, autoPlay = true) {
  const audio = safeEl("music-audio");
  if (!audio || !musicTracks[index]) return;
  musicCurrentIndex = index;
  audio.src = musicTracks[index].url;
  if (autoPlay) {
    audio.play().then(() => {
      musicIsPlaying = true;
      updateMusicNowPlaying();
    }).catch(() => {
      musicIsPlaying = false;
      updateMusicNowPlaying();
    });
  } else {
    musicIsPlaying = false;
    updateMusicNowPlaying();
  }
}

function togglePlayPause() {
  const audio = safeEl("music-audio");
  if (!audio) return;
  if (!audio.src) playTrack(musicCurrentIndex, false);
  if (audio.paused) {
    audio.play().then(() => {
      musicIsPlaying = true;
      updateMusicNowPlaying();
    }).catch(() => {});
  } else {
    audio.pause();
    musicIsPlaying = false;
    updateMusicNowPlaying();
  }
}

function nextTrack() {
  const next = (musicCurrentIndex + 1) % musicTracks.length;
  playTrack(next, true);
}

function prevTrack() {
  const prev = (musicCurrentIndex - 1 + musicTracks.length) % musicTracks.length;
  playTrack(prev, true);
}

function setMusicVolume(value) {
  const audio = safeEl("music-audio");
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, parseFloat(value) || 0));
}

// ========== STOCK MARKET SIMULATOR ==========
function ensureStockState() {
  if (!stockGame || typeof stockGame !== "object") {
    stockGame = { coins: 1500, prices: {}, holdings: {}, trades: [], history: {} };
  }
  if (!Number.isFinite(stockGame.coins)) stockGame.coins = 1500;
  if (!stockGame.prices || typeof stockGame.prices !== "object") stockGame.prices = {};
  if (!stockGame.holdings || typeof stockGame.holdings !== "object") stockGame.holdings = {};
  if (!Array.isArray(stockGame.trades)) stockGame.trades = [];
  if (!stockGame.history || typeof stockGame.history !== "object") stockGame.history = {};

  stockCatalog.forEach((s) => {
    if (!Number.isFinite(stockGame.prices[s.symbol])) {
      stockGame.prices[s.symbol] = s.base;
    }
    if (!Number.isFinite(stockGame.holdings[s.symbol])) {
      stockGame.holdings[s.symbol] = 0;
    }
    if (!Array.isArray(stockGame.history[s.symbol])) {
      stockGame.history[s.symbol] = Array.from({ length: 20 }, () => s.base);
    }
    if (!stockGame.history[s.symbol].length) {
      stockGame.history[s.symbol] = [stockGame.prices[s.symbol]];
    }
    stockGame.history[s.symbol] = stockGame.history[s.symbol].slice(-80);
  });

  if (!stockCatalog.some((s) => s.symbol === selectedStockSymbol)) {
    selectedStockSymbol = stockCatalog[0]?.symbol || "TECHX";
  }
}

async function loadStockGame() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  if (data.stockGame && typeof data.stockGame === "object") {
    stockGame = data.stockGame;
  }
  ensureStockState();
  renderStockApp();
}

async function saveStockGame() {
  if (!auth.currentUser) return;
  ensureStockState();
  await db.collection("user_data").doc(auth.currentUser.uid).set({ stockGame }, { merge: true });
}

function startStockMarket() {
  ensureStockState();
  renderStockApp();
  if (stockMarketInterval) clearInterval(stockMarketInterval);
  stockMarketInterval = setInterval(() => {
    simulateStockTick();
    renderStockApp();
  }, 2500);
}

function simulateStockTick() {
  stockCatalog.forEach((s) => {
    const current = stockGame.prices[s.symbol] || s.base;
    const drift = (Math.random() - 0.5) * 2 * s.vol;
    const next = Math.max(1, current * (1 + drift));
    const nextPrice = parseFloat(next.toFixed(2));
    stockGame.prices[s.symbol] = nextPrice;
    stockGame.history[s.symbol].push(nextPrice);
    stockGame.history[s.symbol] = stockGame.history[s.symbol].slice(-80);
  });
}

function stockPortfolioValue() {
  return stockCatalog.reduce((sum, s) => {
    const qty = stockGame.holdings[s.symbol] || 0;
    const price = stockGame.prices[s.symbol] || 0;
    return sum + qty * price;
  }, 0);
}

function renderStockApp() {
  ensureStockState();
  const coins = stockGame.coins;
  const portfolio = stockPortfolioValue();
  const net = coins + portfolio;
  if (safeEl("stock-coins")) safeEl("stock-coins").innerText = `${coins.toFixed(2)} coins`;
  if (safeEl("stock-portfolio-value")) safeEl("stock-portfolio-value").innerText = `${portfolio.toFixed(2)} coins`;
  if (safeEl("stock-net-worth")) safeEl("stock-net-worth").innerText = `${net.toFixed(2)} coins`;

  const body = safeEl("stocks-body");
  if (body) {
    body.innerHTML = "";
    stockCatalog.forEach((s) => {
      const tr = document.createElement("tr");
      const price = stockGame.prices[s.symbol] || s.base;
      const owned = stockGame.holdings[s.symbol] || 0;
      if (s.symbol === selectedStockSymbol) tr.style.background = "#f2f8ff";
      tr.innerHTML = `
        <td><button class='btn-save' style='padding:3px 7px;' onclick="selectStockSymbol('${s.symbol}')">${s.symbol}</button><div style='font-size:11px;color:#667085;margin-top:3px;'>${s.name}</div></td>
        <td>${price.toFixed(2)}</td>
        <td>${owned}</td>
        <td><input id='stock-qty-${s.symbol}' type='number' min='1' value='1' style='width:58px;'></td>
        <td>
          <button class='btn-save' onclick="buyStock('${s.symbol}')">Buy</button>
          <button class='kill-btn' onclick="sellStock('${s.symbol}')">Sell</button>
        </td>
      `;
      body.appendChild(tr);
    });
  }

  renderStockChart();

  const port = safeEl("stocks-portfolio");
  if (port) {
    const rows = stockCatalog
      .map((s) => ({ symbol: s.symbol, qty: stockGame.holdings[s.symbol] || 0, price: stockGame.prices[s.symbol] || s.base }))
      .filter((r) => r.qty > 0);
    if (!rows.length) {
      port.innerHTML = "<div style='color:#888;'>No holdings yet</div>";
    } else {
      port.innerHTML = rows.map((r) => `<div class='stock-holding-row'><span>${r.symbol} x${r.qty}</span><strong>${(r.qty * r.price).toFixed(2)}</strong></div>`).join("");
    }
  }

  const hist = safeEl("stocks-history");
  if (hist) {
    if (!stockGame.trades.length) {
      hist.innerHTML = "<div style='color:#888;'>No trades yet</div>";
    } else {
      hist.innerHTML = stockGame.trades.slice(0, 15).map((t) => `<div class='stock-trade-row'><span>${t.side} ${t.qty} ${t.symbol}</span><strong>${t.total.toFixed(2)}</strong></div>`).join("");
    }
  }
}

function selectStockSymbol(symbol) {
  if (!stockCatalog.some((s) => s.symbol === symbol)) return;
  selectedStockSymbol = symbol;
  renderStockApp();
}

function renderStockChart() {
  const title = safeEl("stock-chart-title");
  const svg = safeEl("stock-chart-svg");
  const stats = safeEl("stock-chart-stats");
  if (!title || !svg || !stats) return;

  const points = (stockGame.history[selectedStockSymbol] || []).slice(-60);
  if (!points.length) {
    title.innerText = `${selectedStockSymbol} chart`;
    svg.innerHTML = "";
    stats.innerHTML = "";
    return;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.01, max - min);
  const w = 320;
  const h = 140;
  const pad = 8;

  const xy = points.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const up = last >= first;
  const stroke = up ? "#16a34a" : "#dc2626";

  svg.innerHTML = `
    <rect x="0" y="0" width="320" height="140" fill="#ffffff"></rect>
    <polyline points="${xy}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>
  `;

  title.innerText = `${selectedStockSymbol} • ${last.toFixed(2)} coins`;
  stats.innerHTML = `
    <span>Min ${min.toFixed(2)}</span>
    <span>Max ${max.toFixed(2)}</span>
    <span style="color:${stroke};">${up ? "Rising" : "Dropping"}</span>
  `;
}

function readStockQty(symbol) {
  const qty = parseInt(safeEl(`stock-qty-${symbol}`)?.value || "1", 10);
  return Math.max(1, qty || 1);
}

async function buyStock(symbol) {
  ensureStockState();
  const qty = readStockQty(symbol);
  const price = stockGame.prices[symbol] || 0;
  const total = qty * price;
  if (total > stockGame.coins) return alert("Not enough coins.");

  stockGame.coins = parseFloat((stockGame.coins - total).toFixed(2));
  stockGame.holdings[symbol] = (stockGame.holdings[symbol] || 0) + qty;
  stockGame.trades.unshift({ side: "BUY", symbol, qty, total: parseFloat(total.toFixed(2)), ts: Date.now() });
  stockGame.trades = stockGame.trades.slice(0, 100);

  await saveStockGame();
  renderStockApp();
}

async function sellStock(symbol) {
  ensureStockState();
  const qty = readStockQty(symbol);
  const owned = stockGame.holdings[symbol] || 0;
  if (qty > owned) return alert("You do not own that many shares.");

  const price = stockGame.prices[symbol] || 0;
  const total = qty * price;
  stockGame.holdings[symbol] = owned - qty;
  stockGame.coins = parseFloat((stockGame.coins + total).toFixed(2));
  stockGame.trades.unshift({ side: "SELL", symbol, qty, total: parseFloat(total.toFixed(2)), ts: Date.now() });
  stockGame.trades = stockGame.trades.slice(0, 100);

  await saveStockGame();
  renderStockApp();
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = safeEl("notification-panel");
  const icon = safeEl("notification-icon");
  if (!panel || !icon) return;
  
  if (panel.style.display === "block" && !panel.contains(e.target) && !icon.contains(e.target)) {
    panel.style.display = "none";
  }
});
