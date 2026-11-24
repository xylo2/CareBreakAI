// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Rendu DOM, positionnement et interactions des cartes d'alerte CareBreak.
 */
class CareBreakUI {
  constructor(guard) {
    this.guard = guard;
    this.customStackPos = null;
    this.eyesTimerId = null;
  }

  getAlertSvg(type) {
    const svgs = {
      night: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#1e1b4b" stroke="#c084fc" stroke-width="2.5"/><path d="M29.5 13.5C23.5 14.2 19 19.3 19 25.5C19 32.1 24.4 37.5 31 37.5C33.4 37.5 35.6 36.8 37.4 35.6C35.4 38.6 32 40.5 28 40.5C21.6 40.5 16.5 35.4 16.5 29C16.5 22.8 21.3 17.8 27.4 17.5C28.2 16 28.9 14.7 29.5 13.5Z" fill="#fde047"/><path d="M34 12L35 14.5L37.5 15.5L35 16.5L34 19L33 16.5L30.5 15.5L33 14.5L34 12Z" fill="#f472b6"/><circle cx="14" cy="16" r="1.8" fill="#fde047"/></svg>',
      move: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#022c22" stroke="#34d399" stroke-width="2.5"/><circle cx="25" cy="12" r="3.6" fill="#6ee7b7"/><path d="M17 20L24 18L32 15M24 18L22 28L16 37M22 28L29 31L31 38" stroke="#ecfdf5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 39H36" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/></svg>',
      drink: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#082f49" stroke="#38bdf8" stroke-width="2.5"/><path d="M16 14H32L29.5 36H18.5L16 14Z" stroke="#e0f2fe" stroke-width="2.5" stroke-linejoin="round"/><path d="M17.3 24C20 22.5 23 25.5 26 24C28 23 29.5 23.5 30.7 24L29.5 35H18.5L17.3 24Z" fill="#0ea5e9"/><path d="M35 12C35 12 38 15.2 38 17C38 18.7 36.7 20 35 20C33.3 20 32 18.7 32 17C32 15.2 35 12 35 12Z" fill="#7dd3fc"/></svg>',
      lunch: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#290d02" stroke="#fb923c" stroke-width="2.5"/><circle cx="24" cy="25" r="10.5" fill="#fff7ed" stroke="#fdba74" stroke-width="2"/><circle cx="24" cy="25" r="6" stroke="#ea580c" stroke-width="1.8" stroke-dasharray="2.5 2"/><path d="M10.5 13.5V21C10.5 22.8 11.8 24 13.5 24V36.5M13.5 13.5V21M36.5 13.5V36.5M36.5 13.5C38.8 13.5 39.6 16.2 39.6 19.5C39.6 22.2 38.3 23.8 36.5 23.8" stroke="#fef3c7" stroke-width="2.6" stroke-linecap="round"/></svg>',
      dinner: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#431407" stroke="#f59e0b" stroke-width="2.5"/><path d="M12 24H36C36 30.6 30.6 36 24 36C17.4 36 12 30.6 12 24Z" fill="#fef3c7" stroke="#fbbf24" stroke-width="2"/><path d="M18 19C18 17 19.5 16 19.5 14M24 19C24 17 25.5 16 25.5 14M30 19C30 17 31.5 16 31.5 14" stroke="#fde68a" stroke-width="2.2" stroke-linecap="round"/></svg>',
      eyes: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#042f2e" stroke="#2dd4bf" stroke-width="2.5"/><path d="M9 24C12.5 17.5 17.8 14.5 24 14.5C30.2 14.5 35.5 17.5 39 24C35.5 30.5 30.2 33.5 24 33.5C17.8 33.5 12.5 30.5 9 24Z" stroke="#ccfbf1" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="24" r="5.5" fill="#14b8a6" stroke="#f0fdfa" stroke-width="2"/><circle cx="25.8" cy="22.2" r="1.6" fill="#ffffff"/></svg>',
      posture: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#1e1b4b" stroke="#818cf8" stroke-width="2.5"/><circle cx="24" cy="12" r="3.6" fill="#c7d2fe"/><path d="M24 17V29H32V38M16 22H31M15 38H26" stroke="#eef2ff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      winddown: '<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#4c0519" stroke="#fb7185" stroke-width="2.5"/><path d="M10 31H38" stroke="#fda4af" stroke-width="2.5" stroke-linecap="round"/><path d="M15 31C15 26 19 22 24 22C29 22 33 26 33 31" fill="#fb923c" stroke="#fde047" stroke-width="2"/><path d="M24 13V17M15 17L17.5 19.5M33 17L30.5 19.5" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/></svg>'
    };
    return svgs[type] || svgs.lunch;
  }

