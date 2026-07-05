// ==========================================================================
// VIEWS/SETTINGS-VIEW.JS — Trang "Cài đặt hệ thống" > "Thông tin doanh nghiệp"
//
// Đây là nơi nhập MỘT LẦN toàn bộ thông tin Bên B (công ty của bạn). Các form
// tạo hợp đồng (contract-web-view.js, contract-seo-view.js...) sẽ tự động
// điền (autofill) từ đây, người dùng chỉ cần sửa lại nếu có trường hợp đặc
// biệt cho riêng 1 hợp đồng, không ảnh hưởng tới cấu hình gốc lưu tại đây.
// ==========================================================================

import { getBusinessInfo, saveBusinessInfo } from "../services/settings-service.js";
import { showToast } from "../services/toast.js";
import { placeholderMarkup } from "../components/placeholder.js";

const FIELDS = [
  { key: "companyName", label: "Tên công ty", required: true, full: true },
  { key: "taxCode", label: "Mã số thuế", required: true },
  { key: "representativeTitle", label: "Danh xưng người đại diện", type: "select", options: ["Ông", "Bà"] },
  { key: "representativeName", label: "Người đại diện", required: true },
  { key: "representativePosition", label: "Chức vụ", required: true },
  { key: "address", label: "Địa chỉ", required: true, full: true },
  { key: "hotline", label: "Hotline / Số điện thoại", required: true },
  { key: "email", label: "Email", required: true, type: "email" },
  { key: "bankAccount", label: "Số tài khoản" },
  { key: "bankName", label: "Ngân hàng" },
];

/**
 * @param {HTMLElement} container - #main-content
 * @returns {Promise<() => void>} cleanup
 */
export async function render(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Thông tin doanh nghiệp</h2>
        <p>Thông tin Bên B — được tự động điền vào mọi hợp đồng khi tạo mới.</p>
      </div>
    </div>
    <div class="panel settings-panel">
      <div id="settingsFormWrap"><div class="view-loading">Đang tải...</div></div>
    </div>
  `;

  const formWrap = container.querySelector("#settingsFormWrap");
  let businessInfo;

  try {
    businessInfo = await getBusinessInfo();
  } catch (err) {
    console.error("Lỗi tải thông tin doanh nghiệp:", err);
    formWrap.innerHTML = placeholderMarkup({
      title: "Không thể tải dữ liệu",
      description: "Vui lòng kiểm tra kết nối và thử lại.",
      iconSvg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/></svg>`,
    });
    return () => {};
  }

  formWrap.innerHTML = `
    <form id="businessForm" class="settings-form" novalidate>
      <div class="form-grid">
        ${FIELDS.map(fieldMarkup).join("")}
      </div>
      <div class="settings-form__actions">
        <button type="submit" class="btn btn-primary" id="saveBusinessBtn">Lưu thông tin</button>
      </div>
    </form>
  `;

  const form = formWrap.querySelector("#businessForm");
  FIELDS.forEach((f) => {
    const el = form.querySelector(`[name="${f.key}"]`);
    if (el) el.value = businessInfo[f.key] ?? "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const values = {};
    let hasError = false;

    FIELDS.forEach((f) => {
      const el = form.querySelector(`[name="${f.key}"]`);
      const value = (el?.value || "").trim();
      const wrap = el?.closest(".form-field");

      if (f.required && !value) {
        wrap?.classList.add("has-error");
        hasError = true;
      } else {
        wrap?.classList.remove("has-error");
      }
      values[f.key] = value;
    });

    if (hasError) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
      return;
    }

    const saveBtn = form.querySelector("#saveBusinessBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu...";

    try {
      await saveBusinessInfo(values);
      showToast("Đã lưu thông tin doanh nghiệp.", "success");
    } catch (err) {
      console.error("Lỗi lưu thông tin doanh nghiệp:", err);
      showToast("Lưu thất bại. Vui lòng thử lại.", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu thông tin";
    }
  });

  return () => {};
}

function fieldMarkup(f) {
  const requiredMark = f.required ? ' <span class="req">*</span>' : "";
  const fieldClass = f.full ? "form-field form-field--full" : "form-field";

  if (f.type === "select") {
    return `
      <div class="${fieldClass}">
        <label>${f.label}${requiredMark}</label>
        <select name="${f.key}">
          ${f.options.map((o) => `<option value="${o}">${o}</option>`).join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="${fieldClass}">
      <label>${f.label}${requiredMark}</label>
      <input type="${f.type || "text"}" name="${f.key}" placeholder="Nhập ${f.label.toLowerCase()}" />
    </div>
  `;
}
