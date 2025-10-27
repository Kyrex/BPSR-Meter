const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
  setPosition: (x, y) => ipcRenderer.send("set-position", x, y),
  resizeWindow: (w, h) => ipcRenderer.send("resize-window", w, h),
  onLock: (fn) => ipcRenderer.on("on-lock", (ev, isLocked) => fn(isLocked)),
  onMove: (fn) => ipcRenderer.on("on-move", (ev, pos) => fn(pos)),
  onArgs: (fn) => ipcRenderer.on("on-args", (ev, args) => fn(args)),
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
