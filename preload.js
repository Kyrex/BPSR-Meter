const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
  setPosition: (x, y) => ipcRenderer.send("set-position", x, y),
  resizeWindow: (width, height) =>
    ipcRenderer.send("resize-window", width, height),
  onLock: (callback) =>
    ipcRenderer.on("on-lock", (ev, isLocked) => callback(isLocked)),
  onMove: (callback) => ipcRenderer.on("on-move", (ev, pos) => callback(pos)),
});

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
