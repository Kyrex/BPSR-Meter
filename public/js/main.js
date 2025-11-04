const elSpinner = document.getElementById("dps-spinner");
const elCloseBtn = document.getElementById("close-button");
const elResetBtn = document.getElementById("reset-button");
const elSwapBtn = document.getElementById("swap-button");
const elStatsBtn = document.getElementById("stats-button");
const elDragBtn = document.getElementById("drag-button");
const elDpsTable = document.getElementById("dps-table");
const elDpsTableUser = document.getElementById("dps-table-user");
const elDpsTimer = document.getElementById("dps-timer");
const elDpsLogs = document.getElementById("dps-logs");

const MAX_LOGS = 5;
const MAX_PLAYERS_0 = 5;
const MAX_PLAYERS_1 = 20;
const HEADER_HEIGHT = 28;
const LITE_BAR_HEIGHT = 35;
const ADVC_BAR_HEIGHT = 60;
const WIN_STATE_KEY = "win_state";
const WIN_MIN_HEIGHT = HEADER_HEIGHT * 2 + MAX_PLAYERS_0 * LITE_BAR_HEIGHT;
const WIN_MIN_SIZE_LITE = [420, WIN_MIN_HEIGHT];
const WIN_MIN_SIZE_ADVC = [520, WIN_MIN_HEIGHT];

let logsList = new Array();
let userUid;
let startTime;
let playerLimit = MAX_PLAYERS_0;
let currentLogIdx = -1;
let latestUsersList;
let winState = {
  size: WIN_MIN_SIZE_LITE,
  position: [0, 0],
  isLiteMode: true,
};

function updateModeButton() {
  if (!elStatsBtn) return;
  elStatsBtn.className = `fa-solid fa-eye${winState.isLiteMode ? "-slash" : ""}`;
}

function resizeWindow(width, height) {
  const [w, h] = winState.size;
  const minSize = winState.isLiteMode ? WIN_MIN_SIZE_LITE : WIN_MIN_SIZE_ADVC;
  winState.size = [
    Math.max(minSize[0], width ? width : w),
    Math.max(minSize[1], height ? height : h),
  ];
  const [nw, nh] = winState.size;
  window.electronAPI?.resizeWindow(nw, nh);
  saveWindowState();
}

function saveWindowState() {
  localStorage.setItem(WIN_STATE_KEY, JSON.stringify(winState));
}

function loadWindowState() {
  const state = localStorage.getItem(WIN_STATE_KEY);
  if (state) {
    winState = {
      ...winState,
      ...JSON.parse(state),
    };
  }
  updateModeButton();
  const [sx, sy] = winState.size;
  const [dx, dy] = winState.position;
  window.electronAPI?.setPosition(dx, dy);
  window.electronAPI?.resizeWindow(sx, sy);
}

