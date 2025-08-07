// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCd57Du2ClwAaQ-rsREL4wu5JfnhwDANRI",
  authDomain: "dropbox-7781f.firebaseapp.com",
  projectId: "dropbox-7781f",
  storageBucket: "dropbox-7781f.appspot.com", // ← corrected `.app` to `.appspot.com`
  messagingSenderId: "197131165373",
  appId: "1:197131165373:web:c7d838c23791a1438e21d4",
  measurementId: "G-SBMJJYHYXC",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const storage = getStorage(app);
