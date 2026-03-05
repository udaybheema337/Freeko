
// ✅ CORRECT IMPORTS (Using Internet Links)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ PASTE YOUR REAL KEYS HERE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyCmur-Q1mgyv2I7vMA-XAtgeN9Ogz93xhA",
  authDomain: "freeko-c4d26.firebaseapp.com",
  projectId: "freeko-c4d26",
  storageBucket: "freeko-c4d26.firebasestorage.app",
  messagingSenderId: "697583397461",
  appId: "1:697583397461:web:0b2c186a20d8739ebc82dc",
  measurementId: "G-1H2B3C5TD0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Database
export const auth = getAuth(app);
export const db = getFirestore(app);

// Store Settings
export const STORE_LOCATION = { lat: 12.9716, lng: 77.5946 }; 
export const MAX_DISTANCE_KM = 7;
export const RAZORPAY_KEY_ID = "rzp_live_SJ1cPiOaPN2EcL";