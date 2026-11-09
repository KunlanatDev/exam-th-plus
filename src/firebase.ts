import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
   increment,
  onSnapshot,
   orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Attempt } from './lib';

export const ADMIN_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL || 'kunlanat.pakine@gmail.com').toLowerCase();

export type VipEntry = {
  email: string;
  note: string;
  addedAt: number;
};

export type SetAccessRule = {
  isFree: boolean;
  price: number;
};

export type AccessConfig = {
  vipEmails: string[];
  vipList: VipEntry[];
  setRules: Record<string, SetAccessRule>;
  defaultPaidPrice: number;
  guestQuestionLimit: number;
  memberFreeQuestionLimit: number;
  promptPayId: string;
  contactLine: string;
  updatedAt?: number;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'vip' | 'admin';
  isVip: boolean;
  unlockedSets: string[];
  loginCount: number;
  lastActiveAt: number;
  createdAt: number;
  note?: string;
};

export type SiteStats = {
  totalVisits: number;
  totalUsers: number;
  onlineUsers: number;
  heartbeats?: Record<string, number>;
};

const DEFAULT_ACCESS: AccessConfig = {
  vipEmails: [ADMIN_EMAIL],
  vipList: [{ email: ADMIN_EMAIL, note: 'ผู้ดูแลระบบ (Owner)', addedAt: Date.now() }],
  setRules: {
    'baac/2567/set-1': { isFree: true, price: 0 },
    'baac/2569-finance/set-1': { isFree: true, price: 99 },
  },
  defaultPaidPrice: 99,
  guestQuestionLimit: 10,
  memberFreeQuestionLimit: 50,
  promptPayId: '',
  contactLine: '@examthplus',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initPromise: Promise<boolean> | null = null;

async function resolveFirebaseConfig() {
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'exam-thai-plus.firebaseapp.com',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'exam-thai-plus',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'exam-thai-plus.firebasestorage.app',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }
  try {
    const res = await fetch('/__/firebase/init.json');
    if (res.ok) return await res.json();
  } catch {
    // Fallback when running locally withoutVITE_FIREBASE_API_KEY
  }
  return null;
}

export function ensureFirebase(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const cfg = await resolveFirebaseConfig();
      if (!cfg?.apiKey) return false;
      app = initializeApp(cfg);
      auth = getAuth(app);
      db = getFirestore(app);
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

export function getFirebaseInstances() {
  return { app, auth, db };
}

// ---- Local Fallback Storage when Firebase Config is not yet set in .env ----
const LOCAL_ACCESS_KEY = 'ep_cfg_access';
const LOCAL_STATS_KEY = 'ep_cfg_stats';
const LOCAL_USERS_KEY = 'ep_cfg_users';

function loadLocal<T>(k: string, d: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : d;
  } catch {
    return d;
  }
}

function saveLocal(k: string, v: unknown) {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event('ep-store-update'));
}

// ---- Session Presence & Visit Tracking ----
export async function recordVisitAndHeartbeat() {
  const sessionKey = 'ep_session_id';
  let sid = sessionStorage.getItem(sessionKey);
  const isNewSession = !sid;
  if (!sid) {
    sid = 's_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    sessionStorage.setItem(sessionKey, sid);
  }
  const now = Date.now();
  const cutoff = now - 5 * 60 * 1000; // 5 minutes active window

  const ready = await ensureFirebase();
  if (ready && db) {
    try {
      const statsRef = doc(db, 'config', 'stats');
      const snap = await getDoc(statsRef);
      const data = (snap.exists() ? snap.data() : {}) as Partial<SiteStats>;
      const prevBeats = data.heartbeats || {};
      const activeBeats: Record<string, number> = {};
      for (const [k, t] of Object.entries(prevBeats)) {
        if (typeof t === 'number' && t > cutoff) activeBeats[k] = t;
      }
      activeBeats[sid] = now;
      const onlineUsers = Object.keys(activeBeats).length;
      await setDoc(
        statsRef,
        {
          totalVisits: isNewSession ? increment(1) : data.totalVisits || 1,
          onlineUsers,
          heartbeats: activeBeats,
          updatedAt: now,
        },
        { merge: true }
      );
      return;
    } catch {
      // Fall through to local stats
    }
  }

  const localStats = loadLocal<SiteStats>(LOCAL_STATS_KEY, {
    totalVisits: 1,
    totalUsers: 1,
    onlineUsers: 1,
    heartbeats: {},
  });
  if (isNewSession) localStats.totalVisits = (localStats.totalVisits || 0) + 1;
  localStats.onlineUsers = Math.max(1, localStats.onlineUsers || 1);
  saveLocal(LOCAL_STATS_KEY, localStats);
}