function generateBar(user) {
  const dps = formatValue(user.total_dps);
  const totalDamage = formatValue(user.total_dmg);
  const damagePercent = user.total_dmg_perc || 0;
  const critPercent = user.crit_perc;
  const barPercent = user.bar_percent;

  const name = user.name ? user.name : `#${user.id || 0}`;
  const rank = formatValue(user.rank) || "-";
  const color = getUserColor(user, userUid);

  const [main, spec] = getUserProfessions(user);
  const iconSpec = spec?.icon || main.icon;
  const iconClass = main.icon;
  const gearScore = formatValue(user.fight_points);

  if (winState.isLiteMode) {
    return `
    <tr style="--p: ${barPercent}%; --c: linear-gradient(0, ${color}, transparent); height: ${LITE_BAR_HEIGHT}">
      <td style="width: 32px">
        <div class="dps-rank">
          <img src="${iconSpec}"/>
          <span>${rank}</span>
        </div>
      </td>
      <td style="width: 28px; position: relative">
        <img src="${iconClass}" style="width: 28px; height: 28px; translate: 0 4px; opacity: 0.25"/>
        <span style="text-align: center; font-size: 8pt; color: #eeee; position: absolute; left: 0; bottom: 2px; width: 100%; text-shadow: 1px 1px 0px #111">${gearScore}</span>
      </td>
      <td style="width: 100%; padding-left: 8px;" class="td-left">${name}</td>
      <td style="width: 60px">${dps}<span class="st-sublabel">/s</span></td>
      <td style="width: 60px">${critPercent}<span class="st-sublabel">%</span></td>
      <td style="width: 60px">${totalDamage}</td>
      <td style="width: 50px">${damagePercent}<span class="st-sublabel">%</span></td>
    </tr>
    `;
  }

  const hps = formatValue(user.total_hps);
  const totalHealing = formatValue(user.total_heal);
  const damageTaken = formatValue(user.total_dtk);
  const totalDeaths = formatValue(user.deaths);
  const crt = formatValue(user.crit_perc);
  const lck = formatValue(user.luck_perc);
  const max = formatValue(user.peak_dps);

  const hp = formatValue(user.hp, 0);
  const maxHp = formatValue(user.max_hp, 0);
  const hpPerc = user.hp_perc;

  return `
  <tr style="--p: ${barPercent}%; --c: linear-gradient(0, ${color}, transparent); height: ${ADVC_BAR_HEIGHT}px">
    <td style="width: 32px">
      <div class="dps-rank">
        <img src="${iconSpec}" style="width: 32px; height: 32px;"/>
        <span>${rank}</span>
      </div>
    </td>
    <td style="width: 28px;">
      <img src="${iconClass}" style="width: 28px; height: 28px; vertical-align: middle; translate: 0 4px"/>
      <span style="text-align: center; font-size: 8pt; color: #eeee">${gearScore}</span>
    </td>
    <td style="width: 100%; padding-left: 8px;" class="td-left">      
      <span>${name}</span>
      <div style="height: 16px; width: 120px;border-radius: 14px;background-color: #1116; margin-top:4px">
        <div style="background-color: ${getHealthColor(hpPerc)}; height: 100%; width: ${hpPerc}%; border-radius: 14px">
          <span style="padding: 0 4px; position: absolute; font-size: 9pt; translate: 0 -1px; text-shadow: 0 0 2px #111">🤍 ${hp} / ${maxHp}</span>
        </div>
      </div>
    </td>
    <td style="width: 80px">
      <div style="display: flex; flex-direction: column; text-align: end">
        <span>${dps}<span class="st-sublabel" style="display: inline-block; width: 24px">DPS</span></span>
        <span>${hps}<span class="st-sublabel" style="display: inline-block; width: 24px">HPS</span></span>
        <span>${damageTaken}<span class="st-sublabel" style="display: inline-block; width: 24px">DTK</span></span>
      </div>
    </td>
    <td style="width: 100px">
      <div style="display: flex; flex-direction: column; text-align: end">
        <span>${crt}<span class="st-sublabel" style="display: inline-block; width: 32px">% CRT</span></span>
        <span>${lck}<span class="st-sublabel" style="display: inline-block; width: 32px">% LCK</span></span>
        <span>${max}<span class="st-sublabel" style="display: inline-block; width: 32px">  MAX</span></span>
      </div>
    </td>
    <td style="width: 80px">
      <div style="display: flex; flex-direction: column; text-align: end">
        <span>${totalDamage}<span class="st-sublabel" style="display: inline-block; width: 18px">🔥</span></span>
        <span>${totalHealing}<span class="st-sublabel" style="display: inline-block; width: 18px">💉</span></span>
        <span>${totalDeaths}<span class="st-sublabel" style="display: inline-block; width: 18px">💀</span></span>
      </div>
    </td>
    <td style="width: 50px">${damagePercent}<span class="st-sublabel">%</span></td>
  </tr>
  `;
}

