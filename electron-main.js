const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec, fork } = require("child_process");
const net = require("net"); // Necesario para checkPort
const fs = require("fs");

let mainWindow;
let serverProcess;
let serverPort = 8989;
let isLocked = false;

function lockWindow(lock) {
  if (!mainWindow) return;

  isLocked = lock;
  mainWindow.setMovable(!isLocked);
  if (isLocked) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  mainWindow.webContents.send("lock-state-changed", isLocked);
  console.log(`Is window locked: ${isLocked}`);
}

// Función para verificar si un puerto está en uso
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
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

// Función para matar el proceso que está usando un puerto específico
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
  console.log("Killing process at port 8989!");
  await killProcessUsingPort(8989);

  serverPort = await findAvailablePort();
  console.log(`Port available: ${serverPort}`);

  mainWindow = new BrowserWindow({
    width: 650,
    height: 250,
    minWidth: 650,
    minHeight: 200,
    maxWidth: 650,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "icon.ico"),
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

  mainWindow.on("focus", () => {
    lockWindow(false);
    mainWindow.setMovable(!isLocked);
  });

  mainWindow.on("blur", () => {
    lockWindow(true);
    console.log("Window lost focus");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("lock-state-changed", isLocked);
  });

  // Determinar ruta absoluta a server.js según entorno
  let serverPath;
  if (process.defaultApp || process.env.NODE_ENV === "development") {
    // Modo desarrollo
    serverPath = path.join(__dirname, "server.js");
  } else {
    // Modo empaquetado: usar app.getAppPath() para acceder dentro del asar
    serverPath = path.join(app.getAppPath(), "server.js");
  }
  console.log(
    "Lanzando server.js en puerto " + serverPort + " con ruta: " + serverPath
  );

  // Usar fork para lanzar el servidor como proceso hijo
  const { fork } = require("child_process");
  serverProcess = fork(serverPath, [serverPort], {
    stdio: ["pipe", "pipe", "pipe", "ipc"],
    execArgv: [],
  });

  // Variables para controlar el arranque del servidor
  if (typeof createWindow.serverLoaded === "undefined")
    createWindow.serverLoaded = false;
  if (typeof createWindow.serverTimeout === "undefined")
    createWindow.serverTimeout = null;
  createWindow.serverLoaded = false;
  createWindow.serverTimeout = setTimeout(() => {
    if (!createWindow.serverLoaded) {
      console.log("ERROR: El servidor no respondió a tiempo.");
      mainWindow.loadURL(
        'data:text/html,<h2 style="color:red">Error: El servidor no respondió a tiempo.<br>Revisa iniciar_log.txt para más detalles.</h2>'
      );
    }
  }, 10000); // 10 segundos de espera

  serverProcess.stdout.on("data", (data) => {
    console.log("server stdout: " + data);
    const match = data
      .toString()
      .match(/Servidor web iniciado en (http:\/\/localhost:\d+)/);
    if (match && match[1]) {
      const serverUrl = match[1];
      console.log("Cargando URL en ventana: " + serverUrl + "/index.html");
      mainWindow.loadURL(`${serverUrl}/index.html`);
      createWindow.serverLoaded = true;
      clearTimeout(createWindow.serverTimeout);
    }
  });
  serverProcess.stderr.on("data", (data) => {
    console.log("server stderr: " + data);
  });
  serverProcess.on("close", (code) => {
    console.log("server process exited with code " + code);
  });

  let serverLoaded = false;
  let serverTimeout = setTimeout(() => {
    if (!serverLoaded) {
      console.log("ERROR: El servidor no respondió a tiempo.");
      mainWindow.loadURL(
        'data:text/html,<h2 style="color:red">Error: El servidor no respondió a tiempo.<br>Revisa iniciar_log.txt para más detalles.</h2>'
      );
    }
  }, 10000); // 10 segundos de espera

  serverProcess.stdout.on("data", (data) => {
    console.log("server stdout: " + data);
    // Buscar la URL del servidor en la salida del servidor
    const match = data
      .toString()
      .match(/Servidor web iniciado en (http:\/\/localhost:\d+)/);
    if (match && match[1]) {
      const serverUrl = match[1];
      console.log("Cargando URL en ventana: " + serverUrl + "/index.html");
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
      // Enviar SIGTERM para un cierre limpio
      serverProcess.kill("SIGTERM");
      // Forzar la terminación si no se cierra después de un tiempo
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