// ---- Auth & User Profile Hook ----
export function useAuthProfile() {
  const [user, setUser] = useState<UserProfile | null>(() => loadLocal<UserProfile | null>('ep_current_user', null));
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let unsubDoc: (() => void) | undefined;

    ensureFirebase().then(ready => {
      setFirebaseReady(ready);
      if (!ready || !auth || !db) {
        setLoading(false);
        return;
      }

      unsubAuth = onAuthStateChanged(auth, async (fbUser: User | null) => {
        if (unsubDoc) {
          unsubDoc();
          unsubDoc = undefined;
        }
        if (!fbUser) {
          setUser(null);
          localStorage.removeItem('ep_current_user');
          setLoading(false);
          return;
        }

        const email = (fbUser.email || '').toLowerCase();
        const isAdminEmail = email === ADMIN_EMAIL;
        const userRef = doc(db!, 'users', fbUser.uid);

        try {
          const [userSnap, accessSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(doc(db!, 'config', 'access')),
          ]);

          const accessData = (accessSnap.exists() ? accessSnap.data() : DEFAULT_ACCESS) as AccessConfig;
          const inVipList = (accessData.vipEmails || []).map(e => e.toLowerCase()).includes(email);

          const existing = userSnap.exists() ? (userSnap.data() as Partial<UserProfile>) : null;
          const loginSessionKey = `ep_logged_${fbUser.uid}`;
          const alreadyCounted = sessionStorage.getItem(loginSessionKey);
          const nextLoginCount = (existing?.loginCount || 0) + (alreadyCounted ? 0 : 1);
          if (!alreadyCounted) sessionStorage.setItem(loginSessionKey, '1');

          const isVip = Boolean(isAdminEmail || inVipList || existing?.isVip || existing?.role === 'vip' || existing?.role === 'admin');
          const role: 'user' | 'vip' | 'admin' = isAdminEmail
            ? 'admin'
            : existing?.role === 'admin'
              ? 'admin'
              : isVip
                ? 'vip'
                : 'user';

          const profile: UserProfile = {
            uid: fbUser.uid,
            email,
            displayName: fbUser.displayName || existing?.displayName || email.split('@')[0] || 'ผู้เข้าสอบ',
            photoURL: fbUser.photoURL || existing?.photoURL || '',
            role,
            isVip,
            unlockedSets: existing?.unlockedSets || [],
            loginCount: nextLoginCount,
            lastActiveAt: Date.now(),
            createdAt: existing?.createdAt || Date.now(),
            note: existing?.note || '',
          };

          await setDoc(userRef, profile, { merge: true });
          setUser(profile);
          saveLocal('ep_current_user', profile);
        } catch {
          const fallbackProfile: UserProfile = {
            uid: fbUser.uid,
            email,
            displayName: fbUser.displayName || email.split('@')[0] || 'ผู้เข้าสอบ',
            photoURL: fbUser.photoURL || '',
            role: isAdminEmail ? 'admin' : 'user',
            isVip: isAdminEmail,
            unlockedSets: [],
            loginCount: 1,
            lastActiveAt: Date.now(),
            createdAt: Date.now(),
          };
          setUser(fallbackProfile);
        } finally {
          setLoading(false);
        }

        unsubDoc = onSnapshot(userRef, snap => {
          if (snap.exists()) {
            const p = snap.data() as UserProfile;
            setUser(p);
            saveLocal('ep_current_user', p);
          }
        });
      });
    });

    const onLocalChange = () => {
      if (!auth?.currentUser) {
        setUser(loadLocal<UserProfile | null>('ep_current_user', null));
      }
    };
    window.addEventListener('ep-store-update', onLocalChange);

    return () => {
      unsubAuth?.();
      unsubDoc?.();
      window.removeEventListener('ep-store-update', onLocalChange);
    };
  }, []);

  return { user, loading, firebaseReady };
}

