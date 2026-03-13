/**
 * AUTHENTICATION MODULE
 * Handles user login, registration, password reset, and session management
 */

let isLoggingOut = false;

/**
 * Sign in user with Google account
 */
function googleLogin() { 
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); 
}

/**
 * Sign in user with email and password
 */
function emailLogin() {
  const email = safeEl("email")?.value || "";
  const pass = safeEl("password")?.value || "";
  auth.signInWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
}

/**
 * Register new user with email and password
 */
function emailRegister() {
  const email = safeEl("email")?.value || "";
  const pass = safeEl("password")?.value || "";
  auth.createUserWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
}

/**
 * Send password reset email to user
 */
function forgotPassword() {
  const email = safeEl("email")?.value || "";
  if (!email) return alert("Enter your email");
  auth.sendPasswordResetEmail(email).then(() => alert("Reset email sent")).catch((e) => alert(e.message));
}

/**
 * Toggle between login and registration forms
 * @param {boolean} reg - True to show register form, false for login
 */
function toggleAuthMode(reg) {
  const login = safeEl("login-actions");
  const register = safeEl("register-actions");
  if (!login | !register) return;
  login.style.display = reg ? "none" : "block";
  register.style.display = reg ? "block" : "none";
}

/**
 * Sign out current user
 */
function logout() { 
  const shutdown = safeEl("shutdown-screen");
  if (shutdown) {
    shutdown.style.display = "flex";
    shutdown.classList.remove("screen-hidden");
  }

  isLoggingOut = true;
  setTimeout(() => {
    auth.signOut();
  }, 700);
}

/**
 * AUTH STATE OBSERVER
 * Runs when user logs in/out - loads all user data and initializes UI
 */
auth.onAuthStateChanged(async (user) => {
  const login = safeEl("login-screen");
  const os = safeEl("os-interface");
  const loader = safeEl("loading-screen");
  const shutdown = safeEl("shutdown-screen");

  try {
    if (user) {
      isLoggingOut = false;
      if (shutdown) shutdown.style.display = "none";

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
        if (typeof setProfilePhotoOverride === "function") setProfilePhotoOverride(data.profilePhotoDataUrl || "");
      } else {
        if (typeof setProfilePhotoOverride === "function") setProfilePhotoOverride("");
      }
    } else {
      if (login) login.style.display = "flex";
      if (os) os.style.display = "none";

      if (isLoggingOut && shutdown) {
        setTimeout(() => {
          shutdown.classList.add("screen-hidden");
          setTimeout(() => {
            shutdown.style.display = "none";
            shutdown.classList.remove("screen-hidden");
            isLoggingOut = false;
          }, 600);
        }, 600);
      } else if (shutdown) {
        shutdown.style.display = "none";
      }
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
