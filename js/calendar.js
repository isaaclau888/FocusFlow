// Calendar App Functions

/**
 * CALENDAR & SCHEDULE MODULE
 * Enhanced calendar with multiple views, event management, and notifications
 */

// ============================================
// CALENDAR STATE
// ============================================

let calendarCursor = new Date();     // Current month being viewed
let calendarSchedules = [];          // All scheduled events
let calendarView = 'month';          // View mode: 'month', 'week', or 'day'
let currentEditingEventId = null;    // ID of event being edited
let eventFilterType = 'all';         // Filter by event type

/**
 * Navigate to previous month
 */
function prevMonth() {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
}

/**
 * Navigate to next month
 */
function nextMonth() {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
}

/**
 * Render the calendar grid based on current month
 */
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

/**
 * Load all scheduled events from Firestore
 */
async function loadCalendarSchedules() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  calendarSchedules = Array.isArray(data.schedules) ? data.schedules : [];
  renderCalendarSchedules();
}

async function saveCalendarSchedules() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ schedules: calendarSchedules }, { merge: true });
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

// Enhanced Calendar Functions

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

function to24Hour(hour, minute, ampm) {
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

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
  
  const startTime12 = to12Hour(event.startTime);
  if (safeEl('event-start-hour')) safeEl('event-start-hour').value = startTime12.hour;
  if (safeEl('event-start-minute')) safeEl('event-start-minute').value = startTime12.minute;
  if (safeEl('event-start-ampm')) safeEl('event-start-ampm').value = startTime12.ampm;
  
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
