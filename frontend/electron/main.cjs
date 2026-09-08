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

function runOnionManager() {
  if (onionManagerProcess) {
    return { started: false, message: "OnionManager is already running." };
  }

  const jarPath = resolveJarPath();
  if (!fs.existsSync(jarPath)) {
    const message = `OnionManager JAR not found at ${jarPath}. Run "npm run build" first.`;
    sendOutput("stderr", `${message}\n`);
    return { started: false, message };
  }

  onionManagerProcess = spawn(
    "java",
    ["-jar", jarPath],
    { cwd: app.getPath("userData"), stdio: ["pipe", "pipe", "pipe"] },
  );

  onionManagerProcess.stdout.on("data", (data) => sendOutput("stdout", data));
  onionManagerProcess.stderr.on("data", (data) => sendOutput("stderr", data));
  onionManagerProcess.on("error", (error) => {
    sendOutput("stderr", `Failed to start Java: ${error.message}\nInstall Java 17 and ensure "java" is on PATH.\n`);
  });
  onionManagerProcess.on("close", (code, signal) => {
    sendOutput("status", `Process exited with code ${code ?? "unknown"}${signal ? ` (${signal})` : ""}.\n`);
    onionManagerProcess = undefined;
  });

  return { started: true, message: "OnionManager started." };
}

app.whenReady().then(() => {
  ipcMain.handle("onion-manager:run", runOnionManager);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (onionManagerProcess) {
    onionManagerProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
