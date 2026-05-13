const firebaseConfig = {
  apiKey: "AIzaSyC97l2LVeEb3DY1mWvxmQgwpglnpMpkPkM",
  authDomain: "couscousmessage.firebaseapp.com",
  projectId: "couscousmessage",
  storageBucket: "couscousmessage.firebasestorage.app",
  messagingSenderId: "460748125728",
  appId: "1:460748125728:web:a4cfc91264ec75025cae45"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();