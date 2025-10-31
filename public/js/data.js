const professionMap = {
  雷影剑士: {
    name: "Stormblade",
    icon: "icons/class_stormblade.webp",
    role: "dps",
  },
  居合: {
    name: "laido Slash",
    icon: "icons/spec_slash.webp",
    role: "dps",
  },
  月刃: {
    name: "Moonstrike",
    icon: "icons/spec_moon.webp",
    role: "dps",
  },

  冰魔导师: {
    name: "Frost Mage",
    icon: "icons/class_frost_mage.webp",
    role: "dps",
  },
  冰矛: { name: "Icicle", icon: "icons/spec_icicle.webp", role: "dps" },
  射线: { name: "Frostbeam", icon: "icons/spec_frostbeam.webp", role: "dps" },

  青岚骑士: {
    name: "Wind Knight",
    icon: "icons/class_wind_knight.webp",
    role: "dps",
  },
  空枪: {
    name: "Skyward",
    icon: "icons/spec_skyward.webp",
    role: "dps",
  },
  重装: {
    name: "Vanguard",
    icon: "icons/spec_vanguard.webp",
    role: "dps",
  },

  巨刃守护者: {
    name: "Heavy Guardian",
    icon: "icons/class_heavy_guardian.webp",
    role: "tank",
  },
  防盾: {
    name: "Recovery",
    icon: "icons/spec_recovery.webp",
    role: "tank",
  },
  岩盾: {
    name: "Earthfort",
    icon: "icons/spec_earth.webp",
    role: "tank",
  },

  森语者: {
    name: "Verdant Oracle",
    icon: "icons/class_verdant_oracle.webp",
    role: "healer",
  },
  惩戒: {
    name: "Smite",
    icon: "icons/spec_smite.webp",
    role: "healer",
  },
  愈合: {
    name: "Lifebind",
    icon: "icons/spec_lifebind.webp",
    role: "healer",
  },

  神射手: { name: "Marksman", icon: "icons/class_marksman.webp", role: "dps" },
  狼弓: { name: "Wildpack", icon: "icons/spec_wildpack.webp", role: "dps" },
  鹰弓: { name: "Falconry", icon: "icons/spec_falcon.webp", role: "dps" },

  神盾骑士: {
    name: "Shield Knight",
    icon: "icons/class_shield_knight.webp",
    role: "tank",
  },
  格挡: { name: "Block", icon: "icons/spec_recovery.webp", role: "tank" },
  光盾: {
    name: "Shield",
    icon: "icons/spec_shield.webp",
    role: "tank",
  },

  灵魂乐手: {
    name: "Soul Musician",
    icon: "icons/class_soul_musician.webp",
    role: "healer",
  },
  协奏: {
    name: "Concerto",
    icon: "icons/spec_concerto.webp",
    role: "healer",
  },
  狂音: {
    name: "Dissonance",
    icon: "icons/spec_diss.webp",
    role: "healer",
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

function getClassFromSpec(spec) {
  if (spec === "居合" || spec === "月刃") return "雷影剑士";
  if (spec === "冰矛" || spec === "射线") return "冰魔导师";
  if (spec === "空枪" || spec === "重装") return "青岚骑士";
  if (spec === "惩戒" || spec === "愈合") return "森语者";
  if (spec === "防盾" || spec === "岩盾") return "巨刃守护者";
  if (spec === "狼弓" || spec === "鹰弓") return "神射手";
  if (spec === "光盾" || spec === "格挡") return "神盾骑士";
  if (spec === "协奏" || spec === "狂音") return "灵魂乐手";
  return "";
}

function getUserProfessions(user) {
  const parts = user.profession.split("-");
  const specProf = professionMap[parts[1]];
  const mainProf =
    professionMap[parts[0]] ||
    professionMap[getClassFromSpec(parts[1])] ||
    defaultProfession;
  return [mainProf, specProf];
}

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};
