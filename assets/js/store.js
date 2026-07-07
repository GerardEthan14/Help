/* ===========================================================
   Store — état applicatif + persistance locale
   =========================================================== */
window.Store = (function () {
  const KEY = 'mon-espace-v1';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function defaultState() {
    return {
      settings: { title: 'Mon espace' },
      shopCategories: ['Coloriages', 'Jeux', 'Éveil'],
      outreach: [],
      todos: [],
      social: [],
      shop: [],
      ideas: [],
      finances: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // fusion défensive avec le schéma par défaut
      return Object.assign(defaultState(), parsed, {
        settings: Object.assign({ title: 'Mon espace' }, parsed.settings || {}),
      });
    } catch (e) {
      console.warn('Store: lecture impossible, réinitialisation', e);
      return defaultState();
    }
  }

  let state = load();
  const listeners = [];

  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        // dépassement de quota (souvent : photos trop lourdes)
        window.UI && UI.toast('⚠️ Mémoire pleine — pense à alléger les photos', 4000);
        console.error(e);
      }
    }, 120);
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function commit() {
    persist();
    emit();
  }

  // --- API collections ---
  function get() { return state; }
  function list(coll) { return state[coll] || []; }

  function add(coll, item) {
    const rec = Object.assign({ id: uid() }, item);
    state[coll].push(rec);
    commit();
    return rec;
  }

  function update(coll, id, patch, opts) {
    const row = state[coll].find((r) => r.id === id);
    if (row) {
      Object.assign(row, patch);
      // silent = on persiste sans redessiner (édition en direct d'un champ texte)
      if (opts && opts.silent) persist(); else commit();
    }
    return row;
  }

  function remove(coll, id) {
    state[coll] = state[coll].filter((r) => r.id !== id);
    commit();
  }

  function move(coll, id, dir) {
    const arr = state[coll];
    const i = arr.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    commit();
  }

  function setSetting(k, v) {
    state.settings[k] = v;
    commit();
  }

  // --- catégories boutique ---
  function categories() { return state.shopCategories || []; }
  function addCategory(name) {
    name = (name || '').trim();
    if (name && !state.shopCategories.includes(name)) { state.shopCategories.push(name); commit(); }
  }
  function removeCategory(name) {
    state.shopCategories = state.shopCategories.filter((c) => c !== name);
    state.shop.forEach((p) => { if (p.categorie === name) p.categorie = ''; });
    commit();
  }
  function renameCategory(oldN, newN) {
    newN = (newN || '').trim();
    if (!newN) return;
    const i = state.shopCategories.indexOf(oldN);
    if (i >= 0 && !state.shopCategories.includes(newN)) {
      state.shopCategories[i] = newN;
      state.shop.forEach((p) => { if (p.categorie === oldN) p.categorie = newN; });
      commit();
    }
  }

  function subscribe(fn) { listeners.push(fn); return () => {
    const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1);
  }; }

  // --- Export / Import ---
  function exportFile() {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mon-espace-sauvegarde-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (typeof data !== 'object' || data === null) throw new Error('format');
          state = Object.assign(defaultState(), data, {
            settings: Object.assign({ title: 'Mon espace' }, data.settings || {}),
          });
          commit();
          resolve();
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return {
    get, list, add, update, remove, move,
    setSetting, subscribe, exportFile, importFile, uid,
    categories, addCategory, removeCategory, renameCategory,
  };
})();