// ---- Access Config & Stats Hook ----
export function useAccessAndStats() {
  const [access, setAccess] = useState<AccessConfig>(() => loadLocal<AccessConfig>(LOCAL_ACCESS_KEY, DEFAULT_ACCESS));
  const [stats, setStats] = useState<SiteStats>(() =>
    loadLocal<SiteStats>(LOCAL_STATS_KEY, { totalVisits: 1, totalUsers: 1, onlineUsers: 1 })
  );

  useEffect(() => {
    let unsubAccess: (() => void) | undefined;
    let unsubStats: (() => void) | undefined;

    ensureFirebase().then(ready => {
      if (ready && db) {
        unsubAccess = onSnapshot(doc(db, 'config', 'access'), snap => {
          if (snap.exists()) {
            const data = { ...DEFAULT_ACCESS, ...(snap.data() as Partial<AccessConfig>) };
            setAccess(data);
            saveLocal(LOCAL_ACCESS_KEY, data);
          }
        });
        unsubStats = onSnapshot(doc(db, 'config', 'stats'), snap => {
          if (snap.exists()) {
            const d = snap.data() as Partial<SiteStats>;
            const cutoff = Date.now() - 5 * 60 * 1000;
            const activeCount = d.heartbeats
              ? Object.values(d.heartbeats).filter(t => typeof t === 'number' && t > cutoff).length
              : d.onlineUsers || 1;
            const nextStats: SiteStats = {
              totalVisits: d.totalVisits || 1,
              totalUsers: d.totalUsers || 1,
              onlineUsers: Math.max(1, activeCount),
            };
            setStats(nextStats);
            saveLocal(LOCAL_STATS_KEY, nextStats);
          }
        });
      }
    });

    const syncLocal = () => {
      setAccess(loadLocal<AccessConfig>(LOCAL_ACCESS_KEY, DEFAULT_ACCESS));
      setStats(loadLocal<SiteStats>(LOCAL_STATS_KEY, { totalVisits: 1, totalUsers: 1, onlineUsers: 1 }));
    };
    window.addEventListener('ep-store-update', syncLocal);
    return () => {
      unsubAccess?.();
      unsubStats?.();
      window.removeEventListener('ep-store-update', syncLocal);
    };
  }, []);

  return { access, stats };
}

// ---- Helper: Check if a set is free or unlocked for the current user ----
export function getSetAccess(
  access: AccessConfig,
  user: UserProfile | null,
  examId: string,
  editionId: string,
  setId: string,
  setIndex: number,
  totalQuestions = 230
) {
  const key = `${examId}/${editionId}/${setId}`;
  const editionKey = `${examId}/${editionId}`;
  const rule = access.setRules?.[key];
  // Default: set-1 (index 0) is free unless admin explicitly locked it; set-2+ is paid unless admin made it free
  const isFree = rule ? rule.isFree : setIndex === 0;
  const price = rule?.price ?? access.defaultPaidPrice ?? 99;

  const email = user?.email?.toLowerCase() || '';
  const isEmailVip = Boolean(
    email &&
      (email === ADMIN_EMAIL ||
        (access.vipEmails || []).map(e => e.toLowerCase()).includes(email) ||
        (access.vipList || []).some(v => v.email.toLowerCase() === email))
  );

  const isVipUser = Boolean(
    user &&
      (user.role === 'admin' ||
        user.role === 'vip' ||
        user.isVip ||
        isEmailVip ||
        user.unlockedSets?.includes('all') ||
        user.unlockedSets?.includes(key) ||
        user.unlockedSets?.includes(editionKey))
  );

  const guestLimit = access.guestQuestionLimit ?? 10;
  const memberLimit = access.memberFreeQuestionLimit ?? 50;

  let allowedQuestions = 0;
  if (isVipUser) {
    allowedQuestions = totalQuestions;
  } else if (isFree) {
    allowedQuestions = user ? Math.min(totalQuestions, memberLimit) : Math.min(totalQuestions, guestLimit);
  }

  const isUnlocked = allowedQuestions > 0;

  return {
    key,
    isFree,
    price,
    isUnlocked,
    isVipUser,
    isEmailVip,
    allowedQuestions,
    guestLimit,
    memberLimit,
  };
}

// ---- Auth Actions ----
export async function loginWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const ready = await ensureFirebase();
  if (ready && auth) {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }
  return {
    ok: false,
    error: 'ยังไม่ได้ตั้งค่า VITE_FIREBASE_API_KEY ในไฟล์ .env (สามารถใช้อีเมลเข้าสู่ระบบโหมดทดสอบในเครื่องได้ทันที)',
  };
}

