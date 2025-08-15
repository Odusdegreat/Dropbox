// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB7iQmed4rkkAVJWNXL46olvRtPOSfBIPc",
  authDomain: "sudo-coin.firebaseapp.com",
  projectId: "sudo-coin",
  storageBucket: "sudo-coin.appspot.com", // ✅ Corrected bucket format
  messagingSenderId: "584524966814",
  appId: "1:584524966814:web:f84be8ec93f98b6fc1048f",
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
