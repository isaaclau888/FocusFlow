// Terminal App (works with the virtual file system)

let terminalReady = false;
let terminalCwd = "/";
let terminalSessionStartedAt = Date.now();

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

async function terminalGetXP() {
  if (!auth.currentUser) return 0;

  if (typeof getProgress === "function") {
    const progress = await getProgress();
    return progress?.xp || 0;
  }

  const snap = await db.collection("user_progress").doc(auth.currentUser.uid).get();
  if (!snap.exists) return 0;
  return snap.data()?.xp || 0;
}

function terminalPrintHelp() {
  terminalPrint("Available commands:");
  terminalPrint("- help            Show this help message");
  terminalPrint("- whoami          Display current user info");
  terminalPrint("- xp              Show your XP");
  terminalPrint("- clear           Clear terminal output");
  terminalPrint("- date            Show current date/time");
  terminalPrint("- uptime          Show terminal session uptime");
  terminalPrint("- echo <text>     Echo text back");
  terminalPrint("- neofetch        Show system information");
  terminalPrint("- ls [path]       List files");
  terminalPrint("- pwd             Show current directory");
  terminalPrint("- cd <path>       Change directory");
  terminalPrint("- cat <file>      Show file content");
  terminalPrint("- touch <file>    Create file");
  terminalPrint("- write <f> <t>   Write text to file");
  terminalPrint("- rm <file>       Delete file");
}

function terminalResolvePath(inputPath) {
  const raw = String(inputPath || "").trim();
  if (!raw) return "";

  if (raw.startsWith("/")) return normalizeVirtualPath(raw);

  const base = terminalCwd === "/" ? "" : terminalCwd.slice(1);
  const merged = [base, raw].filter(Boolean).join("/");
  const segments = merged.split("/");
  const stack = [];

  segments.forEach((seg) => {
    if (!seg || seg === ".") return;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  });

  return normalizeVirtualPath(stack.join("/"));
}

function terminalPrompt() {
  return `user@focusflow:${terminalCwd}$`;
}

function terminalPrint(line, type = "normal") {
  const output = safeEl("terminal-output");
  if (!output) return;
  const row = document.createElement("div");
  row.className = `terminal-line ${type}`;
  row.textContent = line;
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
}

function terminalPrintCommand(command) {
  terminalPrint(`${terminalPrompt()} ${command}`, "command");
}

function terminalSetPrompt() {
  const promptEl = safeEl("terminal-prompt");
  if (promptEl) promptEl.innerText = terminalPrompt();
}

