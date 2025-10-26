const professionMap = {
  // Clases Principales
  雷影剑士: { name: "Stormblade", icon: "class_stormblade.webp", role: "dps" },
  冰魔导师: { name: "Frost Mage", icon: "class_frost_mage.webp", role: "dps" },
  青岚骑士: {
    name: "Wind Knight",
    icon: "class_wind_knight.webp",
    role: "tank",
  },
  森语者: {
    name: "Verdant Oracle",
    icon: "class_verdant_oracle.webp",
    role: "dps",
  },
  巨刃守护者: {
    name: "Heavy Guardian",
    icon: "class_heavy_guardian.webp",
    role: "tank",
  },
  神射手: { name: "Marksman", icon: "class_marksman.webp", role: "dps" },
  神盾骑士: {
    name: "Shield Knight",
    icon: "class_shield_knight.webp",
    role: "tank",
  },
  灵魂乐手: {
    name: "Soul Musician",
    icon: "class_soul_musician.webp",
    role: "dps",
  },
  "涤罪恶火·战斧": { name: "Fire Axe", icon: "Fire Assxe.webp", role: "dps" },

  "雷霆一闪·手炮": { name: "Gunner", icon: "desconocido.png", role: "dps" },
  "暗灵祈舞·仪刀/仪仗": {
    name: "Spirit Dancer",
    icon: "desconocido.png",
    role: "dps",
  },

  // Especializaciones
  居合: { name: "laido Slash", icon: "class_stormblade.webp", role: "dps" },
  月刃: { name: "MoonStrike", icon: "class_stormblade.webp", role: "dps" },
  冰矛: { name: "Icicle", icon: "class_frost_mage.webp", role: "dps" },
  射线: { name: "Frostbeam", icon: "class_frost_mage.webp", role: "dps" },
  防盾: { name: "Vanguard", icon: "class_shield_knight.webp", role: "tank" },
  岩盾: { name: "Skyward", icon: "Fire Assxe.webp", role: "tank" },
  惩戒: { name: "Smite", icon: "class_verdant_oracle.webp", role: "dps" },
  愈合: { name: "Lifebind", icon: "class_verdant_oracle.webp", role: "healer" },
  格挡: { name: "Block", icon: "class_shield_knight.webp", role: "tank" },
  狼弓: { name: "Wildpack", icon: "class_marksman.webp", role: "dps" },
  鹰弓: { name: "Falconry", icon: "class_marksman.webp", role: "dps" },
  光盾: { name: "Shield", icon: "class_shield_knight.webp", role: "tank" },
  协奏: { name: "Concerto", icon: "class_soul_musician.webp", role: "dps" },
  狂音: { name: "Dissonance", icon: "class_soul_musician.webp", role: "dps" },
  空枪: { name: "Empty Gun", icon: "class_wind_knight.webp", role: "dps" },
  重装: { name: "Heavy Armor", icon: "class_wind_knight.webp", role: "dps" },
};

const defaultProfession = {
  name: "Unknown",
  icon: "desconocido.png",
  role: "dps",
};

const SYNC_RESET_TIME = 80;
const WIN_MIN_SIZE_LITE = [500, 100];
const WIN_MIN_SIZE_ADV = [650, 100];
const WIN_MAX_SIZE = [2000, 2000];

let currentLogId;
let currentLogData;
let logs = new Array();

let startTime;
let lastTotalDamage = 0;
let lastDamageChangeTime = Date.now();
let syncTimerInterval;
let syncCountdown = 0;
let syncTimerDisplayTimeout;

let winState = {
  size: [WIN_MIN_SIZE_LITE[0], 250],
  position: [0, 0],
  zoom: 1,
  isLiteMode: true,
  liteModeType: "dps",
};

