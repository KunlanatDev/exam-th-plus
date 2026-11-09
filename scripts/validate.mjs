// ตรวจเนื้อหาใน public/content แล้วสร้าง catalog.json (รันอัตโนมัติก่อน dev/build)
import fs from 'node:fs'; import path from 'node:path';
const root = 'public/content/exams', errs = [], err = m => errs.push(m), exams = [];
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));
for (const e of fs.readdirSync(root)) {
  const ef = path.join(root, e, 'exam.json'); if (!fs.existsSync(ef)) continue;
  const x = rj(ef); x.editions = []; const sec = new Set(x.sections.map(s => s.id));
  if (x.id !== e) err(`${e}: id ต้องตรงกับชื่อโฟลเดอร์`);
  if (x.scoring !== 'percent') err(`${e}: scoring รองรับเฉพาะ percent`);
  if (!x.bands.some(b => b.minPassRatio === 0)) err(`${e}: ต้องมี band ที่ minPassRatio = 0`);
  for (const d of fs.readdirSync(path.join(root, e), { withFileTypes: true }).filter(d => d.isDirectory())) {
    const dir = path.join(root, e, d.name), ed = rj(path.join(dir, 'edition.json')), tag = `${e}/${d.name}`; ed.id = d.name;
    const w = Object.values(ed.sectionWeights).reduce((a, b) => a + b, 0);
    if (w !== 100) err(`${tag}: sectionWeights ต้องรวม 100 (ได้ ${w})`);
    Object.keys({ ...ed.sectionWeights, ...ed.minPerSection }).forEach(k => sec.has(k) || err(`${tag}: section "${k}" ไม่มีใน exam.json`));
    const sets = [];
    for (const sid of ed.sets) {
      const f = path.join(dir, sid + '.json'); if (!fs.existsSync(f)) { err(`${f} ไม่พบ`); continue; }
      const s = rj(f), ids = new Set();
      s.questions.forEach((q, i) => {
        const at = `${f} ข้อ ${i + 1}`;
        if (ids.has(q.id)) err(`${at}: id ซ้ำ`); ids.add(q.id);
        if (!(q.section in ed.sectionWeights)) err(`${at}: section "${q.section}" ไม่มีใน sectionWeights`);
        if (q.type !== 'mcq') err(`${at}: รองรับเฉพาะ mcq`);
        if (!q.stem || !q.explanation) err(`${at}: ขาด stem/explanation`);
        if (!q.topics?.length) err(`${at}: ขาด topics`);
        if (!Array.isArray(q.choices) || q.choices.length < 2 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) err(`${at}: choices/answer ไม่ถูกต้อง (answer นับจาก 0)`);
      });
      sets.push({ id: sid, title: s.title, questions: s.questions.length });
    }
    ed.sets = sets; x.editions.push(ed);
  }
  x.editions.sort((a, b) => b.year - a.year || b.round - a.round); exams.push(x);
}
if (errs.length) { console.error('❌ เนื้อหามีปัญหา:\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync('public/content/catalog.json', JSON.stringify({ exams }));
console.log(`✅ เนื้อหาถูกต้อง: ${exams.length} วิชา`);
