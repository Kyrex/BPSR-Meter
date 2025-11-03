class MobsTimer {
  constructor(onUpdate) {
    this.mobs = new Map();
    this.onEvent = onUpdate;
  }

  async init() {
    const url =
      "https://db.bptimer.com/api/collections/mobs/records?page=1&perPage=500&skipTotal=1&filter=type%20%3D%20%27boss%27&sort=uid&expand=map";
    const items = await fetch(url)
      .then((res) => res.json())
      .then((res) => res.items);
    items.forEach((item) => {
      this.mobs.set(item.id, {
        mobName: item.name,
        respawn: item.respawn_time,
        channels: new Map(),
      });
    });

    const filter = [...this.mobs.keys()]
      .map((m) => `mob = '${m}'`)
      .join(" || ");
    for (var page = 1; ; ++page) {
      const url = `https://db.bptimer.com/api/collections/mob_channel_status/records?page=${page}&perPage=500&skipTotal=true&filter=${filter}`;
      const items = await fetch(url)
        .then((res) => res.json())
        .then((res) => res.items);
      items.forEach((item) => {
        this.mobs.get(item.mob).channels.set(item.channel_number, item.last_hp);
      });
      if (items.length < 500) break;
    }

    this.eventSource = new EventSource("https://db.bptimer.com/api/realtime");
    this.eventSource.addEventListener("PB_CONNECT", (event) => {
      try {
        const data = JSON.parse(event.data);
        const clientId = data.clientId;
        fetch("https://db.bptimer.com/api/realtime", {
          method: "POST",
          headers: {
            Host: "db.bptimer.com",
            Accept: "*/*",
            "Accept-Language": "en-US",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Content-Type": "application/json",
            Origin: "https://bptimer.com",
            Connection: "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
          },
          body: JSON.stringify({
            clientId: clientId.toString(),
            subscriptions: [
              "mobs/*",
              "mob_reset_events/*",
              "mob_channel_status_sse/*",
            ],
          }),
        });
      } catch (err) {
        console.error(err);
      }
    });
    this.eventSource.addEventListener("mobs/*", (event) => {
      // console.log("mobs", event.data)
    });
    this.eventSource.addEventListener("mob_reset_events/*", (event) => {
      const data = JSON.parse(event.data).record;
      const mob = this.mobs.get(data.mob);
      if (!mob) return;
      mob.channels.forEach((v, k) => mob.channels.set(k, 100));
    });
    const onUpdate = this.onEvent;
    this.eventSource.addEventListener("mob_channel_status_sse/*", (event) => {
      const data = JSON.parse(event.data).record;
      const mob = this.mobs.get(data.mob);
      if (!mob) return;
      mob.channels.set(data.channel_number, data.last_hp);
      onUpdate();
    });
  }
}

const el = document.getElementById("dps-channels");
const elDetails = document.getElementById("dps-detailed");
const selector = document.getElementById("dps-boss");
let selectedId = "";
elDetails.style.display = "none";

const renderChannels = () => {
  const mob = timer.mobs.get(selectedId);
  console.log(mob, selectedId);
  if (!mob) return;
  el.innerHTML =
    `<div style="min-width: 120px; display: flex; flex-direction: column; gap: 4px">` +
    [...mob.channels.entries()]
      .filter(([_, v]) => v > 0)
      .sort(([_, v1], [__, v2]) => v1 - v2)
      .slice(0, 5)
      .map(([k, v]) => {
        return `
        <div style="position: relative; height: 24px; width: 100%; text-align: center; vertical-align: middle; background-color: #1112; border-radius: 10px">
          <div style="position: absolute; left: 0; top: 0; height:100%; width: ${v}%; background-color: ${getHealthColor(v)}; border-radius: 10px"></div>
          <div style="position: absolute; left: 0; top: 0; height:100%; width: 100%; padding-top: 2px">${k} - ${v}%</div>
        </div>`;
      })
      .join("") +
    `</div>`;
};

const renderBossOptions = () => {
  if (timer.mobs.size === 0) return;
  selector.innerHTML = [...timer.mobs.entries()]
    .map(([k, v]) => {
      const selected = k === selectedId ? "selected" : "";
      return `<option value="${k}" ${selected}>(:${v.respawn.toString().padEnd(2, "0")}) ${v.mobName}</option>`;
    })
    .join("");
};

const timer = new MobsTimer(renderChannels);
timer.init().then((k) => {
  const entries = [...timer.mobs.entries()];
  if (entries.length === 0) return;

  elDetails.style.display = "";
  selectedId = entries.at(0)[0];
  renderBossOptions();
  selector.onchange = function () {
    selectedId = this.value;
    renderBossOptions();
    renderChannels();
  };
});
