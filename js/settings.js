// Settings Profile and Wallpaper Functions

/**
 * SETTINGS & USER PROFILE MODULE
 * User profile customization, wallpaper, display name, password changes
 */

// ============================================
// ADMIN & AUTH STATE
// ============================================

let isAdminOwner = false;       // Is user an app admin?
let adminSelectedUid = null;    // Admin editing which user?
let adminEmails = [];           // List of admin email addresses

const DEFAULT_ADMIN_EMAILS = ["isaaclau888@yahoo.com", "isaaclau888@gmail.com"];
let profilePhotoOverride = "";

function setProfilePhotoOverride(url) {
  profilePhotoOverride = String(url || "").trim();
  if (auth.currentUser) updateSettingsProfile(auth.currentUser);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Update user's profile info in settings panel
 * @param {Object} user - Firebase user object
 */
function updateSettingsProfile(user) {
  if (!user) return;
  const name = user.displayName || (user.email || "guest").split("@")[0];
  const avatar = safeEl("settings-avatar");
  const loginAvatar = safeEl("user-photo");
  const nameEl = safeEl("settings-name-display");
  const nameInput = safeEl("set-display-name");
  const googleStatus = safeEl("google-status-pill");
  const pwSection = safeEl("password-section");
  const linkGoogleBtn = safeEl("link-google-btn");
  const unlinkGoogleBtn = safeEl("unlink-google-btn");

  if (nameEl) nameEl.innerText = name;
  if (nameInput) nameInput.value = name;
  const photo = profilePhotoOverride || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  if (avatar) avatar.style.backgroundImage = `url('${photo}')`;
  if (loginAvatar) loginAvatar.style.backgroundImage = `url('${photo}')`;

  if (googleStatus) {
    const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
    const hasPassword = user.providerData.some((p) => p.providerId === "password");

    if (isGoogle) {
      googleStatus.innerText = hasPassword ? "Google + Email Linked" : "Google Linked";
      googleStatus.style.background = "#e6f4ea";
      googleStatus.style.color = "#137333";
      if (pwSection) pwSection.style.display = hasPassword ? "block" : "none";
      if (linkGoogleBtn) {
        linkGoogleBtn.disabled = true;
        linkGoogleBtn.innerText = "Google Linked";
      }
      if (unlinkGoogleBtn) {
        unlinkGoogleBtn.disabled = false;
        unlinkGoogleBtn.style.display = "inline-block";
      }
    } else {
      googleStatus.innerText = "Email Account";
      googleStatus.style.background = "#fff3cd";
      googleStatus.style.color = "#856404";
      if (pwSection) pwSection.style.display = "block";
      if (linkGoogleBtn) {
        linkGoogleBtn.disabled = false;
        linkGoogleBtn.innerText = "Link Google Account";
      }
      if (unlinkGoogleBtn) {
        unlinkGoogleBtn.disabled = true;
        unlinkGoogleBtn.style.display = "none";
      }
    }
  }
}

function triggerProfilePhotoPicker() {
  const input = safeEl("profile-photo-input");
  if (input) input.click();
}

async function updateProfilePhoto(event) {
  const file = event?.target?.files?.[0];
  if (!auth.currentUser || !file) return;
  if (!file.type.startsWith("image/")) return alert("Please choose an image file.");

  let fallbackDataUrl = "";
  try {
    fallbackDataUrl = await fileToDataURL(file);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `profile_photos/${auth.currentUser.uid}_${Date.now()}.${ext}`;
    const ref = storage.ref().child(path);

    await ref.put(file);
    const photoURL = await ref.getDownloadURL();
    await auth.currentUser.updateProfile({ photoURL });
    await auth.currentUser.reload();

    await db.collection("users").doc(auth.currentUser.uid).set({ photoURL }, { merge: true });
    await db.collection("user_data").doc(auth.currentUser.uid).set({ profilePhotoDataUrl: firebase.firestore.FieldValue.delete() }, { merge: true });
    setProfilePhotoOverride("");
    updateSettingsProfile(auth.currentUser);
    alert("Profile picture updated.");
  } catch (err) {
    try {
      if (!fallbackDataUrl) fallbackDataUrl = await fileToDataURL(file);
      await db.collection("user_data").doc(auth.currentUser.uid).set({ profilePhotoDataUrl: fallbackDataUrl }, { merge: true });
      setProfilePhotoOverride(fallbackDataUrl);
      updateSettingsProfile(auth.currentUser);
      alert("Profile picture updated (fallback mode).");
    } catch (fallbackErr) {
      alert(fallbackErr.message || err.message || "Failed to update profile picture.");
    }
  } finally {
    if (event?.target) event.target.value = "";
  }
}

async function linkGoogleAccount() {
  if (!auth.currentUser) return;
  const hasGoogle = auth.currentUser.providerData.some((p) => p.providerId === "google.com");
  if (hasGoogle) return alert("Your account is already linked with Google.");

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.currentUser.linkWithPopup(provider);
    await auth.currentUser.reload();
    updateSettingsProfile(auth.currentUser);
    alert("Google account linked successfully.");
  } catch (err) {
    if (err?.code === "auth/credential-already-in-use") {
      alert("This Google account is already linked to another user.");
      return;
    }
    if (err?.code === "auth/provider-already-linked") {
      alert("Google is already linked to this account.");
      return;
    }
    if (err?.code === "auth/requires-recent-login") {
      alert("Please sign in again, then try linking Google.");
      return;
    }
    alert(err.message || "Failed to link Google account.");
  }
}

