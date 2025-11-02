const winston = require("winston");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const zlib = require("zlib");

const { UserDataManager } = require(path.join(__dirname, "dataManager"));
const Sniffer = require(path.join(__dirname, "sniffer"));
const initializeApi = require(path.join(__dirname, "api"));
const PacketProcessor = require(
  path.join(__dirname, "..", "..", "algo", "packet")
);

let globalSettings = {
  autoClearOnServerChange: true,
  autoClearOnTimeout: false,
  onlyRecordEliteDummy: false,
  enableFightLog: false,
  enableDpsLog: false,
  enableHistorySave: false,
  isPaused: false,
};

let server_port;

async function main() {
  const logger = winston.createLogger({
    level: "error",
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf((info) => {
        return `[${info.timestamp}] [${info.level}] ${info.message}`;
      })
    ),
    transports: [new winston.transports.Console()],
  });

  console.log("DPS Meter Initialized");
  console.log("Detecting network, please wait...");

  const userDataManager = new UserDataManager(logger, globalSettings);
  await userDataManager.initialize();

  const sniffer = new Sniffer(logger, userDataManager, globalSettings);

  const args = process.argv.slice(2);
  let current_arg_index = 0;

  if (args[current_arg_index] && !isNaN(parseInt(args[current_arg_index]))) {
    server_port = parseInt(args[current_arg_index]);
    current_arg_index++;
  }

  let deviceNum = args[current_arg_index];

  try {
    await sniffer.start(deviceNum, PacketProcessor);
  } catch (error) {
    console.error(`Error initializing sniffer ${error.message}`);
    process.exit(1);
  }

  process.on("SIGINT", async () => {
    console.log("Exiting application");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("Exiting application");
    process.exit(0);
  });

  setInterval(() => {
    if (!globalSettings.isPaused) {
      userDataManager.updateAllRealtimeDps();
    }
  }, 100);

  if (server_port === undefined || server_port === null) {
    server_port = 8989;
  }

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  initializeApi(app, io, userDataManager, globalSettings);

  server.listen(server_port, "0.0.0.0", () => {
    const localUrl = `http://localhost:${server_port}`;
    console.log(
      `Servidor web iniciado en ${localUrl}. Puedes acceder desde esta PC usando ${localUrl}/index.html o desde otra PC usando http://[TU_IP_LOCAL]:${server_port}/index.html`
    );
    console.log("Servidor WebSocket iniciado");
  });

  console.log("¡Bienvenido a BPSR Meter!");
  console.log("Detectando servidor de juego, por favor espera...");

  setInterval(() => {
    userDataManager.checkTimeoutClear();
  }, 10000);
}

if (!zlib.zstdDecompressSync) {
  console.log(
    "zstdDecompressSync is not available! Please update your Node.js!"
  );
  process.exit(1);
}

main();
