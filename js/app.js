// ==========================================================================
// APP.JS — Bộ điều phối SPA-shell cho dashboard.html
//
// Nguyên tắc:
//   - Sidebar + Topbar là khung cố định, KHÔNG bị render lại khi đổi trang.
//   - Chỉ #main-content bị thay nội dung, thông qua renderView(routeKey).
//   - Mỗi mục menu ánh xạ tới 1 module view (lazy-loaded) + 1 hàm render().
//   - Điều hướng dựa trên location.hash để hỗ trợ back/forward & chia sẻ URL.
// ==========================================================================

import { onAuthChange, logout } from "./services/auth-service.js";
import { initSidebar, closeMobileDrawer, setActiveNav } from "./components/sidebar.js";
import { setTitle, fillUserInfo } from "./components/topbar.js";
import { showToast } from "./services/toast.js";

const mainContent = document.getElementById("main-content");
const logoutLink = document.getElementById("logoutLink");

// ==========================================================================
// 1. BẢNG ĐỊNH TUYẾN: route -> { title, css, module, params }
// Thêm tính năng mới = thêm 1 dòng ở đây + 1 file view mới trong views/.
// Không cần đụng vào sidebar/topbar hay các view khác.
// ==========================================================================
const routes = {
  "home": {
    title: "Trang chủ",
    css: "css/views/home.css",
    load: () => import("./views/home-view.js"),
  },
  "contract/web": {
    title: "Tạo hợp đồng Web",
    css: "css/views/contract-form.css",
    load: () => import("./views/contract-web-view.js"),
  },
  "contract/seo": {
    title: "Tạo hợp đồng SEO",
    css: "css/views/contract-form.css",
    load: () => import("./views/contract-seo-view.js"),
  },
  "history": {
    title: "Lịch sử xuất hợp đồng",
    css: "css/views/export-history.css",
    load: () => import("./views/export-history-view.js"),
  },
  "profile": {
    title: "Thông tin cá nhân",
    css: "css/views/placeholder.css",
    load: () => import("./views/profile-view.js"),
  },
  "settings": {
    title: "Thông tin doanh nghiệp",
    css: "css/views/contract-form.css",
    load: () => import("./views/settings-view.js"),
  },
};

const DEFAULT_ROUTE = "home";

// ==========================================================================
// 2. LOADER CSS THEO VIEW (chỉ nạp 1 lần, cache theo href)
// ==========================================================================
const loadedCss = new Set();

function loadViewCss(href) {
  if (!href || loadedCss.has(href)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve(); // không chặn render nếu CSS lỗi
    document.head.appendChild(link);
    loadedCss.add(href);
  });
}

// ==========================================================================
// 3. RENDER VIEW — trái tim của kiến trúc shell
// Chỉ vùng #main-content bị thay đổi. Sidebar/topbar không bị đụng tới,
// ngoại trừ việc cập nhật tiêu đề + trạng thái active (không render lại).
// ==========================================================================
let currentCleanup = null; // hàm dọn dẹp (unsubscribe Firestore, event...) của view đang mở
let currentUser = null;
let navToken = 0; // chống race-condition khi chuyển view nhanh liên tiếp

async function renderView(routeKey) {
  const route = routes[routeKey] || routes[DEFAULT_ROUTE];
  const resolvedKey = routes[routeKey] ? routeKey : DEFAULT_ROUTE;
  const myToken = ++navToken;

  // Dọn dẹp view trước đó (huỷ listener Firestore, event handlers riêng...)
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch (err) { console.error("Lỗi dọn dẹp view trước:", err); }
    currentCleanup = null;
  }

  mainContent.innerHTML = `<div class="view-loading">Đang tải...</div>`;

  try {
    const [mod] = await Promise.all([route.load(), loadViewCss(route.css)]);
    if (myToken !== navToken) return; // đã điều hướng sang view khác trong lúc đợi

    mainContent.innerHTML = "";
    const cleanup = await mod.render(mainContent, {
      user: currentUser,
      params: route.params || {},
    });
    if (myToken !== navToken) return;

    currentCleanup = typeof cleanup === "function" ? cleanup : null;
  } catch (err) {
    console.error(`Lỗi tải view "${resolvedKey}":`, err);
    if (myToken !== navToken) return;
    mainContent.innerHTML = `<div class="view-error">Không thể tải trang này. Vui lòng thử lại.</div>`;
    showToast("Không thể tải nội dung trang.", "error");
  }

  setTitle(route.title);
  setActiveNav(resolvedKey);
  closeMobileDrawer();
}

// ==========================================================================
// 4. ĐỊNH TUYẾN THEO location.hash
// ==========================================================================
function currentRouteKeyFromHash() {
  const raw = (window.location.hash || "").replace(/^#\/?/, "").trim();
  return raw || DEFAULT_ROUTE;
}

function handleHashChange() {
  renderView(currentRouteKeyFromHash());
}

// ==========================================================================
// 5. KHỞI TẠO ỨNG DỤNG — bảo vệ trang bằng Firebase Auth
// ==========================================================================
onAuthChange((user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  currentUser = user;
  fillUserInfo(user);
  initSidebar();

  logoutLink?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await logout();
      window.location.replace("index.html");
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
      showToast("Đăng xuất thất bại. Vui lòng thử lại.", "error");
    }
  });

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange(); // render view đầu tiên theo URL hiện tại
});
