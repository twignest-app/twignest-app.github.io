/* TwigNest classes and students */
(function () {
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lines = v => v.split("\n").map(x => x.trim()).filter(Boolean);
  let ctx, setup, classes = [], teachers = [], links = [], students = [], openClass = null, bound = false;

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
    let h = `<div class="card"><h2>Classes and students, ${esc(setup.year)}</h2><p class="note">Add each class, choose its teachers, then add its students. You can paste student names straight from Excel.</p>
      <div class="row" style="margin-top:12px"><select id="newGrade" aria-label="Grade">${grades.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select>
      <input id="newClass" type="text" placeholder="Class name, for example 2A" aria-label="Class name" style="max-width:260px"><button class="btn" data-cact="add-class">Add class</button></div><div id="cMsg"></div></div>`;
    const byGrade = grades.map(g => [g, classes.filter(c => c.grade_id === g.id)]).filter(x => x[1].length);
    if (!classes.length) h += `<div class="card"><p class="note">No classes yet. Add your first class above.</p></div>`;
    byGrade.forEach(([g, list]) => {
      h += `<h3 style="margin:18px 0 8px;font-family:Poppins,sans-serif;color:var(--plum)">${esc(g.name)}</h3><div class="grid2">`;
      list.forEach(c => {
        const tIds = links.filter(l => l.class_id === c.id).map(l => l.teacher_id), n = students.filter(s => s.class_id === c.id).length;
        h += `<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(c.name)}</h2><span class="note">${n} student${n === 1 ? "" : "s"}</span></div>
          <p class="note" style="margin:8px 0 4px"><b>Teachers</b></p>
          ${teachers.length ? teachers.map(t => `<label class="check" style="margin:4px 0"><input type="checkbox" data-teach="${c.id}|${t.id}" ${tIds.includes(t.id) ? "checked" : ""}> ${esc(t.full_name || t.email)}</label>`).join("") : `<p class="note">No approved staff yet.</p>`}
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
    return `<div style="margin-top:12px"><label for="st-${c.id}">One student per line: full name, then any groups separated by commas</label>
      <p class="note">Groups you can use: ${groups.map(esc).join(", ") || "none set up"}. For example: Layla Hassan, EAL</p>
      <textarea id="st-${c.id}" style="min-height:220px">${esc(list.map(s => [s.full_name, ...(s.groups || [])].join(", ")).join("\n"))}</textarea>
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
    if (a === "students") { openClass = openClass === id ? null : id; return render(); }
    if (a === "save-students") {
      const msg = document.getElementById("stMsg-" + id), groups = setup.config.groups || [];
      const rows = lines(document.getElementById("st-" + id).value).map(l => { const p = l.split(/[,\t]/).map(x => x.trim()).filter(Boolean); return { full_name: p[0], groups: p.slice(1).filter(g => groups.includes(g)), unknown: p.slice(1).filter(g => !groups.includes(g)) }; });
      const unknown = [...new Set(rows.flatMap(r => r.unknown))];
      if (unknown.length && !confirm(`These groups aren’t in your setup and will be ignored: ${unknown.join(", ")}. Continue?`)) return;
      const current = students.filter(s => s.class_id === id), keep = new Set();
      const inserts = [], updates = [];
      rows.forEach(r => { const ex = current.find(s => s.full_name.toLowerCase() === r.full_name.toLowerCase() && !keep.has(s.id));
        if (ex) { keep.add(ex.id); if (JSON.stringify(ex.groups || []) !== JSON.stringify(r.groups) || ex.full_name !== r.full_name) updates.push({ id: ex.id, full_name: r.full_name, groups: r.groups }); }
        else inserts.push({ school_id: ctx.school.id, class_id: id, full_name: r.full_name, groups: r.groups }); });
      const archive = current.filter(s => !keep.has(s.id)).map(s => s.id);
      msg.textContent = "Saving…";
      if (inserts.length) { const { error } = await sb.from("students").insert(inserts); if (error) { msg.textContent = error.message; return; } }
      for (const u of updates) { const { error } = await sb.from("students").update({ full_name: u.full_name, groups: u.groups }).eq("id", u.id); if (error) { msg.textContent = error.message; return; } }
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
    const t = e.target; if (!t.dataset.teach || !ctx.el.contains(t)) return;
    const [cid, tid] = t.dataset.teach.split("|");
    const q = t.checked ? ctx.sb.from("class_teachers").insert({ class_id: cid, teacher_id: tid }) : ctx.sb.from("class_teachers").delete().eq("class_id", cid).eq("teacher_id", tid);
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
