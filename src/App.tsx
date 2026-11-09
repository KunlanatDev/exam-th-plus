import { useEffect } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage, AuthPage } from './Admin';
import Contact from './Contact';
import { ADMIN_EMAIL, recordVisitAndHeartbeat, useAccessAndStats, useAuthProfile } from './firebase';
import { Admit, Detail, History, Home, Register, Result, Roster, Take } from './pages';

const logoSrc = `${import.meta.env.BASE_URL}images/exam-thai-plus-logo.png`;

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="ExamTHPlus หน้าแรก">
      <img src={logoSrc} alt="ExamTHPlus – Learn · Practice · Pass" className="logo-img" />
    </Link>
  );
}

export default function App() {
  const { user } = useAuthProfile();
  const { stats } = useAccessAndStats();
  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    recordVisitAndHeartbeat();
    const id = setInterval(() => recordVisitAndHeartbeat(), 120000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <Logo />
          <div className="nav-wrap">
            <span className="online-pill" title={`เข้าชมสะสม ${stats.totalVisits} ครั้ง`}>
              <i className="dot" /> ออนไลน์ {stats.onlineUsers} คน
            </span>
            <nav>
              <NavLink to="/" end>คลังข้อสอบ</NavLink>
              <NavLink to="/history">ประวัติ</NavLink>
              <NavLink to="/contact">ติดต่อ</NavLink>
              {isAdmin && <NavLink to="/admin">⚙️ Admin</NavLink>}
              <NavLink to="/login" className="account-link">
                {user ? (
                  <>
                    {user.isVip ? '💎 ' : '👤 '}
                    {user.displayName.split(' ')[0]}
                  </>
                ) : (
                  '🎁 สมัครฟรี / เข้าสู่ระบบ'
                )}
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/e/:exam/:edition" element={<Detail />} />
          <Route path="/e/:exam/:edition/register" element={<Register />} />
          <Route path="/e/:exam/:edition/roster" element={<Roster />} />
          <Route path="/e/:exam/:edition/admit-card" element={<Admit />} />
          <Route path="/attempt/:aid" element={<Take />} />
          <Route path="/attempt/:aid/result" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer>
        <div className="footer-inner">
          <img src={logoSrc} alt="ExamTHPlus" className="footer-logo" />
          <div>
            ExamTHPlus (Learn · Practice · Pass) · เข้าใช้งานสะสม {stats.totalVisits.toLocaleString('th-TH')} ครั้ง · พัฒนาโดย KLNP Develop
          </div>
        </div>
      </footer>
    </>
  );
}
