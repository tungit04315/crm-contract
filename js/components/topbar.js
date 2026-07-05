// ==========================================================================
// COMPONENTS/TOPBAR.JS — Điều khiển phần header cố định (shell)
// Chỉ 2 việc: đổi tiêu đề trang khi chuyển view, và đổ thông tin user.
// ==========================================================================

const topbarTitle = () => document.querySelector(".topbar__title");
const userChipAvatar = () => document.querySelector(".user-chip__avatar");
const userChipName = () => document.querySelector(".user-chip__name");
const userChipRole = () => document.querySelector(".user-chip__role");

/**
 * Đổi tiêu đề hiển thị trên topbar (gọi mỗi khi renderView đổi view).
 * @param {string} title
 */
export function setTitle(title) {
  const el = topbarTitle();
  if (el) el.textContent = title;
  document.title = `${title} | CRM & CONTRACT`;
}

/**
 * Đổ thông tin người dùng đã đăng nhập vào user-chip trên topbar.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User} user
 */
export function fillUserInfo(user) {
  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "Người dùng");

  const avatar = userChipAvatar();
  if (avatar) {
    avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563EB&color=fff`;
    avatar.alt = displayName;
  }
  const nameEl = userChipName();
  if (nameEl) nameEl.textContent = displayName;
  const roleEl = userChipRole();
  if (roleEl) roleEl.textContent = user.email || "";

  return displayName;
}
