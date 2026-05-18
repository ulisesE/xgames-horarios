// Importa las funciones que necesitas de los SDKs que usarás
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, getDocs, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Tu configuración de Firebase para la aplicación web
const firebaseConfig = {
    apiKey: "AIzaSyDdG6B2oYfSSDxutp1D9NNa-kkKswHPw8g",
    authDomain: "test-89a00.firebaseapp.com",
    projectId: "test-89a00",
    storageBucket: "test-89a00.firebasestorage.app",
    messagingSenderId: "739684870971",
    appId: "1:739684870971:web:dc404978c2afae43f3251e",
    measurementId: "G-627Z7J2MJ3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar la base de datos y las funciones de Firestore y Storage
export { db, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, getDocs, setDoc, getDoc };