async function fetchUsers() {
  const data = await fetch("/api/data").then((res) => res.json());

  const percent = (v, max) =>
    v > 0 ? Math.floor(clamp((v / max) * 100, 0, 100)) : 0;
  const totalDmg = (u) => Number(u.total_damage?.total || 0);
  const entries = Object.entries(data.user).filter(([_, u]) => totalDmg(u) > 0);

  let maxDamage = 0;
  let totalDamage = 0;
  entries.forEach(([_, u]) => {
    const dmg = totalDmg(u);
    maxDamage = Math.max(maxDamage, dmg);
    totalDamage += dmg;
  });

  const list = entries
    .sort(([ia, a], [ib, b]) => totalDmg(b) - totalDmg(a))
    .map(([id, user], rank) => {
      const totalHps = Number(user.total_hps || 0);
      const totalDps = Number(user.total_dps || 0);
      const totalDtk = Number(user.taken_damage || 0);

      const totalDmg = Number(user.total_damage?.total ?? 0);
      const totalHeal = Number(user.total_healing?.total ?? 0);
      const totalDmgPerc = percent(totalDmg, totalDamage);
      const barPerc = percent(totalDmg, maxDamage);

      const totalHits = Number(user.total_count?.total ?? 0);
      const totalCrit = Number(user.total_count?.critical ?? 0);
      const totalLuck = Number(user.total_count?.lucky ?? 0);
      const critPerc = percent(totalCrit, totalHits);
      const luckPerc = percent(totalLuck, totalHits);
      const peakDps = Number(user.realtime_dps_max || 0);

      const hp = Number(user.hp || 0);
      const maxHp = Number(user.max_hp || 0);
      const hpPerc = percent(hp, maxHp);

      return {
        id: id.toString(),
        rank: rank + 1,
        name: user.name,
        role: user.role,
        profession: user.profession,

        hp: hp,
        max_hp: maxHp,
        hp_perc: hpPerc,

        total_dps: totalDps,
        total_dmg: totalDmg,
        total_dmg_perc: totalDmgPerc,
        crit_perc: critPerc,
        luck_perc: luckPerc,
        peak_dps: peakDps,

        total_hps: totalHps,
        total_heal: totalHeal,
        total_dtk: totalDtk,
        deaths: user.dead_count,
        bar_percent: barPerc,
        fight_points: user.fightPoint,
      };
    });

  if (userUid) {
    const idx = list.findIndex((u) => u.id === userUid);
    const nList = list.slice(0, MAX_PLAYERS_1);
    if (idx !== -1 && MAX_PLAYERS_1 <= idx) nList.push(list[idx]);
    return nList;
  }

  return list.slice(0, MAX_PLAYERS_1);
}

function clear() {
  fetch("/api/clear");
}

function saveLog() {
  if (!latestUsersList || latestUsersList.length < 1) return;
  logsList.unshift({
    start: startTime,
    end: Date.now(),
    data: latestUsersList,
    total_damage: latestUsersList.reduce((a, u) => a + u.total_dmg, 0),
  });
  logsList = logsList.slice(0, MAX_LOGS);
  latestUsersList = null;
  currentLogIdx = -1;
  startTime = null;
  renderLogOptions();
}

function renderLogOptions() {
  elDpsLogs.innerHTML = '<option value="">Live Dps</option>';
  logsList.forEach((l, i) => {
    const selected = i === currentLogIdx;
    const ago = formatDurationMax(Date.now() - l.end);
    const damage = formatValue(l.total_damage);
    const duration = formatDurationMax(l.end - l.start);
    elDpsLogs.innerHTML += `<option value="${i}" ${selected ? "selected" : ""}>#${i + 1} - ${damage} in ${duration} - ${ago} ago</option>`;
  });
}

async function fetchAndRender() {
  const users = await fetchUsers();

  if (users && users.length > 0) {
    latestUsersList = users;
    if (!startTime) {
      startTime = Date.now();
    }
  } else {
    saveLog();
  }

  if (currentLogIdx !== -1) return;
  renderTable(users, playerLimit);
}

function loadLogAndRender() {
  if (currentLogIdx === -1) return;
  const data = logsList[currentLogIdx];
  renderTable(data.data, playerLimit);
}

