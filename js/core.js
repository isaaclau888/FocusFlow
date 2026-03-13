/**
 * FOCUSFLOW - Core Configuration Module
 * Main entry point with Firebase setup, global state, and utility functions
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================
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

// ============================================
// DEVICE DETECTION & GLOBAL STATE
// ============================================

// Detects if user is on a mobile device (Android, iOS, iPad, etc.)
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

// Track z-index for layering windows (brings active window to front)
let topZ = 100;
// Keep track of currently open app windows
let openApps = new Set();

// ============================================
// APP METADATA & CONFIGURATION
// ============================================
// Metadata for all 16 applications (title, icon URL)
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
  filemgr: { title: "File Manager", icon: "https://img.icons8.com/fluency/16/folder-invoices.png" },
  terminal: { title: "Terminal", icon: "https://img.icons8.com/fluency/16/console.png" },
  music: { title: "Music Player", icon: "https://img.icons8.com/fluency/16/musical-notes.png" },
  stocks: { title: "Stock Market Simulator", icon: "https://img.icons8.com/fluency/16/combo-chart.png" },
  flashcards: { title: "Flashcards", icon: "https://img.icons8.com/fluency/16/stack-of-photos.png" },
  progress: { title: "Progress", icon: "https://img.icons8.com/fluency/16/combo-chart.png" },
  leaderboard: { title: "Leaderboard", icon: "https://img.icons8.com/fluency/16/trophy.png" },
  admin: { title: "Admin Panel", icon: "https://img.icons8.com/fluency/16/lock.png" }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Safe element getter - returns null if element doesn't exist
 * @param {string} id - The HTML element ID
 * @returns {HTMLElement|null}
 */
function safeEl(id) { 
  return document.getElementById(id); 
}

/**
 * Normalize email to lowercase and trim whitespace
 * @param {string} value - Email to normalize
 * @returns {string}
 */
function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

/**
 * Remove duplicate emails from array (case-insensitive)
 * @param {string[]} list - Array of emails
 * @returns {string[]}
 */
function uniqueEmails(list) {
  return Array.from(new Set((list || []).map(normalizeEmail).filter(Boolean)));
}

/**
 * Calculate user level based on XP (100 XP = 1 level)
 * @param {number} xp - Experience points
 * @returns {number}
 */
function calcLevelFromXP(xp) { 
  return Math.max(1, Math.floor((xp || 0) / 100) + 1); 
}

/**
 * Get today's date as YYYY-MM-DD string (for daily tracking)
 * @returns {string}
 */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 * @returns {string}
 */
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Convert seconds to human-readable duration label (e.g., "2h 30m")
 * @param {number} seconds - Total seconds
 * @returns {string}
 */
function minutesToLabel(seconds) {
  const mins = Math.floor((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ============================================
// UI INTERACTIONS & EVENT LISTENERS
// ============================================

// Update clock every second
setInterval(() => {
  const c = safeEl("clock");
  if (c) c.innerText = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}, 1000);

// Close notification panel when user clicks outside of it
document.addEventListener('click', (e) => {
  const panel = safeEl("notification-panel");
  const icon = safeEl("notification-icon");
  if (!panel || !icon) return;
  
  if (panel.style.display === "block" && !panel.contains(e.target) && !icon.contains(e.target)) {
    panel.style.display = "none";
  }
});

// Mobile optimization: Convert app icon double-clicks to single-clicks (more natural on touch)
if (isMobileDevice()) {
  document.addEventListener('DOMContentLoaded', () => {
    const appIcons = document.querySelectorAll('.app-icon');
    appIcons.forEach(icon => {
      icon.ondblclick = null;
      
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        const iconElement = e.currentTarget;

        // Ignore click events that immediately follow a drag gesture.
        const draggedAt = parseInt(iconElement.dataset.draggedAt || "0", 10);
        if (draggedAt && (Date.now() - draggedAt) < 450) return;

        const ondbclick = iconElement.getAttribute('ondblclick');
        if (ondbclick) {
          const match = ondbclick.match(/openApp\('([^']+)'\)/);
          if (match && match[1]) {
            openApp(match[1]);
          }
        }
      });
    });
  });
}
