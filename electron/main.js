const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let serverProcess;

function startServer() {
  const serverDir = path.join(__dirname, "..", "server");
  serverProcess = spawn("node", ["src/index.js"], {
    cwd: serverDir,
    stdio: "pipe",
    env: { ...process.env, PORT: "3001" },
  });
  serverProcess.stdout.on("data", (d) => console.log(`[Server] ${d}`));
  serverProcess.stderr.on("data", (d) => console.error(`[Server] ${d}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "..", "public", "favicon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === "development";
  const url = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "..", "out", "index.html")}`;

  if (!isDev) startServer();

  mainWindow.loadURL(isDev ? url : "http://localhost:3001");
  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
