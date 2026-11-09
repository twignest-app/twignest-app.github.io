/* TwigNest: upload results from Excel */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = v => String(v ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
  let X = null, bound = false;

  async function loadXLSX() {
    if (window.XLSX) return;
    await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Couldn’t load the Excel reader. Check your internet connection and try again.")); document.head.appendChild(s); });
  }
  const cols = () => { const o = []; X.C.subjects.forEach(sb => sb.strands.forEach(st => st.cols.forEach(c => { if (!["objectives", "comment"].includes(c.type)) o.push({ sb, st, c }); }))); return o; };
  const label = x => `${x.sb.name}${x.sb.name !== x.st.name ? " › " + x.st.name : ""} › ${x.c.name}`;

  function parseValue(c, raw) {
    const s = String(raw ?? "").trim(); if (!s) return { empty: true };
    if (c.type === "list") { const o = c.options.find(x => norm(x) === norm(s)); return o ? { v: o } : { err: `“${s}” isn’t one of: ${c.options.join(", ")}` }; }
    let n;
    if (c.type === "readingAge") { const m = s.match(/^(\d+)\s*(?:y|yrs?|years?|:|-|\s)\s*(\d+)\s*(?:m|mths?|months?)?$/i); n = m ? +m[1] + (+m[2]) / 12 : parseFloat(s.replace(",", ".")); n = Math.round(n * 100) / 100; }
    else n = parseFloat(s.replace("%", "").replace(",", "."));
    if (isNaN(n)) return { err: `“${s}” isn’t a number` };
    if ((c.type === "score" || c.type === "rubric") && (n < 0 || n > c.max)) return { err: `${n} is outside 0 to ${c.max}` };
    return { v: String(n) };
  }

  function dlg() { let d = document.getElementById("tnResults"); if (!d) { d = document.createElement("dialog"); d.id = "tnResults"; document.body.appendChild(d); } return d; }
  function render() {
    const d = dlg(), cs = cols(), pick = cs.find(x => x.c.id === X.colId) || cs[0];
    if (pick) X.colId = pick.c.id;
    const termOpts = pick && pick.c.baseline ? [["b", "Baseline"]] : X.C.terms.map((t, i) => [String(i), t]);
    if (!termOpts.find(x => x[0] === X.term)) X.term = termOpts[0][0];
    let h = `<div class="dlg"><div class="row" style="justify-content:space-between"><h2 style="margin:0;color:var(--plum);font-family:Poppins,sans-serif">Upload results from Excel</h2><button class="btn ghost small" data-rx="close">Close</button></div>
      <p class="note">${esc(X.scopeText)}</p>`;
    if (!cs.length) { d.innerHTML = h + `<p>There are no score columns in your setup yet.</p></div>`; return; }
    h += `<div class="grid2"><div><label for="rxCol"><b>Which column are these results for?</b></label><select id="rxCol">${cs.map(x => `<option value="${x.c.id}" ${x.c.id === X.colId ? "selected" : ""}>${esc(label(x))}</option>`).join("")}</select></div>
      <div><label for="rxTerm"><b>Term</b></label><select id="rxTerm">${termOpts.map(([k, t]) => `<option value="${k}" ${k === X.term ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div></div>
      <p class="note">${pick.c.type === "list" ? "Values must be one of: " + esc(pick.c.options.join(", ")) + "." : pick.c.type === "readingAge" ? "Reading ages can be written as 7.5, 7y 6m or 7:6." : pick.c.type === "score" || pick.c.type === "rubric" ? `Marks out of ${pick.c.max}.` : "Standardised scores, such as 104."}</p>
      <div class="row" style="margin:10px 0"><label class="btn" style="margin:0;font-size:16px;cursor:pointer">Choose Excel file<input type="file" id="rxFile" accept=".xlsx,.xls,.csv" hidden></label><span class="note">${X.file ? esc(X.file) : "Excel or CSV, with a column of student names and a column of results."}</span></div>`;
    if (X.rows) {
      const head = X.rows[X.hi] || [], opt = sel => head.map((hd, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${esc(hd || "Column " + (i + 1))}</option>`).join("");
      h += `<div class="grid3"><div><label for="rxName"><b>Student names are in</b></label><select id="rxName">${opt(X.nameI)}</select></div>
        <div><label for="rxVal"><b>Results are in</b></label><select id="rxVal">${opt(X.valI)}</select></div>
        <div><label for="rxCls"><b>Class is in (optional)</b></label><select id="rxCls"><option value="-1">No class column</option>${opt(X.clsI)}</select></div></div>`;
      const p = preview();
      h += `<div class="grid3" style="margin:12px 0"><div class="colcard" style="margin:0"><b style="font-size:22px;color:var(--plum)">${p.ok.length}</b><div class="note">results ready to save${p.over ? `, ${p.over} replacing existing results` : ""}</div></div>
        <div class="colcard" style="margin:0"><b style="font-size:22px;color:var(--plum)">${p.unmatched.length}</b><div class="note">names not found</div></div>
        <div class="colcard" style="margin:0"><b style="font-size:22px;color:var(--plum)">${p.bad.length}</b><div class="note">results that can’t be read</div></div></div>`;
      if (p.unmatched.length) h += `<details><summary class="note"><b>Names not found</b> (check spelling, or add the student in Classes and students)</summary><p class="note">${p.unmatched.slice(0, 60).map(esc).join(", ")}${p.unmatched.length > 60 ? "…" : ""}</p></details>`;
      if (p.ambiguous.length) h += `<div class="msg info">${p.ambiguous.length} name${p.ambiguous.length === 1 ? " matches" : "s match"} more than one student. Choose the class column so TwigNest can tell them apart: ${p.ambiguous.slice(0, 10).map(esc).join(", ")}</div>`;
      if (p.bad.length) h += `<details><summary class="note"><b>Results that can’t be read</b></summary><p class="note">${p.bad.slice(0, 40).map(b => esc(b.name + ": " + b.err)).join("<br>")}</p></details>`;
      h += `<div class="tablewrap" style="margin-top:10px"><table class="small"><tr><th style="text-align:left">Student</th><th>Result</th><th>Before</th></tr>${p.ok.slice(0, 12).map(r => `<tr><td style="text-align:left">${esc(r.s.full_name)}</td><td><b>${esc(r.v)}</b></td><td class="note">${esc(r.prev ?? "–")}</td></tr>`).join("")}</table></div>${p.ok.length > 12 ? `<p class="note">…and ${p.ok.length - 12} more.</p>` : ""}
        <div class="row" style="margin-top:12px"><button class="btn" data-rx="save" ${p.ok.length ? "" : "disabled"}>Save ${p.ok.length} result${p.ok.length === 1 ? "" : "s"}</button><span id="rxMsg" class="note"></span></div>`;
    }
    d.innerHTML = h + `</div>`; if (!d.open) d.showModal();
  }
  function preview() {
    const c = cols().find(x => x.c.id === X.colId).c, ok = [], unmatched = [], bad = [], ambiguous = [], seen = new Set();
    X.rows.slice(X.hi + 1).forEach(r => {
      const name = String(r[X.nameI] ?? "").trim(); if (!name) return;
      let cands = X.students.filter(s => norm(s.full_name) === norm(name));
      if (X.clsI >= 0) cands = cands.filter(s => norm(s.class_name) === norm(r[X.clsI]));
      if (!cands.length) { if (X.clsI < 0 || X.limitClass == null || norm(r[X.clsI]) === norm(X.limitClass)) unmatched.push(name); return; }
      if (cands.length > 1) { ambiguous.push(name); return; }
      const s = cands[0]; if (seen.has(s.id)) return; seen.add(s.id);
      const pv = parseValue(c, r[X.valI]); if (pv.empty) return; if (pv.err) { bad.push({ name, err: pv.err }); return; }
      ok.push({ s, v: pv.v, prev: X.existing(s.id, c.id, X.term) });
    });
    return { ok, unmatched, bad, ambiguous, over: ok.filter(r => r.prev != null && r.prev !== r.v).length };
  }
  async function readFile(f) {
    await loadXLSX(); const wb = XLSX.read(await f.arrayBuffer()), ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
    let hi = rows.findIndex(r => r.some(c => /name|student|pupil/i.test(String(c)))); if (hi < 0) hi = 0;
    const head = (rows[hi] || []).map(x => String(x).toLowerCase());
    const f1 = re => head.findIndex(h => re.test(h));
    X.rows = rows; X.hi = hi; X.file = f.name;
    X.nameI = Math.max(0, f1(/name|student|pupil/));
    X.clsI = f1(/^(class|section|form|homeroom|group)$/);
    const pick = cols().find(x => x.c.id === X.colId), want = pick ? norm(pick.c.name) : "";
    let v = head.findIndex(h => want && norm(h) === want); if (v < 0) v = f1(/score|result|mark|sas|standard|total|age|band|level|percent/);
    if (v < 0) v = head.findIndex((h, i) => i !== X.nameI && i !== X.clsI && h); X.valI = Math.max(0, v);
  }
  async function save() {
    const p = preview(), msg = document.getElementById("rxMsg"), c = cols().find(x => x.c.id === X.colId).c;
    const rows = p.ok.map(r => ({ student_id: r.s.id, col_id: c.id, term: X.term, value: r.v }));
    for (let i = 0; i < rows.length; i += 500) { msg.textContent = `Saving ${Math.min(i + 500, rows.length)} of ${rows.length}…`;
      const { error } = await X.sb.from("results").upsert(rows.slice(i, i + 500)); if (error) { msg.textContent = "Not saved: " + error.message; return; } }
    dlg().close(); X.onDone(rows.length);
  }
  async function onClick(e) { const b = e.target.closest("[data-rx]"); if (!b || !X || !b.closest("#tnResults")) return;
    if (b.dataset.rx === "close") return dlg().close();
    if (b.dataset.rx === "save") { b.disabled = true; try { await save(); } finally { b.disabled = false; } } }
  async function onChange(e) { const t = e.target; if (!X || !t.closest || !t.closest("#tnResults")) return;
    if (t.id === "rxCol") { X.colId = t.value; return render(); }
    if (t.id === "rxTerm") { X.term = t.value; return render(); }
    if (t.id === "rxName") { X.nameI = +t.value; return render(); }
    if (t.id === "rxVal") { X.valI = +t.value; return render(); }
    if (t.id === "rxCls") { X.clsI = +t.value; return render(); }
    if (t.id === "rxFile") { const f = t.files[0]; if (!f) return; try { await readFile(f); render(); } catch (err) { alert(err.message || err); } }
  }

  window.TNResults = {
    open(o) {
      if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      X = Object.assign({ colId: null, term: null, rows: null, file: "" }, o); render();
    }
  };
})();
