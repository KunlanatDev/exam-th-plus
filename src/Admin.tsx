import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ADMIN_EMAIL,
  AccessConfig,
  UserProfile,
  fetchAllUsersForAdmin,
  getSetAccess,
  loginOrRegisterWithEmail,
  loginWithGoogle,
  logoutUser,
  saveAccessConfig,
  toggleUserVipStatus,
  useAccessAndStats,
  useAuthProfile,
} from './firebase';
import { useCat } from './lib';

export function AuthPage() {
  const { user } = useAuthProfile();
  const nav = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setErr('');
    setBusy(true);
    const r = await loginWithGoogle();
    setBusy(false);
    if (r.ok) nav('/');
    else setErr(r.error || 'เข้าสู่ระบบไม่สำเร็จ');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await loginOrRegisterWithEmail(tab, email, pass, name);
    setBusy(false);
    if (r.ok) nav('/');
    else setErr(r.error || 'ไม่สามารถเข้าสู่ระบบได้');
  }

  if (user) {
    return (
      <section className="panel" style={{ maxWidth: 540, margin: '0 auto' }}>
        <div className="user-badge-head">
          <div className="avatar-circle">{user.displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <small>บัญชีผู้ใช้งานปัจจุบัน</small>
            <h2 style={{ margin: '2px 0' }}>{user.displayName}</h2>
            <div className="note">{user.email}</div>
          </div>
        </div>
        <div className="card-meta" style={{ marginTop: 16 }}>
          <span className="meta-pill">
            สถานะ: {user.role === 'admin' ? '👑 ผู้ดูแลระบบ (Admin)' : user.isVip ? '💎 สมาชิก VIP (ปลดล็อกทุกชุด)' : '👤 สมาชิกทั่วไป (Free)'}
          </span>
          <span className="meta-pill">📊 เข้าใช้งานแล้ว {user.loginCount} ครั้ง</span>
        </div>
        {user.note && <p className="fb ok">หมายเหตุสิทธิ์พิเศษ: <b>{user.note}</b></p>}
        <div className="row">
          <Link className="btn" to="/">ไปหน้าคลังข้อสอบ →</Link>
          {user.role === 'admin' && <Link className="btn ghost" to="/admin">⚙️ จัดการระบบ (Admin)</Link>}
          <button className="btn ghost" onClick={() => logoutUser()}>ออกจากระบบ</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" style={{ maxWidth: 480, margin: '0 auto' }}>
      <small>EXAMTHPLUS ACCOUNT</small>
      <h2 style={{ margin: '4px 0 8px' }}>{tab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}</h2>
      <p className="note">เข้าสู่ระบบเพื่อบันทึกคะแนนสอบ ดูสถิติพัฒนาการ และปลดล็อกชุดข้อสอบ VIP</p>

      <button type="button" className="btn google-btn" disabled={busy} onClick={onGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        ดำเนินการต่อด้วยบัญชี Google
      </button>

      <div className="divider"><span>หรือใช้อีเมล</span></div>

      <div className="chips" style={{ margin: '12px 0' }}>
        <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>เข้าสู่ระบบ</button>
        <button type="button" className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>สมัครสมาชิก</button>
      </div>

      <form onSubmit={onSubmit}>
        {tab === 'register' && (
          <label>
            ชื่อที่ใช้แสดง
            <input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น คุณสมชาย / คุณแฟน" required />
          </label>
        )}
        <label>
          อีเมล
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} required />
        </label>
        {err && <p className="fb bad">{err}</p>}
        <div className="row">
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {tab === 'login' ? 'เข้าสู่ระบบด้วยอีเมล →' : 'ยืนยันสมัครสมาชิก →'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function AdminPage() {
  const { user } = useAuthProfile();
  const { access, stats } = useAccessAndStats();
  const c = useCat();
  const [cfg, setCfg] = useState<AccessConfig>(access);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vipEmail, setVipEmail] = useState('');
  const [vipNote, setVipNote] = useState('แฟนใช้ฟรีตลอดชีพ ❤️');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setCfg(access);
  }, [access]);

  useEffect(() => {
    fetchAllUsersForAdmin().then(setUsers);
  }, [access]);

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function persist(next: AccessConfig, msg = '✓ บันทึกการตั้งค่าเรียบร้อยแล้ว') {
    setCfg(next);
    await saveAccessConfig(next);
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3500);
  }

  function addVip(e: FormEvent) {
    e.preventDefault();
    const clean = vipEmail.trim().toLowerCase();
    if (!clean) return;
    const filtered = (cfg.vipList || []).filter(v => v.email.toLowerCase() !== clean);
    const next: AccessConfig = {
      ...cfg,
      vipList: [{ email: clean, note: vipNote.trim() || 'สิทธิ์ VIP พิเศษ', addedAt: Date.now() }, ...filtered],
    };
    setVipEmail('');
    persist(next, `✓ เพิ่มสิทธิ์ VIP ให้ ${clean} เรียบร้อยแล้ว!`);
  }

  function removeVip(emailToRemove: string) {
    const next: AccessConfig = {
      ...cfg,
      vipList: (cfg.vipList || []).filter(v => v.email.toLowerCase() !== emailToRemove.toLowerCase()),
      vipEmails: (cfg.vipEmails || []).filter(e => e.toLowerCase() !== emailToRemove.toLowerCase()),
    };
    persist(next, `ลบสิทธิ์ VIP ของ ${emailToRemove} แล้ว`);
  }

  function toggleSetFree(key: string, currentFree: boolean, currentPrice: number) {
    const next: AccessConfig = {
      ...cfg,
      setRules: {
        ...(cfg.setRules || {}),
        [key]: { isFree: !currentFree, price: currentPrice || cfg.defaultPaidPrice || 99 },
      },
    };
    persist(next);
  }

  function updateSetPrice(key: string, currentFree: boolean, price: number) {
    const next: AccessConfig = {
      ...cfg,
      setRules: {
        ...(cfg.setRules || {}),
        [key]: { isFree: currentFree, price: Math.max(0, price) },
      },
    };
    persist(next);
  }

  if (!user || !isAdmin) {
    return (
      <section className="panel">
        <h2>🔒 เฉพาะผู้ดูแลระบบ (Admin Only)</h2>
        <p>กรุณาเข้าสู่ระบบด้วยอีเมลผู้ดูแลระบบ (<b>{ADMIN_EMAIL}</b>) เพื่อจัดการสิทธิ์ผู้ใช้และชุดข้อสอบ</p>
        <div className="row">
          <Link className="btn" to="/login">ไปหน้าเข้าสู่ระบบ →</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-wrap">
      <section className="hero" style={{ gridTemplateColumns: '1fr', padding: '28px 32px' }}>
        <div className="hero-content">
          <div className="hero-badge">👑 ADMIN CONSOLE · EXAMTHPLUS</div>
          <h1 style={{ fontSize: '30px', marginBottom: 6 }}>ระบบจัดการสิทธิ์ VIP, ราคาข้อสอบ และสถิติผู้ใช้งาน</h1>
          <p>กำหนดให้บางชุดสอบฟรี บางชุดเสียค่าลิขสิทธิ์ และเพิ่มอีเมลคนพิเศษ (เช่น แฟน/เพื่อน) ให้ใช้งานฟรีได้ทันที</p>
        </div>
      </section>

      {savedMsg && <div className="fb ok" style={{ marginBottom: 18, fontWeight: 600 }}>{savedMsg}</div>}

      {/* 1. Real-time Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <small>🟢 กำลังออนไลน์ขณะนี้</small>
          <strong>{stats.onlineUsers} คน</strong>
          <span>Active ในช่วง 5 นาทีล่าสุด</span>
        </div>
        <div className="stat-card">
          <small>📈 จำนวนเข้าใช้งานสะสม</small>
          <strong>{stats.totalVisits} ครั้ง</strong>
          <span>นับจำนวน Session ที่เข้าเว็บ</span>
        </div>
        <div className="stat-card">
          <small>👥 สมาชิกที่ล็อกอินแล้ว</small>
          <strong>{Math.max(users.length, stats.totalUsers)} คน</strong>
          <span>บันทึกในระบบฐานข้อมูล</span>
        </div>
        <div className="stat-card">
          <small>💎 รายชื่อ VIP ใช้ฟรีพิเศษ</small>
          <strong>{(cfg.vipList || []).length} คน</strong>
          <span>ปลดล็อกข้อสอบทุกชุดอัตโนมัติ</span>
        </div>
      </div>

      {/* 2. Manual VIP Whitelist (e.g. Girlfriend / Friends / Paid Customers) */}
      <section className="panel">
        <small>MANUAL VIP CONFIG</small>
        <h2 style={{ margin: '4px 0 8px' }}>❤️ กำหนดสิทธิ์ใช้งานฟรีรายบุคคล (VIP Whitelist)</h2>
        <p className="note">
          ใส่อีเมลของแฟน เพื่อน หรือลูกค้าที่โอนเงินแล้วตรงนี้ได้เลย ทันทีที่เจ้าของอีเมลนี้กดล็อกอินเข้าเว็บ ระบบจะเปิดสิทธิ์ <b>💎 VIP ปลดล็อกทุกชุดฟรี</b> ให้อัตโนมัติ!
        </p>
        <form onSubmit={addVip} className="vip-form">
          <input
            type="email"
            placeholder="ระบุอีเมล เช่น fan@gmail.com"
            value={vipEmail}
            onChange={e => setVipEmail(e.target.value)}
            required
          />
          <input
            placeholder="หมายเหตุ เช่น แฟนใช้ฟรีตลอดชีพ ❤️ / โอนแล้ว 99บ."
            value={vipNote}
            onChange={e => setVipNote(e.target.value)}
          />
          <button className="btn">+ เพิ่มสิทธิ์ VIP</button>
        </form>

        <table>
          <thead>
            <tr>
              <th>อีเมลที่ได้สิทธิ์ VIP</th>
              <th>หมายเหตุ</th>
              <th>วันที่เพิ่ม</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {(cfg.vipList || []).map(v => (
              <tr key={v.email} className={v.email.toLowerCase() === ADMIN_EMAIL ? 'me' : ''}>
                <td><b>{v.email}</b></td>
                <td>{v.note}</td>
                <td>{new Date(v.addedAt).toLocaleDateString('th-TH')}</td>
                <td>
                  {v.email.toLowerCase() === ADMIN_EMAIL ? (
                    <span className="meta-pill">เจ้าของระบบ</span>
                  ) : (
                    <button type="button" className="btn ghost" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => removeVip(v.email)}>
                      ลบสิทธิ์
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 3. Free vs Paid Exam Sets Configuration */}
      <section className="panel">
        <small>MONETIZATION & EXAM ACCESS</small>
        <h2 style={{ margin: '4px 0 8px' }}>📚 ตั้งค่าโควตาทดลองสอบฟรี & ชุดข้อสอบ (Freemium Funnel)</h2>
        <p className="note">กำหนดจำนวนข้อให้คนทั่วไปทดลองทำฟรีโดยไม่ต้องล็อกอิน และจำนวนข้อฟรีเมื่อสมัครสมาชิก เพื่อจูงใจให้คนสมัครและอัปเกรดเป็น VIP</p>

        <div className="mode-grid" style={{ marginBottom: 18 }}>
          <label style={{ margin: 0 }}>
            ⚡ ทดลองสอบฟรี (ยังไม่ล็อกอิน) ได้กี่ข้อต่อชุด
            <input
              type="number"
              min={1}
              max={500}
              value={cfg.guestQuestionLimit ?? 10}
              onChange={e => setCfg({ ...cfg, guestQuestionLimit: Math.max(1, Number(e.target.value)) })}
            />
          </label>
          <label style={{ margin: 0 }}>
            🎁 สมัครสมาชิก/ล็อกอินฟรีแล้ว ทำชุดฟรีได้กี่ข้อ (ใส่ 230 = เต็มชุด)
            <input
              type="number"
              min={1}
              max={1000}
              value={cfg.memberFreeQuestionLimit ?? 50}
              onChange={e => setCfg({ ...cfg, memberFreeQuestionLimit: Math.max(1, Number(e.target.value)) })}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 0, marginBottom: 16 }}>
          <button type="button" className="btn" onClick={() => persist(cfg, '✓ บันทึกโควตาข้อสอบฟรีเรียบร้อยแล้ว')}>
            บันทึกโควตาทดลองสอบฟรี
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>วิชา / รอบสอบ</th>
              <th>ชุดข้อสอบ</th>
              <th>สถานะปัจจุบัน</th>
              <th>ราคาปลดล็อก (บาท)</th>
              <th>สลับสถานะ</th>
            </tr>
          </thead>
          <tbody>
            {c?.exams.flatMap(x =>
              x.editions.flatMap(ed =>
                ed.sets.map((s, idx) => {
                  const info = getSetAccess(cfg, null, x.id, ed.id, s.id, idx);
                  return (
                    <tr key={info.key}>
                      <td>
                        <b>{x.short} {ed.year}</b>
                        <div className="note">{ed.position}</div>
                      </td>
                      <td>
                        <b>{s.title}</b>
                        <div className="note">{s.questions} ข้อ</div>
                      </td>
                      <td>
                        {info.isFree ? (
                          <span className="status-pill free">🆓 เปิดให้สอบฟรี</span>
                        ) : (
                          <span className="status-pill pro">🔒 ล็อก (VIP / {info.price}฿)</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 120 }}>
                        <input
                          type="number"
                          min={0}
                          value={info.price}
                          onChange={e => updateSetPrice(info.key, info.isFree, Number(e.target.value))}
                          style={{ margin: 0, padding: '6px 10px' }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={info.isFree ? 'btn ghost' : 'btn'}
                          style={{ padding: '6px 14px', fontSize: 13.5 }}
                          onClick={() => toggleSetFree(info.key, info.isFree, info.price)}
                        >
                          {info.isFree ? 'เปลี่ยนเป็นเก็บเงิน 🔒' : 'เปลี่ยนเป็นเปิดฟรี 🆓'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </section>

      {/* 4. Payment & PromptPay QR Config */}
      <section className="panel">
        <small>PAYMENT SETTINGS</small>
        <h2 style={{ margin: '4px 0 8px' }}>💸 ตั้งค่ารับชำระเงิน (PromptPay QR & LINE รับแจ้งสลิป)</h2>
        <p className="note">เมื่อใส่เบอร์พร้อมเพย์หรือเลขบัตรประชาชน ระบบจะสร้าง QR Code พร้อมยอดเงินให้อัตโนมัติเวลาลูกค้ากดปลดล็อกข้อสอบ</p>
        <div className="mode-grid">
          <label style={{ margin: 0 }}>
            เบอร์โทรศัพท์ / เลขพร้อมเพย์ (10 หรือ 13 หลัก)
            <input
              placeholder="เช่น 0812345678"
              value={cfg.promptPayId || ''}
              onChange={e => setCfg({ ...cfg, promptPayId: e.target.value })}
            />
          </label>
          <label style={{ margin: 0 }}>
            LINE ID / ช่องทางส่งสลิปเพื่อเปิดสิทธิ์
            <input
              placeholder="เช่น @examthplus หรือลิงก์ LINE"
              value={cfg.contactLine || ''}
              onChange={e => setCfg({ ...cfg, contactLine: e.target.value })}
            />
          </label>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => persist(cfg)}>บันทึกช่องทางชำระเงิน</button>
        </div>
      </section>

      {/* 5. Registered Users Table */}
      <section className="panel">
        <small>USER ANALYTICS</small>
        <h2 style={{ margin: '4px 0 8px' }}>👥 รายชื่อผู้ใช้งานและสถิติการเข้าสอบ</h2>
        {!users.length ? (
          <p className="note">ยังไม่มีข้อมูลผู้ใช้งานที่ล็อกอิน</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ชื่อผู้ใช้</th>
                <th>อีเมล</th>
                <th>เข้าใช้งาน</th>
                <th>ใช้งานล่าสุด</th>
                <th>สิทธิ์ปัจจุบัน</th>
                <th>ปรับสิทธิ์ด่วน</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} className={u.isVip ? 'me' : ''}>
                  <td><b>{u.displayName}</b></td>
                  <td>{u.email}</td>
                  <td>{u.loginCount || 1} ครั้ง</td>
                  <td>{new Date(u.lastActiveAt).toLocaleString('th-TH')}</td>
                  <td>
                    {u.role === 'admin' ? (
                      <span className="status-pill pro">👑 Admin</span>
                    ) : u.isVip ? (
                      <span className="status-pill free">💎 VIP</span>
                    ) : (
                      <span className="meta-pill">ทั่วไป</span>
                    )}
                  </td>
                  <td>
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '4px 12px', fontSize: 13 }}
                        onClick={async () => {
                          await toggleUserVipStatus(u, !u.isVip, !u.isVip ? 'เปิดสิทธิ์โดย Admin' : '');
                          setUsers(await fetchAllUsersForAdmin());
                        }}
                      >
                        {u.isVip ? 'ยกเลิก VIP' : '+ ให้สิทธิ์ VIP ฟรี'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function UnlockModal({
  open,
  onClose,
  title,
  price,
  access,
  user,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  price: number;
  access: AccessConfig;
  user: UserProfile | null;
}) {
  if (!open) return null;
  const cleanPp = (access.promptPayId || '').replace(/\D/g, '');
  const qrUrl = cleanPp ? `https://promptpay.io/${cleanPp}/${price}.png` : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <small style={{ color: '#0066eb', fontWeight: 700 }}>💎 ปลดล็อกชุดข้อสอบพรีเมียม (VIP PASS)</small>
        <h2 style={{ margin: '4px 0 8px' }}>{title}</h2>
        <p className="note" style={{ marginBottom: 16 }}>
          ชุดข้อสอบนี้สงวนสิทธิ์สำหรับสมาชิก VIP เพื่อสนับสนุนค่าลิขสิทธิ์ในการพัฒนาคลังข้อสอบและระบบวิเคราะห์ผลสอบ
        </p>

        <div className="price-box">
          <div>
            <span>ค่าลิขสิทธิ์ปลดล็อกข้อสอบ</span>
            <strong>฿{price} บาท</strong>
          </div>
          <span className="status-pill free">ปลดล็อกครบทุกชุด ไม่จำกัดครั้ง</span>
        </div>

        {qrUrl && (
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <img src={qrUrl} alt="PromptPay QR Code" style={{ width: 190, height: 190, borderRadius: 12, border: '1px solid #cbd5e1' }} />
            <div className="note">สแกน QR Code PromptPay ยอด {price} บาท</div>
          </div>
        )}

        <div className="exp" style={{ marginTop: 12 }}>
          <b>วิธีรับสิทธิ์เข้าใช้งานทันที:</b>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 15 }}>
            <li>เข้าสู่ระบบด้วยอีเมลของคุณ {user ? `(ปัจจุบันคือ ${user.email})` : ''}</li>
            <li>ชำระค่าลิขสิทธิ์ {price} บาท และแจ้งอีเมลของคุณที่ LINE: <b>{access.contactLine || ADMIN_EMAIL}</b></li>
            <li>เมื่อแอดมินอนุมัติอีเมลแล้ว ระบบจะปลดล็อกชุดข้อสอบให้ทันที!</li>
          </ol>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" className="btn ghost" onClick={onClose}>ปิดหน้าต่าง</button>
          {!user ? (
            <Link className="btn" to="/login" onClick={onClose}>เข้าสู่ระบบ / สมัครสมาชิก →</Link>
          ) : (
            <Link className="btn" to="/contact" onClick={onClose}>แจ้งโอนเงิน / ติดต่อแอดมิน →</Link>
          )}
        </div>
      </div>
    </div>
  );
}

