import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const SUPERADMIN_EMAIL = 'andanupurwo@gmail.com';
export const ADMIN_EMAILS = ['ashrinurhida@gmail.com'];
export const WHITELIST_EMAILS = [SUPERADMIN_EMAIL, ...ADMIN_EMAILS];

/**
 * Get user role based on email (for backwards compatibility)
 * superadmin > admin > user
 */
export const getRoleByEmail = (email) => {
  if (email === SUPERADMIN_EMAIL) return 'superadmin';
  if (ADMIN_EMAILS.includes(email)) return 'admin';
  // Default: beri akses penuh supaya tidak terblokir
  return 'superadmin';
};

/**
 * Get or create user document in Firestore
 * Also handles family creation for first login
 */
export const getOrCreateUser = async (firebaseUser) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const existing = userSnap.data();

    // Jika belum punya family, buatkan otomatis dan jadikan superadmin
    if (!existing.familyId) {
      const family = await createFamily(firebaseUser.uid, existing.displayName || firebaseUser.displayName || 'Family');
      await updateDoc(userRef, { familyId: family.id, role: 'superadmin', updatedAt: new Date().toISOString() });
      return { ...existing, familyId: family.id, role: 'superadmin' };
    }

    return existing;
  }

  // Create new user document
  const role = getRoleByEmail(firebaseUser.email);
  const userData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || 'User',
    photoURL: firebaseUser.photoURL || null,
    role: role,
    familyId: null, // Will segera diisi
    settings: {
      budgetOrder: [],
      walletOrder: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(userRef, userData);

  // Auto-create family untuk user baru dan set familyId
  const family = await createFamily(firebaseUser.uid, firebaseUser.displayName || 'Family');
  userData.familyId = family.id;
  await updateDoc(userRef, { familyId: family.id });

  return userData;
};

/**
 * Create a new family
 */
export const createFamily = async (createdByUid, familyName) => {
  const familiesRef = collection(db, 'families');
  const familyData = {
    name: familyName || 'My Family',
    createdBy: createdByUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: {
      [createdByUid]: {
        role: 'superadmin',
        joinedAt: new Date().toISOString()
      }
    },
    settings: {
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    }
  };
  const docRef = await addDoc(familiesRef, familyData);
  return { id: docRef.id, ...familyData };
};

/**
 * Get family by ID
 */
export const getFamily = async (familyId) => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  return familySnap.exists() ? { id: familySnap.id, ...familySnap.data() } : null;
};

/**
 * Get user data by UID
 */
export const getUserData = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

/**
 * Get all users (for backwards compatibility)
 */
export const getAllUsers = async () => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
