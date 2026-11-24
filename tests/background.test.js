// SPDX-License-Identifier: GPL-3.0-or-later

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBgSandbox } = require("./helpers");

test("background.js : sanitizeSettings, cleanState, horaires et répétition nocturne", () => {
  const { sandbox: sb } = createBgSandbox();
  assert.equal(sb.clampInt("abc", 1, 10, 5), 5);
  assert.equal(sb.sanitizeSettings(null).moveMinutes, 30);

  const clean = sb.sanitizeSettings({
    moveMinutes: -10,
    drinkMinutes: 9999,
    lunchStartHour: 15,
    lunchEndHour: 12,
    enableMove: "invalid"
  });
  assert.equal(clean.moveMinutes, 1);
  assert.equal(clean.drinkMinutes, 720);
  assert.equal(clean.lunchStartHour, 15);
  assert.equal(clean.lunchEndHour, 16);
  assert.equal(clean.enableMove, true);

  assert.equal("dismissedTypes" in sb.cleanState(null), false);
  const migrated = sb.cleanState({ moveStart: 123, dismissedTypes: ["move", "eyes"] });
  assert.equal(migrated.moveStart, 123);
  assert.equal("dismissedTypes" in migrated, false);

  assert.equal(typeof sb.getDateKey(new Date(2026, 10, 24)), "string");
  const dayCfg = { nightStartHour: 1, nightEndHour: 5, nightEndMinute: 0 };
  assert.equal(sb.isAfterMidnight(new Date(2026, 10, 24, 3, 0), dayCfg), true);
  assert.equal(sb.isAfterMidnight(new Date(2026, 10, 24, 6, 0), dayCfg), false);
  assert.equal(sb.isAfterMidnight(new Date(2026, 10, 24, 23, 30)), true);
  assert.equal(sb.isAfterMidnight(new Date(2026, 10, 24, 12, 0)), false);
  assert.equal(sb.isLunchTime(new Date(2026, 10, 24, 12, 30)), true);
  assert.equal(sb.isDinnerTime(new Date(2026, 10, 24, 20, 0)), true);
  assert.equal(sb.getNightRepeatMs(new Date(2026, 10, 24, 0, 30)), 10 * 60_000);
  assert.equal(sb.getNightRepeatMs(new Date(2026, 10, 24, 1, 30)), 5 * 60_000);
  assert.equal(sb.getNightRepeatMs(new Date(2026, 10, 24, 3, 30)), 2 * 60_000);
  assert.equal(sb.getNightRepeatMs(new Date(2026, 10, 24, 2, 10), { nightEndHour: 1, nightRepeat2h: 2 }), 2 * 60_000);
});

