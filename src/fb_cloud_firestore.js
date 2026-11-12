import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBc_AVxBXMnK1Z2jwqq-GGGzCmsf8HIpds",
    authDomain: "smart-traffic-93b67.firebaseapp.com",
    projectId: "smart-traffic-93b67",
    storageBucket: "smart-traffic-93b67.firebasestorage.app",
    messagingSenderId: "486263542637",
    appId: "1:486263542637:web:b4c6b04678bb583381c064",
    measurementId: "G-7BFWYR207V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);