export async function loginOrRegisterWithEmail(
  mode: 'login' | 'register',
  emailInput: string,
  passwordInput: string,
  displayNameInput?: string
): Promise<{ ok: boolean; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  const ready = await ensureFirebase();

  if (ready && auth) {
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, passwordInput);
        if (displayNameInput) {
          await updateProfile(cred.user, { displayName: displayNameInput.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, passwordInput);
      }
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }

  // Local Mode Fallback (works immediately before Firebase Console Auth is enabled)
  const access = loadLocal<AccessConfig>(LOCAL_ACCESS_KEY, DEFAULT_ACCESS);
  const users = loadLocal<Record<string, UserProfile>>(LOCAL_USERS_KEY, {});
  const isAdmin = email === ADMIN_EMAIL;
  const isVip =
    isAdmin ||
    access.vipEmails.map(e => e.toLowerCase()).includes(email) ||
    access.vipList.some(v => v.email.toLowerCase() === email);

  const existing = users[email];
  const profile: UserProfile = {
    uid: existing?.uid || 'local_' + btoa(email).replace(/=/g, ''),
    email,
    displayName: displayNameInput?.trim() || existing?.displayName || email.split('@')[0],
    role: isAdmin ? 'admin' : isVip ? 'vip' : existing?.role || 'user',
    isVip: isVip || Boolean(existing?.isVip),
    unlockedSets: existing?.unlockedSets || [],
    loginCount: (existing?.loginCount || 0) + 1,
    lastActiveAt: Date.now(),
    createdAt: existing?.createdAt || Date.now(),
    note: existing?.note || '',
  };
  users[email] = profile;
  saveLocal(LOCAL_USERS_KEY, users);
  saveLocal('ep_current_user', profile);
  return { ok: true };
}

export async function logoutUser() {
  const ready = await ensureFirebase();
  if (ready && auth) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
  localStorage.removeItem('ep_current_user');
  window.dispatchEvent(new Event('ep-store-update'));
}

// ---- Save Attempt to Cloud Firestore ----
export async function syncAttemptToCloud(attempt: Attempt, user: UserProfile | null) {
  if (!user) return;
  const ready = await ensureFirebase();
  if (ready && db) {
    try {
      await setDoc(
        doc(db, 'attempts', `${user.uid}_${attempt.id}`),
        {
          ...attempt,
          uid: user.uid,
          userEmail: user.email,
          displayName: user.displayName,
        },
        { merge: true }
      );
    } catch {
      // ignore cloud sync errors
    }
  }
}

// ---- Admin Actions: Save AccessConfig & Manage Users ----
export async function saveAccessConfig(nextConfig: AccessConfig): Promise<boolean> {
  const payload: AccessConfig = {
    ...nextConfig,
    vipEmails: Array.from(
      new Set([
        ADMIN_EMAIL,
        ...nextConfig.vipList.map(v => v.email.trim().toLowerCase()),
        ...(nextConfig.vipEmails || []).map(e => e.trim().toLowerCase()),
      ])
    ),
    updatedAt: Date.now(),
  };
  saveLocal(LOCAL_ACCESS_KEY, payload);

  const ready = await ensureFirebase();
  if (ready && db) {
    try {
      await setDoc(doc(db, 'config', 'access'), payload, { merge: true });
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  const ready = await ensureFirebase();
  if (ready && db) {
    try {
      const q = query(collection(db, 'users'), orderBy('lastActiveAt', 'desc'));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      if (list.length) return list;
    } catch {
      // fallback to local
    }
  }
  const localMap = loadLocal<Record<string, UserProfile>>(LOCAL_USERS_KEY, {});
  const cur = loadLocal<UserProfile | null>('ep_current_user', null);
  if (cur && !localMap[cur.email]) localMap[cur.email] = cur;
  return Object.values(localMap).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export async function toggleUserVipStatus(target: UserProfile, makeVip: boolean, note?: string) {
  const updated: UserProfile = {
    ...target,
    isVip: makeVip,
    role: target.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : makeVip ? 'vip' : 'user',
    note: note !== undefined ? note : target.note,
  };

  const localMap = loadLocal<Record<string, UserProfile>>(LOCAL_USERS_KEY, {});
  localMap[target.email.toLowerCase()] = updated;
  saveLocal(LOCAL_USERS_KEY, localMap);

  const cur = loadLocal<UserProfile | null>('ep_current_user', null);
  if (cur && cur.email.toLowerCase() === target.email.toLowerCase()) {
    saveLocal('ep_current_user', updated);
  }

  const ready = await ensureFirebase();
  if (ready && db) {
    try {
      await setDoc(doc(db, 'users', target.uid), updated, { merge: true });
    } catch {
      // ignore
    }
  }
}

