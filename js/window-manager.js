/**
 * WINDOW MANAGEMENT MODULE
 * Handles app windows: dragging, resizing, opening, closing, layering
 */

/**
 * Bring a window to front by increasing its z-index
 * @param {HTMLElement} el - Window element to bring forward
 */
function bringToFront(el) { 
  topZ += 1; 
  el.style.zIndex = topZ; 
}

/**
 * Enable drag functionality for windows and app icons (mouse + touch)
 * @param {HTMLElement} handleOrElmnt - Element to use as drag handle
 */
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

  const startDrag = (clientX, clientY, sourceEvent) => {
    if (["INPUT", "BUTTON", "TEXTAREA", "A", "SELECT", "LABEL", "OPTION"].includes(sourceEvent?.target?.tagName)) return;
    if (target.classList.contains("maximized")) return;

    bringToFront(target);

    // Ensure icons become absolutely positioned the first time they are dragged.
    if (target.classList.contains("app-icon") && target.style.position !== "absolute") {
      target.style.position = "absolute";
      target.style.top = `${target.offsetTop}px`;
      target.style.left = `${target.offsetLeft}px`;
    }

    let prevX = clientX;
    let prevY = clientY;
    let moved = false;

    const moveTo = (x, y) => {
      const dx = prevX - x;
      const dy = prevY - y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true;
      prevX = x;
      prevY = y;
      target.style.top = `${target.offsetTop - dy}px`;
      target.style.left = `${target.offsetLeft - dx}px`;
    };

    const onMouseMove = (ev) => moveTo(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      if (moved && target.classList.contains("app-icon")) {
        target.dataset.draggedAt = String(Date.now());
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    const onTouchMove = (ev) => {
      const t = ev.touches?.[0];
      if (!t) return;
      ev.preventDefault();
      moveTo(t.clientX, t.clientY);
    };
    const onTouchEnd = () => {
      if (moved && target.classList.contains("app-icon")) {
        target.dataset.draggedAt = String(Date.now());
      }
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
  };

  handle.onmousedown = function (e) {
    startDrag(e.clientX, e.clientY, e);
  };

  handle.ontouchstart = function (e) {
    const t = e.touches?.[0];
    if (!t) return;
    startDrag(t.clientX, t.clientY, e);
  };
}

/**
 * Enable resize functionality for windows (desktop only)
 * Disabled on mobile for better UX
 * @param {HTMLElement} win - Window element to make resizable
 */
function makeResizable(win) {
  // Disable resizing on mobile
  if (isMobileDevice()) return;
  
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

/**
 * Open an app window and load its data
 * @param {string} id - App ID (e.g., 'calendar', 'timer', 'social')
 */
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
  if (id === "filemgr") initFileManagerApp();
  if (id === "terminal") initTerminalApp();
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

/**
 * Close an app window and cleanup resources (timers, listeners)
 * @param {string} id - App ID to close
 */
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

/**
 * Hide a window without closing it
 * @param {string} id - App ID to minimize
 */
function minimizeApp(id) { 
  const win = safeEl("window-" + id); 
  if (win) win.style.display = "none"; 
}

/**
 * Toggle window between normal and maximized states
 * @param {string} id - App ID to toggle
 */
function toggleMaximize(id) { 
  const win = safeEl("window-" + id); 
  if (win) win.classList.toggle("maximized"); 
}

/**
 * Update taskbar with currently open apps
 * Shows app icons that user can click to bring to front
 */
function updateTaskbar() {
  const bar = safeEl("active-apps-bar");
  if (!bar) return;
  bar.innerHTML = "";
  openApps.forEach((id) => {
    if (!appMeta[id]) return;
    const btn = document.createElement("button");
    btn.className = "active-app-btn";
    btn.innerHTML = `<img src="${appMeta[id].icon}"> <span>${appMeta[id].title}</span>`;
    btn.onclick = () => {
      const win = safeEl("window-" + id);
      if (!win) return;
      win.style.display = "flex";
      bringToFront(win);
    };
    bar.appendChild(btn);
  });
}

/**
 * Update Task Manager with open apps and status
 */
function updateTaskManager() {
  const list = safeEl("task-list");
  if (!list) return;
  list.innerHTML = "";
  openApps.forEach((id) => {
    const title = appMeta[id]?.title || id;
    list.innerHTML += `<tr><td>${title}</td><td><span style="color:#27c93f">Active</span></td><td><button class="btn-save" onclick="logTaskComplete(1)">Complete</button> <button class="kill-btn" onclick="closeApp('${id}')">End Task</button></td></tr>`;
  });
}

/**
 * Navigate browser app to a URL
 * Supports search queries and automatic https addition
 */
function navigateBrowser() {
  let url = (safeEl("browser-url")?.value || "").trim();
  if (!url) return;

  // Treat plain text as a search query.
  if (!url.includes(".")) {
    url = "https://www.bing.com/search?q=" + encodeURIComponent(url);
  } else if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  if (safeEl("browser-url")) safeEl("browser-url").value = url;

  const frame = safeEl("browser-frame");
  if (frame) frame.src = url;
}

/**
 * Save user notes to Firestore database
 */
function saveNotes() {
  if (!auth.currentUser) return;
  db.collection("user_data").doc(auth.currentUser.uid).set({ notes: safeEl("note-textarea")?.value || "" }, { merge: true });
}
