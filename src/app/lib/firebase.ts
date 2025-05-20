// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection} from "firebase/firestore"; // Firestore
import { getDatabase } from "firebase/database";   // Realtime Database
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaFgsyBvv7xYOfsQM-wf7P7kx7JJ9OubA",
  authDomain: "policy-tracker-kp.firebaseapp.com",
  projectId: "policy-tracker-kp",
  storageBucket: "policy-tracker-kp.firebasestorage.app",
  messagingSenderId: "1042626131048",
  appId: "1:1042626131048:web:7579b84a38245311ecb7dd",
  measurementId: "G-C9V0W9VKKZ"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Firestore
const realtimeDB = getDatabase(app); // Realtime Database
const storage = getStorage(app);
const auth = getAuth(app);

export { firestore, realtimeDB, storage, app, auth, doc, setDoc, getDoc, getDocs, collection, ref, uploadBytes, getDownloadURL };