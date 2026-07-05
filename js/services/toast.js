// ==========================================================================
// TOAST UTILITY
// Hiển thị thông báo dạng toast ở góc màn hình (desktop) / cuối màn hình (mobile)
// ==========================================================================

const ICONS = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#16A34A"/><path d="M8 12.5l2.5 2.5L16 9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#EF4444"/><path d="M9 9l6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#F59E0B"/><path d="M12 8v5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg>`,
};

/**
 * Hiển thị một toast thông báo.
 * @param {string} message - Nội dung thông báo.
 * @param {'success'|'error'|'warning'} type - Loại thông báo.
 * @param {number} duration - Thời gian hiển thị (ms).
 */
export function showToast(message, type = "success", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.success}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Tự động ẩn sau `duration` ms
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
