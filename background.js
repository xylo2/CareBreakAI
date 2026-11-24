// SPDX-License-Identifier: GPL-3.0-or-later

const STORAGE_KEY = "careBreakState";
const SETTINGS_KEY = "careBreakSettings";
const ALARM_NAME = "careBreakTick";

const DEFAULT_SETTINGS = {
  enableMove: true,
  enableDrink: true,
  enableEyes: true,
  enablePosture: true,
  enableLunch: true,
  enableDinner: true,
  enableWindDown: true,
  enableNight: true,
  moveMinutes: 30,
  drinkMinutes: 120,
  eyesMinutes: 20,
  postureMinutes: 45,
  lunchStartHour: 12,
  lunchEndHour: 14,
  lunchRepeatMinutes: 30,
  dinnerStartHour: 19,
  dinnerEndHour: 22,
  dinnerRepeatMinutes: 30,
  windDownHour: 20,
  windDownMinute: 0,
  nightStartHour: 23,
  nightEndHour: 6,
  nightEndMinute: 30,
  nightRepeat0h: 10,
  nightRepeat1h: 5,
  nightRepeat2h: 2,
  idleResetMinutes: 15
};

const DEFAULT_STATE = {
  moveStart: null,
  drinkStart: null,
  eyesStart: null,
  postureStart: null,
  lunchWindowStart: null,
  lunchTakenDate: null,
  dinnerWindowStart: null,
  dinnerTakenDate: null,
  windDownDoneDate: null,
  lastActivity: null,
  snoozeUntil: 0,
  dndUntil: 0,
  nightAlertCount: 0,
  dismissedTypes: []
};

function sanitizeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const clamp = (val, min, max, fallback) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  const boolVal = (val, fallback) => (typeof val === "boolean" ? val : fallback);
  const lunchStart = clamp(src.lunchStartHour, 0, 23, DEFAULT_SETTINGS.lunchStartHour);
  const lunchEnd = clamp(src.lunchEndHour, lunchStart + 1, 24, Math.max(lunchStart + 1, DEFAULT_SETTINGS.lunchEndHour));
  const dinnerStart = clamp(src.dinnerStartHour, 0, 23, DEFAULT_SETTINGS.dinnerStartHour);
  const dinnerEnd = clamp(src.dinnerEndHour, dinnerStart + 1, 24, Math.max(dinnerStart + 1, DEFAULT_SETTINGS.dinnerEndHour));
  return {
    enableMove: boolVal(src.enableMove, DEFAULT_SETTINGS.enableMove),
    enableDrink: boolVal(src.enableDrink, DEFAULT_SETTINGS.enableDrink),
    enableEyes: boolVal(src.enableEyes, DEFAULT_SETTINGS.enableEyes),
    enablePosture: boolVal(src.enablePosture, DEFAULT_SETTINGS.enablePosture),
    enableLunch: boolVal(src.enableLunch, DEFAULT_SETTINGS.enableLunch),
    enableDinner: boolVal(src.enableDinner, DEFAULT_SETTINGS.enableDinner),
    enableWindDown: boolVal(src.enableWindDown, DEFAULT_SETTINGS.enableWindDown),
    enableNight: boolVal(src.enableNight, DEFAULT_SETTINGS.enableNight),
    moveMinutes: clamp(src.moveMinutes, 1, 480, DEFAULT_SETTINGS.moveMinutes),
    drinkMinutes: clamp(src.drinkMinutes, 1, 720, DEFAULT_SETTINGS.drinkMinutes),
    eyesMinutes: clamp(src.eyesMinutes, 1, 240, DEFAULT_SETTINGS.eyesMinutes),
    postureMinutes: clamp(src.postureMinutes, 1, 480, DEFAULT_SETTINGS.postureMinutes),
    lunchStartHour: lunchStart,
    lunchEndHour: lunchEnd,
    lunchRepeatMinutes: clamp(src.lunchRepeatMinutes, 1, 180, DEFAULT_SETTINGS.lunchRepeatMinutes),
    dinnerStartHour: dinnerStart,
    dinnerEndHour: dinnerEnd,
    dinnerRepeatMinutes: clamp(src.dinnerRepeatMinutes, 1, 180, DEFAULT_SETTINGS.dinnerRepeatMinutes),
    windDownHour: clamp(src.windDownHour, 0, 23, DEFAULT_SETTINGS.windDownHour),
    windDownMinute: clamp(src.windDownMinute, 0, 59, DEFAULT_SETTINGS.windDownMinute),
    nightStartHour: clamp(src.nightStartHour, 0, 23, DEFAULT_SETTINGS.nightStartHour),
    nightEndHour: clamp(src.nightEndHour, 0, 12, DEFAULT_SETTINGS.nightEndHour),
    nightEndMinute: clamp(src.nightEndMinute, 0, 59, DEFAULT_SETTINGS.nightEndMinute),
    nightRepeat0h: clamp(src.nightRepeat0h, 1, 120, DEFAULT_SETTINGS.nightRepeat0h),
    nightRepeat1h: clamp(src.nightRepeat1h, 1, 120, DEFAULT_SETTINGS.nightRepeat1h),
    nightRepeat2h: clamp(src.nightRepeat2h, 1, 120, DEFAULT_SETTINGS.nightRepeat2h),
    idleResetMinutes: clamp(src.idleResetMinutes, 1, 240, DEFAULT_SETTINGS.idleResetMinutes)
  };
}
function getDateKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isAfterMidnight(d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  const mins = d.getHours() * 60 + d.getMinutes();
  const startMins = s.nightStartHour * 60;
  const endMins = s.nightEndHour * 60 + s.nightEndMinute;
  if (startMins <= endMins) return mins >= startMins && mins < endMins;
  return mins >= startMins || mins < endMins;
}

