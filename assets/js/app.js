/* ===========================================================
   App — routage, navigation et cycle de rendu
   =========================================================== */
window.App = (function () {
  const SECTIONS = ['outreach', 'todo', 'social', 'shop', 'ideas', 'finances', 'rewards'];
  let current = 'outreach';
  let deferred = [];

  const $ = (id) => document.getElementById(id);

  /* file d'attente exécutée après insertion du DOM (graphiques) */
  function defer(fn) { deferred.push(fn); }

  function currentFromHash() {
    const h = (location.hash || '').replace('#', '');
    return SECTIONS.includes(h) ? h : 'outreach';
  }

  function render() {
    current = currentFromHash();
    const view = $('view');
    const main = $('main');
    const scrollTop = main ? main.scrollTop : 0;

    // navigation active
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.section === current));

    // rendu de la section
    deferred = [];
    let node;
    try {
      node = Sections[current]();
    } catch (e) {
      console.error(e);
      node = UI.h('div', { class: 'empty' }, 'Une erreur est survenue lors de l’affichage de cette page.');
    }
    view.innerHTML = '';
    view.appendChild(node);

    // callbacks différés (graphiques : besoin des dimensions réelles)
    deferred.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    deferred = [];

    if (main) main.scrollTop = scrollTop;
    $('topbarTitle').textContent = Store.get().settings.title || 'Mon espace';
    closeSidebar();
  }

  function go(section) {
    if (location.hash === '#' + section) render();
    else location.hash = '#' + section;
  }

  /* ---- sidebar mobile ---- */
  function openSidebar() { $('sidebar').classList.add('open'); $('scrim').classList.add('show'); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('scrim').classList.remove('show'); }

  function setTitle(v) {
    const t = v && v.trim() ? v.trim() : 'Mon espace';
    document.title = t;
    $('topbarTitle').textContent = t;
  }

  function init() {
    const s = Store.get().settings;

    // titre éditable
    const brand = $('brandTitle');
    brand.value = s.title || 'Mon espace';
    setTitle(brand.value);
    brand.addEventListener('input', () => setTitle(brand.value));
    brand.addEventListener('change', () => Store.setSetting('title', brand.value.trim() || 'Mon espace'));
    brand.addEventListener('keydown', (e) => { if (e.key === 'Enter') brand.blur(); });

    // navigation
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.section)));

    // mobile
    $('hamburger').addEventListener('click', openSidebar);
    $('scrim').addEventListener('click', closeSidebar);

    // export / import
    $('btnExport').addEventListener('click', () => { Store.exportFile(); UI.toast('Sauvegarde téléchargée ✓'); });
    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!(await UI.confirm('Remplacer toutes les données actuelles par cette sauvegarde ?', 'Importer'))) { e.target.value = ''; return; }
      try {
        await Store.importFile(f);
        const brandEl = $('brandTitle');
        brandEl.value = Store.get().settings.title || 'Mon espace';
        setTitle(brandEl.value);
        UI.toast('Sauvegarde importée ✓');
      } catch (err) { UI.toast('⚠️ Fichier invalide'); }
      e.target.value = '';
    });

    // ré-affichage à chaque changement de données.
    // On regroupe les rendus sur une frame (rAF) : ça coalesce les mises à jour
    // et évite qu'un rendu déclenché par un « blur » n'avale le clic en cours.
    let scheduled = false;
    Store.subscribe(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; render(); });
    });

    window.addEventListener('hashchange', render);
    render();
  }

  return { render, defer, go, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
