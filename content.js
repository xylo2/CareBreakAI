// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Script de contenu global pour les alertes santé/sommeil sur tous les onglets.
 */
if (!window.__cbBreakInit) {
  window.__cbBreakInit = true;
  if (window.__cbBreakTimer) clearInterval(window.__cbBreakTimer);

  const syncReply = (res) => {
    if (!res) return;
    if (res.state) guard.setState(res.state, res.settings);
    else if (res.settings) guard.applySettings(res.settings);
    else guard.setState(res);
    updateMealPill();
  };

  const sendMsg = (payload, cb) => {
    if (!chrome.runtime?.id) return;
    try {
      chrome.runtime.sendMessage(payload, (res) => {
        if (!chrome.runtime.lastError && cb) cb(res);
      });
    } catch (_e) {}
  };

  const guard = new window.GlobalCareBreak({
    onAcknowledge: (alertType) => sendMsg({ type: "BREAK_ACK", alertType }, syncReply),
    onNightShown: () => sendMsg({ type: "BREAK_NIGHT_SHOWN" }, syncReply)
  });

  const mealPill = document.createElement("div");
  mealPill.className = "gmc-break-lunch-pill";
  mealPill.setAttribute("role", "status");
  mealPill.setAttribute("aria-live", "polite");
  mealPill.title = guard.t("dragPillTitle", null, "Drag to move");
  mealPill.style.display = "none";
  document.body.appendChild(mealPill);

  let customPillPos = null;
  let wasDragged = false;

  const applyPillPosition = () => {
    if (!customPillPos) {
      mealPill.style.left = "24px";
      mealPill.style.bottom = "24px";
      mealPill.style.top = "auto";
      mealPill.style.transform = "none";
      return;
    }
    const maxX = Math.max(8, window.innerWidth - mealPill.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - mealPill.offsetHeight - 8);
    const clampedX = Math.min(Math.max(8, customPillPos.x), maxX);
    const clampedY = Math.min(Math.max(8, customPillPos.y), maxY);
    mealPill.style.left = `${clampedX}px`;
    mealPill.style.top = `${clampedY}px`;
    mealPill.style.bottom = "auto";
    mealPill.style.transform = "none";
  };

  chrome.storage?.local?.get(["careBreakLunchPos", "careBreakStackPos", "careBreakSettings"], (res) => {
    if (res?.careBreakSettings) guard.applySettings(res.careBreakSettings);
    if (res?.careBreakLunchPos && typeof res.careBreakLunchPos.x === "number") {
      customPillPos = res.careBreakLunchPos;
      applyPillPosition();
    }
    if (res?.careBreakStackPos) guard.setStackPosition(res.careBreakStackPos);
  });

  mealPill.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target?.closest?.("button")) return;
    const rect = mealPill.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    wasDragged = false;
    mealPill.classList.add("gmc-dragging");
    if (mealPill.setPointerCapture) {
      try { mealPill.setPointerCapture(e.pointerId); } catch (_err) {}
    }

    const onMove = (ev) => {
      if (!wasDragged && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 5) wasDragged = true;
      if (!wasDragged) return;
      customPillPos = { x: ev.clientX - offsetX, y: ev.clientY - offsetY };
      applyPillPosition();
    };

    const onUp = (ev) => {
      mealPill.classList.remove("gmc-dragging");
      mealPill.removeEventListener("pointermove", onMove);
      mealPill.removeEventListener("pointerup", onUp);
      mealPill.removeEventListener("pointercancel", onUp);
      if (mealPill.releasePointerCapture) {
        try { mealPill.releasePointerCapture(ev.pointerId); } catch (_err) {}
      }
      if (wasDragged && customPillPos) {
        chrome.storage?.local?.set({ careBreakLunchPos: customPillPos });
      }
    };

    mealPill.addEventListener("pointermove", onMove);
    mealPill.addEventListener("pointerup", onUp);
    mealPill.addEventListener("pointercancel", onUp);
  });
  window.addEventListener("resize", () => {
    if (mealPill.style.display !== "none") applyPillPosition();
    const stack = document.querySelector(".gmc-break-stack");
    if (stack) guard.applyStackPosition(stack);
  });
  let lastRenderedMealType = null;

  const applyMealPillGradient = (mealType) => {
    const p = guard.getMealProgress(mealType);
    const hueStart = Math.round(28 - p * 18);
    const hueEnd = Math.round(22 - p * 18);
    const lightStart = Math.round(16 + p * 22);
    const lightEnd = Math.round(30 + p * 20);
    const borderHue = Math.round(34 - p * 22);
    mealPill.style.background = `linear-gradient(135deg, hsl(${hueStart}, 85%, ${lightStart}%), hsl(${hueEnd}, 90%, ${lightEnd}%))`;
    mealPill.style.borderColor = `hsl(${borderHue}, 96%, 62%)`;
    mealPill.style.boxShadow = `0 12px 30px hsla(${hueEnd}, 90%, 38%, ${(0.45 + p * 0.35).toFixed(2)})`;
  };

  const updateMealPill = () => {
    if (guard.isDndActive()) {
      mealPill.style.display = "none";
      lastRenderedMealType = null;
      return;
    }
    const activeAlerts = guard.getActiveAlerts();
    const showLunch = guard.settings.enableLunch && guard.isLunchTime() && !guard.hasEatenToday() && !activeAlerts.some((a) => a.type === "lunch");
    const showDinner = !showLunch && guard.settings.enableDinner && guard.isDinnerTime() && !guard.hasHadDinnerToday() && !activeAlerts.some((a) => a.type === "dinner");
    const mealType = showLunch ? "lunch" : (showDinner ? "dinner" : null);
    mealPill.style.display = mealType ? "inline-flex" : "none";
    if (!mealType) {
      lastRenderedMealType = null;
      return;
    }
    if (lastRenderedMealType !== mealType) {
      lastRenderedMealType = mealType;
      mealPill.dataset.gmcMealType = mealType;
      mealPill.innerHTML = "";
      const iconWrap = document.createElement("span");
      iconWrap.className = "gmc-lunch-pill-icon";
      iconWrap.setAttribute("aria-hidden", "true");
      iconWrap.innerHTML = guard.getAlertSvg(mealType);
      const labelSpan = document.createElement("span");
      labelSpan.textContent = mealType === "lunch"
        ? guard.t("pillLunchLabel", null, "Lunch break")
        : guard.t("pillDinnerLabel", null, "Dinner break");
      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "gmc-lunch-pill-done-btn";
      doneBtn.textContent = guard.t("pillDoneBtn", null, "✅ Done");
      doneBtn.title = mealType === "lunch"
        ? guard.t("pillLunchDoneTitle", null, "Mark lunch break as done for today")
        : guard.t("pillDinnerDoneTitle", null, "Mark dinner as done for today");
      doneBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sendMsg({ type: "BREAK_ACK", alertType: mealType }, syncReply);
      });
      mealPill.append(iconWrap, labelSpan, doneBtn);
    }
    applyMealPillGradient(mealType);
    applyPillPosition();
  };

  let lastActSent = 0;
  const notifyActivity = () => {
    if (document.hidden) return;
    const now = Date.now();
    if (now - lastActSent < 5000) return;
    lastActSent = now;
    sendMsg({ type: "BREAK_ACTIVITY" }, syncReply);
  };

  ["click", "keydown", "mousemove", "scroll"].forEach((evt) => {
    document.addEventListener(evt, notifyActivity, { passive: true });
  });

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.careBreakSettings?.newValue) {
      guard.applySettings(changes.careBreakSettings.newValue);
      updateMealPill();
    }
    if (changes.careBreakState?.newValue) {
      guard.setState(changes.careBreakState.newValue);
      updateMealPill();
    }
    if ("careBreakLunchPos" in changes) {
      customPillPos = changes.careBreakLunchPos.newValue || null;
      applyPillPosition();
    }
    if ("careBreakStackPos" in changes) {
      guard.setStackPosition(changes.careBreakStackPos.newValue || null);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sendMsg({ type: "BREAK_GET_STATE" }, syncReply);
  });

  sendMsg({ type: "BREAK_ACTIVITY" }, syncReply);

  window.__cbBreakTimer = setInterval(() => {
    if (!document.hidden) {
      guard.syncDom();
      updateMealPill();
    }
  }, 3000);
}
