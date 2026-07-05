// ==========================================================================
// COMPONENTS/SIDEBAR.JS — Hành vi của sidebar cố định (shell)
// KHÔNG chứa logic riêng của từng tính năng — chỉ điều khiển UI khung sườn:
//   - Mở/đóng drawer trên mobile
//   - Thu gọn/mở rộng trên desktop
//   - Mở/đóng submenu "Mẫu hợp đồng"
//   - Đánh dấu mục điều hướng đang active theo route hiện tại
// ==========================================================================

const MOBILE_BREAKPOINT = 900;

let sidebar, menuBtn, collapseBtn, submenuToggle, submenuList;

/**
 * Khởi tạo hành vi sidebar. Gọi đúng 1 lần sau khi dashboard.html đã render.
 */
export function initSidebar() {
  sidebar = document.getElementById("sidebar");
  menuBtn = document.getElementById("menuBtn");
  collapseBtn = document.getElementById("collapseBtn");
  submenuToggle = document.getElementById("templateSubToggle");
  submenuList = document.getElementById("sub-mau");

  // Mở/đóng drawer trên mobile
  menuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("is-open");
  });

  // Đóng drawer khi bấm ra ngoài (mobile)
  document.addEventListener("click", (e) => {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;
    if (!sidebar.classList.contains("is-open")) return;
    if (sidebar.contains(e.target) || e.target === menuBtn || menuBtn?.contains(e.target)) return;
    sidebar.classList.remove("is-open");
  });

  // Tự đóng drawer khi resize lên desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) sidebar.classList.remove("is-open");
  });

  // Thu gọn sidebar (desktop)
  collapseBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("is-collapsed");
  });

  // Mở/đóng submenu "Mẫu hợp đồng"
  if (submenuToggle && submenuList) {
    submenuToggle.addEventListener("click", () => {
      const expanded = submenuToggle.getAttribute("aria-expanded") === "true";
      submenuToggle.setAttribute("aria-expanded", String(!expanded));
      submenuList.classList.toggle("is-open", !expanded);
    });
  }
}

/**
 * Đóng drawer trên mobile (gọi sau khi điều hướng sang view mới).
 */
export function closeMobileDrawer() {
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    sidebar?.classList.remove("is-open");
  }
}

/**
 * Đánh dấu mục nav đang active dựa trên route hiện tại (ví dụ "home",
 * "templates/web"...). Tự mở submenu nếu mục active nằm trong đó.
 * @param {string} routeKey
 */
export function setActiveNav(routeKey) {
  const allLinks = document.querySelectorAll(".sidebar__nav [data-route]");
  let matchedInSubmenu = false;

  allLinks.forEach((el) => {
    const isMatch = el.getAttribute("data-route") === routeKey;
    el.classList.toggle("is-active", isMatch);
    if (isMatch && submenuList?.contains(el)) matchedInSubmenu = true;
  });

  if (matchedInSubmenu && submenuToggle && submenuList) {
    submenuToggle.setAttribute("aria-expanded", "true");
    submenuList.classList.add("is-open");
  }
}