  applyStackPosition(stack) {
    if (!stack || stack.querySelector?.(".gmc-break-fullscreen")) return;
    if (!this.customStackPos) {
      stack.style.top = "68px";
      stack.style.right = "20px";
      stack.style.left = "auto";
      return;
    }
    const maxW = typeof window !== "undefined" ? window.innerWidth : 1280;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 800;
    const clampedX = Math.min(Math.max(8, this.customStackPos.x), Math.max(8, maxW - (stack.offsetWidth || 520) - 8));
    const clampedY = Math.min(Math.max(8, this.customStackPos.y), Math.max(8, maxH - (stack.offsetHeight || 160) - 8));
    stack.style.left = `${clampedX}px`;
    stack.style.top = `${clampedY}px`;
    stack.style.right = "auto";
  }

  setStackPosition(pos) {
    this.customStackPos = pos && typeof pos.x === "number" ? pos : null;
    if (typeof document !== "undefined") {
      const stack = document.querySelector(".gmc-break-stack");
      if (stack) this.applyStackPosition(stack);
    }
  }

  makeStackDraggable(stack) {
    if (stack.__gmcDragBound || typeof window === "undefined") return;
    stack.__gmcDragBound = true;
    stack.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target?.closest?.("button") || stack.querySelector(".gmc-break-fullscreen")) return;
      const rect = stack.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      stack.classList.add("gmc-dragging");
      const onMove = (ev) => {
        this.customStackPos = { x: ev.clientX - offsetX, y: ev.clientY - offsetY };
        this.applyStackPosition(stack);
      };
      const onUp = () => {
        stack.classList.remove("gmc-dragging");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (this.customStackPos && typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.set({ careBreakStackPos: this.customStackPos });
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }
  getHostRoot() {
    if (typeof document === "undefined") return null;
    return document.fullscreenElement || document.body || null;
  }

  getContainer() {
    const host = this.getHostRoot();
    if (!host) return null;
    let stack = document.querySelector(".gmc-break-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "gmc-break-stack";
      stack.setAttribute?.("aria-live", "polite");
      host.appendChild(stack);
    } else if (stack.parentNode !== host) {
      host.appendChild(stack);
    }
    this.makeStackDraggable(stack);
    this.applyStackPosition(stack);
    return stack;
  }

  applyMealBannerGradient(banner, mealType) {
    const p = this.guard.getMealProgress(mealType);
    const hueStart = Math.round(28 - p * 20);
    const hueEnd = Math.round(20 - p * 18);
    const lightStart = Math.round(16 + p * 20);
    const lightEnd = Math.round(30 + p * 20);
    const borderHue = Math.round(34 - p * 24);
    banner.style.background = `linear-gradient(135deg, hsl(${hueStart}, 85%, ${lightStart}%), hsl(${hueEnd}, 90%, ${lightEnd}%))`;
    banner.style.backgroundClip = "padding-box";
    banner.style.borderColor = `hsl(${borderHue}, 96%, 62%)`;
  }

  applyNightEscalation(banner, iconEl, msg, resetBtn, count) {
    const p = this.guard.getNightProgress(count);
    const iconSize = Math.round(56 + p * 60);
    banner.classList.add("gmc-break-night");
    banner.style.width = `calc(${Math.round(520 * (1 - p))}px + ${Math.round(p * 100)}vw)`;
    banner.style.maxWidth = "100vw";
    banner.style.minHeight = `${Math.round(p * 100)}vh`;
    banner.style.maxHeight = "100vh";
    banner.style.borderRadius = `${Math.round(16 * (1 - p))}px`;
    iconEl.style.width = `${iconSize}px`;
    iconEl.style.height = `${iconSize}px`;
    msg.style.fontSize = `${Math.round(17 + p * 20)}px`;
    resetBtn.style.fontSize = `${Math.round(15 + p * 6)}px`;
    resetBtn.style.padding = `${Math.round(10 + p * 6)}px ${Math.round(18 + p * 12)}px`;
    if (p >= 1) {
      banner.classList.add("gmc-break-fullscreen");
      banner.setAttribute?.("role", "alertdialog");
      banner.setAttribute?.("aria-modal", "true");
    }
  }

  startEyesCountdown(banner, timerBtn) {
    if (this.eyesTimerId) clearInterval(this.eyesTimerId);
    let remaining = 20;
    timerBtn.disabled = true;
    timerBtn.textContent = this.guard.t("timerRunning20s", remaining, `⏳ Regarde au loin (${remaining} s)...`);
    this.eyesTimerId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(this.eyesTimerId);
        this.eyesTimerId = null;
        banner.remove();
        this.guard.onAcknowledge("eyes");
      } else {
        timerBtn.textContent = this.guard.t("timerRunning20s", remaining, `⏳ Regarde au loin (${remaining} s)...`);
      }
    }, 1000);
  }
  renderBanner(alertObj) {
    const container = this.getContainer();
    if (!container) return;
    const existing = document.querySelector(`.gmc-break-banner[data-gmc-break-type="${alertObj.type}"]`);
    if (existing) {
      if (alertObj.type === "lunch" || alertObj.type === "dinner") this.applyMealBannerGradient(existing, alertObj.type);
      return;
    }

    const g = this.guard;
    const repeatDelay = g.formatDuration(alertObj.type === "night" ? g.getNightRepeatMinutes() : 10);
    const ackLabels = {
      night: g.t("ackNight", repeatDelay, "😴 J'y vais (" + repeatDelay + ")"),
      lunch: g.t("ackLunch", null, "🍽️ J'ai mangé"),
      dinner: g.t("ackDinner", null, "🍲 J'ai dîné"),
      winddown: g.t("ackWindDown", null, "🌇 Bonne soirée"),
      drink: g.t("ackDrink", g.formatDuration(g.settings.drinkMinutes), "💧 C'est fait (" + g.formatDuration(g.settings.drinkMinutes) + ")"),
      move: g.t("ackMove", g.formatDuration(g.settings.moveMinutes), "✅ Je me suis levé (" + g.formatDuration(g.settings.moveMinutes) + ")"),
      posture: g.t("ackPosture", g.formatDuration(g.settings.postureMinutes), "🪑 Posture corrigée (" + g.formatDuration(g.settings.postureMinutes) + ")"),
      eyes: g.t("ackEyes", g.formatDuration(g.settings.eyesMinutes), "👀 C'est fait (" + g.formatDuration(g.settings.eyesMinutes) + ")")
    };

    const banner = document.createElement("div");
    banner.className = "gmc-break-banner";
    banner.dataset.gmcBreakType = alertObj.type;
    banner.setAttribute?.("role", "status");
    banner.setAttribute?.("aria-live", alertObj.type === "night" ? "assertive" : "polite");
    banner.title = g.t("dragCardTitle", null, "Glisser la carte pour la déplacer");

    const bodyRow = document.createElement("div");
    bodyRow.className = "gmc-break-body";
    const iconEl = document.createElement("div");
    iconEl.className = "gmc-break-icon";
    iconEl.setAttribute?.("aria-hidden", "true");
    iconEl.innerHTML = this.getAlertSvg(alertObj.type);
    const msg = document.createElement("div");
    msg.className = "gmc-break-msg";
    msg.textContent = alertObj.message;
    bodyRow.append(iconEl, msg);

    const actions = document.createElement("div");
    actions.className = "gmc-break-actions";
    if (alertObj.type === "eyes") {
      const timerBtn = document.createElement("button");
      timerBtn.type = "button";
      timerBtn.className = "gmc-break-btn-timer";
      timerBtn.textContent = g.t("timerStart20s", null, "⏱️ Lancer 20 s");
      timerBtn.addEventListener("click", () => this.startEyesCountdown(banner, timerBtn));
      actions.append(timerBtn);
    }

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "gmc-break-btn-reset";
    resetBtn.textContent = ackLabels[alertObj.type] || "✅ OK";
    resetBtn.addEventListener("click", () => {
      if (alertObj.type === "eyes" && this.eyesTimerId) {
        clearInterval(this.eyesTimerId);
        this.eyesTimerId = null;
      }
      banner.remove();
      g.onAcknowledge(alertObj.type);
    });

    if (alertObj.type === "lunch" || alertObj.type === "dinner") {
      this.applyMealBannerGradient(banner, alertObj.type);
    }
    if (alertObj.type === "night") {
      const nextCount = (g.state.nightAlertCount || 0) + 1;
      this.applyNightEscalation(banner, iconEl, msg, resetBtn, nextCount);
      g.onNightShown();
    }
    actions.append(resetBtn);
    banner.append(bodyRow, actions);
    container.appendChild(banner);
    this.applyStackPosition(container);
  }

  syncDom() {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const alerts = this.guard.getActiveAlerts();
    const activeTypes = new Set(alerts.map((a) => a.type));
    document.querySelectorAll(".gmc-break-banner").forEach((el) => {
      const t = el.dataset?.gmcBreakType;
      if (t && !activeTypes.has(t)) el.remove();
    });
    alerts.forEach((a) => this.renderBanner(a));
  }
}
window.CareBreakUI = CareBreakUI;
