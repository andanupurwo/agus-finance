// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Determine which Firebase config to use based on environment variable
export const environment = import.meta.env.VITE_ENVIRONMENT || "prod";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env[`VITE_FIREBASE_API_KEY_${environment.toUpperCase()}`],
  authDomain: import.meta.env[`VITE_FIREBASE_AUTH_DOMAIN_${environment.toUpperCase()}`],
  projectId: import.meta.env[`VITE_FIREBASE_PROJECT_ID_${environment.toUpperCase()}`],
  storageBucket: import.meta.env[`VITE_FIREBASE_STORAGE_BUCKET_${environment.toUpperCase()}`],
  messagingSenderId: import.meta.env[`VITE_FIREBASE_MESSAGING_SENDER_ID_${environment.toUpperCase()}`],
  appId: import.meta.env[`VITE_FIREBASE_APP_ID_${environment.toUpperCase()}`]
};

console.log(`Firebase initialized with environment: ${environment}`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable Google Sign-In popup instead of redirect
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