const elDpsTimer = document.getElementById("dps-timer");
const elPlayerBarsContainer = document.getElementById("player-bars-container");
const elLogsSection = document.getElementById("encounters-section");
const elLoading = document.getElementById("loading-indicator");
const elSyncButton = document.getElementById("sync-button");
const elResetButton = document.getElementById("reset-button");
const elAdvLiteButton = document.getElementById("advanced-lite-btn");
const elModeTypeButton = document.getElementById("lite-dps-healer-btn");
const elZoomInButton = document.getElementById("zoom-in-button");
const elZoomOutButton = document.getElementById("zoom-out-button");
const elCloseButton = document.getElementById("close-button");
const elResizeHandle = document.getElementById("resize-handle");
const elHeader = document.getElementById("header");
const elDpsMeter = document.querySelector(".dps-meter");
const elSyncIcon = document.querySelector("#sync-button .sync-icon");
const elSyncTimer = document.querySelector("#sync-button .sync-timer");

function saveWindowState() {
  localStorage.setItem("win_state", JSON.stringify(winState));
}

function loadWindowState() {
  const state = localStorage.getItem("win_state");
  if (state) {
    winState = {
      ...winState,
      ...JSON.parse(state),
    };
  }

  const [rw, rh] = winState.size;
  const [dx, dy] = winState.position;
  window.electronAPI?.setPosition(dx, dy);
  resizeWindow(rw, rh);
  applyZoom();
}

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

const getUserTotalDamage = (user) => {
  return user.total_damage && user.total_damage.total
    ? Number(user.total_damage.total)
    : 0;
};
const getUserTotalHealing = (user) => {
  return user.total_healing && user.total_healing.total
    ? Number(user.total_healing.total)
    : 0;
};

const updateWindowMinSize = () => {
  const width = winState.isLiteMode
    ? WIN_MIN_SIZE_LITE[0]
    : WIN_MIN_SIZE_ADV[0];
  if (elDpsMeter) {
    elDpsMeter.style.width = `${width}px`;
  }
  if (elResizeHandle) {
    const r = winState.zoom * width;
    elResizeHandle.style.width = `${r}px`;
  }
  resizeWindow(null, null);
  applyZoom();
};

document.addEventListener("DOMContentLoaded", () => {
  loadWindowState();
  updateWindowMinSize();

  if (elResetButton) {
    elResetButton.addEventListener("click", () => {
      saveCurrentEncounter();
      resetDpsMeter();
    });
  }

  if (elAdvLiteButton) {
    elAdvLiteButton.textContent = winState.isLiteMode ? "Lite" : "Adv.";
    elAdvLiteButton.addEventListener("click", () => {
      winState.isLiteMode = !winState.isLiteMode;
      updateWindowMinSize();

      elAdvLiteButton.classList.toggle("lite", winState.isLiteMode);
      elAdvLiteButton.textContent = winState.isLiteMode ? "Lite" : "Adv.";
      if (elModeTypeButton) {
        elModeTypeButton.style.display = winState.isLiteMode
          ? "inline-flex"
          : "none";
      }
      if (currentLogId) {
        loadEncounter(currentLogId);
      } else {
        fetchDataAndRender();
      }
    });
  }
  if (elModeTypeButton) {
    elModeTypeButton.textContent = winState.liteModeType === "dps" ? "⚔" : "✚";
    elModeTypeButton.addEventListener("click", () => {
      winState.liteModeType =
        winState.liteModeType === "dps" ? "healer" : "dps";
      elModeTypeButton.textContent =
        winState.liteModeType === "dps" ? "⚔" : "✚";
      elModeTypeButton.classList.toggle(
        "lite",
        winState.isLiteMode
      ); /* Asegura que el botón Lite/Healer también tenga el estilo 'lite' */
      if (currentLogId) {
        loadEncounter(currentLogId);
      } else {
        fetchDataAndRender();
      }
    });
  }
  // Inicializar visibilidad y estilo del botón al cargar
  if (elModeTypeButton) {
    elModeTypeButton.style.display = winState.isLiteMode
      ? "inline-flex"
      : "none";
    elModeTypeButton.classList.toggle("lite", winState.isLiteMode);
  }

  if (elZoomInButton) {
    elZoomInButton.addEventListener("click", () => {
      winState.zoom = Math.min(2.0, winState.zoom + 0.1);
      applyZoom();
    });
  }

  if (elZoomOutButton) {
    elZoomOutButton.addEventListener("click", () => {
      winState.zoom = Math.max(0.7, winState.zoom - 0.1);
      applyZoom();
    });
  }

  window.electronAPI?.onLock((locked) => {
    document.body.classList.toggle("locked", locked);
  });
  window.electronAPI?.onMove((pos) => {
    winState.position = pos;
    saveWindowState();
  });

  if (elCloseButton) {
    elCloseButton.addEventListener("click", () => {
      window.electronAPI?.closeWindow();
    });
  }

  if (elResizeHandle) {
    let isResizing = false;
    let startMouseY = 0;
    let startWindowHeight = 0;

    const startResize = (e) => {
      isResizing = true;
      startMouseY = e.pageY;
      startWindowHeight = window.innerHeight;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
      e.preventDefault();
      e.stopPropagation();
    };

    const doResize = (e) => {
      if (!isResizing) return;
      const deltaY = e.pageY - startMouseY;
      const minHeight = window.isLiteMode
        ? WIN_MIN_SIZE_LITE[1]
        : WIN_MIN_SIZE_ADV[1];
      const newHeight = Math.max(
        minHeight,
        Math.min(WIN_MAX_SIZE[1], startWindowHeight + deltaY)
      );
      resizeWindow(null, Math.round(newHeight));
    };

    const stopResize = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    elResizeHandle.addEventListener("mousedown", startResize);
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
  }
});

