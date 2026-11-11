import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase configuration for project "jyapp" (jyapp-ef085)
export const firebaseConfig = {
  apiKey: "AIzaSyBYaFdFCP4a9EgOBPoEBeDGSuGVQb-6KPs",
  authDomain: "jyapp-ef085.firebaseapp.com",
  projectId: "jyapp-ef085",
  storageBucket: "jyapp-ef085.firebasestorage.app",
  messagingSenderId: "521063130986",
  appId: "1:521063130986:web:6c4e0712f6bd727cd46713",
  measurementId: "G-DF1DJQT7RE"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
};

