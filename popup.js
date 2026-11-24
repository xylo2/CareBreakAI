// SPDX-License-Identifier: GPL-3.0-or-later

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

const BOOL_IDS = ["enableMove", "enableDrink", "enableEyes", "enablePosture", "enableLunch", "enableDinner", "enableWindDown", "enableNight"];
const NUM_IDS = Object.keys(DEFAULT_SETTINGS).filter((k) => !BOOL_IDS.includes(k));
const TOGGLE_FIELDS = {
  enableMove: ["moveMinutes"],
  enableDrink: ["drinkMinutes"],
  enableEyes: ["eyesMinutes"],
  enablePosture: ["postureMinutes"],
  enableLunch: ["lunchStartHour", "lunchEndHour", "lunchRepeatMinutes"],
  enableDinner: ["dinnerStartHour", "dinnerEndHour", "dinnerRepeatMinutes"],
  enableWindDown: ["windDownHour", "windDownMinute"],
  enableNight: ["nightStartHour", "nightEndHour", "nightEndMinute", "nightRepeat0h", "nightRepeat1h", "nightRepeat2h"]
};

function syncFieldStates() {
  for (const [toggleId, fieldIds] of Object.entries(TOGGLE_FIELDS)) {
    const enabled = Boolean(document.getElementById(toggleId)?.checked);
    for (const fid of fieldIds) {
      const inp = document.getElementById(fid);
      if (inp) inp.disabled = !enabled;
    }
  }
}

function t(key, subs = null, fallback = "") {
  if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key, subs == null ? undefined : String(subs));
    if (msg) return msg;
  }
  return fallback;
}

function applyI18n() {
  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    document.documentElement.lang = chrome.i18n.getUILanguage().split("-").at(0) || "en";
  }
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key, null, el.textContent);
    if (translated) el.textContent = translated;
  });
}

function fillForm(cfg) {
  const merged = { ...DEFAULT_SETTINGS, ...(cfg || {}) };
  for (const id of BOOL_IDS) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(merged[id]);
  }
  for (const id of NUM_IDS) {
    const el = document.getElementById(id);
    if (el) el.value = String(merged[id]);
  }
  syncFieldStates();
}
function readForm() {
  const out = {};
  for (const id of BOOL_IDS) {
    const el = document.getElementById(id);
    out[id] = el ? Boolean(el.checked) : DEFAULT_SETTINGS[id];
  }
  for (const id of NUM_IDS) {
    const el = document.getElementById(id);
    const val = Number(el?.value);
    out[id] = Number.isFinite(val) ? val : DEFAULT_SETTINGS[id];
  }
  return out;
}

function renderDnd(state) {
  const statusEl = document.getElementById("dndStatus");
  const offBtn = document.getElementById("dndOffBtn");
  const dndUntil = Number(state?.dndUntil || 0);
  if (dndUntil > Date.now()) {
    const remMin = Math.max(1, Math.ceil((dndUntil - Date.now()) / 60000));
    statusEl.textContent = t("dndActive", remMin, `🔕 Pause (${remMin} min)`);
    offBtn.style.display = "inline-block";
  } else {
    statusEl.textContent = t("dndInactive", null, "🔔 Alerts active");
    offBtn.style.display = "none";
  }
}

function showStatus(text) {
  const box = document.getElementById("statusMsg");
  box.textContent = text;
  if (text) {
    setTimeout(() => {
      if (box.textContent === text) box.textContent = "";
    }, 2200);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  for (const id of BOOL_IDS) {
    document.getElementById(id)?.addEventListener("change", syncFieldStates);
  }
  chrome.storage.local.get(["careBreakSettings", "careBreakState"], (res) => {
    fillForm(res?.careBreakSettings);
    renderDnd(res?.careBreakState);
  });

  document.getElementById("dnd1hBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "BREAK_SET_DND", minutes: 60 }, (res) => renderDnd(res?.state));
  });
  document.getElementById("dnd2hBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "BREAK_SET_DND", minutes: 120 }, (res) => renderDnd(res?.state));
  });
  document.getElementById("dndOffBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "BREAK_SET_DND", minutes: 0 }, (res) => renderDnd(res?.state));
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "BREAK_SAVE_SETTINGS", settings: readForm() }, (res) => {
      if (res?.settings) fillForm(res.settings);
      showStatus(t("statusSaved", null, "✅ Saved!"));
    });
  });

  document.getElementById("resetPosBtn").addEventListener("click", () => {
    chrome.storage.local.remove(["careBreakLunchPos", "careBreakStackPos"], () => {
      showStatus(t("statusPosReset", null, "📍 Positions reset"));
    });
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "BREAK_SAVE_SETTINGS", settings: DEFAULT_SETTINGS }, (res) => {
      fillForm(res?.settings || DEFAULT_SETTINGS);
      showStatus(t("statusDefaultReset", null, "↺ Defaults restored"));
    });
  });
});
