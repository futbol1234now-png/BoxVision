// Inicializar Firebase solo si el SDK cargó correctamente
if(typeof firebase !== 'undefined'){
  try{
    // Evitar re-inicializar si ya existe una app
    if(!firebase.apps || !firebase.apps.length){
      /* ── SEGURIDAD FIX 1: apiKey pública es normal en Firebase Web Apps.
         Lo que protege los datos son las Security Rules en Firestore.
         Verifica en Firebase Console → Firestore → Rules que tengas:

         rules_version = '2';
         service cloud.firestore {
           match /databases/{database}/documents {
             match /users/{userId}/{document=**} {
               allow read, write: if request.auth != null
                                  && request.auth.uid == userId;
             }
             match /{document=**} {
               allow read, write: if false;
             }
           }
         }

         También en Firebase Console → Authentication → Settings:
         - Agrega tu dominio (futbol1234now-png.github.io) en "Authorized domains"
         ── */
      firebase.initializeApp({
        apiKey:"AIzaSyASsJJ40IQzssduPQnI_vz22vcvxsjBNME",
        authDomain:"boxvision-d6a38.firebaseapp.com",
        projectId:"boxvision-d6a38",
        storageBucket:"boxvision-d6a38.firebasestorage.app",
        messagingSenderId:"738277774697",
        appId:"1:738277774697:web:11bcc85cbf616b7a4559f8"
      });
    }
  }catch(e){ console.warn("[BoxVision] firebase.initializeApp error:", e.message); }

}

let auth = null;
let db = null;
let currentUser = null;

// Guard: si Firebase no cargó (sin internet la primera vez, o script bloqueado),
// auth y db quedan null y la app usa modo local con localStorage
try {
  if(typeof firebase === 'undefined') throw new Error('Firebase SDK no cargado (¿sin internet?)');
  auth = firebase.auth();
  db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
      if(err.code === 'failed-precondition'){
        console.warn('Persistencia: múltiples pestañas abiertas');
      } else if(err.code === 'unimplemented'){
        console.warn('Persistencia no soportada en este navegador');
      }
    });
  console.log("✅ Firebase inicializado correctamente");
} catch(e) {
  console.warn("[BoxVision] Firebase no disponible — modo local:", e.message);
  auth = null;
  db = null;
}

// Si Firebase no está disponible, mostrar app en modo local
if(!auth){
  document.addEventListener("DOMContentLoaded", function(){
    const ls = document.getElementById("loginScreen");
    if(ls){ ls.style.display = "none"; ls.classList.add("hidden"); } // FIX
    if(typeof loadAll === "function") loadAll();
    // FIX: si hay cajas guardadas ir directo a main, no al landing
    if(typeof boxes !== "undefined" && boxes && boxes.length > 0){
      history.replaceState(null, "", location.pathname + location.search);
      if(typeof goMain === "function") goMain();
    } else {
      if(typeof showSplash === "function") showSplash();
    }
  });
}