const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

let mainWindow;
let serverProcess;
let staticServer;

function startServer() {
  const serverDir = path.join(__dirname, "..", "server");
  serverProcess = spawn("node", ["src/index.js"], {
    cwd: serverDir,
    stdio: "pipe",
    env: { ...process.env, PORT: "3001" },
  });
  serverProcess.stdout.on("data", (d) => process.stdout.write(`[Server] ${d}`));
  serverProcess.stderr.on("data", (d) => process.stderr.write(`[Server] ${d}`));
}

function serveStatic(outDir, port) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".wasm": "application/wasm",
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(outDir, req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(outDir, "index.html"), (err2, data2) => {
          if (err2) { res.writeHead(404); res.end("Not found"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data2);
        });
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  server.listen(port);
  return server;
}

function createWindow() {
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    startServer();
    const outDir = path.join(__dirname, "..", "out");
    if (fs.existsSync(outDir)) {
      staticServer = serveStatic(outDir, 3000);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "..", "public", "favicon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = "http://localhost:3000";
  mainWindow.loadURL(devUrl);
  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
    if (staticServer) staticServer.close();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (staticServer) staticServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
