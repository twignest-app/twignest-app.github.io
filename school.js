/* TwigNest school view */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = n => Math.max(0, Math.min(1, n));
  const POS = { below: "Below curriculum standards", inline: "In line with curriculum standards", above: "Above curriculum standards", none: "Not yet assessed" };
  const PROG = { below: "Below expected progress", inline: "Expected progress", above: "Better than expected progress" };
  const POSS = { below: "Below", inline: "In line", above: "Above", none: "Not yet assessed" }, PROGS = { below: "Below expected", inline: "Expected", above: "Better than expected" };
  function applyLabels(cfg) { const L = (cfg && cfg.labels) || {}; ["below", "inline", "above"].forEach(k => { if (L.att && L.att[k]) POS[k] = L.att[k]; if (L.prog && L.prog[k]) PROG[k] = L.prog[k]; }); }
  const badge = (c, t) => `<span class="badge b-${c}">${t}</span>`;
  let ctx, C, year, classes = [], studs = [], R = {}, ST = {}, LV = {}, TG = {}, CMS = [], LINKS = [], STAFF = [], bound = false;
  let ui = { mode: "subject", term: 0, group: "All", grade: "All" };

  async function fetchAll(table, cols) {
    const out = []; for (let from = 0; ; from += 1000) {
      const { data, error } = await ctx.sb.from(table).select(cols).range(from, from + 999);
      if (error) throw error; out.push(...data); if (data.length < 1000) break;
    } return out;
  }
  async function load() {
    const sb = ctx.sb, sid = ctx.school.id;
    const s = await sb.from("school_setups").select("*").eq("school_id", sid).order("updated_at", { ascending: false }).limit(1);
    if (s.error) throw s.error; if (!s.data.length) throw new Error("Finish the school setup first.");
    C = s.data[0].config; applyLabels(C); year = s.data[0].year;
    const c = await sb.from("classes").select("*").eq("school_id", sid).eq("year", year); if (c.error) throw c.error; classes = c.data;
    const ids = new Set(classes.map(x => x.id));
    studs = (await fetchAll("students", "*")).filter(x => !x.archived && ids.has(x.class_id));
    const sIds = new Set(studs.map(x => x.id));
    R = {}; ST = {}; LV = {}; TG = {};
    (await fetchAll("results", "student_id,col_id,term,value")).forEach(x => { if (!sIds.has(x.student_id)) return; const a = R[x.student_id] = R[x.student_id] || {}; (a[x.col_id] = a[x.col_id] || {})[x.term] = x.value; });
    (await fetchAll("objective_status", "student_id,obj_id,status")).forEach(x => { if (sIds.has(x.student_id)) (ST[x.student_id] = ST[x.student_id] || {})[x.obj_id] = x.status; });
    (await fetchAll("student_levels", "student_id,strand_id,term,level")).forEach(x => { if (!sIds.has(x.student_id)) return; const a = LV[x.student_id] = LV[x.student_id] || {}; (a[x.strand_id] = a[x.strand_id] || {})[x.term] = x.level; });
    (await fetchAll("taught", "class_id,obj_id")).forEach(x => (TG[x.class_id] = TG[x.class_id] || new Set()).add(x.obj_id));
    CMS = (await fetchAll("report_comments", "student_id,strand_id,term,status")).filter(x => sIds.has(x.student_id));
    LINKS = await fetchAll("class_teachers", "class_id,teacher_id,subject_id");
    STAFF = (await sb.from("profiles").select("id,full_name,email").eq("school_id", sid)).data || [];
  }

  const DEF_OS = [{ code: "s", label: "Secure", short: "✓", kind: "secure" }, { code: "n", label: "Not yet secure", short: "!", kind: "notyet" }, { code: "e", label: "Exceeding", short: "+", kind: "exceed" }];
  const OS = () => (C && C.objScale && C.objScale.length ? C.objScale : DEF_OS);
  const osOf = v => OS().find(x => x.code === v) || DEF_OS.find(x => x.code === v) || { code: v, label: v, short: "?", kind: "secure" };
  const credit = v => ({ notyet: 0, partial: .5, secure: 1, exceed: 1 })[osOf(v).kind] ?? 1;
  const isEx = v => osOf(v).kind === "exceed", isGap = v => !!v && credit(v) < 1;
  const _dc = v => v ? ({ notyet: "n", partial: "p", secure: "s", exceed: "e" })[osOf(v).kind] : "";
  const _dt = v => v ? esc(osOf(v).short) : "";
  const defCode = () => (OS().find(x => x.kind === "secure") || OS()[0]).code;
  const cycle = v => { const order = [defCode(), ...OS().map(x => x.code).filter(c => c !== defCode())], i = order.indexOf(v); return v === "" || i < 0 ? order[0] : (order[i + 1] ?? ""); };
  const strands = () => { const o = []; C.subjects.forEach(sb => sb.strands.forEach(st => o.push([sb, st]))); return o; };
  const clsOf = s => classes.find(c => c.id === s.class_id);
  const objsFor = (c, gid, t) => ((c.objectives || {})[gid] || [])[t] || [];
  const val = (sid, cid, k) => ((R[sid] || {})[cid] || {})[k];
  const stat = (sid, oid) => (ST[sid] || {})[oid] || "";
  function levelFromPct(p) { let lv = 0; C.gradeMin.forEach((x, i) => { if (p >= x) lv = i; }); return lv; }
  function colEval(s, c, k) {
    if (c.type === "comment") return null;
    if (c.type === "objectives") {
      if (k === "b") return null; const cl = clsOf(s), tg = TG[cl.id] || new Set(); let a = 0, sec = 0, ex = 0;
      objsFor(c, cl.grade_id, +k).filter(o => tg.has(o.id)).forEach(o => { const v = stat(s.id, o.id); if (v) { a++; sec += credit(v); if (isEx(v)) ex++; } });
      if (!a) return null; const p = sec / a * 100, e = ex / a * 100; return { band: p < c.belowPct ? -1 : (p >= 90 && e >= c.abovePct) ? 1 : 0, norm: clamp(p / 100) };
    }
    const v = val(s.id, c.id, k); if (v === undefined || v === "") return null;
    const pos = C.gradePos, gm = C.gradeMin, iS = (gm[pos.indexOf("inline")] ?? 50) / 100, aS = (gm[pos.indexOf("above")] ?? 90) / 100;
    const piece = (x, lo, hi, ls, hs) => x < lo ? iS * clamp((x - (lo - ls)) / ls) * .999 : x < hi ? iS + (aS - iS) * (x - lo) / (hi - lo) : aS + (1 - aS) * clamp((x - hi) / hs);
    if (c.type === "list") { const i = c.options.indexOf(v); if (i < 0) return null; const n = c.options.length;
      return { band: i < c.below ? -1 : i >= c.above ? 1 : 0, norm: i < c.below ? iS * (i + .5) / c.below : i < c.above ? iS + (aS - iS) * (i - c.below + .5) / (c.above - c.below) : aS + (1 - aS) * (i - c.above + .5) / (n - c.above) }; }
    const n = +v; if (isNaN(n)) return null;
    if (c.type === "standardised") return { band: n < c.below ? -1 : n >= c.above ? 1 : 0, norm: piece(n, c.below, c.above, 30, 15) };
    if (c.type === "readingAge") return { band: n < c.below ? -1 : n > c.above ? 1 : 0, norm: piece(n, c.below, c.above + .0001, 1.5, 1.5) };
    return { band: n < c.below ? -1 : n >= c.above ? 1 : 0, norm: clamp(n / c.max) };
  }
  function strandEval(s, st, k) {
    const ev = st.cols.filter(c => k === "b" ? c.baseline : !c.baseline).map(c => colEval(s, c, k)).filter(Boolean); if (!ev.length) return null;
    const pct = ev.reduce((a, x) => a + x.norm, 0) / ev.length * 100, sug = levelFromPct(pct); return { band: C.gradePos[sug] || "inline", sug };
  }
  function level(s, st, k) { const t = ((LV[s.id] || {})[st.id] || {})[k]; if (t !== undefined && t !== null) return t; const e = strandEval(s, st, k); return e ? e.sug : null; }
  function progress(s, st, t) { const b = level(s, st, "b"), c = level(s, st, String(t)); if (b == null || c == null) return null; const steps = c - b, exp = C.steps * (t + 1) / C.terms.length; return { band: steps < exp - .5 ? "below" : steps > exp + .5 ? "above" : "inline" }; }
  function onTrack(s, st, t) { const b = level(s, st, "b"), c = level(s, st, String(t)); if (b == null || c == null) return null; const max = C.scale.length - 1; return Math.min(max, Math.round(b + (c - b) / (t + 1) * C.terms.length)) >= Math.min(max, b + C.steps); }
  function avgBand(s, list, k) { const bs = list.map(st => strandEval(s, st, k)).filter(Boolean).map(e => ({ below: -1, inline: 0, above: 1 })[e.band]); if (!bs.length) return null; const b = bs.reduce((a, x) => a + x, 0) / bs.length; return b < -.33 ? "below" : b > .33 ? "above" : "inline"; }
  function avgProg(s, list, t) { const ps = list.map(st => progress(s, st, t)).filter(Boolean).map(p => ({ below: -1, inline: 0, above: 1 })[p.band]); if (!ps.length) return null; const b = ps.reduce((a, x) => a + x, 0) / ps.length; return b < -.33 ? "below" : b > .33 ? "above" : "inline"; }

  function summarise(list, sts, t) {
    const k = String(t), a = { below: 0, inline: 0, above: 0, none: 0 }, p = { below: 0, inline: 0, above: 0, none: 0 }; let ok = 0, n = 0;
    list.forEach(s => { a[avgBand(s, sts, k) || "none"]++; p[avgProg(s, sts, t) || "none"]++; sts.forEach(st => { const o = onTrack(s, st, t); if (o !== null) { n++; if (o) ok++; } }); });
    return { a, p, ok, n };
  }
  function coverage(sts, t, list) {
    let tot = 0, tg = 0; const cls = [...new Set(list.map(s => s.class_id))].map(id => classes.find(c => c.id === id)).filter(Boolean);
    cls.forEach(cl => sts.forEach(st => st.cols.filter(c => c.type === "objectives").forEach(c => objsFor(c, cl.grade_id, t).forEach(o => { tot++; if ((TG[cl.id] || new Set()).has(o.id)) tg++; }))));
    return tot ? [tg, tot] : null;
  }
  const bar = (c, n) => { const w = x => (c[x] || 0) / (n || 1) * 100; return `<div class="sbar" aria-hidden="true"><i style="width:${w("below")}%;background:var(--red)"></i><i style="width:${w("inline")}%;background:var(--sage)"></i><i style="width:${w("above")}%;background:var(--plum)"></i></div>`; };
  function groupTable(sts, t) {
    let h = `<div class="tablewrap"><table class="small"><tr><th style="text-align:left">Group</th><th>Below</th><th>In line</th><th>Above</th><th>Expected progress or better</th></tr>`;
    ["All", ...(C.groups || [])].forEach(g => { const gs = filtered(g), r = summarise(gs, sts, t), known = gs.length - r.p.none;
      h += `<tr><td style="text-align:left">${g === "All" ? "All students" : esc(g)} (${gs.length})</td><td>${r.a.below}</td><td>${r.a.inline}</td><td>${r.a.above}</td><td>${known ? Math.round((r.p.inline + r.p.above) / known * 100) + "%" : "–"}</td></tr>`; });
    return h + `</table></div>`;
  }
  function card(title, list, sts, t, extra) {
    const r = summarise(list, sts, t), n = list.length, known = n - r.p.none, cv = coverage(sts, t, list);
    return `<div class="card" style="margin:0"><h2>${title}</h2>
      ${cv ? `<p class="note" style="margin:0">Curriculum coverage: ${cv[0]} of ${cv[1]} objectives taught</p><div class="meter"><i style="width:${cv[0] / cv[1] * 100}%"></i></div>` : ""}
      <h3>Attainment against curriculum standards</h3>${bar(r.a, n)}<p class="note" style="margin:0">${esc(POS.below)} ${r.a.below}, ${esc(POS.inline.toLowerCase())} ${r.a.inline}, ${esc(POS.above.toLowerCase())} ${r.a.above}${r.a.none ? `, no data yet ${r.a.none}` : ""}</p>
      <h3>Progress since baseline</h3>${bar(r.p, n)}<p class="note" style="margin:0">${esc(PROG.below)} ${r.p.below}, ${esc(PROG.inline.toLowerCase())} ${r.p.inline}, ${esc(PROG.above.toLowerCase())} ${r.p.above}${known ? `. ${Math.round((r.p.inline + r.p.above) / known * 100)}% making expected or better than expected progress` : ""}</p>
      <h3>On track for end-of-year targets</h3><p class="note" style="margin:0">${r.n ? `${r.ok} of ${r.n} student targets (${Math.round(r.ok / r.n * 100)}%)` : "–"}</p>
      <h3>By group</h3>${groupTable(sts, t)}${extra || ""}</div>`;
  }
  const filtered = g => studs.filter(s => (g === "All" || (s.groups || []).includes(g)) && (ui.grade === "All" || (clsOf(s) || {}).grade_id === ui.grade) && (ui.group === "All" || (s.groups || []).includes(ui.group)));

  function render() {
    const t = ui.term, list = filtered("All"), grades = C.grades || [];
    const sel = (id, label, opts, cur) => `<label class="fl" for="${id}">${label}</label><select id="${id}" class="fsel">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    if (ctx.fixedMode) { ui.mode = ctx.fixedMode; if (ui.term === "year") ui.term = 0; } else if (ui.mode === "reports") ui.mode = "subject";
    let h = (ctx.fixedMode ? "" : `<div class="tabs2" role="tablist"><button role="tab" data-smode="subject" aria-selected="${ui.mode === "subject"}">By subject</button><button role="tab" data-smode="strand" aria-selected="${ui.mode === "strand"}">By strand</button></div>`)
      + `<div class="fbar">${sel("svGrade", "Grade", [["All", "All grades"], ...grades.map(g => [g.id, g.name])], ui.grade)}${sel("svTerm", "Term", (ctx.fixedMode ? [] : [["year", "Whole year (all terms)"]]).concat(C.terms.map((x, i) => [i, x])), t)}${sel("svGrp", "Students", [["All", "All students"], ...(C.groups || []).map(g => [g, g])], ui.group)}</div>`;
    if (!list.length) { ctx.el.innerHTML = h + `<div class="card"><p class="note">No students match these filters yet.</p></div>`; return; }
    if (ui.mode === "reports") { ctx.el.innerHTML = h + reportsTracker(list); return; }
    if (t === "year") { ctx.el.innerHTML = h + yearView(list); return; }
    if (ui.mode === "subject") {
      const all = strands().map(p => p[1]);
      h += card(`${ui.grade === "All" ? "Whole school" : esc((grades.find(g => g.id === ui.grade) || {}).name)}, all subjects`, list, all, t) + `<div class="grid2" style="margin-top:16px">`;
      C.subjects.forEach(sb => {
        const weak = sb.strands.map(st => [st.name, list.filter(s => { const e = strandEval(s, st, String(t)); return e && e.band === "below"; }).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
        const ex = sb.strands.length > 1 ? `<h3>Strands to focus on</h3>${weak.length ? weak.map(([n, c]) => `<div class="flagrow">${badge("below", c)} below in ${esc(n)}</div>`).join("") : `<p class="note">No strands with students below.</p>`}<p><button class="btn ghost small" data-smode="strand">See strand detail</button></p>` : "";
        h += card(esc(sb.name), list, sb.strands, t, ex);
      });
      ctx.el.innerHTML = h + `</div>`; return;
    }
    h += `<div class="grid2">`;
    strands().forEach(([sb, st]) => {
      const flags = [], k = String(t);
      st.cols.forEach(c => {
        if (c.type === "objectives") {
          const map = {}; list.forEach(s => { const cl = clsOf(s), tg = TG[cl.id] || new Set(); objsFor(c, cl.grade_id, t).filter(o => tg.has(o.id)).forEach(o => { const m = map[o.id] = map[o.id] || { text: o.text, na: 0, ny: 0, n: 0 }; m.n++; const v = stat(s.id, o.id); if (!v) m.na++; if (isGap(v)) m.ny++; }); });
          Object.values(map).forEach(m => { if (m.na) flags.push(`${badge("none", m.na)} not assessed: ${esc(m.text)}`); if (m.ny >= Math.max(2, m.n / 3)) flags.push(`${badge("below", m.ny)} not yet secure: ${esc(m.text)}. Consider re-teaching to the group.`); });
        } else if (c.type !== "comment") { const kk = c.baseline ? "b" : k, x = list.filter(s => val(s.id, c.id, kk) == null).length; if (x) flags.push(`${badge("none", x)} missing: ${esc(c.name)}`); }
      });
      h += card(esc(sb.name === st.name ? sb.name : `${sb.name}: ${st.name}`), list, [st], t, `<h3>Needs attention</h3>${flags.length ? flags.slice(0, 12).map(f => `<div class="flagrow">${f}</div>`).join("") + (flags.length > 12 ? `<p class="note">…and ${flags.length - 12} more.</p>` : "") : `<p class="note">All data recorded.</p>`}`);
    });
    ctx.el.innerHTML = h + `</div>`;
  }

  function yearRows(list, sts) {
    let rows = "";
    C.terms.forEach((tn, ti) => { const r = summarise(list, sts, ti), n = list.length, known = n - r.a.none, pk = n - r.p.none, cv = coverage(sts, ti, list);
      if (!known && !pk) { rows += `<tr><td style="text-align:left"><b>${esc(tn)}</b></td><td colspan="5" class="note" style="text-align:left">No data yet</td></tr>`; return; }
      rows += `<tr><td style="text-align:left"><b>${esc(tn)}</b></td><td style="min-width:160px">${bar(r.a, n)}</td><td>${r.a.below} / ${r.a.inline} / ${r.a.above}</td>
        <td>${pk ? Math.round((r.p.inline + r.p.above) / pk * 100) + "%" : "–"}</td><td>${r.n ? Math.round(r.ok / r.n * 100) + "%" : "–"}</td><td>${cv ? Math.round(cv[0] / cv[1] * 100) + "%" : "–"}</td></tr>`; });
    return `<div class="tablewrap"><table class="small"><tr><th style="text-align:left">Term</th><th>Attainment</th><th>Below / in line / above standards</th><th>Expected progress or better</th><th>On track</th><th>Coverage</th></tr>${rows}</table></div>`;
  }
  function yearView(list) {
    const grades = C.grades || [], all = strands().map(p => p[1]);
    let h = `<div class="card" style="margin:0 0 16px"><h2>${ui.grade === "All" ? "Whole school" : esc((grades.find(g => g.id === ui.grade) || {}).name)}, all subjects, whole year</h2><p class="note">Each term side by side, so you can see how attainment and progress change across the year.</p>${yearRows(list, all)}</div><div style="display:grid;gap:16px">`;
    if (ui.mode === "strand") strands().forEach(([sb, st]) => h += `<div class="card" style="margin:0"><h2>${esc(sb.name === st.name ? sb.name : sb.name + ": " + st.name)}</h2>${yearRows(list, [st])}</div>`);
    else C.subjects.forEach(sb => h += `<div class="card" style="margin:0"><h2>${esc(sb.name)}</h2>${yearRows(list, sb.strands)}</div>`);
    return h + `</div><p class="note">Bars show below (red), in line (green) and above (plum). Expected progress+ is the share of students making expected or better than expected progress since baseline.</p>`;
  }
  function reportsTracker(list) {
    const t = String(ui.term), byKey = {}; CMS.forEach(x => { if (x.term === t) byKey[x.student_id + "|" + x.strand_id] = x.status; });
    const name = id => { const p = STAFF.find(x => x.id === id); return p ? (p.full_name || p.email) : "Former staff"; };
    const cls = classes.filter(c => list.some(s => s.class_id === c.id)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const tot = { approved: 0, ready: 0, changes: 0, draft: 0, none: 0 };
    let rows = "";
    cls.forEach(c => {
      const ss = list.filter(s => s.class_id === c.id), home = LINKS.filter(l => l.class_id === c.id && !l.subject_id).map(l => name(l.teacher_id));
      rows += `<tr><td style="text-align:left"><button class="name" data-openrep="${c.id}">${esc(c.name)} ›</button><div class="note">${home.length ? home.map(esc).join(", ") : "No class teacher"}</div></td>`;
      let ca = 0, cn = 0;
      C.subjects.forEach(sb => {
        const k = { approved: 0, ready: 0, changes: 0, draft: 0, none: 0 }; ss.forEach(s => sb.strands.forEach(st => k[byKey[s.id + "|" + st.id] || "none"]++));
        const n = ss.length * sb.strands.length, pct = n ? Math.round(k.approved / n * 100) : 0; ca += k.approved; cn += n; Object.keys(tot).forEach(x => tot[x] += k[x]);
        const spec = LINKS.filter(l => l.class_id === c.id && l.subject_id === sb.id).map(l => name(l.teacher_id));
        rows += `<td><div class="meter" style="margin:0 auto 4px;max-width:120px"><i style="width:${pct}%"></i></div><b>${k.approved}/${n}</b> approved
          <div class="note" style="font-size:12px">${[k.ready ? `${k.ready} to check` : "", k.changes ? `<span style="color:var(--red)">${k.changes} to fix</span>` : "", k.draft ? `${k.draft} drafts` : "", k.none ? `${k.none} not started` : ""].filter(Boolean).join(" · ")}</div>${spec.length ? `<div class="note" style="font-size:12px">${spec.map(esc).join(", ")}</div>` : ""}</td>`;
      });
      rows += `<td>${cn ? badge(ca === cn ? "inline" : ca / cn >= .5 ? "none" : "below", Math.round(ca / cn * 100) + "%") : "–"}</td></tr>`;
    });
    const all = Object.values(tot).reduce((a, x) => a + x, 0);
    return `<div class="card"><h2>Report comments, ${esc(C.terms[ui.term])}</h2><div class="meter"><i style="width:${all ? tot.approved / all * 100 : 0}%"></i></div>
      <p class="note">${tot.approved} of ${all} approved. ${tot.ready} waiting for a buddy check, ${tot.changes} returned for changes, ${tot.draft} drafts, ${tot.none} not started.</p></div>
      <div class="sheetwrap" style="margin-top:14px"><table class="sheet"><thead><tr><th style="text-align:left">Class</th>${C.subjects.map(sb => `<th>${esc(sb.name)}</th>`).join("")}<th>Overall</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">Tap a class to open its report comments. Each subject counts one comment per strand for every student. Names under a subject are its specialist teachers.</p>`;
  }
  function upload() { if (!C) return; TNResults.open({ sb: ctx.sb, C, scopeText: "For the whole school. Include a Class column if two students share the same name.", limitClass: null,
      students: studs.map(x => ({ ...x, class_name: (clsOf(x) || {}).name })), existing: (sid, cid, k) => val(sid, cid, k),
      onDone: async n => { await load(); render(); ctx.el.insertAdjacentHTML("afterbegin", `<div class="msg ok" style="margin-bottom:10px">Saved ${n} result${n === 1 ? "" : "s"}.</div>`); } }); }
  function onClick(e) { const b = e.target.closest("button"); if (!b || !ctx || !ctx.el.contains(b)) return;
    if (b.dataset.openrep && ctx.openClass) return ctx.openClass(classes.find(c => c.id === b.dataset.openrep));
    if (b.dataset.smode) { ui.mode = b.dataset.smode; render(); window.scrollTo(0, 0); }
    if (b.dataset.sterm) { ui.term = +b.dataset.sterm; render(); }
    if (b.dataset.sgrp) { ui.group = b.dataset.sgrp; render(); } }
  function onChange(e) { const t = e.target; if (!ctx || !ctx.el.contains(t)) return;
    if (t.id === "svGrade") { ui.grade = t.value; render(); } if (t.id === "svTerm") { ui.term = t.value === "year" ? "year" : +t.value; render(); } if (t.id === "svGrp") { ui.group = t.value; render(); } }

  window.TNSchool = {
    async open(context) {
      ctx = context; if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      ctx.el.innerHTML = `<div class="card"><p class="note">Loading the school view…</p></div>`;
      try { await load(); render(); } catch (err) { ctx.el.innerHTML = `<div class="card"><div class="msg err">${esc(err.message || err)}</div></div>`; }
    },
    upload,
    close() { ctx = null; }
  };
})();
