// SPDX-License-Identifier: GPL-3.0-or-later

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EXT_DIR, createDomSandbox } = require("./helpers");

test("content.js : pastille repas, drag-and-drop, activité et synchronisation storage", () => {
  const { sandbox, allNodes, timers, winListeners, docListeners, savedStorage } = createDomSandbox();
  const sentMessages = [];
  let storageChangedFn = null;
  let storageGetCb = null;
  let nextReply = { state: { moveStart: Date.now(), lastActivity: Date.now() }, settings: { enableLunch: true } };

  let clearedPrevTimer = false;
  sandbox.window.__cbBreakTimer = 999;
  const origClear = sandbox.clearInterval;
  sandbox.clearInterval = (id) => {
    if (id === 999) clearedPrevTimer = true;
    origClear(id);
  };

  sandbox.chrome.runtime = {
    id: "ext-test-id",
    lastError: null,
    sendMessage: (msg, cb) => {
      sentMessages.push(msg);
      if (cb) cb(nextReply);
    }
  };
  sandbox.chrome.storage.local.get = (_keys, cb) => { storageGetCb = cb; };
  sandbox.chrome.storage.onChanged = { addListener: (fn) => { storageChangedFn = fn; } };

  const contentFile = path.join(EXT_DIR, "content.js");
  const contentCode = fs.readFileSync(contentFile, "utf-8");
  vm.runInContext(contentCode, sandbox, { filename: contentFile });

  assert.equal(clearedPrevTimer, true);
  assert.equal(sentMessages.at(0).type, "BREAK_ACTIVITY");
  const mealPill = allNodes.find((n) => n.className === "gmc-break-lunch-pill");
  assert.ok(mealPill);

  if (storageGetCb) {
    storageGetCb(null);
    storageGetCb({ careBreakLunchPos: { x: "invalid" }, careBreakStackPos: null });
    storageGetCb({
      careBreakSettings: { lunchStartHour: 0, lunchEndHour: 24, enableLunch: true },
      careBreakState: { moveStart: Date.now(), lastActivity: Date.now() },
      careBreakLunchPos: { x: 40, y: 50 },
      careBreakStackPos: { x: 20, y: 30 }
    });
  }
  timers.at(0).fn();
  assert.equal(mealPill.style.display, "inline-flex");
  assert.equal(mealPill.style.left, "40px");

  mealPill.closest = () => ({ tagName: "BUTTON" });
  mealPill.listeners.pointerdown({ button: 0, clientX: 50, clientY: 60, pointerId: 1 });
  mealPill.closest = () => null;
  mealPill.listeners.pointerdown({ button: 1 });
  mealPill.listeners.pointerdown({ button: 0, clientX: 50, clientY: 60, pointerId: 1 });
  mealPill.listeners.pointermove({ clientX: 51, clientY: 61 });
  mealPill.listeners.pointerup({ pointerId: 1 });

  mealPill.setPointerCapture = () => {};
  mealPill.releasePointerCapture = () => {};
  mealPill.listeners.pointerdown({ button: 0, clientX: 50, clientY: 60, pointerId: 1 });
  mealPill.listeners.pointermove({ clientX: 70, clientY: 85 });
  mealPill.listeners.pointerup({ pointerId: 1 });

  mealPill.setPointerCapture = () => { throw new Error("unsupported"); };
  mealPill.releasePointerCapture = () => { throw new Error("unsupported"); };
  mealPill.listeners.pointerdown({ button: 0, clientX: 50, clientY: 60, pointerId: 1 });
  mealPill.listeners.pointermove({ clientX: 80, clientY: 95 });
  mealPill.listeners.pointerup({ pointerId: 1 });
  assert.ok(savedStorage.some((item) => item.careBreakLunchPos));

  const doneBtn = mealPill.children.at(2);
  let stopped = false;
  doneBtn.listeners.click({ stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true);
  assert.equal(sentMessages.at(-1).type, "BREAK_ACK");

  docListeners.click();
  const countAfterClick = sentMessages.length;
  docListeners.click();
  assert.equal(sentMessages.length, countAfterClick);

  sandbox.document.hidden = true;
  docListeners.click();
  docListeners.visibilitychange();
  timers.at(0).fn();
  sandbox.document.hidden = false;
  nextReply = null;
  docListeners.visibilitychange();
  if (storageGetCb) storageGetCb({});
  nextReply = { settings: { enableLunch: false } };
  winListeners.focus();
  const nowDate = new Date();
  const todayKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`;
  nextReply = { moveStart: Date.now(), lastActivity: Date.now(), lunchTakenDate: todayKey };
  docListeners.visibilitychange();
  sandbox.chrome.runtime.lastError = { message: "err" };
  docListeners.visibilitychange();
  sandbox.chrome.runtime.lastError = null;
  assert.equal(sentMessages.at(-1).type, "BREAK_GET_STATE");

  storageChangedFn({
    careBreakSettings: { newValue: { enableLunch: true, lunchStartHour: 0, lunchEndHour: 24, lunchRepeatMinutes: 1, enableDinner: false, enableNight: false } },
    careBreakState: { newValue: { moveStart: Date.now(), lastActivity: Date.now(), lunchWindowStart: Date.now() - 120_000 } }
  }, "local");
  assert.equal(mealPill.style.display, "none");

  storageChangedFn({ careBreakSettings: { newValue: { enableLunch: false } } }, "sync");
  storageChangedFn({
    careBreakSettings: {
      newValue: {
        enableLunch: true,
        lunchStartHour: 0,
        lunchEndHour: 24,
        enableDinner: true,
        dinnerStartHour: 0,
        dinnerEndHour: 24,
        enableNight: true,
        nightStartHour: 0,
        nightEndHour: 23,
        nightEndMinute: 59
      }
    }
  }, "local");
  assert.ok(sentMessages.some((m) => m.type === "BREAK_NIGHT_SHOWN"));

  const nightBanner = allNodes.find((n) => n.dataset.gmcBreakType === "night" && !n.removed);
  const stackEl = allNodes.find((n) => n.className === "gmc-break-stack" && !n.removed);
  const fsHost = { children: [], appendChild(c) { this.children.push(c); c.parentNode = this; } };
  sandbox.document.fullscreenElement = fsHost;
  docListeners.fullscreenchange();
  assert.ok(fsHost.children.includes(mealPill));
  if (stackEl) assert.ok(fsHost.children.includes(stackEl));
  sandbox.document.fullscreenElement = null;
  docListeners.fullscreenchange();

  nightBanner.children.at(1).children.at(0).listeners.click();
  assert.ok(sentMessages.some((m) => m.type === "BREAK_ACK" && m.alertType === "night"));

  storageChangedFn({
    careBreakSettings: { newValue: { enableLunch: false, enableDinner: true, dinnerStartHour: 0, dinnerEndHour: 24, enableNight: false } }
  }, "local");
  assert.equal(mealPill.dataset.gmcMealType, "dinner");
  winListeners.resize();

  storageChangedFn({
    careBreakSettings: { newValue: { enableLunch: false, enableDinner: false } },
    careBreakState: { newValue: { dndUntil: Date.now() + 60_000 } },
    careBreakLunchPos: { newValue: null },
    careBreakStackPos: { newValue: null }
  }, "local");
  assert.equal(mealPill.style.display, "none");

  if (stackEl) stackEl.removed = true;
  winListeners.resize();
  timers.at(0).fn();

  const savedBody = sandbox.document.body;
  sandbox.document.body = null;
  docListeners.fullscreenchange();
  sandbox.document.body = savedBody;

  sandbox.chrome.runtime.id = null;
  docListeners.click();
  sandbox.chrome.runtime.id = "ext-test-id";
  sandbox.chrome.runtime.sendMessage = () => { throw new Error("context invalidated"); };
  docListeners.visibilitychange();
});

test("content.js : garde-fou d'initialisation double (__cbBreakInit)", () => {
  const { sandbox } = createDomSandbox();
  sandbox.window.__cbBreakInit = true;
  const contentFile = path.join(EXT_DIR, "content.js");
  vm.runInContext(fs.readFileSync(contentFile, "utf-8"), sandbox, { filename: contentFile });
});
