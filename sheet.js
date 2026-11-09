/* TwigNest class sheet */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = n => Math.max(0, Math.min(1, n));
  const DOT = { "": "", s: "✓", n: "!", e: "+" }, DOTL = { "": "not assessed", s: "secure", n: "not yet secure", e: "exceeding" };
  const POS = { below: "Below grade level", inline: "In line", above: "Above grade level", none: "Not yet assessed" };
  const PROG = { below: "Below expected", inline: "Expected", above: "Above expected" };
  const badge = (c, t) => `<span class="badge b-${c}">${t}</span>`;
  let ctx, C, cls, studs = [], R = {}, ST = {}, TAUGHT = new Set(), LV = {}, ui = { sub: null, strand: null, term: 0, group: "All" }, bound = false, pending = 0;

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

  async function load() {
    const sb = ctx.sb;
    const [s, st] = await Promise.all([
      sb.from("school_setups").select("*").eq("school_id", cls.school_id).eq("year", cls.year).limit(1),
      sb.from("students").select("*").eq("class_id", cls.id).eq("archived", false).order("full_name")]);
    if (s.error || st.error) throw (s.error || st.error);
    if (!s.data.length) throw new Error("This school’s setup for " + cls.year + " couldn’t be found.");
    C = s.data[0].config; studs = st.data;
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
    let h = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="row"><button class="btn ghost small" data-sh="back">← Back</button><h2 style="margin:0;font-family:Poppins,sans-serif;color:var(--plum)">${esc(cls.name)}</h2><span class="note">${studs.length} students</span></div><span class="note" id="shSave">All changes saved</span></div>
      <div class="row" style="margin-bottom:10px"><label class="note" for="shSub"><b>Subject</b></label><select id="shSub" style="width:auto">${subs.map(s => `<option value="${s.id}" ${s.id === ui.sub ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <label class="note" for="shStr"><b>Strand</b></label><select id="shStr" style="width:auto">${sb.strands.map(s => `<option value="${s.id}" ${s.id === ui.strand ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      ${C.terms.map((x, i) => `<button class="chip" data-term="${i}" aria-pressed="${i === t}">${esc(x)}</button>`).join("")}</div>
      <div class="row" style="margin-bottom:10px">${["All", ...(C.groups || [])].map(g => `<button class="chip" data-grp="${esc(g)}" aria-pressed="${g === ui.group}">${g === "All" ? "All students" : esc(g)}</button>`).join("")}</div>
      <div class="legend"><span><i class="dot" style="width:18px;height:18px"></i>Not assessed</span><span><i class="dot s" style="width:18px;height:18px"></i>Secure</span><span><i class="dot n" style="width:18px;height:18px"></i>Not yet secure</span><span><i class="dot e" style="width:18px;height:18px"></i>Exceeding</span><span>Scores are shaded ${badge("below", "below")} ${badge("inline", "in line")} ${badge("above", "above")}</span></div>`;
    if (!studs.length) { ctx.el.innerHTML = h + `<div class="card"><p class="note">This class has no students yet. The school lead adds them in Classes and students.</p></div>`; return; }
    let th = `<thead><tr><th class="namecol"></th><th class="grp" colspan="${bc.length + 1}">Baseline</th><th class="grp" colspan="${n || 1}">${esc(C.terms[t])}</th><th class="grp" colspan="3">Summary</th></tr><tr><th class="namecol">Student</th>`;
    bc.forEach(c => th += `<th class="colh"><b>${esc(c.name)}</b>${hint(c)}</th>`);
    th += `<th class="colh"><b>Baseline level</b>scale</th>`;
    tc.forEach(c => { if (c.type === "objectives") objs(c, t).forEach(o => { const tg = TAUGHT.has(o.id);
      th += `<th class="obj"><span class="t">${esc(o.text)}</span><label><input type="checkbox" data-taught="${o.id}" ${tg ? "checked" : ""}> Taught</label><button class="mini" data-all="${o.id}" ${tg ? "" : "disabled"}>Mark all secure</button></th>`; });
      else th += `<th class="colh"><b>${esc(c.name)}</b>${hint(c)}</th>`; });
    if (!n) th += `<th class="note">No columns for this term</th>`;
    th += `<th>Position</th><th class="colh"><b>Teacher level</b>Auto shows the suggestion</th><th>Progress from baseline</th></tr></thead><tbody>`;
    visible().forEach(s => { const sm = summary(s, st);
      th += `<tr><td class="namecol"><b style="color:var(--plum)">${esc(s.full_name)}</b><div class="tags">${(s.groups || []).map(g => `<span class="tag">${esc(g)}</span>`).join("")}</div></td>`;
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
    const t = e.target.closest("button"); if (!t || !ctx || !ctx.el.contains(t)) return;
    if (t.dataset.sh === "back") return ctx.back();
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

  window.TNSheet = {
    async open(context) {
      ctx = context; cls = ctx.cls; pending = 0;
      if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      ctx.el.innerHTML = `<div class="card"><p class="note">Loading ${esc(cls.name)}…</p></div>`;
      try { await load(); render(); } catch (err) { ctx.el.innerHTML = `<div class="card"><div class="msg err">${esc(err.message || err)}</div><p><button class="btn ghost" data-sh="back">← Back</button></p></div>`; }
    },
    close() { ctx = null; }
  };
})();
