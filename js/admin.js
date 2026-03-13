// Admin Panel Functions

/**
 * ADMIN PANEL MODULE
 * User management, progress editing, and system administration
 */

/**
 * Check and load admin access permissions
 */
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

/**
 * Save updated admin email list to Firestore
 * @param {string[]} nextEmails - New list of admin emails
 */
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

/**
 * Display list of current admins
 */
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
