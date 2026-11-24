// SPDX-License-Identifier: GPL-3.0-or-later

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const EXT_DIR = path.resolve(__dirname, "..");

function createBgSandbox(initialStore = {}) {
  const bgFile = path.join(EXT_DIR, "background.js");
  const bgCode = fs.readFileSync(bgFile, "utf-8");
  let savedStore = { ...initialStore };
  const alarmsCreated = [];
  const listeners = { installed: null, startup: null, alarm: null, message: null };
  const sandbox = {
    chrome: {
      storage: {
        local: {
          get: async (k) => (typeof k === "string" ? { [k]: savedStore[k] } : savedStore),
          set: async (obj) => { savedStore = { ...savedStore, ...obj }; }
        }
      },
      alarms: {
        create: (name, opts) => { alarmsCreated.push({ name, opts }); },
        onAlarm: { addListener: (fn) => { listeners.alarm = fn; } }
      },
      runtime: {
        onInstalled: { addListener: (fn) => { listeners.installed = fn; } },
        onStartup: { addListener: (fn) => { listeners.startup = fn; } },
        onMessage: { addListener: (fn) => { listeners.message = fn; } }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(bgCode, sandbox, { filename: bgFile });
  return { sandbox, listeners, alarmsCreated, getStore: () => savedStore };
}

function createDomSandbox(i18nMap = {}) {
  const allNodes = [];
  const timers = [];
  const winListeners = {};
  const docListeners = {};
  const savedStorage = [];
  const makeNode = (tag) => {
    const node = {
      tagName: tag.toUpperCase(),
      className: "",
      textContent: "",
      innerHTML: "",
      disabled: false,
      offsetWidth: 520,
      offsetHeight: 160,
      dataset: {},
      style: {},
      attrs: {},
      children: [],
      listeners: {},
      classList: {
        set: new Set(),
        add(c) { this.set.add(c); },
        remove(c) { this.set.delete(c); },
        contains(c) { return this.set.has(c); }
      },
      setAttribute(k, v) { this.attrs[k] = v; },
      append(...n) { this.children.push(...n); },
      appendChild(c) { this.children.push(c); },
      addEventListener(ev, fn) { this.listeners[ev] = fn; },
      removeEventListener(ev) { delete this.listeners[ev]; },
      closest: () => null,
      getBoundingClientRect: () => ({ left: 100, top: 80 }),
      querySelector: () => null,
      remove() { this.removed = true; }
    };
    allNodes.push(node);
    return node;
  };
  const body = makeNode("body");
  const sandbox = {
    chrome: {
      i18n: { getMessage: (key) => i18nMap[key] || "" },
      storage: { local: { set: (obj) => { savedStorage.push(obj); } } }
    },
    window: {
      innerWidth: 1280,
      innerHeight: 800,
      addEventListener: (ev, fn) => { winListeners[ev] = fn; },
      removeEventListener: (ev) => { delete winListeners[ev]; }
    },
    setInterval: (fn) => {
      const entry = { fn, cleared: false };
      timers.push(entry);
      return entry;
    },
    clearInterval: (entry) => { if (entry) entry.cleared = true; },
    document: {
      body,
      hidden: false,
      createElement: (t) => makeNode(t),
      addEventListener: (ev, fn) => { docListeners[ev] = fn; },
      querySelector: (sel) => allNodes.find((n) => !n.removed && (
        sel === ".gmc-break-stack"
          ? n.className === "gmc-break-stack"
          : sel.includes(`"${n.dataset.gmcBreakType}"`)
      )) || null,
      querySelectorAll: () => allNodes.filter((n) => !n.removed && n.className === "gmc-break-banner")
    }
  };
  vm.createContext(sandbox);
  for (const file of ["care_break_ui.js", "care_break.js"]) {
    const fullPath = path.join(EXT_DIR, file);
    vm.runInContext(fs.readFileSync(fullPath, "utf-8"), sandbox, { filename: fullPath });
  }
  return { sandbox, allNodes, timers, winListeners, docListeners, savedStorage };
}

module.exports = { EXT_DIR, createBgSandbox, createDomSandbox };
