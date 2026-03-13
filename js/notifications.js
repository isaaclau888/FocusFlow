// Notification System

/**
 * NOTIFICATION SYSTEM MODULE
 * Handles browser notifications, in-app notification panel, and notification settings
 * Monitors schedules, exams, todos, and messages for timely alerts
 */

// ============================================
// NOTIFICATION STATE
// ============================================

let notificationSettings = {
  enabled: false,
  class: true,    // Class/schedule notifications
  exam: true,     // Exam reminders
  message: true,  // Chat messages
  todo: true,     // Task due dates
  timer: true     // Timer completion
};

let notificationList = [];              // All notifications (max 50)
let notificationCheckInterval = null;   // Scheduled notification checker
let lastMessageCount = 0;               // Track new messages
let notifiedSchedules = new Set();      // Already-notified schedules (prevent duplicates)
let notifiedExams = new Set();          // Already-notified exams

/**
 * Request browser permission to show notifications
 */
async function enableNotifications() {
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

/**
 * Save notification settings to Firestore
 */
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

/**
 * Load notification settings from Firestore
 */
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

/**
 * Start monitoring for schedule, exam, and todo notifications (every 60 seconds)
 */
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

/**
 * Check if any classes are starting soon (10 minute reminder)
 */
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

/**
 * Check if any exams are coming up (1 day and 1 hour reminders)
 */
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

/**
 * Check if any tasks are due today
 */
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

/**
 * Show browser OS notification (visible even if app is not focused)
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {string} type - Notification type ('class', 'exam', 'message', 'todo', 'timer')
 */
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
    else if (type === 'todo') openApp('todolist');
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
  else if (notif.type === 'todo') openApp('todolist');
  
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
