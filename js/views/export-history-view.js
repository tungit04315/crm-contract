// ==========================================================================
// VIEWS/EXPORT-HISTORY-VIEW.JS — Trang "Lịch sử xuất hợp đồng"
//
// Hiển thị TOÀN BỘ hợp đồng đã tạo (collection "contracts"), cho phép:
//   - Tìm kiếm nhanh theo số HĐ / tên khách hàng
//   - Lọc theo: loại HĐ (Web/SEO), trạng thái, khoảng thời gian ký,
//     khoảng giá trị hợp đồng
//   - Sắp xếp theo thời gian xuất hoặc giá trị hợp đồng
//   - Xem nhanh lại toàn bộ nội dung hợp đồng trong modal
//   - Tải lại file .docx / .pdf (tái tạo trực tiếp từ dữ liệu đã lưu, dùng
//     lại đúng docx-generator.js / pdf-generator.js của luồng tạo hợp đồng)
//
// Dữ liệu được lắng nghe realtime qua subscribeContracts() (contract-service.js),
// lọc/sắp xếp/phân trang xử lý hoàn toàn ở client — xem ghi chú ở đó.
// ==========================================================================

import { subscribeContracts } from "../services/contract-service.js";
import { generateContractDocx, generateSeoContractDocx, downloadBlob } from "../services/docx-generator.js";
import { generateContractPdf, generateSeoContractPdf } from "../services/pdf-generator.js";
import { buildContractPreviewHtml, escapeHtml } from "../utils/contract-preview.js";
import { toShortDate } from "../utils/date-utils.js";
import { showToast } from "../services/toast.js";

const PAGE_SIZE = 10;

const TYPE_LABELS = { web: "Web", seo: "SEO" };
const STATUS_LABELS = { pending: "Chờ xử lý", in_progress: "Đang triển khai", completed: "Hoàn tất" };

const DATE_PRESETS = [
    { id: "all", label: "Tất cả thời gian" },
    { id: "today", label: "Hôm nay" },
    { id: "7d", label: "7 ngày qua" },
    { id: "30d", label: "30 ngày qua" },
    { id: "month", label: "Tháng này" },
    { id: "custom", label: "Tuỳ chọn khoảng ngày" },
];

const SORT_OPTIONS = [
    { id: "createdAt_desc", label: "Mới xuất trước" },
    { id: "createdAt_asc", label: "Cũ nhất trước" },
    { id: "value_desc", label: "Giá trị: Cao → Thấp" },
    { id: "value_asc", label: "Giá trị: Thấp → Cao" },
];

const DEFAULT_FILTERS = {
    keyword: "",
    type: "all",
    status: "all",
    datePreset: "all",
    dateFrom: "",
    dateTo: "",
    valueMin: "",
    valueMax: "",
    sort: "createdAt_desc",
};

// ---------- Icon nhỏ dùng trong view (giữ nguyên phong cách stroke hiện có) ----------
const ICON_SEARCH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_EYE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/></svg>`;
const ICON_WORD = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6"/><path d="M8 13.5 9.4 18l1.6-3.5L12.6 18l1.4-4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PDF = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6"/><path d="M8 17v-4h1.3a1.3 1.3 0 1 1 0 2.6H8M13 13v4M13 15.2h1.4M17 13v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_CHEVRON_LEFT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON_RIGHT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_DOC = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.7"/></svg>`;
const ICON_CHECK = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" stroke="currentColor" stroke-width="1.7"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_WEB = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_SEO = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 19 9 9l4 6 3-5 4 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EMPTY = `<svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.5"/><path d="M14 3v5h5M8 13h5M8 17h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

/**
 * @param {HTMLElement} container - #main-content
 * @returns {() => void} cleanup — hủy Firestore listener khi rời view
 */
