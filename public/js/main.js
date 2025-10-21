// Estado global para modo Lite
let isLiteMode = true;
let liteModeType = "dps"; // 'dps' o 'healer'

let empty = false;
let startTime;
let currentLog;
let logSelected = -1;
let logs = new Array();

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

let lastTotalDamage = 0;
let lastDamageChangeTime = Date.now();
let currentZoom = 1.0; // Factor de zoom inicial
let syncTimerInterval;
let syncCountdown = 0;
const SYNC_RESET_TIME = 80; // Segundos para el reinicio automático
let syncTimerDisplayTimeout; // Para el retardo de 200ms
let isLocked = false; // Estado de bloqueo de la ventana
let logPreviewTimeout; // Declarar logPreviewTimeout aquí
let size = [650, 250];

const dpsTimerDiv = document.getElementById("dps-timer");
const playerBarsContainer = document.getElementById("player-bars-container");
const syncButton = document.getElementById("sync-button");
const syncIcon = document.querySelector("#sync-button .sync-icon");
const syncTimerSpan = document.querySelector("#sync-button .sync-timer");
const encountersSection = document.getElementById("encounters-section"); // Sección de encuentros guardados
const loadingIndicator = document.getElementById("loading-indicator"); // Indicador de carga
let currentEncounterId = null; // ID del encuentro actualmente cargado
let isViewingHistory = false; // Si estamos viendo un encuentro histórico

document.addEventListener("DOMContentLoaded", () => {
  const resetButton = document.getElementById("reset-button");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      console.log("Clicked!");
      saveCurrentEncounter();
      resetDpsMeter();
    });
  }

  // Botón Advanced/Lite
  const advLiteBtn = document.getElementById("advanced-lite-btn");
  const liteDpsHealerBtn = document.getElementById("lite-dps-healer-btn");
  if (advLiteBtn) {
    advLiteBtn.addEventListener("click", () => {
      isLiteMode = !isLiteMode;
      advLiteBtn.classList.toggle("lite", isLiteMode);
      advLiteBtn.textContent = isLiteMode ? "Lite" : "Advanced";
      // Mostrar/ocultar el botón DPS/Healer
      if (liteDpsHealerBtn) {
        liteDpsHealerBtn.style.display = isLiteMode ? "inline-flex" : "none";
      }
      fetchDataAndRender();
    });
  }
  if (liteDpsHealerBtn) {
    liteDpsHealerBtn.addEventListener("click", () => {
      liteModeType = liteModeType === "dps" ? "healer" : "dps";
      liteDpsHealerBtn.textContent = liteModeType === "dps" ? "DPS" : "Healer";
      liteDpsHealerBtn.classList.toggle(
        "lite",
        isLiteMode
      ); /* Asegura que el botón Lite/Healer también tenga el estilo 'lite' */
      fetchDataAndRender();
    });
  }
  // Inicializar visibilidad y estilo del botón al cargar
  if (liteDpsHealerBtn) {
    liteDpsHealerBtn.style.display = isLiteMode ? "inline-flex" : "none";
    liteDpsHealerBtn.classList.toggle("lite", isLiteMode);
  }

  const zoomInButton = document.getElementById("zoom-in-button");
  const zoomOutButton = document.getElementById("zoom-out-button");

  if (zoomInButton) {
    zoomInButton.addEventListener("click", () => {
      currentZoom = Math.min(2.0, currentZoom + 0.1); // Limitar zoom máximo a 2.0
      applyZoom();
    });
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener("click", () => {
      currentZoom = Math.max(0.7, currentZoom - 0.1); // Limitar zoom mínimo a 0.5
      applyZoom();
    });
  }

  if (syncButton) {
    // syncButton.addEventListener('click', syncData); // El botón de sincronización ya no es clicable
  }

  const closeButton = document.getElementById("close-button");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      if (window.electronAPI) {
        window.electronAPI.closeWindow();
      }
    });
  }

  // Resize handle functionality
  const resizeHandle = document.getElementById("resize-handle");
  if (resizeHandle && window.electronAPI) {
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
      const newHeight = Math.max(
        200,
        Math.min(2000, startWindowHeight + deltaY)
      );
      console.log(size);
      resizeWindow(null, Math.round(newHeight));
      console.log(Math.round(newHeight));
    };

    const stopResize = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    resizeHandle.addEventListener("mousedown", startResize);
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
  }
});

function applyZoom() {
  if (playerBarsContainer) {
    playerBarsContainer.style.transform = `scale(${currentZoom})`;
    playerBarsContainer.style.transformOrigin = "top left";
    document.getElementById("encounters-section").style.width =
      `${currentZoom * 100}%`;
    document.getElementById("header").style.width = `${currentZoom * 100}%`;
    updateWindowSize();
  }
}

