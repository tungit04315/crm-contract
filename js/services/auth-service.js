// ==========================================================================
// AUTH-SERVICE.JS — Bọc Firebase Authentication cho toàn bộ SPA
// Mọi module khác (app.js, các view) chỉ nên tương tác với auth qua file
// này, không import thẳng firebase-auth ở nhiều nơi khác nhau.
// ==========================================================================

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * Đăng ký callback theo dõi trạng thái đăng nhập.
 * @param {(user: import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User | null) => void} callback
 * @returns {() => void} hàm hủy đăng ký (unsubscribe)
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Đăng xuất người dùng hiện tại.
 */
export function logout() {
  return signOut(auth);
}

export { auth };
