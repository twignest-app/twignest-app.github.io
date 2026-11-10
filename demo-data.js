/* TwigNest demo: sample school data held in the browser only. Nothing is saved. */
(function () {
  let seed = 20262027; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const O = (p, terms) => terms.map((t, ti) => t.map(([a, b], i) => ({ id: `${p}${ti}${i}`, text: a, step: b })));
  const col = (id, name, type, extra) => Object.assign({ id, name, type, baseline: false }, extra);
  const BAND = ["Lime", "Brown", "Grey", "Dark blue", "Dark red"], WT = ["Working towards", "Expected", "Greater depth"];
  const config = {
    year: "2026–2027", terms: ["Term 1", "Term 2", "Term 3"], steps: 2, groups: ["SEN", "G&T", "EAL", "Emirati"],
    grades: [{ id: "g2", name: "Grade 2" }],
    scale: ["1", "2", "3", "4", "5", "6", "7"], gradeMin: [45, 50, 60, 75, 85, 90, 100], gradePos: ["below", "below", "below", "inline", "inline", "above", "above"],
    reports: { limit: 600, bank: [
      ["{name} is at the very early stages of {strand} and needs a high level of adult support to take part in learning.", "{name} is at the early stages of {strand} and needs a high level of support to access the learning.", "{name} is beginning to take small steps in {strand} with a high level of adult support."],
      ["{name} is beginning to develop {strand} skills and relies on adult modelling to complete tasks.", "{name} is beginning to develop {strand} skills and works best with adult support and modelling.", "{name} is developing early {strand} skills and is starting to complete some tasks with less support."],
      ["{name} is developing {strand} skills and is working towards the expected standard with regular support.", "{name} is developing secure {strand} skills and is working towards the expected standard with some support.", "{name} is close to the expected standard in {strand} and needs only occasional support."],
      ["{name} has reached the expected standard in {strand} and is building confidence in applying new learning.", "{name} is working at the expected standard in {strand} and applies new learning with growing confidence.", "{name} is working confidently at the expected standard in {strand} and applies new learning with little support."],
      ["{name} is working securely at the expected standard in {strand} and is beginning to apply skills independently.", "{name} is working securely at the expected standard in {strand} and applies skills independently.", "{name} is working very securely in {strand}, applying skills independently and accurately."],
      ["{name} is working above the expected standard in {strand} and is beginning to apply skills in new contexts.", "{name} is working above the expected standard in {strand}, applying skills confidently in new contexts.", "{name} is working well above the expected standard in {strand}, applying skills confidently and accurately in new contexts."],
      ["{name} is working at greater depth in {strand} and shows a strong understanding of the learning.", "{name} is working at greater depth in {strand}, showing an excellent understanding and applying skills creatively.", "{name} is working at greater depth in {strand}, showing exceptional understanding and applying skills creatively and independently."]] },
    subjects: [
      { id: "eng", name: "English", strands: [
        { id: "rd", name: "Reading", cols: [col("rd_b", "Baseline reading test", "standardised", { baseline: true, below: 85, above: 115 }), col("rd_age", "Reading age", "readingAge", { below: 7.5, above: 9 }),
          col("rd_obj", "Reading objectives", "objectives", { belowPct: 70, abovePct: 30, objectives: { g2: O("rd", [
            [["Read Year 3 exception words accurately", "Practise Year 3 exception words with flashcards in class and at home."], ["Retell stories and identify the main idea", "Retell familiar stories with a story map, then give the main idea in one sentence."], ["Use a dictionary to check word meanings", "Practise alphabetical order and look up new words from class reading."]],
            [["Draw inferences about characters’ feelings", "Answer “how do you know?” questions using evidence from the text."], ["Predict what might happen from details in the text", "Pause during reading to predict and explain which clue supports it."], ["Identify how language choices create meaning", "Highlight powerful words in a passage and discuss their effect."]],
            [["Retrieve information from non-fiction", "Use headings and key words to find facts quickly."], ["Discuss words and phrases that capture interest", "Collect favourite phrases in a word journal."], ["Read aloud with intonation and expression", "Rehearse reading poems aloud, varying tone and volume."]]]) } })] },
        { id: "wr", name: "Writing", cols: [col("wr_b", "Baseline writing assessment", "list", { baseline: true, options: WT, below: 1, above: 2 }),
          col("wr_obj", "Writing objectives", "objectives", { belowPct: 70, abovePct: 30, objectives: { g2: O("wr", [
            [["Organise writing into paragraphs", "Plan writing in boxes, one idea per paragraph."], ["Use conjunctions to express time and cause", "Combine sentences using when, because, before and after."], ["Use the present perfect form of verbs", "Practise sentences using has or have with a verb."]],
            [["Use inverted commas for direct speech", "Turn speech bubbles into sentences with inverted commas."], ["Use headings and subheadings in non-fiction", "Plan non-fiction writing with headings first."], ["Choose nouns and pronouns for clarity", "Edit a paragraph to replace repeated nouns with pronouns."]],
            [["Proofread for spelling and punctuation errors", "Use a simple checklist to proofread with a partner."], ["Use a or an correctly", "Sort nouns by their first sound and choose a or an."], ["Join handwriting consistently", "Short daily handwriting practice focusing on joins."]]]) } }),
          col("wr_sat", "Summative Assessment Task", "rubric", { max: 16, below: 8, above: 14 })] },
        { id: "sp", name: "Spelling", cols: [col("sp_b", "Baseline spelling test", "score", { baseline: true, max: 20, below: 10, above: 17 }), col("sp_t", "Spelling test", "score", { max: 20, below: 10, above: 17 })] }] },
      { id: "mat", name: "Maths", strands: [
        { id: "mn", name: "Number and calculation", cols: [col("mn_b", "Baseline maths test", "standardised", { baseline: true, below: 85, above: 115 }),
          col("mn_obj", "Number objectives", "objectives", { belowPct: 70, abovePct: 30, objectives: { g2: O("mn", [
            [["Know the place value of each digit in a 3-digit number", "Build 3-digit numbers with base-10 blocks and partition them."], ["Compare and order numbers up to 1000", "Order 3-digit numbers on a number line and explain using < and >."], ["Add and subtract using column methods", "Practise column methods with place value counters first."]],
            [["Recall the 3, 4 and 8 times tables", "Quick daily times-table practice and games."], ["Multiply a 2-digit number by a 1-digit number", "Use arrays and the grid method."], ["Solve missing number problems", "Use bar models to find missing numbers."]],
            [["Solve two-step word problems", "Underline key information and draw a bar model first."], ["Divide using known multiplication facts", "Link division to times tables with fact families."], ["Estimate and check with the inverse", "Round to estimate, then check with the inverse."]]]) } }),
          col("mn_eot", "End-of-term assessment", "score", { max: 40, below: 20, above: 34 })] }] },
      { id: "arb", name: "اللغة العربية", lang: "ar", strands: [
        { id: "ar_r", name: "القراءة", cols: [col("ar_b", "تقييم القراءة الأولي", "list", { baseline: true, options: ["دون المتوقع", "ضمن المتوقع", "فوق المتوقع"], below: 1, above: 2 }),
          col("ar_obj", "أهداف القراءة", "objectives", { belowPct: 70, abovePct: 30, objectives: { g2: O("ar", [
            [["قراءة الكلمات ذات المقاطع الطويلة والقصيرة قراءة صحيحة", "التدرب يوميا على قراءة بطاقات الكلمات ذات المقاطع الطويلة والقصيرة."], ["تحديد الفكرة الرئيسة في نص قصير", "قراءة نصوص قصيرة وتلخيص كل نص في جملة واحدة."], ["التمييز بين التاء المربوطة والتاء المفتوحة", "تصنيف كلمات حسب نوع التاء في أنشطة صفية قصيرة."]],
            [["استنتاج مشاعر الشخصيات من أحداث القصة", "طرح أسئلة مثل: كيف عرفت؟ مع الرجوع إلى النص."], ["قراءة نص قصير قراءة جهرية معبرة", "التدرب على القراءة الجهرية مع مراعاة علامات الترقيم."], ["التمييز بين اللام الشمسية واللام القمرية", "تصنيف كلمات تبدأ باللام الشمسية واللام القمرية."]],
            [["استخراج معلومات من نص معلوماتي", "استخدام العناوين والكلمات المفتاحية للبحث عن المعلومات."], ["توظيف مفردات جديدة في جمل مفيدة", "كتابة جملة يومية بكلمة جديدة من القراءة."], ["إعادة سرد قصة بتسلسل صحيح", "استخدام خريطة القصة لإعادة السرد بالترتيب."]]]) } })] }] },
      { id: "sci", name: "Science", strands: [
        { id: "sc", name: "Science", cols: [col("sc_b", "Baseline teacher assessment", "list", { baseline: true, options: WT, below: 1, above: 2 }),
          col("sc_eot", "End-of-term assessment", "score", { max: 30, below: 15, above: 26 }), col("sc_obj", "Science objectives", "objectives", { belowPct: 70, abovePct: 30, objectives: { g2: O("sc", [
            [["Compare and group rocks by their properties", "Sort rocks by hardness and texture and record findings."], ["Describe how fossils are formed", "Sequence pictures of fossil formation and explain each stage."], ["Ask questions and plan a simple enquiry", "Use “I wonder…” questions to plan a simple fair test."]],
            [["Recognise that light is needed to see things", "Explore a dark box and explain why we need light."], ["Explain how shadows are formed", "Make shadows with torches and describe what blocks the light."], ["Find patterns in the size of shadows", "Measure shadow lengths as a torch moves."]],
            [["Compare how things move on different surfaces", "Roll a car on different surfaces and compare distances."], ["Observe how magnets attract or repel", "Test magnets and describe attract and repel."], ["Identify the functions of parts of plants", "Label plant parts and explain what each does."]]]) } })] }] }
    ]
  };

  const db = { schools: [{ id: "s1", name: "Demo Academy", country: "United Arab Emirates", status: "approved", join_code: "DEMO26" }],
    profiles: [{ id: "u1", full_name: "Demo Leader", email: "leader@demo.school", role: "school_lead", school_id: "s1", active: true },
      { id: "u2", full_name: "Sara Ahmed", email: "sara@demo.school", role: "teacher", school_id: "s1", active: true },
      { id: "u3", full_name: "Daniel Brooks", email: "daniel@demo.school", role: "teacher", school_id: "s1", active: true },
      { id: "u4", full_name: "Noura Saeed", email: "noura@demo.school", role: "checker", school_id: "s1", active: true },
      { id: "u6", full_name: "Huda Salem", email: "huda@demo.school", role: "teacher", school_id: "s1", active: true },
      { id: "u5", full_name: "New Teacher", email: "new@demo.school", role: "teacher", school_id: "s1", active: false }],
    school_setups: [{ id: "r1", school_id: "s1", year: "2026–2027", status: "live", config }],
    classes: [{ id: "k1", school_id: "s1", year: "2026–2027", grade_id: "g2", name: "2A" }, { id: "k2", school_id: "s1", year: "2026–2027", grade_id: "g2", name: "2B" }],
    class_teachers: [{ id: "ct1", class_id: "k1", teacher_id: "u2", subject_id: null }, { id: "ct2", class_id: "k2", teacher_id: "u3", subject_id: null }, { id: "ct3", class_id: "k1", teacher_id: "u6", subject_id: "arb" }, { id: "ct4", class_id: "k2", teacher_id: "u6", subject_id: "arb" }],
    students: [], results: [], objective_status: [], levels: [], taught: [], report_comments: [], next_steps: [] };

  const names = [["Layla Hassan", ["EAL"]], ["Omar Khalid", []], ["Yusuf Rahman", ["SEN"]], ["Mariam Al Shamsi", ["Emirati", "G&T"]], ["Ahmed Al Mansoori", ["Emirati"]], ["Sara Ibrahim", []], ["Hamdan Al Ketbi", ["Emirati"]], ["Aisha Siddiqui", ["EAL"]],
    ["Zayed Al Nuaimi", ["Emirati", "SEN"]], ["Noor Fathi", ["G&T"]], ["Adam Youssef", []], ["Fatima Al Ali", ["Emirati"]], ["Rayan Malik", ["EAL", "SEN"]], ["Hessa Al Suwaidi", ["Emirati"]], ["Ali Hamdan", []], ["Lina Haddad", ["EAL"]],
    ["Khalid Al Zaabi", ["Emirati"]], ["Maya Thomas", []], ["Ibrahim Saleh", ["EAL"]], ["Reem Al Hosani", ["Emirati", "G&T"]], ["Jad Nassar", []], ["Salma Farouk", ["SEN"]], ["Rashid Al Kaabi", ["Emirati"]], ["Hana Yousef", ["EAL"]]];
  const AR_NAMES = {"Layla Hassan": "ليلى حسن", "Omar Khalid": "عمر خالد", "Yusuf Rahman": "يوسف رحمن", "Mariam Al Shamsi": "مريم الشامسي", "Ahmed Al Mansoori": "أحمد المنصوري", "Sara Ibrahim": "سارة إبراهيم", "Hamdan Al Ketbi": "حمدان الكتبي", "Aisha Siddiqui": "عائشة صديقي", "Zayed Al Nuaimi": "زايد النعيمي", "Noor Fathi": "نور فتحي", "Adam Youssef": "آدم يوسف", "Fatima Al Ali": "فاطمة العلي", "Rayan Malik": "ريان مالك", "Hessa Al Suwaidi": "حصة السويدي", "Ali Hamdan": "علي حمدان", "Lina Haddad": "لينا حداد", "Khalid Al Zaabi": "خالد الزعابي", "Ibrahim Saleh": "إبراهيم صالح", "Reem Al Hosani": "ريم الحوسني", "Jad Nassar": "جاد نصار", "Salma Farouk": "سلمى فاروق", "Rashid Al Kaabi": "راشد الكعبي", "Hana Yousef": "هنا يوسف"};
  const ability = {};
  names.forEach(([n, g], i) => { const id = "p" + i; db.students.push({ id, school_id: "s1", class_id: i % 2 ? "k2" : "k1", full_name: n, arabic_name: AR_NAMES[n] || null, student_number: String(20140 + i), groups: g, archived: false });
    ability[id] = g.includes("G&T") ? .88 + rnd() * .1 : g.includes("SEN") ? .28 + rnd() * .2 : .5 + rnd() * .4; });
  const put = (sid, cid, term, v) => db.results.push({ student_id: sid, col_id: cid, term, value: String(v) });
  const clamp = x => Math.max(0, Math.min(1, x));
  db.students.forEach(s => {
    const a = ability[s.id], j = () => (rnd() - .5) * .18, a1 = clamp(a + .05 + j()), a2 = clamp(a + .11 + j());
    put(s.id, "rd_b", "b", Math.round(76 + clamp(a + j()) * 48)); put(s.id, "mn_b", "b", Math.round(76 + clamp(a + j()) * 48));
    put(s.id, "wr_b", "b", WT[Math.min(2, Math.floor(clamp(a + j()) * 2.6))]); put(s.id, "sc_b", "b", WT[Math.min(2, Math.floor(clamp(a + j()) * 2.6))]); put(s.id, "ar_b", "b", ["دون المتوقع", "ضمن المتوقع", "فوق المتوقع"][Math.min(2, Math.floor(clamp(a + j()) * 2.6))]);
    put(s.id, "sp_b", "b", Math.round(20 * clamp(.35 + a * .5 + j())));
    put(s.id, "rd_age", "0", (6.4 + a1 * 3).toFixed(1)); put(s.id, "rd_age", "1", (6.7 + a2 * 3).toFixed(1));
    put(s.id, "sp_t", "0", Math.round(20 * clamp(.5 + a1 * .48))); put(s.id, "sp_t", "1", Math.round(20 * clamp(.55 + a2 * .45)));
    put(s.id, "wr_sat", "0", Math.round(16 * clamp(.5 + a1 * .48))); put(s.id, "mn_eot", "0", Math.round(40 * clamp(.5 + a1 * .48))); put(s.id, "sc_eot", "0", Math.round(30 * clamp(.5 + a1 * .48 + j())));
  });
  config.subjects.forEach(sb => sb.strands.forEach(st => st.cols.filter(c => c.type === "objectives").forEach(c => {
    const t0 = c.objectives.g2[0], t1 = c.objectives.g2[1].slice(0, 2);
    ["k1", "k2"].forEach(k => t0.concat(t1).forEach(o => db.taught.push({ class_id: k, obj_id: o.id })));
    db.students.forEach(s => t0.concat(t1).forEach((o, i) => { if (i === 4 && rnd() < .3) return; const a = ability[s.id], pSec = clamp(.3 + a * .75);
      db.objective_status.push({ student_id: s.id, obj_id: o.id, status: rnd() < pSec ? (rnd() < (a - .78) * 2.2 ? "e" : "s") : "n" }); }));
  })));

  const KEYS = { results: ["student_id", "col_id", "term"], objective_status: ["student_id", "obj_id"], levels: ["student_id", "strand_id", "term"], taught: ["class_id", "obj_id"],
    report_comments: ["student_id", "strand_id", "term"], next_steps: ["student_id", "strand_id", "term"], school_setups: ["id"], class_teachers: ["id"], classes: ["id"], students: ["id"], profiles: ["id"] };
  let n = 100;
  function q(t) {
    const f = []; let op = "select", payload = null, single = false, count = false, rng = null;
    const o = {
      select(c, opt) { if (opt && opt.head) count = true; return o; }, eq(k, v) { f.push(r => r[k] === v); return o; }, neq(k, v) { f.push(r => r[k] !== v); return o; },
      in(k, v) { f.push(r => v.includes(r[k])); return o; }, is(k, v) { f.push(r => (r[k] ?? null) === v); return o; },
      order() { return o; }, limit(x) { rng = [0, x - 1]; return o; }, range(a, b) { rng = [a, b]; return o; }, single() { single = true; return o; },
      insert(p) { op = "insert"; payload = p; return o; }, upsert(p) { op = "upsert"; payload = p; return o; }, update(p) { op = "update"; payload = p; return o; }, delete() { op = "delete"; return o; },
      then(res, rej) {
        const m = r => f.every(fn => fn(r)); let data = null, out;
        if (op === "insert" || op === "upsert") {
          const rows = (Array.isArray(payload) ? payload : [payload]).map(p => Object.assign({}, p)); const keys = KEYS[t] || ["id"];
          rows.forEach(p => { if (!p.id && keys[0] === "id") p.id = "x" + (++n);
            const ex = op === "upsert" && db[t].find(r => keys.every(k => r[k] === p[k]));
            if (ex) Object.assign(ex, p); else db[t].push(Object.assign(t === "students" ? { archived: false, groups: [] } : t === "school_setups" ? { status: "draft" } : {}, p)); });
          data = rows.length === 1 ? db[t].find(r => (KEYS[t] || ["id"]).every(k => r[k] === rows[0][k])) : rows;
        } else if (op === "update") { db[t].filter(m).forEach(r => Object.assign(r, payload)); data = db[t].filter(m)[0] || null; }
        else if (op === "delete") { db[t] = db[t].filter(r => !m(r)); }
        else { let rows = db[t].filter(m); if (rng) rows = rows.slice(rng[0], rng[1] + 1); if (count) out = { data: null, count: db[t].filter(m).length, error: null }; data = single ? rows[0] || null : JSON.parse(JSON.stringify(rows)); }
        if (single && (op === "update" || op === "insert" || op === "upsert") && Array.isArray(data)) data = data[0];
        return Promise.resolve(out || { data: single || !Array.isArray(data) ? (data && JSON.parse(JSON.stringify(data))) : data, error: null }).then(res, rej);
      }
    };
    return o;
  }
  function rpc(name) {
    if (name === "used_ids") { const out = []; db.results.forEach(r => out.push({ kind: "col", id: r.col_id })); db.objective_status.forEach(r => out.push({ kind: "obj", id: r.obj_id })); return Promise.resolve({ data: out, error: null }); }
    return Promise.resolve({ data: null, error: null });
  }
  window.__demoUser = "u1";
  window.supabase = { createClient: () => ({ from: q, rpc,
    auth: { getSession: async () => ({ data: { session: { user: { id: window.__demoUser } } } }), onAuthStateChange: () => {}, signOut: async () => { location.href = "index.html"; },
      signInWithPassword: async () => ({ error: null }), signUp: async () => ({ error: null }), resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null }) } }) };
  window.TN_DEMO = true;
})();