function applyZoom() {
  if (elPlayerBarsContainer) {
    elPlayerBarsContainer.style.transform = `scale(${winState.zoom})`;
    elPlayerBarsContainer.style.transformOrigin = "top left";
    elLogsSection.style.width = `${winState.zoom * 100}%`;
    elHeader.style.width = `${winState.zoom * 100}%`;

    const width = winState.isLiteMode
      ? WIN_MIN_SIZE_LITE[0]
      : WIN_MIN_SIZE_ADV[0];
    const wPx = `${winState.zoom * width}px`;
    if (elResizeHandle) elResizeHandle.style.width = wPx;
    if (elLoading) elLoading.style.width = wPx;
    updateWindowSize();
  }
}

function updateWindowSize() {
  if (!elDpsMeter || !elPlayerBarsContainer) return;
  const minWidth = window.isLiteMode
    ? WIN_MIN_SIZE_LITE[0]
    : WIN_MIN_SIZE_ADV[0];
  const finalWidth = Math.round(minWidth * winState.zoom);
  resizeWindow(finalWidth, null);
}

function resizeWindow(width, height) {
  const [w, h] = winState.size;
  winState.size = [width ? width : w, height ? height : h];
  const [nw, nh] = winState.size;
  window.electronAPI?.resizeWindow(nw, nh);
  saveWindowState();
}

function resetDpsMeter() {
  fetch("/api/clear");
  elDpsTimer.style.display = "none";
  elDpsTimer.innerText = "";
  console.log("Medidor reiniciado.");
  lastTotalDamage = 0;
  lastDamageChangeTime = Date.now();
  stopSyncTimer();
}

// La función syncData ya no se llama por un clic, pero se mantiene por si se usa internamente
async function syncData() {
  // No modificar el estado visual aquí, se gestiona en updateSyncButtonState
  try {
    await fetch("/api/sync", { method: "POST" });
    console.log("Datos sincronizados internamente.");
  } catch (error) {
    console.error("Error al sincronizar datos:", error);
  }
}

