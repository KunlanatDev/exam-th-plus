import { FormEvent, useState } from 'react';

export default function Contact() {
  const [st, setSt] = useState('');
  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    f.append('access_key', import.meta.env.VITE_WEB3FORMS_KEY || '');
    f.append('subject', 'Exam Plus – ข้อความใหม่');
    setSt('กำลังส่ง…');
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: f }).then(x => x.json());
      setSt(r.success ? '✓ ส่งข้อความเรียบร้อยแล้ว ขอบคุณสำหรับคำแนะนำครับ' : 'ส่งไม่สำเร็จ: ' + r.message);
      if (r.success) ev.currentTarget.reset();
    } catch { setSt('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'); }
  }
  return (
    <form className="panel" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>ติดต่อเรา / แจ้งข้อสอบผิดพลาด</h2>
      <p className="note">พบข้อผิดพลาดในโจทย์ เฉลย หรือต้องการแนะนำฟีเจอร์เพิ่มเติม สามารถส่งข้อความถึงผู้พัฒนาได้โดยตรง</p>
      <input type="checkbox" name="botcheck" style={{ display: 'none' }} tabIndex={-1} />
      <label>ชื่อของคุณ<input name="name" placeholder="ระบุชื่อหรือนามแฝง" required /></label>
      <label>อีเมลติดต่อกลับ<input name="email" type="email" placeholder="name@example.com" required /></label>
      <label>รายละเอียดข้อความ<textarea name="message" rows={5} placeholder="ระบุชุดข้อสอบ ข้อที่พบปัญหา หรือข้อเสนอแนะ..." required /></label>
      <div className="row">
        <button className="btn">ส่งข้อความ →</button>
      </div>
      {st && <p role="status" className="fb ok" style={{ display: 'inline-block' }}>{st}</p>}
    </form>
  );
}
