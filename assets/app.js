/* Részidős jelentkezők – interaktív adattörténet
   Függőség: D3 v7 (vendor/d3.min.js), adatok: assets/data.js */
(function () {
  "use strict";
  const D = window.DATA;

  // ---------- Alapok ----------
  const C = {
    orange: "#D9512C", orangeSoft: "#F2B8A4", blue: "#1D5A8C", blue9: "#0A2540",
    blue4: "#6F9BC2", blue2: "#A9C6E0", gray: "#8893A0", gray2: "#C3CAD2",
    panel: "#ECE5D7", rule: "#E2DACB", paper: "#F5F0E6", ink: "#141E29", muted: "#5D6875"
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = ms => (reduced ? 0 : ms);

  const loc = d3.formatLocale({ decimal: ",", thousands: " ", grouping: [3], currency: ["", " Ft"], minus: "−", percent: "%" });
  const fInt = loc.format(",d");
  const fPct = loc.format(".0%");
  const fPct1 = loc.format(".1%");
  const sign = (v, f) => (v > 0 ? "+" : "") + f(v);
  const fPctS = v => sign(v, fPct);
  const fPct1S = v => sign(v, fPct1);
  const fNum1 = loc.format(",.1f");
  const years = D.years;
  const yi = yr => years.indexOf(yr);

  // ---------- DiD újraszámolása az adatokból ----------
  // mester_t ∝ alap_t / (1 + eseményelemzés_t)  (a konstans kiesik az arányokból)
  const mester = D.alap.map((v, i) => v / (1 + D.event[i]));
  const sum = (arr, a, b) => d3.sum(years.filter(y => y >= a && y <= b), y => arr[yi(y)]);
  const ratio = (a, b) => sum(D.alap, a, b) / sum(mester, a, b);
  const EFFECT = ratio(2020, 2022) / ratio(2017, 2019) - 1; // ≈ −0,2898

  // ---------- Tooltip ----------
  const tt = document.getElementById("tooltip");
  function showTip(ev, html) {
    tt.innerHTML = html;
    tt.classList.add("show");
    const r = tt.getBoundingClientRect();
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 16;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - 16;
    tt.style.left = Math.max(8, x) + "px";
    tt.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { tt.classList.remove("show"); }
  const row = (color, k, v, dashed) =>
    `<div class="tt-row"><span class="k">${color ? `<span class="dot" style="background:${dashed ? "transparent" : color};${dashed ? `border:2px dashed ${color}` : ""}"></span>` : ""}${k}</span><span class="v">${v}</span></div>`;
  const title = t => `<div class="tt-title">${t}</div>`;
  const note = t => `<div class="tt-note">${t}</div>`;

  // ---------- SVG segédek ----------
  function frame(el, height, m) {
    el.innerHTML = "";
    const width = Math.max(280, el.clientWidth);
    const svg = d3.select(el).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    return { svg, g, width, height, iw: width - m.left - m.right, ih: height - m.top - m.bottom };
  }
  const isMobile = () => window.innerWidth <= 900;
  function scrollyHeight(el, extra = 0) {
    const w = el.clientWidth;
    const h = isMobile() ? Math.min(w * 0.78, window.innerHeight * 0.46) : Math.min(w * 0.66, window.innerHeight - 250 - extra);
    return Math.max(240, Math.round(h));
  }
  function blockHeight(el, ratio = 0.56, max = 420) {
    return Math.max(240, Math.round(Math.min(el.clientWidth * ratio, max)));
  }
  function yearAxis(g, x, ih, iw, list = years) {
    const step = iw < 380 ? 3 : iw < 620 ? 2 : 1;
    const tv = list.filter((_, i) => i % step === 0);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(tv).tickFormat(d => d).tickSize(0).tickPadding(10));
  }
  function yGrid(g, y, iw, fmt, ticks = 5, values) {
    const ax = d3.axisLeft(y).ticks(ticks);
    if (values) ax.tickValues(values);
    g.append("g").attr("class", "grid").call(ax.tickSize(-iw).tickFormat(""));
    const ax2 = d3.axisLeft(y).ticks(ticks).tickSize(0).tickPadding(8).tickFormat(fmt);
    if (values) ax2.tickValues(values);
    g.append("g").attr("class", "axis").call(ax2);
  }
  // Annotáció: szövegsorok egy pont mellett. pos: "above" | "below" | "right" | "left"
  function annot(gA, px, py, lines, opt = {}) {
    const { pos = "above", anchor = "middle", dx = 0, gap = 12, delay = 0 } = opt;
    const lh = l => (l.cls && l.cls.includes("big") ? 22 : 16);
    const total = d3.sum(lines, lh);
    let y0;
    if (pos === "above") y0 = py - gap - total + lh(lines[0]) - 4;
    else if (pos === "below") y0 = py + gap + lh(lines[0]) - 2;
    else y0 = py - total / 2 + lh(lines[0]) - 4;
    const a = gA.append("g").attr("transform", `translate(${px + dx},${y0})`).style("opacity", 0);
    let yy = 0;
    lines.forEach(l => {
      a.append("text").attr("class", l.cls || "").attr("y", yy).attr("text-anchor", anchor).text(l.t);
      yy += lh(l);
    });
    a.transition().delay(T(delay)).duration(T(450)).style("opacity", 1);
    return a;
  }
  // Évszintű hover: függőleges segédvonal + callback
  function yearHover(g, x, iw, ih, allowed, onYear) {
    const ch = g.append("line").attr("class", "crosshair").attr("y1", 0).attr("y2", ih).style("opacity", 0);
    g.append("rect").attr("class", "hit").attr("x", -8).attr("width", iw + 16).attr("height", ih)
      .on("pointermove pointerdown", ev => {
        const [mx] = d3.pointer(ev);
        const list = allowed();
        if (!list.length) return;
        const yr = list.reduce((a, b) => (Math.abs(x(b) - mx) < Math.abs(x(a) - mx) ? b : a));
        ch.attr("x1", x(yr)).attr("x2", x(yr)).style("opacity", 1);
        onYear(yr, ev);
      })
      .on("pointerleave", () => { ch.style("opacity", 0); hideTip(); onYear(null); });
  }
  // Ütközésmentes végcímkék
  function dodge(items, minGap = 15, lo = -Infinity, hi = Infinity) {
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
    const over = items.length ? items[items.length - 1].y - hi : 0;
    if (over > 0) items.forEach(d => (d.y -= over));
    items.forEach(d => (d.y = Math.max(lo, d.y)));
    return items;
  }
  // Adattábla (<details>)
  function dataTable(key, head, rows) {
    const box = document.querySelector(`.tablebox[data-table="${key}"]`);
    if (!box) return;
    box.innerHTML = `<details><summary>Adatok táblázatban</summary><div class="scroll"><table>
      <thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody>
      </table></div></details>`;
  }
  function legend(el, items, interactive, onToggle) {
    el.innerHTML = "";
    items.forEach(it => {
      const node = document.createElement(interactive ? "button" : "span");
      node.className = interactive ? "" : "item";
      if (interactive) { node.type = "button"; node.setAttribute("aria-pressed", "true"); }
      const key = it.box
        ? `<span class="key box" style="background:${it.color}"></span>`
        : `<span class="key" style="border-top-color:${it.color};border-top-style:${it.dash ? "dashed" : "solid"}"></span>`;
      node.innerHTML = key + it.name;
      if (interactive) node.addEventListener("click", () => {
        const on = node.getAttribute("aria-pressed") === "true";
        node.setAttribute("aria-pressed", on ? "false" : "true");
        onToggle(it.key, !on);
      });
      el.appendChild(node);
    });
  }

  // =====================================================================
  // HERO
  // =====================================================================
  function heroChart(el) {
    const H = Math.round(Math.min(el.clientWidth * 0.62, 340));
    const m = { top: 10, right: 0, bottom: 24, left: 0 };
    const { g, iw, ih } = frame(el, H, m);
    const x = d3.scaleBand(years, [0, iw]).padding(0.22);
    const y = d3.scaleLinear([0, 38000], [ih, 0]);
    const col = yr => (yr >= 2020 && yr <= 2022 ? "#2F5F8F" : yr >= 2023 ? C.orange : C.blue4);
    g.selectAll("rect").data(years).join("rect")
      .attr("x", d => x(d)).attr("width", x.bandwidth())
      .attr("y", d => y(D.alap[yi(d)])).attr("height", d => ih - y(D.alap[yi(d)])).attr("rx", 2).attr("fill", col)
      .on("pointermove", (ev, d) => showTip(ev, title(d) + row(null, "Jelentkezők", fInt(D.alap[yi(d)]) + " fő")))
      .on("pointerleave", hideTip);
    [[2013, "start", "2013"], [2021, "middle", "2020–22"], [2026, "end", "2026"]].forEach(([yr, an, t]) => {
      const cx = an === "start" ? x(yr) : an === "end" ? x(yr) + x.bandwidth() : x(yr) + x.bandwidth() / 2;
      g.append("text").attr("x", cx).attr("y", ih + 18).attr("text-anchor", an).text(t);
    });
    return { update() {} };
  }

  // =====================================================================
  // 1. JELENSÉG – idősor (scrolly)
  // =====================================================================
  function trendChart(el) {
    const H = scrollyHeight(el);
    const m = { top: 34, right: 24, bottom: 30, left: 56 };
    const f = frame(el, H, m), { g, iw, ih } = f;
    const vals = D.alap;
    const x = d3.scaleLinear([2013, 2026], [0, iw]);
    const y = d3.scaleLinear([0, 40000], [ih, 0]);

    const band = g.append("g").style("opacity", 0);
    band.append("rect").attr("class", "band").attr("x", x(2019.5)).attr("width", x(2022.5) - x(2019.5)).attr("y", 0).attr("height", ih);
    band.append("text").attr("class", "band-label").attr("x", x(2021)).attr("y", -10).attr("text-anchor", "middle").text("2020–22: emelt érettségi kötelező");
    yGrid(g, y, iw, fInt);
    yearAxis(g, x, ih, iw);

    const clipId = "clip-trend";
    const clip = f.svg.append("clipPath").attr("id", clipId).append("rect").attr("x", -10).attr("y", -20).attr("height", ih + 40).attr("width", 0);
    g.append("path").datum(vals).attr("clip-path", `url(#${clipId})`).attr("fill", "none")
      .attr("stroke", C.blue9).attr("stroke-width", 2.5).attr("stroke-linejoin", "round")
      .attr("d", d3.line().x((d, i) => x(years[i])).y(d => y(d)));
    const pts = g.append("g").selectAll("circle").data(years).join("circle")
      .attr("cx", d => x(d)).attr("cy", d => y(vals[yi(d)])).attr("r", 4.5)
      .attr("fill", C.blue9).attr("stroke", C.paper).attr("stroke-width", 2).style("opacity", 0);
    const ann = g.append("g").attr("class", "annot");
    const focus = g.append("circle").attr("r", 8).attr("fill", "none").attr("stroke", C.orange).attr("stroke-width", 2).style("opacity", 0);

    let reveal = 2019;
    yearHover(g, x, iw, ih, () => years.filter(yy => yy <= reveal), (yr, ev) => {
      if (yr == null) return focus.style("opacity", 0);
      const i = yi(yr);
      focus.attr("cx", x(yr)).attr("cy", y(vals[i])).style("opacity", 1);
      showTip(ev, title(yr) + row(null, "Jelentkezők", fInt(vals[i]) + " fő") +
        (i > 0 ? row(null, "Előző évhez", fPctS(vals[i] / vals[i - 1] - 1)) : "") +
        (yr >= 2020 && yr <= 2022 ? note("Emelt érettségi kötelező") : ""));
    });

    function update(step, anim = true) {
      reveal = [2019, 2022, 2026, 2026][step];
      const dur = anim ? T(1000) : 0;
      clip.transition().duration(dur).ease(d3.easeCubicInOut).attr("width", x(reveal) + 10);
      pts.transition().duration(dur).style("opacity", d => (d <= reveal ? 1 : 0));
      band.transition().duration(anim ? T(500) : 0).style("opacity", step >= 1 ? 1 : 0);
      ann.selectAll("*").remove();
      const P = yr => [x(yr), y(vals[yi(yr)])];
      const dl = anim ? 500 : 0;
      annot(ann, ...P(2019), [{ t: fInt(22451), cls: "big" }], { pos: "above", delay: step === 0 ? dl : 0 });
      if (step >= 1) annot(ann, ...P(2020), [{ t: "−40%", cls: "big accent" }, { t: "13 493 fő" }], { pos: "below", delay: step === 1 ? dl : 0 });
      if (step >= 2) annot(ann, ...P(2023), [{ t: "+101%", cls: "big accent" }, { t: "egy év alatt" }], { pos: "right", anchor: "end", dx: -14, delay: step === 2 ? dl : 0 });
      if (step >= 3) annot(ann, ...P(2026), [{ t: fInt(36799), cls: "big" }], { pos: "above", anchor: "end", delay: dl });
    }
    return { update };
  }

  // =====================================================================
  // 2. EMELT – index (scrolly)
  // =====================================================================
  const SER = {
    alap: { color: C.orange, dash: null },
    mester: { color: C.blue, dash: null },
    osztatlan: { color: C.gray, dash: null },
    foszk: { color: C.gray, dash: "5 4" }
  };
  const hiddenIndex = new Set();
  function indexChart(el) {
    const H = scrollyHeight(el, 40);
    const m = { top: 26, right: isMobile() ? 78 : 96, bottom: 30, left: 40 };
    const { g, iw, ih } = frame(el, H, m);
    const x = d3.scaleLinear([2013, 2026], [0, iw]);
    const y = d3.scaleLinear([40, 210], [ih, 0]);

    const band = g.append("g").style("opacity", 0);
    band.append("rect").attr("class", "band").attr("x", x(2019.5)).attr("width", x(2022.5) - x(2019.5)).attr("height", ih);
    band.append("text").attr("class", "band-label").attr("x", x(2021)).attr("y", -10).attr("text-anchor", "middle").text("emelt érettségi kötelező");
    yGrid(g, y, iw, d => d, 5, [50, 100, 150, 200]);
    yearAxis(g, x, ih, iw);
    g.append("line").attr("x1", 0).attr("x2", iw).attr("y1", y(100)).attr("y2", y(100)).attr("stroke", C.ink).attr("stroke-dasharray", "2 3");
    g.append("text").attr("class", "band-label").attr("x", 4).attr("y", y(100) - 6).text("2019 = 100");

    const line = d3.line().x((d, i) => x(years[i])).y(d => y(d));
    const paths = g.append("g").selectAll("path").data(D.index).join("path")
      .attr("fill", "none").attr("stroke", d => SER[d.key].color).attr("stroke-dasharray", d => SER[d.key].dash)
      .attr("stroke-linejoin", "round").attr("d", d => line(d.values));
    const labels = g.append("g");
    const ann = g.append("g").attr("class", "annot");
    const dots = g.append("g");

    let emph = ["alap", "mester"];
    yearHover(g, x, iw, ih, () => years, (yr, ev) => {
      dots.selectAll("*").remove();
      if (yr == null) return;
      const vis = D.index.filter(s => !hiddenIndex.has(s.key));
      vis.forEach(s => dots.append("circle").attr("cx", x(yr)).attr("cy", y(s.values[yi(yr)])).attr("r", 4.5)
        .attr("fill", SER[s.key].color).attr("stroke", C.paper).attr("stroke-width", 2));
      const sorted = vis.slice().sort((a, b) => b.values[yi(yr)] - a.values[yi(yr)]);
      showTip(ev, title(`${yr} (2019 = 100)`) + sorted.map(s => row(SER[s.key].color, s.name, s.values[yi(yr)], !!SER[s.key].dash)).join(""));
    });

    let cur = 0;
    function update(step, anim = true) {
      cur = step;
      emph = step === 2 ? ["osztatlan", "foszk"] : ["alap", "mester"];
      const dur = anim ? T(600) : 0;
      paths.transition().duration(dur)
        .attr("stroke-width", d => (emph.includes(d.key) ? 2.75 : 1.5))
        .style("opacity", d => (hiddenIndex.has(d.key) ? 0 : emph.includes(d.key) ? 1 : 0.28));
      paths.filter(d => emph.includes(d.key)).raise();
      band.transition().duration(dur).style("opacity", step >= 1 ? 1 : 0);

      labels.selectAll("*").remove();
      const items = D.index.filter(s => !hiddenIndex.has(s.key))
        .map(s => ({ s, y: y(s.values[years.length - 1]) }));
      dodge(items, 15, 0, ih).forEach(d => {
        labels.append("text").attr("class", "direct-label").attr("x", iw + 8).attr("y", d.y + 4)
          .style("opacity", emph.includes(d.s.key) ? 1 : 0.55).text(d.s.name);
      });

      ann.selectAll("*").remove();
      const P = (k, yr) => [x(yr), y(D.index.find(s => s.key === k).values[yi(yr)])];
      const dl = anim ? 450 : 0;
      if (step === 1) {
        if (!hiddenIndex.has("alap")) annot(ann, ...P("alap", 2020), [{ t: "60", cls: "big accent" }, { t: "alapképzés" }], { pos: "below", delay: dl });
        if (!hiddenIndex.has("mester")) annot(ann, ...P("mester", 2020), [{ t: "91", cls: "big" }, { t: "mester" }], { pos: "above", gap: 30, delay: dl });
      }
      if (step === 3 && !hiddenIndex.has("alap")) {
        annot(ann, ...P("alap", 2022), [{ t: "72", cls: "big" }], { pos: "below", delay: dl });
        annot(ann, ...P("alap", 2023), [{ t: "144", cls: "big accent" }], { pos: "above", anchor: "end", dx: -6, delay: dl + 150 });
      }
    }
    return { update, get step() { return cur; } };
  }

  // =====================================================================
  // Nappali vs részidős
  // =====================================================================
  function npChart(el) {
    const H = blockHeight(el, 0.7, 400);
    const m = { top: 24, right: 8, bottom: 46, left: 48 };
    const { g, iw, ih } = frame(el, H, m);
    const data = D.nappaliVsReszido;
    const keys = [{ k: "reszido", name: "Részidős", color: C.orange }, { k: "nappali", name: "Nappali", color: C.blue }];
    const x0 = d3.scaleBand(data.map(d => d.label), [0, iw]).padding(0.28);
    const x1 = d3.scaleBand(keys.map(k => k.k), [0, x0.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear([-0.5, 1.1], [ih, 0]);
    yGrid(g, y, iw, fPctS, 6, [-0.4, 0, 0.4, 0.8]);
    g.append("line").attr("class", "zero-line").attr("x1", 0).attr("x2", iw).attr("y1", y(0)).attr("y2", y(0));
    const grp = g.selectAll(".grp").data(data).join("g").attr("transform", d => `translate(${x0(d.label)},0)`);
    grp.append("text").attr("class", "value-label").attr("x", x0.bandwidth() / 2).attr("y", ih + 20).attr("text-anchor", "middle").text(d => d.label);
    grp.append("text").attr("class", "band-label").attr("x", x0.bandwidth() / 2).attr("y", ih + 36).attr("text-anchor", "middle").text(d => d.sub);
    keys.forEach(k => {
      grp.append("path").attr("fill", k.color)
        .attr("d", d => barPath(x1(k.k), y(0), x1.bandwidth(), y(0) - y(d[k.k]), d[k.k] >= 0))
        .on("pointermove", (ev, d) => showTip(ev, title(`${d.label} (${d.sub})`) + row(k.color, k.name, fPctS(d[k.k])) + row(null, "Arány részidő / nappali", fNum1(d.reszido / d.nappali).replace("-", "") + "×")))
        .on("pointerleave", hideTip);
      grp.append("text").attr("class", "value-label").attr("text-anchor", "middle")
        .attr("x", x1(k.k) + x1.bandwidth() / 2)
        .attr("y", d => (d[k.k] >= 0 ? y(d[k.k]) - 6 : y(d[k.k]) + 16))
        .text(d => fPctS(d[k.k]));
    });
    return { update() {} };
  }
  // Oszlop lekerekített adatvéggel (4px), alapvonalhoz rögzítve. h = előjeles magasság pixelben.
  function barPath(x, y0, w, h, up) {
    const hh = Math.abs(h), r = Math.min(4, hh, w / 2);
    if (hh < 0.5) return `M${x},${y0}h${w}v0h${-w}Z`;
    if (up) return `M${x},${y0}V${y0 - hh + r}Q${x},${y0 - hh} ${x + r},${y0 - hh}H${x + w - r}Q${x + w},${y0 - hh} ${x + w},${y0 - hh + r}V${y0}Z`;
    return `M${x},${y0}V${y0 + hh - r}Q${x},${y0 + hh} ${x + r},${y0 + hh}H${x + w - r}Q${x + w},${y0 + hh} ${x + w},${y0 + hh - r}V${y0}Z`;
  }

  // =====================================================================
  // 3. DiD – eseményelemzés (scrolly)
  // =====================================================================
  function eventChart(el) {
    const H = scrollyHeight(el);
    const m = { top: 34, right: 24, bottom: 30, left: 52 };
    const f = frame(el, H, m), { g, iw, ih } = f;
    const v = D.event;
    const x = d3.scaleLinear([2013, 2026], [0, iw]);
    const y = d3.scaleLinear([-0.42, 0.16], [ih, 0]);

    const bands = g.append("g");
    const base = bands.append("g").style("opacity", 0);
    base.append("rect").attr("x", x(2016.5)).attr("width", x(2019.5) - x(2016.5)).attr("height", ih).attr("fill", "#DDE5EC");
    base.append("text").attr("class", "band-label").attr("x", x(2018)).attr("y", -10).attr("text-anchor", "middle").text("bázis 2017–19");
    const ban = bands.append("g").style("opacity", 0);
    ban.append("rect").attr("class", "band").attr("x", x(2019.5)).attr("width", x(2022.5) - x(2019.5)).attr("height", ih);
    ban.append("text").attr("class", "band-label").attr("x", x(2021)).attr("y", -10).attr("text-anchor", "middle").text("gát 2020–22");
    yGrid(g, y, iw, fPctS, 6, [-0.4, -0.3, -0.2, -0.1, 0, 0.1]);
    yearAxis(g, x, ih, iw);
    g.append("line").attr("class", "zero-line").attr("x1", 0).attr("x2", iw).attr("y1", y(0)).attr("y2", y(0));

    const clipId = "clip-event";
    const clip = f.svg.append("clipPath").attr("id", clipId).append("rect").attr("x", -10).attr("y", -20).attr("height", ih + 40).attr("width", 0);
    g.append("path").datum(v).attr("clip-path", `url(#${clipId})`).attr("fill", "none")
      .attr("stroke", C.blue9).attr("stroke-width", 2.5).attr("stroke-linejoin", "round")
      .attr("d", d3.line().x((d, i) => x(years[i])).y(d => y(d)));
    const pts = g.append("g").selectAll("circle").data(years).join("circle")
      .attr("cx", d => x(d)).attr("cy", d => y(v[yi(d)])).attr("r", 4.5)
      .attr("fill", d => (d >= 2020 && d <= 2022 ? C.orange : C.blue9)).attr("stroke", C.paper).attr("stroke-width", 2).style("opacity", 0);
    const ann = g.append("g").attr("class", "annot");
    const focus = g.append("circle").attr("r", 8).attr("fill", "none").attr("stroke", C.orange).attr("stroke-width", 2).style("opacity", 0);

    let reveal = 2019;
    yearHover(g, x, iw, ih, () => years.filter(yy => yy <= reveal), (yr, ev) => {
      if (yr == null) return focus.style("opacity", 0);
      focus.attr("cx", x(yr)).attr("cy", y(v[yi(yr)])).style("opacity", 1);
      const per = yr < 2017 ? "korai időszak" : yr <= 2019 ? "bázisidőszak" : yr <= 2022 ? "a gát évei" : "eltörlés után";
      showTip(ev, title(yr) + row(null, "Eltérés 2019-hez", yr === 2019 ? "0 (viszonyítási év)" : fPct1S(v[yi(yr)])) + note(per));
    });

    function update(step, anim = true) {
      reveal = [2019, 2022, 2026][step];
      const dur = anim ? T(1000) : 0;
      clip.transition().duration(dur).ease(d3.easeCubicInOut).attr("width", x(reveal) + 10);
      pts.transition().duration(dur).style("opacity", d => (d <= reveal ? 1 : 0));
      base.transition().duration(dur).style("opacity", 1);
      ban.transition().duration(dur).style("opacity", step >= 1 ? 1 : 0);
      ann.selectAll("*").remove();
      const dl = anim ? 500 : 0;
      annot(ann, x(2018), y(0), [{ t: "−7% … 0", cls: "big" }, { t: "nagyjából együtt" }], { pos: "above", gap: 14, delay: step === 0 ? dl : 0 });
      annot(ann, x(2014.5), y(-0.25), [{ t: "2013–16: nem teljesen" }, { t: "párhuzamos" }], { pos: "below", gap: 18, delay: step === 0 ? dl : 0 })
        .selectAll("text").style("fill", C.muted);
      if (step >= 1) annot(ann, x(2021), y(-0.339), [{ t: "−31% … −34%", cls: "big accent" }, { t: "három éven át" }], { pos: "below", gap: 16, delay: step === 1 ? dl : 0 });
      if (step >= 2) {
        annot(ann, x(2023), y(v[yi(2023)]), [{ t: "+7%", cls: "big" }], { pos: "above", delay: dl });
        annot(ann, x(2025), y(-0.15), [{ t: "−14% … −17%" }], { pos: "below", gap: 16, delay: dl + 150 });
      }
    }
    return { update };
  }

  // =====================================================================
  // Kontrafaktuális: hiányzó jelentkezők (csúszka)
  // =====================================================================
  let cfEffect = EFFECT;
  function cfChart(el) {
    const H = blockHeight(el, 0.5, 400);
    const m = { top: 24, right: 20, bottom: 30, left: 56 };
    const { g, iw, ih } = frame(el, H, m);
    const yrs = years.filter(yy => yy >= 2016);
    const x = d3.scaleLinear([2016, 2026], [0, iw]);
    const y = d3.scaleLinear([0, 40000], [ih, 0]);
    g.append("rect").attr("class", "band").attr("x", x(2019.5)).attr("width", x(2022.5) - x(2019.5)).attr("height", ih);
    yGrid(g, y, iw, fInt);
    yearAxis(g, x, ih, iw, yrs);

    const act = yr => D.alap[yi(yr)];
    const gapYrs = [2019, 2020, 2021, 2022, 2023];
    const area = g.append("path").attr("fill", C.orangeSoft).attr("opacity", 0.75);
    const cfLine = g.append("path").attr("fill", "none").attr("stroke", C.orange).attr("stroke-width", 2.25).attr("stroke-dasharray", "6 4");
    g.append("path").datum(yrs).attr("fill", "none").attr("stroke", C.blue9).attr("stroke-width", 2.5)
      .attr("d", d3.line().x(d => x(d)).y(d => y(act(d))));
    g.append("g").selectAll("circle").data(yrs).join("circle").attr("cx", d => x(d)).attr("cy", d => y(act(d)))
      .attr("r", 4).attr("fill", C.blue9).attr("stroke", C.paper).attr("stroke-width", 2);
    const cfDots = g.append("g");
    const lab = g.append("g").attr("class", "annot");
    lab.append("text").attr("x", x(2016)).attr("y", y(act(2016)) - 14).text("tényleges").style("font-weight", 700);
    const cfLab = lab.append("text").attr("text-anchor", "middle").style("font-weight", 700).style("fill", C.ink);

    let cfv = {};
    function draw(eff, anim) {
      cfv = {};
      gapYrs.forEach(yr => (cfv[yr] = yr >= 2020 && yr <= 2022 ? act(yr) / (1 + eff) : act(yr)));
      const dur = anim ? T(250) : 0;
      area.transition().duration(dur).attr("d", d3.area().x(d => x(d)).y0(d => y(act(d))).y1(d => y(cfv[d]))(gapYrs));
      cfLine.transition().duration(dur).attr("d", d3.line().x(d => x(d)).y(d => y(cfv[d]))(gapYrs));
      cfDots.selectAll("circle").data([2020, 2021, 2022]).join("circle").attr("r", 4).attr("fill", C.paper)
        .attr("stroke", C.orange).attr("stroke-width", 2).attr("cx", d => x(d))
        .transition().duration(dur).attr("cy", d => y(cfv[d]));
      const top = d3.max([2020, 2021, 2022], d => cfv[d]);
      cfLab.transition().duration(dur).attr("x", x(2021)).attr("y", y(top) - 14).text("gát nélkül várható");
    }
    draw(cfEffect, false);

    yearHover(g, x, iw, ih, () => yrs, (yr, ev) => {
      if (yr == null) return;
      let html = title(yr) + row(C.blue9, "Tényleges", fInt(act(yr)) + " fő");
      if (yr >= 2020 && yr <= 2022) {
        html += row(C.orange, "Gát nélkül várható", fInt(Math.round(cfv[yr])) + " fő", true) +
          row(null, "Hiányzó", fInt(Math.round(cfv[yr] - act(yr))) + " fő");
      }
      showTip(ev, html);
    });
    return { update() {}, draw };
  }
  function cfNumbers(eff) {
    const miss = [2020, 2021, 2022].map(yr => D.alap[yi(yr)] * (1 / (1 + eff) - 1));
    const tot = d3.sum(miss);
    document.getElementById("cf-total").textContent = "≈ " + fInt(Math.round(tot / 100) * 100);
    document.getElementById("cf-year").textContent = "≈ " + fInt(Math.round(tot / 3 / 100) * 100);
    const rows = [2020, 2021, 2022].map((yr, i) => [yr, fInt(D.alap[yi(yr)]), fInt(Math.round(D.alap[yi(yr)] + miss[i])), fInt(Math.round(miss[i]))]);
    rows.push(["Összesen", "", "", fInt(Math.round(tot))]);
    dataTable("cf", ["Év", "Tényleges", "Gát nélkül várható", "Hiányzó"], rows);
  }

  // =====================================================================
  // 4. 280 pont – arány idősor
  // =====================================================================
  const S280 = { allami: C.blue, onkolt: C.orange };
  function b280Chart(el) {
    const H = blockHeight(el, 0.52, 400);
    const m = { top: 28, right: isMobile() ? 92 : 118, bottom: 30, left: 44 };
    const { g, iw, ih } = frame(el, H, m);
    const x = d3.scaleLinear([2013, 2026], [0, iw]);
    const y = d3.scaleLinear([0, 1], [ih, 0]);
    g.append("rect").attr("class", "band").attr("x", x(2014.5)).attr("width", x(2022.5) - x(2014.5)).attr("height", ih);
    g.append("text").attr("class", "band-label").attr("x", x(2018.5)).attr("y", -10).attr("text-anchor", "middle").text("280 pontos minimum (2015–22)");
    yGrid(g, y, iw, fPct, 4, [0, 0.25, 0.5, 0.75, 1]);
    yearAxis(g, x, ih, iw);
    const line = d3.line().x((d, i) => x(years[i])).y(d => y(d));
    D.below280.forEach(s => {
      const p = g.append("path").attr("fill", "none").attr("stroke", S280[s.key]).attr("stroke-width", 2.5).attr("d", line(s.values));
      const L = p.node().getTotalLength();
      p.attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L).transition().duration(T(1400)).attr("stroke-dashoffset", 0)
        .on("end", function () { d3.select(this).attr("stroke-dasharray", null); });
    });
    const items = D.below280.map(s => ({ s, y: y(s.values[years.length - 1]) }));
    dodge(items, 16, 0, ih).forEach(d => g.append("text").attr("class", "direct-label").attr("x", iw + 8).attr("y", d.y + 4).text(d.s.name));
    const ann = g.append("g").attr("class", "annot");
    annot(ann, x(2023), y(D.below280[0].values[yi(2023)]), [{ t: "25%", cls: "big accent" }], { pos: "below", anchor: "start", dx: 6, gap: 4 });
    const dots = g.append("g");
    yearHover(g, x, iw, ih, () => years, (yr, ev) => {
      dots.selectAll("*").remove();
      if (yr == null) return;
      D.below280.forEach(s => dots.append("circle").attr("cx", x(yr)).attr("cy", y(s.values[yi(yr)])).attr("r", 4.5).attr("fill", S280[s.key]).attr("stroke", C.paper).attr("stroke-width", 2));
      showTip(ev, title(yr) + D.below280.map(s => row(S280[s.key], s.name, fPct(s.values[yi(yr)]))).join("") +
        (yr >= 2015 && yr <= 2022 ? note("280 pontos jogszabályi minimum") : ""));
    });
    return { update() {} };
  }

  // =====================================================================
  // 4. 280 pont – hisztogram (évválasztó)
  // =====================================================================
  let histMode = "both";
  const HC = { 2022: C.blue4, 2023: C.orange };
  function histChart(el) {
    const H = blockHeight(el, 0.52, 400);
    const m = { top: 30, right: 8, bottom: 40, left: 44 };
    const { g, iw, ih } = frame(el, H, m);
    const bins = D.hist.bins;
    const x0 = d3.scaleBand(bins, [0, iw]).paddingInner(0.12).paddingOuter(0.05);
    const y = d3.scaleLinear([0, 0.55], [ih, 0]);
    yGrid(g, y, iw, fPct, 5, [0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const step = iw < 500 ? 4 : 2;
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x0).tickValues(bins.filter((_, i) => i % step === 0)).tickSize(0).tickPadding(8));
    g.append("text").attr("class", "band-label").attr("x", iw).attr("y", ih + 34).attr("text-anchor", "end").text("ponthatár (20 pontos sáv kezdőpontja)");
    const wallX = x0(280) - (x0.step() * x0.paddingInner()) / 2;
    g.append("line").attr("x1", wallX).attr("x2", wallX).attr("y1", -22).attr("y2", ih).attr("stroke", C.ink).attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
    g.append("text").attr("class", "band-label").attr("x", wallX - 6).attr("y", -14).attr("text-anchor", "end").style("fill", C.ink).text("280-as fal");
    const barsG = g.append("g");
    const labG = g.append("g");

    function update(anim = true) {
      const ser = histMode === "both" ? ["2022", "2023"] : [histMode];
      const x1 = d3.scaleBand(ser, [0, x0.bandwidth()]).padding(ser.length > 1 ? 0.1 : 0);
      const data = [];
      bins.forEach((b, i) => ser.forEach(s => data.push({ b, s, v: D.hist["y" + s][i], i })));
      barsG.selectAll("path").data(data, d => d.b + "-" + d.s).join(
        enter => enter.append("path").attr("fill", d => HC[d.s]),
        update => update,
        exit => exit.remove()
      ).on("pointermove", (ev, d) => {
        const r = `${d.b}–${d.b + 19} pont`;
        showTip(ev, title(r) + ["2022", "2023"].map(s => row(HC[s], s, fPct1(D.hist["y" + s][d.i]))).join("") + note("a sorok aránya az adott évben"));
      }).on("pointerleave", hideTip)
        .attr("d", d => barPath(x0(d.b) + x1(d.s), ih, x1.bandwidth(), ih - y(d.v), true));

      labG.selectAll("*").remove();
      const i280 = bins.indexOf(280);
      ser.forEach(s => {
        const v = D.hist["y" + s][i280];
        const shift = ser.length > 1 && s === "2022";
        labG.append("text").attr("class", "value-label").attr("text-anchor", shift ? "start" : "middle")
          .attr("x", x0(280) + x1(s) + (shift ? 2 : x1.bandwidth() / 2)).attr("y", y(v) - 6).text(fPct(v));
      });
      const st = D.hist.stats;
      const f1 = n => fNum1(n).replace(/,0$/, "");
      document.getElementById("hist-min").textContent = histMode === "both" ? `${st[2022].min} → ${st[2023].min}` : String(st[histMode].min);
      const fl = D.hist.y2022[i280], fl3 = D.hist.y2023[i280];
      document.getElementById("hist-floor").textContent = histMode === "both" ? `${fPct(fl)} → ${fPct(fl3)}` : fPct(histMode === "2022" ? fl : fl3);
      document.getElementById("hist-med").textContent = histMode === "both" ? `${f1(st[2022].median)} → ${f1(st[2023].median)}` : f1(st[histMode].median);
    }
    update(false);
    return { update: () => update(true) };
  }

  // =====================================================================
  // Felvettek aránya 280 alatti soron
  // =====================================================================
  function admChart(el) {
    const H = blockHeight(el, 0.48, 360);
    const m = { top: 28, right: 8, bottom: 30, left: 44 };
    const { g, iw, ih } = frame(el, H, m);
    const { years: ys, values } = D.admittedBelow;
    const x = d3.scaleBand(ys, [0, iw]).padding(0.35);
    const y = d3.scaleLinear([0, 0.7], [ih, 0]);
    yGrid(g, y, iw, fPct, 4, [0, 0.2, 0.4, 0.6]);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat(d => d));
    g.selectAll(".b").data(ys).join("path").attr("fill", d => (d === 2022 ? C.gray2 : C.blue))
      .attr("d", d => barPath(x(d), ih, x.bandwidth(), ih - y(values[ys.indexOf(d)]), true))
      .on("pointermove", (ev, d) => showTip(ev, title(d) + row(null, "280 alatti soron", fPct1(values[ys.indexOf(d)])) + (d === 2022 ? note("még érvényben volt a 280 pontos minimum") : "")))
      .on("pointerleave", hideTip);
    g.selectAll(".l").data(ys).join("text").attr("class", "value-label").attr("text-anchor", "middle")
      .attr("x", d => x(d) + x.bandwidth() / 2).attr("y", d => y(values[ys.indexOf(d)]) - 8)
      .text(d => fPct(values[ys.indexOf(d)]) + (d === 2022 ? " (minimum)" : ""));
    return { update() {} };
  }

  // =====================================================================
  // Placebo
  // =====================================================================
  let placeboBand = true;
  function placeboChart(el) {
    const H = blockHeight(el, 0.52, 400);
    const m = { top: 24, right: 8, bottom: 30, left: 48 };
    const { g, iw, ih } = frame(el, H, m);
    const { years: ys, values, reform } = D.placebo;
    const x = d3.scaleBand(ys, [0, iw]).padding(0.25);
    const y = d3.scaleLinear([-0.42, 0.68], [ih, 0]);
    const others = values.filter((_, i) => !reform.includes(ys[i]));
    const lo = d3.min(others), hi = d3.max(others);
    const bandG = g.append("g").attr("class", "placebo-band");
    bandG.append("rect").attr("x", 0).attr("width", iw).attr("y", y(hi)).attr("height", y(lo) - y(hi)).attr("fill", C.panel);
    bandG.append("text").attr("class", "band-label").attr("x", 4).attr("y", y(hi) - 6).text(`a többi 11 évváltás sávja: ${fPctS(lo)} … ${fPctS(hi)}`);
    bandG.style("opacity", placeboBand ? 1 : 0);
    yGrid(g, y, iw, fPctS, 6, [-0.4, -0.2, 0, 0.2, 0.4, 0.6]);
    const step = iw < 420 ? 3 : iw < 620 ? 2 : 1;
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(ys.filter((_, i) => i % step === 0)).tickSize(0).tickPadding(8).tickFormat(d => d));
    g.append("line").attr("class", "zero-line").attr("x1", 0).attr("x2", iw).attr("y1", y(0)).attr("y2", y(0));
    const isR = d => reform.includes(d);
    g.selectAll(".b").data(ys).join("path").attr("fill", d => (isR(d) ? C.orange : C.gray2))
      .attr("d", d => { const v = values[ys.indexOf(d)]; return barPath(x(d), y(0), x.bandwidth(), Math.abs(y(v) - y(0)), v >= 0); })
      .on("pointermove", (ev, d) => showTip(ev, title(`${d - 1} → ${d}`) + row(null, "Alap / mester arány", fPct1S(values[ys.indexOf(d)])) + (isR(d) ? note(d === 2020 ? "Reformév: emelt érettségi bevezetése" : "Reformév: emelt és 280 pont eltörlése") : "")))
      .on("pointerleave", hideTip);
    reform.forEach(r => {
      const v = values[ys.indexOf(r)];
      g.append("text").attr("class", "value-label").attr("text-anchor", "middle").attr("x", x(r) + x.bandwidth() / 2)
        .attr("y", v >= 0 ? y(v) - 8 : y(v) + 18).text(fPctS(v));
    });
    return { update() {}, toggle(on) { bandG.transition().duration(T(300)).style("opacity", on ? 1 : 0); } };
  }

  // =====================================================================
  // Alternatív magyarázatok táblázat
  // =====================================================================
  function altTable() {
    const ic = { main: "✓", partial: "◐", no: "✕" };
    document.getElementById("alt-table").innerHTML = `<table>
      <thead><tr><th scope="col">Magyarázat</th><th scope="col">Időzítés</th><th scope="col">Mintázat</th><th scope="col">Ítélet</th></tr></thead>
      <tbody>${D.alternatives.map(a => `<tr class="${a.level}"><th scope="row" style="text-align:left;font-weight:${a.level === "main" ? 700 : 600}">${a.name}</th><td>${a.timing}</td><td>${a.pattern}</td>
      <td><span class="verdict ${a.level}"><span class="ic" aria-hidden="true">${ic[a.level]}</span>${a.verdict}</span></td></tr>`).join("")}</tbody></table>`;
  }

  // =====================================================================
  // Összeszerelés
  // =====================================================================
  const registry = [
    { id: "hero-chart", make: heroChart },
    { id: "chart-trend", make: trendChart, scrolly: "trend" },
    { id: "chart-index", make: indexChart, scrolly: "index" },
    { id: "chart-np", make: npChart },
    { id: "chart-event", make: eventChart, scrolly: "event" },
    { id: "chart-cf", make: cfChart },
    { id: "chart-280", make: b280Chart },
    { id: "chart-hist", make: histChart },
    { id: "chart-adm", make: admChart },
    { id: "chart-placebo", make: placeboChart }
  ];
  const inst = {};
  const stepOf = {};
  const built = new Set();
  function build(r) {
    const el = document.getElementById(r.id);
    if (!el) return;
    inst[r.id] = r.make(el);
    built.add(r.id);
    if (r.scrolly) inst[r.id].update(stepOf[r.scrolly] || 0, false);
  }

  // Lusta rajzolás: a nem-scrolly ábrák akkor animálnak, amikor láthatóvá válnak
  const lazyObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const r = registry.find(rr => rr.id === e.target.id);
      if (r && !built.has(r.id)) build(r);
      lazyObs.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -15% 0px" });
  registry.forEach(r => {
    const el = document.getElementById(r.id);
    if (!el) return;
    if (r.scrolly || r.id === "hero-chart") build(r);
    else lazyObs.observe(el);
  });

  // Scrollytelling: a képernyő közepén áthaladó lépés aktiválódik
  document.querySelectorAll(".scrolly").forEach(sec => {
    const key = sec.dataset.chart;
    const r = registry.find(rr => rr.scrolly === key);
    const stepsEls = sec.querySelectorAll(".step");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const s = +e.target.dataset.step;
        stepsEls.forEach(el => el.classList.toggle("is-active", el === e.target));
        if (stepOf[key] !== s) {
          stepOf[key] = s;
          inst[r.id] && inst[r.id].update(s, true);
        }
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    stepsEls.forEach(el => obs.observe(el));
    stepsEls[0].classList.add("is-active");
  });

  // Jelmagyarázat – index (ki/be kapcsolható)
  legend(document.getElementById("legend-index"),
    D.index.map(s => ({ key: s.key, name: s.name, color: SER[s.key].color, dash: SER[s.key].dash })), true,
    (k, on) => { on ? hiddenIndex.delete(k) : hiddenIndex.add(k); inst["chart-index"].update(stepOf.index || 0, true); });
  legend(document.getElementById("legend-np"), [{ name: "Részidős", color: C.orange, box: true }, { name: "Nappali", color: C.blue, box: true }], false);
  legend(document.getElementById("legend-hist"), [{ name: "2022 (még volt minimum)", color: HC[2022], box: true }, { name: "2023 (eltörlés után)", color: HC[2023], box: true }], false);
  legend(document.getElementById("legend-280"), D.below280.map(s => ({ name: s.name, color: S280[s.key] })), false);

  // Csúszka
  const slider = document.getElementById("effect-slider");
  const out = document.getElementById("effect-out");
  const effFromSlider = () => (+slider.value === 29 ? EFFECT : -(+slider.value) / 100);
  function onSlide(anim) {
    cfEffect = effFromSlider();
    out.textContent = fPct1S(cfEffect) + (+slider.value === 29 ? " (becslés)" : "");
    if (inst["chart-cf"]) inst["chart-cf"].draw(cfEffect, anim);
    cfNumbers(cfEffect);
  }
  slider.addEventListener("input", () => onSlide(true));
  document.getElementById("effect-reset").addEventListener("click", () => { slider.value = 29; onSlide(true); });
  onSlide(false);

  // Hisztogram évválasztó
  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
    histMode = b.dataset.year;
    document.querySelectorAll(".seg-btn").forEach(o => o.setAttribute("aria-checked", o === b ? "true" : "false"));
    if (inst["chart-hist"]) inst["chart-hist"].update();
  }));

  // Placebo sáv
  document.getElementById("placebo-band").addEventListener("change", e => {
    placeboBand = e.target.checked;
    if (inst["chart-placebo"]) inst["chart-placebo"].toggle(placeboBand);
  });

  altTable();

  // Adattáblák
  dataTable("np", ["Évváltás", "Részidős", "Nappali"], D.nappaliVsReszido.map(d => [`${d.label} (${d.sub})`, fPct1S(d.reszido), fPct1S(d.nappali)]));
  dataTable("b280", ["Év", ...D.below280.map(s => s.name)], years.map(yr => [yr, ...D.below280.map(s => fPct1(s.values[yi(yr)]))]));
  dataTable("hist", ["Ponthatár-sáv", "2022", "2023"], D.hist.bins.map((b, i) => [`${b}–${b + 19}`, fPct1(D.hist.y2022[i]), fPct1(D.hist.y2023[i])]));
  dataTable("adm", ["Év", "Felvettek aránya 280 alatti soron"], D.admittedBelow.years.map((yr, i) => [yr, fPct1(D.admittedBelow.values[i])]));
  dataTable("placebo", ["Évváltás", "Alap / mester arány változása"], D.placebo.years.map((yr, i) => [`${yr - 1} → ${yr}`, fPct1S(D.placebo.values[i])]));

  // Felső sáv, haladásjelző, aktív fejezet
  const topbar = document.getElementById("topbar");
  const progress = document.getElementById("progress");
  const hero = document.querySelector(".hero");
  function onScroll() {
    const sy = window.scrollY;
    topbar.classList.toggle("visible", sy > hero.offsetHeight * 0.6);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (sy / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const navLinks = [...document.querySelectorAll(".chapters a")];
  const chapterObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.dataset.chapter));
      // keskeny képernyőn a vízszintesen görgethető menüben az aktív fejezet maradjon látható
      const act = navLinks.find(l => l.classList.contains("active"));
      const bar = act && act.closest(".chapters");
      if (bar && bar.scrollWidth > bar.clientWidth) {
        const x = act.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
        bar.scrollTo({ left: x - (bar.clientWidth - act.offsetWidth) / 2, behavior: "smooth" });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  // Minden szakasz a legutóbbi fejezetcímhez tartozik
  const chapterIds = ["jelenseg", "emelt", "did", "pont280", "ellenprobak", "kovetkeztetes"];
  let curChapter = null;
  document.querySelectorAll("body > section, body > footer").forEach(el => {
    if (chapterIds.includes(el.id)) curChapter = el.id;
    if (el.id === "modszertan") curChapter = "kovetkeztetes";
    el.dataset.chapter = curChapter || "";
    chapterObs.observe(el);
  });

  // Billentyűs léptetés: ↓ / → előre, ↑ / ← vissza a következő / előző megállóig
  // Megállók: minden szakasz teteje (a hosszú szakaszokon képernyőnként),
  // a scrollytelling-lépéseknél pedig a lépés közepe a képernyő közepén.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function navStops() {
    const vh = window.innerHeight;
    const topH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 52;
    const maxY = document.documentElement.scrollHeight - vh;
    const out = [];
    document.querySelectorAll("body > section, body > footer").forEach(el => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (el.classList.contains("scrolly")) {
        el.querySelectorAll(".step").forEach(st => {
          const sr = st.getBoundingClientRect();
          out.push(sr.top + window.scrollY + sr.height / 2 - vh / 2);
        });
        return;
      }
      let y = el.id === "top" ? 0 : top - topH;
      out.push(y);
      const bottom = top + r.height;
      const page = (vh - topH) * 0.85;
      while (y + vh < bottom - 40) { y = Math.min(y + page, bottom - vh); out.push(y); }
    });
    const sorted = out.map(y => Math.round(Math.max(0, Math.min(y, maxY)))).sort((a, b) => a - b);
    // A túl közeli megállók összevonása (ne legyen „mikro-lépés”)
    return sorted.reduce((acc, y) => { if (!acc.length || y - acc[acc.length - 1] > vh * 0.3) acc.push(y); return acc; }, []);
  }
  let navTarget = null, navTimer;
  document.addEventListener("keydown", e => {
    const fwd = e.key === "ArrowDown" || e.key === "ArrowRight";
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft";
    if (!fwd && !back) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, [contenteditable], [role=radiogroup]")) return;
    const cur = navTarget ?? window.scrollY;
    const stops = navStops();
    const next = fwd ? stops.find(y => y > cur + 4) : [...stops].reverse().find(y => y < cur - 4);
    if (next === undefined) return;
    e.preventDefault();
    navTarget = next;
    clearTimeout(navTimer);
    navTimer = setTimeout(() => { navTarget = null; }, 900);
    window.scrollTo({ top: next, behavior: reduceMotion ? "auto" : "smooth" });
  });

  // Átméretezés: újrarajzolás a jelenlegi állapottal
  let lastW = window.innerWidth, rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastW) < 2) return; // mobilos címsor-ugrás ne rajzoljon újra
      lastW = window.innerWidth;
      registry.forEach(r => {
        if (!built.has(r.id)) return;
        build(r);
        if (r.id === "chart-placebo") inst[r.id].toggle(placeboBand);
      });
    }, 180);
  });
})();
