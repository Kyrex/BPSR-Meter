const professionMap = {
  // Main roles
  雷影剑士: {
    name: "Stormblade",
    icon: "icons/class_stormblade.webp",
    role: "dps",
  },
  冰魔导师: {
    name: "Frost Mage",
    icon: "icons/class_frost_mage.webp",
    role: "dps",
  },
  青岚骑士: {
    name: "Wind Knight",
    icon: "icons/class_wind_knight.webp",
    role: "dps",
  },
  森语者: {
    name: "Verdant Oracle",
    icon: "icons/class_verdant_oracle.webp",
    role: "healer",
  },
  巨刃守护者: {
    name: "Heavy Guardian",
    icon: "icons/class_heavy_guardian.webp",
    role: "tank",
  },
  神射手: { name: "Marksman", icon: "icons/class_marksman.webp", role: "dps" },
  神盾骑士: {
    name: "Shield Knight",
    icon: "icons/class_shield_knight.webp",
    role: "tank",
  },
  灵魂乐手: {
    name: "Soul Musician",
    icon: "icons/class_soul_musician.webp",
    role: "healer",
  },
  "涤罪恶火·战斧": {
    name: "Fire Axe",
    icon: "icons/missing_icon.png",
    role: "dps",
  },

  "雷霆一闪·手炮": {
    name: "Gunner",
    icon: "icons/missing_icon.png",
    role: "dps",
  },
  "暗灵祈舞·仪刀/仪仗": {
    name: "Spirit Dancer",
    icon: "icons/missing_icon.png",
    role: "dps",
  },

  // Spec roles
  居合: {
    name: "laido Slash",
    icon: "icons/class_stormblade.webp",
    role: "dps",
  },
  月刃: {
    name: "MoonStrike",
    icon: "icons/class_stormblade.webp",
    role: "dps",
  },
  冰矛: { name: "Icicle", icon: "icons/class_frost_mage.webp", role: "dps" },
  射线: { name: "Frostbeam", icon: "icons/class_frost_mage.webp", role: "dps" },
  防盾: {
    name: "Vanguard",
    icon: "icons/class_shield_knight.webp",
    role: "tank",
  },
  岩盾: { name: "Skyward", icon: "icons/missing_icon.png", role: "tank" },
  惩戒: {
    name: "Smite",
    icon: "icons/class_verdant_oracle.webp",
    role: "healer",
  },
  愈合: {
    name: "Lifebind",
    icon: "icons/class_verdant_oracle.webp",
    role: "healer",
  },
  格挡: { name: "Block", icon: "icons/class_shield_knight.webp", role: "tank" },
  狼弓: { name: "Wildpack", icon: "icons/class_marksman.webp", role: "dps" },
  鹰弓: { name: "Falconry", icon: "icons/class_marksman.webp", role: "dps" },
  光盾: {
    name: "Shield",
    icon: "icons/class_shield_knight.webp",
    role: "tank",
  },
  协奏: {
    name: "Concerto",
    icon: "icons/class_soul_musician.webp",
    role: "healer",
  },
  狂音: {
    name: "Dissonance",
    icon: "icons/class_soul_musician.webp",
    role: "healer",
  },
  空枪: {
    name: "Empty Gun",
    icon: "icons/class_wind_knight.webp",
    role: "dps",
  },
  重装: {
    name: "Heavy Armor",
    icon: "icons/class_wind_knight.webp",
    role: "dps",
  },
};

const defaultProfession = {
  name: "Unknown",
  icon: "icons/missing_icon.png",
  role: "dps",
};

const roleColors = {
  dps: "rgba(145, 48, 48, 0.7)",
  tank: "rgba(56, 120, 193, 0.7)",
  healer: "rgba(35, 158, 101, 0.7)",
  self: "rgba(255, 159, 64, 0.7)",
};
const formatDuration = (ms) => {
  if (!ms) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
};

const formatDurationMax = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${minutes}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (minutes > 0) return `${minutes}m`;
  const seconds = totalSeconds % 60;
  return `${seconds}s`;
};

const formatValue = (value) => {
  if (!value) return 0;
  const vt = 1000000000000;
  const vg = 1000000000;
  const vm = 1000000;
  const vk = 1000;
  if (value >= vt) return (value / vt).toFixed(1) + "T";
  if (value >= vg) return (value / vg).toFixed(1) + "G";
  if (value >= vm) return (value / vm).toFixed(1) + "M";
  if (value >= vk) return (value / vk).toFixed(1) + "k";
  return value.toFixed(0);
};

function getUserColor(user, userUid) {
  if (user.id === userUid) {
    return roleColors.self;
  }

  const [main, spec] = getUserProfessions(user);
  const role = spec?.role || main.role;
  return roleColors[role] || "#222";
}

function getUserProfessions(user) {
  const parts = user.profession.split("-");
  const mainProf = professionMap[parts[0]] || defaultProfession;
  const specProf = professionMap[parts[1]];
  return [mainProf, specProf];
}

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

function getDebugUserData(users) {
  const userData = { user: {} };

  const roles = Object.keys(professionMap).slice(0, 10);
  const subRoles = Object.keys(professionMap).slice(10);
  for (var i = 0; i < users; ++i) {
    const max_hp = Math.random() * 10000;
    const hp = Math.random() * max_hp;
    const role =
      roles[Math.floor((Math.random() * roles.length) % roles.length)];
    const subRole =
      subRoles[Math.floor((Math.random() * subRoles.length) % subRoles.length)];
    const user = {
      name: `User #${i}`, //
      realtime_dps: 0,
      realtime_dps_max: Math.random() * 3000,
      total_dps: Math.random() * 1000,
      total_damage: {
        normal: 9411,
        critical: 246,
        lucky: 732,
        crit_lucky: 0,
        hpLessen: 8956,
        total: Math.random() * 1000,
      },
      total_count: {
        normal: 76,
        critical: 5,
        lucky: 1,
        total: 82,
      },
      realtime_hps: 4017,
      realtime_hps_max: 11810,
      total_hps: 4497.79970662755,
      total_healing: {
        normal: 115924,
        critical: 18992,
        lucky: 0,
        crit_lucky: 0,
        hpLessen: 0,
        total: 134916,
      },
      hp: hp,
      max_hp: max_hp,
      taken_damage: 65,
      profession: `${role}-${subRole}`, // "愈合"
    };
    userData.user[`user_${i}`] = user;
  }
  return userData;
}
