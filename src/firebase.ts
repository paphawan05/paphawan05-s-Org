/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDj6C1c8Gu4umQwoo1JANWrim5PbI2fvpw",
  authDomain: "nimble-media-wxhgq.firebaseapp.com",
  projectId: "nimble-media-wxhgq",
  storageBucket: "nimble-media-wxhgq.firebasestorage.app",
  messagingSenderId: "770995213599",
  appId: "1:770995213599:web:22be8f643c9f55b9fe8c2a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId and persistent local cache for high reliability offline/online
const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  "ai-studio-a5d8a6d8-94ce-4166-9557-7ab6d616cf0c"
);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
