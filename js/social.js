// Social Features: Friends, Chat, and Messaging

/**
 * Check if two users have a blocking relationship
 * @param {string} userA - First user ID
 * @param {string} userB - Second user ID
 * @returns {Promise<boolean>}
 */
async function isBlockedBetween(userA, userB) {
  const a = await db.collection("blocks").where("owner", "==", userA).where("target", "==", userB).limit(1).get();
  if (!a.empty) return true;
  const b = await db.collection("blocks").where("owner", "==", userB).where("target", "==", userA).limit(1).get();
  return !b.empty;
}

/**
 * SOCIAL HUB MODULE
 * Friends list, friend requests, chat, and blocking functionality
 */

// ============================================
// SOCIAL STATE
// ============================================

let activeChat = null;      // Currently open chat window
let chatListener = null;    // Firestore listener for messages

/**
 * Send a friend request to another user
 */
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

/**
 * Load and display all incoming friend requests
 */
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

/**
 * Load all friends of current user
 */
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

/**
 * Open a chat window with a friend
 * @param {string} friendId - Friend's user ID
 * @param {string} name - Friend's display name
 */
function openChat(friendId, name) {
  activeChat = friendId;
  if (safeEl("chat-header")) safeEl("chat-header").innerText = name;
  listenMessages();
}

/**
 * Listen for messages in current chat (real-time updates)
 */
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
