const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const { app, BrowserWindow } = require("electron");
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

// ----------------------------------------------------
// WINDOW
// ----------------------------------------------------
function killPorts() {
  return new Promise((resolve) => {
    exec("npx kill-port 3000 3001", () => resolve());
  });
}
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

  console.log("Backend path:", backendPath);

  if (!fs.existsSync(backendPath)) {
    throw new Error("Backend missing: " + backendPath);
  }

  backendProcess = spawn(nodeBinary, [backendPath], {
    detached: true,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "3001",
    },
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
  console.log("RESOURCES:", process.resourcesPath);
  console.log("BACKEND PATH:", backendPath);
  console.log("EXISTS:", fs.existsSync(backendPath));
}

// ----------------------------------------------------
// FRONTEND
// ----------------------------------------------------
function startFrontend() {
  const serverPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        "frontend",
        ".next",
        "standalone",
        "frontend",
        "server.js",
      )
    : path.join(__dirname, "../frontend/.next/standalone/frontend/server.js");

  console.log("Frontend path:", serverPath);

  if (!fs.existsSync(serverPath)) {
    throw new Error("Frontend missing: " + serverPath);
  }

  frontendProcess = spawn(nodeBinary, [serverPath], {
    detached: true,
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
// WAIT FOR FRONTEND (SAFE)
// ----------------------------------------------------
async function waitForBackend() {
  for (let i = 0; i < 60; i++) {
    try {
      await axios.get("http://127.0.0.1:3001/category");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error("backend timeout");
}
async function waitForFrontend() {
  for (let i = 0; i < 60; i++) {
    try {
      await axios.get("http://127.0.0.1:3000/");
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
app.whenReady().then(async () => {
  try {
    createWindow();
    await killPorts();

    console.log("Starting backend...");
    startBackend(); // fire & forget

    console.log("Starting frontend...");
    startFrontend(); // fire & forget

    console.log("Loading app...");
    await loadApp();

    console.log("READY");
  } catch (err) {
    console.error("FATAL STARTUP ERROR:", err);

    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, "loader.html"));
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
