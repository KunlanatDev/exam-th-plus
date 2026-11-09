import { useEffect, useState } from 'react';
export type Q = { id: string; section: string; topics: string[]; difficulty: number; type: 'mcq'; stem: string; choices: string[]; answer: number; explanation: string; review?: string };
export type Band = { id: string; label: string; minPassRatio: number; color: string };
export type Edition = { id: string; year: number; round: number; position: string; positionCode: string; durationMinutes: number; passScore: number; sectionWeights: Record<string, number>; minPerSection?: Record<string, number>; source: string; notes?: string; sets: { id: string; title: string; questions: number }[] };
export type ExamDef = { id: string; name: string; short: string; color: string; scoring: 'percent'; idPattern: string; sections: { id: string; name: string }[]; bands: Band[]; editions: Edition[] };
export type Catalog = { exams: ExamDef[] };
export type Cand = { name: string; seq: number };
export type Attempt = { id: string; examId: string; editionId: string; setId: string; mode: 'real' | 'practice'; answers: (number | null)[]; flags: number[]; startedAt: number; endAt: number | null; submittedAt?: number; summary?: { score: number; label: string; color: string } };

export const SOON = ['ก.พ. ภาค ก', 'ภาค ข', 'IELTS', 'TOEIC'];
export const SRC: Record<string, string> = { original: 'แต่งขึ้นเอง', recalled: 'จากความทรงจำผู้สอบ', official: 'ทางการ' };
const base = import.meta.env.BASE_URL;
let cat: Promise<Catalog> | undefined;
export const getCatalog = () => (cat ??= fetch(`${base}content/catalog.json`).then(r => r.json()));
export const loadSet = (e: string, ed: string, s: string): Promise<{ questions: Q[] }> => fetch(`${base}content/exams/${e}/${ed}/${s}.json`).then(r => r.json());
export function useCat() { const [c, setC] = useState<Catalog>(); useEffect(() => { getCatalog().then(setC); }, []); return c; }
export function useEd(p: { exam?: string; edition?: string }) {
  const c = useCat(); const x = c?.exams.find(e => e.id === p.exam); return { x, ed: x?.editions.find(e => e.id === p.edition) };
}
export function load<T>(k: string, d: T): T { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; } }
export const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
export function getHistory(): Attempt[] {
  const out: Attempt[] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith('ep_att_')) { const a = load<Attempt | null>(k, null); if (a?.submittedAt) out.push(a); } }
  return out.sort((a, b) => b.submittedAt! - a.submittedAt!);
}
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ---- รหัสผู้เข้าสอบและรายชื่อสมมติ ----
export const fmtCode = (x: ExamDef, ed: Edition, seq: number) =>
  x.idPattern.replace('{year}', String(ed.year)).replace('{position}', ed.positionCode).replace(/\{seq:(\d+)\}/, (_, n) => String(seq).padStart(+n, '0'));
const F = ['สมชาย', 'สมหญิง', 'ปิยะ', 'วรรณา', 'ธนกร', 'นภา', 'กิตติ', 'มาลี'], L = ['ใจดี', 'รักเรียน', 'มั่นคง', 'สุขใจ', 'เจริญ', 'ศรีสุข', 'แก้วมณี', 'พงษ์พันธ์'];
export function roster(x: ExamDef, ed: Edition, c: Cand) {
  const rows = Array.from({ length: 23 }, (_, i) => ({ seq: 100 + i * 37, name: `${F[i % 8]} ${L[(i * 3 + 1) % 8]}`, me: false }));
  rows.push({ seq: c.seq, name: c.name, me: true }); rows.sort((a, b) => a.seq - b.seq);
  return rows.map((r, i) => ({ ...r, code: fmtCode(x, ed, r.seq), room: Math.floor(i / 10) + 1, seat: (i % 10) + 1 }));
}

// ---- registry วิธีคิดคะแนน (เพิ่ม toeic-scaled / ielts-band ที่นี่ในอนาคต) ----
export function evaluate(x: ExamDef, ed: Edition, qs: Q[], a: (number | null)[]) {
  const sec: Record<string, { correct: number; total: number; pct: number }> = {}; const wrong: Record<string, number> = {};
  qs.forEach((q, i) => { const s = (sec[q.section] ??= { correct: 0, total: 0, pct: 0 }); s.total++; if (a[i] === q.answer) s.correct++; else q.topics.forEach(t => (wrong[t] = (wrong[t] || 0) + 1)); });
  let score = 0;
  for (const [k, s] of Object.entries(sec)) { s.pct = Math.round((100 * s.correct) / s.total); score += ((ed.sectionWeights[k] || 0) * s.correct) / s.total; }
  score = Math.round(score * 10) / 10; const ratio = score / ed.passScore;
  const band = [...x.bands].sort((p, q) => q.minPassRatio - p.minPassRatio).find(b => ratio >= b.minPassRatio)!;
  const warn = Object.entries(ed.minPerSection || {}).filter(([k, m]) => (sec[k]?.pct ?? 0) < m).map(([k]) => k);
  return { score, ratio, sec, band, warn, weak: Object.entries(wrong).sort((p, q) => q[1] - p[1]).slice(0, 3) };
}
export const scorers = { percent: evaluate };
