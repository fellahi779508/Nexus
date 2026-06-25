const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const axios = require("axios");
const treeKill = require("tree-kill");

const isDev = !app.isPackaged;

const resourcesPath = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, "..");

// bundled node
const nodeBinary = app.isPackaged
  ? path.join(process.resourcesPath, "node", "node.exe")
  : path.join(__dirname, "..", "resources", "node", "node.exe");

console.log("NODE PATH:", nodeBinary);
console.log("NODE EXISTS:", fs.existsSync(nodeBinary));

let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;
let isLicenseInvalid = false;

// ----------------------------------------------------
// NATIVE PORT CLEANUP (Awaited Asynchronously)
// ----------------------------------------------------
function killPorts() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      return resolve();
    }

    const ports = [3000, 3001];
    const killPromises = [];

    try {
      // Wrapped tightly within a selective platform invocation context block
      const stdout = execSync(`netstat -ano -p tcp`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"], // Suppress standard error pipes
      });

      const lines = stdout.split("\n");

      ports.forEach((port) => {
        for (const line of lines) {
          if (
            line.includes(`127.0.0.1:${port}`) ||
            line.includes(`0.0.0.0:${port}`)
          ) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];

            if (pid && parseInt(pid, 10) > 0) {
              console.log(
                `[PORT CLEANUP] Found lingering process ${pid} on port ${port}. Purging...`,
              );
              killPromises.push(
                new Promise((res) =>
                  treeKill(parseInt(pid, 10), "SIGKILL", () => res()),
                ),
              );
            }
          }
        }
      });
    } catch (err) {
      console.log("[PORT CLEANUP] Netstat command context bypassed safely.");
    }

    // Always resolve the main chain execution pipeline safely
    Promise.all(killPromises)
      .then(() => {
        setTimeout(resolve, 500);
      })
      .catch(() => {
        resolve();
      });
  });
}

// ----------------------------------------------------
// WINDOW
// ----------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "loader.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.setZoomFactor(0.5);
}

// ----------------------------------------------------
// BACKEND
// ----------------------------------------------------
function startBackend() {
  const backendPath = isDev
    ? path.join(__dirname, "../backend/dist/main.js")
    : path.join(resourcesPath, "backend/dist/main.js");

  const backendDir = isDev
    ? path.join(__dirname, "../backend")
    : path.join(resourcesPath, "backend");

  console.log("Backend path:", backendPath);

  if (!fs.existsSync(backendPath)) {
    throw new Error("Backend missing: " + backendPath);
  }

  backendProcess = spawn(nodeBinary, [backendPath], {
    cwd: backendDir,
    windowsHide: true,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "3001",
    },
  });

  // 🛡️ Monitor the process exit code directly
  backendProcess.on("exit", (code) => {
    if (code === 99) {
      console.error(
        "🔒 [SECURITY] Electron caught backend license lockout code (99).",
      );
      isLicenseInvalid = true;
    }
  });

  backendProcess.stdout.on("data", (d) =>
    console.log("[BACKEND]", d.toString()),
  );
  backendProcess.stderr.on("data", (d) =>
    console.error("[BACKEND ERR]", d.toString()),
  );
  backendProcess.on("error", (err) =>
    console.error("BACKEND SPAWN ERROR:", err),
  );
}

// ----------------------------------------------------
// FRONTEND
// ----------------------------------------------------
function startFrontend() {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "frontend", "server.js")
    : path.join(__dirname, "../frontend/.next/standalone/frontend/server.js");

  // Next.js Standalone requires its base execution directory context to map internal server assets
  const frontendCwd = app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "frontend")
    : path.join(__dirname, "../frontend/.next/standalone");

  console.log("Frontend path:", serverPath);

  if (!fs.existsSync(serverPath)) {
    throw new Error("Frontend missing: " + serverPath);
  }

  frontendProcess = spawn(nodeBinary, [serverPath], {
    cwd: frontendCwd,
    windowsHide: true,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "127.0.0.1",
      NEXT_PUBLIC_BASE_PATH: "",
    },
  });

  frontendProcess.stdout.on("data", (d) =>
    console.log("[FRONTEND]", d.toString()),
  );
  frontendProcess.stderr.on("data", (d) =>
    console.error("[FRONTEND ERR]", d.toString()),
  );
  frontendProcess.on("error", (err) =>
    console.error("FRONTEND SPAWN ERROR:", err),
  );
}

