// ==========================================================================
// AUTH.JS — Logic cho trang đăng nhập (index.html)
// - Validate form
// - Đăng nhập bằng Firebase Authentication (Email/Password)
// - Hiển thị loading, toast
// - Nếu đã đăng nhập -> tự động chuyển vào dashboard.html
// ==========================================================================

import { auth } from "./services/firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { showToast } from "./services/toast.js";

// ---------- DOM References ----------
const pageLoading = document.getElementById("pageLoading");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const usernameWrap = document.getElementById("usernameWrap");
const passwordWrap = document.getElementById("passwordWrap");
const usernameError = document.getElementById("usernameError");
const passwordError = document.getElementById("passwordError");
const togglePasswordBtn = document.getElementById("togglePassword");
const loginBtn = document.getElementById("loginBtn");
const forgotLink = document.getElementById("forgotLink");

// ==========================================================================
// 1. KIỂM TRA PHIÊN ĐĂNG NHẬP
// Nếu người dùng đã đăng nhập từ trước -> tự động chuyển sang dashboard.html
// Nếu chưa -> ẩn overlay loading, hiển thị form đăng nhập
// ==========================================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "dashboard.html";
  } else {
    pageLoading.classList.add("hidden");
  }
});

// ==========================================================================
// 2. TOGGLE HIỆN / ẨN MẬT KHẨU
// ==========================================================================
togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  const eyeIcon = document.getElementById("eyeIcon");
  eyeIcon.innerHTML = isPassword
    ? `<path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M7.4 7.5C4.8 9 3 12 3 12s3.5 7 9 7c1.7 0 3.2-.5 4.5-1.3M17 16.3C19.7 14.6 21 12 21 12s-1.2-2.4-3.4-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
    : `<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>`;
});

// ==========================================================================
// 3. VALIDATE FORM
// ==========================================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm() {
  let isValid = true;

  const emailValue = usernameInput.value.trim();
  const passwordValue = passwordInput.value;

  // Email: không rỗng + đúng định dạng
  if (!emailValue) {
    setFieldError(usernameWrap, usernameError, "Vui lòng nhập tên đăng nhập / email.");
    isValid = false;
  } else if (!EMAIL_REGEX.test(emailValue)) {
    setFieldError(usernameWrap, usernameError, "Email không đúng định dạng.");
    isValid = false;
  } else {
    clearFieldError(usernameWrap, usernameError);
  }

  // Password: không rỗng + tối thiểu 6 ký tự
  if (!passwordValue) {
    setFieldError(passwordWrap, passwordError, "Vui lòng nhập mật khẩu.");
    isValid = false;
  } else if (passwordValue.length < 6) {
    setFieldError(passwordWrap, passwordError, "Mật khẩu tối thiểu 6 ký tự.");
    isValid = false;
  } else {
    clearFieldError(passwordWrap, passwordError);
  }

  return isValid;
}

function setFieldError(wrapEl, errorEl, message) {
  wrapEl.classList.add("has-error");
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function clearFieldError(wrapEl, errorEl) {
  wrapEl.classList.remove("has-error");
  errorEl.classList.remove("show");
}

// Xóa lỗi ngay khi người dùng bắt đầu gõ lại
usernameInput.addEventListener("input", () => clearFieldError(usernameWrap, usernameError));
passwordInput.addEventListener("input", () => clearFieldError(passwordWrap, passwordError));

// ==========================================================================
// 4. XỬ LÝ ĐĂNG NHẬP
// ==========================================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Kiểm tra kết nối Internet trước
  if (!navigator.onLine) {
    showToast("Không có kết nối Internet. Vui lòng kiểm tra lại.", "error");
    return;
  }

  if (!validateForm()) return;

  const email = usernameInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Đăng nhập thành công!", "success");

    // Chuyển sang dashboard sau khi đăng nhập thành công
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    handleAuthError(error);
    setLoading(false);
  }
});

/**
 * Bật / tắt trạng thái loading của nút đăng nhập.
 */
function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle("loading", isLoading);
}

/**
 * Ánh xạ lỗi Firebase Auth sang thông báo tiếng Việt phù hợp.
 */
function handleAuthError(error) {
  const code = error.code || "";

  switch (code) {
    case "auth/invalid-email":
      showToast("Email không đúng định dạng.", "error");
      break;

    case "auth/user-not-found":
      showToast("Sai email. Tài khoản không tồn tại.", "error");
      break;

    case "auth/wrong-password":
      showToast("Sai mật khẩu. Vui lòng thử lại.", "error");
      break;

    // Firebase SDK mới gộp chung "user-not-found" và "wrong-password"
    // thành "invalid-credential" để tránh lộ thông tin tài khoản nào tồn tại.
    case "auth/invalid-credential":
      showToast("Sai email hoặc mật khẩu.", "error");
      break;

    case "auth/user-disabled":
      showToast("Tài khoản của bạn đã bị khóa.", "warning");
      break;

    case "auth/too-many-requests":
      showToast("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.", "warning");
      break;

    case "auth/network-request-failed":
      showToast("Không có kết nối Internet. Vui lòng kiểm tra lại.", "error");
      break;

    default:
      showToast("Đăng nhập thất bại. Vui lòng thử lại.", "error");
      console.error("Firebase auth error:", error);
  }
}

// ==========================================================================
// 5. THEO DÕI TRẠNG THÁI MẠNG
// ==========================================================================
window.addEventListener("offline", () => {
  showToast("Không có kết nối Internet.", "error");
});

// ==========================================================================
// 6. QUÊN MẬT KHẨU (placeholder — có thể mở rộng gửi email reset)
// ==========================================================================
forgotLink.addEventListener("click", (e) => {
  e.preventDefault();
  showToast("Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.", "warning");
});
