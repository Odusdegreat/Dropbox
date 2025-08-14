// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7iQmed4rkkAVJWNXL46olvRtPOSfBIPc",
  authDomain: "sudo-coin.firebaseapp.com",
  projectId: "sudo-coin",
  storageBucket: "sudo-coin.firebasestorage.app",
  messagingSenderId: "584524966814",
  appId: "1:584524966814:web:f84be8ec93f98b6fc1048f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);
