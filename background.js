// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Service Worker Manifest V3 : état global partagé et synchronisé entre tous les onglets.
 */
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
  nightAlertCount: 0
};

function clampInt(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeSettings(raw = {}) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  for (const k of ["enableMove", "enableDrink", "enableEyes", "enablePosture", "enableLunch", "enableDinner", "enableWindDown", "enableNight"]) {
    s[k] = typeof s[k] === "boolean" ? s[k] : DEFAULT_SETTINGS[k];
  }
  s.moveMinutes = clampInt(s.moveMinutes, 1, 240, DEFAULT_SETTINGS.moveMinutes);
  s.drinkMinutes = clampInt(s.drinkMinutes, 1, 720, DEFAULT_SETTINGS.drinkMinutes);
  s.eyesMinutes = clampInt(s.eyesMinutes, 1, 180, DEFAULT_SETTINGS.eyesMinutes);
  s.postureMinutes = clampInt(s.postureMinutes, 1, 240, DEFAULT_SETTINGS.postureMinutes);
  s.lunchStartHour = clampInt(s.lunchStartHour, 0, 22, DEFAULT_SETTINGS.lunchStartHour);
  s.lunchEndHour = clampInt(s.lunchEndHour, s.lunchStartHour + 1, 23, Math.max(s.lunchStartHour + 1, DEFAULT_SETTINGS.lunchEndHour));
  s.lunchRepeatMinutes = clampInt(s.lunchRepeatMinutes, 1, 180, DEFAULT_SETTINGS.lunchRepeatMinutes);
  s.dinnerStartHour = clampInt(s.dinnerStartHour, 0, 22, DEFAULT_SETTINGS.dinnerStartHour);
  s.dinnerEndHour = clampInt(s.dinnerEndHour, s.dinnerStartHour + 1, 23, Math.max(s.dinnerStartHour + 1, DEFAULT_SETTINGS.dinnerEndHour));
  s.dinnerRepeatMinutes = clampInt(s.dinnerRepeatMinutes, 1, 180, DEFAULT_SETTINGS.dinnerRepeatMinutes);
  s.windDownHour = clampInt(s.windDownHour, 15, 23, DEFAULT_SETTINGS.windDownHour);
  s.windDownMinute = clampInt(s.windDownMinute, 0, 59, DEFAULT_SETTINGS.windDownMinute);
  s.nightStartHour = clampInt(s.nightStartHour, 0, 23, DEFAULT_SETTINGS.nightStartHour);
  s.nightEndHour = clampInt(s.nightEndHour, 0, 12, DEFAULT_SETTINGS.nightEndHour);
  s.nightEndMinute = clampInt(s.nightEndMinute, 0, 59, DEFAULT_SETTINGS.nightEndMinute);
  s.nightRepeat0h = clampInt(s.nightRepeat0h, 1, 60, DEFAULT_SETTINGS.nightRepeat0h);
  s.nightRepeat1h = clampInt(s.nightRepeat1h, 1, 60, DEFAULT_SETTINGS.nightRepeat1h);
  s.nightRepeat2h = clampInt(s.nightRepeat2h, 1, 60, DEFAULT_SETTINGS.nightRepeat2h);
  s.idleResetMinutes = clampInt(s.idleResetMinutes, 1, 120, DEFAULT_SETTINGS.idleResetMinutes);
  return s;
}

function cleanState(raw = {}) {
  const merged = { ...DEFAULT_STATE, ...(raw && typeof raw === "object" ? raw : {}) };
  delete merged.dismissedTypes;
  return merged;
}

function getDateKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isAfterMidnight(d, cfg = DEFAULT_SETTINGS) {
  const mins = d.getHours() * 60 + d.getMinutes();
  const startMins = cfg.nightStartHour * 60;
  const endMins = cfg.nightEndHour * 60 + cfg.nightEndMinute;
  if (startMins <= endMins) return mins >= startMins && mins < endMins;
  return mins >= startMins || mins < endMins;
}

function isLunchTime(d, cfg = DEFAULT_SETTINGS) {
  const h = d.getHours();
  return h >= cfg.lunchStartHour && h < cfg.lunchEndHour;
}

function isDinnerTime(d, cfg = DEFAULT_SETTINGS) {
  const h = d.getHours();
  return h >= cfg.dinnerStartHour && h < cfg.dinnerEndHour;
}

function getNightRepeatMs(d, cfg = DEFAULT_SETTINGS) {
  const h = d.getHours();
  if (h >= 2 && h <= Math.max(2, cfg.nightEndHour)) return cfg.nightRepeat2h * 60 * 1000;
  if (h === 1) return cfg.nightRepeat1h * 60 * 1000;
  return cfg.nightRepeat0h * 60 * 1000;
}

