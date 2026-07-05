// ==========================================================================
// VIEWS/PROFILE-VIEW.JS — Trang "Thông tin cá nhân"
// Hiện là stub UI; khi cần triển khai đầy đủ (đổi mật khẩu, avatar, thông
// tin liên hệ...), chỉ cần sửa file này — không ảnh hưởng view khác.
// ==========================================================================

import { placeholderMarkup } from "../components/placeholder.js";

/**
 * @param {HTMLElement} container - #main-content, vùng động duy nhất
 * @param {{ user: object }} ctx
 */
export function render(container, { user }) {
  const email = user?.email || "—";

  container.innerHTML = placeholderMarkup({
    title: "Thông tin cá nhân",
    description: `Đăng nhập với tài khoản <strong>${email}</strong>. Tính năng chỉnh sửa hồ sơ cá nhân đang được phát triển.`,
    iconSvg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.7"/>
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,
  });

  // Không có listener/subscription nào cần dọn dẹp -> không trả về cleanup fn
}
