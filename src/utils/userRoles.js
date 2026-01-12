import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const SUPERADMIN_EMAIL = 'andanupurwo@gmail.com';
const ADMIN_EMAILS = ['ashrinurhida@gmail.com'];

/**
 * Get user role based on email (for backwards compatibility)
 * superadmin > admin > user
 */
export const getRoleByEmail = (email) => {
  if (email === SUPERADMIN_EMAIL) return 'superadmin';
  if (ADMIN_EMAILS.includes(email)) return 'admin';
  return 'user';
};

/**
 * Get or create user document in Firestore
 * Also handles family creation for first login
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
    familyId: null, // Will be set when family is created/joined
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(userRef, userData);
  
  // Auto-create family for superadmin on first login
  if (role === 'superadmin') {
    const family = await createFamily(firebaseUser.uid, firebaseUser.displayName || 'Family');
    userData.familyId = family.id;
    await updateDoc(userRef, { familyId: family.id });
  }
  
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
  
  const docRef = await setDoc(doc(familiesRef), familyData);
  const familySnap = await getDocs(query(familiesRef, where('createdBy', '==', createdByUid)));
  
  // Return the created family
  if (familySnap.docs.length > 0) {
    return { id: familySnap.docs[0].id, ...familySnap.docs[0].data() };
  }
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
 * Add member to family (by email)
 */
export const inviteMemberToFamily = async (familyId, email, role = 'member') => {
  // Find user by email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return { success: false, message: 'User dengan email ini belum terdaftar' };
  }
  
  const targetUserId = snapshot.docs[0].id;
  const targetUser = snapshot.docs[0].data();
  
  // Update family members
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  const familyData = familySnap.data();
  
  if (familyData.members && familyData.members[targetUserId]) {
    return { success: false, message: 'User sudah menjadi member keluarga ini' };
  }
  
  // Add member to family
  const updatedMembers = {
    ...familyData.members,
    [targetUserId]: {
      role: role,
      joinedAt: new Date().toISOString()
    }
  };
  
  await updateDoc(familyRef, {
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });
  
  // Update user's familyId
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, { familyId: familyId });
  
  return { success: true, message: `${email} berhasil ditambahkan ke keluarga` };
};

/**
 * Update member role in family
 */
export const updateMemberRole = async (familyId, memberId, newRole) => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  const familyData = familySnap.data();
  
  const updatedMembers = {
    ...familyData.members,
    [memberId]: {
      ...familyData.members[memberId],
      role: newRole
    }
  };
  
  await updateDoc(familyRef, { members: updatedMembers });
  
  return { success: true, message: `Role ${memberId} diubah menjadi ${newRole}` };
};

/**
 * Remove member from family
 */
export const removeMemberFromFamily = async (familyId, memberId) => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  const familyData = familySnap.data();
  
  const updatedMembers = { ...familyData.members };
  delete updatedMembers[memberId];
  
  await updateDoc(familyRef, { members: updatedMembers });
  
  // Clear familyId from user
  const userRef = doc(db, 'users', memberId);
  await updateDoc(userRef, { familyId: null });
  
  return { success: true, message: 'Member berhasil dihapus dari keluarga' };
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
 * Get all users in a family
 */
export const getFamilyMembers = async (familyId) => {
  const family = await getFamily(familyId);
  if (!family || !family.members) return [];
  
  const members = [];
  for (const [userId, memberData] of Object.entries(family.members)) {
    const user = await getUserData(userId);
    if (user) {
      members.push({
        uid: userId,
        ...user,
        ...memberData
      });
    }
  }
  
  return members;
};

/**
 * Get all users (for backwards compatibility)
 */
export const getAllUsers = async () => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
