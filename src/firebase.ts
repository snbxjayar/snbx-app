import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyASaIJdiGPTDMBBsmJFXAcP9qVEyNkcjuU",
  authDomain: "snbx-app.firebaseapp.com",
  projectId: "snbx-app",
  storageBucket: "snbx-app.firebasestorage.app",
  messagingSenderId: "103647201972",
  appId: "1:103647201972:web:bc74dc67166cd57a2225e1",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use AsyncStorage persistence on native, default on web
let auth: ReturnType<typeof getAuth>;

if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export default app;