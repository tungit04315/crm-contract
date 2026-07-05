// ==========================================================================
// FIREBASE CONFIG
// Dán thông tin Firebase Config của bạn vào bên dưới.
// Sau khi dán, tất cả các trang (index.html, dashboard.html) sẽ tự động
// dùng chung cấu hình này.
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// TODO: Dán Firebase Config của bạn vào đây
const firebaseConfig = {
  apiKey: "AIzaSyBmAA6Ohnd4O0l96Y6CqV7A73_RHfVq9oY",
  authDomain: "crm-contract-383dc.firebaseapp.com",
  projectId: "crm-contract-383dc",
  storageBucket: "crm-contract-383dc.firebasestorage.app",
  messagingSenderId: "160736509623",
  appId: "1:160736509623:web:ab1f1ee0560f36d4ea1732",
  measurementId: "G-EJXMSMCXH2"
};

// Khởi tạo Firebase App
export const app = initializeApp(firebaseConfig);

// Khởi tạo Auth và Firestore, export dùng chung cho toàn bộ project
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Bật lưu phiên đăng nhập trên trình duyệt (session sẽ tồn tại sau khi tải lại trang)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Không thể thiết lập persistence:", err);
});