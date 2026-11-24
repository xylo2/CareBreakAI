// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Évaluation des alertes synchronisées sur l'état global partagé CareBreak.
 */
class GlobalCareBreak {
  constructor(options = {}) {
    this.nowFn = options.nowFn || (() => Date.now());
    this.dateFn = options.dateFn || (() => new Date());
    this.onAcknowledge = options.onAcknowledge || (() => {});
    this.onNightShown = options.onNightShown || (() => {});
    this.settings = {
      enableMove: true,
      enableDrink: true,
      enableEyes: true,
      enablePosture: true,
      enableLunch: true,
      enableDinner: true,
      enableWindDown: true,
      enableNight: true,
      moveMinutes: options.moveLimitMinutes ?? 30,
      drinkMinutes: options.drinkLimitMinutes ?? 120,
      eyesMinutes: options.eyesLimitMinutes ?? 20,
      postureMinutes: options.postureLimitMinutes ?? 45,
      lunchStartHour: options.lunchStartHour ?? 12,
      lunchEndHour: options.lunchEndHour ?? 14,
      lunchRepeatMinutes: options.lunchRepeatMinutes ?? 30,
      dinnerStartHour: options.dinnerStartHour ?? 19,
      dinnerEndHour: options.dinnerEndHour ?? 22,
      dinnerRepeatMinutes: options.dinnerRepeatMinutes ?? 30,
      windDownHour: options.windDownHour ?? 20,
      windDownMinute: options.windDownMinute ?? 0,
      nightStartHour: options.midnightStartHour ?? 23,
      nightEndHour: 6,
      nightEndMinute: 30,
      nightRepeat0h: 10,
      nightRepeat1h: 5,
      nightRepeat2h: 2,
      idleResetMinutes: options.idleResetMinutes ?? 15
    };
    this.state = {
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
    this.ui = typeof window !== "undefined" && window.CareBreakUI ? new window.CareBreakUI(this) : null;
  }

  t(key, subs = null, fallback = "") {
    if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
      const msg = chrome.i18n.getMessage(key, subs == null ? undefined : String(subs));
      if (msg) return msg;
    }
    return fallback;
  }

  get moveLimitMs() { return this.settings.moveMinutes * 60 * 1000; }
  get drinkLimitMs() { return this.settings.drinkMinutes * 60 * 1000; }
  get eyesLimitMs() { return this.settings.eyesMinutes * 60 * 1000; }
  get postureLimitMs() { return this.settings.postureMinutes * 60 * 1000; }
  get lunchRepeatMs() { return this.settings.lunchRepeatMinutes * 60 * 1000; }
  get dinnerRepeatMs() { return this.settings.dinnerRepeatMinutes * 60 * 1000; }
  get idleResetMs() { return this.settings.idleResetMinutes * 60 * 1000; }

  isDndActive() { return Boolean(this.state.dndUntil && this.nowFn() < this.state.dndUntil); }

