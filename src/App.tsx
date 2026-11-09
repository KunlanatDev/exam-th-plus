import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Home, Detail, Register, Roster, Admit, Take, Result, History } from './pages';
import Contact from './Contact';

const logoSrc = `${import.meta.env.BASE_URL}images/exam-thai-plus-logo.png`;

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="ExamTHPlus หน้าแรก">
      <img src={logoSrc} alt="ExamTHPlus – Learn · Practice · Pass" className="logo-img" />
    </Link>
  );
}

export default function App() {
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <Logo />
          <nav>
            <NavLink to="/" end>คลังข้อสอบ</NavLink>
            <NavLink to="/history">ประวัติการสอบ</NavLink>
            <NavLink to="/contact">ติดต่อเรา</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/e/:exam/:edition" element={<Detail />} />
          <Route path="/e/:exam/:edition/register" element={<Register />} />
          <Route path="/e/:exam/:edition/roster" element={<Roster />} />
          <Route path="/e/:exam/:edition/admit-card" element={<Admit />} />
          <Route path="/attempt/:aid" element={<Take />} />
          <Route path="/attempt/:aid/result" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<section className="panel"><h2>ไม่พบหน้านี้</h2><p><Link className="btn" to="/">กลับหน้าแรก</Link></p></section>} />
        </Routes>
      </main>
      <footer>
        <div className="footer-inner">
          <img src={logoSrc} alt="ExamTHPlus" className="footer-logo" />
          <div>ExamTHPlus (Learn · Practice · Pass) · ระบบจำลองการสอบเพื่อการฝึกซ้อม ไม่ใช่เว็บไซต์ทางการของหน่วยงานใด · พัฒนาโดย KLNP Develop</div>
        </div>
      </footer>
    </>
  );
}
