import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Attempt, Cand, Q, SOON, SRC, getHistory, load, loadSet, mmss, roster, save, scorers, useCat, useEd } from './lib';

export function Home() {
  const c = useCat(); const [sel, setSel] = useState('all');
  if (!c) return <section className="panel"><p>กำลังโหลดคลังข้อสอบ…</p></section>;
  const last = getHistory()[0];
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🎓 LEARN • PRACTICE • PASS</div>
          <h1>ซ้อมสอบเสมือนจริง<br /><span>ตั้งแต่สมัครจนรู้ผล</span></h1>
          <p>เตรียมความพร้อมด้วยระบบจำลองการสอบครบวงจร ตั้งแต่ลงทะเบียน ออกบัตรประจำตัวสอบ จับเวลาทำข้อสอบจริง ไปจนถึงวิเคราะห์จุดอ่อนรายหมวดวิชา</p>
          <div className="hero-pills">
            <span className="hero-pill">⏱️ จับเวลาเสมือนจริง</span>
            <span className="hero-pill">📊 วิเคราะห์คะแนนรายหมวด</span>
            <span className="hero-pill">✅ เฉลยละเอียดทุกข้อ</span>
          </div>
        </div>
        <div className="hero-card" aria-hidden="true">
          <div className="hero-card-title">
            <span>ขั้นตอนการซ้อมสอบ</span>
            <span style={{ color: '#34d399' }}>ExamTHPlus</span>
          </div>
          <div className="hero-steps">
            <div className="hero-step"><i>1</i><span>ลงทะเบียนสมัครสอบจำลอง</span></div>
            <div className="hero-step"><i>2</i><span>ตรวจรายชื่อ & ห้องสอบ</span></div>
            <div className="hero-step"><i>3</i><span>รับบัตรประจำตัวผู้เข้าสอบ</span></div>
            <div className="hero-step"><i>✓</i><span>เข้าห้องสอบ & ดูผลวิเคราะห์</span></div>
          </div>
        </div>
      </section>

      <div className="chips">
        <button className={sel === 'all' ? 'on' : ''} onClick={() => setSel('all')}>ทั้งหมด</button>
        {c.exams.map(x => <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setSel(x.id)}>{x.short}</button>)}
        {SOON.map(s => <button key={s} disabled>{s} (เร็วๆ นี้)</button>)}
      </div>

      {last?.summary && (
        <Link to={`/attempt/${last.id}/result`} className="recent-banner">
          <div>
            <small style={{ color: '#0066eb', fontWeight: 600 }}>ผลการสอบล่าสุดของคุณ</small>
            <div style={{ fontWeight: 700, fontSize: '17px' }}>{last.summary.label} · ได้ {last.summary.score} คะแนน</div>
          </div>
          <span className="btn ghost" style={{ padding: '6px 14px', fontSize: '14px' }}>ดูผลวิเคราะห์ →</span>
        </Link>
      )}

      {c.exams.filter(x => sel === 'all' || x.id === sel).map(x => (
        <section key={x.id}>
          <div className="section-head">
            <h2>{x.name}</h2>
          </div>
          <div className="grid">
            {x.editions.map(ed => (
              <article className="card" key={ed.id} style={{ borderTop: `5px solid ${x.color}` }}>
                <div>
                  <small>พ.ศ. {ed.year} รอบ {ed.round} · ที่มา: {SRC[ed.source] ?? ed.source}</small>
                  <h3>{ed.position}</h3>
                  <div className="card-meta">
                    <span className="meta-pill">📚 {ed.sets.length} ชุดข้อสอบ</span>
                    <span className="meta-pill">⏱️ {ed.durationMinutes} นาที</span>
                    <span className="meta-pill">🎯 เกณฑ์ผ่าน {ed.passScore}%</span>
                  </div>
                </div>
                <Link className="btn" to={`/e/${x.id}/${ed.id}`}>เลือกชุดข้อสอบ →</Link>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function Detail() {
  const p = useParams(); const { x, ed } = useEd(p); const nav = useNavigate();
  const [sid, setSid] = useState(''); const [mode, setMode] = useState<'real' | 'practice'>('real');
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const b = `/e/${x.id}/${ed.id}`; const cand = load<Cand | null>(`ep_cand_${x.id}_${ed.id}`, null);
  const set = ed.sets.find(s => s.id === sid) ?? ed.sets[0];
  function start() {
    const now = Date.now();
    const a: Attempt = { id: String(now), examId: x!.id, editionId: ed!.id, setId: set.id, mode, answers: Array(set.questions).fill(null), flags: [], startedAt: now, endAt: mode === 'real' ? now + ed!.durationMinutes * 60000 : null };
    save(`ep_att_${a.id}`, a); nav(`/attempt/${a.id}`);
  }
  return (
    <section className="panel">
      <small>{x.name} · พ.ศ. {ed.year} รอบ {ed.round}</small>
      <h2 style={{ margin: '4px 0 12px' }}>{ed.position}</h2>
      <div className="card-meta">
        <span className="meta-pill">⏱️ เวลาสอบ {ed.durationMinutes} นาที</span>
        <span className="meta-pill">🎯 เกณฑ์ผ่าน {ed.passScore}/100</span>
        <span className="meta-pill">📌 ที่มา: {SRC[ed.source] ?? ed.source}</span>
      </div>
      {ed.notes && <p className="note">{ed.notes}</p>}

      <label>
        เลือกชุดข้อสอบ
        <select value={set.id} onChange={e => setSid(e.target.value)}>
          {ed.sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.questions} ข้อ)</option>)}
        </select>
      </label>

      <div style={{ fontWeight: 600, marginTop: '16px' }}>เลือกรูปแบบการสอบ</div>
      <div className="mode-grid">
        <label className={'mode-card' + (mode === 'real' ? ' on' : '')}>
          <input type="radio" checked={mode === 'real'} onChange={() => setMode('real')} />
          <div>
            <strong>โหมดสมจริง (จับเวลา)</strong>
            <span>จำลองสนามสอบจริง จับเวลาถอยหลัง และดูเฉลยหลังส่งข้อสอบเท่านั้น</span>
          </div>
        </label>
        <label className={'mode-card' + (mode === 'practice' ? ' on' : '')}>
          <input type="radio" checked={mode === 'practice'} onChange={() => setMode('practice')} />
          <div>
            <strong>โหมดฝึกซ้อม (ดูเฉลยทันที)</strong>
            <span>ไม่จำกัดเวลา ตรวจคำตอบและอ่านคำอธิบายละเอียดได้ทีละข้อ</span>
          </div>
        </label>
      </div>

      <div className="row">
        <Link className="btn ghost" to={`${b}/register`}>1. สมัครสอบ</Link>
        {cand ? (
          <>
            <Link className="btn ghost" to={`${b}/roster`}>2. รายชื่อผู้มีสิทธิ์สอบ</Link>
            <Link className="btn ghost" to={`${b}/admit-card`}>3. บัตรประจำตัวสอบ</Link>
          </>
        ) : (
          <button className="btn ghost" disabled>2–3 ต้องสมัครก่อน</button>
        )}
        <button className="btn" disabled={mode === 'real' && !cand} onClick={start}>4. เข้าห้องสอบ →</button>
      </div>
      {mode === 'real' && !cand && <p className="note">💡 โหมดสมจริงต้องกด &ldquo;1. สมัครสอบ&rdquo; เพื่อออกรหัสผู้เข้าสอบก่อน (หากต้องการทำทันทีสามารถเลือกโหมดฝึกซ้อมได้)</p>}
    </section>
  );
}

export function Register() {
  const p = useParams(); const { x, ed } = useEd(p); const nav = useNavigate();
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const k = `ep_cand_${x.id}_${ed.id}`; const old = load<Cand | null>(k, null);
  return (
    <form className="panel" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); save(k, { name: String(f.get('name')), seq: old?.seq ?? 1000 + Math.floor(Math.random() * 8999) }); nav(`/e/${x.id}/${ed.id}/roster`); }}>
      <small>ขั้นตอนที่ 1 จาก 4</small>
      <h2 style={{ margin: '4px 0 8px' }}>สมัครสอบ (จำลอง)</h2>
      <p className="note">{x.name} · {ed.position}</p>
      <label>ชื่อ-นามสกุลผู้เข้าสอบ (ใช้ชื่อสมมติได้ ไม่ต้องกรอกข้อมูลจริง)<input name="name" placeholder="เช่น สมชาย ใจดี" required defaultValue={old?.name} /></label>
      <label style={{ fontWeight: 400 }}><input type="checkbox" required /> ฉันเข้าใจว่านี่คือการสอบจำลองเพื่อฝึกซ้อม ไม่ใช่การสมัครสอบจริง</label>
      <div className="row">
        <Link className="btn ghost" to={`/e/${x.id}/${ed.id}`}>ย้อนกลับ</Link>
        <button className="btn">ยืนยันการสมัครสอบ →</button>
      </div>
    </form>
  );
}