  formatDuration(minutes) {
    const mins = Math.max(1, Math.round(Number(minutes) || 0));
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours} h ${rem}` : `${hours} h`;
  }

  applySettings(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    this.settings = { ...this.settings, ...cfg };
    this.syncDom();
  }
  getDateKey(d = this.dateFn()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

  isAfterMidnight(d = this.dateFn()) {
    const mins = d.getHours() * 60 + d.getMinutes();
    const startMins = this.settings.nightStartHour * 60;
    const endMins = this.settings.nightEndHour * 60 + this.settings.nightEndMinute;
    if (startMins <= endMins) return mins >= startMins && mins < endMins;
    return mins >= startMins || mins < endMins;
  }

  isLunchTime(d = this.dateFn()) { const h = d.getHours(); return h >= this.settings.lunchStartHour && h < this.settings.lunchEndHour; }
  isDinnerTime(d = this.dateFn()) { const h = d.getHours(); return h >= this.settings.dinnerStartHour && h < this.settings.dinnerEndHour; }

  getMealProgress(mealType, d = this.dateFn()) {
    const now = this.nowFn();
    const isLunch = mealType === "lunch";
    const winStart = isLunch ? this.state.lunchWindowStart : this.state.dinnerWindowStart;
    const repeatMs = isLunch ? this.lunchRepeatMs : this.dinnerRepeatMs;
    const elapsedRatio = winStart && repeatMs > 0 ? (now - winStart) / repeatMs : 0;
    const startH = isLunch ? this.settings.lunchStartHour : this.settings.dinnerStartHour;
    const endH = isLunch ? this.settings.lunchEndHour : this.settings.dinnerEndHour;
    const totalWindowMins = Math.max(1, (endH - startH) * 60);
    const windowRatio = (d.getHours() * 60 + d.getMinutes() - startH * 60) / totalWindowMins;
    return Math.min(1, Math.max(0, Math.max(elapsedRatio, windowRatio)));
  }

  isWindDownTime(d = this.dateFn()) {
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins >= (this.settings.windDownHour * 60 + this.settings.windDownMinute) && !this.isAfterMidnight(d);
  }

  hasEatenToday(d = this.dateFn()) { return this.state.lunchTakenDate === this.getDateKey(d); }
  hasHadDinnerToday(d = this.dateFn()) { return this.state.dinnerTakenDate === this.getDateKey(d); }
  hasWoundDownToday(d = this.dateFn()) { return this.state.windDownDoneDate === this.getDateKey(d); }

  getNightRepeatMinutes(d = this.dateFn()) {
    const h = d.getHours();
    if (h >= 2 && h <= this.settings.nightEndHour) return this.settings.nightRepeat2h;
    if (h === 1) return this.settings.nightRepeat1h;
    return this.settings.nightRepeat0h;
  }

  getNightProgress(count) { return count <= 1 ? 0 : Math.min(1, (count - 1) / 5); }

  setState(newState, newSettings = null) {
    if (newSettings && typeof newSettings === "object") this.settings = { ...this.settings, ...newSettings };
    if (newState) this.state = { ...this.state, ...newState };
    this.syncDom();
  }

  getActiveAlerts() {
    const now = this.nowFn();
    const d = this.dateFn();
    const st = this.state;
    const cfg = this.settings;
    const isNight = this.isAfterMidnight(d);
    if (!st.moveStart || !st.lastActivity) return [];
    if (now - st.lastActivity >= this.idleResetMs) return [];
    if (now < (st.snoozeUntil || 0) || this.isDndActive()) return [];
    const dismissed = new Set(st.dismissedTypes || []);
    const alerts = [];

    if (cfg.enableNight && isNight && !dismissed.has("night")) {
      const h = d.getHours();
      alerts.push({
        type: "night",
        message: h >= 1
          ? this.t("alertNightLate", h, `🌙 Il est ${h}h passées : Va te coucher maintenant !`)
          : this.t("alertNightEarly", null, "🌙 Il est tard : Va te coucher !")
      });
    }
    if (cfg.enableLunch && this.isLunchTime(d) && !this.hasEatenToday(d) && !dismissed.has("lunch")) {
      if (st.lunchWindowStart && now - st.lunchWindowStart >= this.lunchRepeatMs) {
        alerts.push({ type: "lunch", message: this.t("alertLunch", null, "🍽️ Il est l'heure de déjeuner : pense à aller manger !") });
      }
    }
    if (cfg.enableDinner && this.isDinnerTime(d) && !this.hasHadDinnerToday(d) && !dismissed.has("dinner")) {
      if (st.dinnerWindowStart && now - st.dinnerWindowStart >= this.dinnerRepeatMs) {
        alerts.push({ type: "dinner", message: this.t("alertDinner", null, "🍲 Il est l'heure de dîner : pense à faire une vraie pause repas !") });
      }
    }
    if (cfg.enableWindDown && !isNight && this.isWindDownTime(d) && !this.hasWoundDownToday(d) && !dismissed.has("winddown")) {
      alerts.push({ type: "winddown", message: this.t("alertWindDown", null, "🌇 Fin de journée : pense à clôturer tes tâches et décrocher des écrans") });
    }
    if (cfg.enableDrink && st.drinkStart && now - st.drinkStart >= this.drinkLimitMs && !dismissed.has("drink")) {
      alerts.push({ type: "drink", message: this.t("alertDrink", null, "💧 N'oublie pas de boire") });
    }
    if (cfg.enableMove && !isNight && now - st.moveStart >= this.moveLimitMs && !dismissed.has("move")) {
      alerts.push({ type: "move", message: this.t("alertMove", null, "🚶 Ton corps a besoin de bouger, même un tout petit peu, lève-toi") });
    }
    if (cfg.enablePosture && !isNight && st.postureStart && now - st.postureStart >= this.postureLimitMs && !dismissed.has("posture")) {
      alerts.push({ type: "posture", message: this.t("alertPosture", null, "🪑 Posture : redresse le dos, relâche les épaules et décroise les jambes") });
    }
    if (cfg.enableEyes && !isNight && st.eyesStart && now - st.eyesStart >= this.eyesLimitMs && !dismissed.has("eyes")) {
      alerts.push({ type: "eyes", message: this.t("alertEyes", null, "👀 Pause visuelle (20-20-20) : regarde au loin à 6 m pendant 20 secondes") });
    }
    return alerts;
  }

  getAlertSvg(type) { return this.ui ? this.ui.getAlertSvg(type) : ""; }
  applyStackPosition(stack) { this.ui?.applyStackPosition(stack); }
  setStackPosition(pos) { this.ui?.setStackPosition(pos); }
  getContainer() { return this.ui ? this.ui.getContainer() : null; }
  applyNightEscalation(b, i, m, r, c) { this.ui?.applyNightEscalation(b, i, m, r, c); }
  startEyesCountdown(b, t) { this.ui?.startEyesCountdown(b, t); }
  renderBanner(alertObj) { this.ui?.renderBanner(alertObj); }
  syncDom() { this.ui?.syncDom(); }
}
window.GlobalCareBreak = GlobalCareBreak;
