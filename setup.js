/* TwigNest setup wizard: saved to public.school_setups */
(function () {
  const uid = p => p + Math.random().toString(36).slice(2, 9);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lines = v => v.split("\n").map(x => x.trim()).filter(Boolean);
  const BANDS = ["Low", "Middle", "High"];
  const POS = { below: "Below curriculum standards", inline: "In line with curriculum standards", above: "Above curriculum standards" };
  const DEF_LAB = { att: { below: "Below curriculum standards", inline: "In line with curriculum standards", above: "Above curriculum standards" }, prog: { below: "Below expected progress", inline: "Expected progress", above: "Better than expected progress" } };
  const TYPES = {
    objectives: { label: "Curriculum objectives", help: "Objectives for each grade and term, marked secure, not yet secure or exceeding." },
    score: { label: "Test score", help: "A mark out of a total, such as a spelling test out of 20." },
    standardised: { label: "Standardised score", help: "Scores from external tests, usually around 100." },
    readingAge: { label: "Reading age", help: "Recorded in years, such as 7.5 for seven and a half." },
    list: { label: "List or scale", help: "Ordered options, lowest first, such as book bands or phonics groups." },
    rubric: { label: "Rubric score", help: "A total rubric score, such as a Summative Assessment Task." },
    comment: { label: "Comment", help: "Free text. Not used in calculations." }
  };
  const BANK_AR = [
    ["أداء {name} في {strand} في بداياته الأولى، ويحتاج إلى دعم مكثف ومستمر من المعلم للمشاركة في التعلم.", "أداء {name} في {strand} في مراحله الأولى، ويحتاج إلى دعم كبير للوصول إلى التعلم.", "يظهر أداء {name} في {strand} خطوات أولى صغيرة بدعم كبير من المعلم."],
    ["بدأت مهارات {name} في {strand} بالتطور، مع الاعتماد على نمذجة المعلم لإنجاز المهام.", "بدأت مهارات {name} في {strand} بالتطور، ويكون التعلم أفضل مع دعم المعلم ونمذجته.", "تتطور المهارات الأولية لدى {name} في {strand}، مع بدء إنجاز بعض المهام بدعم أقل."],
    ["تتطور مهارات {name} في {strand} نحو المستوى المتوقع، مع الحاجة إلى دعم منتظم.", "تتطور مهارات {name} في {strand} بثبات نحو المستوى المتوقع، مع قدر من الدعم.", "أصبح أداء {name} في {strand} قريبا من المستوى المتوقع، مع الحاجة إلى الدعم في بعض الأحيان فقط."],
    ["بلغ أداء {name} في {strand} المستوى المتوقع، مع ثقة متنامية في تطبيق التعلم الجديد.", "أداء {name} في {strand} في المستوى المتوقع، مع تطبيق التعلم الجديد بثقة متزايدة.", "أداء {name} في {strand} في المستوى المتوقع بثقة، مع تطبيق التعلم الجديد بدعم قليل."],
    ["أداء {name} في {strand} ثابت في المستوى المتوقع، مع بداية التطبيق المستقل للمهارات.", "أداء {name} في {strand} ثابت في المستوى المتوقع، مع تطبيق المهارات باستقلالية.", "أداء {name} في {strand} ثابت جدا، مع تطبيق المهارات باستقلالية ودقة."],
    ["أداء {name} في {strand} أعلى من المستوى المتوقع، مع بداية تطبيق المهارات في سياقات جديدة.", "أداء {name} في {strand} أعلى من المستوى المتوقع، مع تطبيق المهارات بثقة في سياقات جديدة.", "أداء {name} في {strand} أعلى بكثير من المستوى المتوقع، مع تطبيق المهارات بثقة ودقة في سياقات جديدة."],
    ["أداء {name} في {strand} متميز، مع فهم عميق للتعلم.", "أداء {name} في {strand} متميز، مع فهم ممتاز وتطبيق مبدع للمهارات.", "أداء {name} في {strand} متميز جدا، مع فهم استثنائي وتطبيق مبدع ومستقل للمهارات."]];
  const DEF_OS = [{ code: "s", label: "Secure", short: "✓", kind: "secure" }, { code: "n", label: "Not yet secure", short: "!", kind: "notyet" }, { code: "e", label: "Exceeding", short: "+", kind: "exceed" }];
  const FOUR_OS = [{ code: "n", label: "Emerging", short: "E", kind: "notyet" }, { code: "m2", label: "Developing", short: "D", kind: "partial" }, { code: "s", label: "Secure", short: "S", kind: "secure" }, { code: "e", label: "Mastery", short: "M", kind: "exceed" }];
  const KINDS = { notyet: "Not yet secure (counts 0)", partial: "Partly secure (counts half)", secure: "Secure (counts fully)", exceed: "Exceeding (counts fully, shows greater depth)" };
  const os = () => (C.objScale && C.objScale.length ? C.objScale : (C.objScale = JSON.parse(JSON.stringify(DEF_OS))));
  const STEPS = ["School year and terms", "Grades", "Grading system", "Subjects and strands", "Data columns", "Curriculum objectives", "Student groups", "Report comments", "Check and finish"];
  const AJMAN = { scale: ["1", "2", "3", "4", "5", "6", "7"], gradeMin: [45, 50, 60, 75, 85, 90, 100], gradePos: ["below", "below", "below", "inline", "inline", "above", "above"] };
  const FOUR = { scale: ["Emerging", "Developing", "Expected", "Exceeding"], gradeMin: [0, 40, 70, 90], gradePos: ["below", "below", "inline", "above"] };
  const BANK = [
    ["{name} is at the very early stages of {strand} and needs a high level of adult support to take part in learning.", "{name} is at the early stages of {strand} and needs a high level of support to access the learning.", "{name} is beginning to take small steps in {strand} with a high level of adult support."],
    ["{name} is beginning to develop {strand} skills and relies on adult modelling to complete tasks.", "{name} is beginning to develop {strand} skills and works best with adult support and modelling.", "{name} is developing early {strand} skills and is starting to complete some tasks with less support."],
    ["{name} is developing {strand} skills and is working towards the expected standard with regular support.", "{name} is developing secure {strand} skills and is working towards the expected standard with some support.", "{name} is close to the expected standard in {strand} and needs only occasional support."],
    ["{name} has reached the expected standard in {strand} and is building confidence in applying new learning.", "{name} is working at the expected standard in {strand} and applies new learning with growing confidence.", "{name} is working confidently at the expected standard in {strand} and applies new learning with little support."],
    ["{name} is working securely at the expected standard in {strand} and is beginning to apply skills independently.", "{name} is working securely at the expected standard in {strand} and applies skills independently.", "{name} is working very securely in {strand}, applying skills independently and accurately."],
    ["{name} is working above the expected standard in {strand} and is beginning to apply skills in new contexts.", "{name} is working above the expected standard in {strand}, applying skills confidently in new contexts.", "{name} is working well above the expected standard in {strand}, applying skills confidently and accurately in new contexts."],
    ["{name} is working at greater depth in {strand} and shows a strong understanding of the learning.", "{name} is working at greater depth in {strand}, showing an excellent understanding and applying skills creatively.", "{name} is working at greater depth in {strand}, showing exceptional understanding and applying skills creatively and independently."]];

  function defaults(type) {
    return JSON.parse(JSON.stringify({
      score: { max: 20, below: 10, above: 17 }, rubric: { max: 16, below: 8, above: 14 }, standardised: { below: 85, above: 115 },
      readingAge: { below: 7.5, above: 9 }, list: { options: ["Working towards", "Expected", "Greater depth"], below: 1, above: 2 },
      objectives: { objectives: {}, belowPct: 70, abovePct: 30 }, comment: {}
    }[type]));
  }
  const col = (name, type, extra = {}) => Object.assign({ id: uid("c"), name, type, baseline: false }, defaults(type), extra);

  function template(kind) {
    const base = { terms: ["Term 1", "Term 2", "Term 3"], steps: 2, groups: ["SEN", "G&T", "EAL", "Emirati"], reports: { limit: 600, bank: BANK.map(r => r.slice()) } };
    if (kind === "blank") return Object.assign(base, { grades: [], subjects: [] }, JSON.parse(JSON.stringify(AJMAN)), { groups: ["SEN", "G&T", "EAL"] });
    const grades = ["Pre-K", "KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"].map(n => ({ id: uid("g"), name: n }));
    const strand = (name, cols) => ({ id: uid("st"), name, cols });
    return Object.assign(base, JSON.parse(JSON.stringify(AJMAN)), {
      grades,
      subjects: [
        { id: uid("sb"), name: "English", strands: [
          strand("Reading", [col("Baseline reading test", "standardised", { baseline: true }), col("Reading age", "readingAge"), col("Reading objectives", "objectives")]),
          strand("Writing", [col("Baseline writing assessment", "list", { baseline: true }), col("Writing objectives", "objectives"), col("Summative Assessment Task", "rubric")]),
          strand("Spelling", [col("Baseline spelling test", "score", { baseline: true }), col("Spelling test", "score"), col("Spelling objectives", "objectives")]),
          strand("Speaking and listening", [col("Baseline speaking and listening", "list", { baseline: true }), col("Speaking and listening objectives", "objectives"), col("Teacher notes", "comment")])] },
        { id: uid("sb"), name: "Maths", strands: [
          strand("Number and calculation", [col("Baseline maths test", "standardised", { baseline: true }), col("Number objectives", "objectives"), col("End-of-term assessment", "score", { max: 40, below: 20, above: 34 })]),
          strand("Fractions, measures and data", [col("Baseline teacher assessment", "list", { baseline: true }), col("Fractions, measures and data objectives", "objectives")])] },
        { id: uid("sb"), name: "Science", strands: [
          strand("Science", [col("Baseline teacher assessment", "list", { baseline: true }), col("Science objectives", "objectives"), col("End-of-term assessment", "score", { max: 30, below: 15, above: 26 })])] }
      ]
    });
  }

  let USED = { col: new Set(), obj: new Set(), strand: new Set() }, GRADES_USED = new Set(), bound = false, C, ctx, ui = { step: 0, strand: null, grade: null }, row = null, saveTimer = null, saveState = "";
  const all = () => { const o = []; C.subjects.forEach(sb => sb.strands.forEach(st => o.push([sb, st]))); return o; };
  const findStrand = id => all().find(p => p[1].id === id) || [null, null];
  const findCol = id => { for (const [sb, st] of all()) for (const c of st.cols) if (c.id === id) return c; return null; };
  function gradeRange(i) { const m = C.gradeMin, n = m[i + 1]; return n == null ? (m[i] >= 100 ? "100%" : `${m[i]}–100%`) : `${m[i]}–${Math.round((n - 0.1) * 10) / 10}%`; }

  function validate() {
    const block = [], warn = [];
    if (!C.terms.length) block.push(["Add at least one term or checkpoint.", 0]);
    if (!C.grades.length) block.push(["Add at least one grade.", 1]);
    if (C.scale.length < 2) block.push(["The grading system needs at least two levels.", 2]);
    C.gradeMin.forEach((x, i) => { if (!(x >= 0 && x <= 100)) block.push([`Grading system: level ${C.scale[i]} needs a starting percentage between 0 and 100.`, 2]); else if (i && !(x > C.gradeMin[i - 1])) block.push([`Grading system: level ${C.scale[i]} must start higher than level ${C.scale[i - 1]}.`, 2]); });
    if (C.objScale && C.objScale.length) { if (!C.objScale.some(x => x.kind === "secure")) block.push(["Objective criteria: at least one mark must count as Secure.", 2]);
      if (C.objScale.some(x => !x.label || !x.short)) block.push(["Objective criteria: every mark needs a name and a short label.", 2]); }
    if (!C.subjects.length) block.push(["Add at least one subject.", 3]);
    C.subjects.forEach(sb => {
      if (!sb.name.trim()) block.push(["A subject has no name.", 3]);
      if (!sb.strands.length) block.push([`${sb.name || "A subject"} has no strands.`, 3]);
      sb.strands.forEach(st => {
        const w = `${sb.name} › ${st.name || "unnamed strand"}`;
        if (!st.name.trim()) block.push([`${sb.name} has a strand with no name.`, 3]);
        if (!st.cols.some(x => x.baseline)) block.push([`${w}: choose a baseline column.`, 4, st.id]);
        if (!st.cols.some(x => !x.baseline && x.type !== "comment")) block.push([`${w}: add at least one column recorded each term.`, 4, st.id]);
        st.cols.forEach(x => {
          const n = `${w} › ${x.name || "unnamed column"}`;
          if (!x.name.trim()) block.push([`${w}: a column has no name.`, 4, st.id]);
          if ((x.type === "score" || x.type === "rubric") && !(x.max > 0 && x.below < x.above && x.above <= x.max)) block.push([`${n}: set the maximum mark, with below < above ≤ maximum.`, 4, st.id]);
          if ((x.type === "standardised" || x.type === "readingAge") && !(x.below < x.above)) block.push([`${n}: the “below” value must be lower than the “above” value.`, 4, st.id]);
          if (x.type === "list" && (x.options.length < 2 || !(x.below < x.above))) block.push([`${n}: add at least two options, with the first “above” option after the first “in line” option.`, 4, st.id]);
          if (x.type === "objectives") { const missing = C.grades.filter(g => !((x.objectives[g.id] || []).flat().length)).map(g => g.name); if (missing.length) warn.push([`${n}: no objectives yet for ${missing.join(", ")}.`, 5, st.id]); }
        });
      });
    });
    if (C.subjects.some(x => x.lang === "ar")) C.scale.forEach((lv, i) => { const r = (C.reports.bankAr || BANK_AR)[i] || []; if (BANDS.some((b, j) => !(r[j] || "").trim())) block.push([`Arabic comment bank: level ${lv} is missing a Low, Middle or High comment.`, 7]); });
    C.scale.forEach((lv, i) => { const r = C.reports.bank[i] || []; if (BANDS.some((b, j) => !(r[j] || "").trim())) block.push([`Comment bank: level ${lv} is missing a Low, Middle or High comment.`, 7]); });
    return { block, warn };
  }

  async function save(now) {
    clearTimeout(saveTimer);
    const run = async () => {
      setStatus("Saving…");
      const payload = { school_id: ctx.school.id, year: C.year, config: C, status: row?.status || "draft" };
      const q = row ? ctx.sb.from("school_setups").update({ config: C, year: C.year }).eq("id", row.id).select().single()
                    : ctx.sb.from("school_setups").insert(payload).select().single();
      const { data, error } = await q;
      if (error) { setStatus("Not saved: " + error.message, true); return; }
      row = data; setStatus("All changes saved");
    };
    if (now) return run(); saveTimer = setTimeout(run, 700);
  }
  function setStatus(t, bad) { saveState = t; const el = document.getElementById("setupSave"); if (el) { el.textContent = t; el.style.color = bad ? "var(--red)" : "var(--muted)"; } }

  const objUsed = x => x.type === "objectives" && Object.values(x.objectives || {}).some(per => per.some(list => list.some(o => USED.obj.has(o.id))));
  const colLocked = x => USED.col.has(x.id) || objUsed(x);
  const strandLocked = st => USED.strand.has(st.id) || st.cols.some(colLocked);
  function colForm(x) {
    const L = colLocked(x), dis = L ? "disabled" : "";
    const f = (fld, label, val, extra = "") => `<div><label for="${x.id}-${fld}">${label}</label><input id="${x.id}-${fld}" type="number" step="any" data-colf="${fld}" data-col="${x.id}" value="${esc(val)}" ${extra}></div>`;
    let h = `<div class="colcard"><div class="grid3">
      <div><label for="${x.id}-name">Column name</label><input id="${x.id}-name" type="text" data-colf="name" data-col="${x.id}" value="${esc(x.name)}"></div>
      <div><label for="${x.id}-type">Type</label><select id="${x.id}-type" data-colf="type" data-col="${x.id}" ${dis}>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === x.type ? "selected" : ""}>${v.label}</option>`).join("")}</select></div>
      <div><label class="check"><input type="checkbox" data-colf="baseline" data-col="${x.id}" ${x.baseline ? "checked" : ""} ${x.type === "objectives" || x.type === "comment" || L ? "disabled" : ""}> Baseline column</label><p class="note">Recorded once, at the start of the year.</p></div></div>
      <p class="note">${TYPES[x.type].help}</p><div class="grid3">`;
    if (x.type === "score" || x.type === "rubric") h += f("max", "Maximum mark", x.max, dis) + f("below", "Below if under", x.below) + f("above", "Above from", x.above);
    if (x.type === "standardised") h += f("below", "Below if under", x.below) + f("above", "Above from", x.above);
    if (x.type === "readingAge") h += f("below", "Below if under (years)", x.below) + f("above", "Above if over (years)", x.above);
    if (x.type === "objectives") h += f("belowPct", "Below if secure is under (%)", x.belowPct) + f("abovePct", "Above if exceeding is at least (%)", x.abovePct);
    h += `</div>`;
    if (x.type === "list") h += `<label for="${x.id}-opt">Options, lowest first, one per line</label><textarea id="${x.id}-opt" data-colf="options" data-col="${x.id}" ${dis}>${esc(x.options.join("\n"))}</textarea>
      <div class="grid3"><div><label for="${x.id}-lb">First option in line</label><select id="${x.id}-lb" data-colf="below" data-col="${x.id}">${x.options.map((o, i) => `<option value="${i}" ${i === x.below ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
      <div><label for="${x.id}-la">First option above</label><select id="${x.id}-la" data-colf="above" data-col="${x.id}">${x.options.map((o, i) => `<option value="${i}" ${i === x.above ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div></div>`;
    if (x.type === "objectives") {
      const g = C.grades.find(z => z.id === ui.grade) || C.grades[0];
      if (!g) h += `<p class="note">Add grades first (step 2).</p>`;
      else {
        const per = x.objectives[g.id] || [];
        h += `<label for="${x.id}-g">Objectives for grade</label><select id="${x.id}-g" data-grade-pick="1">${C.grades.map(z => `<option value="${z.id}" ${z.id === g.id ? "selected" : ""}>${esc(z.name)} (${(x.objectives[z.id] || []).flat().length})</option>`).join("")}</select>
          <p class="note">One objective per line. Add the next step after a | sign if you like, for example: Compare and order numbers up to 1000 | Order 3-digit numbers on a number line. You can paste straight from Excel or Atlas.</p>`;
        C.terms.forEach((t, i) => h += `<label for="${x.id}-o${i}">${esc(g.name)}, ${esc(t)}</label><textarea id="${x.id}-o${i}" data-colobj="${i}" data-grade="${g.id}" data-col="${x.id}">${esc((per[i] || []).map(o => o.text + (o.step ? " | " + o.step : "")).join("\n"))}</textarea>`);
      }
    }
    h += `<div class="row" style="justify-content:space-between;margin-top:8px">${L ? `<span class="note" style="color:var(--amber);font-weight:700">Locked: teachers have recorded data in this column. You can still rename it${x.type === "list" ? "" : " and change its thresholds"}.</span>` : "<span></span>"}<button class="btn ghost small" data-act="del-col" data-id="${x.id}" ${dis}>Remove column</button></div></div>`;
    return h;
  }

  let OBJ = null;
  async function loadXLSX() { if (window.XLSX) return; await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; sc.onload = res; sc.onerror = () => rej(new Error("Couldn’t load the Excel reader. Check your internet connection.")); document.head.appendChild(sc); }); }
  const nz = v => String(v ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
  const objCols = () => { const o = []; C.subjects.forEach(sb => sb.strands.forEach(st => st.cols.filter(c => c.type === "objectives").forEach(c => o.push({ sb, st, c })))); return o; };
  function countObj(gid) { let n = 0; objCols().forEach(({ c }) => ((c.objectives || {})[gid] || []).forEach(l => n += l.length)); return n; }
  function objectivesStep() {
    const oc = objCols(), g = C.grades;
    let h = `<div class="card"><h2>Curriculum objectives</h2><p class="note">The objectives teachers assess, for each grade, subject, strand and term. Choose whichever way is easiest:</p>
      <div class="grid3" style="margin-top:10px"><div class="colcard" style="margin:0"><h3 style="margin-top:0">1. Upload a file</h3><p class="note">Excel or CSV with the columns Grade, Subject, Strand, Term, Objective and Next step. One file can hold every grade.</p>
        <div class="row"><label class="btn small" style="margin:0;cursor:pointer">Upload objectives<input type="file" id="objFile" accept=".xlsx,.xls,.csv" hidden></label><button class="btn ghost small" data-act="obj-template">Download the template</button></div></div>
        <div class="colcard" style="margin:0"><h3 style="margin-top:0">2. Paste them</h3><p class="note">Copy from Excel, Word or Atlas and paste into the boxes in step 5, one grade and term at a time.</p><button class="btn ghost small" data-step="4">Go to data columns</button></div>
        <div class="colcard" style="margin:0"><h3 style="margin-top:0">3. Copy from another grade</h3><p class="note">Start from a similar grade’s objectives, then edit them.</p>
          <div class="row"><select id="cpFrom" aria-label="Copy from" style="width:auto">${g.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select><span class="note">to</span><select id="cpTo" aria-label="Copy to" style="width:auto">${g.map((x, i) => `<option value="${x.id}" ${i === 1 ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select><button class="btn ghost small" data-act="obj-copy">Copy</button></div></div></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost small" data-act="obj-export">Download all current objectives (Excel)</button><span class="note">Edit the file and upload it again to make changes in bulk.</span></div><div id="objMsg"></div></div>`;
    if (OBJ) h += objPreview();
    h += `<div class="card"><h2>What’s in place</h2><div class="tablewrap"><table><tr><th>Grade</th>${oc.map(x => `<th>${esc(x.sb.name === x.st.name ? x.sb.name : x.sb.name + ": " + x.st.name)}</th>`).join("")}<th>Total</th></tr>
      ${g.map(x => `<tr><td><b>${esc(x.name)}</b></td>${oc.map(({ c }) => { const per = (c.objectives || {})[x.id] || []; const n = per.reduce((a, l) => a + l.length, 0); return `<td>${n ? per.map(l => l.length).join(" / ") : `<span class="note">–</span>`}</td>`; }).join("")}<td><b>${countObj(x.id)}</b></td></tr>`).join("")}</table></div>
      <p class="note">Numbers show objectives per term (${C.terms.map(esc).join(" / ")}).</p></div>`;
    return h;
  }
  function objPreview() {
    const p = OBJ, ok = p.rows.filter(r => !r.problem), bad = p.rows.filter(r => r.problem);
    const groups = {}; ok.forEach(r => { const k = `${r.grade.name} › ${r.col.sb.name}${r.col.sb.name !== r.col.st.name ? ": " + r.col.st.name : ""} › ${C.terms[r.term]}`; groups[k] = (groups[k] || 0) + 1; });
    return `<div class="card"><h2>Check before importing</h2><p class="note">From <b>${esc(p.file)}</b>: ${ok.length} objective${ok.length === 1 ? "" : "s"} ready${bad.length ? `, ${bad.length} row${bad.length === 1 ? "" : "s"} skipped` : ""}.</p>
      <div class="tablewrap"><table><tr><th>Grade, subject and term</th><th>Objectives</th></tr>${Object.entries(groups).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join("")}</table></div>
      ${bad.length ? `<details style="margin-top:10px"><summary class="note"><b>Rows that will be skipped</b></summary><div class="tablewrap"><table><tr><th>Row</th><th>Objective</th><th>Problem</th></tr>${bad.slice(0, 40).map(r => `<tr><td>${r.row}</td><td>${esc(r.text)}</td><td>${esc(r.problem)}</td></tr>`).join("")}</table></div></details>` : ""}
      <label class="note" style="display:block;margin-top:12px"><b>How should these be added?</b></label>
      <label class="check" style="margin:6px 0"><input type="radio" name="objMode" value="replace" checked> Replace the objectives for the grades, strands and terms in this file</label>
      <label class="check" style="margin:6px 0"><input type="radio" name="objMode" value="add"> Add them to the objectives already there</label>
      <p class="note">Objectives with the same wording keep any data teachers have already recorded.</p>
      <div class="row"><button class="btn" data-act="obj-import" ${ok.length ? "" : "disabled"}>Import ${ok.length} objective${ok.length === 1 ? "" : "s"}</button><button class="btn ghost" data-act="obj-cancel">Cancel</button></div></div>`;
  }
  async function readObjFile(f) {
    await loadXLSX(); const wb = XLSX.read(await f.arrayBuffer()), ws = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
    const hi = rows.findIndex(r => r.some(c => /objective|statement|standard/i.test(String(c)))); if (hi < 0) throw new Error("I couldn’t find an “Objective” column. Use the template, or add a heading row with Grade, Subject, Strand, Term, Objective, Next step.");
    const head = rows[hi].map(x => String(x).trim().toLowerCase()), f1 = re => head.findIndex(h => re.test(h));
    const gI = f1(/grade|year/), sI = f1(/subject/), stI = f1(/strand|area|domain/), tI = f1(/term|semester|unit/), oI = f1(/objective|statement|standard/), nI = f1(/next ?step/);
    const oc = objCols(), out = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const text = String(r[oI] ?? "").trim(); if (!text) return;
      const row = { row: hi + i + 2, text, step: nI >= 0 ? String(r[nI] ?? "").trim() : "" };
      const gv = nz(r[gI]); row.grade = C.grades.find(g => nz(g.name) === gv) || (/^\d+$/.test(gv) ? C.grades.find(g => nz(g.name) === "grade" + gv) : null);
      const sv = nz(r[sI]), stv = nz(r[stI]);
      let cands = oc.filter(x => !sv || nz(x.sb.name) === sv); if (stv) cands = cands.filter(x => nz(x.st.name) === stv); else if (sv && cands.length > 1) cands = cands.filter(x => nz(x.st.name) === sv);
      row.col = cands[0] || null;
      const tv = String(r[tI] ?? "").trim(); let ti = C.terms.findIndex(t => nz(t) === nz(tv)); if (ti < 0 && /\d/.test(tv)) ti = +tv.match(/\d+/)[0] - 1; row.term = ti;
      if (!row.grade) row.problem = gI < 0 ? "No Grade column" : `Grade “${r[gI]}” isn’t in your setup`;
      else if (!row.col) row.problem = `No objectives column for “${[r[sI], r[stI]].filter(Boolean).join(" › ") || "this subject"}”`;
      else if (!(ti >= 0 && ti < C.terms.length)) row.problem = `Term “${tv}” isn’t in your setup`;
      out.push(row);
    });
    OBJ = { file: f.name, rows: out };
  }
  function applyObj(mode) {
    const ok = OBJ.rows.filter(r => !r.problem), keys = new Set(ok.map(r => `${r.col.c.id}|${r.grade.id}|${r.term}`));
    keys.forEach(k => { const [cid, gid, ti] = k.split("|"), c = objCols().find(x => x.c.id === cid).c, per = c.objectives[gid] = c.objectives[gid] || []; while (per.length < C.terms.length) per.push([]);
      const old = per[+ti] || [], incoming = ok.filter(r => `${r.col.c.id}|${r.grade.id}|${r.term}` === k), taken = new Set();
      const mapped = incoming.map(r => { const m = old.find(o => !taken.has(o.id) && o.text.toLowerCase() === r.text.toLowerCase()); if (m) taken.add(m.id); return { id: m ? m.id : uid("o"), text: r.text, step: r.step || (m ? m.step : "") }; });
      per[+ti] = mode === "add" ? old.concat(mapped.filter(x => !old.some(o => o.id === x.id))) : mapped; });
  }
  function objRowsForExport() {
    const out = [["Grade", "Subject", "Strand", "Term", "Objective", "Next step"]];
    C.grades.forEach(g => objCols().forEach(({ sb, st, c }) => ((c.objectives || {})[g.id] || []).forEach((l, ti) => l.forEach(o => out.push([g.name, sb.name, st.name, C.terms[ti] || "", o.text, o.step || ""])))));
    return out;
  }

  function render() {
    const el = ctx.el, v = validate();
    let h = `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Set up ${esc(ctx.school.name)}</h2>
      <span class="note" id="setupSave">${esc(saveState || (row ? "All changes saved" : ""))}</span></div>
      <p class="note" style="margin:6px 0 0">Changes save automatically. ${row?.status === "live" ? `<span class="badge b-approved">Ready for teachers</span>` : `<span class="badge b-pending">Draft</span>`}</p></div>
      <ol class="wsteps">${STEPS.map((s, i) => `<li><button data-step="${i}" ${i === ui.step ? 'aria-current="step"' : ""}><span class="n">${i + 1}</span>${s}${i === 8 && v.block.length ? ` (${v.block.length})` : ""}</button></li>`).join("")}</ol>`;
    if (ui.step === 0) h += `<div class="card"><h2>School year and terms</h2>
      <label for="s-year">School year</label><input id="s-year" type="text" data-cfg="year" value="${esc(C.year)}">
      <label for="s-terms">Terms or checkpoints, one per line, in order</label><textarea id="s-terms" data-cfg="terms">${esc(C.terms.join("\n"))}</textarea>
      <p class="note">For example Term 1, Term 2, Term 3, or Semester 1, Semester 2.</p></div>`;
    if (ui.step === 1) h += `<div class="card"><h2>Grades</h2><p class="note">The grades or year groups in your school, youngest first. Curriculum objectives are added for each grade.</p>
      ${C.grades.map(g => `<div class="row" style="margin:6px 0"><input type="text" aria-label="Grade name" data-gname="${g.id}" value="${esc(g.name)}" style="flex:1"><button class="btn ghost small" data-act="del-grade" data-id="${g.id}" ${GRADES_USED.has(g.id) ? 'disabled title="Classes use this grade"' : ""}>Remove</button></div>`).join("")}
      <p><button class="btn ghost small" data-act="add-grade">Add grade</button></p></div>`;
    if (ui.step === 2) h += `<div class="card"><h2>Grading system</h2><p class="note">Write your own grading system, lowest level first. Each level starts at a percentage, and you choose what each level means against curriculum standards.</p>
      <div class="row" style="margin:10px 0"><span class="note"><b>Start from</b></span><button class="btn ghost small" data-act="grade-ajman">1 to 7 (45% to 100%)</button><button class="btn ghost small" data-act="grade-four">Emerging to Exceeding</button></div>
      <div class="tablewrap"><table><tr><th>Level name</th><th>Starts at (%)</th><th>Range</th><th>Counts as</th><th></th></tr>
      ${C.scale.map((x, i) => `<tr><td><input type="text" aria-label="Level name" data-lv="label" data-i="${i}" value="${esc(x)}" style="width:140px"></td>
        <td><input type="number" aria-label="Starts at percent" data-lv="min" data-i="${i}" min="0" max="100" step="0.1" value="${C.gradeMin[i]}" style="width:90px"></td>
        <td class="note">${gradeRange(i)}</td>
        <td><select aria-label="Counts as" data-lv="pos" data-i="${i}">${Object.entries(POS).map(([k, l]) => `<option value="${k}" ${C.gradePos[i] === k ? "selected" : ""}>${l}</option>`).join("")}</select></td>
        <td><button class="btn ghost small" data-act="lv-del" data-i="${i}" ${C.scale.length <= 2 ? "disabled" : ""}>Remove</button></td></tr>`).join("")}</table></div>
      <p><button class="btn ghost small" data-act="lv-add">Add level</button></p>
      <p class="note">Results below the first level’s starting percentage are given the first level.</p>
      <label for="s-steps">Expected progress across the year (number of levels)</label><input id="s-steps" type="number" min="0" data-cfg="steps" value="${C.steps}" style="width:100px"></div>
      <div class="card"><h2>Attainment and progress wording</h2><p class="note">How TwigNest describes attainment and progress on every page and in reports. These follow the UAE school inspection framework wording by default. Change them only if your school uses different terms.</p>
      <div class="grid3">${["below", "inline", "above"].map(k => `<div><label for="la-${k}">Attainment: ${k === "inline" ? "in line" : k}</label><input type="text" id="la-${k}" data-lab="att|${k}" value="${esc(((C.labels || {}).att || {})[k] || DEF_LAB.att[k])}"></div>`).join("")}</div>
      <div class="grid3">${["below", "inline", "above"].map(k => `<div><label for="lp-${k}">Progress: ${k === "inline" ? "expected" : k === "above" ? "better than expected" : "below expected"}</label><input type="text" id="lp-${k}" data-lab="prog|${k}" value="${esc(((C.labels || {}).prog || {})[k] || DEF_LAB.prog[k])}"></div>`).join("")}</div>
      <p><button class="btn ghost small" data-act="lab-reset">Use the UAE inspection framework wording</button></p></div>
      <div class="card"><h2>Objective criteria</h2><p class="note">The marks teachers give each curriculum objective. Name them the way your school does, and choose how each one counts when TwigNest works out levels and gaps. Anything that isn’t fully secure becomes a gap with a next step.</p>
      <div class="row" style="margin:10px 0"><span class="note"><b>Start from</b></span><button class="btn ghost small" data-act="os-three">Secure, Not yet secure, Exceeding</button><button class="btn ghost small" data-act="os-four">Emerging, Developing, Secure, Mastery</button></div>
      <div class="tablewrap"><table><tr><th>Mark</th><th>Short label</th><th>Counts as</th><th></th></tr>
      ${os().map((x, i) => `<tr><td><input type="text" aria-label="Mark name" data-os="label" data-i="${i}" value="${esc(x.label)}" style="width:170px"></td>
        <td><input type="text" aria-label="Short label" data-os="short" data-i="${i}" maxlength="3" value="${esc(x.short)}" style="width:70px;text-align:center"></td>
        <td><select aria-label="Counts as" data-os="kind" data-i="${i}">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${x.kind === k ? "selected" : ""}>${l}</option>`).join("")}</select></td>
        <td><button class="btn ghost small" data-act="os-del" data-i="${i}" ${os().length <= 2 ? "disabled" : ""}>Remove</button></td></tr>`).join("")}</table></div>
      <p><button class="btn ghost small" data-act="os-add">Add mark</button></p>
      <p class="note">The short label (up to 3 characters) appears in the circles on the class sheet. “Mark all” uses the first mark that counts as Secure.</p></div>`;
    if (ui.step === 3) {
      h += `<div class="card"><h2>Subjects and strands</h2><p class="note">Split a subject into strands to track them separately, such as English into reading, writing, spelling, and speaking and listening. A subject with no split needs one strand with the same name.</p>`;
      C.subjects.forEach(sb => {
        h += `<div class="colcard"><div class="row"><input type="text" dir="auto" aria-label="Subject name" data-sub="${sb.id}" value="${esc(sb.name)}" style="flex:1;font-weight:700"><select aria-label="Report language" data-sublang="${sb.id}" style="width:auto"><option value="en" ${sb.lang !== "ar" ? "selected" : ""}>Reports in English</option><option value="ar" ${sb.lang === "ar" ? "selected" : ""}>Reports in Arabic (right to left)</option></select><button class="btn ghost small" data-act="del-sub" data-id="${sb.id}" ${sb.strands.some(strandLocked) ? 'disabled title="Data has been recorded"' : ""}>Remove subject</button></div>`;
        sb.strands.forEach(st => h += `<div class="row" style="margin:6px 0 0 18px"><input type="text" dir="auto" aria-label="Strand name" data-strand="${st.id}" value="${esc(st.name)}" style="flex:1"><span class="note">${st.cols.length} columns</span><button class="btn ghost small" data-act="del-str" data-id="${st.id}" ${strandLocked(st) ? 'disabled title="Data has been recorded"' : ""}>Remove</button></div>`);
        h += `<p style="margin:8px 0 0 18px"><button class="btn ghost small" data-act="add-str" data-id="${sb.id}">Add strand</button></p></div>`;
      });
      h += `<button class="btn ghost" data-act="add-sub">Add subject</button></div>`;
    }
    if (ui.step === 4) {
      const ss = all(); if (!ss.find(p => p[1].id === ui.strand)) ui.strand = ss[0]?.[1].id || null;
      if (!ui.strand) h += `<div class="card"><p>Add a subject and strand first.</p><button class="btn ghost" data-step="3">Go to subjects and strands</button></div>`;
      else {
        const [sb, st] = findStrand(ui.strand);
        h += `<div class="card"><h2>Data columns</h2><p class="note">Choose what teachers record for each strand. Every strand needs one baseline column and at least one column recorded each term.</p>
          <label for="s-strand">Strand</label><select id="s-strand" data-pick-strand="1">${ss.map(([a, b]) => `<option value="${b.id}" ${b.id === ui.strand ? "selected" : ""}>${esc(a.name)} › ${esc(b.name)}</option>`).join("")}</select>
          ${st.cols.map(colForm).join("") || `<p class="note">No columns yet.</p>`}
          <div class="row" style="margin-top:12px"><select id="newType" aria-label="Column type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select><button class="btn" data-act="add-col">Add column</button></div></div>`;
      }
    }
    if (ui.step === 5) h += objectivesStep();
    if (ui.step === 6) h += `<div class="card"><h2>Student groups</h2><p class="note">One per line. These become filters and appear in the school view, such as SEN, G&amp;T, EAL or Emirati.</p><textarea data-cfg="groups">${esc(C.groups.join("\n"))}</textarea></div>`;
    if (ui.step === 7) h += `<div class="card"><h2>Report comments</h2>
      <label for="s-limit">Character limit for each comment</label><input id="s-limit" type="number" min="100" data-cfg="limit" value="${C.reports.limit}" style="width:120px">
      <p class="note">Write a Low, Middle and High comment for every level. Use {name} for the student’s first name and {strand} for the subject or strand. TwigNest adds a strength and a next step from each student’s data.</p>
      <div class="tablewrap"><table><tr><th>Level</th>${BANDS.map(b => `<th>${b}</th>`).join("")}</tr>
      ${C.scale.map((lv, i) => `<tr><td><b>${esc(lv)}</b></td>${BANDS.map((b, j) => `<td style="min-width:230px"><textarea aria-label="Level ${esc(lv)}, ${b}" data-bank="${i}|${j}" style="min-height:100px;font-size:14px">${esc((C.reports.bank[i] || [])[j] || "")}</textarea></td>`).join("")}</tr>`).join("")}</table></div></div>
      ${C.subjects.some(x => x.lang === "ar") ? `<div class="card"><h2>Arabic comment bank</h2><p class="note">Used for subjects reported in Arabic (${C.subjects.filter(x => x.lang === "ar").map(x => esc(x.name)).join(", ")}). Written without tashkeel and worded to suit both boys and girls. Use {name} for the student’s Arabic name and {strand} for the subject or strand. Ask your Arabic team to check and adjust the wording.</p>
        <p><button class="btn ghost small" data-act="bank-ar-reset">Use the TwigNest Arabic bank</button></p>
        <div class="tablewrap"><table><tr><th>Level</th>${BANDS.map(b => `<th>${b}</th>`).join("")}</tr>
        ${C.scale.map((lv, i) => `<tr><td><b>${esc(lv)}</b></td>${BANDS.map((b, j) => `<td style="min-width:230px"><textarea dir="rtl" lang="ar" aria-label="Arabic, level ${esc(lv)}, ${b}" data-bankar="${i}|${j}" style="min-height:100px;font-size:15px">${esc(((C.reports.bankAr || BANK_AR)[i] || [])[j] || "")}</textarea></td>`).join("")}</tr>`).join("")}</table></div></div>` : ""}`;
    if (ui.step === 8) h += `<div class="card"><h2>Check and finish</h2>
      ${v.block.length ? `<h3>To fix before teachers can use it</h3>` + v.block.map(([t, s, sid]) => `<div class="issue">${esc(t)} <button class="btn ghost small" data-step="${s}" ${sid ? `data-fix="${sid}"` : ""}>Fix</button></div>`).join("") : `<p class="ok">Everything needed is set up.</p>`}
      ${v.warn.length ? `<h3>Still to add</h3><p class="note">These don’t stop you finishing, and you can add them any time.</p>` + v.warn.map(([t, s, sid]) => `<div class="issue">${esc(t)} <button class="btn ghost small" data-step="${s}" ${sid ? `data-fix="${sid}"` : ""}>Add</button></div>`).join("") : ""}
      <div class="row" style="margin-top:14px"><button class="btn" data-act="go-live" ${v.block.length ? "disabled" : ""}>${row?.status === "live" ? "Ready for teachers ✓" : "Mark as ready for teachers"}</button></div></div>`;
    h += `<div class="row" style="margin-top:4px"><button class="btn ghost" data-step="${Math.max(0, ui.step - 1)}" ${ui.step === 0 ? "disabled" : ""}>Back</button><button class="btn" data-step="${Math.min(8, ui.step + 1)}" ${ui.step === 8 ? "disabled" : ""}>Next</button></div>`;
    el.innerHTML = h;
  }

  function chooseTemplate() {
    ctx.el.innerHTML = `<div class="card"><h2>Set up ${esc(ctx.school.name)}</h2><p class="note">Start from a template and change anything that doesn’t fit your school. You can always edit it later.</p>
      <div class="grid2" style="margin-top:12px">
        <div class="colcard"><h3 style="margin-top:0">British curriculum in the UAE</h3><p class="note">Pre-K to Grade 5, three terms, the 1 to 7 grading system, English, Maths and Science with strands and columns ready. You add your curriculum objectives.</p><button class="btn" data-tpl="british">Use this template</button></div>
        <div class="colcard"><h3 style="margin-top:0">Start blank</h3><p class="note">Build everything yourself, step by step.</p><button class="btn ghost" data-tpl="blank">Start blank</button></div>
      </div></div>`;
  }

  function onClick(e) {
    const t = e.target.closest("button"); if (!t || !ctx.el.contains(t)) return;
    if (t.dataset.tpl) { C = template(t.dataset.tpl); C.year = defaultYear(); save(true).then(render); return; }
    if (t.dataset.fix) ui.strand = t.dataset.fix;
    if (t.dataset.step !== undefined) { ui.step = +t.dataset.step; save(true); render(); window.scrollTo(0, 0); return; }
    const a = t.dataset.act, id = t.dataset.id; if (!a) return;
    if (a === "add-grade") C.grades.push({ id: uid("g"), name: "New grade" });
    if (a === "del-grade" && confirm("Remove this grade and its objectives?")) { C.grades = C.grades.filter(g => g.id !== id); all().forEach(([sb, st]) => st.cols.forEach(c => { if (c.objectives) delete c.objectives[id]; })); }
    if (a === "grade-ajman" || a === "grade-four") { Object.assign(C, JSON.parse(JSON.stringify(a === "grade-ajman" ? AJMAN : FOUR))); const b = C.reports.bank; if (a === "grade-ajman") C.reports.bank = BANK.map(r => r.slice()); else { while (b.length < C.scale.length) b.push(["", "", ""]); b.length = C.scale.length; } }
    if (a === "os-three" || a === "os-four") { if (USED.anyStatus && !confirm("Teachers have already marked objectives. Marks you remove will no longer be shown. Continue?")) return; C.objScale = JSON.parse(JSON.stringify(a === "os-three" ? DEF_OS : FOUR_OS)); }
    if (a === "obj-template" || a === "obj-export") { loadXLSX().then(() => { let rows = objRowsForExport(); if (a === "obj-template" || rows.length === 1) { const oc = objCols()[0], g = C.grades[0];
        rows = [rows[0], [g ? g.name : "Grade 2", oc ? oc.sb.name : "English", oc ? oc.st.name : "Reading", C.terms[0] || "Term 1", "Read Year 3 exception words accurately", "Practise exception words with flashcards in class and at home."]]; }
        const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 60 }, { wch: 60 }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Objectives");
        XLSX.writeFile(wb, a === "obj-template" ? "TwigNest objectives template.xlsx" : "TwigNest objectives.xlsx"); }).catch(err => alert(err.message)); return; }
    if (a === "obj-cancel") { OBJ = null; return render(); }
    if (a === "obj-import") { const mode = (document.querySelector('input[name="objMode"]:checked') || {}).value || "replace"; applyObj(mode); OBJ = null; save(true); render(); document.getElementById("objMsg") && (document.getElementById("objMsg").innerHTML = `<div class="msg ok">Objectives imported.</div>`); return; }
    if (a === "obj-copy") { const from = document.getElementById("cpFrom").value, to = document.getElementById("cpTo").value; if (from === to) return alert("Choose two different grades.");
      if (countObj(to) && !confirm("The grade you’re copying to already has objectives. Replace them with a copy?")) return;
      objCols().forEach(({ c }) => { c.objectives[to] = ((c.objectives || {})[from] || []).map(l => l.map(o => ({ id: uid("o"), text: o.text, step: o.step }))); }); save(true); render(); return; }
    if (a === "bank-ar-reset") C.reports.bankAr = BANK_AR.map(r => r.slice());
    if (a === "lab-reset") C.labels = JSON.parse(JSON.stringify(DEF_LAB));
    if (a === "os-add") os().push({ code: uid("k"), label: "New mark", short: "?", kind: "secure" });
    if (a === "os-del") { if (!confirm("Remove this mark? Objectives already given this mark will show as not assessed.")) return; os().splice(+t.dataset.i, 1); }
    if (a === "lv-add") { C.scale.push("New level"); C.gradeMin.push(Math.min(100, (C.gradeMin[C.gradeMin.length - 1] || 0) + 5)); C.gradePos.push("above"); C.reports.bank.push(["", "", ""]); }
    if (a === "lv-del") { const i = +t.dataset.i; [C.scale, C.gradeMin, C.gradePos, C.reports.bank].forEach(arr => arr.splice(i, 1)); }
    if (a === "add-sub") C.subjects.push({ id: uid("sb"), name: "New subject", strands: [{ id: uid("st"), name: "New subject", cols: [] }] });
    if (a === "del-sub" && confirm("Remove this subject and all its strands and columns?")) C.subjects = C.subjects.filter(s => s.id !== id);
    if (a === "add-str") C.subjects.find(s => s.id === id).strands.push({ id: uid("st"), name: "New strand", cols: [] });
    if (a === "del-str" && confirm("Remove this strand and its columns?")) C.subjects.forEach(s => s.strands = s.strands.filter(x => x.id !== id));
    if (a === "add-col") { const ty = document.getElementById("newType").value; findStrand(ui.strand)[1].cols.push(col(TYPES[ty].label, ty)); }
    if (a === "del-col" && confirm("Remove this column?")) all().forEach(([sb, st]) => st.cols = st.cols.filter(x => x.id !== id));
    if (a === "go-live") { ctx.sb.from("school_setups").update({ status: "live" }).eq("id", row.id).select().single().then(({ data, error }) => { if (error) alert(error.message); else { row = data; render(); } }); return; }
    save(); render();
  }
  function onChange(e) {
    const t = e.target; if (!ctx.el.contains(t)) return;
    let structural = false;
    if (t.id === "objFile") { const f = t.files[0]; if (!f) return; readObjFile(f).then(render).catch(err => { const m = document.getElementById("objMsg"); if (m) m.innerHTML = `<div class="msg err">${esc(err.message || err)}</div>`; }); t.value = ""; return; }
    if (t.dataset.pickStrand) { ui.strand = t.value; render(); return; }
    if (t.dataset.gradePick) { ui.grade = t.value; render(); return; }
    if (t.dataset.cfg) {
      const f = t.dataset.cfg;
      if (f === "year") C.year = t.value.trim() || C.year;
      if (f === "terms") { C.terms = lines(t.value); structural = true; }
      if (f === "groups") C.groups = lines(t.value);
      if (f === "steps") C.steps = Math.max(0, +t.value || 0);
      if (f === "limit") C.reports.limit = Math.max(100, +t.value || 600);
    }
    if (t.dataset.sublang) { const sb = C.subjects.find(x => x.id === t.dataset.sublang); sb.lang = t.value; if (t.value === "ar" && !C.reports.bankAr) C.reports.bankAr = BANK_AR.map(r => r.slice()); }
    if (t.dataset.bankar) { const [i, j] = t.dataset.bankar.split("|").map(Number); C.reports.bankAr = C.reports.bankAr || BANK_AR.map(r => r.slice()); while (C.reports.bankAr.length <= i) C.reports.bankAr.push(["", "", ""]); C.reports.bankAr[i][j] = t.value.trim(); }
    if (t.dataset.lab) { const [g, k] = t.dataset.lab.split("|"); C.labels = C.labels || JSON.parse(JSON.stringify(DEF_LAB)); C.labels[g][k] = t.value.trim() || DEF_LAB[g][k]; }
    if (t.dataset.os) { const x = os()[+t.dataset.i]; x[t.dataset.os] = t.value.trim(); if (t.dataset.os === "kind") structural = true; }
    if (t.dataset.gname) C.grades.find(g => g.id === t.dataset.gname).name = t.value.trim();
    if (t.dataset.lv) { const i = +t.dataset.i, f = t.dataset.lv; if (f === "label") C.scale[i] = t.value.trim(); if (f === "min") C.gradeMin[i] = parseFloat(t.value); if (f === "pos") C.gradePos[i] = t.value; structural = true; }
    if (t.dataset.sub) C.subjects.find(s => s.id === t.dataset.sub).name = t.value;
    if (t.dataset.strand) findStrand(t.dataset.strand)[1].name = t.value;
    if (t.dataset.bank) { const [i, j] = t.dataset.bank.split("|").map(Number); while (C.reports.bank.length <= i) C.reports.bank.push(["", "", ""]); C.reports.bank[i][j] = t.value.trim(); }
    if (t.dataset.colf) {
      const x = findCol(t.dataset.col), f = t.dataset.colf;
      if (f === "name") x.name = t.value;
      else if (f === "baseline") x.baseline = t.checked;
      else if (f === "type") { const keep = { id: x.id, name: x.name, type: t.value, baseline: ["objectives", "comment"].includes(t.value) ? false : x.baseline }; Object.keys(x).forEach(k => delete x[k]); Object.assign(x, keep, defaults(t.value)); structural = true; }
      else if (f === "options") { x.options = lines(t.value); x.below = Math.min(x.below, Math.max(0, x.options.length - 1)); x.above = Math.min(x.above, Math.max(0, x.options.length - 1)); structural = true; }
      else x[f] = +t.value;
    }
    if (t.dataset.colobj !== undefined) {
      const x = findCol(t.dataset.col), i = +t.dataset.colobj, g = t.dataset.grade;
      const per = x.objectives[g] = x.objectives[g] || []; while (per.length < C.terms.length) per.push([]);
      const old = per[i] || [];
      const parsed = lines(t.value).map(l => { const [a, ...b] = l.split("|"); return { text: a.trim(), step: b.join("|").trim() }; });
      const taken = new Set(), newTexts = new Set(parsed.map(p => p.text.toLowerCase()));
      parsed.forEach(p => { const m = old.find(o => !taken.has(o.id) && o.text.toLowerCase() === p.text.toLowerCase()); if (m) { p.id = m.id; taken.add(m.id); } });
      parsed.forEach((p, j) => { if (p.id) return; const o = old[j]; if (o && !taken.has(o.id) && !newTexts.has(o.text.toLowerCase())) { p.id = o.id; taken.add(o.id); } else p.id = uid("o"); });
      const lost = old.filter(o => !taken.has(o.id) && USED.obj.has(o.id));
      if (lost.length && !confirm(`Teachers have recorded data for ${lost.length === 1 ? "this objective" : "these objectives"}:\n\n${lost.map(o => "• " + o.text).join("\n")}\n\nIf you remove ${lost.length === 1 ? "it" : "them"}, the data is kept but no longer shown. Remove anyway?`)) { render(); return; }
      per[i] = parsed;
    }
    save();
    if (structural) render();
  }
  function defaultYear() { const d = new Date(), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}–${y + 1}`; }

  window.TNSetup = {
    async open(context) {
      ctx = context;
      ctx.el.innerHTML = `<div class="card"><p class="note">Loading setup…</p></div>`;
      const { data, error } = await ctx.sb.from("school_setups").select("*").eq("school_id", ctx.school.id).order("updated_at", { ascending: false }).limit(1);
      if (error) { ctx.el.innerHTML = `<div class="card"><div class="msg err">${esc(error.message)}</div></div>`; return; }
      row = data[0] || null; saveState = "";
      USED = { col: new Set(), obj: new Set(), strand: new Set() }; GRADES_USED = new Set();
      const u = await ctx.sb.rpc("used_ids"); if (!u.error) (u.data || []).forEach(r => USED[r.kind] && USED[r.kind].add(r.id)); USED.anyStatus = USED.obj.size > 0;
      const g = await ctx.sb.from("classes").select("grade_id").eq("school_id", ctx.school.id); if (!g.error) g.data.forEach(r => GRADES_USED.add(r.grade_id));
      if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      if (!row) return chooseTemplate();
      C = row.config; if (!C.year) C.year = row.year; render();
    }
  };
})();
