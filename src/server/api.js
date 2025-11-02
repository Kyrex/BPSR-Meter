const express = require("express");
const cors = require("cors");
const path = require("path");

function initializeApi(app, io, userDataManager, globalSettings) {
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "..", "public")));

  app.get("/icon.png", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "public", "icon.png"));
  });

  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "public", "icon.ico"));
  });

  app.get("/api/data", (req, res) => {
    const userData = userDataManager.getAllUsersData();
    const data = {
      code: 0,
      user: userData,
    };
    res.json(data);
  });

  app.get("/api/enemies", (req, res) => {
    const enemiesData = userDataManager.getAllEnemiesData();
    const data = {
      code: 0,
      enemy: enemiesData,
    };
    res.json(data);
  });

  app.get("/api/clear", (req, res) => {
    userDataManager.clearAll(globalSettings);
    console.log("Statistics cleared!");
    res.json({
      code: 0,
      msg: "Statistics cleared!",
    });
  });

  io.on("connection", (socket) => {
    console.log("Client WebSocket connected: " + socket.id);

    socket.on("disconnect", () => {
      console.log("Client WebSocket disconnected: " + socket.id);
    });
  });

  setInterval(() => {
    if (!globalSettings.isPaused) {
      const userData = userDataManager.getAllUsersData();
      const data = {
        code: 0,
        user: userData,
      };
      io.emit("data", data);
    }
  }, 100);
}

module.exports = initializeApi;
