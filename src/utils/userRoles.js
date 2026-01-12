import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SUPERADMIN_EMAIL = 'andanupurwo@gmail.com';
const ADMIN_EMAILS = ['ashrinurhida@gmail.com'];

/**
 * Get user role based on email
 * superadmin > admin > user
 */
export const getRoleByEmail = (email) => {
  if (email === SUPERADMIN_EMAIL) return 'superadmin';
  if (ADMIN_EMAILS.includes(email)) return 'admin';
  return 'user';
};

/**
 * Get or create user document in Firestore
 */
export const getOrCreateUser = async (firebaseUser) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  }

  // Create new user document
  const role = getRoleByEmail(firebaseUser.email);
  const userData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || 'User',
    photoURL: firebaseUser.photoURL || null,
    role: role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(userRef, userData);
  return userData;
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
 * Get all users (for superadmin)
 */
export const getAllUsers = async () => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Update user role (superadmin only)
 */
export const updateUserRole = async (uid, newRole) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Delete user (superadmin only)
 */
export const deleteUserData = async (uid) => {
  const userRef = doc(db, 'users', uid);
  // Note: This only deletes from Firestore, not Firebase Auth
  // Admin SDK is needed to delete from Auth
  await deleteDoc(userRef);
};
