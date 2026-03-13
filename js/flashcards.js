// ========== FLASHCARD APP ==========

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

/**
 * FLASHCARD STUDY APP MODULE
 * Multi-set flashcard system with 4 study modes: Study, Learn, Write, Match
 * Features: Spaced Repetition (SRS), import/export, accuracy tracking, streaks
 */

// ============================================
// FLASHCARD STATE
// ============================================

let flashcardList = [];               // Cards in current set
let flashcardSets = [];               // All flashcard sets
let currentFlashSetId = null;         // Currently active set
let currentFlashcardId = null;        // Currently studying card
let flashShowBack = false;            // Show answer side?
let flashDeckTitle = "My Flashcard Set";
let flashSearchTerm = "";             // Filter cards by search
let flashShuffleMode = false;         // Randomize card order?
let flashFavoritesOnly = false;       // Show only starred cards?
let flashReviewedSession = 0;         // Cards reviewed in this session
let flashMode = "study";              // 'study', 'learn', 'write', or 'match'
let flashLearnReveal = false;         // Show answer in Learn mode?
let flashWriteFeedback = "";          // Feedback for Write mode
let flashWriteCorrect = false;        // Was write answer correct?
let flashMatchPairs = [];             // Cards in Match mode game
let flashMatchSelectedTerm = null;    // Selected term in Match mode
let flashMatchSelectedDef = null;     // Selected definition in Match mode
let flashMatchMatchedIds = new Set(); // Matched pairs in game
let flashImportFormat = "json";       // CSV or JSON import format

/**
 * Get the currently active flashcard set
 * @returns {Object|null}
 */
function getCurrentFlashSet() {
  return flashcardSets.find((s) => s.id === currentFlashSetId) || null;
}

/**
 * Default stats template for new flashcard sets
 * @returns {Object}
 */
function defaultFlashSetStats() {
  return {
    attempts: 0,
    correct: 0,
    reviewed: 0,
    lastStudyDate: "",
    streakDays: 0
  };
}

/**
 * Ensure flashcard has all required fields
 * @param {Object} c - Card to normalize
 * @returns {Object}
 */
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

/**
 * Ensure flashcard set has all required fields
 * @param {Object} s - Set to normalize
 * @returns {Object}
 */
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
