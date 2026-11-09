/* TwigNest class sheet */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = n => Math.max(0, Math.min(1, n));
  const DOT = { "": "", s: "✓", n: "!", e: "+" }, DOTL = { "": "not assessed", s: "secure", n: "not yet secure", e: "exceeding" };
  const POS = { below: "Below grade level", inline: "In line", above: "Above grade level", none: "Not yet assessed" };
  const PROG = { below: "Below expected", inline: "Expected", above: "Above expected" };
  const badge = (c, t) => `<span class="badge b-${c}">${t}</span>`;
  let ctx, C, cls, studs = [], R = {}, ST = {}, TAUGHT = new Set(), LV = {}, CM = {}, ED = null, ui = { sub: null, strand: null, term: 0, group: "All", mode: "overview", pStrand: null, pid: null }, bound = false, pending = 0;

  const strands = () => { const o = []; C.subjects.forEach(sb => sb.strands.forEach(st => o.push([sb, st]))); return o; };
  const findStrand = id => strands().find(p => p[1].id === id) || [null, null];
  const findCol = id => { for (const [, st] of strands()) for (const c of st.cols) if (c.id === id) return c; return null; };
  const objs = (c, t) => ((c.objectives || {})[cls.grade_id] || [])[t] || [];
  const val = (sid, cid, k) => ((R[sid] || {})[cid] || {})[k];
  const stat = (sid, oid) => (ST[sid] || {})[oid] || "";
  const tLv = (sid, stid, k) => ((LV[sid] || {})[stid] || {})[k];
  function levelFromPct(p) { let lv = 0; C.gradeMin.forEach((x, i) => { if (p >= x) lv = i; }); return lv; }
  const lab = i => i == null ? "–" : C.scale[Math.max(0, Math.min(C.scale.length - 1, i))];

  function colEval(sid, c, k) {
    if (c.type === "comment") return null;
    if (c.type === "objectives") {
      if (k === "b") return null;
      let a = 0, sec = 0, ex = 0;
      objs(c, +k).filter(o => TAUGHT.has(o.id)).forEach(o => { const v = stat(sid, o.id); if (v) { a++; if (v !== "n") sec++; if (v === "e") ex++; } });
      if (!a) return null; const p = sec / a * 100, e = ex / a * 100;
      return { band: p < c.belowPct ? -1 : (p >= 90 && e >= c.abovePct) ? 1 : 0, norm: clamp(p / 100) };
    }
    const v = val(sid, c.id, k); if (v === undefined || v === "") return null;
    const pos = C.gradePos, gm = C.gradeMin, iS = (gm[pos.indexOf("inline")] ?? 50) / 100, aS = (gm[pos.indexOf("above")] ?? 90) / 100;
    const piece = (x, lo, hi, ls, hs) => x < lo ? iS * clamp((x - (lo - ls)) / ls) * .999 : x < hi ? iS + (aS - iS) * (x - lo) / (hi - lo) : aS + (1 - aS) * clamp((x - hi) / hs);
    if (c.type === "list") { const i = c.options.indexOf(v); if (i < 0) return null; const n = c.options.length;
      const norm = i < c.below ? iS * (i + .5) / c.below : i < c.above ? iS + (aS - iS) * (i - c.below + .5) / (c.above - c.below) : aS + (1 - aS) * (i - c.above + .5) / (n - c.above);
      return { band: i < c.below ? -1 : i >= c.above ? 1 : 0, norm }; }
    const n = +v; if (isNaN(n)) return null;
    if (c.type === "standardised") return { band: n < c.below ? -1 : n >= c.above ? 1 : 0, norm: piece(n, c.below, c.above, 30, 15) };
    if (c.type === "readingAge") return { band: n < c.below ? -1 : n > c.above ? 1 : 0, norm: piece(n, c.below, c.above + .0001, 1.5, 1.5) };
    return { band: n < c.below ? -1 : n >= c.above ? 1 : 0, norm: clamp(n / c.max) };
  }
  function strandEval(sid, st, k) {
    const ev = st.cols.filter(c => k === "b" ? c.baseline : !c.baseline).map(c => colEval(sid, c, k)).filter(Boolean);
    if (!ev.length) return null;
    const pct = Math.round(ev.reduce((a, x) => a + x.norm, 0) / ev.length * 1000) / 10, sug = levelFromPct(pct);
    return { band: C.gradePos[sug] || "inline", sug, pct };
  }
  function level(sid, st, k) { const t = tLv(sid, st.id, k); if (t !== undefined && t !== null) return t; const e = strandEval(sid, st, k); return e ? e.sug : null; }
  function progress(sid, st, t) {
    const b = level(sid, st, "b"), c = level(sid, st, String(t)); if (b == null || c == null) return null;
    const steps = c - b, exp = C.steps * (t + 1) / C.terms.length;
    return { steps, band: steps < exp - .5 ? "below" : steps > exp + .5 ? "above" : "inline" };
  }

  function avgEval(sid, list, k) {
    const ls = list.map(st => [level(sid, st, k), strandEval(sid, st, k)]).filter(x => x[0] != null); if (!ls.length) return null;
    const lv = Math.round(ls.reduce((a, x) => a + x[0], 0) / ls.length), bs = ls.filter(x => x[1]).map(x => ({ below: -1, inline: 0, above: 1 })[x[1].band]);
    const b = bs.length ? bs.reduce((a, x) => a + x, 0) / bs.length : 0; return { lv, band: bs.length ? (b < -.33 ? "below" : b > .33 ? "above" : "inline") : "none" };
  }
  function avgProgress(sid, list, t) {
    const ps = list.map(st => progress(sid, st, t)).filter(Boolean); if (!ps.length) return null;
    const steps = Math.round(ps.reduce((a, p) => a + p.steps, 0) / ps.length * 10) / 10, exp = C.steps * (t + 1) / C.terms.length;
    return { steps, band: steps < exp - .5 ? "below" : steps > exp + .5 ? "above" : "inline" };
  }
  function onTrack(sid, st, t) {
    const b = level(sid, st, "b"), c = level(sid, st, String(t)); if (b == null || c == null) return null;
    const max = C.scale.length - 1, target = Math.min(max, b + C.steps), proj = Math.min(max, Math.round(b + (c - b) / (t + 1) * C.terms.length));
    return { target, proj, ok: proj >= target };
  }
  const trackCount = (sid, list, t) => { const r = list.map(st => onTrack(sid, st, t)).filter(Boolean); return { ok: r.filter(x => x.ok).length, n: r.length }; };
  const allStrands = () => strands().map(p => p[1]);
  const sname = (sb, st) => sb.name === st.name ? sb.name : `${sb.name}: ${st.name}`;
  const signed = n => (n > 0 ? "+" : "") + n;
  function fixFor(c, sid, k) {
    if (c.type === "score" || c.type === "rubric") return `Go through the ${c.name.toLowerCase()} with the student to find the questions lost, then re-teach those areas in small steps.`;
    if (c.type === "standardised") return "Use the test report to find the weakest areas and target them in small-group work.";
    if (c.type === "readingAge") return "Daily guided reading at the right level, plus a home reading log checked weekly.";
    if (c.type === "list") { const v = val(sid, c.id, k), i = c.options.indexOf(v); return `Targeted group work to move from ${v} towards ${c.options[Math.max(c.below, i + 1)] || c.options[i]}.`; }
    return "Plan targeted support and review at the next checkpoint.";
  }
  function plan(sid, t) {
    const k = String(t), gaps = [], ahead = [];
    strands().forEach(([sb, st]) => {
      const nm = sname(sb, st), ot = onTrack(sid, st, t), pr = progress(sid, st, t), urgent = (pr && pr.band === "below") || (ot && !ot.ok), before = gaps.length;
      if (ot && !ot.ok) gaps.push({ nm, pri: 0, gap: `Not on track: heading for ${lab(ot.proj)} by the end of the year, target ${lab(ot.target)}.`, fix: "Plan targeted support this term and review progress at the next checkpoint." });
      st.cols.forEach(c => {
        if (c.type === "objectives") { for (let ti = 0; ti <= t; ti++) objs(c, ti).forEach(o => { if (!TAUGHT.has(o.id)) return; const v = stat(sid, o.id);
          if (v === "n") gaps.push({ nm, pri: urgent ? 0 : 1, gap: `Not yet secure: ${o.text}`, fix: o.step || "Re-teach in a small group and check again." });
          else if (!v) gaps.push({ nm, pri: 2, gap: `Not assessed yet: ${o.text}`, fix: "Assess this objective to complete the picture." }); }); return; }
        if (c.type === "comment") return;
        const kk = c.baseline ? "b" : k, e = colEval(sid, c, kk);
        if (!e) gaps.push({ nm, pri: 2, gap: `Missing: ${c.name}`, fix: "Record this result so the picture is complete." });
        else if (e.band < 0 && !c.baseline) gaps.push({ nm, pri: urgent ? 0 : 1, gap: `${c.name} is below expectations (${val(sid, c.id, kk)}).`, fix: fixFor(c, sid, kk) });
      });
      const e = strandEval(sid, st, k), real = gaps.slice(before).some(g => g.pri < 2);
      if (e && !real) {
        if (e.band === "above") ahead.push({ nm, text: "Working above expectations. Offer greater-depth challenges, open-ended problems and chances to explain their thinking." });
        st.cols.filter(c => c.type === "objectives").forEach(c => objs(c, t + 1).filter(o => !TAUGHT.has(o.id)).slice(0, 2).forEach(o => ahead.push({ nm, text: `Ready for next: ${o.text}. Pre-teach key vocabulary to give a head start.` })));
        if (e.band === "inline" && t + 1 >= C.terms.length) ahead.push({ nm, text: "Secure this year’s learning and share next steps with next year’s teacher." });
      }
    });
    gaps.sort((a, b) => a.pri - b.pri); return { gaps, ahead };
  }
  function chart(sid, st) {
    const pts = [["Baseline", level(sid, st, "b")], ...C.terms.map((t, i) => [t, i <= ui.term ? level(sid, st, String(i)) : null])], n = C.scale.length;
    const b = level(sid, st, "b"), target = b == null ? null : Math.min(n - 1, b + C.steps);
    const X = i => 70 + i * (360 / Math.max(1, pts.length - 1)), Y = v => 180 - v * (150 / Math.max(1, n - 1));
    let g = `<svg viewBox="0 0 460 215" width="100%" style="max-width:620px;display:block" role="img" aria-label="Levels from baseline across the year">`;
    for (let v = 0; v < n; v++) g += `<line x1="56" x2="450" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="48" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="var(--muted)">${esc(C.scale[v]).slice(0, 6)}</text>`;
    if (target != null) g += `<line x1="56" x2="450" y1="${Y(target)}" y2="${Y(target)}" stroke="var(--plum)" stroke-dasharray="5 4"/><text x="450" y="${Y(target) - 6}" font-size="11" text-anchor="end" fill="var(--plum)">Target ${esc(lab(target))}</text>`;
    const kn = pts.map((p, i) => [i, p[1]]).filter(p => p[1] != null);
    g += `<polyline fill="none" stroke="var(--sage)" stroke-width="3" points="${kn.map(([i, v]) => X(i) + "," + Y(v)).join(" ")}"/>`;
    kn.forEach(([i, v]) => g += `<circle cx="${X(i)}" cy="${Y(v)}" r="6" fill="var(--sage)"/>`);
    pts.forEach((p, i) => g += `<text x="${X(i)}" y="205" font-size="12" text-anchor="middle" fill="var(--muted)">${esc(p[0])}</text>`);
    return g + "</svg>";
  }
  function renderOverview(head) {
    const t = ui.term, k = String(t), all = allStrands();
    let h = `<thead><tr><th class="namecol">Student</th>${C.subjects.map(sb => `<th class="colh"><b>${esc(sb.name)}</b>level and position</th>`).join("")}<th class="colh"><b>Overall</b>all subjects</th><th class="colh"><b>Progress</b>since baseline</th><th class="colh"><b>On track</b>for end-of-year target</th><th class="colh"><b>Gaps</b>to fill</th></tr></thead><tbody>`;
    visible().forEach(s => {
      const ov = avgEval(s.id, all, k), pr = avgProgress(s.id, all, t), tr = trackCount(s.id, all, t), gp = plan(s.id, t).gaps.filter(g => g.pri < 2).length;
      h += `<tr><td class="namecol"><button class="name" data-prof="${s.id}">${esc(s.full_name)}</button><div class="tags">${(s.groups || []).map(g => `<span class="tag">${esc(g)}</span>`).join("")}</div></td>`;
      C.subjects.forEach(sb => { const e = avgEval(s.id, sb.strands, k); h += `<td>${e ? `<b>${esc(lab(e.lv))}</b> ${badge(e.band, POS[e.band])}` : badge("none", "–")}</td>`; });
      h += `<td>${ov ? `<b>${esc(lab(ov.lv))}</b> ${badge(ov.band, POS[ov.band])}` : "–"}</td><td>${pr ? badge(pr.band, signed(pr.steps) + " · " + PROG[pr.band]) : "–"}</td>
        <td>${tr.n ? badge(tr.ok === tr.n ? "inline" : tr.ok >= tr.n / 2 ? "none" : "below", `${tr.ok} of ${tr.n}`) : "–"}</td><td>${gp ? badge(gp > 4 ? "below" : "none", gp) : badge("inline", "0")}</td></tr>`;
    });
    ctx.el.innerHTML = head + `<div class="sheetwrap"><table class="sheet">${h}</tbody></table></div><p class="note">Levels are the average of each subject’s strands. Tap a name for the full year, gaps and next steps.</p>`;
  }
  function openProfile(sid) {
    ui.pid = sid; const s = studs.find(x => x.id === sid), t = ui.term, k = String(t), all = allStrands();
    if (!ui.pStrand || !findStrand(ui.pStrand)[1]) ui.pStrand = ui.strand || all[0].id;
    const [psb, pst] = findStrand(ui.pStrand), ov = avgEval(sid, all, k), pr = avgProgress(sid, all, t), tr = trackCount(sid, all, t), pl = plan(sid, t);
    const kpi = (l, v) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`;
    let yr = ""; C.subjects.forEach(sb => sb.strands.forEach(st => { const ot = onTrack(sid, st, t), p = progress(sid, st, t);
      yr += `<tr><td style="text-align:left"><b>${esc(sb.name)}</b>${sb.name !== st.name ? ` <span class="note">${esc(st.name)}</span>` : ""}</td><td>${esc(lab(level(sid, st, "b")))}</td>${C.terms.map((x, i) => `<td>${i <= t ? esc(lab(level(sid, st, String(i)))) : "<span class='note'>–</span>"}</td>`).join("")}
        <td>${ot ? esc(lab(ot.target)) : "–"}</td><td>${p ? badge(p.band, signed(p.steps)) : "–"}</td><td>${ot ? badge(ot.ok ? "inline" : "below", ot.ok ? "On track" : `Heading for ${esc(lab(ot.proj))}`) : "–"}</td></tr>`; }));
    let data = ""; pst.cols.forEach(c => {
      if (c.type === "objectives") C.terms.forEach((tn, ti) => objs(c, ti).forEach(o => { if (!TAUGHT.has(o.id)) return; const v = stat(sid, o.id); data += `<li><i class="dot ${v}" style="width:22px;height:22px;font-size:11px;flex:none">${DOT[v]}</i><span>${esc(tn)}: ${esc(o.text)}</span></li>`; }));
      else { const keys = c.baseline ? [["b", "Baseline"]] : C.terms.map((x, i) => [String(i), x]); const vals = keys.map(([kk, l]) => { const v = val(sid, c.id, kk); return v == null ? "" : `${esc(l)}: <b>${esc(v)}</b>`; }).filter(Boolean);
        if (vals.length) data = `<li><span><b>${esc(c.name)}</b> ${vals.join(", ")}</span></li>` + data; } });
    const gapsH = pl.gaps.length ? `<ul class="plan">${pl.gaps.map(g => `<li>${g.pri === 0 ? badge("below", "Priority") : g.pri === 2 ? badge("none", "Check") : ""} <b>${esc(g.nm)}.</b> ${esc(g.gap)}<div class="fix">${esc(g.fix)}</div></li>`).join("")}</ul>` : `<p class="ok">No gaps recorded.</p>`;
    const aheadH = pl.ahead.length ? `<ul class="plan">${pl.ahead.map(a => `<li><b>${esc(a.nm)}.</b> ${esc(a.text)}</li>`).join("")}</ul>` : `<p class="note">Next steps appear here once a strand has no gaps.</p>`;
    let d = document.getElementById("tnProfile"); if (!d) { d = document.createElement("dialog"); d.id = "tnProfile"; document.body.appendChild(d); }
    d.innerHTML = `<div class="dlg"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0;color:var(--plum);font-family:Poppins,sans-serif">${esc(s.full_name)}</h2><div class="tags">${(s.groups || []).map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div></div><button class="btn ghost small" data-pclose="1">Close</button></div>
      <div class="card"><h2>Overall, ${esc(C.terms[t])}</h2><div class="kpis">${kpi("Overall level", ov ? esc(lab(ov.lv)) : "–")}${kpi("Against grade level", ov ? badge(ov.band, POS[ov.band]) : "–")}${kpi("Progress since baseline", pr ? badge(pr.band, signed(pr.steps) + " · " + PROG[pr.band]) : "–")}${kpi("On track for targets", tr.n ? `${tr.ok} of ${tr.n} strands` : "–")}</div></div>
      <div class="card"><h2>The year at a glance</h2><div class="tablewrap"><table class="sheet"><tr><th style="text-align:left">Subject</th><th>Baseline</th>${C.terms.map(x => `<th>${esc(x)}</th>`).join("")}<th>Target</th><th>Progress</th><th>End of year</th></tr>${yr}</table></div>
        <p class="note">“End of year” projects the student’s current rate of progress to the final term.</p></div>
      <div class="card"><h2>Progress from baseline</h2><div class="row">${strands().map(([a, b]) => `<button class="chip" data-pstrand="${b.id}" aria-pressed="${b.id === ui.pStrand}">${esc(sname(a, b))}</button>`).join("")}</div>${chart(sid, pst)}</div>
      <div class="grid2"><div class="card"><h2>Gaps to fill</h2>${gapsH}</div><div class="card"><h2>Next steps to move forward</h2>${aheadH}</div></div>
      <div class="card"><h2>${esc(sname(psb, pst))}: all recorded data</h2><ul class="plan objl">${data || `<li class="note">Nothing recorded yet.</li>`}</ul></div></div>`;
    if (!d.open) d.showModal();
  }

  const BANDS = ["Low", "Middle", "High"];
  const STATUS = { none: ["none", "Not started"], draft: ["none", "Draft"], ready: ["above", "Ready to check"], changes: ["below", "Changes needed"], approved: ["inline", "Approved"] };
  const cmt = (t, sid, stid) => ((CM[t] || {})[sid] || {})[stid] || null;
  const role = () => ctx.role || "teacher";
  function autoBand(sid, st, k) {
    const lv = level(sid, st, k), e = strandEval(sid, st, k); if (lv == null || !e) return 1;
    const m = C.gradeMin, lo = m[lv], hi = m[lv + 1] ?? 100.0001; if (e.pct < lo) return 0; if (e.pct >= hi) return 2;
    const f = (e.pct - lo) / Math.max(.0001, hi - lo); return f < 1 / 3 ? 0 : f >= 2 / 3 ? 2 : 1;
  }
  function draft(sid, st, t, lvO, bandO) {
    const k = String(t), s = studs.find(x => x.id === sid), si = studs.indexOf(s), ti = strands().findIndex(p => p[1].id === st.id);
    const lv = lvO ?? level(sid, st, k); if (lv == null) return { text: "", lv: null, band: 1 };
    const band = bandO ?? autoBand(sid, st, k), bank = (C.reports || {}).bank || [], row = bank[lv] || [], nm = s.full_name.split(" ")[0];
    const fill = x => (x || "").replace(/\{name\}/g, nm).replace(/\{strand\}/g, st.name.toLowerCase());
    let base = fill(row[band] || row[1] || ""); const pre = ["", "This term, ", "Throughout the term, ", "Over recent weeks, "][(si + ti) % 4];
    if (pre && base.startsWith(nm)) base = pre + base;
    const sec = [], gaps = [];
    st.cols.filter(c => c.type === "objectives").forEach(c => { for (let i = 0; i <= t; i++) objs(c, i).forEach(o => { const v = stat(sid, o.id); if (v === "e") sec.unshift(o); else if (v === "s") sec.push(o); else if (v === "n") gaps.push(o); }); });
    const lc = x => x.charAt(0).toLowerCase() + x.slice(1).replace(/^know /i, "understand ");
    let str = ""; if (sec.length) { const o = sec[si % Math.min(2, sec.length)];
      str = [` A particular strength is that ${nm} can ${lc(o.text)}.`, ` ${nm} can now ${lc(o.text)} with confidence.`, ` ${nm} has shown that they can ${lc(o.text)}.`][(si + ti) % 3]; }
    const e = strandEval(sid, st, k); let nx;
    if (gaps.length) nx = ` Next step: ${gaps[0].step || "further practice to " + lc(gaps[0].text) + "."}`;
    else { const low = st.cols.filter(c => !c.baseline && c.type !== "objectives").map(c => [c, colEval(sid, c, k)]).find(([, x]) => x && x.band < 0);
      nx = low ? ` Next step: ${fixFor(low[0], sid, k)}` : e && e.band === "above" ? " Next step: take on greater-depth challenges that stretch thinking further." : " Next step: continue to apply and consolidate this learning in new contexts."; }
    let text = base + str + nx; const lim = (C.reports || {}).limit || 600; if (text.length > lim) text = base + nx;
    return { text: text.trim(), lv, band };
  }
  function renderReports(head) {
    const t = String(ui.term), list = strands(), vs = visible(); let tot = 0; const cnt = { none: 0, draft: 0, ready: 0, changes: 0, approved: 0 };
    vs.forEach(s => list.forEach(([, st]) => { tot++; const c = cmt(t, s.id, st.id); cnt[c ? c.status : "none"]++; }));
    const pct = tot ? Math.round(cnt.approved / tot * 100) : 0, chk = role() === "checker";
    let h = head + `<div class="card"><h2>Report comments, ${esc(C.terms[ui.term])}</h2><div class="meter"><i style="width:${pct}%"></i></div>
      <p class="note">${cnt.approved} of ${tot} approved. ${cnt.ready} ready to check, ${cnt.changes} need changes, ${cnt.draft} drafts, ${cnt.none} not started.</p>
      <div class="row">${chk ? `<button class="btn" data-rp="next">Check the next comment</button>` : `<button class="btn" data-rp="draftall">Draft all empty comments from the data</button>`}<button class="btn ghost" data-rp="export">Export approved comments (Excel)</button></div>
      <p class="note">Drafts use each student’s level, a Low, Middle or High comment from the school’s bank, a strength and a next step from their data. Always read and edit before sending for checking.</p></div>`;
    let tb = `<thead><tr><th class="namecol">Student</th>${list.map(([a, b]) => `<th class="colh"><b>${esc(sname(a, b))}</b></th>`).join("")}</tr></thead><tbody>`;
    vs.forEach(s => { tb += `<tr><td class="namecol"><b style="color:var(--plum)">${esc(s.full_name)}</b></td>`;
      list.forEach(([a, b]) => { const c = cmt(t, s.id, b.id), [cl, l] = STATUS[c ? c.status : "none"];
        tb += `<td><button class="statusbtn b-${cl}" data-edit="${s.id}|${b.id}">${l}${c && c.text ? `<span>${c.text.length}</span>` : ""}</button></td>`; }); tb += `</tr>`; });
    ctx.el.innerHTML = h + `<div class="sheetwrap"><table class="sheet">${tb}</tbody></table></div><div id="rpMsg"></div>`;
  }
  function openEditor(sid, stid) {
    const t = String(ui.term), s = studs.find(x => x.id === sid), [sb, st] = findStrand(stid), chk = role() === "checker";
    let c = cmt(t, sid, stid); c = c ? { ...c } : { status: "none", note: "" };
    if (!c.text) { const d = draft(sid, st, ui.term); Object.assign(c, { text: d.text, level: d.lv, band: d.band, auto: true }); }
    const order = []; visible().forEach(x => strands().forEach(([, b]) => order.push(x.id + "|" + b.id))); const pos = order.indexOf(sid + "|" + stid);
    ED = { sid, stid, c, order, pos }; const lim = (C.reports || {}).limit || 600, locked = !chk && (c.status === "ready" || c.status === "approved"), lab2 = STATUS[c.status || "none"];
    let d = document.getElementById("tnEditor"); if (!d) { d = document.createElement("dialog"); d.id = "tnEditor"; document.body.appendChild(d); }
    d.innerHTML = `<div class="dlg"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0;color:var(--plum);font-family:Poppins,sans-serif">${esc(s.full_name)}</h2><p class="note" style="margin:2px 0 0">${esc(sname(sb, st))}, ${esc(C.terms[ui.term])} ${badge(lab2[0], lab2[1])}</p></div><button class="btn ghost small" data-pclose="1">Close</button></div>
      ${c.note ? `<div class="msg info">Checker’s note: ${esc(c.note)}</div>` : ""}
      <div class="row" style="margin:12px 0"><label class="note" for="edLv"><b>Level</b></label><select id="edLv" style="width:auto" ${locked || chk ? "disabled" : ""}>${C.scale.map((x, i) => `<option value="${i}" ${i === c.level ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
        <label class="note" for="edBand"><b>Comment</b></label><select id="edBand" style="width:auto" ${locked || chk ? "disabled" : ""}>${BANDS.map((x, i) => `<option value="${i}" ${i === c.band ? "selected" : ""}>${x}</option>`).join("")}</select>
        ${!chk && !locked ? `<button class="btn ghost small" data-rp="redraft">Redraft from data</button><button class="btn ghost small" data-rp="own">Write my own</button>` : ""}</div>
      <textarea id="edText" style="min-height:150px;font-size:15px;line-height:1.6" ${locked ? "readonly" : ""}>${esc(c.text || "")}</textarea>
      <div class="row" style="justify-content:space-between"><span class="note">${c.auto ? "Drafted from the data. Read and edit before sending." : ""}</span><span id="edCount" class="note"></span></div>
      ${chk ? `<label for="edNote" class="note" style="display:block;margin-top:10px"><b>Note for the teacher</b></label><textarea id="edNote" style="min-height:60px">${esc(c.note || "")}</textarea>` : ""}
      <div class="row" style="margin-top:14px">${chk ? `<button class="btn ghost" data-rp="return" ${c.status === "ready" ? "" : "disabled"}>Return with note</button><button class="btn" data-rp="approve" ${["ready", "changes"].includes(c.status) ? "" : "disabled"}>Approve</button>`
        : locked ? `<span class="note">${c.status === "approved" ? "Approved by the buddy checker." : "Waiting for the buddy checker."}</span><button class="btn ghost small" data-rp="recall">${c.status === "approved" ? "Reopen" : "Take back to edit"}</button>`
        : `<button class="btn ghost" data-rp="save">Save draft</button><button class="btn" id="edReady" data-rp="send">Send for checking</button>`}
        <span style="margin-left:auto" class="row"><button class="btn ghost small" data-rp="prev" ${pos <= 0 ? "disabled" : ""}>Previous</button><button class="btn ghost small" data-rp="next1" ${pos >= order.length - 1 ? "disabled" : ""}>Next</button></span></div></div>`;
    if (!d.open) d.showModal(); count();
  }
  function count() { const ta = document.getElementById("edText"), el = document.getElementById("edCount"); if (!ta || !el) return; const n = ta.value.trim().length, lim = (C.reports || {}).limit || 600;
    el.textContent = `${n} / ${lim}`; el.style.color = n > lim ? "var(--red)" : "var(--muted)"; el.style.fontWeight = n > lim ? "800" : "400"; const b = document.getElementById("edReady"); if (b) b.disabled = !n || n > lim; }
  async function saveEd(status) {
    const c = ED.c, ta = document.getElementById("edText"), nt = document.getElementById("edNote"), lv = document.getElementById("edLv"), bd = document.getElementById("edBand");
    if (ta) c.text = ta.value.trim(); if (nt) c.note = nt.value.trim(); if (lv) c.level = +lv.value; if (bd) c.band = +bd.value;
    c.status = status || (c.status && c.status !== "none" ? c.status : "draft"); if (status === "approved") c.note = "";
    const row = { student_id: ED.sid, strand_id: ED.stid, term: String(ui.term), text: c.text || "", level: c.level ?? null, band: c.band ?? 1, status: c.status, note: c.note || "" };
    const t = String(ui.term); (((CM[t] = CM[t] || {})[ED.sid] = (CM[t] || {})[ED.sid] || {}))[ED.stid] = row;
    return run(ctx.sb.from("report_comments").upsert(row));
  }
  function exportCSV() {
    const t = String(ui.term), list = strands(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    let csv = "\ufeff" + [q("Student"), ...list.map(([a, b]) => q(sname(a, b) + " level") + "," + q(sname(a, b) + " comment"))].join(",") + "\n";
    studs.forEach(s => { csv += [q(s.full_name), ...list.map(([, b]) => { const c = cmt(t, s.id, b.id); return c && c.status === "approved" ? q(lab(c.level)) + "," + q(c.text) : q("") + "," + q(""); })].join(",") + "\n"; });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${cls.name} report comments ${C.terms[ui.term]}.csv`; a.click();
  }
  async function reportAction(a, t) {
    if (a === "export") return exportCSV();
    if (a === "draftall") { const rows = []; visible().forEach(s => strands().forEach(([, st]) => { const c = cmt(String(ui.term), s.id, st.id); if (!c || !c.text) { const d = draft(s.id, st, ui.term); if (d.text) rows.push({ student_id: s.id, strand_id: st.id, term: String(ui.term), text: d.text, level: d.lv, band: d.band, status: "draft", note: "" }); } }));
      rows.forEach(r => (((CM[r.term] = CM[r.term] || {})[r.student_id] = (CM[r.term] || {})[r.student_id] || {}))[r.strand_id] = r); render(); if (rows.length) run(ctx.sb.from("report_comments").upsert(rows)); return; }
    if (a === "next") { for (const s of visible()) for (const [, st] of strands()) { const c = cmt(String(ui.term), s.id, st.id); if (c && c.status === "ready") return openEditor(s.id, st.id); } return alert("There are no comments waiting to be checked."); }
    if (!ED) return; const dlg = document.getElementById("tnEditor");
    if (a === "redraft") { const d = draft(ED.sid, findStrand(ED.stid)[1], ui.term, +document.getElementById("edLv").value, +document.getElementById("edBand").value); document.getElementById("edText").value = d.text; return count(); }
    if (a === "own") { const ta = document.getElementById("edText"); ta.value = ""; ta.focus(); return count(); }
    if (a === "save") { await saveEd(); dlg.close(); return render(); }
    if (a === "send") { await saveEd("ready"); dlg.close(); return render(); }
    if (a === "recall") { await saveEd("draft"); return openEditor(ED.sid, ED.stid); }
    if (a === "return") { if (!document.getElementById("edNote").value.trim()) return alert("Add a note so the teacher knows what to change."); await saveEd("changes"); dlg.close(); return render(); }
    if (a === "approve") { await saveEd("approved"); dlg.close(); return render(); }
    if (a === "prev" || a === "next1") { if (role() !== "checker" && !["ready", "approved"].includes(ED.c.status)) await saveEd(); const p = ED.pos + (a === "next1" ? 1 : -1), [sid, stid] = ED.order[p].split("|"); render(); return openEditor(sid, stid); }
  }

  async function load() {
    const sb = ctx.sb;
    const [s, st] = await Promise.all([
      sb.from("school_setups").select("*").eq("school_id", cls.school_id).eq("year", cls.year).limit(1),
      sb.from("students").select("*").eq("class_id", cls.id).eq("archived", false).order("full_name")]);
    if (s.error || st.error) throw (s.error || st.error);
    if (!s.data.length) throw new Error("This school’s setup for " + cls.year + " couldn’t be found.");
    C = s.data[0].config; if (ctx.subjects) C = Object.assign({}, C, { subjects: C.subjects.filter(x => ctx.subjects.includes(x.id)) }); studs = st.data;
    const ids = studs.map(x => x.id);
    R = {}; ST = {}; LV = {}; TAUGHT = new Set();
    const tg = await sb.from("taught").select("obj_id").eq("class_id", cls.id);
    if (tg.error) throw tg.error; tg.data.forEach(r => TAUGHT.add(r.obj_id));
    if (ids.length) {
      const [r, o, l] = await Promise.all([sb.from("results").select("*").in("student_id", ids), sb.from("objective_status").select("*").in("student_id", ids), sb.from("levels").select("*").in("student_id", ids)]);
      const err = r.error || o.error || l.error; if (err) throw err;
      r.data.forEach(x => { ((R[x.student_id] = R[x.student_id] || {})[x.col_id] = (R[x.student_id] || {})[x.col_id] || {})[x.term] = x.value; });
      o.data.forEach(x => (ST[x.student_id] = ST[x.student_id] || {})[x.obj_id] = x.status);
      l.data.forEach(x => { ((LV[x.student_id] = LV[x.student_id] || {})[x.strand_id] = (LV[x.student_id] || {})[x.strand_id] || {})[x.term] = x.level; });
      const cm = await sb.from("report_comments").select("*").in("student_id", ids); if (cm.error) throw cm.error;
      CM = {}; cm.data.forEach(x => { ((CM[x.term] = CM[x.term] || {})[x.student_id] = (CM[x.term] || {})[x.student_id] || {})[x.strand_id] = x; });
    }
  }

  function saving(delta, err) {
    pending += delta; const el = document.getElementById("shSave"); if (!el) return;
    if (err) { el.textContent = "Not saved: " + err; el.style.color = "var(--red)"; return; }
    el.style.color = "var(--muted)"; el.textContent = pending > 0 ? "Saving…" : "All changes saved";
  }
  async function run(q) { saving(1); const { error } = await q; saving(-1, error && error.message); return !error; }

  const visible = () => studs.filter(s => ui.group === "All" || (s.groups || []).includes(ui.group));
  function hint(c) { return { score: `out of ${c.max}`, rubric: `out of ${c.max}`, standardised: "standardised", readingAge: "years", list: "choose", comment: "notes" }[c.type] || ""; }
  function cell(s, c, k) {
    const v = val(s.id, c.id, k) ?? "", ev = colEval(s.id, c, k), cl = ev ? ["tb", "ti", "ta"][ev.band + 1] : "";
    const a = `data-v="${s.id}|${c.id}|${k}" aria-label="${esc(s.full_name)}, ${esc(c.name)}" class="in ${cl}"`;
    if (c.type === "list") return `<select ${a}><option value=""></option>${c.options.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    if (c.type === "comment") return `<input type="text" ${a} value="${esc(v)}" style="width:170px;text-align:left">`;
    return `<input type="number" step="any" ${a} value="${esc(v)}">`;
  }
  function lvOpts(s, st, k) { const t = tLv(s.id, st.id, k), e = strandEval(s.id, st, k);
    return `<option value="">Auto (${e ? esc(lab(e.sug)) + " · " + e.pct + "%" : "–"})</option>` + C.scale.map((x, i) => `<option value="${i}" ${t === i ? "selected" : ""}>${esc(x)}</option>`).join(""); }
  function summary(s, st) { const k = String(ui.term), e = strandEval(s.id, st, k), p = progress(s.id, st, ui.term);
    return { pos: badge(e ? e.band : "none", POS[e ? e.band : "none"]), prog: p ? badge(p.band, (p.steps > 0 ? "+" : "") + p.steps + " · " + PROG[p.band]) : badge("none", "–") }; }

  function render() {
    const subs = C.subjects; if (!subs.find(s => s.id === ui.sub)) ui.sub = subs[0]?.id;
    const sb = subs.find(s => s.id === ui.sub); if (!sb) { ctx.el.innerHTML = `<div class="card"><p>No subjects are set up yet.</p></div>`; return; }
    if (!sb.strands.find(s => s.id === ui.strand)) ui.strand = sb.strands[0]?.id;
    const [, st] = findStrand(ui.strand), t = ui.term, k = String(t);
    const bc = st.cols.filter(c => c.baseline), tc = st.cols.filter(c => !c.baseline);
    let n = 0; tc.forEach(c => { n += c.type === "objectives" ? objs(c, t).length : 1; });
    let h = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="row"><button class="btn ghost small" data-sh="back">← Back</button>${ctx.siblings && ctx.siblings.length > 1 ? `<select id="shCls" aria-label="Switch class" style="width:auto;font-family:Poppins,sans-serif;font-weight:600;font-size:18px;color:var(--plum);padding:4px 10px">${ctx.siblings.map(x => `<option value="${x.id}" ${x.id === cls.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : `<h2 style="margin:0;font-family:Poppins,sans-serif;color:var(--plum)">${esc(cls.name)}</h2>`}${ctx.subjects ? `<span class="tag">${esc(C.subjects.map(x => x.name).join(", "))}</span>` : ""}<span class="note">${studs.length} students</span></div><div class="row">${role() === "checker" ? "" : `<button class="btn ghost small" data-sh="upload">Upload results from Excel</button>`}<span class="note" id="shSave">All changes saved</span></div></div>
      <div class="row" style="margin-bottom:10px">${role() === "checker" ? "" : `<button class="pill2" data-mode="overview" aria-pressed="${ui.mode === "overview"}">Class overview</button><button class="pill2" data-mode="strand" aria-pressed="${ui.mode === "strand"}">Record data by strand</button>`}<button class="pill2" data-mode="reports" aria-pressed="${ui.mode === "reports"}">Report comments</button></div>
      <div class="row" style="margin-bottom:10px">${ui.mode === "strand" ? `<label class="note" for="shSub"><b>Subject</b></label><select id="shSub" style="width:auto">${subs.map(s => `<option value="${s.id}" ${s.id === ui.sub ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <label class="note" for="shStr"><b>Strand</b></label><select id="shStr" style="width:auto">${sb.strands.map(s => `<option value="${s.id}" ${s.id === ui.strand ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>` : ""}
      ${C.terms.map((x, i) => `<button class="chip" data-term="${i}" aria-pressed="${i === t}">${esc(x)}</button>`).join("")}</div>
      <div class="row" style="margin-bottom:10px">${["All", ...(C.groups || [])].map(g => `<button class="chip" data-grp="${esc(g)}" aria-pressed="${g === ui.group}">${g === "All" ? "All students" : esc(g)}</button>`).join("")}</div>
      <div class="legend"><span><i class="dot" style="width:18px;height:18px"></i>Not assessed</span><span><i class="dot s" style="width:18px;height:18px"></i>Secure</span><span><i class="dot n" style="width:18px;height:18px"></i>Not yet secure</span><span><i class="dot e" style="width:18px;height:18px"></i>Exceeding</span><span>Scores are shaded ${badge("below", "below")} ${badge("inline", "in line")} ${badge("above", "above")}</span></div>`;
    if (!studs.length) { ctx.el.innerHTML = h + `<div class="card"><p class="note">This class has no students yet. The school lead adds them in Classes and students.</p></div>`; return; }
    if (role() === "checker") ui.mode = "reports";
    if (ui.mode === "overview") return renderOverview(h.replace(/<div class="legend">[\s\S]*$/, ""));
    if (ui.mode === "reports") return renderReports(h.replace(/<div class="legend">[\s\S]*$/, ""));
    let th = `<thead><tr><th class="namecol"></th><th class="grp" colspan="${bc.length + 1}">Baseline</th><th class="grp" colspan="${n || 1}">${esc(C.terms[t])}</th><th class="grp" colspan="3">Summary</th></tr><tr><th class="namecol">Student</th>`;
    bc.forEach(c => th += `<th class="colh"><b>${esc(c.name)}</b>${hint(c)}</th>`);
    th += `<th class="colh"><b>Baseline level</b>scale</th>`;
    tc.forEach(c => { if (c.type === "objectives") objs(c, t).forEach(o => { const tg = TAUGHT.has(o.id);
      th += `<th class="obj"><span class="t">${esc(o.text)}</span><label><input type="checkbox" data-taught="${o.id}" ${tg ? "checked" : ""}> Taught</label><button class="mini" data-all="${o.id}" ${tg ? "" : "disabled"}>Mark all secure</button></th>`; });
      else th += `<th class="colh"><b>${esc(c.name)}</b>${hint(c)}</th>`; });
    if (!n) th += `<th class="note">No columns for this term</th>`;
    th += `<th>Position</th><th class="colh"><b>Teacher level</b>Auto shows the suggestion</th><th>Progress from baseline</th></tr></thead><tbody>`;
    visible().forEach(s => { const sm = summary(s, st);
      th += `<tr><td class="namecol"><button class="name" data-prof="${s.id}">${esc(s.full_name)}</button><div class="tags">${(s.groups || []).map(g => `<span class="tag">${esc(g)}</span>`).join("")}</div></td>`;
      bc.forEach(c => th += `<td>${cell(s, c, "b")}</td>`);
      th += `<td><select class="lv" data-lv="${s.id}|${st.id}|b" aria-label="Baseline level for ${esc(s.full_name)}">${lvOpts(s, st, "b")}</select></td>`;
      tc.forEach(c => { if (c.type === "objectives") objs(c, t).forEach(o => { const tg = TAUGHT.has(o.id), v = stat(s.id, o.id);
        th += `<td><button class="dot ${v}" data-cell="${s.id}|${o.id}" ${tg ? "" : "disabled"} aria-label="${esc(s.full_name)}, ${esc(o.text)}: ${tg ? DOTL[v] : "not taught yet"}">${DOT[v]}</button></td>`; });
        else th += `<td>${cell(s, c, k)}</td>`; });
      if (!n) th += `<td></td>`;
      th += `<td id="pos-${s.id}">${sm.pos}</td><td><select class="lv" data-lv="${s.id}|${st.id}|${k}" aria-label="Teacher level for ${esc(s.full_name)}">${lvOpts(s, st, k)}</select></td><td id="prog-${s.id}">${sm.prog}</td></tr>`; });
    const noObj = tc.some(c => c.type === "objectives" && !objs(c, t).length);
    ctx.el.innerHTML = h + `<div class="sheetwrap"><table class="sheet">${th}</tbody></table></div>
      <p class="note">Type scores straight into the sheet. Everything saves as you go.${noObj ? " Some objective columns have no objectives for this grade and term yet. The school lead adds them in School setup, step 5." : ""}</p>`;
  }
  function refreshRow(sid) {
    const [, st] = findStrand(ui.strand), s = studs.find(x => x.id === sid), sm = summary(s, st);
    const p = document.getElementById("pos-" + sid), g = document.getElementById("prog-" + sid); if (p) p.innerHTML = sm.pos; if (g) g.innerHTML = sm.prog;
    document.querySelectorAll(`[data-lv^="${sid}|"]`).forEach(el => { if (document.activeElement !== el) el.innerHTML = lvOpts(s, st, el.dataset.lv.split("|")[2]); });
  }

  async function onClick(e) {
    const t = e.target.closest("button"); if (!t || !ctx || !(ctx.el.contains(t) || t.closest("#tnProfile") || t.closest("#tnEditor"))) return;
    if (t.dataset.pclose) return t.closest("dialog").close();
    if (t.dataset.rp) { t.disabled = true; try { await reportAction(t.dataset.rp, t); } finally { t.disabled = false; } return; }
    if (t.dataset.edit) { const [a, b] = t.dataset.edit.split("|"); return openEditor(a, b); }
    if (t.dataset.pstrand) { ui.pStrand = t.dataset.pstrand; return openProfile(ui.pid); }
    if (t.dataset.sh === "back") return ctx.back();
    if (t.dataset.sh === "upload") {
      const st = findStrand(ui.strand)[1], first = st && st.cols.find(c => !["objectives", "comment"].includes(c.type));
      return TNResults.open({ sb: ctx.sb, C, scopeText: `For ${cls.name}. Rows for students in other classes are ignored.`, limitClass: cls.name,
        students: studs.map(x => ({ ...x, class_name: cls.name })), colId: first ? first.id : null, term: first && first.baseline ? "b" : String(ui.term),
        existing: (sid, cid, k) => val(sid, cid, k),
        onDone: async n => { await load(); render(); ctx.el.insertAdjacentHTML("afterbegin", `<div class="msg ok" style="margin-bottom:10px">Saved ${n} result${n === 1 ? "" : "s"}.</div>`); } });
    }
    if (t.dataset.mode) { ui.mode = t.dataset.mode; return render(); }
    if (t.dataset.prof) { ui.pStrand = null; return openProfile(t.dataset.prof); }
    if (t.dataset.term) { ui.term = +t.dataset.term; return render(); }
    if (t.dataset.grp) { ui.group = t.dataset.grp; return render(); }
    if (t.dataset.cell) {
      const [sid, oid] = t.dataset.cell.split("|"), nx = { "": "s", s: "n", n: "e", e: "" }[stat(sid, oid)];
      (ST[sid] = ST[sid] || {}); if (nx) ST[sid][oid] = nx; else delete ST[sid][oid];
      t.className = "dot " + nx; t.textContent = DOT[nx]; t.setAttribute("aria-label", t.getAttribute("aria-label").replace(/: [^:]*$/, ": " + DOTL[nx]));
      refreshRow(sid);
      run(nx ? ctx.sb.from("objective_status").upsert({ student_id: sid, obj_id: oid, status: nx }) : ctx.sb.from("objective_status").delete().eq("student_id", sid).eq("obj_id", oid));
      return;
    }
    if (t.dataset.all) {
      const oid = t.dataset.all, rows = visible().filter(s => !stat(s.id, oid)).map(s => ({ student_id: s.id, obj_id: oid, status: "s" }));
      rows.forEach(r => (ST[r.student_id] = ST[r.student_id] || {})[oid] = "s"); render();
      if (rows.length) run(ctx.sb.from("objective_status").upsert(rows));
    }
  }
  async function onChange(e) {
    const t = e.target; if (!ctx || !ctx.el.contains(t)) return;
    if (t.id === "shCls") { const nc = ctx.siblings.find(x => x.id === t.value); return TNSheet.open(Object.assign({}, ctx, { cls: nc })); }
    if (t.id === "shSub") { ui.sub = t.value; ui.strand = null; return render(); }
    if (t.id === "shStr") { ui.strand = t.value; return render(); }
    if (t.dataset.taught) {
      const oid = t.dataset.taught; if (t.checked) TAUGHT.add(oid); else TAUGHT.delete(oid); render();
      run(t.checked ? ctx.sb.from("taught").upsert({ class_id: cls.id, obj_id: oid }) : ctx.sb.from("taught").delete().eq("class_id", cls.id).eq("obj_id", oid)); return;
    }
    if (t.dataset.v) {
      const [sid, cid, k] = t.dataset.v.split("|"), c = findCol(cid); let v = t.value.trim();
      const m = ((R[sid] = R[sid] || {})[cid] = (R[sid] || {})[cid] || {}); if (v === "") delete m[k]; else m[k] = v;
      const ev = colEval(sid, c, k); t.classList.remove("tb", "ti", "ta"); if (ev) t.classList.add(["tb", "ti", "ta"][ev.band + 1]);
      refreshRow(sid);
      run(v === "" ? ctx.sb.from("results").delete().eq("student_id", sid).eq("col_id", cid).eq("term", k) : ctx.sb.from("results").upsert({ student_id: sid, col_id: cid, term: k, value: v })); return;
    }
    if (t.dataset.lv) {
      const [sid, stid, k] = t.dataset.lv.split("|"), m = ((LV[sid] = LV[sid] || {})[stid] = (LV[sid] || {})[stid] || {});
      if (t.value === "") delete m[k]; else m[k] = +t.value; refreshRow(sid);
      run(t.value === "" ? ctx.sb.from("levels").delete().eq("student_id", sid).eq("strand_id", stid).eq("term", k) : ctx.sb.from("levels").upsert({ student_id: sid, strand_id: stid, term: k, level: +t.value }));
    }
  }

  document.addEventListener("input", e => { if (e.target.id === "edText") count(); });
  window.TNSheet = {
    async open(context) {
      ctx = context; cls = ctx.cls; pending = 0; if (ctx.role === "checker") ui.mode = "reports";
      if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      ctx.el.innerHTML = `<div class="card"><p class="note">Loading ${esc(cls.name)}…</p></div>`;
      try { await load(); render(); } catch (err) { ctx.el.innerHTML = `<div class="card"><div class="msg err">${esc(err.message || err)}</div><p><button class="btn ghost" data-sh="back">← Back</button></p></div>`; }
    },
    close() { ctx = null; }
  };
})();
