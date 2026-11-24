// SPDX-License-Identifier: GPL-3.0-or-later

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { EXT_DIR, createDomSandbox } = require("./helpers");

test("manifest.json, licence GPL v3, i18n et accessibilité", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "manifest.json"), "utf-8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.default_locale, "en");
  assert.deepEqual(manifest.permissions, ["alarms", "storage"]);
  assert.deepEqual(manifest.content_scripts.at(0).js, ["care_break_ui.js", "care_break.js", "content.js"]);

  const en = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "_locales", "en", "messages.json"), "utf-8"));
  const expectedKeys = Object.keys(en);
  for (const lang of ["en", "fr", "de", "es"]) {
    const dict = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "_locales", lang, "messages.json"), "utf-8"));
    assert.deepEqual(Object.keys(dict), expectedKeys);
  }

  assert.ok(fs.readFileSync(path.join(EXT_DIR, "LICENSE"), "utf-8").includes("GNU GENERAL PUBLIC LICENSE"));
  const jsFiles = [
    "background.js", "care_break_ui.js", "care_break.js", "content.js", "popup.js",
    "tests/helpers.js", "tests/background.test.js", "tests/care_break.test.js",
    "tests/content.test.js", "tests/popup.test.js"
  ];
  for (const relJs of jsFiles) {
    assert.equal(fs.readFileSync(path.join(EXT_DIR, relJs), "utf-8").split("\n").at(0).trim(), "// SPDX-License-Identifier: GPL-3.0-or-later");
  }

  assert.ok(fs.readFileSync(path.join(EXT_DIR, "styles.css"), "utf-8").includes(":focus-visible"));
  assert.ok(fs.readFileSync(path.join(EXT_DIR, "popup.html"), "utf-8").includes('aria-live="polite"'));
});

test("GlobalCareBreak et CareBreakUI : alertes, DOM, drag-and-drop et minuteur", () => {
  const { sandbox, allNodes, timers, winListeners, savedStorage } = createDomSandbox({
    alertEyes: "👀 Augenpause (20-20-20)",
    alertNightLate: "🌙 Nach $1 Uhr"
  });
  const fakeNow = 1_000_000;
  let fakeDate = new Date(2026, 10, 24, 13, 0, 0);
  const acked = [];
  let nightShown = 0;
  const guard = new sandbox.window.GlobalCareBreak({
    nowFn: () => fakeNow,
    dateFn: () => fakeDate,
    onAcknowledge: (t) => acked.push(t),
    onNightShown: () => { nightShown += 1; }
  });

  assert.equal(guard.getActiveAlerts().length, 0);
  assert.equal(guard.formatDuration(45), "45 min");
  assert.equal(guard.formatDuration(60), "1 h");
  assert.equal(guard.formatDuration(90), "1 h 30");
  assert.equal(guard.formatDuration(0), "1 min");
  guard.applySettings(null);
  assert.equal(guard.getMealProgress("lunch"), 0.5);
  assert.equal(guard.getMealProgress("dinner"), 0);
  assert.equal(guard.isAfterMidnight(new Date(2026, 10, 24, 3, 0)), true);
  assert.equal(guard.getAlertSvg("unknown").includes("<svg"), true);
  guard.applyStackPosition(null);

  guard.setState({
    moveStart: fakeNow - 40 * 60_000,
    drinkStart: fakeNow - 130 * 60_000,
    eyesStart: fakeNow - 21 * 60_000,
    postureStart: fakeNow - 46 * 60_000,
    lunchWindowStart: fakeNow - 35 * 60_000,
    lastActivity: fakeNow
  });
  assert.deepEqual(Array.from(guard.getActiveAlerts().map((a) => a.type)), ["lunch", "drink", "move", "posture", "eyes"]);
  guard.syncDom();
  guard.syncDom();

  const stack = allNodes.find((n) => n.className === "gmc-break-stack");
  stack.listeners.pointerdown({ button: 1 });
  stack.listeners.pointerdown({ button: 0, clientX: 120, clientY: 100 });
  winListeners.pointermove({ clientX: 150, clientY: 140 });
  winListeners.pointerup();
  assert.equal(savedStorage.length, 1);
  guard.setStackPosition({ x: 10, y: 10 });
  guard.applyStackPosition(stack);
  guard.setStackPosition(null);
  delete sandbox.window.innerWidth;
  delete sandbox.window.innerHeight;
  guard.setStackPosition({ x: 10, y: 10 });
  guard.applyStackPosition(stack);
  guard.setStackPosition(null);

  const eyeBanner = allNodes.find((n) => n.dataset.gmcBreakType === "eyes");
  const btns = eyeBanner.children.at(1).children;
  btns.at(0).listeners.click();
  guard.startEyesCountdown(eyeBanner, btns.at(0));
  for (let i = 0; i < 20; i++) timers.at(1).fn();
  assert.equal(timers.at(1).cleared, true);
  assert.ok(acked.includes("eyes"));

  allNodes.find((n) => n.dataset.gmcBreakType === "move").children.at(1).children.at(0).listeners.click();
  assert.ok(acked.includes("move"));

  fakeDate = new Date(2026, 10, 24, 20, 30, 0);
  guard.setState({ dinnerWindowStart: fakeNow - 35 * 60_000, dismissedTypes: [] });
  assert.deepEqual(Array.from(guard.getActiveAlerts().map((a) => a.type)), ["dinner", "winddown", "drink", "move", "posture", "eyes"]);
  guard.syncDom();
  guard.syncDom();

  fakeDate = new Date(2026, 10, 25, 2, 15, 0);
  guard.setState({ nightAlertCount: 5, dismissedTypes: [] });
  assert.equal(guard.getNightRepeatMinutes(), 2);
  assert.equal(guard.getNightRepeatMinutes(new Date(2026, 10, 25, 1, 15, 0)), 5);
  assert.equal(guard.getNightRepeatMinutes(new Date(2026, 10, 24, 23, 30, 0)), 10);
  guard.syncDom();
  assert.equal(nightShown, 1);
  assert.equal(allNodes.find((n) => n.dataset.gmcBreakType === "night").classList.contains("gmc-break-fullscreen"), true);

  guard.setState({ dndUntil: fakeNow + 3600_000 });
  assert.equal(guard.getActiveAlerts().length, 0);
  guard.setState({ dndUntil: 0, lastActivity: fakeNow - 20 * 60_000 });
  assert.equal(guard.getActiveAlerts().length, 0);
  guard.setState({ moveStart: fakeNow, lastActivity: fakeNow, dismissedTypes: ["move"] });
  guard.syncDom();

  const bareGuard = new sandbox.window.GlobalCareBreak();
  bareGuard.onAcknowledge("move");
  bareGuard.onNightShown();
  sandbox.document.body = null;
  assert.equal(bareGuard.getContainer(), null);
  bareGuard.renderBanner({ type: "move", message: "test" });

  bareGuard.ui = null;
  assert.equal(bareGuard.getAlertSvg("move"), "");
  assert.equal(bareGuard.getContainer(), null);
  bareGuard.applyStackPosition(null);
  bareGuard.setStackPosition(null);
  bareGuard.applyNightEscalation();
  bareGuard.startEyesCountdown();
  bareGuard.renderBanner({ type: "move" });
  bareGuard.syncDom();
});