function applyActivity(state, now = Date.now(), d = new Date(), cfg = DEFAULT_SETTINGS) {
  const next = cleanState(state);
  const idleLimitMs = (cfg.idleResetMinutes || 15) * 60 * 1000;
  const isIdleBreak = !next.lastActivity || (now - next.lastActivity >= idleLimitMs);

  if (isIdleBreak) {
    next.moveStart = now;
    next.eyesStart = now;
    next.postureStart = now;
    next.nightAlertCount = 0;
  }
  if (!next.drinkStart) next.drinkStart = now;
  if (!next.eyesStart) next.eyesStart = now;
  if (!next.postureStart) next.postureStart = now;

  if (isLunchTime(d, cfg) && next.lunchTakenDate !== getDateKey(d)) {
    if (!next.lunchWindowStart) next.lunchWindowStart = now;
  } else {
    next.lunchWindowStart = null;
  }

  if (isDinnerTime(d, cfg) && next.dinnerTakenDate !== getDateKey(d)) {
    if (!next.dinnerWindowStart) next.dinnerWindowStart = now;
  } else {
    next.dinnerWindowStart = null;
  }

  next.lastActivity = now;
  return next;
}

function applyAcknowledge(state, alertType, now = Date.now(), d = new Date(), cfg = DEFAULT_SETTINGS) {
  const next = cleanState(state);
  const moveLimitMs = (cfg.moveMinutes || 30) * 60 * 1000;

  if (alertType === "lunch") {
    next.lunchTakenDate = getDateKey(d);
    next.lunchWindowStart = null;
  } else if (alertType === "dinner") {
    next.dinnerTakenDate = getDateKey(d);
    next.dinnerWindowStart = null;
  } else if (alertType === "winddown") {
    next.windDownDoneDate = getDateKey(d);
  } else if (alertType === "night") {
    next.snoozeUntil = now + getNightRepeatMs(d, cfg);
  } else if (alertType === "drink") {
    next.drinkStart = now;
    if (!next.moveStart || (now - next.moveStart >= moveLimitMs)) {
      next.moveStart = now;
    }
  } else if (alertType === "eyes") {
    next.eyesStart = now;
  } else if (alertType === "posture") {
    next.postureStart = now;
  } else if (alertType === "move") {
    next.moveStart = now;
    next.postureStart = now;
  }
  next.lastActivity = now;
  return next;
}

async function getAllData() {
  const data = await chrome.storage.local.get(["careBreakState", "careBreakSettings"]);
  const settings = sanitizeSettings(data.careBreakSettings);
  const state = cleanState(data.careBreakState);
  return { state, settings };
}

async function handleAction(msg) {
  const { state: prevState, settings } = await getAllData();
  const now = Date.now();
  const d = new Date();
  let state = prevState;

  if (msg.type === "BREAK_ACTIVITY") {
    state = applyActivity(prevState, now, d, settings);
  } else if (msg.type === "BREAK_ACK") {
    state = applyAcknowledge(prevState, msg.alertType, now, d, settings);
  } else if (msg.type === "BREAK_NIGHT_SHOWN") {
    state = { ...prevState, nightAlertCount: (prevState.nightAlertCount || 0) + 1 };
  } else if (msg.type === "BREAK_SET_DND") {
    const mins = Number(msg.minutes) || 0;
    state = { ...prevState, dndUntil: mins > 0 ? now + mins * 60 * 1000 : 0 };
  } else if (msg.type === "BREAK_SAVE_SETTINGS") {
    const clean = sanitizeSettings(msg.settings);
    await chrome.storage.local.set({ careBreakSettings: clean });
    return { state, settings: clean };
  }

  await chrome.storage.local.set({ careBreakState: state });
  return { state, settings };
}

async function initBackground() {
  chrome.alarms.create("careBreakTick", { periodInMinutes: 0.5 });
  const { state, settings } = await getAllData();
  await chrome.storage.local.set({ careBreakState: state, careBreakSettings: settings });
}

chrome.runtime.onInstalled.addListener(() => { initBackground(); });
chrome.runtime.onStartup.addListener(() => { initBackground(); });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "careBreakTick") return;
  const { state } = await getAllData();
  if (state.dndUntil && Date.now() >= state.dndUntil) {
    await chrome.storage.local.set({ careBreakState: { ...state, dndUntil: 0 } });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string" || !msg.type.startsWith("BREAK_")) return;
  handleAction(msg).then(sendResponse);
  return true;
});
