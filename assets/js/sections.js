/* ===========================================================
   Sections — les 6 pages de l'application
   Chaque fonction renvoie un noeud DOM prêt à afficher.
   =========================================================== */
window.Sections = (function () {
  const { h, fmt } = UI;

  // état de vue local (persistant entre re-rendus)
  const vs = {
    outreach: { q: '', statut: '', type: '' },
    todo: { view: 'list', calMonth: fmt.thisMonth(), focusAdd: false },
    finances: { month: '' },
  };

  /* =========================================================
     1) DÉMARCHAGE
     ========================================================= */
  const STATUTS_OUTREACH = ['À contacter', 'Envoyé', 'Relancé', 'En discussion', 'Accepté', 'Refusé'];
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
        { key: 'nom', label: 'Nom', type: 'text', width: '16%', placeholder: 'Nom…' },
        { key: 'type', label: 'Type', type: 'select', width: '10%', options: TYPES_OUTREACH },
        { key: 'pays', label: 'Pays', type: 'text', width: '10%', placeholder: 'Pays' },
        { key: 'contact', label: 'Contact', type: 'text', width: '15%', placeholder: 'email / @' },
        { key: 'dateEnvoi', label: 'Date d’envoi', type: 'date', width: '11%' },
        { key: 'relance', label: 'Relance prévue', type: 'date', width: '11%' },
        { key: 'statut', label: 'Statut', type: 'select', width: '12%', options: STATUTS_OUTREACH },
        { key: 'notes', label: 'Notes', type: 'area', placeholder: 'Notes…' },
      ],
    });
    root.appendChild(table);

    const hint = h('p', { class: 'sub', style: 'margin-top:10px', html: 'Les lignes surlignées 🟠 sont des <b>relances à faire</b> (date de relance atteinte).' });
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
    const root = h('div');
    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Ajouter un produit',
      onclick: () => Store.add('shop', { nom: '', prix: 0, statut: 'En préparation', stock: '', photo: '' }),
    });
    root.appendChild(UI.pageHead('🛍️', 'Boutique', 'Tes produits : prix, statut, stock et photo.', addBtn));

    if (!products.length) { root.appendChild(UI.empty('🛒', 'Aucun produit. Ajoute ta première création !')); return root; }

    const grid = h('div', { class: 'shop-grid' });
    products.forEach((p) => grid.appendChild(productCard(p)));
    root.appendChild(grid);
    return root;
  }

  function productCard(p) {
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

    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: async () => { if (await UI.confirm('Supprimer ce produit ?')) Store.remove('shop', p.id); } });

    const body = h('div', { class: 'product-body' }, [
      name,
      h('div', { class: 'product-row' }, [h('span', { class: 'nowrap', style: 'display:flex;align-items:center;gap:4px' }, [price, h('span', { class: 'muted', text: '€' })]), statut]),
      stock,
      h('div', { class: 'product-row', style: 'margin-top:2px' }, [h('span', { class: 'badge ' + (p.statut === 'En ligne' ? 'online' : 'prep'), text: p.statut }), del]),
    ]);

    return h('div', { class: 'product' }, [photo, body]);
  }

  /* =========================================================
     5) IDÉES (tableau blanc)
     ========================================================= */
  const NOTE_COLORS = ['#fbeec2', '#f7d9df', '#d9ead3', '#d6e6f5', '#e7ddf3', '#ffffff'];

  function ideas() {
    const notes = Store.list('ideas');
    const root = h('div');
    const addBtn = h('button', {
      class: 'btn btn-primary', text: '+ Nouvelle idée',
      onclick: () => Store.add('ideas', { ref: '', lien: '', note: '', color: NOTE_COLORS[0] }),
    });
    root.appendChild(UI.pageHead('💡', 'Idées', 'Ton tableau blanc : inspirations, liens et notes.', addBtn));

    if (!notes.length) { root.appendChild(UI.empty('🧠', 'Colle ta première idée sur le tableau !')); return root; }

    const board = h('div', { class: 'board' });
    notes.forEach((n) => board.appendChild(noteCard(n)));
    root.appendChild(board);
    return root;
  }

  function noteCard(n) {
    const ref = h('input', { class: 'note-ref', placeholder: 'Référence / inspiration', value: n.ref });
    ref.addEventListener('input', () => Store.update('ideas', n.id, { ref: ref.value }, { silent: true }));

    const noteTa = h('textarea', { class: 'note-note', rows: 3, placeholder: 'Note personnelle…' });
    noteTa.value = n.note;
    const autoGrow = () => { noteTa.style.height = 'auto'; noteTa.style.height = noteTa.scrollHeight + 'px'; };
    noteTa.addEventListener('input', () => { Store.update('ideas', n.id, { note: noteTa.value }, { silent: true }); autoGrow(); });
    setTimeout(autoGrow, 0);

    // lien : champ éditable + aperçu cliquable
    const linkInput = h('input', { class: 'note-ref', style: 'font-weight:500;font-size:12.5px', placeholder: '🔗 Lien (https://…)', value: n.lien });
    linkInput.addEventListener('input', () => Store.update('ideas', n.id, { lien: linkInput.value }, { silent: true }));
    const linkPreview = n.lien
      ? h('a', { class: 'note-link', href: normalizeUrl(n.lien), target: '_blank', rel: 'noopener', text: '↗ Ouvrir le lien' })
      : null;

    // couleurs
    const swatches = h('div', { class: 'swatches' });
    NOTE_COLORS.forEach((c) => {
      const sw = h('button', { class: 'swatch' + (c === n.color ? ' sel' : ''), style: `background:${c}`, title: 'Couleur',
        onclick: () => Store.update('ideas', n.id, { color: c }) });
      swatches.appendChild(sw);
    });
    const del = h('button', { class: 'icon-btn danger', title: 'Supprimer', text: '🗑', onclick: async () => { if (await UI.confirm('Supprimer cette idée ?')) Store.remove('ideas', n.id); } });

    const card = h('div', { class: 'note', style: `background:${n.color || '#fff'}` },
      [ref, linkInput, linkPreview, noteTa, h('div', { class: 'note-foot' }, [swatches, del])].filter(Boolean));
    return card;
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
    const srcItems = Object.keys(bySource).map((k) => ({ label: k, value: bySource[k] })).sort((a, b) => b.value - a.value);
    const srcCard = h('div', { class: 'card card-pad', style: 'margin-top:18px' }, [h('div', { class: 'card-title', text: 'Détail par source de revenu' })]);
    const srcHost = h('div', { class: 'chart-wrap' });
    srcCard.appendChild(srcHost);
    root.appendChild(srcCard);
    App.defer(() => Charts.bars(srcHost, { items: srcItems, color: 'var(--accent)', formatV: (v) => fmt.compact(v) + ' €', height: 240 }));

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
