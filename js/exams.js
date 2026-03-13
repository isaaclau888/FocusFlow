// Exam/Test Planner

/**
 * EXAM/TEST PLANNER MODULE
 * Schedule exams, track countdown timers, and monitor study progress
 */

// ============================================
// EXAM STATE
// ============================================

let examList = [];                  // All scheduled exams
let examCountdownInterval = null;   // Timer for countdown display

/**
 * Load all exams from Firestore
 */
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
