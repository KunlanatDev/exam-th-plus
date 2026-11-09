import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { UnlockModal } from './Admin';
import { getSetAccess, syncAttemptToCloud, useAccessAndStats, useAuthProfile } from './firebase';
import {
  Attempt,
  Q,
  SOON,
  SRC,
  findInProgressAttempt,
  getHistory,
  getInProgressAttempts,
  load,
  loadCand,
  loadSet,
  mmss,
  roster,
  save,
  saveCand,
  scorers,
  useCat,
  useEd,
} from './lib';

export function Home() {
  const c = useCat();
  const [sel, setSel] = useState('all');
  const { user } = useAuthProfile();
  const { access, stats } = useAccessAndStats();

  const last = getHistory()[0];
  const inProg = getInProgressAttempts()[0];
  const guestLimit = access.guestQuestionLimit ?? 10;
  const memberLimit = access.memberFreeQuestionLimit ?? 50;

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🎓 LEARN • PRACTICE • PASS</div>
          <h1>ซ้อมสอบเสมือนจริง<br /><span>ตั้งแต่สมัครจนรู้ผล</span></h1>
          <p>เตรียมความพร้อมด้วยระบบจำลองการสอบครบวงจร ทดลองทำข้อสอบพร้อมเฉลยละเอียดได้ทันทีโดยไม่ต้องล็อกอิน!</p>
          <div className="hero-pills">
            <span className="hero-pill">🟢 กำลังออนไลน์ {stats.onlineUsers} คน</span>
            <span className="hero-pill">📈 เข้าสอบสะสม {stats.totalVisits.toLocaleString('th-TH')} ครั้ง</span>
            <span className="hero-pill">⚡ ทดลองสอบฟรี {guestLimit} ข้อ ไม่ต้องล็อกอิน</span>
          </div>
        </div>
        <div className="hero-card" aria-hidden="true">
          <div className="hero-card-title">
            <span>สิทธิพิเศษสมาชิก</span>
            <span style={{ color: '#34d399' }}>ExamTHPlus</span>
          </div>
          <div className="hero-steps">
            <div className="hero-step"><i>1</i><span><b>ไม่ต้องล็อกอิน:</b> ทดลองทำฟรี {guestLimit} ข้อแรก</span></div>
            <div className="hero-step"><i>2</i><span><b>ล็อกอินฟรี:</b> ปลดล็อกชุดฟรีเพิ่มเป็น {memberLimit} ข้อ</span></div>
            <div className="hero-step"><i>3</i><span><b>จำแคชอัตโนมัติ:</b> ทำค้างไว้กลับมาทำต่อได้ทันที</span></div>
            <div className="hero-step"><i>💎</i><span><b>สมาชิก VIP:</b> ปลดล็อกครบทุกชุด ทุกข้อ ไม่จำกัด</span></div>
          </div>
        </div>
      </section>

      {/* Freemium Incentive Strip */}
      <div className="tier-strip">
        <div className={'tier-box' + (!user ? ' active' : '')}>
          <span className="tier-tag">STEP 1 · ผู้เยี่ยมชมทั่วไป</span>
          <strong>⚡ ทดลองสอบฟรี {guestLimit} ข้อ</strong>
          <p>ลองทำข้อสอบและดูเฉลยละเอียดได้ทันที ไม่ต้องสมัครสมาชิก</p>
        </div>
        <div className={'tier-box' + (user && !user.isVip ? ' active' : '')}>
          <span className="tier-tag">STEP 2 · สมัครสมาชิกฟรี</span>
          <strong>🎁 รับฟรี 1 ชุด ({memberLimit} ข้อ)</strong>
          <p>บันทึกประวัติคะแนน และจำข้อที่ทำค้างไว้กลับมาทำต่อได้</p>
          {!user && <Link to="/login" className="tier-link">สมัคร / เข้าสู่ระบบฟรี →</Link>}
        </div>
        <div className={'tier-box' + (user?.isVip ? ' active' : '')}>
          <span className="tier-tag">STEP 3 · สมาชิก VIP PASS</span>
          <strong>💎 ปลดล็อกครบทุกชุด 100%</strong>
          <p>ทำข้อสอบครบทุกข้อ (230 ข้อ/ชุด) ทุกตำแหน่ง ไม่จำกัดครั้ง</p>
          {user?.isVip && <span className="status-pill free" style={{ marginTop: 6 }}>✓ คุณเป็นสมาชิก VIP แล้ว</span>}
        </div>
      </div>

      {!c ? (
        <section className="panel"><p>กำลังโหลดคลังข้อสอบ…</p></section>
      ) : (
        <>
          <div className="chips">
            <button className={sel === 'all' ? 'on' : ''} onClick={() => setSel('all')}>ทั้งหมด</button>
            {c.exams.map(x => <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setSel(x.id)}>{x.short}</button>)}
            {SOON.map(s => <button key={s} disabled>{s} (เร็วๆ นี้)</button>)}
          </div>

          {inProg && (
            <Link to={`/attempt/${inProg.id}`} className="recent-banner" style={{ borderColor: '#f59e0b', borderLeftColor: '#f59e0b', background: 'linear-gradient(90deg, #fef3c7 0%, #ffffff 100%)' }}>
              <div>
                <small style={{ color: '#b45309', fontWeight: 700 }}>⏳ ข้อสอบที่ทำค้างไว้ล่าสุด (ระบบจำแคชไว้ให้แล้ว)</small>
                <div style={{ fontWeight: 700, fontSize: '17px' }}>
                  ค้างอยู่ที่ข้อ {(inProg.lastIndex ?? 0) + 1} · ตอบแล้ว {inProg.answers.filter(v => v !== null).length}/{inProg.answers.length} ข้อ ({inProg.mode === 'real' ? 'โหมดสมจริง' : 'โหมดฝึกซ้อม'})
                </div>
              </div>
              <span className="btn" style={{ padding: '8px 16px', fontSize: '14px' }}>▶️ สอบต่อจากข้อเดิม →</span>
            </Link>
          )}

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
                {x.editions.map(ed => {
                  const firstSet = ed.sets[0];
                  const firstAcc = getSetAccess(access, user, x.id, ed.id, firstSet.id, 0, firstSet.questions);
                  return (
                    <article className="card" key={ed.id} style={{ borderTop: `5px solid ${x.color}` }}>
                      <div>
                        <small>พ.ศ. {ed.year} รอบ {ed.round} · ที่มา: {SRC[ed.source] ?? ed.source}</small>
                        <h3>{ed.position}</h3>
                        <div className="card-meta">
                          <span className="meta-pill">📚 {ed.sets.length} ชุด ({firstSet.questions} ข้อ)</span>
                          <span className="meta-pill">⏱️ {ed.durationMinutes} นาที</span>
                          {firstAcc.isVipUser ? (
                            <span className="status-pill free">💎 VIP ปลดล็อกครบ {firstSet.questions} ข้อ</span>
                          ) : !user ? (
                            <span className="status-pill free">⚡ ทดลองฟรี {firstAcc.allowedQuestions} ข้อแรก</span>
                          ) : (
                            <span className="status-pill free">🎁 สมาชิกทำฟรี {firstAcc.allowedQuestions} ข้อ</span>
                          )}
                        </div>
                      </div>
                      <Link className="btn" to={`/e/${x.id}/${ed.id}`}>
                        {!user ? `⚡ ทดลองทำข้อสอบฟรี →` : `เลือกชุดข้อสอบ →`}
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

export function Detail() {
  const p = useParams();
  const { x, ed } = useEd(p);
  const nav = useNavigate();
  const { user } = useAuthProfile();
  const { access } = useAccessAndStats();
  const [sid, setSid] = useState('');
  const [mode, setMode] = useState<'real' | 'practice'>('practice');
  const [showPay, setShowPay] = useState(false);

  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const b = `/e/${x.id}/${ed.id}`;

  // โหลดข้อมูลผู้สมัครจากแคช หรือสร้างชื่อเริ่มต้นให้เลยเพื่อให้ทดลองสอบได้ทันทีไม่ต้องกรอกใหม่
  let cand = loadCand(x.id, ed.id);
  if (!cand) {
    cand = { name: user?.displayName || 'ผู้เข้าสอบจำลอง', seq: 1000 + Math.floor(Math.random() * 8999) };
    saveCand(x.id, ed.id, cand);
  }

  const setIndex = Math.max(0, ed.sets.findIndex(s => s.id === sid));
  const set = ed.sets[setIndex] ?? ed.sets[0];
  const accessInfo = getSetAccess(access, user, x.id, ed.id, set.id, setIndex, set.questions);
  const existingAttempt = findInProgressAttempt(x.id, ed.id, set.id);

  function resumeExam() {
    if (!accessInfo.isUnlocked) {
      setShowPay(true);
      return;
    }
    if (existingAttempt) {
      nav(`/attempt/${existingAttempt.id}`);
    }
  }

  function startNewExam(confirmReset = false) {
    if (!accessInfo.isUnlocked) {
      setShowPay(true);
      return;
    }
    if (confirmReset && existingAttempt) {
      if (!confirm('คุณมีข้อสอบที่ทำค้างไว้อยู่ ต้องการล้างคำตอบเดิมแล้วเริ่มทำใหม่ตั้งแต่ข้อ 1 หรือไม่?')) return;
      localStorage.removeItem(`ep_att_${existingAttempt.id}`);
    }
    const now = Date.now();
    const a: Attempt = {
      id: String(now),
      examId: x!.id,
      editionId: ed!.id,
      setId: set.id,
      mode,
      answers: Array(set.questions).fill(null),
      flags: [],
      lastIndex: 0,
      updatedAt: now,
      startedAt: now,
      endAt: mode === 'real' ? now + ed!.durationMinutes * 60000 : null,
    };
    save(`ep_att_${a.id}`, a);
    nav(`/attempt/${a.id}`);
  }

  return (
    <section className="panel">
      <small>{x.name} · พ.ศ. {ed.year} รอบ {ed.round}</small>
      <h2 style={{ margin: '4px 0 12px' }}>{ed.position}</h2>
      <div className="card-meta">
        <span className="meta-pill">⏱️ เวลาสอบ {ed.durationMinutes} นาที</span>
        <span className="meta-pill">🎯 เกณฑ์ผ่าน {ed.passScore}/100</span>
        <span className="meta-pill">👤 ผู้เข้าสอบ: {cand.name}</span>
        {accessInfo.isVipUser ? (
          <span className="status-pill free">💎 สิทธิ์ VIP ปลดล็อกครบ {set.questions} ข้อ</span>
        ) : accessInfo.isUnlocked ? (
          <span className="status-pill free">
            {!user
              ? `⚡ ทดลองสอบฟรีได้ ${accessInfo.allowedQuestions}/${set.questions} ข้อ`
              : `🎁 สิทธิ์สมาชิกฟรีทำได้ ${accessInfo.allowedQuestions}/${set.questions} ข้อ`}
          </span>
        ) : (
          <span className="status-pill pro">🔒 ชุดข้อสอบ VIP (฿{accessInfo.price})</span>
        )}
      </div>
      {ed.notes && <p className="note">{ed.notes}</p>}

      {/* Banner จูงใจให้ Register/Login หรืออัปเกรด VIP */}
      {!user && accessInfo.isFree && (
        <div className="incentive-bar">
          <div>
            <b>🎁 สิทธิพิเศษสำหรับสมาชิกใหม่!</b> ตอนนี้คุณสามารถทดลองทำฟรีได้ทันที <b>{accessInfo.guestLimit} ข้อแรก</b> — หากกดสมัครสมาชิก/เข้าสู่ระบบฟรี จะปลดล็อกเพิ่มเป็น <b>{ Math.min(set.questions, accessInfo.memberLimit) } ข้อ</b> ทันที!
          </div>
          <Link to="/login" className="btn ghost" style={{ padding: '6px 14px', fontSize: 13.5 }}>สมัคร / เข้าสู่ระบบฟรี →</Link>
        </div>
      )}
      {user && !accessInfo.isVipUser && accessInfo.allowedQuestions < set.questions && (
        <div className="incentive-bar">
          <div>
            <b>💎 ปลดล็อกครบทั้ง {set.questions} ข้อ!</b> สิทธิ์สมาชิกฟรีทำได้ <b>{accessInfo.allowedQuestions} ข้อแรก</b> อัปเกรดเป็นสมาชิก VIP เพื่อปลดล็อกข้อที่เหลือและชุดข้อสอบทั้งหมด
          </div>
          <button type="button" className="btn ghost" style={{ padding: '6px 14px', fontSize: 13.5 }} onClick={() => setShowPay(true)}>
            ดูวิธีปลดล็อก VIP (฿{accessInfo.price})
          </button>
        </div>
      )}

      <label>
        เลือกชุดข้อสอบ
        <select value={set.id} onChange={e => setSid(e.target.value)}>
          {ed.sets.map((s, idx) => {
            const inf = getSetAccess(access, user, x.id, ed.id, s.id, idx, s.questions);
            const inP = findInProgressAttempt(x.id, ed.id, s.id);
            const tag = inf.isVipUser
              ? `💎 ปลดล็อกครบ ${s.questions} ข้อ`
              : inf.isUnlocked
                ? !user
                  ? `⚡ ทดลองฟรี ${inf.allowedQuestions} ข้อ`
                  : `🎁 ฟรี ${inf.allowedQuestions} ข้อ`
                : `🔒 VIP ${inf.price}฿`;
            const progTxt = inP ? ` — ⏳ ทำค้างไว้ (ข้อ ${(inP.lastIndex ?? 0) + 1})` : '';
            return (
              <option key={s.id} value={s.id}>
                [{tag}] {s.title} (ทั้งหมด {s.questions} ข้อ){progTxt}
              </option>
            );
          })}
        </select>
      </label>

      {existingAttempt && (
        <div className="fb ok" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <b>⏳ พบข้อสอบที่คุณทำค้างไว้ในชุดนี้!</b>
            <div style={{ fontSize: 14.5 }}>
              ค้างอยู่ที่ข้อ <b>{(existingAttempt.lastIndex ?? 0) + 1}</b> · ตอบไปแล้ว <b>{existingAttempt.answers.filter(v => v !== null).length}</b> ข้อ ({existingAttempt.mode === 'real' ? 'โหมดสมจริง' : 'โหมดฝึกซ้อม'})
            </div>
          </div>
          <button type="button" className="btn" onClick={resumeExam}>
            ▶️ สอบต่อจากข้อ {(existingAttempt.lastIndex ?? 0) + 1} ทันที →
          </button>
        </div>
      )}

      <div style={{ fontWeight: 600, marginTop: '16px', color: 'var(--navy)' }}>เลือกรูปแบบการสอบ</div>
      <div className="mode-grid">
        <label className={'mode-card' + (mode === 'practice' ? ' on' : '')}>
          <input type="radio" checked={mode === 'practice'} onChange={() => setMode('practice')} />
          <div>
            <strong>โหมดฝึกซ้อม (ดูเฉลยทันที · แนะนำสำหรับทดลองเรียน)</strong>
            <span>ไม่จำกัดเวลา ตรวจคำตอบและอ่านคำอธิบายละเอียดได้ทีละข้อ</span>
          </div>
        </label>
        <label className={'mode-card' + (mode === 'real' ? ' on' : '')}>
          <input type="radio" checked={mode === 'real'} onChange={() => setMode('real')} />
          <div>
            <strong>โหมดสมจริง (จับเวลา)</strong>
            <span>จำลองสนามสอบจริง จับเวลาถอยหลัง และดูเฉลยหลังส่งข้อสอบเท่านั้น</span>
          </div>
        </label>
      </div>

      <div className="row">
        <Link className="btn ghost" to={`${b}/register`}>1. ชื่อผู้สมัคร ({cand.name})</Link>
        <Link className="btn ghost" to={`${b}/roster`}>2. รายชื่อผู้มีสิทธิ์สอบ</Link>
        <Link className="btn ghost" to={`${b}/admit-card`}>3. บัตรประจำตัวสอบ</Link>

        {!accessInfo.isUnlocked ? (
          <button className="btn" onClick={() => setShowPay(true)}>🔓 ปลดล็อกชุดข้อสอบนี้ (฿{accessInfo.price})</button>
        ) : existingAttempt ? (
          <>
            <button className="btn" onClick={resumeExam}>
              ▶️ สอบต่อจากเดิม (ข้อ {(existingAttempt.lastIndex ?? 0) + 1}) →
            </button>
            <button className="btn ghost" onClick={() => startNewExam(true)}>
              🔄 เริ่มทำใหม่ตั้งแต่ข้อ 1
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => startNewExam(false)}>
            {!user
              ? `⚡ เริ่มทดลองสอบฟรี (${accessInfo.allowedQuestions} ข้อ) →`
              : `4. เข้าห้องสอบ →`}
          </button>
        )}
      </div>

      <UnlockModal
        open={showPay}
        onClose={() => setShowPay(false)}
        title={`${x.short} · ${set.title}`}
        price={accessInfo.price}
        access={access}
        user={user}
      />
    </section>
  );
}

export function Register() {
  const p = useParams(); const { x, ed } = useEd(p); const nav = useNavigate();
  const { user } = useAuthProfile();
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const old = loadCand(x.id, ed.id);
  const defaultName = old?.name || user?.displayName || '';
  return (
    <form
      className="panel"
      onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        saveCand(x.id, ed.id, {
          name: String(f.get('name')).trim(),
          seq: old?.seq ?? 1000 + Math.floor(Math.random() * 8999),
        });
        nav(`/e/${x.id}/${ed.id}/roster`);
      }}
    >
      <small>ขั้นตอนที่ 1 จาก 4 (บันทึกแคชชื่ออัตโนมัติ)</small>
      <h2 style={{ margin: '4px 0 8px' }}>ข้อมูลผู้สมัครสอบ (จำลอง)</h2>
      <p className="note">{x.name} · {ed.position} — ระบบจะจำชื่อของคุณไว้ให้อัตโนมัติในการสอบครั้งถัดไป</p>
      <label>
        ชื่อ-นามสกุลผู้เข้าสอบ (ใช้ชื่อสมมติได้ ไม่ต้องกรอกข้อมูลจริง)
        <input name="name" placeholder="เช่น สมชาย ใจดี" required defaultValue={defaultName} />
      </label>
      <label style={{ fontWeight: 400 }}>
        <input type="checkbox" required defaultChecked /> ฉันเข้าใจว่านี่คือการสอบจำลองเพื่อฝึกซ้อม ไม่ใช่การสมัครสอบจริง
      </label>
      <div className="row">
        <Link className="btn ghost" to={`/e/${x.id}/${ed.id}`}>ย้อนกลับ</Link>
        <button className="btn">บันทึกและดูรายชื่อผู้มีสิทธิ์สอบ →</button>
      </div>
    </form>
  );
}

export function Roster() {
  const p = useParams(); const { x, ed } = useEd(p); const [q, setQ] = useState('');
  if (!x || !ed) return <section className="panel"><p>กำลังโหลด…</p></section>;
  const cand = loadCand(x.id, ed.id);
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
  const cand = loadCand(x.id, ed.id);
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
  const { user } = useAuthProfile();
  const { access } = useAccessAndStats();
  const [a, setA] = useState<Attempt | null>(() => load<Attempt | null>(`ep_att_${aid}`, null));
  const [qs, setQs] = useState<Q[]>();
  const [i, setI] = useState<number>(() => {
    const initial = load<Attempt | null>(`ep_att_${aid}`, null);
    return initial?.lastIndex ?? 0;
  });
  const [now, setNow] = useState(Date.now());
  const [showGateModal, setShowGateModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const { x, ed } = useEd({ exam: a?.examId, edition: a?.editionId }); const fin = useRef(false);

  useEffect(() => {
    if (a) {
      loadSet(a.examId, a.editionId, a.setId).then(s => {
        setQs(s.questions);
        if (typeof a.lastIndex === 'number' && a.lastIndex >= 0 && a.lastIndex < s.questions.length) {
          setI(a.lastIndex);
        }
      });
    }
  }, [aid]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = a?.endAt ? Math.max(0, Math.round((a.endAt - now) / 1000)) : null;

  const upd = (pt: Partial<Attempt>) => {
    const n: Attempt = { ...a!, ...pt, updatedAt: Date.now() };
    save(`ep_att_${n.id}`, n);
    setA(n);
  };

  function finish() {
    if (fin.current || !a || !x || !ed || !qs) return; fin.current = true;
    const r = scorers[x.scoring](x, ed, qs, a.answers);
    const done: Attempt = { ...a, lastIndex: i, updatedAt: Date.now(), submittedAt: Date.now(), summary: { score: r.score, label: r.band.label, color: r.band.color } };
    save(`ep_att_${a.id}`, done);
    syncAttemptToCloud(done, user);
    nav(`/attempt/${a.id}/result`);
  }
  useEffect(() => { if (left === 0) finish(); });
  if (!a) return <section className="panel"><p>ไม่พบการสอบนี้ <Link to="/">กลับหน้าแรก</Link></p></section>;
  if (a.submittedAt) return <Navigate to={`/attempt/${a.id}/result`} replace />;
  if (!qs || !x || !ed) return <section className="panel"><p>กำลังโหลดข้อสอบ…</p></section>;

  const setIdx = Math.max(0, ed.sets.findIndex(s => s.id === a.setId));
  const accessInfo = getSetAccess(access, user, x.id, ed.id, a.setId, setIdx, qs.length);
  const maxAllowed = accessInfo.allowedQuestions;

  const goQuestion = (nextIdx: number) => {
    if (nextIdx >= maxAllowed) {
      if (!user) setShowGateModal(true);
      else setShowVipModal(true);
      return;
    }
    setI(nextIdx);
    upd({ lastIndex: nextIdx });
  };

  const q = qs[i], ans = a.answers[i], practice = a.mode === 'practice', flagged = a.flags.includes(i);
  const answeredCount = a.answers.filter(v => v !== null).length;

  return (
    <div className="exam">
      <div className="bar">
        <b>
          {x.short} {ed.year} · {!user ? `โหมดทดลองฟรี (${maxAllowed} ข้อแรก)` : practice ? 'โหมดฝึกซ้อม' : 'โหมดสมจริง'} (ตอบแล้ว {answeredCount}/{maxAllowed})
        </b>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {left !== null && <span>⏱️ เหลือเวลา {mmss(left)}</span>}
          <Link to={`/e/${x.id}/${ed.id}`} style={{ color: '#93c5fd', fontSize: 13.5, textDecoration: 'none' }}>
            💾 พักสอบชั่วคราว
          </Link>
        </div>
      </div>

      {!user && (
        <div className="incentive-bar" style={{ marginBottom: 14 }}>
          <div>
            ⚡ <b>โหมดทดลองสอบฟรี ({maxAllowed} ข้อแรก):</b> สมัครสมาชิกหรือเข้าสู่ระบบฟรีตอนนี้ เพื่อปลดล็อกทำต่อถึงข้อที่ <b>{Math.min(qs.length, accessInfo.memberLimit)}</b> (คำตอบที่ทำไว้แล้วจะไม่หาย!)
          </div>
          <Link to="/login" className="btn" style={{ padding: '6px 14px', fontSize: 13 }}>🎁 สมัคร / ล็อกอินรับข้อสอบเพิ่ม →</Link>
        </div>
      )}

      <section className="panel">
        <small>หมวด: {x.sections.find(s => s.id === q.section)?.name} · ข้อที่ {i + 1} จาก {qs.length} (สิทธิ์ปัจจุบันทำได้ถึงข้อ {maxAllowed})</small>
        <h3>{q.stem}</h3>
        {q.choices.map((c, k) => (
          <label key={k} className={'opt' + (ans === k ? ' on' : '')}>
            <input
              type="radio"
              name={q.id}
              checked={ans === k}
              onChange={() => upd({ lastIndex: i, answers: a.answers.map((v, j) => (j === i ? k : v)) })}
            />
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
          <button className="btn ghost" disabled={i === 0} onClick={() => goQuestion(i - 1)}>← ก่อนหน้า</button>
          <button className="btn ghost" onClick={() => upd({ lastIndex: i, flags: flagged ? a.flags.filter(f => f !== i) : [...a.flags, i] })}>
            {flagged ? '🚩 ยกเลิกปักธง' : '🏳️ ปักธงทบทวน'}
          </button>
          {i + 1 < maxAllowed ? (
            <button className="btn" onClick={() => goQuestion(i + 1)}>ข้อถัดไป →</button>
          ) : maxAllowed < qs.length ? (
            <>
              <button className="btn" onClick={() => goQuestion(i + 1)}>
                {!user ? `🎁 ล็อกอินฟรีเพื่อทำข้อ ${i + 2} ต่อ →` : `💎 ปลดล็อก VIP เพื่อทำข้อ ${i + 2} ต่อ →`}
              </button>
              <button className="btn ghost" onClick={() => finish()}>ส่งตรวจคะแนน ({maxAllowed} ข้อที่ทำ)</button>
            </>
          ) : (
            <button className="btn" onClick={() => confirm(`ยืนยันส่งข้อสอบ? (ยังไม่ได้ตอบ ${a.answers.filter(v => v === null).length} ข้อ)`) && finish()}>ส่งข้อสอบ ✓</button>
          )}
        </div>
      </section>

      <div className="nums">
        {qs.map((_, k) => {
          const locked = k >= maxAllowed;
          return (
            <button
              key={k}
              className={(k === i ? 'cur ' : '') + (a.answers[k] !== null ? 'ans ' : '') + (a.flags.includes(k) ? 'flag ' : '') + (locked ? 'locked-num' : '')}
              onClick={() => goQuestion(k)}
              title={locked ? (!user ? 'เข้าสู่ระบบฟรีเพื่อปลดล็อก' : 'สำหรับสมาชิก VIP') : `ข้อที่ ${k + 1}`}
            >
              {locked ? `🔒` : k + 1}
            </button>
          );
        })}
      </div>

      <div className="row">
        <Link className="btn ghost" to={`/e/${x.id}/${ed.id}`}>💾 บันทึกและพักการสอบไว้ก่อน</Link>
        <button className="btn ghost" onClick={() => confirm('ต้องการส่งข้อสอบเพื่อดูผลคะแนนตอนนี้เลยหรือไม่?') && finish()}>ส่งตรวจผลสอบทันที</button>
      </div>

      {/* Modal ชวนสมัครสมาชิก/ล็อกอินฟรี เมื่อทำครบโควตาทดลองสอบ */}
      {showGateModal && (
        <div className="modal-backdrop" onClick={() => setShowGateModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <small style={{ color: '#00b86b', fontWeight: 700 }}>🎁 ปลดล็อกข้อสอบฟรีเพิ่มทันที!</small>
            <h2 style={{ margin: '4px 0 8px' }}>คุณทดลองทำครบ {maxAllowed} ข้อแล้ว 🎉</h2>
            <p className="note" style={{ fontSize: 15.5, color: 'var(--ink-2)' }}>
              เพียงสมัครสมาชิกหรือเข้าสู่ระบบฟรีตอนนี้ รับสิทธิ์ปลดล็อกทำข้อสอบชุดนี้ต่อได้ถึง <b>{Math.min(qs.length, accessInfo.memberLimit)} ข้อ</b> ฟรีทันที!
            </p>
            <div className="exp">
              ✓ <b>คำตอบทั้ง {answeredCount} ข้อที่คุณทำไว้แล้วจะถูกบันทึกไว้ครบ</b> สามารถกลับมาทำต่อจากข้อที่ {maxAllowed + 1} ได้เลยไม่ต้องเริ่มใหม่!
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btn ghost" onClick={() => finish()}>ส่งตรวจเฉพาะ {maxAllowed} ข้อนี้</button>
              <Link className="btn" to="/login">🎁 สมัคร / เข้าสู่ระบบฟรีเพื่อทำต่อ →</Link>
            </div>
          </div>
        </div>
      )}

      <UnlockModal
        open={showVipModal}
        onClose={() => setShowVipModal(false)}
        title={`${x.short} · ปลดล็อกครบทั้ง ${qs.length} ข้อ`}
        price={accessInfo.price}
        access={access}
        user={user}
      />
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
