/* ==========================================================================
   Prompt Studio — storageManager.js
   Persistence layer, compatible with Photoshop 2021 (v22, UXP 4.x) and newer.

   Strategy:
     1. If window.localStorage works -> use it (sync).
     2. Otherwise -> keep an in-memory cache and persist it to
        "prompt-studio-data.json" inside the plugin's data folder
        (uxp.storage.localFileSystem.getDataFolder()), written asynchronously.
   Call Storage.init() (returns a Promise) before using get/set.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});
  var PREFIX = 'promptStudio.v1.';
  var DATA_FILE = 'prompt-studio-data.json';

  function getUxp() {
    try { if (typeof require === 'function') return require('uxp'); } catch (e) { /* not in UXP */ }
    return null;
  }
  function getFs() {
    var uxp = getUxp();
    return uxp && uxp.storage && uxp.storage.localFileSystem ? uxp.storage.localFileSystem : null;
  }

  function localStorageWorks() {
    try {
      if (!window.localStorage) return false;
      var k = PREFIX + '__test';
      window.localStorage.setItem(k, '1');
      var ok = window.localStorage.getItem(k) === '1';
      window.localStorage.removeItem(k);
      return ok;
    } catch (e) { return false; }
  }

  var backend = 'memory';
  var cache = {};
  var writeTimer = null;
  var dataFolder = null;

  function writeFileCache() {
    if (backend !== 'file' || !dataFolder) return;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function () {
      var text = JSON.stringify(cache);
      var formats = getUxp().storage.formats;
      dataFolder.createFile(DATA_FILE, { overwrite: true })
        .then(function (file) { return file.write(text, formats ? { format: formats.utf8 } : undefined); })
        .catch(function (e) { console.error('[Storage] file write failed', e); });
    }, 250);
  }

  /** CEP (legacy "Extensions" panels) exposes window.cep natively. */
  function getCep() { return window.cep && window.cep.fs ? window.cep : null; }

  var Storage = {
    isUXP: !!getUxp(),
    isCEP: !!getCep(),
    backend: function () { return backend; },

    /** Must be awaited once at startup. */
    init: function () {
      if (localStorageWorks()) { backend = 'local'; return Promise.resolve('local'); }
      var fs = getFs();
      if (!fs || !fs.getDataFolder) { backend = 'memory'; console.warn('[Storage] no persistent storage available — using memory only.'); return Promise.resolve('memory'); }
      return fs.getDataFolder().then(function (folder) {
        dataFolder = folder;
        backend = 'file';
        return folder.getEntry(DATA_FILE).then(function (entry) {
          return entry.read();
        }).then(function (text) {
          try { cache = JSON.parse(text) || {}; } catch (e) { console.error('[Storage] data file corrupted, starting fresh', e); cache = {}; }
          return 'file';
        }).catch(function () { cache = {}; return 'file'; }); // file does not exist yet
      }).catch(function (e) {
        console.error('[Storage] data folder unavailable', e);
        backend = 'memory';
        return 'memory';
      });
    },

    get: function (key, fallback) {
      try {
        if (backend === 'local') {
          var raw = window.localStorage.getItem(PREFIX + key);
          if (raw === null || raw === undefined) return fallback;
          return JSON.parse(raw);
        }
        return cache.hasOwnProperty(key) ? JSON.parse(JSON.stringify(cache[key])) : fallback;
      } catch (e) {
        console.error('[Storage] read failed', key, e);
        throw new Error('Could not read saved data (' + key + '). It may be corrupted.');
      }
    },

    set: function (key, value) {
      try {
        if (backend === 'local') window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        else { cache[key] = JSON.parse(JSON.stringify(value)); writeFileCache(); }
        return true;
      } catch (e) {
        console.error('[Storage] write failed', key, e);
        throw new Error('Could not save data (' + key + '). Storage may be full or unavailable.');
      }
    },

    remove: function (key) {
      try {
        if (backend === 'local') window.localStorage.removeItem(PREFIX + key);
        else { delete cache[key]; writeFileCache(); }
      } catch (e) { console.error(e); }
    },

    /** Save a text file. Resolves true if saved, false if cancelled. */
    saveTextFile: function (suggestedName, text) {
      var cep = getCep();
      if (cep) {
        return new Promise(function (resolve, reject) {
          var r = cep.fs.showSaveDialogEx('Export Presets', '', ['json'], suggestedName);
          if (!r || r.err || !r.data) return resolve(false);
          var path = String(r.data);
          if (!/\.json$/i.test(path)) path += '.json';
          var w = cep.fs.writeFile(path, text);
          if (w && w.err) return reject(new Error('Could not write the file (error ' + w.err + ').'));
          resolve(true);
        });
      }
      var fs = getFs();
      if (fs) {
        return fs.getFileForSaving(suggestedName, { types: ['json'] })
          .then(function (file) {
            if (!file) return false;
            return file.write(text).then(function () { return true; });
          });
      }
      return new Promise(function (resolve) {
        var blob = new Blob([text], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
        resolve(true);
      });
    },

    /** Open a text file. Resolves with its content, or null if cancelled. */
    openTextFile: function () {
      var cep = getCep();
      if (cep) {
        return new Promise(function (resolve, reject) {
          var r = cep.fs.showOpenDialogEx(false, false, 'Import Presets', '', ['json']);
          if (!r || r.err || !r.data || !r.data.length) return resolve(null);
          var f = cep.fs.readFile(r.data[0]);
          if (f && f.err) return reject(new Error('Could not read the file (error ' + f.err + ').'));
          resolve(f.data);
        });
      }
      var fs = getFs();
      if (fs) {
        return fs.getFileForOpening({ types: ['json'] })
          .then(function (file) {
            if (!file) return null;
            if (Array.isArray(file)) file = file[0];
            return file ? file.read() : null;
          });
      }
      return new Promise(function (resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return resolve(null);
          var r = new FileReader();
          r.onload = function () { resolve(String(r.result)); };
          r.onerror = function () { reject(new Error('Could not read the selected file.')); };
          r.readAsText(f);
        };
        input.click();
      });
    },

    /**
     * Copy text to clipboard. UXP (PS 22+) exposes navigator.clipboard.setContent;
     * browsers expose writeText. Rejects if neither works so the UI can fall back
     * to selecting the text for manual Ctrl/Cmd+C.
     */
    copyText: function (text) {
      var nav = window.navigator || {};
      var clip = nav.clipboard;
      // CEP panels run from file:// — execCommand('copy') is the reliable path there.
      if (getCep()) {
        return legacyCopy(text).catch(function () {
          return clip && clip.writeText ? clip.writeText(text) : Promise.reject(new Error('Clipboard is not available.'));
        });
      }
      try {
        if (clip && typeof clip.setContent === 'function') {
          return Promise.resolve(clip.setContent({ 'text/plain': text }));
        }
        if (clip && typeof clip.writeText === 'function') {
          return clip.writeText(text).catch(function () { return legacyCopy(text); });
        }
      } catch (e) { return Promise.reject(e); }
      return legacyCopy(text);
    }
  };

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        if (!document.execCommand) return reject(new Error('Clipboard is not available.'));
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('Clipboard is not available.'));
      } catch (e) { reject(e); }
    });
  }

  PS.Storage = Storage;
})();
