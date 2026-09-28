
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDCJDYvdICJ91Js-LGG4FNpiITSyUSxVOQ",
    authDomain: "jn-autos-software-by-bilal.firebaseapp.com",
    projectId: "jn-autos-software-by-bilal",
    storageBucket: "jn-autos-software-by-bilal.firebasestorage.app",
    messagingSenderId: "715445925890",
    appId: "1:715445925890:web:5e6f662322dd6449734f1b",
    measurementId: "G-Q595ZTEJME"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  