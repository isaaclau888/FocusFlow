// File Manager App (virtual user files stored in Firestore)

let virtualFS = {
  files: {
    "readme.txt": "Welcome to FocusFlow File Manager.\n\n- Create files\n- Edit and save files\n- Manage them from Terminal"
  }
};
let fileManagerReady = false;
let currentVirtualFile = "";

function normalizeVirtualPath(path) {
  let p = String(path || "").trim().replace(/\\/g, "/");
  p = p.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!p) return "";
  return p;
}

async function loadVirtualFS() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  const saved = data?.virtualFS;
  if (saved && typeof saved === "object" && saved.files && typeof saved.files === "object") {
    virtualFS = saved;
  }
  if (!virtualFS.files || typeof virtualFS.files !== "object") {
    virtualFS.files = {};
  }
}

async function saveVirtualFS() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ virtualFS }, { merge: true });
}

function listVirtualFiles(prefix = "") {
  const normalizedPrefix = normalizeVirtualPath(prefix);
  const all = Object.keys(virtualFS.files || {}).sort((a, b) => a.localeCompare(b));
  if (!normalizedPrefix) return all;
  return all.filter((p) => p === normalizedPrefix || p.startsWith(normalizedPrefix + "/"));
}

function readVirtualFile(path) {
  const p = normalizeVirtualPath(path);
  if (!p) return null;
  return Object.prototype.hasOwnProperty.call(virtualFS.files, p) ? virtualFS.files[p] : null;
}

async function writeVirtualFile(path, content) {
  const p = normalizeVirtualPath(path);
  if (!p) throw new Error("Invalid file path");
  virtualFS.files[p] = String(content || "");
  await saveVirtualFS();
}

async function removeVirtualFile(path) {
  const p = normalizeVirtualPath(path);
  if (!p) throw new Error("Invalid file path");
  delete virtualFS.files[p];
  await saveVirtualFS();
}

function renderFileManagerList() {
  const listEl = safeEl("fm-file-list");
  if (!listEl) return;

  const files = listVirtualFiles();
  if (!files.length) {
    listEl.innerHTML = "<div class='fm-empty'>No files yet</div>";
    return;
  }

  listEl.innerHTML = files.map((path) => {
    const active = currentVirtualFile === path ? " active" : "";
    return `<button class='fm-file-row${active}' onclick="openVirtualFile('${path.replace(/'/g, "\\'")}')">${path}</button>`;
  }).join("");
}

function openVirtualFile(path) {
  const p = normalizeVirtualPath(path);
  const content = readVirtualFile(p);
  currentVirtualFile = p;

  if (safeEl("fm-current-file")) safeEl("fm-current-file").innerText = p || "No file selected";
  if (safeEl("fm-editor")) safeEl("fm-editor").value = content ?? "";
  renderFileManagerList();
}

async function createVirtualFile() {
  const input = safeEl("fm-new-path");
  const p = normalizeVirtualPath(input?.value || "");
  if (!p) return alert("Enter a file path.");
  if (readVirtualFile(p) !== null) return alert("File already exists.");

  await writeVirtualFile(p, "");
  if (input) input.value = "";
  openVirtualFile(p);
}

async function saveVirtualFileContent() {
  if (!currentVirtualFile) return alert("Select a file first.");
  const content = safeEl("fm-editor")?.value || "";
  await writeVirtualFile(currentVirtualFile, content);
  renderFileManagerList();
}

async function deleteCurrentVirtualFile() {
  if (!currentVirtualFile) return alert("Select a file first.");
  if (!confirm(`Delete ${currentVirtualFile}?`)) return;
  await removeVirtualFile(currentVirtualFile);
  currentVirtualFile = "";
  if (safeEl("fm-current-file")) safeEl("fm-current-file").innerText = "No file selected";
  if (safeEl("fm-editor")) safeEl("fm-editor").value = "";
  renderFileManagerList();
}

function refreshFileManager() {
  renderFileManagerList();
}

async function initFileManagerApp() {
  if (!fileManagerReady) {
    await loadVirtualFS();
    fileManagerReady = true;
  }

  if (!currentVirtualFile) {
    const first = listVirtualFiles()[0] || "";
    if (first) openVirtualFile(first);
    else renderFileManagerList();
  } else {
    openVirtualFile(currentVirtualFile);
  }
}