// ----------------------------------------------------
// WAIT FOR SERVICES (Safe lifecycle check loops)
// ----------------------------------------------------
async function waitForBackend() {
  console.log("Checking backend synchronization status...");
  for (let i = 0; i < 60; i++) {
    // 🛡️ CRUCIAL: Drop out of the 30-second loop immediately if license check fails
    if (isLicenseInvalid) {
      throw new Error("LICENSE_LOCKOUT");
    }

    try {
      await axios.get("http://127.0.0.1:3001/category", { timeout: 1000 });
      console.log("✅ Backend connection established.");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("backend timeout");
}

async function waitForFrontend() {
  console.log("Checking frontend localization rendering runtime...");
  for (let i = 0; i < 60; i++) {
    try {
      // Added an explicit short timeout duration to prevent HTTP request hanging
      await axios.get("http://127.0.0.1:3000/", { timeout: 1000 });
      console.log("✅ Frontend render stream online.");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Frontend timeout");
}

// ----------------------------------------------------
// LOAD APP
// ----------------------------------------------------
async function loadApp() {
  await waitForBackend();
  await waitForFrontend();
  console.log("Routing browser view port to NextJS server...");
  await mainWindow.loadURL("http://127.0.0.1:3000/fr");
}

// ----------------------------------------------------
// CLEANUP
// ----------------------------------------------------
async function cleanup() {
  console.log("🧹 Cleaning up processes...");
  const killPromises = [];

  const killProc = (proc, name) => {
    if (proc && proc.pid) {
      killPromises.push(
        new Promise((resolve) => {
          treeKill(proc.pid, "SIGKILL", (err) => {
            if (err) {
              console.error(`Failed to kill ${name}:`, err);
            } else {
              console.log(`✅ Killed ${name} (PID ${proc.pid})`);
            }
            resolve();
          });
        }),
      );
    }
  };

  killProc(backendProcess, "backend");
  killProc(frontendProcess, "frontend");

  killPromises.push(killPorts());
  await Promise.all(killPromises);
  console.log("🧹 Cleanup complete");
}

// ----------------------------------------------------
// START
// ----------------------------------------------------
ipcMain.handle("save-database-file", async (event, tempPath) => {
  const { filePath } = await dialog.showSaveDialog({
    title: "Export Database Backup",
    defaultPath: `StockData-backup-${Date.now()}.sqlite`,
    filters: [{ name: "SQLite Database", extensions: ["sqlite"] }],
  });

  if (filePath) {
    // Safely copy the file from the OS temp directory to the user's chosen location
    fs.copyFileSync(tempPath, filePath);
    // Clean up the temp file
    fs.unlinkSync(tempPath);
    return { success: true };
  }

  // Clean up if they hit cancel
  fs.unlinkSync(tempPath);
  return { success: false };
});

app.whenReady().then(async () => {
  try {
    createWindow();
    await killPorts();

    console.log("Starting backend...");
    startBackend();

    console.log("Starting frontend...");
    startFrontend();

    console.log("Loading app...");
    await loadApp();

    console.log("READY");
  } catch (err) {
    console.error("FATAL STARTUP ERROR:", err.message);

    // Purge any ghost frontend servers that might have spun up before the backend crashed
    await cleanup();

    if (mainWindow) {
      if (err.message === "LICENSE_LOCKOUT") {
        // Switch the view to your local self-contained lockout file immediately
        mainWindow.loadFile(path.join(__dirname, "lock.html"));
      } else {
        // Fallback to loader or general error screen for structural crashes
        mainWindow.loadFile(path.join(__dirname, "loader.html"));
      }
    }
  }
});

// ----------------------------------------------------
app.on("window-all-closed", async () => {
  await cleanup();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  await cleanup();
});
