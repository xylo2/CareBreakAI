// SPDX-License-Identifier: GPL-3.0-or-later
// Lancer avec : node --test tools/CareBreakAI/tests/break_guard.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const EXT_DIR = path.resolve(__dirname, "..");

test("manifest.json utilise les permissions minimales et les 4 langues i18n (en, fr, de, es)", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "manifest.json"), "utf-8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.default_locale, "en");
  assert.deepEqual(manifest.permissions, ["alarms", "storage"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.deepEqual(manifest.content_scripts.at(0).js, ["break_guard.js", "content.js"]);

  const en = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "_locales", "en", "messages.json"), "utf-8"));
  const expectedKeys = Object.keys(en);
  for (const lang of ["en", "fr", "de", "es"]) {
    const dict = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "_locales", lang, "messages.json"), "utf-8"));
    assert.deepEqual(Object.keys(dict), expectedKeys, `Clés manquantes ou différentes pour ${lang}`);
    assert.ok(dict.extName.message.startsWith("CareBreak"), `extName doit commencer par CareBreak (${lang})`);
  }
});

test("LICENSE contient la licence GNU GPL v3 et chaque fichier JS porte l'en-tête SPDX", () => {
  const licenseTxt = fs.readFileSync(path.join(EXT_DIR, "LICENSE"), "utf-8");
  assert.ok(licenseTxt.includes("GNU GENERAL PUBLIC LICENSE"));
  assert.ok(licenseTxt.includes("Version 3, 29 June 2007"));
  const storeListing = fs.readFileSync(path.join(EXT_DIR, "STORE_LISTING.md"), "utf-8");
  assert.ok(storeListing.includes("GNU GPL v3"));

  for (const relJs of ["background.js", "break_guard.js", "content.js", "popup.js", "tests/break_guard.test.js"]) {
    const firstLine = fs.readFileSync(path.join(EXT_DIR, relJs), "utf-8").split("\n").at(0).trim();
    assert.equal(firstLine, "// SPDX-License-Identifier: GPL-3.0-or-later", `En-tête SPDX manquant dans ${relJs}`);
  }
});

test("popup et content.js respectent i18n, accessibilité ARIA et focus clavier", () => {
  const css = fs.readFileSync(path.join(EXT_DIR, "styles.css"), "utf-8");
  const breakGuardJs = fs.readFileSync(path.join(EXT_DIR, "break_guard.js"), "utf-8");
  const contentJs = fs.readFileSync(path.join(EXT_DIR, "content.js"), "utf-8");
  const popupHtml = fs.readFileSync(path.join(EXT_DIR, "popup.html"), "utf-8");
  const popupJs = fs.readFileSync(path.join(EXT_DIR, "popup.js"), "utf-8");
  assert.ok(css.includes("background-clip: padding-box;"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(breakGuardJs.includes('aria-hidden="true"'));
  assert.ok(contentJs.includes("guard.isDndActive()"));
  assert.ok(contentJs.includes('guard.t("pillLunchLabel"'));
  assert.ok(popupHtml.includes('role="status" aria-live="polite"'));
  assert.ok(popupHtml.includes('id="enableNight"'));
  assert.ok(popupJs.includes("syncFieldStates()"));
  assert.ok(popupJs.includes("getUILanguage"));
});

test("background.js gère toutes les alertes et le mode Ne pas déranger", async () => {
  const bgCode = fs.readFileSync(path.join(EXT_DIR, "background.js"), "utf-8");
  const cutIdx = bgCode.indexOf("chrome.runtime.onInstalled.addListener");
  let savedStore = {};
  const sandbox = {
    chrome: {
      storage: {
        local: {
          get: async () => savedStore,
          set: async (obj) => { savedStore = { ...savedStore, ...obj }; }
        }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(bgCode.slice(0, cutIdx), sandbox);

  const custom = sandbox.sanitizeSettings({
    enableMove: false,
    eyesMinutes: 25,
    postureMinutes: 50,
    nightStartHour: 23,
    nightEndHour: 7,
    nightRepeat0h: 15
  });
  assert.equal(custom.enableMove, false);
  assert.equal(custom.eyesMinutes, 25);

  const dndRes = await sandbox.handleAction({ type: "BREAK_SET_DND", minutes: 60 });
  assert.ok(dndRes.state.dndUntil > Date.now());
});
test("GlobalCareBreak respecte i18n, le dégradé progressif des repas et le mode DND", () => {
  const allNodes = [];
  const makeNode = (tag) => {
    const node = {
      tagName: tag.toUpperCase(),
      className: "",
      textContent: "",
      innerHTML: "",
      dataset: {},
      style: {},
      children: [],
      classList: { set: new Set(), add(c) { this.set.add(c); }, contains(c) { return this.set.has(c); } },
      append(...n) { this.children.push(...n); },
      appendChild(c) { this.children.push(c); },
      addEventListener() {},
      remove() { this.removed = true; }
    };
    allNodes.push(node);
    return node;
  };
  const body = makeNode("body");
  const sandbox = {
    chrome: {
      i18n: {
        getMessage: (key) => (key === "alertEyes" ? "👀 Augenpause (20-20-20)" : "")
      }
    },
    window: {},
    document: {
      body,
      createElement: (t) => makeNode(t),
      querySelector: (sel) => allNodes.find((n) => !n.removed && (sel === ".gmc-break-stack" ? n.className === "gmc-break-stack" : sel.includes(`"${n.dataset.gmcBreakType}"`))) || null,
      querySelectorAll: () => allNodes.filter((n) => !n.removed && n.className === "gmc-break-banner")
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(EXT_DIR, "break_guard.js"), "utf-8"), sandbox);

  let fakeNow = 1_000_000;
  const guard = new sandbox.window.GlobalCareBreak({
    nowFn: () => fakeNow,
    dateFn: () => new Date(2026, 10, 24, 13, 0, 0)
  });

  assert.equal(guard.getMealProgress("lunch"), 0.5);

  guard.setState(
    {
      moveStart: fakeNow - 40 * 60 * 1000,
      drinkStart: fakeNow,
      eyesStart: fakeNow - 21 * 60 * 1000,
      postureStart: fakeNow - 46 * 60 * 1000,
      lastActivity: fakeNow
    },
    { enableMove: false }
  );
  const alerts = guard.getActiveAlerts();
  assert.equal(alerts.some((a) => a.type === "move"), false);
  const eyeAlert = alerts.find((a) => a.type === "eyes");
  assert.equal(eyeAlert?.message, "👀 Augenpause (20-20-20)");

  guard.setState({ dndUntil: fakeNow + 3600_000 });
  assert.equal(guard.getActiveAlerts().length, 0);
});
