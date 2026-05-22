import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAD1BteHbzIeXDay8PXbp5GxiaB4r_MSbQ",
  authDomain: "catatduit-f4943.firebaseapp.com",
  projectId: "catatduit-f4943",
  storageBucket: "catatduit-f4943.firebasestorage.app",
  messagingSenderId: "243810240079",
  appId: "1:243810240079:web:a3cae880f1c2bd55288c3a",
  measurementId: "G-NV1M1B7N1S"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getAccessToken = () => cachedAccessToken;

export { 
  collection, 
  addDoc, 
  setDoc,
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  signInWithPopup, 
  signOut,
  Timestamp 
};