export function render(container) {
    const state = {
        all: [],       // toàn bộ hợp đồng, realtime từ Firestore
        filtered: [],  // sau khi áp bộ lọc + sắp xếp
        page: 1,
        filters: { ...DEFAULT_FILTERS },
    };

    container.innerHTML = buildMarkup();

    bindFilters(container, state);
    bindRowActionsDelegation(container, state);
    bindModal(container, state);

    const unsubscribe = subscribeContracts(
        (contracts) => {
            state.all = contracts;
            applyFilters(container, state);
        },
        () => {
            container.querySelector("#historyTableBody").innerHTML =
                `<tr><td colspan="7" class="hist-error-cell">Không thể tải lịch sử hợp đồng. Vui lòng kiểm tra kết nối và thử lại.</td></tr>`;
        }
    );

    return () => unsubscribe();
}

// ==========================================================================
// MARKUP
// ==========================================================================
function buildMarkup() {
    return `
    <div class="page-head">
      <div>
        <h2>Lịch sử xuất hợp đồng</h2>
        <p>Toàn bộ hợp đồng đã tạo trong hệ thống — tìm kiếm, lọc nhanh, xem lại và tải lại file bất cứ lúc nào.</p>
      </div>
    </div>

    <div class="mini-stats">
      <div class="mini-card">
        <div class="mini-card__icon" style="background:var(--blue-50);color:var(--blue-600);">${ICON_DOC}</div>
        <div><div class="mini-card__value" id="statTotalHist">0</div><div class="mini-card__label">Tổng hợp đồng</div></div>
      </div>
      <div class="mini-card">
        <div class="mini-card__icon" style="background:var(--green-100);color:var(--green-600);">${ICON_CHECK}</div>
        <div><div class="mini-card__value" id="statCompletedHist">0</div><div class="mini-card__label">Đã hoàn tất</div></div>
      </div>
      <div class="mini-card">
        <div class="mini-card__icon" style="background:var(--violet-100);color:var(--violet-600);">${ICON_WEB}</div>
        <div><div class="mini-card__value" id="statWebHist">0</div><div class="mini-card__label">Hợp đồng Web</div></div>
      </div>
      <div class="mini-card">
        <div class="mini-card__icon" style="background:var(--amber-100);color:var(--amber-600);">${ICON_SEO}</div>
        <div><div class="mini-card__value" id="statSeoHist">0</div><div class="mini-card__label">Hợp đồng SEO</div></div>
      </div>
    </div>

    <div class="panel hist-filter-panel">
      <div class="hist-filter-row hist-filter-row--top">
        <label class="search-box hist-search">
          ${ICON_SEARCH}
          <input type="text" id="histKeyword" placeholder="Tìm theo số HĐ, tên khách hàng, người đại diện..." />
        </label>
        <div class="tabs" id="histTypeTabs">
          <button type="button" class="tab is-active" data-type="all">Tất cả</button>
          <button type="button" class="tab" data-type="web">Web</button>
          <button type="button" class="tab" data-type="seo">SEO</button>
        </div>
      </div>

      <div class="hist-filter-row hist-filter-row--grid">
        <div class="hist-field">
          <label>Trạng thái</label>
          <select id="histStatus">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_progress">Đang triển khai</option>
            <option value="completed">Hoàn tất</option>
          </select>
        </div>
        <div class="hist-field">
          <label>Thời gian ký</label>
          <select id="histDatePreset">
            ${DATE_PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("")}
          </select>
        </div>
        <div class="hist-field hist-hidden" id="histCustomFrom">
          <label>Từ ngày</label>
          <input type="date" id="histDateFrom" />
        </div>
        <div class="hist-field hist-hidden" id="histCustomTo">
          <label>Đến ngày</label>
          <input type="date" id="histDateTo" />
        </div>
        <div class="hist-field">
          <label>Giá trị từ (VNĐ)</label>
          <input type="number" min="0" step="1000" id="histValueMin" placeholder="0" />
        </div>
        <div class="hist-field">
          <label>Giá trị đến (VNĐ)</label>
          <input type="number" min="0" step="1000" id="histValueMax" placeholder="Không giới hạn" />
        </div>
        <div class="hist-field">
          <label>Sắp xếp</label>
          <select id="histSort">
            ${SORT_OPTIONS.map((o) => `<option value="${o.id}">${o.label}</option>`).join("")}
          </select>
        </div>
        <div class="hist-field hist-field--action">
          <label>&nbsp;</label>
          <button type="button" class="btn btn-ghost" id="histClearFilters">Xoá lọc</button>
        </div>
      </div>
    </div>

    <div class="panel hist-table-panel">
      <div class="hist-result-bar">
        <span id="histResultCount">0 hợp đồng</span>
      </div>

      <div class="hist-table-scroll">
        <table class="hist-table">
          <thead>
            <tr>
              <th>Số hợp đồng</th>
              <th>Khách hàng (Bên A)</th>
              <th>Loại</th>
              <th>Giá trị</th>
              <th>Ngày ký</th>
              <th>Trạng thái</th>
              <th style="text-align:right;">Hành động</th>
            </tr>
          </thead>
          <tbody id="historyTableBody">
            <tr class="skel-row"><td colspan="7"><div class="skel" style="width:70%;"></div></td></tr>
            <tr class="skel-row"><td colspan="7"><div class="skel" style="width:55%;"></div></td></tr>
            <tr class="skel-row"><td colspan="7"><div class="skel" style="width:65%;"></div></td></tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state hist-hidden" id="histEmptyState">
        ${ICON_EMPTY}
        <h4>Không tìm thấy hợp đồng nào</h4>
        <p>Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
      </div>

      <div class="hist-pager" id="histPager"></div>
    </div>

    <!-- ===================== MODAL: Xem nhanh hợp đồng ===================== -->
    <div class="modal" id="histPreviewModal">
      <div class="modal__backdrop"></div>
      <div class="modal__card hist-preview-card">
        <div class="modal__head">
          <div>
            <h3 id="histModalTitle">Xem hợp đồng</h3>
            <p class="hist-modal-sub" id="histModalSub"></p>
          </div>
          <button class="drawer__close" id="histModalClose" aria-label="Đóng">${ICON_CLOSE}</button>
        </div>
        <div class="modal__body hist-preview-body">
          <div id="histPreviewContent" class="contract-preview"></div>
        </div>
        <div class="modal__foot">
          <button class="btn btn-ghost" id="histModalDocx">${ICON_WORD} Tải Word (.docx)</button>
          <button class="btn btn-primary" id="histModalPdf">${ICON_PDF} Tải PDF</button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// BỘ LỌC
// ==========================================================================
function bindFilters(root, state) {
    const keywordInput = root.querySelector("#histKeyword");
    keywordInput.addEventListener("input", debounce(() => {
        state.filters.keyword = keywordInput.value.trim();
        applyFilters(root, state);
    }, 200));

    root.querySelector("#histTypeTabs").addEventListener("click", (e) => {
        const btn = e.target.closest(".tab");
        if (!btn) return;
        root.querySelectorAll("#histTypeTabs .tab").forEach((t) => t.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.filters.type = btn.dataset.type;
        applyFilters(root, state);
    });

    root.querySelector("#histStatus").addEventListener("change", (e) => {
        state.filters.status = e.target.value;
        applyFilters(root, state);
    });

    const customFrom = root.querySelector("#histCustomFrom");
    const customTo = root.querySelector("#histCustomTo");
    root.querySelector("#histDatePreset").addEventListener("change", (e) => {
        state.filters.datePreset = e.target.value;
        const isCustom = e.target.value === "custom";
        customFrom.classList.toggle("hist-hidden", !isCustom);
        customTo.classList.toggle("hist-hidden", !isCustom);
        applyFilters(root, state);
    });
    root.querySelector("#histDateFrom").addEventListener("change", (e) => {
        state.filters.dateFrom = e.target.value;
        applyFilters(root, state);
    });
    root.querySelector("#histDateTo").addEventListener("change", (e) => {
        state.filters.dateTo = e.target.value;
        applyFilters(root, state);
    });

    root.querySelector("#histValueMin").addEventListener("input", debounce(() => {
        state.filters.valueMin = root.querySelector("#histValueMin").value;
        applyFilters(root, state);
    }, 250));
    root.querySelector("#histValueMax").addEventListener("input", debounce(() => {
        state.filters.valueMax = root.querySelector("#histValueMax").value;
        applyFilters(root, state);
    }, 250));

    root.querySelector("#histSort").addEventListener("change", (e) => {
        state.filters.sort = e.target.value;
        applyFilters(root, state);
    });

    root.querySelector("#histClearFilters").addEventListener("click", () => resetFilters(root, state));
}

function resetFilters(root, state) {
    state.filters = { ...DEFAULT_FILTERS };

    root.querySelector("#histKeyword").value = "";
    root.querySelectorAll("#histTypeTabs .tab").forEach((t) => t.classList.toggle("is-active", t.dataset.type === "all"));
    root.querySelector("#histStatus").value = "all";
    root.querySelector("#histDatePreset").value = "all";
    root.querySelector("#histDateFrom").value = "";
    root.querySelector("#histDateTo").value = "";
    root.querySelector("#histCustomFrom").classList.add("hist-hidden");
    root.querySelector("#histCustomTo").classList.add("hist-hidden");
    root.querySelector("#histValueMin").value = "";
    root.querySelector("#histValueMax").value = "";
    root.querySelector("#histSort").value = "createdAt_desc";

    applyFilters(root, state);
}

function debounce(fn, wait) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt có/không dấu. */
function stripDiacritics(str) {
    return String(str ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
function endOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
function parseInputDateLocal(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function resolveDateRange(f) {
    const now = new Date();
    switch (f.datePreset) {
        case "today":
            return { from: startOfDay(now), to: endOfDay(now) };
        case "7d": {
            const from = new Date(now); from.setDate(from.getDate() - 6);
            return { from: startOfDay(from), to: endOfDay(now) };
        }
        case "30d": {
            const from = new Date(now); from.setDate(from.getDate() - 29);
            return { from: startOfDay(from), to: endOfDay(now) };
        }
        case "month":
            return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
        case "custom": {
            if (!f.dateFrom && !f.dateTo) return null;
            const from = f.dateFrom ? startOfDay(parseInputDateLocal(f.dateFrom)) : new Date(0);
            const to = f.dateTo ? endOfDay(parseInputDateLocal(f.dateTo)) : endOfDay(now);
            return { from, to };
        }
        default:
            return null;
    }
}

function applyFilters(root, state) {
    const f = state.filters;
    const kw = stripDiacritics(f.keyword);
    const range = resolveDateRange(f);
    const min = f.valueMin !== "" ? Number(f.valueMin) : null;
    const max = f.valueMax !== "" ? Number(f.valueMax) : null;

    let list = state.all.filter((c) => {
        if (f.type !== "all" && c.type !== f.type) return false;
        if (f.status !== "all" && (c.status || "pending") !== f.status) return false;

        if (kw) {
            const haystack = stripDiacritics(
                `${c.contractNumber || ""} ${c.partyA?.companyName || ""} ${c.partyA?.representativeName || ""}`
            );
            if (!haystack.includes(kw)) return false;
        }

        const value = Number(c.content?.contractValue) || 0;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;

        if (range && c.signDate instanceof Date) {
            if (c.signDate < range.from || c.signDate > range.to) return false;
        }

        return true;
    });

    list.sort((a, b) => {
        const aVal = Number(a.content?.contractValue) || 0;
        const bVal = Number(b.content?.contractValue) || 0;
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        switch (f.sort) {
            case "createdAt_asc": return aTime - bTime;
            case "value_desc": return bVal - aVal;
            case "value_asc": return aVal - bVal;
            case "createdAt_desc":
            default: return bTime - aTime;
        }
    });

    state.filtered = list;
    state.page = 1;
    renderStats(root, state.all);
    renderTable(root, state);
}

// ==========================================================================
// BẢNG KẾT QUẢ + PHÂN TRANG
// ==========================================================================
function renderStats(root, all) {
    root.querySelector("#statTotalHist").textContent = all.length;
    root.querySelector("#statCompletedHist").textContent = all.filter((c) => c.status === "completed").length;
    root.querySelector("#statWebHist").textContent = all.filter((c) => c.type === "web").length;
    root.querySelector("#statSeoHist").textContent = all.filter((c) => c.type === "seo").length;
}

function renderTable(root, state) {
    const tbody = root.querySelector("#historyTableBody");
    const emptyState = root.querySelector("#histEmptyState");
    const resultCount = root.querySelector("#histResultCount");

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const startIdx = (state.page - 1) * PAGE_SIZE;
    const pageItems = state.filtered.slice(startIdx, startIdx + PAGE_SIZE);

    resultCount.textContent = state.filtered.length === state.all.length
        ? `${state.filtered.length} hợp đồng`
        : `${state.filtered.length} / ${state.all.length} hợp đồng`;

    if (!pageItems.length) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hist-hidden");
    } else {
        emptyState.classList.add("hist-hidden");
        tbody.innerHTML = pageItems.map(rowHtml).join("");
    }

    renderPager(root, state, totalPages);
}

function rowHtml(c) {
    const value = Number(c.content?.contractValue) || 0;
    const status = c.status || "pending";
    const partyAName = c.partyA?.companyName || c.partyA?.representativeName || "—";
    return `
    <tr data-id="${escapeHtml(c.id)}">
      <td data-label="Số hợp đồng"><span class="hist-number">${escapeHtml(c.contractNumber)}</span></td>
      <td data-label="Khách hàng">
        <div class="hist-customer">
          <span class="hist-customer__name">${escapeHtml(partyAName)}</span>
          ${c.partyA?.representativeName ? `<span class="hist-customer__sub">${escapeHtml(c.partyA.representativeName)}</span>` : ""}
        </div>
      </td>
      <td data-label="Loại"><span class="hist-type hist-type--${c.type}">${TYPE_LABELS[c.type] || c.type}</span></td>
      <td data-label="Giá trị"><strong>${value.toLocaleString("vi-VN")} đ</strong></td>
      <td data-label="Ngày ký">${c.signDate instanceof Date ? toShortDate(c.signDate) : "—"}</td>
      <td data-label="Trạng thái"><span class="hist-status hist-status--${status}">${STATUS_LABELS[status] || status}</span></td>
      <td data-label="Hành động">
        <div class="row-actions">
          <button type="button" class="icon-action" data-action="view" data-id="${escapeHtml(c.id)}" title="Xem nhanh" aria-label="Xem nhanh">${ICON_EYE}</button>
          <button type="button" class="icon-action" data-action="docx" data-id="${escapeHtml(c.id)}" title="Tải Word (.docx)" aria-label="Tải Word">${ICON_WORD}</button>
          <button type="button" class="icon-action" data-action="pdf" data-id="${escapeHtml(c.id)}" title="Tải PDF" aria-label="Tải PDF">${ICON_PDF}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderPager(root, state, totalPages) {
    const pager = root.querySelector("#histPager");
    if (totalPages <= 1) { pager.innerHTML = ""; return; }

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    pager.innerHTML = `
    <button type="button" class="hist-pager__btn" data-page="prev" ${state.page === 1 ? "disabled" : ""} aria-label="Trang trước">${ICON_CHEVRON_LEFT}</button>
    ${pages.map((p) => `<button type="button" class="hist-pager__num ${p === state.page ? "is-active" : ""}" data-page="${p}">${p}</button>`).join("")}
    <button type="button" class="hist-pager__btn" data-page="next" ${state.page === totalPages ? "disabled" : ""} aria-label="Trang sau">${ICON_CHEVRON_RIGHT}</button>
  `;

    pager.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.page;
            if (val === "prev") state.page = Math.max(1, state.page - 1);
            else if (val === "next") state.page = Math.min(totalPages, state.page + 1);
            else state.page = Number(val);
            renderTable(root, state);
        });
    });
}

