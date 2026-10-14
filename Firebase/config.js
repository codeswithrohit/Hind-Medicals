import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";


const firebaseConfig = {
  apiKey: "AIzaSyBVaJxBDV1OO4MBQV5OhQaCtEPUh13PP68",
  authDomain: "lifelineshop12.firebaseapp.com",
  projectId: "lifelineshop12",
  storageBucket: "lifelineshop12.firebasestorage.app",
  messagingSenderId: "612027750388",
  appId: "1:612027750388:web:abc4ab983ef33c2f02cba1",
  measurementId: "G-3QV9BFEVC7"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export { firebase }



