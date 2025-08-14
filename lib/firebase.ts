import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB7iQmed4rkkAVJWNXL46olvRtPOSfBIPc",
  authDomain: "sudo-coin.firebaseapp.com",
  projectId: "sudo-coin",
  storageBucket: "sudo-coin.appspot.com", // ✅ fixed
  messagingSenderId: "584524966814",
  appId: "1:584524966814:web:f84be8ec93f98b6fc1048f",
  measurementId: "G-8R8JE0CLHR",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export storage so you can import it anywhere
export const storage = getStorage(app);
