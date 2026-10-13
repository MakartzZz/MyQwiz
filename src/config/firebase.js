import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "myqwiz-1df0f",
  appId: "1:24194457590:web:a8b8c01bf43780e2a631d7",
  storageBucket: "myqwiz-1df0f.firebasestorage.app",
  apiKey: "AIzaSyAMteH_-iH2EH11veeKDS2sVjQLkTLLKNI",
  authDomain: "myqwiz-1df0f.firebaseapp.com",
  messagingSenderId: "24194457590",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