function isLunchTime(d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  const h = d.getHours();
  return h >= s.lunchStartHour && h < s.lunchEndHour;
}

function isDinnerTime(d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  const h = d.getHours();
  return h >= s.dinnerStartHour && h < s.dinnerEndHour;
}

function getNightRepeatMs(d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  const h = d.getHours();
  if (h >= 2 && h <= s.nightEndHour) return s.nightRepeat2h * 60 * 1000;
  if (h === 1) return s.nightRepeat1h * 60 * 1000;
  return s.nightRepeat0h * 60 * 1000;
}

async function loadSettings() {
  const res = await chrome.storage.local.get(SETTINGS_KEY);
  return sanitizeSettings(res[SETTINGS_KEY]);
}

async function loadState() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_STATE, ...(res[STORAGE_KEY] || {}) };
}

async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  return state;
}

function applyActivity(state, now = Date.now(), d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  const idleResetMs = s.idleResetMinutes * 60 * 1000;
  const isIdle = state.lastActivity && (now - state.lastActivity >= idleResetMs);
  if (!state.moveStart || isIdle) {
    state.moveStart = now;
    state.eyesStart = now;
    state.postureStart = now;
    state.snoozeUntil = 0;
    if (isIdle) {
      state.nightAlertCount = 0;
      state.dismissedTypes = [];
    }
  }
  if (!state.drinkStart) state.drinkStart = now;
  if (!state.eyesStart) state.eyesStart = now;
  if (!state.postureStart) state.postureStart = now;
  if (!isAfterMidnight(d, s)) {
    state.nightAlertCount = 0;
    state.dismissedTypes = state.dismissedTypes.filter((t) => t !== "night");
  }
  const today = getDateKey(d);
  if (isLunchTime(d, s) && state.lunchTakenDate !== today) {
    if (!state.lunchWindowStart || isIdle) state.lunchWindowStart = now;
  } else {
    state.lunchWindowStart = null;
    state.dismissedTypes = state.dismissedTypes.filter((t) => t !== "lunch");
  }
  if (isDinnerTime(d, s) && state.dinnerTakenDate !== today) {
    if (!state.dinnerWindowStart || isIdle) state.dinnerWindowStart = now;
  } else {
    state.dinnerWindowStart = null;
    state.dismissedTypes = state.dismissedTypes.filter((t) => t !== "dinner");
  }
  state.lastActivity = now;
  return state;
}
function applyAcknowledge(state, type, now = Date.now(), d = new Date(), cfg = DEFAULT_SETTINGS) {
  const s = sanitizeSettings(cfg);
  state.lastActivity = now;
  const dismissed = new Set(state.dismissedTypes || []);
  dismissed.add(type);
  const today = getDateKey(d);
  if (type === "lunch" || type === "dinner") {
    state.moveStart = now;
    state.drinkStart = now;
    state.eyesStart = now;
    state.postureStart = now;
    if (type === "lunch") {
      state.lunchWindowStart = null;
      state.lunchTakenDate = today;
      state.nightAlertCount = 0;
    } else {
      state.dinnerWindowStart = null;
      state.dinnerTakenDate = today;
    }
    state.snoozeUntil = 0;
    ["move", "drink", "eyes", "posture"].forEach((k) => dismissed.add(k));
  } else if (type === "winddown") {
    state.windDownDoneDate = today;
  } else if (type === "night") {
    state.moveStart = now;
    state.snoozeUntil = now + getNightRepeatMs(d, s);
  } else if (type === "drink") {
    state.drinkStart = now;
    if (state.moveStart && now - state.moveStart >= s.moveMinutes * 60 * 1000) {
      state.moveStart = now;
      dismissed.add("move");
    }
    state.snoozeUntil = 0;
  } else if (type === "eyes") {
    state.eyesStart = now;
    state.snoozeUntil = 0;
  } else if (type === "posture") {
    state.postureStart = now;
    state.snoozeUntil = 0;
  } else if (type === "move") {
    state.moveStart = now;
    state.eyesStart = now;
    state.postureStart = now;
    dismissed.add("eyes");
    dismissed.add("posture");
    state.snoozeUntil = 0;
  }
  state.dismissedTypes = Array.from(dismissed);
  return state;
}

