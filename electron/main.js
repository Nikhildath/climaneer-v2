const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

let mainWindow;
let serverProcess;
let staticServer;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverDir = path.join(__dirname, "..", "server");
    const serverMain = path.join(serverDir, "src", "index.js");
    if (!fs.existsSync(serverMain)) {
      console.log("[Electron] Server not found, skipping");
      resolve();
      return;
    }
    serverProcess = spawn("node", ["src/index.js"], {
      cwd: serverDir,
      stdio: "pipe",
      env: { ...process.env, PORT: "3001" },
    });
    serverProcess.stdout.on("data", (d) => process.stdout.write(`[Server] ${d}`));
    serverProcess.stderr.on("data", (d) => process.stderr.write(`[Server] ${d}`));
    serverProcess.on("error", reject);
    serverProcess.on("spawn", () => {
      setTimeout(resolve, 1000);
    });
    setTimeout(resolve, 2000);
  });
}

function serveStatic(outDir, port) {
  return new Promise((resolve, reject) => {
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
            if (err2) {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end("<h1>404</h1><p>Run <code>npm run export</code> first</p>");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data2);
          });
          return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });

    server.on("error", reject);
    server.listen(port, () => {
      console.log(`[Electron] Static server on http://localhost:${port}`);
      resolve(server);
    });
  });
}

function waitForUrl(url, retries = 30) {
  return new Promise((resolve) => {
    function check(n) {
      http.get(url, (res) => {
        resolve(true);
      }).on("error", () => {
        if (n <= 0) {
          console.log(`[Electron] Timed out waiting for ${url}`);
          resolve(false);
        } else {
          setTimeout(() => check(n - 1), 500);
        }
      });
    }
    check(retries);
  });
}

async function createWindow() {
  const isDev = process.env.NODE_ENV === "development";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "..", "public", "favicon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  if (!isDev) {
    const outDir = path.join(__dirname, "..", "out");
    if (fs.existsSync(outDir)) {
      await serveStatic(outDir, 3000);
    }
    await startServer();
  }

  const url = "http://localhost:3000";

  if (!isDev) {
    const ok = await waitForUrl(url);
    if (!ok) {
      mainWindow.loadURL(`data:text/html,<h1>Error</h1><p>Static server not ready. Run <code>npm run export</code> first.</p>`);
      mainWindow.show();
      return;
    }
  }

  mainWindow.loadURL(url);
  mainWindow.show();
  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
    if (staticServer) staticServer.close();
  });
}

app.whenReady().then(createWindow).catch((err) => {
  console.error("[Electron] Failed to start:", err);
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (staticServer) staticServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