async function terminalHandleCommand(commandLine) {
  const parts = commandLine.trim().split(" ").filter(Boolean);
  const cmd = (parts[0] || "").toLowerCase();
  const args = parts.slice(1);

  if (!cmd) return;

  if (cmd === "help") {
    terminalPrintHelp();
    return;
  }

  if (cmd === "whoami") {
    const user = auth.currentUser;
    if (!user) {
      terminalPrint("Not signed in", "error");
      return;
    }
    terminalPrint(`Name: ${user.displayName || "Unknown"}`);
    terminalPrint(`Email: ${user.email || "Unknown"}`);
    terminalPrint(`UID: ${user.uid}`);
    terminalPrint(`Provider: ${(user.providerData?.[0]?.providerId) || "Unknown"}`);
    return;
  }

  if (cmd === "xp") {
    const xp = await terminalGetXP();
    terminalPrint(`XP: ${xp}`);
    return;
  }

  if (cmd === "date") {
    terminalPrint(new Date().toString());
    return;
  }

  if (cmd === "uptime") {
    const elapsed = (Date.now() - terminalSessionStartedAt) / 1000;
    terminalPrint(`Uptime: ${formatDuration(elapsed)}`);
    return;
  }

  if (cmd === "echo") {
    terminalPrint(args.join(" "));
    return;
  }

  if (cmd === "neofetch") {
    const user = auth.currentUser;
    const xp = await terminalGetXP();
    terminalPrint("FocusFlow OS");
    terminalPrint("------------");
    terminalPrint(`User: ${user?.displayName || user?.email || "guest"}`);
    terminalPrint(`Email: ${user?.email || "n/a"}`);
    terminalPrint(`XP: ${xp}`);
    terminalPrint(`Apps Open: ${openApps?.size || 0}`);
    terminalPrint(`Path: ${terminalCwd}`);
    terminalPrint(`Uptime: ${formatDuration((Date.now() - terminalSessionStartedAt) / 1000)}`);
    return;
  }

  if (cmd === "clear") {
    const output = safeEl("terminal-output");
    if (output) output.innerHTML = "";
    return;
  }

  if (cmd === "pwd") {
    terminalPrint(terminalCwd);
    return;
  }

  if (cmd === "ls") {
    const target = args[0] ? terminalResolvePath(args[0]) : (terminalCwd === "/" ? "" : terminalCwd.slice(1));
    const list = listVirtualFiles(target);
    if (!list.length) terminalPrint("(empty)");
    else list.forEach((path) => terminalPrint(path));
    return;
  }

  if (cmd === "cd") {
    const target = args[0] || "/";
    const resolved = target === "/" ? "" : terminalResolvePath(target);

    if (!resolved) {
      terminalCwd = "/";
      terminalSetPrompt();
      return;
    }

    const hasMatch = listVirtualFiles(resolved).length > 0;
    if (!hasMatch) {
      terminalPrint("No such directory", "error");
      return;
    }

    terminalCwd = "/" + resolved;
    terminalSetPrompt();
    return;
  }

  if (cmd === "cat") {
    const path = terminalResolvePath(args[0]);
    const content = readVirtualFile(path);
    if (content === null) terminalPrint("File not found", "error");
    else terminalPrint(content || "");
    return;
  }

  if (cmd === "touch") {
    const path = terminalResolvePath(args[0]);
    if (!path) {
      terminalPrint("Usage: touch <file>", "error");
      return;
    }
    if (readVirtualFile(path) === null) {
      await writeVirtualFile(path, "");
    }
    terminalPrint(`Created ${path}`);
    if (typeof refreshFileManager === "function") refreshFileManager();
    return;
  }

  if (cmd === "write") {
    const fileArg = args[0];
    const text = args.slice(1).join(" ");
    const path = terminalResolvePath(fileArg);
    if (!path) {
      terminalPrint("Usage: write <file> <text>", "error");
      return;
    }
    await writeVirtualFile(path, text);
    terminalPrint(`Saved ${path}`);
    if (typeof refreshFileManager === "function") refreshFileManager();
    return;
  }

  if (cmd === "rm") {
    const path = terminalResolvePath(args[0]);
    if (!path || readVirtualFile(path) === null) {
      terminalPrint("File not found", "error");
      return;
    }
    await removeVirtualFile(path);
    terminalPrint(`Removed ${path}`);
    if (typeof refreshFileManager === "function") refreshFileManager();
    return;
  }

  terminalPrint(`Unknown command: ${cmd}`, "error");
}

async function runTerminalCommand() {
  const input = safeEl("terminal-input");
  if (!input) return;
  const command = input.value.trim();
  if (!command) return;

  terminalPrintCommand(command);
  input.value = "";

  try {
    await terminalHandleCommand(command);
  } catch (err) {
    terminalPrint(err?.message || "Command failed", "error");
  }
}

async function initTerminalApp() {
  if (!terminalReady) {
    await loadVirtualFS();
    terminalReady = true;
  }

  terminalSetPrompt();
  const output = safeEl("terminal-output");
  if (output && !output.dataset.booted) {
    output.dataset.booted = "1";
    terminalPrint("FocusFlow terminal ready. Type 'help' for commands.");
  }

  const input = safeEl("terminal-input");
  if (input) input.focus();
}
