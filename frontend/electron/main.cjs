const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const frontendRoot = path.resolve(__dirname, "..");
const developmentJar = path.join(frontendRoot, "backend", "OnionManager.jar");

let mainWindow;
let onionManagerProcess;

function resolveJarPath() {
  const packagedJar = path.join(process.resourcesPath, "OnionManager.jar");
  return app.isPackaged ? packagedJar : developmentJar;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    backgroundColor: "#071320",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  if (process.argv.includes("--dev")) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(frontendRoot, "dist", "index.html"));
  }
}

function sendOutput(stream, data) {
  const text = data.toString();
  const message = { stream, text };
  console[stream === "stderr" ? "error" : "log"](`[OnionManager ${stream}] ${text.trimEnd()}`);
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send("onion-manager:output", message);
  }
}

function snapshotPath() {
  const directory = app.isPackaged ? "OnionManager" : "OnionManager-dev";
  return path.join(app.getPath("appData"), directory, "snapshots", "latest-config.json");
}

async function readSnapshot() {
  try {
    const snapshot = JSON.parse(await fs.promises.readFile(snapshotPath(), "utf8"));
    const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    const layers = ["hardware", "firmware", "os", "libraries", "applications"];
    if (!isObject(snapshot) || snapshot.schemaVersion !== 1 ||
        typeof snapshot.collectedAt !== "string" || !Number.isFinite(Date.parse(snapshot.collectedAt)) ||
        !isObject(snapshot.config) || !layers.every((layer) => {
          const value = snapshot.config[layer];
          if (!isObject(value) && !Array.isArray(value)) return false;
          return !Object.hasOwn(value, "error") || typeof value.error === "string";
        })) {
      throw new Error("Invalid or unsupported configuration snapshot.");
    }
    return { status: "found", snapshot };
  } catch (error) {
    if (error.code === "ENOENT") return { status: "missing" };
    return { status: "error", message: `Unable to read saved configuration: ${error.message}` };
  }
}

let collectionRunning = false;

async function runOnionManager() {
  if (collectionRunning) {
    return { status: "busy", message: "OnionManager is already running." };
  }
  // Set before filesystem awaits to prevent two IPC requests from starting runs.
  collectionRunning = true;
  try {
    const jarPath = resolveJarPath();
    if (!fs.existsSync(jarPath)) {
      return { status: "error", message: 'OnionManager JAR not found. Rebuild or reinstall the application.' };
    }
    const output = snapshotPath();
    await fs.promises.mkdir(path.dirname(output), { recursive: true });
    // The window may have closed while the directory was being created.
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { status: "error", message: "Collection cancelled." };
    }
    const result = await new Promise((resolve) => {
      const child = spawn("java", ["-jar", jarPath, "--output", output], {
        cwd: path.dirname(output),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      onionManagerProcess = child;
      let launchError;
      child.stdout.on("data", (data) => sendOutput("stdout", data));
      child.stderr.on("data", (data) => sendOutput("stderr", data));
      child.on("error", (error) => {
        launchError = `Failed to start Java: ${error.message}. Install Java 17 and ensure java is on PATH.`;
        sendOutput("stderr", launchError);
      });
      child.on("close", (code, signal) => {
        if (onionManagerProcess === child) onionManagerProcess = undefined;
        if (launchError) resolve({ status: "error", message: launchError });
        else if (code === 2) resolve({ status: "busy", message: "Another configuration collection is already running." });
        else if (code !== 0 || signal) resolve({ status: "error", message: "Collection failed or was cancelled. Previous saved configuration was preserved." });
        else resolve({ status: "success" });
      });
    });
    if (result.status !== "success") return result;
    const saved = await readSnapshot();
    if (saved.status === "found") return { status: "success", snapshot: saved.snapshot };
    return { status: "error", message: saved.message || "Collection finished without a saved configuration." };
  } catch (error) {
    return { status: "error", message: `Unable to collect configuration: ${error.message}` };
  } finally {
    collectionRunning = false;
  }
}

function stopCollection() {
  onionManagerProcess?.kill();
}

app.whenReady().then(() => {
  ipcMain.handle("onion-manager:run", runOnionManager);
  ipcMain.handle("onion-manager:read-snapshot", readSnapshot);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopCollection();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", stopCollection);