// ==========================================================================
// HÀNH ĐỘNG TRÊN TỪNG DÒNG (xem nhanh / tải docx / tải pdf)
// Dùng event delegation gắn 1 lần trên tbody — không cần rebind sau mỗi lần
// renderTable() vẽ lại bảng.
// ==========================================================================
function bindRowActionsDelegation(root, state) {
    root.querySelector("#historyTableBody").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const contract = state.all.find((c) => c.id === btn.dataset.id);
        if (!contract) return;

        const action = btn.dataset.action;
        if (action === "view") openPreviewModal(root, contract);
        else if (action === "docx") handleDownload(btn, contract, "docx");
        else if (action === "pdf") handleDownload(btn, contract, "pdf");
    });
}

// ==========================================================================
// MODAL XEM NHANH
// ==========================================================================
function bindModal(root, state) {
    const modal = root.querySelector("#histPreviewModal");

    const close = () => modal.classList.remove("is-open");
    root.querySelector("#histModalClose").addEventListener("click", close);
    modal.querySelector(".modal__backdrop").addEventListener("click", close);

    root.querySelector("#histModalDocx").addEventListener("click", (e) => {
        const contract = state.all.find((c) => c.id === modal.dataset.activeId);
        if (contract) handleDownload(e.currentTarget, contract, "docx");
    });
    root.querySelector("#histModalPdf").addEventListener("click", (e) => {
        const contract = state.all.find((c) => c.id === modal.dataset.activeId);
        if (contract) handleDownload(e.currentTarget, contract, "pdf");
    });
}