// Función para actualizar el estado visual del indicador de sincronización
function updateSyncButtonState() {
  clearTimeout(syncTimerDisplayTimeout); // Limpiar cualquier timeout pendiente

  if (syncTimerInterval) {
    // Si el temporizador está activo (hay cuenta regresiva)
    if (syncCountdown <= 60) {
      // Mostrar temporizador, ocultar icono
      elSyncIcon.style.display = "none";
      elSyncIcon.classList.remove("spinning");
      elSyncTimer.innerText = `${syncCountdown}s`;
      elSyncTimer.style.display = "block";
    } else {
      // Mostrar icono girando, ocultar temporizador
      elSyncIcon.style.display = "block";
      elSyncIcon.classList.add("spinning"); // Asegura que gire continuamente
      elSyncTimer.style.display = "none";
    }
  } else {
    // Si el temporizador no está activo (no hay cuenta regresiva)
    // Mostrar icono girando, ocultar temporizador
    elSyncIcon.style.display = "block";
    elSyncIcon.classList.add("spinning"); // Asegura que gire continuamente
    elSyncTimer.style.display = "none";
    elSyncTimer.innerText = "";
  }
}

function startSyncTimer() {
  if (syncTimerInterval) return; // Evitar múltiples temporizadores
  syncCountdown = SYNC_RESET_TIME;
  updateSyncButtonState(); // Establecer el estado inicial

  syncTimerInterval = setInterval(() => {
    syncCountdown--;
    updateSyncButtonState(); // Actualizar el estado en cada tick

    if (syncCountdown <= 0) {
      stopSyncTimer();
      resetDpsMeter();
    }
  }, 1000);
}

function stopSyncTimer() {
  clearInterval(syncTimerInterval);
  syncTimerInterval = null;
  clearTimeout(syncTimerDisplayTimeout); // Limpiar el timeout si existe
  updateSyncButtonState(); // Restablecer el estado del indicador
}

function formatTimer(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function updateEncountersUI() {
  elLogsSection.style.display = "block";
  let html =
    '<select id="encounters-dropdown" style="border: none; width:100%;padding:6px 4px;font-size:1rem;background:rgba(0,0,0,0.3);color:var(--text-primary);">';
  html += '<option value="">Live DPS</option>';

  logs.forEach((enc) => {
    const selected = currentLogId === enc.id ? "selected" : "";
    const duration = formatDuration(enc.duration_ms);
    const date = formatDate(enc.date);
    const damage = formatStat(enc.total_damage);
    html += `<option value="${enc.id}" ${selected}>${date} - ${damage} (${duration}) - ${enc.player_count} players</option>`;
  });

  html += "</select>";
  elLogsSection.innerHTML = html;

  const elDropdown = document.getElementById("encounters-dropdown");
  elDropdown.onchange = async function () {
    if (this.value === "") {
      currentLogId = null;
      fetchDataAndRender();
    } else {
      loadEncounter(this.value);
    }
  };
}

function loadEncounter(encounterId) {
  if (!encounterId) return;
  const log = logs.find((log) => log.id == encounterId);
  if (!log) return;
  currentLogId = encounterId;
  renderHistoricalData(log.data);
}

function saveCurrentEncounter() {
  if (!currentLogData) return;

  const userArray = Object.values(currentLogData).filter(
    (u) => u.total_damage && u.total_damage.total > 0
  );
  if (userArray.length <= 0) return;

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const totalDamage = userArray.reduce(
    (acc, u) => acc + (u.total_damage?.total || 0),
    0
  );
  const timestamp = startTime;
  const durationMs = Date.now() - timestamp;

  logs.unshift({
    id: id,
    timestamp: timestamp,
    date: new Date(timestamp).toISOString(),
    duration_ms: durationMs,
    total_damage: totalDamage,
    player_count: userArray.length,
    data: userArray,
  });
  logs = logs.slice(0, 5);

  updateEncountersUI();
  startTime = null;
  currentLogData = null;
}

function getHealthColor(percentage) {
  const r1 = 220,
    g1 = 53,
    b1 = 69; // Rojo para HP bajo (#dc3545)
  const r2 = 40,
    g2 = 167,
    b2 = 69; // Verde para HP alto (#28a745)

  const r = Math.round(r1 + (r2 - r1) * (percentage / 100));
  const g = Math.round(g1 + (g2 - g1) * (percentage / 100));
  const b = Math.round(b1 + (b2 - b1) * (percentage / 100));

  return `rgb(${r}, ${g}, ${b})`;
}

function formatStat(value) {
  if (!value) return 0;
  if (value >= 1000000000000) {
    return (value / 1000000000000).toFixed(1) + "T";
  }
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + "G";
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "k";
  }
  return value.toFixed(0);
}