async function unlinkGoogleAccount() {
  if (!auth.currentUser) return;

  const providers = (auth.currentUser.providerData || []).map((p) => p.providerId);
  const hasGoogle = providers.includes("google.com");
  const hasPassword = providers.includes("password");
  const otherProviders = providers.filter((p) => p !== "google.com");

  if (!hasGoogle) return alert("Google is not linked to this account.");
  if (!hasPassword && otherProviders.length === 0) {
    return alert("Cannot unlink Google because it is your only sign-in method.");
  }

  try {
    await auth.currentUser.unlink("google.com");
    await auth.currentUser.reload();
    updateSettingsProfile(auth.currentUser);
    alert("Google account unlinked.");
  } catch (err) {
    if (err?.code === "auth/requires-recent-login") {
      alert("Please sign in again, then try unlinking Google.");
      return;
    }
    alert(err.message || "Failed to unlink Google account.");
  }
}

async function removeProfilePhoto() {
  if (!auth.currentUser) return;

  try {
    await auth.currentUser.updateProfile({ photoURL: null });
    await auth.currentUser.reload();
    await db.collection("users").doc(auth.currentUser.uid).set({ photoURL: firebase.firestore.FieldValue.delete() }, { merge: true });
    await db.collection("user_data").doc(auth.currentUser.uid).set({ profilePhotoDataUrl: firebase.firestore.FieldValue.delete() }, { merge: true });
    setProfilePhotoOverride("");
    updateSettingsProfile(auth.currentUser);
    alert("Profile picture removed.");
  } catch (err) {
    alert(err.message || "Failed to remove profile picture.");
  }
}

function saveNotes() {
  if (!auth.currentUser) return;
  db.collection("user_data").doc(auth.currentUser.uid).set({ notes: safeEl("note-textarea")?.value || "" }, { merge: true });
}

/**
 * Change user's wallpaper background
 * @param {string} url - Image URL or CSS gradient
 */
function applyWallpaper(value) {
  const wp = document.querySelector(".wallpaper");
  if (!wp) return;
  if ((value + "").includes("gradient(")) {
    wp.style.backgroundImage = "none";
    wp.style.background = value;
  } else {
    wp.style.background = "";
    wp.style.backgroundImage = `url('${value}')`;
    wp.style.backgroundSize = "cover";
    wp.style.backgroundPosition = "center";
  }
}

/**
 * Save wallpaper choice to database
 * @param {string} url - Wallpaper image URL
 */
function changeWallpaper(url) {
  if (!auth.currentUser || !url) return;
  applyWallpaper(url);
  db.collection("user_data").doc(auth.currentUser.uid).set({ wallpaper: url }, { merge: true });
}

/**
 * Save gradient wallpaper to database
 * @param {string} gradient - CSS gradient string
 */
function changeWallpaperGradient(gradient) {
  if (!auth.currentUser || !gradient) return;
  applyWallpaper(gradient);
  db.collection("user_data").doc(auth.currentUser.uid).set({ wallpaper: gradient }, { merge: true });
}

function updateDisplayName() {
  const newName = safeEl("set-display-name")?.value || "";
  if (!auth.currentUser || !newName) return;
  auth.currentUser.updateProfile({ displayName: newName }).then(() => {
    if (safeEl("settings-name-display")) safeEl("settings-name-display").innerText = newName;
    if (safeEl("user-display-name")) safeEl("user-display-name").innerText = newName;
  });
}

function updatePassword() {
  const pass = safeEl("new-password")?.value || "";
  if (!auth.currentUser || !pass) return;
  auth.currentUser.updatePassword(pass).then(() => alert("Password updated")).catch((e) => alert(e.message));
}