function openPreviewModal(root, contract) {
    const modal = root.querySelector("#histPreviewModal");
    root.querySelector("#histModalTitle").textContent = contract.contractNumber || "Xem hợp đồng";
    root.querySelector("#histModalSub").textContent =
        `${TYPE_LABELS[contract.type] || contract.type} · Xuất lúc ${formatDateTime(contract.createdAt)}`;
    root.querySelector("#histPreviewContent").innerHTML = buildContractPreviewHtml(contract.type, contract);

    modal.dataset.activeId = contract.id;
    modal.classList.add("is-open");
}

function formatDateTime(date) {
    if (!(date instanceof Date)) return "—";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm} ${toShortDate(date)}`;
}

// ==========================================================================
// TẢI LẠI FILE (.docx / .pdf) — TÁI TẠO TRỰC TIẾP TỪ DỮ LIỆU ĐÃ LƯU
// `contract` đã được chuẩn hoá (signDate là Date) ở contract-service.js nên
// có thể truyền thẳng vào generateContractDocx/generateSeoContractDocx và
// generateContractPdf/generateSeoContractPdf — đúng shape dữ liệu mà 2 file
// generator này đang nhận từ contract-web-view.js / contract-seo-view.js.
// ==========================================================================
async function handleDownload(btn, contract, kind) {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add("is-loading");

    try {
        const filenameSafe = String(contract.contractNumber || "hop-dong").replace(/[\\/:*?"<>|]/g, "-");

        let blob;
        if (kind === "docx") {
            blob = contract.type === "seo"
                ? await generateSeoContractDocx(contract)
                : await generateContractDocx(contract);
            downloadBlob(blob, `${filenameSafe}.docx`);
        } else {
            blob = contract.type === "seo"
                ? await generateSeoContractPdf(contract)
                : await generateContractPdf(contract);
            downloadBlob(blob, `${filenameSafe}.pdf`);
        }

        showToast(`Đã tải lại file ${kind === "docx" ? "Word" : "PDF"} thành công!`, "success");
    } catch (err) {
        console.error("Lỗi tải lại file hợp đồng:", err);
        showToast("Không thể tạo lại file. Vui lòng thử lại.", "error");
    } finally {
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.innerHTML = originalHtml;
    }
}