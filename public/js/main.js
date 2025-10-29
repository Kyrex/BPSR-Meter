const elSpinner = document.getElementById("dps-spinner");
const elCloseBtn = document.getElementById("close-button");
const elResetBtn = document.getElementById("reset-button");
const elSwapBtn = document.getElementById("swap-button");
const elDragBtn = document.getElementById("drag-button");
const elDpsTable = document.getElementById("dps-table");
const elDpsTableUser = document.getElementById("dps-table-user");
const elDpsTimer = document.getElementById("dps-timer");
const elDpsLogs = document.getElementById("dps-logs");

const WIN_MIN_SIZE = [380, 200];
let logsList = new Array();
let userUid;
let startTime;
let playerLimit = 5;
let currentLogIdx = -1;
let latestUsersList;
let winState = {
  size: WIN_MIN_SIZE,
  position: [0, 0],
};

function resizeWindow(width, height) {
  const [w, h] = winState.size;
  winState.size = [width ? width : w, height ? height : h];
  const [nw, nh] = winState.size;
  window.electronAPI?.resizeWindow(nw, nh);
  saveWindowState();
}

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
  const icon = spec?.icon || main.icon;

  return `
    <tr style="--p: ${barPercent}%; --c: linear-gradient(0, ${color}, transparent)">
        <td style="width: 40px">${rank}</td>
        <td style="width: 32px; height:32px">
            <img
            src="${icon}"
            style="width: 28px; height: 28px"
            />
        </td>
        <td style="width: 100%">${name}</td>
        <td style="width: 60px">
            ${dmg}<span class="st-sublabel"></span>
        </td>
        <td style="width: 60px">
            ${dps}<span class="st-sublabel">/s</span>
        </td>
        <td style="width: 50px">
            ${percent}<span class="st-sublabel">%</span>
        </td>
    </tr>
    `;
}

let emptyTimer = Date.now();
async function fetchUsers() {
  // if (emptyTimer && Date.now() - emptyTimer < 5000) return [];
  // const data = getDebugUserData(150);
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
      };
    });

  if (userUid) {
    const idx = list.findIndex((u) => u.id === userUid);
    const nList = list.slice(0, 20);
    if (idx !== -1 && 20 <= idx) nList.push(list[idx]);
    return nList;
  }

  return list.slice(0, 20);
}

const clear = () => {
  fetch("/api/clear");
  emptyTimer = Date.now();
};

const saveLog = () => {
  if (!latestUsersList || latestUsersList.length < 1) return;
  logsList.unshift({
    start: startTime,
    end: Date.now(),
    data: latestUsersList,
    total_damage: latestUsersList.reduce((a, u) => a + u.total_dmg, 0),
  });
  logsList = logsList.slice(0, 5);
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
    playerLimit = playerLimit === 5 ? 20 : 5;
    elSwapBtn.innerHTML = `${playerLimit}P`;
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
      resizeWindow(
        Math.floor(Math.max(WIN_MIN_SIZE[0], newX)),
        Math.floor(Math.max(WIN_MIN_SIZE[1], newY))
      );
    };

    const stopResize = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = "";
      }
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
