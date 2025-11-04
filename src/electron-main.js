const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec, fork } = require("child_process");
const net = require("net");

let mainWindow;
let serverProcess;
let serverPort = 8989;
let isLocked = false;

function lockWindow(lock) {
  if (!mainWindow) return;

  isLocked = lock;
  mainWindow.setMovable(!isLocked);
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  if (isLocked) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  mainWindow.webContents.send("on-lock", isLocked);
}

const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port);
  });
};

async function findAvailablePort() {
  let port = 8989;
  while (true) {
    if (await checkPort(port)) {
      return port;
    }
    console.warn(`Port ${port} is already in use, trying next...`);
    port++;
  }
}

async function killProcessUsingPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (!stdout) return resolve();

      const lines = stdout
        .split("\n")
        .filter((line) => line.includes("LISTENING"));
      if (lines.length === 0) return resolve();

      const pid = lines[0].trim().split(/\s+/).pop();
      if (!pid) return resolve();

      console.log(`Killing process ${pid} using port ${port}...`);
      exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
        if (killError) {
          console.error(`Error killing process ${pid}: ${killError.message}`);
        } else {
          console.log(`Process ${pid} killed successfully.`);
        }
        resolve();
      });
    });
  });
}

async function createWindow() {
  await killProcessUsingPort(8989);
  serverPort = await findAvailablePort();

  mainWindow = new BrowserWindow({
    width: 440,
    height: 364,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "..", "public", "icon.ico"),
  });

  ipcMain.on("close-window", () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.on("resize-window", (event, width, height) => {
    if (mainWindow) {
      mainWindow.setMinimumSize(0, 0);
      mainWindow.setSize(width, height);
    }
  });

  ipcMain.on("set-position", (event, x, y) => {
    if (!mainWindow) return;
    mainWindow.setPosition(x, y);
  });

  mainWindow.on("focus", () => {
    lockWindow(false);
  });

  mainWindow.on("blur", () => {
    lockWindow(true);
  });

  mainWindow.on("move", () => {
    const pos = mainWindow.getPosition();
    mainWindow.webContents.send("on-move", pos);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    const pos = mainWindow.getPosition();
    mainWindow.webContents.send("on-lock", isLocked);
    mainWindow.webContents.send("on-move", pos);
    mainWindow.webContents.send("on-args", process.argv);
  });

  let serverPath;
  if (process.defaultApp || process.env.NODE_ENV === "development") {
    serverPath = path.join(__dirname, "..", "src", "server", "server.js");
  } else {
    serverPath = path.join(app.getAppPath(), "src", "server", "server.js");
  }
  console.log(`Opening server.js at ${serverPath}:${serverPort}`);

  serverProcess = fork(serverPath, [serverPort], {
    stdio: ["pipe", "pipe", "pipe", "ipc"],
    execArgv: [],
  });

  let serverLoaded = false;
  let serverTimeout = setTimeout(() => {
    if (!serverLoaded) {
      console.log("Timeout loading server.");
      mainWindow.loadURL(
        'data:text/html,<h2 style="color:red">Error: Timeout loading server.</h2>'
      );
    }
  }, 10000);

  serverProcess.stdout.on("data", (data) => {
    console.log("server stdout: " + data);
    if (serverLoaded) return;
    const match = data
      .toString()
      .match(/Web server started at (http:\/\/localhost:\d+)/);
    if (match && match[1]) {
      const serverUrl = match[1];
      console.log("Loading URL in window: " + serverUrl + "/index.html");
      mainWindow.loadURL(`${serverUrl}/index.html`);
      serverLoaded = true;
      clearTimeout(serverTimeout);
    }
  });
  serverProcess.stderr.on("data", (data) => {
    console.log("server stderr: " + data);
  });
  serverProcess.on("close", (code) => {
    console.log("server process exited with code " + code);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill("SIGKILL");
        }
      }, 5000);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