test("background.js : applyActivity, applyAcknowledge, handleAction et listeners", async () => {
  const { sandbox: sb, listeners, alarmsCreated, getStore } = createBgSandbox({
    careBreakState: { moveStart: 500, dismissedTypes: ["move", "drink"] }
  });
  const t0 = 1_000_000;
  const idleNow = t0 + 20 * 60 * 1000;

  const afterIdle = sb.applyActivity(
    { moveStart: t0, eyesStart: t0, postureStart: t0, lastActivity: t0, nightAlertCount: 4, dismissedTypes: ["move"] },
    idleNow,
    new Date(2026, 10, 24, 12, 30)
  );
  assert.equal(afterIdle.moveStart, idleNow);
  assert.equal(afterIdle.lunchWindowStart, idleNow);
  assert.equal(afterIdle.nightAlertCount, 0);
  assert.equal("dismissedTypes" in afterIdle, false);

  const keptLunch = sb.applyActivity(afterIdle, idleNow + 60_000, new Date(2026, 10, 24, 12, 31));
  assert.equal(keptLunch.lunchWindowStart, idleNow);

  const preserved = sb.applyActivity(
    { moveStart: t0, drinkStart: t0, eyesStart: t0, postureStart: t0, lastActivity: t0 },
    t0 + 60_000,
    new Date(2026, 10, 24, 10, 0)
  );
  assert.equal(preserved.drinkStart, t0);

  const initTimers = sb.applyActivity(
    { moveStart: t0, drinkStart: t0, eyesStart: null, postureStart: null, lastActivity: t0 },
    t0 + 60_000,
    new Date(2026, 10, 24, 10, 0),
    { idleResetMinutes: 0 }
  );
  assert.equal(initTimers.eyesStart, t0 + 60_000);
  assert.equal(initTimers.postureStart, t0 + 60_000);

  const atDinner = sb.applyActivity({}, idleNow, new Date(2026, 10, 24, 20, 0));
  assert.equal(atDinner.dinnerWindowStart, idleNow);
  assert.equal(sb.applyActivity(atDinner, idleNow + 60_000, new Date(2026, 10, 24, 20, 1)).dinnerWindowStart, idleNow);

  assert.equal(sb.applyAcknowledge({ lunchWindowStart: t0 }, "lunch", idleNow, new Date(2026, 10, 24, 13, 0)).lunchTakenDate, "2026-11-24");
  assert.equal(sb.applyAcknowledge({ dinnerWindowStart: t0 }, "dinner", idleNow, new Date(2026, 10, 24, 20, 30)).dinnerTakenDate, "2026-11-24");
  assert.equal(sb.applyAcknowledge({}, "winddown", idleNow, new Date(2026, 10, 24, 20, 30)).windDownDoneDate, "2026-11-24");
  assert.equal(sb.applyAcknowledge({}, "night", idleNow, new Date(2026, 10, 24, 1, 15)).snoozeUntil, idleNow + 5 * 60_000);
  assert.equal(sb.applyAcknowledge({ moveStart: idleNow - 40 * 60_000 }, "drink", idleNow, new Date(), { moveMinutes: 0 }).moveStart, idleNow);
  assert.equal(sb.applyAcknowledge({ moveStart: idleNow - 5 * 60_000 }, "drink", idleNow).moveStart, idleNow - 5 * 60_000);
  assert.equal(sb.applyAcknowledge({}, "eyes", idleNow).eyesStart, idleNow);
  assert.equal(sb.applyAcknowledge({}, "posture", idleNow).postureStart, idleNow);
  const afterMoveAck = sb.applyAcknowledge({}, "move", idleNow);
  assert.equal(afterMoveAck.moveStart, idleNow);
  assert.equal(afterMoveAck.postureStart, idleNow);
  assert.equal(sb.applyAcknowledge({}, "unknown", idleNow).lastActivity, idleNow);

  assert.ok((await sb.handleAction({ type: "BREAK_ACTIVITY" })).state.lastActivity > 0);
  assert.ok((await sb.handleAction({ type: "BREAK_ACK", alertType: "eyes" })).state.eyesStart > 0);
  delete getStore().careBreakState.nightAlertCount;
  assert.equal((await sb.handleAction({ type: "BREAK_NIGHT_SHOWN" })).state.nightAlertCount, 1);
  assert.ok((await sb.handleAction({ type: "BREAK_SET_DND", minutes: 60 })).state.dndUntil > Date.now());
  assert.equal((await sb.handleAction({ type: "BREAK_SET_DND", minutes: -5 })).state.dndUntil, 0);
  assert.equal((await sb.handleAction({ type: "BREAK_SAVE_SETTINGS", settings: { moveMinutes: 40 } })).settings.moveMinutes, 40);
  assert.ok((await sb.handleAction({ type: "BREAK_GET_STATE" })).state);

  await listeners.installed();
  assert.equal("dismissedTypes" in getStore().careBreakState, false);
  await listeners.startup();
  assert.equal(alarmsCreated.length, 2);
  await listeners.alarm({ name: "otherAlarm" });
  getStore().careBreakState.dndUntil = 1;
  await listeners.alarm({ name: "careBreakTick" });
  assert.equal(getStore().careBreakState.dndUntil, 0);
  await listeners.alarm({ name: "careBreakTick" });

  assert.equal(listeners.message(null, {}, () => {}), undefined);
  assert.equal(listeners.message("ping", {}, () => {}), undefined);
  assert.equal(listeners.message({ type: "OTHER" }, {}, () => {}), undefined);
  await new Promise((resolve) => {
    assert.equal(listeners.message({ type: "BREAK_GET_STATE" }, {}, (res) => {
      assert.ok(res.settings);
      resolve();
    }), true);
  });
});