const playerColors = [
  "rgba(255, 99, 132, 0.5)", // Rojo
  "rgba(54, 162, 235, 0.5)", // Azul
  "rgba(255, 206, 86, 0.5)", // Amarillo
  "rgba(75, 192, 192, 0.5)", // Verde
  "rgba(153, 102, 255, 0.5)", // Morado
  "rgba(255, 159, 64, 0.5)", // Naranja
];

function renderLiteBars(userArray) {
  elPlayerBarsContainer.innerHTML = userArray
    .map((u, index) => {
      const professionParts = u.profession.split("-");
      const mainProfessionKey = professionParts[0];
      const subProfessionKey = professionParts[1];
      const mainProf = professionMap[mainProfessionKey] || defaultProfession;
      const subProf = professionMap[subProfessionKey];
      let prof = subProf || mainProf;
      const userName = u.name || "";
      const bgColor = playerColors[index % playerColors.length];
      let mgColor = bgColor.replace("0.5", "1");
      let barFillWidth, barFillBackground, value1, value2, value3, iconHtml;

      if (winState.liteModeType === "dps") {
        const dps = Number(u.total_dps) || 0;
        barFillWidth = u.damagePercent;
        barFillBackground =
          dps > 0 ? `linear-gradient(0, ${bgColor}, transparent)` : "none";
        iconHtml = "<span style='font-size:1.1em;margin-right:2px;'>🔥</span>";
        value1 = `${formatStat(u.total_damage.total || 0)}`;
        value2 = `${Math.round(u.damagePercent)}%`;
        value3 = `${formatStat(dps)}/s`;
      } else {
        const hps = Number(u.total_hps) || 0;
        mgColor = "#22873a";
        barFillWidth = u.healingPercent;
        barFillBackground =
          u.total_healing && u.total_healing.total > 0
            ? `linear-gradient(180deg, transparent, #28a745)`
            : "none";
        iconHtml =
          "<span style='font-size:1.1em;margin-right:2px; color: #28a745; text-shadow: 0 0 2px white, 0 0 2px white, 0 0 2px white, 0 0 2px white;'>⛨</span>";
        value1 = `${formatStat((u.total_healing && u.total_healing.total) || 0)}`;
        value2 = `${Math.round(u.healingPercent)}%`;
        value3 = `${formatStat(hps)}/s`;
      }

      return `
        <div class="lite-bar">
            <div class="lite-bar-fill" style="width: ${barFillWidth}%; background: ${barFillBackground}; border-bottom: 2px solid ${mgColor}"></div>
            <div class="lite-bar-content" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <img class="lite-bar-icon" src="icons/${prof.icon}" alt="icon" style="margin-left:2px; margin-right:5px;" />
                    <span class="lite-bar-name">${userName}</span>
                </div>
                <div class="lite-bar-values">
                    <span style="min-width: 65px">${value1}</span>
                    <span style="min-width: 70px">${value3}</span>
                    <span style="min-width: 55px">${value2}</span>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
}

function renderAdvancedBars(userArray) {
  elPlayerBarsContainer.innerHTML = userArray
    .map((u, index) => {
      const professionParts = u.profession.split("-");
      const mainProfessionKey = professionParts[0];
      const subProfessionKey = professionParts[1];
      const mainProf = professionMap[mainProfessionKey] || defaultProfession;
      const subProf = professionMap[subProfessionKey];
      let prof = subProf || mainProf;
      let professionName = mainProf.name;
      if (subProf) {
        professionName += ` - ${subProf.name}`;
      }
      const dps = Number(u.total_dps) || 0;
      const color = playerColors[index % playerColors.length];
      const dpsColor =
        dps > 0 ? `linear-gradient(90deg, transparent, ${color})` : "none";
      const nombre = u.name || "";
      const totalHits = u.total_count.total || 0;
      const crit =
        u.total_count.critical !== undefined && totalHits > 0
          ? Math.round((u.total_count.critical / totalHits) * 100)
          : "0";
      const lucky =
        u.total_count.lucky !== undefined && totalHits > 0
          ? Math.round((u.total_count.lucky / totalHits) * 100)
          : "0";
      const peak = u.realtime_dps_max !== undefined ? u.realtime_dps_max : 0;
      return `<div class="player-bar" data-rank="${u.rank}">
                <div class="progress-fill" style="width: ${u.damagePercent}%; background: ${dpsColor}"></div>
                <div class="bar-content">
                    <img class="class-icon" src="icons/${prof.icon}" alt="icon" style="height: 42px; width: 42px;">
                    <div class="column name-col">
                        <span class="player-name">${nombre}</span>
                        <div class="additional-stat-row" style="height: 18px; margin-top: 1px; margin-bottom: 1px;">
                            <span class="additional-stat-icon" style="color: #dc3545; position: absolute; left: 4px; z-index: 2;">❤</span>
                            <div class="hp-bar-background">
                                <div class="hp-bar-fill" style="width: ${((u.hp || 0) / (u.max_hp || 1)) * 100}%; background-color: ${getHealthColor(((u.hp || 0) / (u.max_hp || 1)) * 100)};"></div>
                            </div>
                            <span class="additional-stat-value" style="width: 100%; text-align: center; font-size: 0.8rem; color: white; text-shadow: 1px 1px 1px black;">${formatStat(u.hp || 0)}/${formatStat(u.max_hp || 0)}</span>
                        </div>
                        <span class="player-id">${professionName}</span>
                    </div>
                    <div class="column stats-col" style="margin-left: 40px;">
                        <div class="stats-group">
                            <div class="stat-row"><span class="stat-value">${formatStat(dps)}</span><span class="stat-label">DPS</span></div>
                            <div class="stat-row"><span class="stat-value">${formatStat(u.total_hps || 0)}</span><span class="stat-label" style="color: #28a745;">HPS</span></div>
                            <div class="stat-row"><span class="stat-value">${formatStat(u.taken_damage)}</span><span class="stat-label" style="color: #ffc107;">DT</span></div>
                        </div>
                    </div>                    
                    <div class="column extra-col" style="margin-left: -10px;">
                        <div class="stats-extra">
                            <div class="stat-row">
                            <span class="stat-icon"> ✸</span>
                                <span class="stat-label">CRIT</span>
                                <span class="stat-value">${crit}%</span>
                            </div>
                            <div class="stat-row">
                            <span class="stat-icon"> ☘</span>
                                <span class="stat-label">LUCK</span>
                                <span class="stat-value">${lucky}%</span>
                            </div>
                            <div class="stat-row">
                            <span class="stat-icon"> ⚔</span>
                                <span class="stat-label">MAX</span>
                                <span class="stat-value">${formatStat(peak)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="column additional-stats-col">
                        <div class="additional-stats-group">
                            <div class="additional-stat-row">
                                <span class="additional-stat-icon" style="font-weight: bold;">GS</span>
                                <span style="flex: 1"></span>
                                <span class="additional-stat-value">${formatStat(u.fightPoint)}</span>
                            </div>
                            <div class="additional-stat-row">
                                <span class="additional-stat-icon">🔥</span>
                                <span style="flex: 1"></span>
                                <span class="additional-stat-value">${formatStat(u.total_damage.total || 0)}</span>
                            </div>
                            <div class="additional-stat-row">
                                <span class="additional-stat-icon" style="color: #28a745;">✚</span>
                                <span style="flex: 1"></span>
                                <span class="additional-stat-value">${formatStat(u.total_healing.total || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <span style="min-width: 60px; text-align: center;">${Math.round(u.damagePercent)}%</span>
                </div>
            </div>`;
    })
    .join("");
}

function renderHistoricalData(userData) {
  elLoading.style.display = "none";
  elPlayerBarsContainer.style.display = "flex";

  const userValues = Object.values(userData);
  const [_, userArray] = handleUserArray(userValues);

  // Render using same logic as live data
  if (winState.isLiteMode) {
    renderLiteBars(userArray);
  } else {
    renderAdvancedBars(userArray);
  }

  updateWindowSize();
}

async function fetchDataAndRender() {
  try {
    const userData = await fetch("/api/data").then((res) => res.json());

    const userValues = Object.values(userData.user);
    const [totalDamage, userArray] = handleUserArray(userValues);

    if ((!userArray || userArray.length === 0) && !currentLogId) {
      elLoading.style.display = "flex";
      elPlayerBarsContainer.style.display = "none";
      saveCurrentEncounter();
      updateSyncButtonState();
      return;
    }
    if (!startTime) startTime = Date.now();
    currentLogData = userArray;

    if (currentLogId) {
      return;
    }

    elLoading.style.display = "none";
    elPlayerBarsContainer.style.display = "flex";

    if (totalDamage > 0) {
      if (totalDamage !== lastTotalDamage) {
        lastTotalDamage = totalDamage;
        lastDamageChangeTime = Date.now();
        stopSyncTimer();
      } else {
        if (Date.now() - lastDamageChangeTime > SYNC_RESET_TIME * 1000) {
          resetDpsMeter();
          return;
        }
        if (!syncTimerInterval) {
          startSyncTimer();
        }
      }
    } else {
      lastTotalDamage = 0;
      lastDamageChangeTime = Date.now();
      stopSyncTimer();
    }

    if (winState.isLiteMode) {
      renderLiteBars(userArray);
    } else {
      renderAdvancedBars(userArray);
    }
  } catch (err) {
    if (elPlayerBarsContainer) {
      elPlayerBarsContainer.innerHTML = `<div id="message-display">An error occured: ${err}</div>`;
    }
  } finally {
    updateSyncButtonState();
  }
}

function handleUserArray(userArray) {
  if (!userArray) return [0, userArray];

  userArray = userArray.filter((u = getUserTotalDamage(u) > 0));
  userArray = userArray.slice(0, 20);

  let sumTotalDamage = 0;
  let sumTotalHealing = 0;
  userArray.forEach((u) => {
    sumTotalDamage += getUserTotalDamage(u);
    sumTotalHealing += getUserTotalHealing(u);
  });

  userArray.forEach((u) => {
    const userDamage = getUserTotalDamage(u);
    const userHealing = getUserTotalHealing(u);
    u.healingPercent =
      sumTotalHealing > 0
        ? clamp((userHealing / sumTotalHealing) * 100, 0, 100)
        : 0;
    u.damagePercent =
      sumTotalDamage > 0
        ? clamp((userDamage / sumTotalDamage) * 100, 0, 100)
        : 0;
  });

  if (winState.isLiteMode && winState.liteModeType === "healer") {
    userArray.sort((a, b) => b.healingPercent - a.healingPercent);
  } else {
    userArray.sort((a, b) => b.damagePercent - a.damagePercent);
  }
  return [sumTotalDamage, userArray];
}

// Actualizar UI cada 50ms
setInterval(fetchDataAndRender, 50);
setInterval(updateEncountersUI, 10000);
fetchDataAndRender();
updateEncountersUI();
