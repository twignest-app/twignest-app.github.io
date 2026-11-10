/* TwigNest classes and students */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lines = v => v.split("\n").map(x => x.trim()).filter(Boolean);
  let ctx, setup, classes = [], teachers = [], links = [], students = [], openClass = null, bound = false, preview = null;
  const norm = v => String(v ?? "").toLowerCase().replace(/[\s\-_.]/g, "");
  async function loadXLSX() {
    if (window.XLSX) return;
    await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = res; sc.onerror = () => rej(new Error("Couldn’t load the Excel reader. Check your internet connection and try again.")); document.head.appendChild(sc); });
  }
  function matchGrade(v) {
    const grades = setup.config.grades || [], n = norm(v); if (!n) return null;
    let g = grades.find(x => norm(x.name) === n); if (g) return g;
    if (/^\d+$/.test(n)) g = grades.find(x => norm(x.name) === "grade" + n || norm(x.name) === "year" + n); if (g) return g;
    return grades.find(x => norm(x.name).endsWith(n) && n.length >= 2) || null;
  }
  async function readFile(file) {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer()), ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const hi = rows.findIndex(r => r.some(c => /name/i.test(String(c))));
    if (hi < 0) throw new Error("I couldn’t find a heading row with a “Name” column. Use the template, or add a heading row: Name, Class, Grade, Groups.");
    const head = rows[hi].map(h => String(h).trim().toLowerCase()), find = re => head.findIndex(h => re.test(h));
    let nameI = find(/^(full ?name|student ?name|name)$/), firstI = find(/^first ?name$/), lastI = find(/^(last ?name|surname|family ?name)$/);
    if (nameI < 0 && firstI < 0) nameI = find(/name/);
    const idI = find(/^(student ?id|student ?no\.?|student ?number|school ?(id|number|no\.?)|id|number|emis|esis|sims ?id|admission ?(no\.?|number))$/), classI = find(/^(class|section|homeroom|class ?name)$/), gradeI = find(/^(grade|year ?group|year|grade ?level)$/), groupsI = find(/^(groups?|tags?)$/);
    const setupGroups = setup.config.groups || [], flagCols = setupGroups.map(g => [g, head.findIndex(h => norm(h) === norm(g))]).filter(x => x[1] >= 0);
    if (classI < 0) throw new Error("I couldn’t find a “Class” column. Add a column called Class with names like 2A.");
    const out = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const name = (nameI >= 0 ? String(r[nameI]) : [r[firstI], lastI >= 0 ? r[lastI] : ""].join(" ")).replace(/\s+/g, " ").trim();
      const cls = String(r[classI] ?? "").trim();
      if (!name && !cls) return;
      let groups = groupsI >= 0 ? String(r[groupsI]).split(/[,;\/]/).map(x => x.trim()).filter(Boolean) : [];
      flagCols.forEach(([g, ci]) => { const v = String(r[ci]).trim().toLowerCase(); if (v && !["no", "n", "0", "false", "-"].includes(v)) groups.push(g); });
      const known = [], unknown = [];
      groups.forEach(g => { const m = setupGroups.find(x => norm(x) === norm(g)); if (m) { if (!known.includes(m)) known.push(m); } else unknown.push(g); });
      const existing = classes.find(c => c.name.toLowerCase() === cls.toLowerCase());
      const grade = existing ? (setup.config.grades || []).find(g => g.id === existing.grade_id) : (gradeI >= 0 ? matchGrade(r[gradeI]) : null);
      let problem = "";
      if (!name) problem = "No name"; else if (!cls) problem = "No class"; else if (!grade) problem = gradeI >= 0 && String(r[gradeI]).trim() ? `Grade “${r[gradeI]}” isn’t in your setup` : "No grade for a new class";
      out.push({ row: hi + i + 2, name, sn: idI >= 0 ? String(r[idI] ?? "").trim() || null : null, cls, grade, groups: known, unknown, existing, problem });
    });
    const ok = out.filter(x => !x.problem), seen = new Set();
    ok.forEach(x => { const k = x.cls.toLowerCase() + "|" + x.name.toLowerCase(); x.dupe = seen.has(k); seen.add(k);
      const ex = (x.sn && students.find(s => s.student_number && norm(s.student_number) === norm(x.sn))) || (x.existing && students.find(s => s.class_id === x.existing.id && s.full_name.toLowerCase() === x.name.toLowerCase())); x.match = ex || null; });
    const newClasses = [...new Map(ok.filter(x => !x.existing).map(x => [x.cls.toLowerCase(), x])).values()].map(x => ({ name: x.cls, grade: x.grade }));
    preview = { file: file.name, rows: out, newClasses, unknown: [...new Set(out.flatMap(x => x.unknown))] };
  }
  function previewCard() {
    const p = preview, ok = p.rows.filter(x => !x.problem && !x.dupe), bad = p.rows.filter(x => x.problem), dup = p.rows.filter(x => x.dupe);
    const add = ok.filter(x => !x.match).length, upd = ok.filter(x => x.match && (JSON.stringify(x.match.groups || []) !== JSON.stringify(x.groups) || (x.sn && x.match.student_number !== x.sn) || (x.existing && x.match.class_id !== x.existing.id))).length, same = ok.length - add - upd;
    return `<div class="card"><h2>Check the list before importing</h2><p class="note">From <b>${esc(p.file)}</b></p>
      <div class="grid3" style="margin:12px 0">
        <div class="colcard" style="margin:0"><b style="font-size:24px;color:var(--plum)">${add}</b><div class="note">new students to add</div></div>
        <div class="colcard" style="margin:0"><b style="font-size:24px;color:var(--plum)">${p.newClasses.length}</b><div class="note">new classes to create${p.newClasses.length ? ": " + p.newClasses.map(c => esc(c.name) + " (" + esc(c.grade.name) + ")").join(", ") : ""}</div></div>
        <div class="colcard" style="margin:0"><b style="font-size:24px;color:var(--plum)">${upd + same}</b><div class="note">already in TwigNest${upd ? `, ${upd} with groups to update` : ""}</div></div>
      </div>
      ${bad.length ? `<div class="msg err">${bad.length} row${bad.length === 1 ? "" : "s"} can’t be imported and will be skipped:</div><div class="tablewrap"><table><tr><th>Row</th><th>Name</th><th>Class</th><th>Problem</th></tr>${bad.slice(0, 30).map(x => `<tr><td>${x.row}</td><td>${esc(x.name)}</td><td>${esc(x.cls)}</td><td>${esc(x.problem)}</td></tr>`).join("")}</table></div>` : ""}
      ${dup.length ? `<div class="msg info">${dup.length} name${dup.length === 1 ? " appears" : "s appear"} twice in the same class and will only be added once.</div>` : ""}
      ${p.unknown.length ? `<div class="msg info">These groups aren’t in your setup and will be ignored: ${p.unknown.map(esc).join(", ")}. Add them in School setup, step 6, if you need them.</div>` : ""}
      <h3>First rows</h3><div class="tablewrap"><table><tr><th>Name</th><th>Student ID</th><th>Class</th><th>Grade</th><th>Groups</th><th></th></tr>
      ${ok.slice(0, 15).map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.sn || "")}</td><td>${esc(x.cls)}</td><td>${esc(x.grade.name)}</td><td>${x.groups.map(esc).join(", ")}</td><td class="note">${x.match ? "Already added" : "New"}</td></tr>`).join("")}</table></div>
      ${ok.length > 15 ? `<p class="note">…and ${ok.length - 15} more.</p>` : ""}
      <p class="note">Students already in TwigNest but not in this file are left as they are.</p>
      <div class="row" style="margin-top:12px"><button class="btn" data-cact="do-import" ${add + upd + p.newClasses.length ? "" : "disabled"}>Import ${add} student${add === 1 ? "" : "s"}</button><button class="btn ghost" data-cact="cancel-import">Cancel</button><span id="impMsg" class="note"></span></div></div>`;
  }

  async function load() {
    const sb = ctx.sb, sid = ctx.school.id;
    const s = await sb.from("school_setups").select("*").eq("school_id", sid).order("updated_at", { ascending: false }).limit(1);
    setup = s.data && s.data[0];
    if (!setup) return;
    const [c, t, l, st] = await Promise.all([
      sb.from("classes").select("*").eq("school_id", sid).eq("year", setup.year).order("name"),
      sb.from("profiles").select("id,full_name,email,role,active").eq("school_id", sid),
      sb.from("class_teachers").select("*"),
      sb.from("students").select("*").eq("school_id", sid).eq("archived", false).order("full_name")
    ]);
    const err = c.error || t.error || l.error || st.error;
    if (err) throw err;
    classes = c.data; teachers = t.data.filter(x => x.active); links = l.data; students = st.data;
  }

  function gradeName(id) { const g = (setup.config.grades || []).find(x => x.id === id); return g ? g.name : "Other"; }

  function render() {
    const el = ctx.el;
    if (!setup) { el.innerHTML = `<div class="card"><h2>Classes and students</h2><p class="note">Finish the school setup first, so TwigNest knows your grades and student groups.</p></div>`; return; }
    const grades = setup.config.grades || [];
    let h = `<div class="card"><h2>Add a class</h2><p class="note">For ${esc(setup.year)}. Add each class, choose its teachers, then add its students. You can paste names straight from Excel.</p>
      <div class="row" style="margin-top:12px"><select id="newGrade" aria-label="Grade">${grades.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select>
      <input id="newClass" type="text" placeholder="Class name, for example 2A" aria-label="Class name" style="max-width:260px"><button class="btn" data-cact="add-class">Add class</button></div><div id="cMsg"></div>
      <h3>Or upload a whole-school list</h3><p class="note">Upload an Excel or CSV file with the columns <b>Name</b>, <b>Student ID</b>, <b>Class</b>, <b>Grade</b> and <b>Groups</b>. The Student ID is optional but recommended, since it matches students exactly. TwigNest creates any missing classes and shows you a preview before anything is saved.</p>
      <div class="row"><label class="btn" style="display:inline-block;margin:0;font-size:16px;cursor:pointer">Upload a list<input type="file" id="listFile" accept=".xlsx,.xls,.csv" hidden></label><button class="btn ghost" data-cact="template">Download the template</button></div><div id="upMsg"></div></div>`;
    if (preview) h += previewCard();
    const byGrade = grades.map(g => [g, classes.filter(c => c.grade_id === g.id)]).filter(x => x[1].length);
    if (!classes.length) h += `<div class="card"><p class="note">No classes yet. Add your first class above.</p></div>`;
    byGrade.forEach(([g, list]) => {
      h += `<h3 style="margin:18px 0 8px;font-family:Poppins,sans-serif;color:var(--plum)">${esc(g.name)}</h3><div class="grid2">`;
      list.forEach(c => {
        const tIds = links.filter(l => l.class_id === c.id && !l.subject_id).map(l => l.teacher_id), spec = links.filter(l => l.class_id === c.id && l.subject_id), n = students.filter(s => s.class_id === c.id).length, subs = setup.config.subjects || [];
        h += `<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(c.name)}</h2><span class="note">${n} student${n === 1 ? "" : "s"}</span></div>
          <p class="note" style="margin:8px 0 4px"><b>Class teachers</b> (all subjects)</p>
          ${teachers.length ? teachers.map(t => `<label class="check" style="margin:4px 0"><input type="checkbox" data-teach="${c.id}|${t.id}" ${tIds.includes(t.id) ? "checked" : ""}> ${esc(t.full_name || t.email)}</label>`).join("") : `<p class="note">No approved staff yet.</p>`}
          <p class="note" style="margin:12px 0 4px"><b>Specialist teachers</b> (one subject)</p>
          ${spec.map(l => { const tt = teachers.find(x => x.id === l.teacher_id), sb = subs.find(x => x.id === l.subject_id); return `<div class="row" style="margin:3px 0"><span style="font-size:14px">${esc(tt ? (tt.full_name || tt.email) : "Former staff")} · <b>${esc(sb ? sb.name : "Removed subject")}</b></span><button class="mini" data-cact="del-spec" data-id="${c.id}|${l.teacher_id}|${l.subject_id}" aria-label="Remove">Remove</button></div>`; }).join("") || `<p class="note" style="margin:0">None yet.</p>`}
          ${teachers.length && subs.length ? `<div class="row" style="margin-top:6px"><select id="spT-${c.id}" aria-label="Teacher" style="width:auto;padding:6px 8px">${teachers.map(t => `<option value="${t.id}">${esc(t.full_name || t.email)}</option>`).join("")}</select><select id="spS-${c.id}" aria-label="Subject" style="width:auto;padding:6px 8px">${subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select><button class="btn ghost small" data-cact="add-spec" data-id="${c.id}">Add</button></div>` : ""}
          <div class="row" style="margin-top:12px"><button class="btn small" data-cact="students" data-id="${c.id}">${openClass === c.id ? "Close student list" : "Add or edit students"}</button>
          <button class="btn ghost small" data-cact="del-class" data-id="${c.id}">Remove class</button></div>
          ${openClass === c.id ? studentEditor(c) : ""}</div>`;
      });
      h += `</div>`;
    });
    el.innerHTML = h;
  }

  function studentEditor(c) {
    const list = students.filter(s => s.class_id === c.id), groups = setup.config.groups || [];
    return `<div style="margin-top:12px"><label for="st-${c.id}">One student per line: full name, student ID, then any groups, separated by commas</label>
      <p class="note">The student ID (school number) is optional. Groups you can use: ${groups.map(esc).join(", ") || "none set up"}. For example: Layla Hassan, 20145, EAL</p>
      <textarea id="st-${c.id}" style="min-height:220px">${esc(list.map(s => [s.full_name, s.student_number, ...(s.groups || [])].filter(Boolean).join(", ")).join("\n"))}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn" data-cact="save-students" data-id="${c.id}">Save students</button><span id="stMsg-${c.id}" class="note"></span></div>
      <p class="note">Removing a name archives that student. Their data is kept, not deleted.</p></div>`;
  }

  async function act(a, id, btn) {
    const sb = ctx.sb;
    if (a === "add-class") {
      const name = document.getElementById("newClass").value.trim(), grade = document.getElementById("newGrade").value;
      if (!name) { document.getElementById("cMsg").innerHTML = `<div class="msg err">Type a class name first.</div>`; return; }
      const { error } = await sb.from("classes").insert({ school_id: ctx.school.id, year: setup.year, grade_id: grade, name });
      if (error) { document.getElementById("cMsg").innerHTML = `<div class="msg err">${esc(/duplicate/i.test(error.message) ? "A class with this name already exists." : error.message)}</div>`; return; }
    }
    if (a === "del-class") {
      const n = students.filter(s => s.class_id === id).length;
      if (!confirm(n ? `Remove this class? Its ${n} students will be archived, and their data kept.` : "Remove this class?")) return;
      if (n) await sb.from("students").update({ archived: true }).eq("class_id", id);
      const { error } = await sb.from("classes").delete().eq("id", id); if (error) return alert(error.message);
    }
    if (a === "template") {
      await loadXLSX();
      const g = (setup.config.grades || []), ex = g.find(x => /2/.test(x.name)) || g[0] || { name: "Grade 2" }, grp = setup.config.groups || [];
      const ws = XLSX.utils.aoa_to_sheet([["Name", "Student ID", "Class", "Grade", "Groups"], ["Layla Hassan", "20145", "2A", ex.name, grp[2] || "EAL"], ["Omar Khalid", "20146", "2A", ex.name, ""], ["Yusuf Rahman", "20147", "2A", ex.name, [grp[0], grp[3]].filter(Boolean).join(", ")]]);
      ws["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 24 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Students"); XLSX.writeFile(wb, "TwigNest student list template.xlsx"); return;
    }
    if (a === "cancel-import") { preview = null; return render(); }
    if (a === "do-import") {
      const msg = document.getElementById("impMsg"), p = preview; msg.textContent = "Importing…";
      if (p.newClasses.length) { const { error } = await sb.from("classes").insert(p.newClasses.map(c => ({ school_id: ctx.school.id, year: setup.year, grade_id: c.grade.id, name: c.name }))); if (error) { msg.textContent = error.message; return; } }
      await load();
      const ok = p.rows.filter(x => !x.problem && !x.dupe), cid = n => classes.find(c => c.name.toLowerCase() === n.toLowerCase()).id;
      const ins = ok.filter(x => !x.match).map(x => ({ school_id: ctx.school.id, class_id: cid(x.cls), full_name: x.name, groups: x.groups, student_number: x.sn }));
      for (let i = 0; i < ins.length; i += 400) { const { error } = await sb.from("students").insert(ins.slice(i, i + 400)); if (error) { msg.textContent = error.message; return; } msg.textContent = `Importing… ${Math.min(i + 400, ins.length)} of ${ins.length}`; }
      for (const x of ok.filter(x => x.match)) { const ch = { groups: x.groups, class_id: cid(x.cls) }; if (x.sn) ch.student_number = x.sn; await sb.from("students").update(ch).eq("id", x.match.id); }
      preview = null; await load(); render();
      ctx.el.insertAdjacentHTML("afterbegin", `<div class="msg ok" style="margin-bottom:12px">Imported ${ins.length} student${ins.length === 1 ? "" : "s"}.</div>`); return;
    }
    if (a === "add-spec") {
      const t = document.getElementById("spT-" + id).value, s = document.getElementById("spS-" + id).value;
      if (links.some(l => l.class_id === id && l.teacher_id === t && l.subject_id === s)) return;
      const { error } = await sb.from("class_teachers").insert({ class_id: id, teacher_id: t, subject_id: s }); if (error) return alert(error.message);
    }
    if (a === "del-spec") { const [cid, tid, sid] = id.split("|"); const { error } = await sb.from("class_teachers").delete().eq("class_id", cid).eq("teacher_id", tid).eq("subject_id", sid); if (error) return alert(error.message); }
    if (a === "students") { openClass = openClass === id ? null : id; return render(); }
    if (a === "save-students") {
      const msg = document.getElementById("stMsg-" + id), groups = setup.config.groups || [];
      const rows = lines(document.getElementById("st-" + id).value).map(l => { const p = l.split(/[,\t]/).map(x => x.trim()).filter(Boolean);
        const gs = p.filter(x => groups.some(g => norm(g) === norm(x))).map(x => groups.find(g => norm(g) === norm(x)));
        const rest = p.filter(x => !groups.some(g => norm(g) === norm(x))), idf = rest.find(x => /\d/.test(x)), nm = rest.find(x => x !== idf) || rest[0] || "";
        return { full_name: nm, student_number: idf && idf !== nm ? idf : null, groups: gs, unknown: rest.filter(x => x !== nm && x !== idf) }; }).filter(r => r.full_name);
      const unknown = [...new Set(rows.flatMap(r => r.unknown))];
      if (unknown.length && !confirm(`These groups aren’t in your setup and will be ignored: ${unknown.join(", ")}. Continue?`)) return;
      const current = students.filter(s => s.class_id === id), keep = new Set();
      const inserts = [], updates = [];
      rows.forEach(r => { const ex = current.find(s => !keep.has(s.id) && r.student_number && s.student_number && norm(s.student_number) === norm(r.student_number)) || current.find(s => s.full_name.toLowerCase() === r.full_name.toLowerCase() && !keep.has(s.id));
        if (ex) { keep.add(ex.id); if (JSON.stringify(ex.groups || []) !== JSON.stringify(r.groups) || ex.full_name !== r.full_name || (ex.student_number || null) !== (r.student_number || null)) updates.push({ id: ex.id, full_name: r.full_name, groups: r.groups, student_number: r.student_number }); }
        else inserts.push({ school_id: ctx.school.id, class_id: id, full_name: r.full_name, groups: r.groups, student_number: r.student_number }); });
      const archive = current.filter(s => !keep.has(s.id)).map(s => s.id);
      msg.textContent = "Saving…";
      if (inserts.length) { const { error } = await sb.from("students").insert(inserts); if (error) { msg.textContent = error.message; return; } }
      for (const u of updates) { const { error } = await sb.from("students").update({ full_name: u.full_name, groups: u.groups, student_number: u.student_number }).eq("id", u.id); if (error) { msg.textContent = error.message; return; } }
      if (archive.length) { const { error } = await sb.from("students").update({ archived: true }).in("id", archive); if (error) { msg.textContent = error.message; return; } }
      openClass = null;
    }
    await load(); render();
  }

  async function onClick(e) {
    const b = e.target.closest("[data-cact]"); if (!b || !ctx.el.contains(b)) return;
    b.disabled = true; try { await act(b.dataset.cact, b.dataset.id, b); } catch (err) { alert(err.message || err); } finally { b.disabled = false; }
  }
  async function onChange(e) {
    const t = e.target;
    if (t.id === "listFile" && ctx.el.contains(t)) {
      const f = t.files[0]; if (!f) return; const m = document.getElementById("upMsg"); m.innerHTML = `<p class="note">Reading ${esc(f.name)}…</p>`;
      try { await readFile(f); render(); } catch (err) { m.innerHTML = `<div class="msg err">${esc(err.message || err)}</div>`; } t.value = ""; return;
    }
    if (!t.dataset.teach || !ctx.el.contains(t)) return;
    const [cid, tid] = t.dataset.teach.split("|");
    const q = t.checked ? ctx.sb.from("class_teachers").insert({ class_id: cid, teacher_id: tid }) : ctx.sb.from("class_teachers").delete().eq("class_id", cid).eq("teacher_id", tid).is("subject_id", null);
    const { error } = await q; if (error) { alert(error.message); t.checked = !t.checked; return; }
    await load();
  }

  window.TNClasses = {
    async open(context) {
      ctx = context; ctx.el.innerHTML = `<div class="card"><p class="note">Loading classes…</p></div>`;
      if (!bound) { document.addEventListener("click", onClick); document.addEventListener("change", onChange); bound = true; }
      try { await load(); render(); } catch (err) { ctx.el.innerHTML = `<div class="card"><div class="msg err">${esc(err.message || err)}</div></div>`; }
    },
    async myClasses(context) {
      ctx = context; const sb = ctx.sb, el = ctx.el;
      const { data: l } = await sb.from("class_teachers").select("class_id").eq("teacher_id", ctx.profile.id);
      const ids = (l || []).map(x => x.class_id);
      if (!ids.length) { el.innerHTML += `<div class="card"><h2>My classes</h2><p class="note">You haven’t been added to a class yet. Your school lead adds you to your classes.</p></div>`; return; }
      const { data: cls } = await sb.from("classes").select("*").in("id", ids).order("name");
      const { data: st } = await sb.from("students").select("id,class_id").in("class_id", ids).eq("archived", false);
      el.innerHTML += `<div class="card"><h2>My classes</h2><div class="grid2" style="margin-top:10px">${(cls || []).map(c => { const n = (st || []).filter(s => s.class_id === c.id).length;
        return `<div class="colcard" style="margin:0"><h3 style="margin:0">${esc(c.name)}</h3><p class="note" style="margin:4px 0 0">${n} student${n === 1 ? "" : "s"}. The class sheet is coming next.</p></div>`; }).join("")}</div></div>`;
    }
  };
})();
