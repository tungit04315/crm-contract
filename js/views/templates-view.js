// ==========================================================================
// VIEWS/TEMPLATES-VIEW.JS — Trang "Mẫu hợp đồng" (Web / SEO)
// Module tự chứa: markup (bảng, toolbar, drawer, 2 modal) + toàn bộ hành vi
// CRUD với Firestore/Storage. Được app.js gọi lại cho cả 2 route
// "templates/web" và "templates/seo" (khác nhau qua ctx.params.category).
//
// Quy tắc: mọi truy vấn DOM đều giới hạn bên trong `container` (#main-content)
// thay vì document.getElementById toàn cục, để module này không bao giờ đụng
// tới sidebar/topbar hay các view khác.
// ==========================================================================

import { db, storage } from "../services/firebase-config.js";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast } from "../services/toast.js";

const COLLECTION = "contractTemplates";
const MAX_FILE_MB = 15;
const CATEGORY_LABELS = { web: "Web", seo: "SEO" };

/**
 * @param {HTMLElement} container - #main-content, vùng động duy nhất
 * @param {{ user: object, params: { category: "web"|"seo" } }} ctx
 * @returns {() => void} cleanup — hủy Firestore listener khi rời view
 */
export function render(container, { user, params }) {
  const CATEGORY = params?.category === "seo" ? "seo" : "web";
  const CATEGORY_LABEL = CATEGORY_LABELS[CATEGORY];
  const currentUser = user;

  // ---------- State riêng của lần render này ----------
  let templates = [];
  let activeFilter = "all";
  let searchTerm = "";
  let selectedFile = null;
  let editingTemplate = null;
  let pendingConfirmAction = null;
  let unsubscribeSnapshot = null;

  // ---------- Markup ----------
  container.innerHTML = `
        <div class="page-head">
          <div>
            <h2 id="pageHeading">Hợp đồng mẫu</h2>
            <p id="pageDesc">Quản lý file hợp đồng mẫu dùng để tạo hợp đồng mới cho khách hàng.</p>
          </div>
          <button class="btn btn-primary" id="btnAddTemplate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.3" stroke-linecap="round" />
            </svg>
            Thêm mẫu hợp đồng
          </button>
        </div>

        <!-- Mini stats -->
        <div class="mini-stats">
          <div class="mini-card">
            <div class="mini-card__icon" style="background:var(--blue-50);color:var(--blue-600);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.7"/></svg>
            </div>
            <div><div class="mini-card__value" id="statTotal">0</div><div class="mini-card__label">Tổng số mẫu</div></div>
          </div>
          <div class="mini-card">
            <div class="mini-card__icon" style="background:var(--green-100);color:var(--green-600);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" stroke="currentColor" stroke-width="1.7"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div><div class="mini-card__value" id="statActive">0</div><div class="mini-card__label">Đang dùng</div></div>
          </div>
          <div class="mini-card">
            <div class="mini-card__icon" style="background:var(--amber-100);color:var(--amber-600);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </div>
            <div><div class="mini-card__value" id="statDraft">0</div><div class="mini-card__label">Nháp</div></div>
          </div>
          <div class="mini-card">
            <div class="mini-card__icon" style="background:#EEF0F4;color:var(--ink-500);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            </div>
            <div><div class="mini-card__value" id="statArchived">0</div><div class="mini-card__label">Đã lưu trữ</div></div>
          </div>
        </div>

        <!-- Toolbar: filter tabs + search -->
        <div class="toolbar">
          <div class="tabs" id="filterTabs">
            <button class="tab is-active" data-filter="all">Tất cả <span class="count" id="cntAll">0</span></button>
            <button class="tab" data-filter="active">Đang dùng <span class="count" id="cntActive">0</span></button>
            <button class="tab" data-filter="draft">Nháp <span class="count" id="cntDraft">0</span></button>
            <button class="tab" data-filter="archived">Lưu trữ <span class="count" id="cntArchived">0</span></button>
          </div>
          <label class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <input type="text" id="searchInput" placeholder="Tìm theo tên mẫu...">
          </label>
        </div>

        <!-- Table -->
        <div class="panel">
          <table class="tpl-table">
            <thead>
              <tr>
                <th style="width:32%;">Tên mẫu</th>
                <th>Version</th>
                <th>Trạng thái</th>
                <th>Mặc định</th>
                <th>Cập nhật lần cuối</th>
                <th>Người cập nhật</th>
                <th style="text-align:right;">Hành động</th>
              </tr>
            </thead>
            <tbody id="tplTableBody">
              <tr class="skel-row"><td colspan="7"><div class="skel" style="width:70%;"></div></td></tr>
              <tr class="skel-row"><td colspan="7"><div class="skel" style="width:55%;"></div></td></tr>
              <tr class="skel-row"><td colspan="7"><div class="skel" style="width:65%;"></div></td></tr>
            </tbody>
          </table>
          <div class="empty-state" id="emptyState" style="display:none;">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.5"/><path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <h4 id="emptyTitle">Chưa có mẫu hợp đồng nào</h4>
            <p id="emptySub">Thêm file mẫu đầu tiên để bắt đầu sử dụng khi tạo hợp đồng mới.</p>
            <button class="btn btn-primary" id="btnAddTemplateEmpty">+ Thêm mẫu hợp đồng</button>
          </div>
        </div>

  <div class="overlay" id="drawerOverlay"></div>
  <div class="drawer" id="drawer">
    <div class="drawer__head">
      <h3 id="drawerTitle">Thêm mẫu hợp đồng</h3>
      <button class="drawer__close" id="drawerClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="drawer__body">
      <form id="tplForm" novalidate>

        <div class="field">
          <label>File hợp đồng mẫu (PDF hoặc DOCX)</label>
          <div class="dropzone" id="dropzone">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4 7 9M12 4l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            <p>Kéo thả file vào đây hoặc bấm để chọn</p>
            <span>Hỗ trợ .pdf, .docx — tối đa 15MB</span>
          </div>
          <div class="file-picked" id="filePicked" style="display:none;">
            <span class="tpl-file-icon" id="filePickedIcon">PDF</span>
            <div style="flex:1;min-width:0;">
              <div class="file-picked__name" id="filePickedName"></div>
              <div class="file-picked__size" id="filePickedSize"></div>
            </div>
            <button type="button" id="filePickedRemove" aria-label="Bỏ chọn file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <input type="file" id="fileInput" accept=".pdf,.docx" hidden>
          <div class="hint" id="fileEditHint" style="display:none;">Nếu không chọn file mới, mẫu hiện tại sẽ được giữ nguyên.</div>
        </div>

        <div class="field">
          <label for="tplTitle">Tên mẫu hợp đồng <span style="color:var(--red-500);">*</span></label>
          <input type="text" id="tplTitle" placeholder="VD: Hợp đồng thiết kế website chuẩn 2026">
        </div>

        <div class="field">
          <label for="tplDesc">Mô tả ngắn</label>
          <textarea id="tplDesc" placeholder="Ghi chú về nội dung, phạm vi áp dụng của mẫu hợp đồng này..."></textarea>
        </div>

        <div class="field">
          <label for="tplStatus">Trạng thái</label>
          <select id="tplStatus">
            <option value="draft">Nháp</option>
            <option value="active">Đang dùng</option>
          </select>
        </div>

        <div class="field">
          <div class="checkbox-row">
            <input type="checkbox" id="tplIsDefault">
            <label for="tplIsDefault">Đặt làm mẫu mặc định cho loại hợp đồng này</label>
          </div>
          <div class="hint">Mỗi loại (Web/SEO) chỉ có 1 mẫu mặc định — mẫu cũ sẽ tự bỏ mặc định. Chỉ áp dụng khi trạng thái là "Đang dùng".</div>
        </div>

        <div class="field" id="versionNoteField" style="display:none;">
          <label for="tplVersionNote">Ghi chú phiên bản mới</label>
          <textarea id="tplVersionNote" placeholder="VD: Cập nhật điều khoản thanh toán ở mục 4..."></textarea>
        </div>

      </form>
    </div>
    <div class="drawer__foot">
      <button type="button" class="btn btn-ghost" id="drawerCancel">Hủy</button>
      <button type="submit" form="tplForm" class="btn btn-primary" id="drawerSave">Lưu mẫu hợp đồng</button>
    </div>
  </div>

  <!-- ===================== MODAL: Lịch sử phiên bản ===================== -->
  <div class="modal" id="versionModal">
    <div class="modal__backdrop"></div>
    <div class="modal__card">
      <div class="modal__head">
        <h3>Lịch sử phiên bản — <span id="verModalName"></span></h3>
        <button class="drawer__close" id="versionModalClose">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal__body" id="versionList"></div>
      <div class="modal__foot">
        <button class="btn btn-ghost" id="versionModalCloseBtn">Đóng</button>
      </div>
    </div>
  </div>

  <!-- ===================== MODAL: Xác nhận hành động ===================== -->
  <div class="modal" id="confirmModal">
    <div class="modal__backdrop"></div>
    <div class="modal__card" style="width:400px;">
      <div class="modal__body" style="text-align:center;padding-top:26px;">
        <div class="confirm-icon" id="confirmIcon" style="margin:0 auto 14px;background:var(--amber-100);color:var(--amber-600);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
        </div>
        <h3 id="confirmTitle" style="margin:0 0 8px;font-size:15.5px;font-weight:800;">Xác nhận hành động</h3>
        <p id="confirmMsg" style="margin:0;font-size:13.3px;color:var(--ink-500);line-height:1.5;">Bạn có chắc chắn muốn thực hiện hành động này?</p>
      </div>
      <div class="modal__foot" style="justify-content:center;">
        <button class="btn btn-ghost" id="confirmCancelBtn">Hủy</button>
        <button class="btn btn-danger" id="confirmOkBtn">Xác nhận</button>
      </div>
    </div>
  </div>
  `;

  // ---------- DOM References (giới hạn trong container) ----------
  const pageHeading = container.querySelector("#pageHeading");
  const pageDesc = container.querySelector("#pageDesc");
  const emptyTitle = container.querySelector("#emptyTitle");
  const emptySub = container.querySelector("#emptySub");

  const statTotal = container.querySelector("#statTotal");
  const statActive = container.querySelector("#statActive");
  const statDraft = container.querySelector("#statDraft");
  const statArchived = container.querySelector("#statArchived");
  const cntAll = container.querySelector("#cntAll");
  const cntActive = container.querySelector("#cntActive");
  const cntDraft = container.querySelector("#cntDraft");
  const cntArchived = container.querySelector("#cntArchived");

  const filterTabs = container.querySelector("#filterTabs");
  const searchInput = container.querySelector("#searchInput");
  const tplTableBody = container.querySelector("#tplTableBody");
  const emptyState = container.querySelector("#emptyState");

  const btnAddTemplate = container.querySelector("#btnAddTemplate");
  const btnAddTemplateEmpty = container.querySelector("#btnAddTemplateEmpty");

  const drawerOverlay = container.querySelector("#drawerOverlay");
  const drawer = container.querySelector("#drawer");
  const drawerTitle = container.querySelector("#drawerTitle");
  const drawerClose = container.querySelector("#drawerClose");
  const drawerCancel = container.querySelector("#drawerCancel");
  const drawerSave = container.querySelector("#drawerSave");
  const tplForm = container.querySelector("#tplForm");

  const dropzone = container.querySelector("#dropzone");
  const fileInput = container.querySelector("#fileInput");
  const filePicked = container.querySelector("#filePicked");
  const filePickedIcon = container.querySelector("#filePickedIcon");
  const filePickedName = container.querySelector("#filePickedName");
  const filePickedSize = container.querySelector("#filePickedSize");
  const filePickedRemove = container.querySelector("#filePickedRemove");
  const fileEditHint = container.querySelector("#fileEditHint");

  const tplTitle = container.querySelector("#tplTitle");
  const tplDesc = container.querySelector("#tplDesc");
  const tplStatus = container.querySelector("#tplStatus");
  const tplIsDefault = container.querySelector("#tplIsDefault");
  const versionNoteField = container.querySelector("#versionNoteField");
  const tplVersionNote = container.querySelector("#tplVersionNote");

  const versionModal = container.querySelector("#versionModal");
  const versionModalClose = container.querySelector("#versionModalClose");
  const versionModalCloseBtn = container.querySelector("#versionModalCloseBtn");
  const verModalName = container.querySelector("#verModalName");
  const versionList = container.querySelector("#versionList");

  const confirmModal = container.querySelector("#confirmModal");
  const confirmTitle = container.querySelector("#confirmTitle");
  const confirmMsg = container.querySelector("#confirmMsg");
  const confirmOkBtn = container.querySelector("#confirmOkBtn");
  const confirmCancelBtn = container.querySelector("#confirmCancelBtn");

  // ==========================================================================
  // 0. TIÊU ĐỀ TRANG THEO LOẠI (WEB / SEO)
  // ==========================================================================
  pageHeading.textContent = `Hợp đồng mẫu ${CATEGORY_LABEL}`;
  pageDesc.textContent = `Quản lý file hợp đồng mẫu ${CATEGORY_LABEL} dùng để tạo hợp đồng mới cho khách hàng.`;
  emptyTitle.textContent = `Chưa có mẫu hợp đồng ${CATEGORY_LABEL} nào`;
  emptySub.textContent = `Thêm file mẫu ${CATEGORY_LABEL} đầu tiên để bắt đầu sử dụng khi tạo hợp đồng mới.`;

  // ==========================================================================
  // 1. TOOLBAR — filter tabs + tìm kiếm
  // ==========================================================================
  function initToolbar() {
    filterTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      filterTabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });

    let debounceId;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderTable();
      }, 200);
    });

    btnAddTemplate.addEventListener("click", () => openDrawer(null));
    btnAddTemplateEmpty.addEventListener("click", () => openDrawer(null));
  }

  // ==========================================================================
  // 2. FIRESTORE — lắng nghe realtime danh sách mẫu theo CATEGORY
  // ==========================================================================
  function subscribeTemplates() {
    const q = query(collection(db, COLLECTION), where("category", "==", CATEGORY));
    unsubscribeSnapshot = onSnapshot(
      q,
      (snap) => {
        templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        templates.sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt));
        renderStats();
        renderTable();
      },
      (err) => {
        console.error("Lỗi tải danh sách mẫu hợp đồng:", err);
        showToast("Không tải được danh sách mẫu hợp đồng. Vui lòng thử lại.", "error");
        tplTableBody.innerHTML = "";
        emptyState.style.display = "block";
      }
    );
  }

  function tsToMillis(ts) {
    if (!ts) return 0;
    if (ts instanceof Timestamp) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  }

  // ==========================================================================
  // 3. RENDER — số liệu tổng quan + bảng danh sách
  // ==========================================================================
  function renderStats() {
    const total = templates.length;
    const active = templates.filter((t) => t.status === "active").length;
    const draft = templates.filter((t) => t.status === "draft").length;
    const archived = templates.filter((t) => t.status === "archived").length;

    statTotal.textContent = total;
    statActive.textContent = active;
    statDraft.textContent = draft;
    statArchived.textContent = archived;

    cntAll.textContent = total;
    cntActive.textContent = active;
    cntDraft.textContent = draft;
    cntArchived.textContent = archived;
  }

  function getFilteredList() {
    return templates.filter((t) => {
      if (activeFilter !== "all" && t.status !== activeFilter) return false;
      if (searchTerm && !(t.title || "").toLowerCase().includes(searchTerm)) return false;
      return true;
    });
  }

  function renderTable() {
    const list = getFilteredList();

    if (list.length === 0) {
      tplTableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    tplTableBody.innerHTML = list.map(rowTemplate).join("");

    tplTableBody.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const action = el.dataset.action;
        const item = templates.find((t) => t.id === id);
        if (!item) return;
        handleRowAction(action, item);
      });
    });
  }

  function rowTemplate(t) {
    const isDocx = (t.fileType || "").toLowerCase().includes("doc");
    const statusMap = {
      active: ["status-pill2--active", "Đang dùng"],
      draft: ["status-pill2--draft", "Nháp"],
      archived: ["status-pill2--archived", "Lưu trữ"],
    };
    const [statusClass, statusLabel] = statusMap[t.status] || statusMap.draft;

    const defaultCell = t.isDefault
      ? `<span class="default-star">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7-5.4-4.7 7.1-.7Z"/></svg>
           Mặc định
         </span>`
      : (t.status === "active"
        ? `<button class="default-btn" data-action="set-default" data-id="${t.id}">Đặt mặc định</button>`
        : `<span style="color:var(--ink-400);font-size:12px;">—</span>`);

    return `
      <tr>
        <td>
          <div class="tpl-name">
            <div class="tpl-file-icon ${isDocx ? "tpl-file-icon--docx" : ""}">${isDocx ? "DOCX" : "PDF"}</div>
            <div>
              <div class="tpl-name__title">${escapeHtml(t.title || "(Chưa đặt tên)")}</div>
              <div class="tpl-name__file">${escapeHtml(t.fileName || "Chưa có file")}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-version">v${t.version || 1}</span></td>
        <td><span class="status-pill2 ${statusClass}">${statusLabel}</span></td>
        <td>${defaultCell}</td>
        <td>${formatDate(t.updatedAt)}</td>
        <td>${escapeHtml(t.updatedBy || t.createdBy || "—")}</td>
        <td>
          <div class="row-actions" style="justify-content:flex-end;">
            <button class="icon-action" data-action="preview" data-id="${t.id}" title="Xem / tải xuống" ${t.fileUrl ? "" : "disabled"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
            <button class="icon-action" data-action="history" data-id="${t.id}" title="Lịch sử phiên bản">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
            <button class="icon-action" data-action="edit" data-id="${t.id}" title="Sửa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            </button>
            ${t.status === "archived"
        ? `<button class="icon-action" data-action="restore" data-id="${t.id}" title="Khôi phục về Nháp">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 </button>
                 <button class="icon-action danger" data-action="hard-delete" data-id="${t.id}" title="Xóa vĩnh viễn">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 </button>`
        : `<button class="icon-action danger" data-action="archive" data-id="${t.id}" title="Lưu trữ">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                 </button>`
      }
          </div>
        </td>
      </tr>`;
  }

  function handleRowAction(action, item) {
    switch (action) {
      case "preview":
        if (item.fileUrl) window.open(item.fileUrl, "_blank", "noopener");
        break;
      case "history":
        openVersionModal(item);
        break;
      case "edit":
        openDrawer(item);
        break;
      case "set-default":
        setDefaultTemplate(item);
        break;
      case "archive":
        askConfirm({
          title: "Lưu trữ mẫu hợp đồng?",
          message: `"${item.title}" sẽ được ẩn khỏi danh sách đang dùng nhưng vẫn được giữ lại (không xóa file). Bạn có thể khôi phục lại sau.`,
          okLabel: "Lưu trữ",
          onConfirm: () => archiveTemplate(item),
        });
        break;
      case "restore":
        restoreTemplate(item);
        break;
      case "hard-delete":
        askConfirm({
          title: "Xóa vĩnh viễn mẫu hợp đồng?",
          message: `Toàn bộ file và lịch sử phiên bản của "${item.title}" sẽ bị xóa hoàn toàn và không thể khôi phục. Chỉ xóa nếu bạn chắc chắn mẫu này chưa từng được dùng.`,
          okLabel: "Xóa vĩnh viễn",
          onConfirm: () => hardDeleteTemplate(item),
        });
        break;
    }
  }

  // ==========================================================================
  // 4. DRAWER — Thêm mới / Sửa mẫu hợp đồng
  // ==========================================================================
  function initDrawer() {
    drawerClose.addEventListener("click", closeDrawer);
    drawerCancel.addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("is-drag"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
      if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.[0]) handleFileSelect(fileInput.files[0]);
    });
    filePickedRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelectedFile();
    });

    tplStatus.addEventListener("change", () => {
      tplIsDefault.disabled = tplStatus.value !== "active";
      if (tplStatus.value !== "active") tplIsDefault.checked = false;
    });

    tplForm.addEventListener("submit", handleSubmit);
  }

  function openDrawer(template) {
    editingTemplate = template;
    tplForm.reset();
    clearSelectedFile();

    if (template) {
      drawerTitle.textContent = "Sửa mẫu hợp đồng";
      drawerSave.textContent = "Lưu thay đổi";
      tplTitle.value = template.title || "";
      tplDesc.value = template.description || "";
      tplStatus.value = template.status === "archived" ? "draft" : (template.status || "draft");
      tplIsDefault.checked = !!template.isDefault;
      tplIsDefault.disabled = tplStatus.value !== "active";
      fileEditHint.style.display = "block";
      versionNoteField.style.display = "block";
    } else {
      drawerTitle.textContent = "Thêm mẫu hợp đồng";
      drawerSave.textContent = "Lưu mẫu hợp đồng";
      tplStatus.value = "draft";
      tplIsDefault.checked = false;
      tplIsDefault.disabled = true;
      fileEditHint.style.display = "none";
      versionNoteField.style.display = "none";
    }

    drawerOverlay.classList.add("is-open");
    drawer.classList.add("is-open");
  }

  function closeDrawer() {
    drawerOverlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
    editingTemplate = null;
    clearSelectedFile();
  }

  function handleFileSelect(file) {
    const okExt = /\.(pdf|docx)$/i.test(file.name);
    if (!okExt) {
      showToast("Chỉ chấp nhận file định dạng PDF hoặc DOCX.", "error");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showToast(`File vượt quá dung lượng cho phép (tối đa ${MAX_FILE_MB}MB).`, "error");
      return;
    }
    selectedFile = file;
    const isDocx = /\.docx$/i.test(file.name);
    filePickedIcon.textContent = isDocx ? "DOCX" : "PDF";
    filePickedIcon.classList.toggle("tpl-file-icon--docx", isDocx);
    filePickedName.textContent = file.name;
    filePickedSize.textContent = formatBytes(file.size);
    filePicked.style.display = "flex";
    dropzone.style.display = "none";
  }

  function clearSelectedFile() {
    selectedFile = null;
    fileInput.value = "";
    filePicked.style.display = "none";
    dropzone.style.display = "block";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const title = tplTitle.value.trim();
    if (!title) {
      showToast("Vui lòng nhập tên mẫu hợp đồng.", "error");
      tplTitle.focus();
      return;
    }
    if (!editingTemplate && !selectedFile) {
      showToast("Vui lòng chọn file hợp đồng mẫu.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate, {
          title,
          description: tplDesc.value.trim(),
          status: tplStatus.value,
          isDefault: tplIsDefault.checked,
        });
        showToast("Đã cập nhật mẫu hợp đồng.", "success");
      } else {
        await createTemplate({
          title,
          description: tplDesc.value.trim(),
          status: tplStatus.value,
          isDefault: tplIsDefault.checked,
        });
        showToast("Đã thêm mẫu hợp đồng mới.", "success");
      }
      closeDrawer();
    } catch (err) {
      console.error("Lỗi lưu mẫu hợp đồng:", err);
      showToast("Lưu thất bại. Vui lòng thử lại.", "error");
    } finally {
      setSaving(false);
    }
  }

  function setSaving(isSaving) {
    drawerSave.disabled = isSaving;
    drawerSave.textContent = isSaving ? "Đang lưu..." : (editingTemplate ? "Lưu thay đổi" : "Lưu mẫu hợp đồng");
  }

  // ==========================================================================
  // 5. FIRESTORE + STORAGE — CREATE / UPDATE / VERSIONING
  // ==========================================================================
  async function createTemplate(meta) {
    const fileType = selectedFile.name.split(".").pop().toLowerCase();

    const docRef = await addDoc(collection(db, COLLECTION), {
      title: meta.title,
      description: meta.description,
      category: CATEGORY,
      status: meta.status,
      isDefault: false,
      version: 1,
      fileType,
      fileName: selectedFile.name,
      fileUrl: "",
      versions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.email || currentUser.uid,
      updatedBy: currentUser.email || currentUser.uid,
    });

    try {
      const fileUrl = await uploadTemplateFile(docRef.id, 1, selectedFile);

      const versionEntry = {
        version: 1,
        fileUrl,
        fileName: selectedFile.name,
        note: "Phiên bản đầu tiên",
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.email || currentUser.uid,
      };

      await updateDoc(doc(db, COLLECTION, docRef.id), {
        fileUrl,
        versions: [versionEntry],
        updatedAt: serverTimestamp(),
      });

      if (meta.isDefault && meta.status === "active") {
        await ensureSingleDefault(docRef.id);
      }
    } catch (uploadErr) {
      // Upload file thất bại sau khi đã tạo document -> dọn dẹp document rỗng
      // (fileUrl: "") để không để lại bản ghi "ma" không xem/tải được.
      try {
        await deleteDoc(doc(db, COLLECTION, docRef.id));
      } catch (cleanupErr) {
        console.error("Không thể dọn dẹp document lỗi sau khi upload thất bại:", cleanupErr);
      }
      throw uploadErr; // ném lại để handleSubmit hiện toast lỗi như cũ
    }
  }

  async function updateTemplate(template, meta) {
    const payload = {
      title: meta.title,
      description: meta.description,
      status: meta.status,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || currentUser.uid,
    };

    if (selectedFile) {
      const nextVersion = (template.version || 1) + 1;
      const fileUrl = await uploadTemplateFile(template.id, nextVersion, selectedFile);
      const versionEntry = {
        version: nextVersion,
        fileUrl,
        fileName: selectedFile.name,
        note: tplVersionNote.value.trim() || "",
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.email || currentUser.uid,
      };
      payload.version = nextVersion;
      payload.fileUrl = fileUrl;
      payload.fileName = selectedFile.name;
      payload.fileType = selectedFile.name.split(".").pop().toLowerCase();
      payload.versions = [...(template.versions || []), versionEntry];
    }

    if (meta.status !== "active") {
      payload.isDefault = false;
    }

    await updateDoc(doc(db, COLLECTION, template.id), payload);

    if (meta.isDefault && meta.status === "active") {
      await ensureSingleDefault(template.id);
    }
  }

  async function uploadTemplateFile(docId, version, file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `templates/${CATEGORY}/${docId}/v${version}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async function ensureSingleDefault(newDefaultId) {
    const others = templates.filter((t) => t.isDefault && t.id !== newDefaultId);
    await Promise.all(
      others.map((t) => updateDoc(doc(db, COLLECTION, t.id), { isDefault: false }))
    );
    await updateDoc(doc(db, COLLECTION, newDefaultId), { isDefault: true });
  }

  async function setDefaultTemplate(item) {
    try {
      await ensureSingleDefault(item.id);
      showToast(`Đã đặt "${item.title}" làm mẫu mặc định.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Không thể đặt mặc định. Vui lòng thử lại.", "error");
    }
  }

  // ==========================================================================
  // 6. LƯU TRỮ (soft delete) / KHÔI PHỤC / XÓA VĨNH VIỄN
  // ==========================================================================
  async function archiveTemplate(item) {
    try {
      await updateDoc(doc(db, COLLECTION, item.id), {
        status: "archived",
        isDefault: false,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email || currentUser.uid,
      });
      showToast(`Đã lưu trữ "${item.title}".`, "success");
    } catch (err) {
      console.error(err);
      showToast("Lưu trữ thất bại. Vui lòng thử lại.", "error");
    }
  }

  async function restoreTemplate(item) {
    try {
      await updateDoc(doc(db, COLLECTION, item.id), {
        status: "draft",
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email || currentUser.uid,
      });
      showToast(`Đã khôi phục "${item.title}" về trạng thái Nháp.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Khôi phục thất bại. Vui lòng thử lại.", "error");
    }
  }

  async function hardDeleteTemplate(item) {
    try {
      const versions = item.versions || [];
      await Promise.all(
        versions.map(async (v) => {
          try {
            const safeName = (v.fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `templates/${CATEGORY}/${item.id}/v${v.version}_${safeName}`;
            await deleteObject(ref(storage, path));
          } catch (e) {
            // File có thể đã bị xóa hoặc đường dẫn không khớp — bỏ qua
          }
        })
      );
      await deleteDoc(doc(db, COLLECTION, item.id));
      showToast(`Đã xóa vĩnh viễn "${item.title}".`, "success");
    } catch (err) {
      console.error(err);
      showToast("Xóa thất bại. Vui lòng thử lại.", "error");
    }
  }

  // ==========================================================================
  // 7. MODAL — Lịch sử phiên bản
  // ==========================================================================
  function initVersionModal() {
    versionModalClose.addEventListener("click", closeVersionModal);
    versionModalCloseBtn.addEventListener("click", closeVersionModal);
    versionModal.querySelector(".modal__backdrop").addEventListener("click", closeVersionModal);
  }

  function openVersionModal(item) {
    verModalName.textContent = item.title || "";
    const versions = [...(item.versions || [])].sort((a, b) => (b.version || 0) - (a.version || 0));

    if (versions.length === 0) {
      versionList.innerHTML = `<p style="color:var(--ink-500);font-size:13px;">Chưa có lịch sử phiên bản.</p>`;
    } else {
      versionList.innerHTML = versions.map((v) => `
        <div class="ver-item">
          <div class="ver-item__badge">v${v.version}</div>
          <div class="ver-item__body">
            <div class="ver-item__title">
              ${escapeHtml(v.fileName || "")}
              ${v.version === item.version ? '<span class="tag-current">Hiện tại</span>' : ""}
            </div>
            <div class="ver-item__meta">${formatDate(v.updatedAt)} · ${escapeHtml(v.updatedBy || "")}</div>
            ${v.note ? `<div class="ver-item__note">"${escapeHtml(v.note)}"</div>` : ""}
            <div class="ver-item__actions">
              ${v.fileUrl ? `<a href="${v.fileUrl}" target="_blank" rel="noopener">Tải xuống</a>` : ""}
              ${v.version !== item.version ? `<button data-restore-version="${v.version}">Khôi phục bản này</button>` : ""}
            </div>
          </div>
        </div>
      `).join("");

      versionList.querySelectorAll("[data-restore-version]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const versionNum = Number(btn.dataset.restoreVersion);
          const targetVersion = versions.find((v) => v.version === versionNum);
          if (targetVersion) restoreVersion(item, targetVersion);
        });
      });
    }

    versionModal.classList.add("is-open");
  }

  function closeVersionModal() {
    versionModal.classList.remove("is-open");
  }

  async function restoreVersion(item, targetVersion) {
    try {
      const nextVersion = (item.version || 1) + 1;
      const versionEntry = {
        version: nextVersion,
        fileUrl: targetVersion.fileUrl,
        fileName: targetVersion.fileName,
        note: `Khôi phục từ v${targetVersion.version}`,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.email || currentUser.uid,
      };
      await updateDoc(doc(db, COLLECTION, item.id), {
        version: nextVersion,
        fileUrl: targetVersion.fileUrl,
        fileName: targetVersion.fileName,
        versions: [...(item.versions || []), versionEntry],
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email || currentUser.uid,
      });
      showToast(`Đã khôi phục về nội dung của v${targetVersion.version} (lưu thành v${nextVersion}).`, "success");
      closeVersionModal();
    } catch (err) {
      console.error(err);
      showToast("Khôi phục phiên bản thất bại. Vui lòng thử lại.", "error");
    }
  }

  // ==========================================================================
  // 8. MODAL — Xác nhận hành động (dùng chung cho lưu trữ / xóa vĩnh viễn)
  // ==========================================================================
  function initConfirmModal() {
    confirmCancelBtn.addEventListener("click", closeConfirmModal);
    confirmModal.querySelector(".modal__backdrop").addEventListener("click", closeConfirmModal);
    confirmOkBtn.addEventListener("click", async () => {
      if (!pendingConfirmAction) return;
      confirmOkBtn.disabled = true;
      try {
        await pendingConfirmAction();
      } finally {
        confirmOkBtn.disabled = false;
        closeConfirmModal();
      }
    });
  }

  function askConfirm({ title, message, okLabel, onConfirm }) {
    confirmTitle.textContent = title;
    confirmMsg.textContent = message;
    confirmOkBtn.textContent = okLabel || "Xác nhận";
    pendingConfirmAction = onConfirm;
    confirmModal.classList.add("is-open");
  }

  function closeConfirmModal() {
    confirmModal.classList.remove("is-open");
    pendingConfirmAction = null;
  }

  // ==========================================================================
  // 9. TIỆN ÍCH
  // ==========================================================================
  function formatDate(ts) {
    const ms = tsToMillis(ts);
    if (!ms) return "Vừa xong";
    const d = new Date(ms);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ==========================================================================
  // 10. KHỞI TẠO
  // ==========================================================================
  initToolbar();
  initDrawer();
  initVersionModal();
  initConfirmModal();
  subscribeTemplates();

  // ---------- Cleanup: hủy Firestore listener khi rời khỏi view này ----------
  return function cleanup() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
}