// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAi48wBIYB1M8kMZdLdn0JE1JQ4x85bx2E",
  authDomain: "evaluation-system-a1589.firebaseapp.com",
  projectId: "evaluation-system-a1589",
  storageBucket: "evaluation-system-a1589.firebasestorage.app",
  messagingSenderId: "247004516352",
  appId: "1:247004516352:web:cb5eae30c9488f257848e5",
  measurementId: "G-XGGJETZ08Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);