const elSpinner = document.getElementById("dps-spinner");
const elCloseBtn = document.getElementById("close-button");
const elResetBtn = document.getElementById("reset-button");
const elSwapBtn = document.getElementById("swap-button");
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
const ADVC_BAR_HEIGHT = 48;
const WIN_STATE_KEY = "win_state";
const WIN_MIN_SIZE = [380, HEADER_HEIGHT + MAX_PLAYERS_0 * LITE_BAR_HEIGHT];

let logsList = new Array();
let userUid;
let startTime;
let playerLimit = MAX_PLAYERS_0;
let currentLogIdx = -1;
let latestUsersList;
let winState = {
  size: WIN_MIN_SIZE,
  position: [0, 0],
  isLiteMode: true,
};

function resizeWindow(width, height) {
  const [w, h] = winState.size;
  winState.size = [
    Math.max(WIN_MIN_SIZE[0], width ? width : w),
    Math.max(WIN_MIN_SIZE[1], height ? height : h),
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
  const [sx, sy] = winState.size;
  const [dx, dy] = winState.position;
  window.electronAPI?.setPosition(dx, dy);
  window.electronAPI?.resizeWindow(sx, sy);
}

function generateBar(user) {
  const dps = formatValue(user.total_dps);
  const dmg = formatValue(user.total_dmg);
  const name = user.name || "";
  const rank = formatValue(user.rank) || "-";
  const color = getUserColor(user, userUid);
  const percent = user.total_dmg_perc || 0;
  const barPercent = user.bar_percent;

  const [main, spec] = getUserProfessions(user);
  const iconSpec = spec?.icon || main.icon;
  const iconClass = main.icon;

  if (winState.isLiteMode && true) {
    return `
    <tr style="--p: ${barPercent}%; --c: linear-gradient(0, ${color}, transparent)">
      <td style="width: 32px">
        <div class="dps-rank">
          <img src="${iconSpec}"/>
          <span>${rank}</span>
        </div>
      </td>
      <td style="width: 28px">
        <img src="${iconClass}" style="width: 20px; height: 20px; vertical-align: middle; translate: -4px 0"/>
      </td>
      <td style="width: 100%" class="td-left">${name}</td>
      <td style="width: 60px">${dmg}<span class="st-sublabel"></span></td>
      <td style="width: 60px">${dps}<span class="st-sublabel">/s</span></td>
      <td style="width: 50px">${percent}<span class="st-sublabel">%</span></td>
    </tr>
    `;
  }

  const points = formatValue(user.fight_points);
  return `
  <tr style="height: 48px; --p: ${barPercent}%; --c: linear-gradient(0, ${color}, transparent)">
    <td style="width: 40px">${rank}</td>
    <td style="width: 32px; height:32px">
      <img src="${iconSpec}" style="width: 28px; height: 28px"/>
    </td>
    <td style="width: 100%" class="td-left">${name}</td>
    <td style="width: 60px">${dmg}<span class="st-sublabel"></span></td>
    <td style="width: 100px" class="td-right">
      <div>${dps}<span class="st-sublabel">/s DPS</span></div>
      <div>${0}<span class="st-sublabel">/s HPS</span></div>
    </td>
    <td style="width: 50px">${percent}<span class="st-sublabel">%</span></td>
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
      const totalDps = Number(user.total_dps || 0);
      const totalDmg = Number(user.total_damage?.total || 0);
      const totalPerc = percent(totalDmg, totalDamage);
      const barPerc = percent(totalDmg, maxDamage);
      return {
        id: id.toString(),
        rank: rank + 1,
        name: user.name ? user.name : `#${id}`,
        role: user.role,
        profession: user.profession,

        total_dps: totalDps,
        total_dmg: totalDmg,
        total_dmg_perc: totalPerc,

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

const clear = () => {
  fetch("/api/clear");
};

const saveLog = () => {
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
};

const renderLogOptions = () => {
  elDpsLogs.innerHTML = '<option value="">Live Dps</option>';
  logsList.forEach((l, i) => {
    const selected = i === currentLogIdx;
    const ago = formatDurationMax(Date.now() - l.end);
    const damage = formatValue(l.total_damage);
    const duration = formatDurationMax(l.end - l.start);
    elDpsLogs.innerHTML += `<option value="${i}" ${selected ? "selected" : ""}>#${i + 1} - ${damage} in ${duration} - ${ago} ago</option>`;
  });
};

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

const loadLogAndRender = () => {
  if (currentLogIdx === -1) return;
  const data = logsList[currentLogIdx];
  renderTable(data.data, playerLimit);
};

const renderTable = (users, limit) => {
  if (!users || users.length === 0) {
    elSpinner.style.display = null;
    elDpsTable.style.display = "none";
  } else {
    elSpinner.style.display = "none";
    elDpsTable.style.display = "";
  }

  const renderable = users.slice(0, limit);
  elDpsTable.innerHTML = renderable.map((u) => generateBar(u)).join("");

  if (userUid) {
    const above = renderable.find((u) => u.id === userUid);
    if (!above) {
      const user = users.find((u) => u.id === userUid);
      elDpsTableUser.innerHTML = user ? generateBar(user) : "";
    } else {
      elDpsTableUser.innerHTML = "";
    }
  }
};

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

  elCloseBtn.addEventListener("click", () => electron?.closeWindow());
  elResetBtn.addEventListener("click", () => clear());
  elSwapBtn.addEventListener("click", () => {
    playerLimit = playerLimit === MAX_PLAYERS_0 ? MAX_PLAYERS_1 : MAX_PLAYERS_0;
    elSwapBtn.innerHTML = `${playerLimit}P`;
    const barHeight = winState.isLiteMode ? LITE_BAR_HEIGHT : ADVC_BAR_HEIGHT;
    const extraHeight = userUid ? 4 + barHeight : 0;
    resizeWindow(null, HEADER_HEIGHT + playerLimit * barHeight + extraHeight);
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