export function Roster() {
  const p = useParams(); const { x, ed } = useEd(p); const [q, setQ] = useState('');
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const cand = load<Cand | null>(`ep_cand_${x.id}_${ed.id}`, null);
  if (!cand) return <Navigate to={`/e/${x.id}/${ed.id}/register`} replace />;
  const rows = roster(x, ed, cand).filter(r => r.name.includes(q) || r.code.includes(q));
  return (
    <section className="panel">
      <small>ขั้นตอนที่ 2 จาก 4</small>
      <h2 style={{ margin: '4px 0 6px' }}>ประกาศรายชื่อผู้มีสิทธิ์สอบ</h2>
      <p className="note">แถวที่ไฮไลต์สีเขียวคือชื่อของคุณ (รายชื่ออื่นเป็นชื่อสมมติที่ระบบสร้างขึ้นเพื่อจำลองบรรยากาศ)</p>
      <input placeholder="🔍 ค้นหาชื่อหรือรหัสประจำตัวสอบ…" value={q} onChange={e => setQ(e.target.value)} />
      <table>
        <tbody>
          {rows.map(r => (
            <tr key={r.code} className={r.me ? 'me' : ''}>
              <td>{r.code}</td>
              <td>{r.name} {r.me && '(คุณ)'}</td>
              <td>ห้อง {r.room}</td>
              <td>ที่นั่ง {r.seat}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <Link className="btn ghost" to={`/e/${x.id}/${ed.id}`}>กลับหน้าชุดข้อสอบ</Link>
        <Link className="btn" to={`/e/${x.id}/${ed.id}/admit-card`}>ดูบัตรประจำตัวผู้เข้าสอบ →</Link>
      </div>
    </section>
  );
}

export function Admit() {
  const p = useParams(); const { x, ed } = useEd(p);
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const cand = load<Cand | null>(`ep_cand_${x.id}_${ed.id}`, null);
  if (!cand) return <Navigate to={`/e/${x.id}/${ed.id}/register`} replace />;
  const me = roster(x, ed, cand).find(r => r.me)!;
  return (
    <>
      <div className="ticket">
        <div>
          <small>บัตรประจำตัวผู้เข้าสอบ (จำลอง)</small>
          <h2>{x.name} พ.ศ. {ed.year}</h2>
        </div>
        <dl>
          <dt>รหัสผู้เข้าสอบ</dt><dd className="code">{me.code}</dd>
          <dt>ชื่อ-นามสกุล</dt><dd>{me.name}</dd>
          <dt>ตำแหน่งที่สมัคร</dt><dd>{ed.position}</dd>
          <dt>ห้องสอบ / ที่นั่ง</dt><dd>ห้อง {me.room} · ที่นั่ง {me.seat}</dd>
          <dt>เวลาในการทำข้อสอบ</dt><dd>{ed.durationMinutes} นาที</dd>
        </dl>
      </div>
      <div className="row noprint">
        <button className="btn ghost" onClick={() => window.print()}>🖨️ พิมพ์ / บันทึก PDF</button>
        <Link className="btn" to={`/e/${x.id}/${ed.id}`}>กลับไปเข้าห้องสอบ →</Link>
      </div>
    </>
  );
}

export function Take() {
  const { aid } = useParams(); const nav = useNavigate();
  const [a, setA] = useState<Attempt | null>(() => load<Attempt | null>(`ep_att_${aid}`, null));
  const [qs, setQs] = useState<Q[]>(); const [i, setI] = useState(0); const [now, setNow] = useState(Date.now());
  const { x, ed } = useEd({ exam: a?.examId, edition: a?.editionId }); const fin = useRef(false);
  useEffect(() => { if (a) loadSet(a.examId, a.editionId, a.setId).then(s => setQs(s.questions)); }, [aid]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = a?.endAt ? Math.max(0, Math.round((a.endAt - now) / 1000)) : null;
  const upd = (pt: Partial<Attempt>) => { const n = { ...a!, ...pt }; save(`ep_att_${n.id}`, n); setA(n); };
  function finish() {
    if (fin.current || !a || !x || !ed || !qs) return; fin.current = true;
    const r = scorers[x.scoring](x, ed, qs, a.answers);
    save(`ep_att_${a.id}`, { ...a, submittedAt: Date.now(), summary: { score: r.score, label: r.band.label, color: r.band.color } });
    nav(`/attempt/${a.id}/result`);
  }
  useEffect(() => { if (left === 0) finish(); });
  if (!a) return <section className="panel"><p>ไม่พบการสอบนี้ <Link to="/">กลับหน้าแรก</Link></p></section>;
  if (a.submittedAt) return <Navigate to={`/attempt/${a.id}/result`} replace />;
  if (!qs || !x || !ed) return <section className="panel"><p>กำลังโหลดข้อสอบ…</p></section>;
  const q = qs[i], ans = a.answers[i], practice = a.mode === 'practice', flagged = a.flags.includes(i);
  const answeredCount = a.answers.filter(v => v !== null).length;
  return (
    <div className="exam">
      <div className="bar">
        <b>{x.short} {ed.year} · {practice ? 'โหมดฝึกซ้อม' : 'โหมดสมจริง'} (ตอบแล้ว {answeredCount}/{qs.length})</b>
        {left !== null && <span>⏱️ เหลือเวลา {mmss(left)}</span>}
      </div>
      <section className="panel">
        <small>หมวด: {x.sections.find(s => s.id === q.section)?.name} · ข้อที่ {i + 1} จาก {qs.length}</small>
        <h3>{q.stem}</h3>
        {q.choices.map((c, k) => (
          <label key={k} className={'opt' + (ans === k ? ' on' : '')}>
            <input type="radio" name={q.id} checked={ans === k} onChange={() => upd({ answers: a.answers.map((v, j) => (j === i ? k : v)) })} />
            <span><b>{String.fromCharCode(65 + k)}.</b> {c}</span>
          </label>
        ))}
        {practice && ans !== null && (
          <div className={'fb ' + (ans === q.answer ? 'ok' : 'bad')}>
            <b>{ans === q.answer ? '✓ ตอบถูกต้อง!' : `✗ ยังไม่ถูก — เฉลยคือ ${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}`}</b>
            <br />{q.explanation}
          </div>
        )}
        <div className="row">
          <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← ก่อนหน้า</button>
          <button className="btn ghost" onClick={() => upd({ flags: flagged ? a.flags.filter(f => f !== i) : [...a.flags, i] })}>
            {flagged ? '🚩 ยกเลิกปักธง' : '🏳️ ปักธงทบทวน'}
          </button>
          {i < qs.length - 1 ? (
            <button className="btn" onClick={() => setI(i + 1)}>ข้อถัดไป →</button>
          ) : (
            <button className="btn" onClick={() => confirm(`ยืนยันส่งข้อสอบ? (ยังไม่ได้ตอบ ${a.answers.filter(v => v === null).length} ข้อ)`) && finish()}>ส่งข้อสอบ ✓</button>
          )}
        </div>
      </section>
      <div className="nums">
        {qs.map((_, k) => (
          <button key={k} className={(k === i ? 'cur ' : '') + (a.answers[k] !== null ? 'ans ' : '') + (a.flags.includes(k) ? 'flag' : '')} onClick={() => setI(k)}>
            {k + 1}
          </button>
        ))}
      </div>
      {!practice && (
        <div className="row">
          <button className="btn ghost" onClick={() => confirm('ต้องการส่งข้อสอบตอนนี้เลยหรือไม่?') && finish()}>ส่งข้อสอบทันที</button>
        </div>
      )}
    </div>
  );
}

export function Result() {
  const { aid } = useParams(); const a = load<Attempt | null>(`ep_att_${aid}`, null);
  const { x, ed } = useEd({ exam: a?.examId, edition: a?.editionId });
  const [qs, setQs] = useState<Q[]>(); const [wo, setWo] = useState(false);
  useEffect(() => { if (a) loadSet(a.examId, a.editionId, a.setId).then(s => setQs(s.questions)); }, [aid]);
  if (!a?.submittedAt) return <section className="panel"><p>ไม่พบผลสอบ <Link to="/">กลับหน้าแรก</Link></p></section>;
  if (!x || !ed || !qs) return <section className="panel"><p>กำลังโหลดผลสอบ…</p></section>;
  const r = scorers[x.scoring](x, ed, qs, a.answers); const sn = (id: string) => x.sections.find(s => s.id === id)?.name ?? id;
  return (
    <>
      <section className="panel band" style={{ borderColor: r.band.color }}>
        <small>สรุปผลการสอบ · {x.name}</small>
        <h2 style={{ margin: '4px 0 8px', fontSize: '28px' }}>{r.band.label} · {r.score}/100 คะแนน</h2>
        <p style={{ margin: '0 0 8px' }}>เกณฑ์ผ่าน {ed.passScore} คะแนน (ทำได้ {Math.round(r.ratio * 100)}% ของเกณฑ์) · ใช้เวลา {mmss(Math.round((a.submittedAt - a.startedAt) / 1000))}</p>
        {r.weak.length > 0 && <p style={{ margin: 0 }}>📌 หัวข้อที่ควรทบทวนเป็นพิเศษ: <b>{r.weak.map(([t, n]) => `${t} (พลาด ${n} ข้อ)`).join(', ')}</b></p>}
      </section>
      {r.warn.length > 0 && (
        <section className="panel warn">
          <b>ข้อสังเกต:</b> หมวด {r.warn.map(sn).join(', ')} ได้คะแนนต่ำกว่าเกณฑ์ขั้นต่ำที่กำหนด{r.score >= ed.passScore ? ' แม้คะแนนรวมจะผ่านเกณฑ์' : ''}
        </section>
      )}
      <section className="panel">
        <h3 style={{ marginTop: 0 }}>คะแนนแยกตามหมวดวิชา</h3>
        {Object.entries(r.sec).map(([k, v]) => (
          <div key={k} className="meter">
            <span>{sn(k)}</span>
            <div><i style={{ width: `${v.pct}%` }} /></div>
            <b>{v.correct}/{v.total} ({v.pct}%)</b>
          </div>
        ))}
      </section>
      <label className="noprint" style={{ margin: '18px 4px' }}>
        <input type="checkbox" checked={wo} onChange={e => setWo(e.target.checked)} /> แสดงเฉพาะข้อที่ตอบผิดหรือไม่ได้ตอบ
      </label>
      {qs.map((q, i) => {
        const ok = a.answers[i] === q.answer; if (wo && ok) return null; const v = a.answers[i];
        return (
          <article key={q.id} className={'panel rev ' + (ok ? 'ok' : 'bad')}>
            <small>ข้อที่ {i + 1} · {sn(q.section)} · {q.topics.join(', ')}</small>
            <h4 style={{ margin: '6px 0 12px', fontSize: '17.5px' }}>{q.stem}</h4>
            <p style={{ margin: '4px 0' }}>คำตอบของคุณ: <b style={{ color: ok ? '#047857' : '#e11d48' }}>{v === null ? 'ไม่ได้ตอบ' : q.choices[v]}</b></p>
            <p style={{ margin: '4px 0' }}>เฉลยที่ถูกต้อง: <b style={{ color: '#047857' }}>{q.choices[q.answer]}</b></p>
            <p className="exp">
              <b>คำอธิบาย:</b> {q.explanation}
              {q.review && <><br /><small style={{ marginTop: '6px' }}>💡 หัวข้อที่ควรทบทวน: {q.review}</small></>}
            </p>
          </article>
        );
      })}
      <div className="row">
        <Link className="btn" to="/">เลือกทำข้อสอบชุดอื่น</Link>
        <Link className="btn ghost" to={`/e/${x.id}/${ed.id}`}>ทำชุดนี้อีกครั้ง</Link>
      </div>
    </>
  );
}

export function History() {
  const h = getHistory(); const [msg, setMsg] = useState('');
  const keys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.startsWith('ep_'));
  function exp() {
    const o: Record<string, string> = {}; keys().forEach(k => (o[k] = localStorage.getItem(k)!));
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })); l.download = 'Exam Thai Plus-backup.json'; l.click();
  }
  async function imp(f?: File) {
    if (!f) return;
    try { Object.entries(JSON.parse(await f.text()) as Record<string, string>).forEach(([k, v]) => k.startsWith('ep_') && localStorage.setItem(k, v)); location.reload(); } catch { setMsg('ไฟล์ไม่ถูกต้อง'); }
  }
  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>ประวัติการสอบและพัฒนาการ</h2>
      <p className="note">ข้อมูลการสอบถูกบันทึกไว้ในเบราว์เซอร์ของอุปกรณ์นี้ แนะนำให้กดสำรองข้อมูลเก็บไว้เป็นระยะ</p>
      {!h.length && <p style={{ padding: '24px 0', color: '#64748b' }}>ยังไม่มีประวัติการทำข้อสอบ เริ่มต้นลองทำข้อสอบชุดแรกได้ที่หน้าคลังข้อสอบ</p>}
      {h.length > 1 && (
        <div className="trend" aria-label="แนวโน้มคะแนน">
          {h.slice(0, 12).reverse().map(a => (
            <i key={a.id} title={`${a.summary?.score} คะแนน`} style={{ height: `${Math.max(8, a.summary?.score ?? 0)}%`, background: a.summary?.color }} />
          ))}
        </div>
      )}
      {h.map(a => (
        <div key={a.id} className="history-item">
          <div>
            <Link to={`/attempt/${a.id}/result`}>{new Date(a.submittedAt!).toLocaleString('th-TH')}</Link>
            <div className="note">{a.examId.toUpperCase()} · {a.editionId} · {a.setId} ({a.mode === 'real' ? 'โหมดสมจริง' : 'โหมดฝึกซ้อม'})</div>
          </div>
          <b style={{ color: a.summary?.color, fontFamily: 'Prompt, sans-serif' }}>{a.summary?.label} · {a.summary?.score} คะแนน</b>
        </div>
      ))}
      <div className="row">
        <button className="btn ghost" onClick={exp}>⬇️ สำรองข้อมูล (.json)</button>
        <label className="btn ghost" style={{ margin: 0 }}>
          ⬆️ นำเข้าข้อมูล
          <input type="file" accept=".json" hidden onChange={e => imp(e.target.files?.[0])} />
        </label>
        <button className="btn ghost" onClick={() => { if (confirm('ต้องการลบประวัติและข้อมูลทั้งหมดในเครื่องนี้หรือไม่?')) { keys().forEach(k => localStorage.removeItem(k)); location.reload(); } }}>🗑️ ล้างข้อมูล</button>
      </div>
      {msg && <p className="err">{msg}</p>}
    </section>
  );
}
