// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB7iQmed4rkkAVJWNXL46olvRtPOSfBIPc",
  authDomain: "sudo-coin.firebaseapp.com",
  projectId: "sudo-coin",
  storageBucket: "sudo-coin.firebasestorage.app",
  messagingSenderId: "584524966814",
  appId: "1:584524966814:web:f84be8ec93f98b6fc1048f",
  measurementId: "G-8R8JE0CLHR",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
