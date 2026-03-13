// Leaderboard Functions

/**
 * LEADERBOARD MODULE
 * Global ranking by XP and achievements
 */

/**
 * Load and display top 100 users by XP
 */
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
