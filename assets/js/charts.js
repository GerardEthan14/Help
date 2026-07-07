/* ===========================================================
   Charts — graphiques SVG maison (aucune dépendance)
   =========================================================== */
window.Charts = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function niceMax(v) {
    if (v <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  /* ---- Courbe multi-séries ----
     opts: { series:[{name,color,values:[num|null,...]}], xLabels:[...],
             formatY, formatX, height } */
  function line(host, opts) {
    host.innerHTML = '';
    host.classList.add('chart-host');
    const series = opts.series || [];
    const xLabels = opts.xLabels || [];
    const fY = opts.formatY || ((v) => String(v));
    const H = opts.height || 260;
    const W = 720;
    const padL = 52, padR = 58, padT = 16, padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    let maxV = 0;
    series.forEach((s) => s.values.forEach((v) => { if (v != null && v > maxV) maxV = v; }));
    const top = niceMax(maxV) || 10;
    const n = xLabels.length;

    const x = (i) => padL + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const y = (v) => padT + plotH - (plotH * v) / top;

    const svg = el('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img' });

    // grille horizontale + ticks Y
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const val = (top / ticks) * t;
      const yy = y(val);
      svg.appendChild(el('line', { x1: padL, y1: yy, x2: W - padR, y2: yy, stroke: 'var(--grid)', 'stroke-width': 1 }));
      const tl = el('text', { x: padL - 8, y: yy + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 });
      tl.textContent = fY(val);
      svg.appendChild(tl);
    }
    // axe bas + labels X
    xLabels.forEach((lab, i) => {
      // n'affiche pas tous les labels si trop nombreux
      const showEvery = n > 12 ? Math.ceil(n / 12) : 1;
      if (i % showEvery !== 0 && i !== n - 1) return;
      const tx = el('text', { x: x(i), y: H - 12, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 });
      tx.textContent = lab;
      svg.appendChild(tx);
    });

    // lignes + points
    series.forEach((s) => {
      const pts = [];
      s.values.forEach((v, i) => { if (v != null) pts.push([x(i), y(v), i, v]); });
      if (pts.length > 1) {
        const d = pts.map((p, k) => (k === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        svg.appendChild(el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
      pts.forEach((p) => {
        svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 3.4, fill: 'var(--surface)', stroke: s.color, 'stroke-width': 2 }));
      });
      // étiquette directe en bout de ligne
      if (pts.length) {
        const last = pts[pts.length - 1];
        const lbl = el('text', { x: last[0] + 9, y: last[1] + 4, fill: s.color, 'font-size': 11.5, 'font-weight': 700 });
        lbl.textContent = s.name;
        svg.appendChild(lbl);
      }
    });

    // couche de survol
    const guide = el('line', { x1: 0, y1: padT, x2: 0, y2: padT + plotH, stroke: 'var(--axis)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 });
    svg.appendChild(guide);
    host.appendChild(svg);

    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    host.appendChild(tip);

    const overlay = el('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
    svg.appendChild(overlay);

    function onMove(ev) {
      const rect = svg.getBoundingClientRect();
      const scale = W / rect.width;
      const mx = (ev.clientX - rect.left) * scale;
      if (n === 0) return;
      let idx = Math.round(((mx - padL) / plotW) * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));
      const gx = x(idx);
      guide.setAttribute('x1', gx); guide.setAttribute('x2', gx);
      guide.setAttribute('opacity', 1);
      let rows = `<div style="font-weight:700;margin-bottom:3px">${xLabels[idx] || ''}</div>`;
      series.forEach((s) => {
        const v = s.values[idx];
        if (v == null) return;
        rows += `<div class="tip-row"><span class="sw" style="background:${s.color}"></span>${s.name} : <b>${fY(v)}</b></div>`;
      });
      tip.innerHTML = rows;
      const px = (gx / W) * rect.width;
      tip.style.left = px + 'px';
      tip.style.top = (padT / H) * rect.height + 'px';
      tip.style.opacity = 1;
    }
    function onLeave() { guide.setAttribute('opacity', 0); tip.style.opacity = 0; }
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', onLeave);
    svg.addEventListener('touchstart', (e) => { onMove(e.touches[0]); }, { passive: true });
    svg.addEventListener('touchmove', (e) => { onMove(e.touches[0]); }, { passive: true });
  }

  /* ---- Barres verticales simples ----
     opts: { items:[{label,value}], color, formatV, height } */
  function bars(host, opts) {
    host.innerHTML = '';
    host.classList.add('chart-host');
    const items = opts.items || [];
    const color = opts.color || 'var(--series-1)';
    const fV = opts.formatV || ((v) => String(v));
    const H = opts.height || 240;
    const W = 720;
    const padL = 52, padR = 16, padT = 16, padB = 46;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxV = niceMax(Math.max(1, ...items.map((i) => i.value)));
    const n = items.length || 1;
    const band = plotW / n;
    const bw = Math.min(64, band * 0.6);

    const svg = el('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img' });
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const val = (maxV / ticks) * t;
      const yy = padT + plotH - (plotH * val) / maxV;
      svg.appendChild(el('line', { x1: padL, y1: yy, x2: W - padR, y2: yy, stroke: 'var(--grid)', 'stroke-width': 1 }));
      const tl = el('text', { x: padL - 8, y: yy + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 });
      tl.textContent = fV(val);
      svg.appendChild(tl);
    }
    host.appendChild(svg);
    const tip = document.createElement('div'); tip.className = 'chart-tip'; host.appendChild(tip);

    items.forEach((it, i) => {
      const cx = padL + band * i + band / 2;
      const h = (plotH * it.value) / maxV;
      const yTop = padT + plotH - h;
      const r = el('rect', { x: cx - bw / 2, y: yTop, width: bw, height: Math.max(0, h), rx: 5, fill: it.color || color });
      r.style.transition = 'opacity .1s';
      r.addEventListener('mousemove', (ev) => {
        const rect = svg.getBoundingClientRect();
        tip.innerHTML = `<div style="font-weight:700">${it.label}</div><div>${fV(it.value)}</div>`;
        tip.style.left = ((cx / W) * rect.width) + 'px';
        tip.style.top = ((yTop / H) * rect.height) + 'px';
        tip.style.opacity = 1; r.style.opacity = .82;
      });
      r.addEventListener('mouseleave', () => { tip.style.opacity = 0; r.style.opacity = 1; });
      svg.appendChild(r);
      const lab = el('text', { x: cx, y: H - 14, 'text-anchor': 'middle', fill: 'var(--ink-soft)', 'font-size': 11 });
      lab.textContent = it.label.length > 12 ? it.label.slice(0, 11) + '…' : it.label;
      svg.appendChild(lab);
    });
    if (!items.length) {
      const t = el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 });
      t.textContent = 'Aucune donnée';
      svg.appendChild(t);
    }
  }

  function legend(host, series) {
    const div = document.createElement('div');
    div.className = 'chart-legend';
    series.forEach((s) => {
      const lg = document.createElement('span');
      lg.className = 'lg';
      lg.innerHTML = `<span class="sw" style="background:${s.color}"></span>${s.name}`;
      div.appendChild(lg);
    });
    host.appendChild(div);
  }

  return { line, bars, legend };
})();
