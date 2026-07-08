/* ===========================================================
   Sections — les 6 pages de l'application
   Chaque fonction renvoie un noeud DOM prêt à afficher.
   =========================================================== */
window.Sections = (function () {
  const { h, fmt } = UI;

  // palette catégorielle validée (mode clair) — attribution stable par entité
  const CAT_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
  function colorMap(names) {
    const sorted = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    const map = {};
    sorted.forEach((n, i) => { map[n] = CAT_COLORS[i % CAT_COLORS.length]; });
    return map;
  }

  // état de vue local (persistant entre re-rendus)
  const vs = {
    outreach: { q: '', statut: '', type: '' },
    todo: { view: 'list', calMonth: fmt.thisMonth(), focusAdd: false },
    finances: { month: '' },
    shop: { cat: 'all', view: 'edit' },
  };

  /* =========================================================
     1) DÉMARCHAGE
     ========================================================= */
  const STATUT_OUTREACH = [
    { name: 'À contacter', emoji: '📩', color: '#a99f97' },
    { name: 'Envoyé', emoji: '🔵', color: '#2a78d6' },
    { name: 'Relancé', emoji: '🔄', color: '#d9a441' },
    { name: 'En discussion', emoji: '💬', color: '#7c5cc4' },
    { name: 'Accepté', emoji: '🟢', color: '#2f9e6b' },
    { name: 'Refusé', emoji: '🟠', color: '#e8853f' },
  ];
  const STATUTS_OUTREACH = STATUT_OUTREACH.map((s) => s.name);
  const STATUT_MAP = {};
  STATUT_OUTREACH.forEach((s) => { STATUT_MAP[s.name] = s; });
  const TYPES_OUTREACH = ['Édition', 'Jeux', 'Marque'];

  function outreach() {
    const rows = Store.list('outreach');
    const root = h('div');

    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Ajouter un contact',
      onclick: () => Store.add('outreach', {
        nom: '', type: 'Édition', pays: '', contact: '',
        dateEnvoi: '', relance: '', statut: 'À contacter', notes: '',
      }),
    });
    root.appendChild(UI.pageHead('📮', 'Démarchage', 'Suivi de tes prises de contact — éditions, jeux, marques.', addBtn));

    // barre d'outils : recherche + filtres
    const search = h('input', { class: 'field search', type: 'search', placeholder: '🔍 Rechercher (nom, pays, contact…)', value: vs.outreach.q });
    const fStatut = selectFilter(['Tous les statuts', ...STATUTS_OUTREACH], vs.outreach.statut);
    const fType = selectFilter(['Tous les types', ...TYPES_OUTREACH], vs.outreach.type);
    const toolbar = h('div', { class: 'toolbar' }, [search, fStatut, fType]);
    root.appendChild(toolbar);

    if (!rows.length) {
      root.appendChild(UI.empty('📭', 'Aucun contact pour l’instant. Clique sur « Ajouter un contact ».'));
      return root;
    }

    const today = fmt.todayISO();
    const table = UI.editableTable({
      coll: 'outreach',
      minWidth: 980,
      rows,
      rowClass: (r) => (r.relance && r.relance <= today && r.statut !== 'Accepté' && r.statut !== 'Refusé') ? 'due' : '',
      columns: [
        { key: '_dot', label: '', readonly: true, width: '30px',
          render: (r) => { const s = STATUT_MAP[r.statut] || {}; return `<span class="status-dot" title="${r.statut || ''}" style="background:${s.color || '#ccc'}"></span>`; } },
        { key: 'nom', label: 'Nom', type: 'text', width: '15%', placeholder: 'Nom…' },
        { key: 'type', label: 'Type', type: 'select', width: '10%', options: TYPES_OUTREACH },
        { key: 'pays', label: 'Pays', type: 'text', width: '9%', placeholder: 'Pays' },
        { key: 'contact', label: 'Contact', type: 'text', width: '14%', placeholder: 'email / @' },
        { key: 'dateEnvoi', label: 'Date d’envoi', type: 'date', width: '11%' },
        { key: 'relance', label: 'Relance prévue', type: 'date', width: '11%' },
        { key: 'statut', label: 'Statut', type: 'select', width: '13%',
          options: STATUT_OUTREACH.map((s) => ({ value: s.name, label: `${s.emoji} ${s.name}` })) },
        { key: 'notes', label: 'Note', width: '16%', cell: (coll, row) => noteCellBtn(row) },
      ],
    });
    root.appendChild(table);

    // légende des statuts
    const legend = h('div', { class: 'status-legend' },
      STATUT_OUTREACH.map((s) => h('span', { class: 'lg-item' }, [
        h('span', { class: 'status-dot', style: `background:${s.color}` }),
        document.createTextNode(` ${s.emoji} ${s.name}`),
      ])));
    root.appendChild(legend);

    const hint = h('p', { class: 'sub', style: 'margin-top:8px', html: 'Les lignes surlignées en orangé sont des <b>relances à faire</b> (date de relance atteinte). Clique sur une <b>note</b> pour l’ouvrir en grand.' });
    root.appendChild(hint);

    // filtrage direct dans le DOM (sans re-render → garde le focus)
    const trs = Array.from(table.querySelectorAll('tbody tr'));
    function applyFilter() {
      vs.outreach.q = search.value;
      vs.outreach.statut = fStatut.selectedIndex > 0 ? fStatut.value : '';
      vs.outreach.type = fType.selectedIndex > 0 ? fType.value : '';
      const q = search.value.trim().toLowerCase();
      rows.forEach((r, i) => {
        const hay = [r.nom, r.pays, r.contact, r.notes, r.type, r.statut].join(' ').toLowerCase();
        const okQ = !q || hay.includes(q);
        const okS = !vs.outreach.statut || r.statut === vs.outreach.statut;
        const okT = !vs.outreach.type || r.type === vs.outreach.type;
        trs[i].style.display = (okQ && okS && okT) ? '' : 'none';
      });
    }
    search.addEventListener('input', applyFilter);
    fStatut.addEventListener('change', applyFilter);
    fType.addEventListener('change', applyFilter);
    applyFilter();

    return root;
  }

  function selectFilter(options, current) {
    const sel = h('select', { class: 'field' });
    options.forEach((o, i) => {
      const opt = h('option', { value: i === 0 ? '' : o }, o);
      if (o === current) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  // cellule Note : aperçu cliquable qui ouvre la note complète en bulle
  function noteCellBtn(row) {
    const txt = (row.notes || '').trim();
    const short = txt ? (txt.length > 32 ? txt.slice(0, 32) + '…' : txt) : '';
    return h('button', {
      class: 'note-cell' + (txt ? '' : ' is-empty'),
      title: txt ? 'Voir / modifier la note' : 'Ajouter une note',
      onclick: () => openNoteEditor(row.id),
    }, [
      h('span', { class: 'note-cell-ico', text: txt ? '📝' : '+' }),
      h('span', { class: 'note-cell-txt', text: txt ? short : 'Ajouter une note' }),
    ]);
  }

  function openNoteEditor(id) {
    const r = Store.list('outreach').find((x) => x.id === id);
    if (!r) return;
    const ta = h('textarea', { class: 'field big-area', style: 'width:100%;min-height:220px', placeholder: 'Écris ta note ici…' });
    ta.value = r.notes || '';
    ta.addEventListener('input', () => Store.update('outreach', id, { notes: ta.value }, { silent: true }));
    const close = UI.openModal({
      title: `📝 Note — ${r.nom || 'contact'}`,
      wide: true,
      body: [ta],
      footer: [h('button', { class: 'btn btn-primary', text: 'Terminé', onclick: () => close() })],
      onClose: () => App.render(),
    });
    setTimeout(() => ta.focus(), 30);
  }

  /* =========================================================
     2) TO-DO
     ========================================================= */
  function todo() {
    const todos = Store.list('todos');
    const root = h('div');
    root.appendChild(UI.pageHead('✅', 'To-do list', 'Coche tes tâches, marque l’urgent 🚨 et suis ta progression.'));

    // progression
    const total = todos.length;
    const done = todos.filter((t) => t.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const prog = h('div', { class: 'card card-pad progress-card' }, [
      h('div', { class: 'progress-ring-num', text: pct + '%' }),
      h('div', { style: 'flex:1;min-width:180px' }, [
        h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
        h('div', { class: 'progress-meta', style: 'margin-top:8px', text: `${done} sur ${total} tâche${total > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''}` }),
      ]),
    ]);
    root.appendChild(prog);

    // sélecteur de vue
    const seg = h('div', { class: 'seg', style: 'margin:18px 0 14px' }, [
      segBtn('Liste', vs.todo.view === 'list', () => { vs.todo.view = 'list'; App.render(); }),
      segBtn('Calendrier', vs.todo.view === 'cal', () => { vs.todo.view = 'cal'; App.render(); }),
    ]);
    root.appendChild(seg);

    if (vs.todo.view === 'cal') { root.appendChild(calendar(todos)); return root; }

    // --- ajout rapide ---
    const addInput = h('input', { class: 'field', style: 'flex:1', placeholder: 'Nouvelle tâche… (Entrée pour ajouter)' });
    const doAdd = () => {
      const v = addInput.value.trim();
      if (!v) return;
      Store.add('todos', { tache: v, done: false, urgent: false, date: '' });
      vs.todo.focusAdd = true;
    };
    addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
    const addRow = h('div', { class: 'toolbar' }, [addInput, h('button', { class: 'btn btn-primary', text: '+ Ajouter', onclick: doAdd })]);
    root.appendChild(addRow);

    if (!todos.length) { root.appendChild(UI.empty('🗒️', 'Aucune tâche. Ajoute ta première ci-dessus !')); return root; }

    // tri : non terminées d'abord, urgent en tête, puis terminées
    const order = todos.map((t, i) => ({ t, i }));
    order.sort((a, b) => {
      if (a.t.done !== b.t.done) return a.t.done ? 1 : -1;
      if (!a.t.done && a.t.urgent !== b.t.urgent) return a.t.urgent ? -1 : 1;
      return a.i - b.i;
    });

    const list = h('div', { class: 'todo-list' });
    order.forEach(({ t }) => list.appendChild(todoRow(t)));
    root.appendChild(list);

    if (vs.todo.focusAdd) { vs.todo.focusAdd = false; setTimeout(() => addInput.focus(), 0); }
    return root;
  }

  function todoRow(t) {
    const cls = 'todo' + (t.done ? ' done' : '') + (t.urgent && !t.done ? ' urgent' : '');
    const check = h('input', { class: 'check', type: 'checkbox' });
    check.checked = t.done;
    check.addEventListener('change', () => Store.update('todos', t.id, { done: check.checked }));

    const txt = h('input', { class: 'todo-txt', value: t.tache });
    txt.addEventListener('input', () => Store.update('todos', t.id, { tache: txt.value }, { silent: true }));

    const date = h('input', { class: 'todo-date', type: 'date', title: 'Échéance', value: t.date || '' });
    date.addEventListener('change', () => Store.update('todos', t.id, { date: date.value }));

    const urgent = h('button', { class: 'urgent-btn' + (t.urgent ? ' on' : ''), title: 'Marquer urgent', text: '🚨',
      onclick: () => Store.update('todos', t.id, { urgent: !t.urgent }) });

    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: () => Store.remove('todos', t.id) });

    return h('div', { class: cls }, [check, txt, date, urgent, del]);
  }

  function calendar(todos) {
    const wrap = h('div');
    const [y, m] = vs.todo.calMonth.split('-').map(Number);
    const cur = new Date(y, m - 1, 1);
    const title = cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const nav = h('div', { class: 'cal-head' }, [
      h('button', { class: 'icon-btn', text: '‹', title: 'Mois précédent', onclick: () => { shiftMonth(-1); } }),
      h('h3', { text: title }),
      h('button', { class: 'icon-btn', text: '›', title: 'Mois suivant', onclick: () => { shiftMonth(1); } }),
    ]);
    wrap.appendChild(nav);

    const grid = h('div', { class: 'cal-grid' });
    ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach((d) => grid.appendChild(h('div', { class: 'cal-dow', text: d })));

    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let i = 0; i < firstDow; i++) grid.appendChild(h('div', { class: 'cal-cell empty-cell' }));

    const todayISO = fmt.todayISO();
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = h('div', { class: 'cal-cell' + (iso === todayISO ? ' today' : '') });
      cell.appendChild(h('div', { class: 'cal-num', text: String(d) }));
      todos.filter((t) => t.date === iso).forEach((t) => {
        cell.appendChild(h('div', {
          class: 'cal-task' + (t.done ? ' done' : '') + (t.urgent && !t.done ? ' urgent' : ''),
          title: t.tache, text: (t.urgent ? '🚨 ' : '') + (t.tache || '(sans titre)'),
        }));
      });
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    wrap.appendChild(h('p', { class: 'sub', style: 'margin-top:12px', text: 'Astuce : donne une échéance à tes tâches (colonne date dans la vue Liste) pour les voir ici.' }));
    return wrap;
  }

  function shiftMonth(delta) {
    let [y, m] = vs.todo.calMonth.split('-').map(Number);
    m += delta;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    vs.todo.calMonth = `${y}-${String(m).padStart(2, '0')}`;
    App.render();
  }

  function segBtn(label, active, onclick) {
    return h('button', { class: active ? 'active' : '', text: label, onclick });
  }

  /* =========================================================
     3) RÉSEAUX
     ========================================================= */
  const NETS = [
    { key: 'instagram', name: 'Instagram', color: 'var(--series-3)' },
    { key: 'tiktok', name: 'TikTok', color: 'var(--series-1)' },
    { key: 'threads', name: 'Threads', color: 'var(--series-2)' },
  ];

  function social() {
    const raw = Store.list('social');
    const rows = raw.slice().sort((a, b) => (a.mois || '').localeCompare(b.mois || ''));
    const root = h('div');

    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Ajouter un mois',
      onclick: () => Store.add('social', { mois: fmt.thisMonth(), instagram: 0, tiktok: 0, threads: 0 }),
    });
    root.appendChild(UI.pageHead('📱', 'Contenu réseaux', 'Abonnés par réseau, évolution mensuelle et tendance.', addBtn));

    // KPI : dernier mois + delta total
    if (rows.length) {
      const last = rows[rows.length - 1];
      const prev = rows.length > 1 ? rows[rows.length - 2] : null;
      const kpis = h('div', { class: 'kpis' });
      NETS.forEach((net) => {
        const v = last[net.key] || 0;
        const pv = prev ? (prev[net.key] || 0) : null;
        kpis.appendChild(kpiTile(net.name, fmt.num(v) + ' abonnés', deltaPct(v, pv)));
      });
      const totalNow = NETS.reduce((s, n) => s + (last[n.key] || 0), 0);
      const totalPrev = prev ? NETS.reduce((s, n) => s + (prev[n.key] || 0), 0) : null;
      kpis.appendChild(kpiTile('Total', fmt.num(totalNow), deltaPct(totalNow, totalPrev)));
      root.appendChild(kpis);
    }

    // graphique courbe de croissance
    const chartCard = h('div', { class: 'card card-pad' }, [
      h('div', { class: 'card-title', text: 'Courbe de croissance' }),
    ]);
    const host = h('div', { class: 'chart-wrap' });
    chartCard.appendChild(host);
    root.appendChild(chartCard);
    // (dessiné après insertion dans le DOM — voir App.afterRender)
    App.defer(() => {
      Charts.line(host, {
        xLabels: rows.map((r) => fmt.monthLabel(r.mois)),
        series: NETS.map((n) => ({ name: n.name, color: n.color, values: rows.map((r) => Number(r[n.key]) || 0) })),
        formatY: (v) => fmt.compact(v),
        height: 260,
      });
      Charts.legend(chartCard, NETS);
    });

    if (!raw.length) {
      root.appendChild(UI.empty('📈', 'Ajoute un premier mois pour démarrer le suivi.'));
      return root;
    }

    // tableau mensuel
    const tableCard = h('div', { class: 'card', style: 'margin-top:18px' });
    const table = UI.editableTable({
      coll: 'social',
      minWidth: 720,
      rows, // triés
      columns: [
        { key: 'mois', label: 'Mois', type: 'month', width: '16%' },
        { key: 'instagram', label: 'Instagram', type: 'number', min: 0, align: 'right', width: '15%' },
        { key: 'tiktok', label: 'TikTok', type: 'number', min: 0, align: 'right', width: '15%' },
        { key: 'threads', label: 'Threads', type: 'number', min: 0, align: 'right', width: '15%' },
        { key: 'total', label: 'Total', readonly: true, align: 'right', render: (r) => fmt.num(NETS.reduce((s, n) => s + (Number(r[n.key]) || 0), 0)) },
        { key: 'evo', label: 'Évolution', readonly: true, render: (r) => evoCell(rows, r) },
      ],
    });
    tableCard.appendChild(table);
    root.appendChild(tableCard);
    return root;
  }

  function evoCell(rows, r) {
    const i = rows.indexOf(r);
    if (i <= 0) return '<span class="pct flat">—</span>';
    const now = NETS.reduce((s, n) => s + (Number(r[n.key]) || 0), 0);
    const prev = NETS.reduce((s, n) => s + (Number(rows[i - 1][n.key]) || 0), 0);
    if (!prev) return '<span class="pct flat">—</span>';
    const p = ((now - prev) / prev) * 100;
    const cls = p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat';
    const arrow = p > 0.05 ? '▲' : p < -0.05 ? '▼' : '•';
    return `<span class="pct ${cls}">${arrow} ${p > 0 ? '+' : ''}${p.toFixed(1)} %</span>`;
  }

  function deltaPct(now, prev) {
    if (prev == null || prev === 0) return null;
    const p = ((now - prev) / prev) * 100;
    return { p, cls: p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat' };
  }

  function kpiTile(label, value, delta) {
    const kids = [h('div', { class: 'k-label', text: label }), h('div', { class: 'k-value', text: value })];
    if (delta) kids.push(h('div', { class: 'k-delta ' + delta.cls, text: (delta.p > 0 ? '▲ +' : delta.p < 0 ? '▼ ' : '• ') + delta.p.toFixed(1) + ' % vs mois précédent' }));
    return h('div', { class: 'kpi' }, kids);
  }

  /* =========================================================
     4) BOUTIQUE
     ========================================================= */
  const STATUTS_SHOP = ['En préparation', 'En ligne'];

  function shop() {
    const products = Store.list('shop');
    const cats = Store.categories();
    const root = h('div');

    // la catégorie active reçoit les nouveaux produits (sinon la 1re)
    const defaultCat = (vs.shop.cat !== 'all' && cats.includes(vs.shop.cat)) ? vs.shop.cat : (cats[0] || '');
    const actions = h('div', { class: 'page-actions' }, [
      h('button', { class: 'btn btn-primary', text: '+ Ajouter un produit',
        onclick: () => Store.add('shop', { nom: '', prix: 0, statut: 'En préparation', stock: '', photo: '', categorie: defaultCat }) }),
    ]);
    root.appendChild(UI.pageHead('🛍️', 'Boutique', 'Ton classeur produits, rangé par catégorie — prêt pour octobre.', actions));

    // onglets catégories
    const tabs = h('div', { class: 'tabs' });
    const countAll = products.length;
    tabs.appendChild(tab('Tous', countAll, vs.shop.cat === 'all', () => { vs.shop.cat = 'all'; App.render(); }));
    cats.forEach((c) => {
      const cnt = products.filter((p) => p.categorie === c).length;
      tabs.appendChild(tab(c, cnt, vs.shop.cat === c, () => { vs.shop.cat = c; App.render(); }));
    });
    tabs.appendChild(h('button', { class: 'tab tab-manage', text: '⚙️ Gérer', title: 'Ajouter / renommer / supprimer une catégorie', onclick: manageCategories }));
    root.appendChild(tabs);

    // bascule édition / aperçu vitrine
    const seg = h('div', { class: 'seg', style: 'margin-bottom:16px' }, [
      segBtn('✏️ Édition', vs.shop.view === 'edit', () => { vs.shop.view = 'edit'; App.render(); }),
      segBtn('👁️ Aperçu boutique', vs.shop.view === 'preview', () => { vs.shop.view = 'preview'; App.render(); }),
    ]);
    root.appendChild(seg);

    // produits filtrés
    const filtered = vs.shop.cat === 'all' ? products : products.filter((p) => p.categorie === vs.shop.cat);
    if (!filtered.length) {
      root.appendChild(UI.empty('🛒', vs.shop.cat === 'all' ? 'Aucun produit. Ajoute ta première création !' : `Aucun produit dans « ${vs.shop.cat} » pour l’instant.`));
      return root;
    }

    if (vs.shop.view === 'preview') {
      const grid = h('div', { class: 'store-grid' });
      filtered.forEach((p) => grid.appendChild(storeItem(p)));
      root.appendChild(grid);
    } else {
      root.appendChild(h('p', { class: 'sub', style: 'margin:-6px 0 12px', html: '↕️ Glisse la poignée <b>⠿</b> (en haut à gauche d’un produit) pour les réordonner.' }));
      const grid = h('div', { class: 'shop-grid' });
      filtered.forEach((p) => grid.appendChild(productCard(p, cats)));
      root.appendChild(grid);
    }
    return root;
  }

  function tab(label, count, active, onclick) {
    return h('button', { class: 'tab' + (active ? ' active' : ''), onclick }, [
      document.createTextNode(label), h('span', { class: 'count', text: String(count) }),
    ]);
  }

  // vitrine (lecture seule, comme la vraie boutique)
  function storeItem(p) {
    const photo = h('div', { class: 'store-photo' });
    if (p.photo) photo.appendChild(h('img', { src: p.photo, alt: p.nom || 'produit' }));
    else photo.appendChild(h('span', { class: 'ph', text: '📷' }));
    return h('div', { class: 'store-item' }, [
      photo,
      h('div', { class: 'store-body' }, [
        p.categorie ? h('div', { class: 'store-cat', text: p.categorie }) : null,
        h('div', { class: 'store-name', text: p.nom || 'Sans nom' }),
        h('div', { class: 'store-price', text: p.prix ? fmt.money2(p.prix) : '—' }),
        h('div', { style: 'margin-top:6px' }, [h('span', { class: 'badge ' + (p.statut === 'En ligne' ? 'online' : 'prep'), text: p.statut })]),
      ].filter(Boolean)),
    ]);
  }

  function manageCategories() {
    function bodyList() {
      const list = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
      Store.categories().forEach((c) => {
        list.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h('span', { style: 'flex:1;font-weight:600', text: c }),
          h('button', { class: 'btn btn-ghost btn-sm', text: '✏️ Renommer', onclick: async () => {
            const nn = await UI.prompt('Nouveau nom de la catégorie', c, 'Renommer');
            if (nn) { Store.renameCategory(c, nn); rerender(); }
          } }),
          h('button', { class: 'btn btn-ghost btn-sm btn-danger', text: '🗑', onclick: async () => {
            if (await UI.confirm(`Supprimer la catégorie « ${c} » ? Les produits associés seront conservés mais sans catégorie.`)) { Store.removeCategory(c); rerender(); }
          } }),
        ]));
      });
      const addBtn = h('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:6px;align-self:flex-start', text: '+ Nouvelle catégorie', onclick: async () => {
        const nn = await UI.prompt('Nom de la nouvelle catégorie', '', 'Ajouter');
        if (nn) { Store.addCategory(nn); rerender(); }
      } });
      return [list, addBtn];
    }
    let close;
    function rerender() { if (close) close(); open(); }
    function open() {
      close = UI.openModal({ title: 'Gérer les catégories', body: bodyList(),
        footer: [h('button', { class: 'btn btn-primary', text: 'Fermer', onclick: () => close() })],
        onClose: () => App.render() });
    }
    open();
  }

  function productCard(p, cats) {
    cats = cats || Store.categories();
    // photo
    const photo = h('div', { class: 'product-photo' });
    if (p.photo) photo.appendChild(h('img', { src: p.photo, alt: p.nom || 'produit' }));
    else photo.appendChild(h('span', { class: 'ph', text: '📷' }));

    const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      try {
        UI.toast('Traitement de la photo…', 1200);
        const dataUrl = await UI.resizeImage(f);
        Store.update('shop', p.id, { photo: dataUrl });
      } catch (e) { UI.toast('⚠️ Photo illisible'); }
    });
    photo.appendChild(fileInput);
    photo.appendChild(h('button', { class: 'edit-photo', text: p.photo ? '🖼 Changer' : '＋ Photo', onclick: () => fileInput.click() }));

    // corps
    const name = h('input', { class: 'product-name', placeholder: 'Nom du produit', value: p.nom });
    name.addEventListener('input', () => Store.update('shop', p.id, { nom: name.value }, { silent: true }));

    const price = h('input', { class: 'field price-input', type: 'number', min: '0', step: 'any', value: p.prix, 'aria-label': 'Prix' });
    price.addEventListener('input', () => Store.update('shop', p.id, { prix: parseFloat(price.value) || 0 }, { silent: true }));

    const statut = h('select', { class: 'field', style: 'padding:6px 8px;font-size:13px' });
    STATUTS_SHOP.forEach((s) => { const o = h('option', { value: s }, s); if (s === p.statut) o.selected = true; statut.appendChild(o); });
    statut.addEventListener('change', () => Store.update('shop', p.id, { statut: statut.value }));

    const stock = h('input', { class: 'field', style: 'font-size:13px', placeholder: 'Stock / dispo (ex : 12, sur commande…)', value: p.stock });
    stock.addEventListener('input', () => Store.update('shop', p.id, { stock: stock.value }, { silent: true }));

    // catégorie
    const cat = h('select', { class: 'field cat-select', style: 'width:100%' });
    cat.appendChild(h('option', { value: '' }, '— Sans catégorie —'));
    cats.forEach((c) => { const o = h('option', { value: c }, c); if (c === p.categorie) o.selected = true; cat.appendChild(o); });
    cat.addEventListener('change', () => Store.update('shop', p.id, { categorie: cat.value }));

    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: async () => { if (await UI.confirm('Supprimer ce produit ?')) Store.remove('shop', p.id); } });

    const body = h('div', { class: 'product-body' }, [
      name,
      cat,
      h('div', { class: 'product-row' }, [h('span', { class: 'nowrap', style: 'display:flex;align-items:center;gap:4px' }, [price, h('span', { class: 'muted', text: '€' })]), statut]),
      stock,
      h('div', { class: 'product-row', style: 'margin-top:2px' }, [h('span', { class: 'badge ' + (p.statut === 'En ligne' ? 'online' : 'prep'), text: p.statut }), del]),
    ]);

    // glisser-déposer pour réordonner (poignée = source, carte = cible)
    const grip = h('div', { class: 'prod-grip', text: '⠿', title: 'Glisser pour réordonner', draggable: true });
    const card = h('div', { class: 'product' }, [grip, photo, body]);
    card.dataset.id = p.id;
    grip.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); card.classList.add('dragging'); });
    grip.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault(); card.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      if (id && id !== p.id) Store.reorder('shop', id, p.id);
    });
    return card;
  }

  /* =========================================================
     5) IDÉES (tableau blanc)
     ========================================================= */
  const NOTE_COLORS = ['#fbeec2', '#f7d9df', '#d9ead3', '#d6e6f5', '#e7ddf3', '#ffffff'];
  let topZ = 1;
  const fallbackX = (i) => 16 + (i % 4) * 262;
  const fallbackY = (i) => 16 + Math.floor(i / 4) * 250;

  function ideas() {
    const notes = Store.list('ideas');
    topZ = notes.reduce((m, n) => Math.max(m, n.z || 1), 1);
    const root = h('div');
    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Nouvelle idée',
      onclick: () => {
        const k = Store.list('ideas').length;
        Store.add('ideas', { ref: '', lien: '', note: '', color: NOTE_COLORS[0], image: '', sketch: '',
          x: 24 + (k % 6) * 34, y: 24 + (k % 6) * 30, w: 244, z: ++topZ });
      },
    });
    root.appendChild(UI.pageHead('💡', 'Idées', 'Ton tableau blanc : déplace, redimensionne, colle des images et dessine.', addBtn));
    root.appendChild(h('p', { class: 'sub board-hint', style: 'margin:-8px 0 12px', html: '✋ Déplace un post-it par sa <b>poignée ⠿</b> (en haut), redimensionne-le par le <b>coin ↘</b>, et clique <b>⤢</b> pour dessiner / coller une image.' }));

    if (!notes.length) { root.appendChild(UI.empty('🧠', 'Colle ta première idée sur le tableau !')); return root; }

    let maxR = 900, maxB = 520;
    const sizer = h('div', { style: 'position:relative' });
    notes.forEach((n, i) => {
      sizer.appendChild(noteCard(n, i));
      const x = n.x ?? fallbackX(i), y = n.y ?? fallbackY(i);
      maxR = Math.max(maxR, x + (n.w || 244) + 40);
      maxB = Math.max(maxB, y + (n.h || 240) + 40);
    });
    sizer.style.width = maxR + 'px';
    sizer.style.height = maxB + 'px';
    root.appendChild(h('div', { class: 'board-free', style: 'height:74vh' }, [sizer]));
    return root;
  }

  function noteCard(n, i) {
    const ref = h('input', { class: 'note-ref', placeholder: 'Référence / inspiration', value: n.ref });
    ref.addEventListener('input', () => Store.update('ideas', n.id, { ref: ref.value }, { silent: true }));

    const linkInput = h('input', { class: 'note-ref', style: 'font-weight:500;font-size:12.5px', placeholder: '🔗 Lien (https://…)', value: n.lien });
    linkInput.addEventListener('input', () => Store.update('ideas', n.id, { lien: linkInput.value }, { silent: true }));
    const linkPreview = n.lien
      ? h('a', { class: 'note-link', href: normalizeUrl(n.lien), target: '_blank', rel: 'noopener', text: '↗ Ouvrir le lien' })
      : null;

    const noteTa = h('textarea', { class: 'note-note', rows: 3, placeholder: 'Note personnelle…' });
    noteTa.value = n.note;
    const autoGrow = () => { noteTa.style.height = 'auto'; noteTa.style.height = noteTa.scrollHeight + 'px'; };
    noteTa.addEventListener('input', () => { Store.update('ideas', n.id, { note: noteTa.value }, { silent: true }); autoGrow(); });
    setTimeout(autoGrow, 0);

    // médias (image collée/uploadée + dessin)
    const media = h('div', { class: 'note-media' });
    if (n.image) media.appendChild(h('img', { src: n.image, alt: 'image' }));
    if (n.sketch) media.appendChild(h('img', { class: 'thumb-sketch', src: n.sketch, alt: 'dessin' }));

    // couleurs
    const swatches = h('div', { class: 'swatches' });
    NOTE_COLORS.forEach((c) => {
      swatches.appendChild(h('button', { class: 'swatch' + (c === n.color ? ' sel' : ''), style: `background:${c}`, title: 'Couleur',
        onclick: () => Store.update('ideas', n.id, { color: c }) }));
    });

    const expand = h('button', { class: 'icon-btn', title: 'Agrandir / dessiner', text: '⤢', onclick: () => openIdeaEditor(n.id) });
    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑',
      onclick: async () => { if (await UI.confirm('Supprimer cette idée ?')) Store.remove('ideas', n.id); } });

    const grip = h('div', { class: 'note-grip' }, [
      h('span', { class: 'dots', text: '⠿', title: 'Déplacer' }),
      h('div', { class: 'grip-actions' }, [expand, del]),
    ]);
    const body = h('div', { class: 'note-body' },
      [ref, linkInput, linkPreview, media, noteTa, h('div', { class: 'note-foot' }, [swatches])].filter(Boolean));
    const resize = h('div', { class: 'note-resize', title: 'Redimensionner' });

    const x = n.x ?? fallbackX(i), y = n.y ?? fallbackY(i);
    const card = h('div', { class: 'note free' }, [grip, body, resize]);
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.width = (n.w || 244) + 'px';
    if (n.h) card.style.height = n.h + 'px';
    card.style.background = n.color || '#fff';
    card.style.zIndex = n.z || 1;

    // déplacement (par la poignée)
    grip.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.grip-actions')) return;
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      card.classList.add('dragging');
      card.style.zIndex = ++topZ;
      const sx = e.clientX, sy = e.clientY, ox = parseFloat(card.style.left) || 0, oy = parseFloat(card.style.top) || 0;
      const move = (ev) => { card.style.left = Math.max(0, ox + ev.clientX - sx) + 'px'; card.style.top = Math.max(0, oy + ev.clientY - sy) + 'px'; };
      const up = () => {
        grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up);
        card.classList.remove('dragging');
        Store.update('ideas', n.id, { x: parseFloat(card.style.left), y: parseFloat(card.style.top), z: topZ }, { silent: true });
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });

    // redimensionnement (par le coin)
    resize.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      resize.setPointerCapture(e.pointerId);
      const sw = card.offsetWidth, sh = card.offsetHeight, sx = e.clientX, sy = e.clientY;
      const move = (ev) => {
        card.style.width = Math.max(184, sw + ev.clientX - sx) + 'px';
        card.style.height = Math.max(150, sh + ev.clientY - sy) + 'px';
      };
      const up = () => {
        resize.removeEventListener('pointermove', move); resize.removeEventListener('pointerup', up);
        Store.update('ideas', n.id, { w: parseFloat(card.style.width), h: parseFloat(card.style.height) }, { silent: true });
      };
      resize.addEventListener('pointermove', move);
      resize.addEventListener('pointerup', up);
    });

    // coller une image directement sur la note
    card.addEventListener('paste', async (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      try { const dataUrl = await UI.resizeImage(item.getAsFile(), 1000); Store.update('ideas', n.id, { image: dataUrl }); UI.toast('Image ajoutée ✓'); }
      catch (err) { UI.toast('⚠️ Image illisible'); }
    });
    return card;
  }

  /* --- éditeur plein écran d'une idée (image + dessin à la main) --- */
  function openIdeaEditor(id) {
    const n = Store.list('ideas').find((x) => x.id === id);
    if (!n) return;

    const ref = h('input', { class: 'big-input', placeholder: 'Référence / inspiration', value: n.ref });
    ref.addEventListener('input', () => Store.update('ideas', id, { ref: ref.value }, { silent: true }));
    const link = h('input', { class: 'field', style: 'width:100%', placeholder: '🔗 Lien (https://…)', value: n.lien });
    link.addEventListener('input', () => Store.update('ideas', id, { lien: link.value }, { silent: true }));
    const note = h('textarea', { class: 'field big-area', style: 'width:100%', placeholder: 'Note personnelle…' });
    note.value = n.note;
    note.addEventListener('input', () => Store.update('ideas', id, { note: note.value }, { silent: true }));

    // --- bloc image ---
    const imgBox = h('div', { class: 'editor-photo' });
    function renderImg() {
      imgBox.innerHTML = '';
      const cur = Store.list('ideas').find((x) => x.id === id);
      if (cur && cur.image) {
        imgBox.appendChild(h('img', { src: cur.image, alt: 'image' }));
        imgBox.appendChild(h('button', { class: 'btn btn-ghost btn-sm rm', text: '✕ Retirer', onclick: () => { Store.update('ideas', id, { image: '' }, { silent: true }); renderImg(); } }));
      } else {
        imgBox.appendChild(h('div', { class: 'ph-hint', html: '🖼️ Aucune image.<br>Colle une image (Ctrl/Cmd + V) ou' }));
        imgBox.appendChild(h('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:8px', text: '📎 Choisir un fichier', onclick: () => fileIn.click() }));
      }
    }
    const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true });
    fileIn.addEventListener('change', async () => {
      if (!fileIn.files[0]) return;
      try { const d = await UI.resizeImage(fileIn.files[0], 1000); Store.update('ideas', id, { image: d }, { silent: true }); renderImg(); }
      catch (e) { UI.toast('⚠️ Image illisible'); }
    });
    imgBox.appendChild(fileIn);
    renderImg();

    // --- zone de dessin ---
    const pad = drawingPad(n);

    const body = [
      ref, link, note,
      h('label', { class: 'form-row', style: 'gap:6px' }, [h('span', { style: 'font-size:12.5px;font-weight:650;color:var(--ink-soft)', text: 'Image' })]),
      imgBox,
      h('div', { style: 'font-size:12.5px;font-weight:650;color:var(--ink-soft);margin-top:4px', text: 'Écriture / dessin à la main ✍️' }),
      pad.el,
    ];

    const close = UI.openModal({
      title: 'Idée',
      wide: true,
      body,
      footer: [h('button', { class: 'btn btn-primary', text: 'Terminé', onclick: () => close() })],
      onClose: () => { App.render(); },
    });

    // coller une image dans l'éditeur
    document.getElementById('modalHost').addEventListener('paste', async (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'));
      if (!item) return;
      try { const d = await UI.resizeImage(item.getAsFile(), 1000); Store.update('ideas', id, { image: d }, { silent: true }); renderImg(); UI.toast('Image collée ✓'); }
      catch (err) { UI.toast('⚠️ Image illisible'); }
    });
  }

  /* --- carnet de dessin (pointeur + tactile) --- */
  const PEN_COLORS = ['#2c2622', '#c26b7a', '#2a78d6', '#1baf7a', '#eb6834', '#4a3aa7'];
  function drawingPad(n) {
    const W = 680, Hg = 380;
    const canvas = h('canvas', { class: 'pad' });
    canvas.width = W; canvas.height = Hg;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, Hg);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (n.sketch) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, W, Hg); im.src = n.sketch; }

    let color = PEN_COLORS[0], erase = false, drawing = false, last = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (Hg / r.height) };
    };
    const save = () => Store.update('ideas', n.id, { sketch: canvas.toDataURL('image/jpeg', 0.85) }, { silent: true });
    const start = (e) => { drawing = true; last = pos(e); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} if (e.cancelable) e.preventDefault(); };
    const draw = (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = erase ? '#ffffff' : color;
      ctx.lineWidth = erase ? 20 : 3;
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; if (e.cancelable) e.preventDefault();
    };
    const end = () => { if (drawing) { drawing = false; save(); } };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    // outils
    const colors = h('div', { class: 'pad-colors' });
    const swEls = [];
    PEN_COLORS.forEach((c) => {
      const sw = h('button', { class: 'pad-color', style: `background:${c}`, title: 'Couleur',
        onclick: () => { color = c; erase = false; refreshTools(); } });
      swEls.push({ c, sw }); colors.appendChild(sw);
    });
    const eraser = h('button', { class: 'btn btn-ghost btn-sm', text: '🩹 Gomme', onclick: () => { erase = !erase; refreshTools(); } });
    const clear = h('button', { class: 'btn btn-ghost btn-sm', text: '🗑 Effacer tout', onclick: async () => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, Hg); Store.update('ideas', n.id, { sketch: '' }, { silent: true });
    } });
    function refreshTools() {
      swEls.forEach(({ c, sw }) => sw.classList.toggle('sel', c === color && !erase));
      eraser.classList.toggle('btn-primary', erase);
    }
    refreshTools();

    const tools = h('div', { class: 'pad-tools' }, [colors, eraser, clear]);
    const el = h('div', {}, [tools, h('div', { class: 'pad-canvas-wrap' }, [canvas])]);
    return { el };
  }

  function normalizeUrl(u) {
    if (!u) return '#';
    return /^https?:\/\//i.test(u) ? u : 'https://' + u;
  }

  /* =========================================================
     6) FINANCES
     ========================================================= */
  function finances() {
    const raw = Store.list('finances');
    const rows = raw.slice().sort((a, b) => (a.mois || '').localeCompare(b.mois || ''));
    const root = h('div');

    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Ajouter une entrée',
      onclick: () => Store.add('finances', { mois: fmt.thisMonth(), source: '', montant: 0, objectif: 0 }),
    });
    root.appendChild(UI.pageHead('💰', 'Finances', 'Revenus par mois et par source, avec objectifs.', addBtn));

    // agrégats par mois
    const months = uniqueSorted(rows.map((r) => r.mois).filter(Boolean));
    const caByMonth = {}, objByMonth = {};
    months.forEach((m) => {
      caByMonth[m] = rows.filter((r) => r.mois === m).reduce((s, r) => s + (Number(r.montant) || 0), 0);
      objByMonth[m] = Math.max(0, ...rows.filter((r) => r.mois === m).map((r) => Number(r.objectif) || 0));
    });

    // KPI mois en cours
    const cm = fmt.thisMonth();
    const caCur = caByMonth[cm] || 0;
    const objCur = objByMonth[cm] || 0;
    const caTotal = rows.reduce((s, r) => s + (Number(r.montant) || 0), 0);
    const kpis = h('div', { class: 'kpis' }, [
      kpiTile('CA ce mois-ci', fmt.money(caCur), objCur ? { p: (caCur / objCur * 100 - 100), cls: caCur >= objCur ? 'up' : 'down' } : null),
      objCur ? kpiObjectif(caCur, objCur) : kpiTile('Objectif du mois', 'À définir', null),
      kpiTile('Total cumulé', fmt.money(caTotal), null),
    ]);
    root.appendChild(kpis);

    // graphique évolution CA
    const caCard = h('div', { class: 'card card-pad' }, [h('div', { class: 'card-title', text: 'Évolution du chiffre d’affaires' })]);
    const caHost = h('div', { class: 'chart-wrap' });
    caCard.appendChild(caHost);
    root.appendChild(caCard);
    const caSeries = [
      { name: 'CA', color: 'var(--series-1)', values: months.map((m) => caByMonth[m]) },
    ];
    if (months.some((m) => objByMonth[m] > 0)) caSeries.push({ name: 'Objectif', color: 'var(--series-3)', values: months.map((m) => objByMonth[m] || null) });
    App.defer(() => {
      Charts.line(caHost, { xLabels: months.map((m) => fmt.monthLabel(m)), series: caSeries, formatY: (v) => fmt.compact(v) + ' €', height: 250 });
      Charts.legend(caCard, caSeries);
    });

    // détail par source (barres, tous mois confondus)
    const bySource = {};
    rows.forEach((r) => { if (r.source) bySource[r.source] = (bySource[r.source] || 0) + (Number(r.montant) || 0); });
    const srcColors = colorMap(Object.keys(bySource));
    const srcItems = Object.keys(bySource)
      .map((k) => ({ label: k, value: bySource[k], color: srcColors[k] }))
      .sort((a, b) => b.value - a.value);
    const srcCard = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: 'Détail par source de revenu' })]);
    const srcHost = h('div', { class: 'chart-wrap' });
    srcCard.appendChild(srcHost);
    if (srcItems.length) Charts.legend(srcCard, srcItems.map((i) => ({ name: `${i.label} · ${fmt.money(i.value)}`, color: i.color })));
    root.appendChild(srcCard);
    App.defer(() => Charts.bars(srcHost, { items: srcItems, formatV: (v) => fmt.compact(v) + ' €', height: 240 }));

    if (!raw.length) { root.appendChild(UI.empty('🪙', 'Ajoute ta première entrée de revenu.')); return root; }

    // tableau
    const tableCard = h('div', { class: 'card', style: 'margin-top:18px' });
    const table = UI.editableTable({
      coll: 'finances',
      minWidth: 720,
      rows,
      columns: [
        { key: 'mois', label: 'Mois', type: 'month', width: '16%' },
        { key: 'source', label: 'Source de revenu', type: 'text', placeholder: 'Boutique, sponsor, atelier…', width: '28%' },
        { key: 'montant', label: 'Montant', type: 'number', min: 0, align: 'right', width: '15%' },
        { key: 'total', label: 'Total du mois', readonly: true, align: 'right', render: (r) => fmt.money(caByMonth[r.mois] || 0) },
        { key: 'objectif', label: 'Objectif du mois', type: 'number', min: 0, align: 'right', width: '16%' },
      ],
    });
    tableCard.appendChild(table);
    root.appendChild(tableCard);
    return root;
  }

  function kpiObjectif(ca, obj) {
    const pct = Math.min(100, Math.round((ca / obj) * 100));
    return h('div', { class: 'kpi' }, [
      h('div', { class: 'k-label', text: 'Objectif du mois' }),
      h('div', { class: 'k-value', text: fmt.money(obj) }),
      h('div', { class: 'progress-track', style: 'margin-top:9px' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
      h('div', { class: 'k-delta ' + (ca >= obj ? 'up' : 'flat'), style: 'margin-top:6px', text: `${pct}% atteint` }),
    ]);
  }

  function uniqueSorted(arr) { return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b)); }

  return { outreach, todo, social, shop, ideas, finances };
})();
