/* ===========================================================
   UI — helpers partagés : toast, modal, table éditable, images
   =========================================================== */
window.UI = (function () {

  /* ---- création DOM courte ---- */
  function h(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'dataset') Object.assign(e.dataset, attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  /* ---- toast ---- */
  function toast(msg, ms) {
    const host = document.getElementById('toastHost');
    const t = h('div', { class: 'toast', text: msg });
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms || 2200);
  }

  /* ---- confirmation ---- */
  function confirm(message, okLabel) {
    return new Promise((resolve) => {
      const host = document.getElementById('modalHost');
      host.hidden = false;
      host.innerHTML = '';
      const close = (v) => { host.hidden = true; host.innerHTML = ''; resolve(v); };
      const modal = h('div', { class: 'modal' }, [
        h('div', { class: 'modal-head', text: 'Confirmer' }),
        h('div', { class: 'modal-body' }, [h('p', { text: message, style: 'margin:6px 0 2px' })]),
        h('div', { class: 'modal-foot' }, [
          h('button', { class: 'btn btn-ghost', text: 'Annuler', onclick: () => close(false) }),
          h('button', { class: 'btn btn-danger', text: okLabel || 'Supprimer', onclick: () => close(true) }),
        ]),
      ]);
      host.appendChild(modal);
      host.onclick = (e) => { if (e.target === host) close(false); };
    });
  }

  /* ---- redimensionnement image -> dataURL (garde le localStorage léger) ---- */
  function resizeImage(file, maxSize) {
    maxSize = maxSize || 900;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
          else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---- formats ---- */
  const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const euro2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = new Intl.NumberFormat('fr-FR');
  const fmt = {
    money: (v) => euro.format(v || 0),
    money2: (v) => euro2.format(v || 0),
    num: (v) => num.format(v || 0),
    compact: (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k' : String(v)),
    monthLabel: (ym) => {
      if (!ym) return '';
      const [y, m] = ym.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    },
    todayISO: () => new Date().toISOString().slice(0, 10),
    thisMonth: () => new Date().toISOString().slice(0, 7),
  };

  /* ===========================================================
     Table éditable générique (édition en place façon tableur)
     config = { coll, columns, rows, newRow, addLabel, rowClass, emptyText }
     column = { key, label, type, options, placeholder, width, align, readonly, render }
       type ∈ text | area | number | date | select
     =========================================================== */
  function editableTable(config) {
    const wrap = h('div', { class: 'tbl-wrap' });
    const table = h('table', { class: 'et' });
    if (config.minWidth) table.style.minWidth = config.minWidth + 'px';

    // en-tête
    const thead = h('thead');
    const trh = h('tr');
    config.columns.forEach((c) => trh.appendChild(h('th', { style: c.width ? `width:${c.width}` : '' }, c.label)));
    trh.appendChild(h('th', { class: 'tight', 'aria-label': 'Actions' }, ''));
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = h('tbody');
    config.rows.forEach((row) => tbody.appendChild(buildRow(config, row)));
    table.appendChild(tbody);
    wrap.appendChild(table);

    if (!config.rows.length && config.emptyText) {
      // laisse quand même l'en-tête, message discret sous la table géré par section
    }
    return wrap;
  }

  function buildRow(config, row) {
    const tr = h('tr');
    if (config.rowClass) { const cls = config.rowClass(row); if (cls) tr.className = cls; }

    config.columns.forEach((col) => {
      const td = h('td');
      if (col.align === 'right') td.classList.add('cell-num');
      td.appendChild(buildCell(config.coll, row, col));
      tr.appendChild(td);
    });

    const act = h('td', { class: 'row-actions tight' });
    act.appendChild(h('button', {
      class: 'icon-btn danger', title: 'Supprimer', text: '🗑',
      onclick: async () => {
        if (await confirm('Supprimer cette ligne ?')) Store.remove(config.coll, row.id);
      },
    }));
    tr.appendChild(act);
    return tr;
  }

  function buildCell(coll, row, col) {
    if (col.readonly) {
      const span = h('span', { class: 'cell-input', style: 'display:block' });
      span.innerHTML = col.render ? col.render(row) : (row[col.key] ?? '');
      return span;
    }
    const val = row[col.key] ?? '';

    if (col.type === 'select') {
      const sel = h('select', { class: 'cell-select' });
      (col.options || []).forEach((o) => {
        const opt = h('option', { value: o.value ?? o }, o.label ?? o);
        if ((o.value ?? o) === val) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => Store.update(coll, row.id, { [col.key]: sel.value }));
      return sel;
    }

    if (col.type === 'area') {
      const ta = h('textarea', { class: 'cell-area', rows: 1, placeholder: col.placeholder || '' });
      ta.value = val;
      ta.addEventListener('input', () => Store.update(coll, row.id, { [col.key]: ta.value }, { silent: true }));
      return ta;
    }

    const type = col.type === 'date' ? 'date' : col.type === 'month' ? 'month' : col.type === 'number' ? 'number' : 'text';
    const isDatey = col.type === 'date' || col.type === 'month';
    const input = h('input', { class: 'cell-input' + (isDatey ? ' cell-date' : '') + (col.type === 'number' ? ' cell-num' : ''), type, placeholder: col.placeholder || '' });
    if (col.type === 'number') { input.step = col.step || 'any'; input.min = col.min != null ? col.min : ''; }
    input.value = val;
    if (col.type === 'number' || isDatey) {
      // ces valeurs alimentent des totaux/graphes -> on redessine au 'change'
      input.addEventListener('input', () => Store.update(coll, row.id, { [col.key]: parseVal(col, input.value) }, { silent: true }));
      input.addEventListener('change', () => Store.update(coll, row.id, { [col.key]: parseVal(col, input.value) }));
    } else {
      input.addEventListener('input', () => Store.update(coll, row.id, { [col.key]: input.value }, { silent: true }));
    }
    return input;
  }

  function parseVal(col, raw) {
    if (col.type === 'number') { const n = parseFloat(raw); return isNaN(n) ? 0 : n; }
    return raw;
  }

  /* ---- entête de page ---- */
  function pageHead(emoji, title, sub, actions) {
    const head = h('div', { class: 'page-head' });
    const left = h('div');
    left.appendChild(h('h1', {}, [h('span', { text: emoji }), document.createTextNode(' ' + title)]));
    if (sub) left.appendChild(h('div', { class: 'sub', text: sub }));
    head.appendChild(left);
    if (actions) head.appendChild(actions);
    return head;
  }

  function empty(emoji, text) {
    return h('div', { class: 'empty' }, [h('div', { class: 'big', text: emoji }), h('div', { text })]);
  }

  return { h, toast, confirm, resizeImage, fmt, editableTable, buildRow, pageHead, empty };
})();
