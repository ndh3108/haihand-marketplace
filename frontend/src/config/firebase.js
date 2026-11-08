import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  process.env.REACT_APP_FIREBASE_API_KEY &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID
);

let app = null;
let auth = null;

try {
  // Only initialize if config is provided or using fallback structure
  if (firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    // Provide a placeholder app so imports do not break while awaiting user .env configuration
    console.warn(
      '⚠️ [HaiPay Firebase] Firebase chưa được cấu hình các biến môi trường REACT_APP_FIREBASE_* trong frontend/.env'
    );
  }
} catch (error) {
  console.error('❌ [HaiPay Firebase] Lỗi khởi tạo Firebase:', error);
}

export { app, auth };
export default auth;
