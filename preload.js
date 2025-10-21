const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
  resizeWindow: (width, height) =>
    ipcRenderer.send("resize-window", width, height),
  onLockStateChanged: (callback) =>
    ipcRenderer.on("lock-state-changed", (event, isLocked) =>
      callback(isLocked)
    ),
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