function renderTable(users, limit) {
  if (!users || users.length === 0) {
    elSpinner.style.display = null;
    elDpsTable.style.display = "none";
  } else {
    elSpinner.style.display = "none";
    elDpsTable.style.display = "";
  }

  let partyDps = 0;
  let partyDamage = 0;
  users.forEach((u) => {
    partyDps += u.total_dps;
    partyDamage += u.total_dmg;
  });

  const getHeader = () => {
    if (winState.isLiteMode) {
      return `
      <tr style="height: ${HEADER_HEIGHT}px">
        <td style="width: 32px" class="st-sublabel">#</td>
        <td style="width: 28px"></td>
        <td style="width: 100%" class="td-left"><span class="st-sublabel"><i class="fa-solid fa-clock"></i></span> ${formatDuration(Date.now() - startTime)}</td>
        <td style="width: 60px">${formatValue(partyDps)}<span class="st-sublabel">/s</span></td>
        <td style="width: 60px" class="st-sublabel">${winState.isLiteMode ? "CRIT" : ""}</td>
        <td style="width: 60px">${formatValue(partyDamage)}</td>
        <td style="width: 50px"></td>
      </tr>`;
    } else {
      return `
      <tr style="height: ${HEADER_HEIGHT}px">
        <td style="width: 32px" class="st-sublabel">#</td>
        <td style="width: 28px"></td>
        <td style="width: 100%" class="td-left"><span class="st-sublabel"><i class="fa-solid fa-clock"></i></span> ${formatDuration(Date.now() - startTime)}</td>
        <td style="width: 80px; text-align: end"><span>${formatValue(partyDps)}<span class="st-sublabel" style="display: inline-block; width: 24px; text-align: start">/s</span></span></td>
        <td style="width: 100px" class="st-sublabel">${winState.isLiteMode ? "CRIT" : ""}</td>
        <td style="width: 80px; text-align: end">
          <span>${formatValue(partyDamage)}<span class="st-sublabel" style="display: inline-block; width: 18px"></span></span>
        </td>
        <td style="width: 50px"></td>
      </tr>`;
    }
  };

  const renderable = users.slice(0, limit);
  elDpsTable.innerHTML =
    getHeader() + renderable.map((u) => generateBar(u)).join("");

  if (userUid) {
    const above = renderable.find((u) => u.id === userUid);
    if (!above) {
      const user = users.find((u) => u.id === userUid);
      elDpsTableUser.innerHTML = user ? generateBar(user) : "";
    } else {
      elDpsTableUser.innerHTML = "";
    }
  }
}

window.addEventListener("DOMContentLoaded", (_) => {
  loadWindowState();

  const electron = window.electronAPI;
  electron?.onArgs((args) => {
    const KEY = "--uid=";
    const arg = args.find((a) => a.startsWith(KEY));
    if (!arg) return;
    userUid = arg.substring(KEY.length).trim();
    console.log("User UID:", userUid);
  });
  electron?.onMove((pos) => {
    winState.position = pos;
    saveWindowState();
  });
  electron?.onLock((locked) => {
    document.body.classList.toggle("locked", locked);
  });

  const autoResize = () => {
    const barHeight = winState.isLiteMode ? LITE_BAR_HEIGHT : ADVC_BAR_HEIGHT;
    const extraHeight = userUid ? 4 + barHeight : 0;
    const h = HEADER_HEIGHT * 2 + playerLimit * barHeight + extraHeight;
    resizeWindow(null, h);
    fetchAndRender();
  };

  elCloseBtn.addEventListener("click", () => electron?.closeWindow());
  elResetBtn.addEventListener("click", () => clear());
  elStatsBtn.addEventListener("click", () => {
    winState.isLiteMode = !winState.isLiteMode;
    updateModeButton();
    autoResize();
  });
  elSwapBtn.addEventListener("click", () => {
    playerLimit = playerLimit === MAX_PLAYERS_0 ? MAX_PLAYERS_1 : MAX_PLAYERS_0;
    elSwapBtn.innerHTML = `${playerLimit}P`;
    autoResize();
  });
  if (elDragBtn) {
    let isResizing = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let startWinX = 0;
    let startWinY = 0;

    const startResize = (e) => {
      isResizing = true;
      mouseStartX = e.pageX;
      mouseStartY = e.pageY;
      startWinX = window.innerWidth;
      startWinY = window.innerHeight;
      document.body.style.cursor = "nwse-resize";
      e.preventDefault();
      e.stopPropagation();
    };

    const doResize = (e) => {
      if (!isResizing) return;
      const deltaX = e.pageX - mouseStartX;
      const deltaY = e.pageY - mouseStartY;
      const newX = startWinX + deltaX;
      const newY = startWinY + deltaY;
      resizeWindow(newX, newY);
    };

    const stopResize = () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.cursor = "";
    };

    elDragBtn.addEventListener("mousedown", startResize);
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
  }
  elDpsLogs.onchange = async function () {
    if (this.value === "") {
      currentLogIdx = -1;
      fetchAndRender();
    } else {
      currentLogIdx = Number(this.value);
      loadLogAndRender();
    }
  };

  setInterval(renderLogOptions, 1000);
  setInterval(fetchAndRender, 50);
  renderLogOptions();
  fetchAndRender();
});
