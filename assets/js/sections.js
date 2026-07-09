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
      root.appendChild(contentNotesCard());
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
    root.appendChild(contentNotesCard());
    return root;
  }

  // espace notes dédié aux réseaux (idées de vidéos / posts)
  function contentNotesCard() {
    const notes = Store.list('socialNotes');
    const card = h('div', { class: 'card card-pad', style: 'margin-top:18px' });
    card.appendChild(h('div', { class: 'card-title' }, [document.createTextNode('💡 Idées de contenu '), h('span', { class: 'muted', style: 'font-weight:500;font-size:13px', text: '· vidéos, posts, collabs…' })]));
    card.appendChild(h('button', { class: 'btn btn-ghost btn-sm', style: 'margin:6px 0 14px', text: '+ Nouvelle idée de contenu', onclick: () => Store.add('socialNotes', { text: '' }) }));
    if (!notes.length) { card.appendChild(h('p', { class: 'sub', style: 'margin:0', text: 'Note ici tes idées de vidéos, de posts, de collabs… un espace rien que pour tes réseaux.' })); return card; }
    const grid = h('div', { class: 'content-notes' });
    notes.forEach((n) => grid.appendChild(contentNote(n)));
    card.appendChild(grid);
    return card;
  }
  function contentNote(n) {
    const ta = h('textarea', { class: 'content-note-ta', placeholder: 'Idée de vidéo / post…' });
    ta.value = n.text || '';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', () => { Store.update('socialNotes', n.id, { text: ta.value }, { silent: true }); grow(); });
    setTimeout(grow, 0);
    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: () => Store.remove('socialNotes', n.id) });
    return h('div', { class: 'content-note' }, [ta, h('div', { class: 'content-note-foot' }, [del])]);
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

    // bascule édition / aperçu / préparation
    const seg = h('div', { class: 'seg', style: 'margin-bottom:16px' }, [
      segBtn('✏️ Édition', vs.shop.view === 'edit', () => { vs.shop.view = 'edit'; App.render(); }),
      segBtn('👁️ Aperçu boutique', vs.shop.view === 'preview', () => { vs.shop.view = 'preview'; App.render(); }),
      segBtn('🚀 Préparation', vs.shop.view === 'prep', () => { vs.shop.view = 'prep'; App.render(); }),
    ]);
    root.appendChild(seg);

    // mode préparation : checklist de lancement + idées de futurs produits
    if (vs.shop.view === 'prep') { root.appendChild(prepView()); return root; }

    // onglets catégories (masqués en préparation)
    const tabs = h('div', { class: 'tabs' });
    const countAll = products.length;
    tabs.appendChild(tab('Tous', countAll, vs.shop.cat === 'all', () => { vs.shop.cat = 'all'; App.render(); }));
    cats.forEach((c) => {
      const cnt = products.filter((p) => p.categorie === c).length;
      tabs.appendChild(tab(c, cnt, vs.shop.cat === c, () => { vs.shop.cat = c; App.render(); }));
    });
    tabs.appendChild(h('button', { class: 'tab tab-manage', text: '⚙️ Gérer', title: 'Ajouter / renommer / supprimer une catégorie', onclick: manageCategories }));
    root.appendChild(tabs);

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

  // --- mode préparation ---
  function prepView() {
    const wrap = h('div');
    wrap.appendChild(h('p', { class: 'sub', style: 'margin:-4px 0 14px', text: 'Prépare ta boutique en douceur pour octobre : coche les étapes et garde toutes tes idées au chaud. 🌷' }));
    wrap.appendChild(h('div', { class: 'grid-2' }, [launchCard(), productIdeasCard()]));
    return wrap;
  }

  function launchCard() {
    const items = Store.list('launchChecklist');
    const done = items.filter((i) => i.done).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const card = h('div', { class: 'card card-pad' });
    card.appendChild(h('div', { class: 'card-title' }, [document.createTextNode('🚀 Checklist de lancement')]));
    card.appendChild(h('div', { class: 'progress-track', style: 'margin:12px 0 6px' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]));
    card.appendChild(h('div', { class: 'sub', style: 'margin:0 0 14px', text: `${done}/${items.length} étape${items.length > 1 ? 's' : ''} prête${done > 1 ? 's' : ''}` }));
    const list = h('div', { class: 'check-list' });
    items.forEach((it) => list.appendChild(launchItem(it)));
    card.appendChild(list);
    card.appendChild(h('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:14px', text: '+ Ajouter une étape', onclick: async () => { const l = await UI.prompt('Nouvelle étape de lancement', '', 'Ajouter'); if (l) Store.add('launchChecklist', { label: l, done: false }); } }));
    return card;
  }
  function launchItem(it) {
    const chk = h('input', { class: 'check', type: 'checkbox' }); chk.checked = it.done;
    chk.addEventListener('change', () => Store.update('launchChecklist', it.id, { done: chk.checked }));
    const label = h('input', { class: 'todo-txt', value: it.label, placeholder: 'Étape…' });
    label.addEventListener('input', () => Store.update('launchChecklist', it.id, { label: label.value }, { silent: true }));
    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: () => Store.remove('launchChecklist', it.id) });
    return h('div', { class: 'check-row' + (it.done ? ' done' : '') }, [chk, label, del]);
  }

  function productIdeasCard() {
    const ideas = Store.list('productIdeas');
    const card = h('div', { class: 'card card-pad' });
    card.appendChild(h('div', { class: 'card-title' }, [document.createTextNode('💭 Idées de futurs produits')]));
    card.appendChild(h('p', { class: 'sub', style: 'margin:2px 0 12px', text: 'Une liste brute d’idées pas encore développées — pour ne jamais perdre l’inspiration.' }));
    card.appendChild(h('button', { class: 'btn btn-ghost btn-sm', style: 'margin-bottom:12px', text: '+ Nouvelle idée produit', onclick: () => Store.add('productIdeas', { text: '' }) }));
    if (!ideas.length) { card.appendChild(h('p', { class: 'sub', style: 'margin:0', text: 'Note ici tous tes futurs produits en vrac 🎨' })); return card; }
    const list = h('div', { class: 'pidea-list' });
    ideas.forEach((pi) => list.appendChild(productIdeaRow(pi)));
    card.appendChild(list);
    return card;
  }
  function productIdeaRow(pi) {
    const inp = h('input', { class: 'field', style: 'flex:1', placeholder: 'Ex : carnet de coloriage de Noël', value: pi.text });
    inp.addEventListener('input', () => Store.update('productIdeas', pi.id, { text: inp.value }, { silent: true }));
    const toProduct = h('button', { class: 'icon-btn', title: 'Transformer en produit', text: '🛍️', onclick: () => { Store.add('shop', { nom: pi.text, prix: 0, statut: 'En préparation', stock: '', photo: '', categorie: '' }); Store.remove('productIdeas', pi.id); UI.toast('Ajouté à tes produits ✓'); } });
    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: () => Store.remove('productIdeas', pi.id) });
    return h('div', { class: 'pidea-row' }, [inp, toProduct, del]);
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
    root.appendChild(UI.pageHead('💡', 'Idées', 'Ton grand tableau blanc : déplace, redimensionne, colle des images et dessine.', addBtn));
    root.appendChild(h('p', { class: 'sub board-hint', style: 'margin:-8px 0 12px', html: '✋ Déplace un post-it par sa <b>poignée ⠿</b>, redimensionne par le <b>coin ↘</b>, clique <b>⤢</b> pour dessiner. Glisse le <b>fond</b> pour te déplacer dans le tableau.' }));

    if (!notes.length) { root.appendChild(UI.empty('🧠', 'Colle ta première idée sur le tableau !')); return root; }

    // grand canevas (on peut naviguer dedans) — au moins 2400×1600, plus si besoin
    let maxR = 2400, maxB = 1600;
    const sizer = h('div', { class: 'board-sizer' });
    notes.forEach((n, i) => {
      sizer.appendChild(noteCard(n, i));
      const x = n.x ?? fallbackX(i), y = n.y ?? fallbackY(i);
      maxR = Math.max(maxR, x + (n.w || 244) + 200);
      maxB = Math.max(maxB, y + (n.h || 240) + 200);
    });
    sizer.style.width = maxR + 'px';
    sizer.style.height = maxB + 'px';

    const board = h('div', { class: 'board-free', style: 'height:76vh' }, [sizer]);
    // navigation : glisser le fond pour se déplacer dans le tableau
    board.addEventListener('pointerdown', (e) => {
      if (e.target !== board && e.target !== sizer) return; // uniquement le fond
      board.setPointerCapture(e.pointerId);
      board.classList.add('panning');
      const sx = e.clientX, sy = e.clientY, sl = board.scrollLeft, st = board.scrollTop;
      const move = (ev) => { board.scrollLeft = sl - (ev.clientX - sx); board.scrollTop = st - (ev.clientY - sy); };
      const up = () => { board.removeEventListener('pointermove', move); board.removeEventListener('pointerup', up); board.classList.remove('panning'); };
      board.addEventListener('pointermove', move);
      board.addEventListener('pointerup', up);
    });
    root.appendChild(board);
    return root;
  }

  function noteCard(n, i) {
    const ref = h('input', { class: 'note-ref', placeholder: 'Référence / inspiration', value: n.ref });
    ref.addEventListener('input', () => Store.update('ideas', n.id, { ref: ref.value }, { silent: true }));

    const linkInput = h('input', { class: 'note-ref', style: 'font-weight:500;font-size:0.82em', placeholder: '🔗 Lien (https://…)', value: n.lien });
    linkInput.addEventListener('input', () => Store.update('ideas', n.id, { lien: linkInput.value }, { silent: true }));
    const linkPreview = n.lien
      ? h('a', { class: 'note-link', href: normalizeUrl(n.lien), target: '_blank', rel: 'noopener', text: '↗ Ouvrir le lien' })
      : null;

    const noteTa = h('textarea', { class: 'note-note', rows: 2, placeholder: 'Note personnelle…' });
    noteTa.value = n.note;
    noteTa.addEventListener('input', () => { Store.update('ideas', n.id, { note: noteTa.value }, { silent: true }); refit(); });
    ref.addEventListener('input', refit);
    linkInput.addEventListener('input', refit);

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
        card.style.height = Math.max(120, sh + ev.clientY - sy) + 'px';
        refit(); // police adaptative : tout reste visible en réduisant
      };
      const up = () => {
        resize.removeEventListener('pointermove', move); resize.removeEventListener('pointerup', up);
        Store.update('ideas', n.id, { w: parseFloat(card.style.width), h: parseFloat(card.style.height) }, { silent: true });
      };
      resize.addEventListener('pointermove', move);
      resize.addEventListener('pointerup', up);
    });

    // police adaptative : ajuste la taille du texte pour tout voir quand la note est réduite
    function autoGrow() { noteTa.style.height = 'auto'; noteTa.style.height = noteTa.scrollHeight + 'px'; }
    function refit() {
      body.style.fontSize = '14px';
      autoGrow();
      if (!card.style.height) return; // hauteur libre : pas de contrainte
      let fs = 14, guard = 0;
      while (body.scrollHeight > body.clientHeight + 1 && fs > 8 && guard < 60) { fs -= 0.5; body.style.fontSize = fs + 'px'; autoGrow(); guard++; }
    }
    App.defer(refit);

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
  function monthName(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  function formRow(label, input) { return h('div', { class: 'form-row' }, [h('label', { text: label }), input]); }

  function finances() {
    const raw = Store.list('finances');
    const cats = Store.financeCategories();
    const root = h('div');
    const selMonth = vs.finances.month || fmt.thisMonth();

    const actions = h('div', { class: 'page-actions' }, [
      h('button', { class: 'btn btn-ghost', text: '⚙️ Catégories', onclick: manageFinanceCategories }),
    ]);
    root.appendChild(UI.pageHead('💰', 'Finances', 'Objectif du mois, rentrées d’argent et évolution du chiffre d’affaires.', actions));

    // agrégats (le mois vient de la date de la rentrée)
    const entries = raw.map((e) => Object.assign({}, e, { mois: (e.date || '').slice(0, 7) || e.mois || '' }));
    const months = uniqueSorted(entries.map((e) => e.mois).filter(Boolean));
    const caByMonth = {};
    months.forEach((m) => { caByMonth[m] = entries.filter((e) => e.mois === m).reduce((s, e) => s + (Number(e.montant) || 0), 0); });
    const caSel = caByMonth[selMonth] || 0;
    const goalSel = Store.getGoal(selMonth);
    const caTotal = entries.reduce((s, e) => s + (Number(e.montant) || 0), 0);

    // --- jauge objectif du mois ---
    const ringHost = h('div', { class: 'ring-host' });
    App.defer(() => Charts.ring(ringHost, { value: caSel, max: goalSel, color: 'var(--accent)' }));
    const monthPick = h('input', { class: 'field', type: 'month', value: selMonth, style: 'width:auto' });
    monthPick.addEventListener('change', () => { vs.finances.month = monthPick.value; App.render(); });
    const goalInput = h('input', { class: 'field', type: 'number', min: '0', step: 'any', value: goalSel || '', placeholder: 'ex : 1000', style: 'width:130px' });
    const updateBtn = h('button', { class: 'btn btn-primary', text: 'Mettre à jour', onclick: () => { Store.setGoal(selMonth, parseFloat(goalInput.value) || 0); UI.toast('Objectif mis à jour ✓'); } });
    goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') updateBtn.click(); });
    root.appendChild(h('div', { class: 'card card-pad gauge-card' }, [
      ringHost,
      h('div', { class: 'gauge-info' }, [
        h('div', { class: 'gauge-head' }, [h('h3', { text: `🎯 Objectif de ${monthName(selMonth)}` }), monthPick]),
        h('div', { class: 'gauge-sub', html: goalSel
          ? `<b>${fmt.money(caSel)}</b> encaissés sur <b>${fmt.money(goalSel)}</b> visés`
          : 'Aucun objectif défini pour ce mois — indique-le ci-dessous 👇' }),
        h('div', {}, [h('label', { class: 'mini-label', text: 'Changer l’objectif (€)' }), h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [goalInput, updateBtn])]),
      ]),
    ]));

    // KPIs
    root.appendChild(h('div', { class: 'kpis' }, [
      kpiTile('CA ce mois-ci', fmt.money(caByMonth[fmt.thisMonth()] || 0), null),
      kpiTile('Total cumulé', fmt.money(caTotal), null),
      kpiTile('Rentrées enregistrées', String(raw.length), null),
    ]));

    // --- formulaire Rentrées d'argent ---
    root.appendChild(rentreeForm(cats, raw.length));

    // liste des rentrées
    if (raw.length) {
      const sorted = entries.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      // le menu inclut les catégories gérées + celles déjà utilisées (rien n'est perdu)
      const allCats = uniqueSorted([...cats, ...entries.map((e) => e.categorie).filter(Boolean)]);
      const tableCard = h('div', { class: 'card', style: 'margin-top:16px' });
      tableCard.appendChild(UI.editableTable({
        coll: 'finances', minWidth: 720, rows: sorted,
        columns: [
          { key: 'date', label: 'Date', type: 'date', width: '15%' },
          { key: 'client', label: 'Client / source', type: 'text', placeholder: 'Ex : Commande M. Dupont', width: '32%' },
          { key: 'categorie', label: 'Catégorie', type: 'select', width: '24%', options: ['', ...allCats].map((c) => ({ value: c, label: c || '— Sans catégorie —' })) },
          { key: 'montant', label: 'Montant', type: 'number', min: 0, align: 'right', width: '15%' },
        ],
      }));
      root.appendChild(tableCard);
    }

    // --- graphiques ---
    if (months.length) {
      const caCard = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: 'Évolution du chiffre d’affaires' })]);
      const caHost = h('div', { class: 'chart-wrap' });
      caCard.appendChild(caHost);
      const caSeries = [{ name: 'CA', color: 'var(--series-1)', values: months.map((m) => caByMonth[m]) }];
      if (months.some((m) => Store.getGoal(m) > 0)) caSeries.push({ name: 'Objectif', color: 'var(--series-3)', values: months.map((m) => Store.getGoal(m) || null) });
      App.defer(() => { Charts.line(caHost, { xLabels: months.map((m) => fmt.monthLabel(m)), series: caSeries, formatY: (v) => fmt.compact(v) + ' €', height: 250 }); Charts.legend(caCard, caSeries); });
      root.appendChild(caCard);

      const byCat = {};
      entries.forEach((e) => { const c = e.categorie || 'Sans catégorie'; byCat[c] = (byCat[c] || 0) + (Number(e.montant) || 0); });
      const catColors = colorMap(Object.keys(byCat));
      const catItems = Object.keys(byCat).map((k) => ({ label: k, value: byCat[k], color: catColors[k] })).sort((a, b) => b.value - a.value);
      const catCard = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: 'Détail par catégorie de revenu' })]);
      const catHost = h('div', { class: 'chart-wrap' });
      catCard.appendChild(catHost);
      if (catItems.length) Charts.legend(catCard, catItems.map((i) => ({ name: `${i.label} · ${fmt.money(i.value)}`, color: i.color })));
      App.defer(() => Charts.bars(catHost, { items: catItems, formatV: (v) => fmt.compact(v) + ' €', height: 240 }));
      root.appendChild(catCard);
    }

    return root;
  }

  function rentreeForm(cats, count) {
    const client = h('input', { class: 'field', placeholder: 'Ex : Commande M. Dupont' });
    const montant = h('input', { class: 'field', type: 'number', min: '0', step: 'any', placeholder: '0' });
    const date = h('input', { class: 'field', type: 'date', value: fmt.todayISO() });
    const cat = h('select', { class: 'field' });
    cats.forEach((c, i) => { const o = h('option', { value: c }, c); if (i === 0) o.selected = true; cat.appendChild(o); });
    const add = h('button', { class: 'btn btn-primary', text: '+ Ajouter la rentrée', onclick: () => {
      const m = parseFloat(montant.value) || 0;
      if (!m && !client.value.trim()) { UI.toast('Indique au moins un montant'); return; }
      Store.add('finances', { client: client.value.trim(), montant: m, date: date.value || fmt.todayISO(), categorie: cat.value });
      UI.toast('Rentrée ajoutée ✓');
    } });
    return h('div', { class: 'card card-pad' }, [
      h('div', { class: 'card-title' }, [document.createTextNode('💶 Rentrées d’argent '), h('span', { class: 'muted', style: 'font-weight:500;font-size:13px', text: `· ${count} entrée${count > 1 ? 's' : ''}` })]),
      h('div', { class: 'rentree-grid' }, [
        formRow('Client / source', client),
        formRow('Montant (€)', montant),
        formRow('Date', date),
        formRow('Catégorie', cat),
      ]),
      h('div', { style: 'display:flex;justify-content:flex-end;margin-top:12px' }, [add]),
    ]);
  }

  function manageFinanceCategories() {
    function bodyList() {
      const list = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
      Store.financeCategories().forEach((c) => {
        list.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h('span', { style: 'flex:1;font-weight:600', text: c }),
          h('button', { class: 'btn btn-ghost btn-sm', text: '✏️ Renommer', onclick: async () => { const nn = await UI.prompt('Nouveau nom', c, 'Renommer'); if (nn) { Store.renameFinanceCategory(c, nn); rerender(); } } }),
          h('button', { class: 'btn btn-ghost btn-sm btn-danger', text: '🗑', onclick: async () => { if (await UI.confirm(`Supprimer « ${c} » ? Les rentrées associées sont conservées, sans catégorie.`)) { Store.removeFinanceCategory(c); rerender(); } } }),
        ]));
      });
      const addBtn = h('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:6px;align-self:flex-start', text: '+ Nouvelle catégorie', onclick: async () => { const nn = await UI.prompt('Nom de la catégorie', '', 'Ajouter'); if (nn) { Store.addFinanceCategory(nn); rerender(); } } });
      return [list, addBtn];
    }
    let close;
    function rerender() { if (close) close(); open(); }
    function open() { close = UI.openModal({ title: 'Catégories de revenus', body: bodyList(), footer: [h('button', { class: 'btn btn-primary', text: 'Fermer', onclick: () => close() })], onClose: () => App.render() }); }
    open();
  }

  function uniqueSorted(arr) { return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b)); }

  /* =========================================================
     TEMPS (suivi du temps + niveaux)
     ========================================================= */
  const LEVELS = [
    { h: 0, title: 'Débutante', icon: '🌱' },
    { h: 5, title: 'Apprentie', icon: '✏️' },
    { h: 15, title: 'Créative', icon: '🎨' },
    { h: 30, title: 'Artisane', icon: '🧵' },
    { h: 50, title: 'Passionnée', icon: '🌟' },
    { h: 80, title: 'Pro en devenir', icon: '🚀' },
    { h: 120, title: 'Experte', icon: '💎' },
    { h: 180, title: 'Maîtresse des lieux', icon: '👑' },
    { h: 260, title: 'Légende', icon: '🏆' },
    { h: 400, title: 'Icône', icon: '🌈' },
  ];
  function fmtDur(min) { min = Math.round(min); const hh = Math.floor(min / 60), mm = min % 60; return hh ? `${hh} h${mm ? ' ' + mm + ' min' : ''}` : `${mm} min`; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

  function time() {
    const sessions = Store.list('timeSessions');
    const t = Store.timer();
    const root = h('div');
    root.appendChild(UI.pageHead('⏱️', 'Suivi du temps', 'Note tes heures de travail et gagne des niveaux 🎮'));

    const totalMin = sessions.reduce((s, x) => s + (+x.minutes || 0), 0);
    const totalH = totalMin / 60;

    // --- niveau ---
    let idx = 0; LEVELS.forEach((l, i) => { if (totalH >= l.h) idx = i; });
    const lvl = LEVELS[idx], next = LEVELS[idx + 1];
    const pct = next ? Math.max(2, Math.min(100, Math.round(((totalH - lvl.h) / (next.h - lvl.h)) * 100))) : 100;
    root.appendChild(h('div', { class: 'level-hero' }, [
      h('div', { class: 'level-badge' }, [h('span', { class: 'lvl-icon', text: lvl.icon }), h('span', { class: 'lvl-num', text: 'Niv. ' + (idx + 1) })]),
      h('div', { style: 'flex:1;min-width:210px' }, [
        h('div', { class: 'lvl-title', text: lvl.title }),
        h('div', { class: 'lvl-sub', text: `${fmtDur(totalMin)} de travail au total` }),
        h('div', { class: 'progress-track', style: 'margin-top:10px;max-width:440px' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
        h('div', { class: 'lvl-next', text: next ? `Plus que ${Math.max(0, next.h - totalH).toFixed(1)} h pour le niveau ${idx + 2} · ${next.icon} ${next.title}` : '🎉 Niveau maximum atteint, bravo !' }),
      ]),
    ]));

    // --- chrono ---
    const disp = h('div', { class: 'timer-display' });
    const fmtElapsed = (ms) => { const s = Math.floor(ms / 1000); return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`; };
    const labelInput = h('input', { class: 'field', style: 'flex:1;min-width:160px', placeholder: 'Sur quoi travailles-tu ? (optionnel)', value: t.running ? t.label : '' });
    let controls;
    if (t.running) {
      labelInput.disabled = true;
      disp.classList.add('on');
      const tick = () => { disp.textContent = fmtElapsed(Date.now() - t.startedAt); };
      tick();
      const id = setInterval(tick, 1000);
      App.addCleanup(() => clearInterval(id));
      controls = h('button', { class: 'btn btn-primary', text: '⏹ Arrêter', onclick: () => { const m = Store.stopTimer(); UI.toast(`+ ${fmtDur(m)} enregistré ✓`); } });
    } else {
      disp.textContent = '00:00:00';
      controls = h('button', { class: 'btn btn-primary', text: '▶ Démarrer', onclick: () => Store.startTimer(labelInput.value.trim()) });
    }
    root.appendChild(h('div', { class: 'card card-pad timer-card' }, [
      h('div', { class: 'card-title', text: t.running ? '⏱️ Chrono en cours' + (t.label ? ` · ${t.label}` : '') : '⏱️ Chrono' }),
      disp,
      h('div', { class: 'timer-row' }, [labelInput, controls, t.running ? h('button', { class: 'btn btn-ghost', text: 'Annuler', title: 'Annuler sans enregistrer', onclick: () => Store.cancelTimer() }) : null].filter(Boolean)),
    ]));

    // --- ajout manuel ---
    root.appendChild(manualTimeForm());

    // --- KPIs ---
    const today = fmt.todayISO(), w7 = daysAgoISO(6), cm = fmt.thisMonth();
    const sum = (pred) => sessions.filter(pred).reduce((s, x) => s + (+x.minutes || 0), 0);
    root.appendChild(h('div', { class: 'kpis' }, [
      kpiTile('Aujourd’hui', fmtDur(sum((x) => x.date === today)), null),
      kpiTile('7 derniers jours', fmtDur(sum((x) => x.date >= w7)), null),
      kpiTile('Ce mois-ci', fmtDur(sum((x) => (x.date || '').slice(0, 7) === cm)), null),
      kpiTile('Total', fmtDur(totalMin), null),
    ]));

    // --- graphique : heures par jour (14 derniers jours) ---
    if (sessions.length) {
      const days = [];
      for (let i = 13; i >= 0; i--) days.push(daysAgoISO(i));
      const items = days.map((d) => ({ label: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: +(sum((x) => x.date === d) / 60).toFixed(2) }));
      const chartCard = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: 'Heures par jour (14 derniers jours)' })]);
      const host = h('div', { class: 'chart-wrap' });
      chartCard.appendChild(host);
      App.defer(() => Charts.bars(host, { items, color: 'var(--accent)', formatV: (v) => v + ' h', height: 220 }));
      root.appendChild(chartCard);

      // table sessions
      const sorted = sessions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const tableCard = h('div', { class: 'card', style: 'margin-top:18px' });
      tableCard.appendChild(UI.editableTable({
        coll: 'timeSessions', minWidth: 640, rows: sorted,
        columns: [
          { key: 'date', label: 'Date', type: 'date', width: '18%' },
          { key: 'label', label: 'Description', type: 'text', placeholder: 'Sur quoi ?', width: '46%' },
          { key: 'minutes', label: 'Minutes', type: 'number', min: 0, align: 'right', width: '15%' },
          { key: 'duree', label: 'Durée', readonly: true, align: 'right', render: (r) => fmtDur(+r.minutes || 0) },
        ],
      }));
      root.appendChild(tableCard);
    } else {
      root.appendChild(UI.empty('⏳', 'Aucune session pour l’instant. Lance le chrono ou ajoute des heures manuellement !'));
    }

    // --- échelle des niveaux ---
    const ladder = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: '🎮 Niveaux à débloquer' })]);
    const lgrid = h('div', { class: 'level-grid', style: 'margin-top:12px' });
    LEVELS.forEach((l, i) => {
      const on = totalH >= l.h;
      lgrid.appendChild(h('div', { class: 'level-item' + (on ? ' on' : '') + (i === idx ? ' current' : '') }, [
        h('span', { class: 'li-icon', text: on ? l.icon : '🔒' }),
        h('div', {}, [
          h('div', { class: 'li-title', text: `Niv. ${i + 1} · ${l.title}` }),
          h('div', { class: 'li-req', text: l.h === 0 ? 'Dès le départ' : `${l.h} h de travail` }),
        ]),
        i === idx ? h('span', { class: 'li-cur', text: 'Actuel' }) : null,
      ].filter(Boolean)));
    });
    ladder.appendChild(lgrid);
    root.appendChild(ladder);

    return root;
  }

  function manualTimeForm() {
    const date = h('input', { class: 'field', type: 'date', value: fmt.todayISO() });
    const hoursI = h('input', { class: 'field', type: 'number', min: '0', step: '1', placeholder: '0' });
    const minI = h('input', { class: 'field', type: 'number', min: '0', max: '59', step: '1', placeholder: '0' });
    const label = h('input', { class: 'field', placeholder: 'Description (optionnel)' });
    const add = h('button', { class: 'btn btn-ghost', text: '+ Ajouter ces heures', onclick: () => {
      const mins = (parseInt(hoursI.value, 10) || 0) * 60 + (parseInt(minI.value, 10) || 0);
      if (mins <= 0) { UI.toast('Indique une durée'); return; }
      Store.add('timeSessions', { date: date.value || fmt.todayISO(), minutes: mins, label: label.value.trim() });
      UI.toast('Temps ajouté ✓');
    } });
    return h('div', { class: 'card card-pad', style: 'margin-top:16px' }, [
      h('div', { class: 'card-title', text: '✍️ Ajouter des heures manuellement' }),
      h('div', { class: 'time-form' }, [
        formRow('Date', date),
        formRow('Heures', hoursI),
        formRow('Minutes', minI),
        formRow('Description', label),
      ]),
      h('div', { style: 'display:flex;justify-content:flex-end;margin-top:12px' }, [add]),
    ]);
  }

  /* =========================================================
     7) RÉCOMPENSES (succès type Steam)
     ========================================================= */
  function rewardData() {
    const outreach = Store.list('outreach');
    const todos = Store.list('todos');
    const social = Store.list('social');
    const shop = Store.list('shop');
    const ideas = Store.list('ideas');
    const fin = Store.list('finances');
    const socialNotes = Store.list('socialNotes');
    const productIdeas = Store.list('productIdeas');
    const launch = Store.list('launchChecklist');

    const entries = fin.map((e) => Object.assign({}, e, { mois: (e.date || '').slice(0, 7) || e.mois || '' }));
    const months = Array.from(new Set(entries.map((e) => e.mois).filter(Boolean)));
    const goalHit = months.some((m) => { const ca = entries.filter((e) => e.mois === m).reduce((s, e) => s + (+e.montant || 0), 0); const g = Store.getGoal(m); return g > 0 && ca >= g; });
    const revenueCats = new Set(entries.filter((e) => (+e.montant || 0) > 0 && e.categorie).map((e) => e.categorie));

    const timeSessions = Store.list('timeSessions');
    const timeMin = timeSessions.reduce((s, x) => s + (+x.minutes || 0), 0);
    const sectionsUsed = [outreach.length, todos.length, social.length, shop.length, ideas.length, fin.length, timeSessions.length].filter((n) => n > 0).length;

    return {
      totalHours: timeMin / 60,
      longSession: timeSessions.some((x) => (+x.minutes || 0) >= 180),
      contacts: outreach.length,
      accepted: outreach.filter((o) => o.statut === 'Accepté').length,
      discussion: outreach.filter((o) => o.statut === 'En discussion').length,
      relance: outreach.filter((o) => o.statut === 'Relancé').length,
      doneTasks: todos.filter((t) => t.done).length,
      urgentDone: todos.some((t) => t.done && t.urgent),
      allTasksDone: todos.length >= 3 && todos.every((t) => t.done),
      peakFollowers: social.reduce((mx, r) => Math.max(mx, (+r.instagram || 0) + (+r.tiktok || 0) + (+r.threads || 0)), 0),
      monthsTracked: social.length,
      contentIdeas: socialNotes.length,
      products: shop.length,
      onlineProducts: shop.filter((p) => p.statut === 'En ligne').length,
      productsWithPhoto: shop.filter((p) => p.photo).length,
      productIdeas: productIdeas.length,
      launchDone: launch.length > 0 && launch.every((i) => i.done),
      revenue: entries.reduce((s, e) => s + (+e.montant || 0), 0),
      goalHit,
      revenueCats: revenueCats.size,
      ideas: ideas.length,
      hasSketch: ideas.some((i) => i.sketch),
      hasImage: ideas.some((i) => i.image),
      sectionsUsed,
    };
  }

  function achievementGroups(D) {
    return [
      { cat: '📮 Démarchage', items: [
        { icon: '🌱', name: 'Premier contact', desc: 'Ajoute ton 1er contact de démarchage', done: D.contacts >= 1 },
        { icon: '📇', name: 'Carnet d’adresses', desc: 'Démarche 10 contacts', done: D.contacts >= 10 },
        { icon: '💬', name: 'En pourparlers', desc: 'Aie un contact « En discussion »', done: D.discussion >= 1 },
        { icon: '💪', name: 'On lâche rien', desc: 'Relance un contact', done: D.relance >= 1 },
        { icon: '🤝', name: 'Ça matche !', desc: 'Décroche une réponse positive', done: D.accepted >= 1 },
        { icon: '🎉', name: 'Recherchée', desc: 'Décroche 5 réponses positives', done: D.accepted >= 5 },
      ] },
      { cat: '✅ Organisation', items: [
        { icon: '☑️', name: 'C’est coché', desc: 'Termine ta 1re tâche', done: D.doneTasks >= 1 },
        { icon: '🧹', name: 'Grand ménage', desc: 'Termine 10 tâches', done: D.doneTasks >= 10 },
        { icon: '🏅', name: 'Machine à cocher', desc: 'Termine 50 tâches', done: D.doneTasks >= 50 },
        { icon: '🚒', name: 'Pompier', desc: 'Termine une tâche urgente 🚨', done: D.urgentDone },
        { icon: '🎯', name: 'Journée parfaite', desc: 'Coche toutes tes tâches (min. 3)', done: D.allTasksDone },
      ] },
      { cat: '📱 Réseaux', items: [
        { icon: '👋', name: 'Première communauté', desc: 'Atteins 100 abonnés (pic)', done: D.peakFollowers >= 100 },
        { icon: '🌟', name: 'Mille mercis', desc: 'Atteins 1 000 abonnés', done: D.peakFollowers >= 1000 },
        { icon: '🚀', name: 'Star montante', desc: 'Atteins 5 000 abonnés', done: D.peakFollowers >= 5000 },
        { icon: '🎬', name: 'Boîte à idées', desc: 'Note 5 idées de contenu', done: D.contentIdeas >= 5 },
      ] },
      { cat: '🛍️ Boutique', items: [
        { icon: '✨', name: 'Première création', desc: 'Ajoute ton 1er produit', done: D.products >= 1 },
        { icon: '🏪', name: 'Petite boutique', desc: 'Prépare 5 produits', done: D.products >= 5 },
        { icon: '📸', name: 'Shooting photo', desc: 'Ajoute une photo à 3 produits', done: D.productsWithPhoto >= 3 },
        { icon: '🟢', name: 'En ligne !', desc: 'Mets un produit « En ligne »', done: D.onlineProducts >= 1 },
        { icon: '💭', name: 'Pleine d’idées', desc: 'Note 3 idées de futurs produits', done: D.productIdeas >= 3 },
        { icon: '🚀', name: 'Prête pour octobre', desc: 'Complète la checklist de lancement', done: D.launchDone },
      ] },
      { cat: '💰 Finances', items: [
        { icon: '💶', name: 'Premier euro', desc: 'Enregistre ta 1re rentrée d’argent', done: D.revenue > 0 },
        { icon: '💰', name: 'Cap des 500 €', desc: 'Atteins 500 € cumulés', done: D.revenue >= 500 },
        { icon: '🤑', name: 'Cap des 1 000 €', desc: 'Atteins 1 000 € cumulés', done: D.revenue >= 1000 },
        { icon: '🎯', name: 'Objectif atteint', desc: 'Atteins ton objectif sur un mois', done: D.goalHit },
        { icon: '🌈', name: 'Revenus variés', desc: 'Gagne dans 3 catégories différentes', done: D.revenueCats >= 3 },
      ] },
      { cat: '💡 Créativité', items: [
        { icon: '💡', name: 'Étincelle', desc: 'Colle ta 1re idée sur le tableau', done: D.ideas >= 1 },
        { icon: '🎨', name: 'Tableau vivant', desc: 'Colle 10 idées', done: D.ideas >= 10 },
        { icon: '✍️', name: 'Artiste', desc: 'Dessine à la main sur une idée', done: D.hasSketch },
        { icon: '🖼️', name: 'Moodboard', desc: 'Ajoute une image à une idée', done: D.hasImage },
      ] },
      { cat: '⏱️ Temps de travail', items: [
        { icon: '⏱️', name: 'Première heure', desc: 'Cumule 1 h de travail', done: D.totalHours >= 1 },
        { icon: '📅', name: 'Assidue', desc: 'Cumule 10 h de travail', done: D.totalHours >= 10 },
        { icon: '🔥', name: 'Bosseuse', desc: 'Cumule 50 h de travail', done: D.totalHours >= 50 },
        { icon: '💯', name: 'Centurionne', desc: 'Cumule 100 h de travail', done: D.totalHours >= 100 },
        { icon: '🏃', name: 'Marathon', desc: 'Une session de 3 h d’affilée', done: D.longSession },
      ] },
      { cat: '⭐ Spécial', items: [
        { icon: '🧭', name: 'Exploratrice', desc: 'Utilise 3 espaces différents', done: D.sectionsUsed >= 3 },
        { icon: '🌸', name: 'Tout un univers', desc: 'Utilise les 7 espaces', done: D.sectionsUsed >= 7 },
      ] },
    ];
  }

  function rewards() {
    const root = h('div');
    root.appendChild(UI.pageHead('🏆', 'Succès', 'Tes succès à débloquer, comme dans un jeu — un peu de fun et de motivation ! 🎮'));

    const D = rewardData();
    const groups = achievementGroups(D);
    const all = groups.flatMap((g) => g.items);
    const earned = all.filter((a) => a.done).length;
    const total = all.length;
    const pct = Math.round((earned / total) * 100);

    const heroPhrase = earned === 0 ? 'C’est le début de l’aventure — ton premier succès t’attend ! 🌱'
      : earned >= total ? 'Légendaire ! Tu as débloqué absolument tous les succès 👑🎉'
        : `${earned} succès débloqué${earned > 1 ? 's' : ''} — tu assures, continue ! 💪`;
    root.appendChild(h('div', { class: 'reward-hero' }, [
      h('div', { class: 'trophy', text: '🏆' }),
      h('div', { style: 'flex:1;min-width:200px' }, [
        h('div', { class: 'h-num', text: `${earned} / ${total} succès` }),
        h('div', { class: 'h-phrase', text: heroPhrase }),
        h('div', { class: 'progress-track', style: 'margin-top:10px;max-width:360px' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
      ]),
    ]));

    groups.forEach((g) => {
      const done = g.items.filter((a) => a.done).length;
      root.appendChild(h('div', { class: 'ach-cat' }, [
        h('span', { class: 'ach-cat-title', text: g.cat }),
        h('span', { class: 'ach-cat-count', text: `${done}/${g.items.length}` }),
      ]));
      const grid = h('div', { class: 'ach-grid' });
      g.items.forEach((a) => grid.appendChild(achievementCard(a)));
      root.appendChild(grid);
    });
    return root;
  }

  function achievementCard(a) {
    return h('div', { class: 'ach-card' + (a.done ? ' done' : ' locked') }, [
      h('div', { class: 'ach-icon', text: a.done ? a.icon : '🔒' }),
      h('div', { class: 'ach-body' }, [
        h('div', { class: 'ach-name', text: a.name }),
        h('div', { class: 'ach-desc', text: a.desc }),
      ]),
      a.done ? h('div', { class: 'ach-badge', text: '✓' }) : null,
    ].filter(Boolean));
  }

  return { outreach, todo, time, social, shop, ideas, finances, rewards };
})();