function updateWindowSize() {
  const dpsMeter = document.querySelector(".dps-meter");
  const container = document.getElementById("player-bars-container");
  if (!dpsMeter || !container || !window.electronAPI) return;

  const baseWidth = 650;

  const [_, h] = size;
  const finalWidth = Math.round(baseWidth * currentZoom);
  const finalHeight = Math.max(200, Math.round(h * currentZoom));

  resizeWindow(finalWidth, null);
}

function resizeWindow(width, height) {
  const [w, h] = size;
  size = [width ? width : w, height ? height : h];
  const [nw, nh] = size;
  window.electronAPI.resizeWindow(nw, nh);
}

function resetDpsMeter() {
  fetch("/api/clear");
  dpsTimerDiv.style.display = "none";
  dpsTimerDiv.innerText = "";
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
      syncIcon.style.display = "none";
      syncIcon.classList.remove("spinning");
      syncTimerSpan.innerText = `${syncCountdown}s`;
      syncTimerSpan.style.display = "block";
    } else {
      // Mostrar icono girando, ocultar temporizador
      syncIcon.style.display = "block";
      syncIcon.classList.add("spinning"); // Asegura que gire continuamente
      syncTimerSpan.style.display = "none";
    }
  } else {
    // Si el temporizador no está activo (no hay cuenta regresiva)
    // Mostrar icono girando, ocultar temporizador
    syncIcon.style.display = "block";
    syncIcon.classList.add("spinning"); // Asegura que gire continuamente
    syncTimerSpan.style.display = "none";
    syncTimerSpan.innerText = "";
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

function renderEncounters(encounters) {
  console.log(
    "Rendering encounters dropdown with",
    encounters.length,
    "encounters"
  );

  encountersSection.style.display = "block";
  let html =
    '<select id="encounters-dropdown" style="border: none; width:100%;padding:6px 4px;font-size:1rem;background:rgba(0,0,0,0.3);color:var(--text-primary);">';
  html += '<option value="">Live DPS</option>';

  encounters.forEach((enc) => {
    const selected = currentEncounterId === enc.id ? "selected" : "";
    const duration = formatDuration(enc.duration_ms);
    const date = formatDate(enc.date);
    const damage = formatStat(enc.total_damage);
    html += `<option value="${enc.id}" ${selected}>${date} - ${damage} (${duration}) - ${enc.player_count} players</option>`;
  });

  html += "</select>";
  encountersSection.innerHTML = html;
  console.log("Encounters dropdown HTML updated");

  const dropdown = document.getElementById("encounters-dropdown");
  dropdown.onchange = async function () {
    if (this.value === "") {
      currentEncounterId = null;
      isViewingHistory = false;
      fetchDataAndRender();
    } else {
      loadEncounter(this.value);
    }
  };
}

function loadEncounter(encounterId) {
  const log = logs.find((log) => log.id == encounterId);
  console.log(`loading... ${log}`);
  if (!log) return;
  currentEncounterId = encounterId;
  isViewingHistory = true;
  renderHistoricalData(log.data);
}

function saveCurrentEncounter() {
  if (!currentLog) return;

  const userArray = Object.values(currentLog).filter(
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
  currentLog = null;
  console.log(`Saved encounters... ${logs.length}`);
}

function renderHistoricalData(userData) {
  loadingIndicator.style.display = "none";
  playerBarsContainer.style.display = "flex";

  let userArray = Object.values(userData);
  userArray = userArray.filter(
    (u) => u.total_damage && u.total_damage.total > 0
  );

  const sumaTotalDamage = userArray.reduce(
    (acc, u) =>
      acc +
      (u.total_damage && u.total_damage.total
        ? Number(u.total_damage.total)
        : 0),
    0
  );

  userArray.forEach((u) => {
    const userDamage =
      u.total_damage && u.total_damage.total ? Number(u.total_damage.total) : 0;
    u.damagePercent =
      sumaTotalDamage > 0
        ? Math.max(0, Math.min(100, (userDamage / sumaTotalDamage) * 100))
        : 0;
  });

  if (isLiteMode && liteModeType === "healer") {
    const totalHealingContribution = userArray.reduce(
      (acc, u) =>
        acc +
        (u.total_healing && u.total_healing.total
          ? Number(u.total_healing.total)
          : 0),
      0
    );
    userArray.forEach((u) => {
      const userHealing =
        u.total_healing && u.total_healing.total
          ? Number(u.total_healing.total)
          : 0;
      u.healingPercent =
        totalHealingContribution > 0
          ? Math.max(
              0,
              Math.min(100, (userHealing / totalHealingContribution) * 100)
            )
          : 0;
    });
    userArray.sort((a, b) => b.healingPercent - a.healingPercent);
  } else {
    userArray.sort(
      (a, b) =>
        (b.total_damage && b.total_damage.total
          ? Number(b.total_damage.total)
          : 0) -
        (a.total_damage && a.total_damage.total
          ? Number(a.total_damage.total)
          : 0)
    );
  }

  userArray = userArray.slice(0, 20);

  // Render using same logic as live data
  const container = document.getElementById("player-bars-container");
  if (isLiteMode) {
    renderLiteBars(container, userArray);
  } else {
    renderAdvancedBars(container, userArray);
  }

  updateWindowSize();
}

function updateEncountersUI() {
  console.log("Updating encounters UI...");
  renderEncounters(logs);
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

function renderLiteBars(container, userArray) {
  container.innerHTML = userArray
    .map((u, index) => {
      const dps = Number(u.total_dps) || 0;
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

      if (liteModeType === "dps") {
        barFillWidth = u.damagePercent;
        barFillBackground =
          u.total_dps > 0
            ? `linear-gradient(0, ${bgColor}, transparent)`
            : "none";
        iconHtml = "<span style='font-size:1.1em;margin-right:2px;'>🔥</span>";
        value1 = `${formatStat(u.total_damage.total || 0)}`;
        value2 = `${Math.round(u.damagePercent)}%`;
        value3 = `${formatStat(dps)}/s`;
      } else {
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
        value3 = `${formatStat(dps)}/s`;
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
                    <span>${value1}</span>
                    <span>${value3}</span>
                    <span>${value2}</span>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
}

function renderAdvancedBars(container, userArray) {
  container.innerHTML = userArray
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
      const totalHealing = u.total_healing
        ? Number(u.total_healing.total) || 0
        : 0;
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
                                <span class="additional-stat-icon" style="color: #28a745;">⛨</span>
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

async function fetchDataAndRender() {
  const container = document.getElementById("player-bars-container");
  try {
    const dataRes = await fetch("/api/data");
    const userData = await dataRes.json();

    let userArray = Object.values(userData.user);
    userArray = userArray.filter(
      (u) => u.total_damage && u.total_damage.total > 0
    );

    if ((!userArray || userArray.length === 0) && !isViewingHistory) {
      loadingIndicator.style.display = "flex";
      playerBarsContainer.style.display = "none";
      saveCurrentEncounter();
      updateSyncButtonState();
    }
    if (!startTime) startTime = Date.now();
    currentLog = userArray;

    if (isViewingHistory) {
      return;
    }

    loadingIndicator.style.display = "none";
    playerBarsContainer.style.display = "flex";

    const sumaTotalDamage = userArray.reduce(
      (acc, u) =>
        acc +
        (u.total_damage && u.total_damage.total
          ? Number(u.total_damage.total)
          : 0),
      0
    );

    if (sumaTotalDamage > 0) {
      if (sumaTotalDamage !== lastTotalDamage) {
        lastTotalDamage = sumaTotalDamage;
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

    // Cálculo de damagePercent para todos los usuarios (base para Advanced y Lite DPS)
    userArray.forEach((u) => {
      const userDamage =
        u.total_damage && u.total_damage.total
          ? Number(u.total_damage.total)
          : 0;
      u.damagePercent =
        sumaTotalDamage > 0
          ? Math.max(0, Math.min(100, (userDamage / sumaTotalDamage) * 100))
          : 0;
    });

    if (isLiteMode && liteModeType === "healer") {
      const totalHealingContribution = userArray.reduce(
        (acc, u) =>
          acc +
          (u.total_healing && u.total_healing.total
            ? Number(u.total_healing.total)
            : 0),
        0
      );
      userArray.forEach((u) => {
        const userHealing =
          u.total_healing && u.total_healing.total
            ? Number(u.total_healing.total)
            : 0;
        u.healingPercent =
          totalHealingContribution > 0
            ? Math.max(
                0,
                Math.min(100, (userHealing / totalHealingContribution) * 100)
              )
            : 0;
      });
      userArray.sort((a, b) => b.healingPercent - a.healingPercent);
    } else {
      // Modo DPS (Lite o Advanced)
      userArray.sort(
        (a, b) =>
          (b.total_damage && b.total_damage.total
            ? Number(b.total_damage.total)
            : 0) -
          (a.total_damage && a.total_damage.total
            ? Number(a.total_damage.total)
            : 0)
      );
    }

    userArray = userArray.slice(0, 20);

    if (isLiteMode) {
      renderLiteBars(container, userArray);
    } else {
      renderAdvancedBars(container, userArray);
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `<div id="message-display">An error occured: ${err}</div>`;
    }
  } finally {
    updateSyncButtonState();
  }
}

// Actualizar UI cada 50ms
setInterval(fetchDataAndRender, 50);
setInterval(updateEncountersUI, 10000);
fetchDataAndRender();
updateEncountersUI();