async function handleAction(msg) {
  const cfg = await loadSettings();
  let state = await loadState();
  const now = Date.now();
  const d = new Date();
  if (msg.type === "BREAK_ACTIVITY") {
    state = applyActivity(state, now, d, cfg);
    return { state: await saveState(state), settings: cfg };
  }
  if (msg.type === "BREAK_ACK") {
    state = applyAcknowledge(state, msg.alertType, now, d, cfg);
    return { state: await saveState(state), settings: cfg };
  }
  if (msg.type === "BREAK_NIGHT_SHOWN") {
    state.nightAlertCount = (state.nightAlertCount || 0) + 1;
    state.dismissedTypes = (state.dismissedTypes || []).filter((t) => t !== "night");
    return { state: await saveState(state), settings: cfg };
  }
  if (msg.type === "BREAK_SET_DND") {
    const mins = Math.max(0, Math.round(Number(msg.minutes) || 0));
    state.dndUntil = mins > 0 ? now + mins * 60 * 1000 : 0;
    return { state: await saveState(state), settings: cfg };
  }
  if (msg.type === "BREAK_SAVE_SETTINGS") {
    const nextCfg = sanitizeSettings(msg.settings);
    await chrome.storage.local.set({ [SETTINGS_KEY]: nextCfg });
    return { state, settings: nextCfg };
  }
  return { state, settings: cfg };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    const st = await loadState();
    if (st.dndUntil && Date.now() >= st.dndUntil) {
      st.dndUntil = 0;
      await saveState(st);
    }
  }
});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !String(msg.type || "").startsWith("BREAK_")) return;
  handleAction(msg).then(sendResponse);
  return true;
});
