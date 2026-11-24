// SPDX-License-Identifier: GPL-3.0-or-later

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EXT_DIR } = require("./helpers");

test("popup.js : initialisation DOM, boutons DND, sauvegarde et réinitialisation", () => {
  const popupFile = path.join(EXT_DIR, "popup.js");
  const code = fs.readFileSync(popupFile, "utf-8");
  const elements = {};
  const i18nNodes = [];
  const docListeners = {};
  const sentMessages = [];
  let timeoutFn = null;
  let storedState = { dndUntil: 0 };

  const mk = (id, type = "number") => ({
    id, type, value: "", checked: false, disabled: false, textContent: "", style: {},
    listeners: {},
    setAttribute() {}, getAttribute() { return ""; },
    addEventListener(ev, fn) { this.listeners[ev] = fn; }
  });
  ["enableMove", "enableDrink", "enableEyes", "enablePosture", "enableLunch", "enableDinner", "enableWindDown", "enableNight"]
    .forEach((id) => { elements[id] = mk(id, "checkbox"); });
  ["moveMinutes", "drinkMinutes", "eyesMinutes", "postureMinutes", "lunchStartHour", "lunchEndHour", "lunchRepeatMinutes",
    "dinnerStartHour", "dinnerEndHour", "dinnerRepeatMinutes", "windDownHour", "windDownMinute", "nightStartHour",
    "nightEndHour", "nightEndMinute", "nightRepeat0h", "nightRepeat1h", "nightRepeat2h", "idleResetMinutes"]
    .forEach((id) => { elements[id] = mk(id, "number"); });
  ["dndStatus", "dndOffBtn", "dnd1hBtn", "dnd2hBtn", "saveBtn", "resetPosBtn", "resetBtn", "statusMsg"]
    .forEach((id) => { elements[id] = mk(id, "button"); });

  i18nNodes.push({ getAttribute: () => "btnSave", textContent: "Save" });
  i18nNodes.push({ getAttribute: () => "emptyKey", textContent: "" });

  const sandbox = {
    Date, Number,
    setTimeout: (fn) => { timeoutFn = fn; },
    document: {
      documentElement: { lang: "en" },
      getElementById: (id) => elements[id] || null,
      querySelectorAll: () => i18nNodes,
      addEventListener: (ev, fn) => { docListeners[ev] = fn; }
    },
    chrome: {
      i18n: {
        getUILanguage: () => "fr-FR",
        getMessage: (k) => (k === "btnSave" ? "Enregistrer" : "")
      },
      storage: {
        local: {
          get: (_keys, cb) => cb({
            careBreakSettings: { enableMove: false, moveMinutes: 45 },
            careBreakState: storedState
          }),
          remove: (_keys, cb) => cb()
        }
      },
      runtime: {
        sendMessage: (msg, cb) => {
          sentMessages.push(msg);
          if (msg.type === "BREAK_SET_DND") cb({ state: { dndUntil: msg.minutes > 0 ? Date.now() + 60_000 : 0 } });
          else if (msg.type === "BREAK_SAVE_SETTINGS") cb({ settings: msg.settings });
        }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: popupFile });

  docListeners.DOMContentLoaded();
  assert.equal(elements.dndOffBtn.style.display, "none");

  storedState = { dndUntil: Date.now() + 120_000 };
  docListeners.DOMContentLoaded();
  assert.equal(sandbox.document.documentElement.lang, "fr");
  assert.equal(i18nNodes.at(0).textContent, "Enregistrer");
  assert.equal(elements.moveMinutes.disabled, true);
  assert.equal(elements.dndOffBtn.style.display, "inline-block");

  elements.dnd1hBtn.listeners.click();
  elements.dnd2hBtn.listeners.click();
  elements.dndOffBtn.listeners.click();
  assert.equal(elements.dndOffBtn.style.display, "none");

  elements.eyesMinutes.value = "25";
  elements.moveMinutes.value = "invalid";
  elements.saveBtn.listeners.click();
  assert.equal(elements.statusMsg.textContent, "✅ Saved!");
  if (timeoutFn) timeoutFn();
  assert.equal(elements.statusMsg.textContent, "");
  sandbox.showStatus("");

  elements.resetPosBtn.listeners.click();
  assert.equal(elements.statusMsg.textContent, "📍 Positions reset");

  elements.resetBtn.listeners.click();
  assert.equal(elements.statusMsg.textContent, "↺ Defaults restored");
  assert.equal(sentMessages.length, 5);

  sandbox.fillForm(null);
  assert.equal(elements.moveMinutes.value, "30");
  sandbox.renderDnd({ dndUntil: 1 });
  assert.equal(elements.dndOffBtn.style.display, "none");
  sandbox.renderDnd(null);
  assert.equal(elements.dndOffBtn.style.display, "none");

  sandbox.chrome.i18n.getUILanguage = () => "";
  sandbox.applyI18n();
  assert.equal(sandbox.document.documentElement.lang, "en");
});
