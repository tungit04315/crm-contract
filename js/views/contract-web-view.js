// ==========================================================================
// VIEWS/CONTRACT-WEB-VIEW.JS — Trang "Tạo hợp đồng Web"
//
// Wizard 5 bước, đúng logic yêu cầu:
//   1. Thông tin hợp đồng   (số HĐ tự sinh, ngày ký)
//   2. Bên A (khách hàng)   (nhập mới toàn bộ)
//   3. Nội dung & Giá trị   (những gì thay đổi theo từng dự án)
//   4. Bên B (doanh nghiệp) (tự động điền từ Cài đặt hệ thống, có thể sửa)
//   5. Xem trước & Xuất file (.docx tải trực tiếp, PDF qua in trình duyệt)
//
// Chỉ hoàn thành 1 bước mới được đi bước kế tiếp (validate mỗi bước).
// ==========================================================================

import { getBusinessInfo } from "../services/settings-service.js";
import { buildContractNumber, saveContract } from "../services/contract-service.js";
import { generateContractDocx, downloadBlob } from "../services/docx-generator.js";
import { generateContractPdf } from "../services/pdf-generator.js";
import { soTienBangChu } from "../utils/number-to-words.js";
import { toInputDateValue, toVietnameseLongDate, toShortDate, parseInputDate } from "../utils/date-utils.js";
import { createFormWizard } from "../components/form-wizard.js";
import { showToast } from "../services/toast.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { id: "info", label: "Thông tin hợp đồng" },
  { id: "party-a", label: "Bên A - Khách hàng" },
  { id: "content", label: "Nội dung & Giá trị" },
  { id: "party-b", label: "Bên B - Doanh nghiệp" },
  { id: "preview", label: "Xem trước & Xuất file" },
];

/**
 * @param {HTMLElement} container - #main-content
 * @returns {Promise<() => void>} cleanup
 */
export async function render(container) {
  container.innerHTML = `<div class="view-loading">Đang tải...</div>`;

  let businessInfo;
  try {
    businessInfo = await getBusinessInfo();
  } catch (err) {
    console.error("Lỗi tải thông tin doanh nghiệp:", err);
    businessInfo = null;
  }

  const state = {
    contractNumber: "",
    numberTouched: false,
    signDate: toInputDateValue(new Date()),
    partyA: { companyName: "", taxCode: "", representativeTitle: "Ông", representativeName: "", representativePosition: "", address: "", phone: "", email: "" },
    content: { domainNote: "Tặng 01 tên miền .com", hostingNote: "2GB", extraServicesNote: "Thiết kế website chuẩn SEO, đa phương tiện.", demoDays: 10, acceptanceDays: 1, contractValue: 0, vatPercent: 8, effectiveDate: "", liquidationDate: "" },
    partyB: businessInfo || { companyName: "", taxCode: "", address: "", hotline: "", email: "", bankAccount: "", bankName: "", representativeTitle: "Ông", representativeName: "", representativePosition: "" },
  };

  container.innerHTML = buildMarkup();

  const root = container.querySelector("[data-wizard-root]");
  const businessWarning = container.querySelector("#businessMissingWarning");
  if (!businessInfo || !businessInfo.companyName) {
    businessWarning.classList.remove("hidden");
  }

  // Sinh sẵn số hợp đồng gợi ý (dựa trên ngày ký) NGAY khi mở trang, để
  // Bước 1 không bị kẹt do ô số HĐ trống. Khi qua Bước 2 (đã có tên Bên A),
  // số này sẽ được làm mới cho chính xác hơn (xem maybeRegenerateNumber).
  maybeRegenerateNumber(root, state);

  bindStepInfo(root, state);
  bindStepPartyA(root, state);
  bindStepContent(root, state);
  bindStepPartyB(root, state);

  const wizard = createFormWizard({
    root,
    steps: STEPS,
    validateStep: (stepId) => validateStep(stepId, root, state),
    onStepEnter: (stepId) => {
      if (stepId === "content" || stepId === "party-b") maybeRegenerateNumber(root, state);
      if (stepId === "preview") renderPreview(root, state);
    },
    onFinish: () => handleFinish(root, state, wizard),
  });

  // "Tải file Word (.docx)": xuất thêm bản Word phụ, KHÔNG lưu vào Firestore
  // (việc lưu chỉ gắn với hành động "Hoàn tất & Xuất file" ở thanh điều hướng
  // dưới cùng, tránh trường hợp bấm nhiều nút gây lưu trùng / gây nhầm lẫn).
  root.querySelector("#btnExportDocx")?.addEventListener("click", () => exportDocx(root, state));
  // "In / Lưu PDF": mở hộp thoại in của trình duyệt để người dùng tự lưu PDF thủ công.
  root.querySelector("#btnExportPdf")?.addEventListener("click", () => exportPdfViaPrint(root, state));

  return () => { };
}

// ==========================================================================
// MARKUP
// ==========================================================================
function buildMarkup() {
  return `
    <div class="page-head">
      <div>
        <h2>Tạo hợp đồng Web</h2>
        <p>Điền lần lượt các bước bên dưới. Thông tin Bên B được tự động lấy từ Cài đặt hệ thống.</p>
      </div>
    </div>

    <div id="businessMissingWarning" class="banner-warning hidden">
      Chưa có thông tin doanh nghiệp (Bên B). Vào <strong>Cài đặt hệ thống → Thông tin doanh nghiệp</strong>
      để thiết lập một lần, các hợp đồng sau sẽ tự động điền.
    </div>

    <div class="wizard-panel panel" data-wizard-root>
      <div class="wizard-indicator" data-wizard-indicator></div>

      <div class="wizard-body">

        <!-- STEP 1: Thông tin hợp đồng -->
        <div class="wizard-step-panel" data-wizard-panel="info">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Số hợp đồng <span class="req">*</span></label>
              <input type="text" id="f-contractNumber" placeholder="Tự động sinh khi nhập Bên A / ngày ký" />
              <p class="field-hint">Tự động gợi ý theo ngày ký + tên khách hàng. Bạn có thể sửa lại tự do.</p>
            </div>
            <div class="form-field">
              <label>Ngày ký hợp đồng <span class="req">*</span></label>
              <input type="date" id="f-signDate" />
            </div>
          </div>
        </div>

        <!-- STEP 2: Bên A -->
        <div class="wizard-step-panel" data-wizard-panel="party-a">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên công ty <span class="req">*</span></label>
              <input type="text" id="a-companyName" placeholder="CÔNG TY CỔ PHẦN ..." />
            </div>
            <div class="form-field">
              <label>Mã số thuế <span class="req">*</span></label>
              <input type="text" id="a-taxCode" />
            </div>
            <div class="form-field">
              <label>Danh xưng</label>
              <select id="a-representativeTitle">
                <option value="Ông">Ông</option>
                <option value="Bà">Bà</option>
              </select>
            </div>
            <div class="form-field">
              <label>Người đại diện <span class="req">*</span></label>
              <input type="text" id="a-representativeName" />
            </div>
            <div class="form-field">
              <label>Chức vụ <span class="req">*</span></label>
              <input type="text" id="a-representativePosition" />
            </div>
            <div class="form-field form-field--full">
              <label>Địa chỉ <span class="req">*</span></label>
              <input type="text" id="a-address" />
            </div>
            <div class="form-field">
              <label>Số điện thoại <span class="req">*</span></label>
              <input type="text" id="a-phone" />
            </div>
            <div class="form-field">
              <label>Email <span class="req">*</span></label>
              <input type="email" id="a-email" />
            </div>
          </div>
        </div>

        <!-- STEP 3: Nội dung & Giá trị -->
        <div class="wizard-step-panel" data-wizard-panel="content">
          <div class="form-grid">
            <div class="form-field">
              <label>Tên miền tặng kèm <span class="req">*</span></label>
              <input type="text" id="c-domainNote" />
            </div>
            <div class="form-field">
              <label>Dung lượng Hosting <span class="req">*</span></label>
              <input type="text" id="c-hostingNote" />
            </div>
            <div class="form-field form-field--full">
              <label>Nội dung khác (dịch vụ đi kèm)</label>
              <input type="text" id="c-extraServicesNote" />
            </div>
            <div class="form-field">
              <label>Thời gian bàn giao demo (ngày làm việc) <span class="req">*</span></label>
              <input type="number" min="1" id="c-demoDays" />
            </div>
            <div class="form-field">
              <label>Thời gian nghiệm thu (ngày làm việc) <span class="req">*</span></label>
              <input type="number" min="1" id="c-acceptanceDays" />
            </div>
            <div class="form-field">
              <label>Giá trị hợp đồng (VNĐ, đã gồm VAT) <span class="req">*</span></label>
              <input type="number" min="0" step="1000" id="c-contractValue" />
            </div>
            <div class="form-field">
              <label>Thuế VAT (%) <span class="req">*</span></label>
              <input type="number" min="0" max="100" id="c-vatPercent" />
            </div>
            <div class="form-field">
              <label>Ngày hiệu lực hợp đồng</label>
              <input type="date" id="c-effectiveDate" />
              <p class="field-hint">Bỏ trống = lấy theo ngày ký.</p>
            </div>
            <div class="form-field">
              <label>Hạn thanh lý hợp đồng</label>
              <input type="date" id="c-liquidationDate" />
              <p class="field-hint">Bỏ trống = ngày ký + 30 ngày.</p>
            </div>
          </div>
          <p class="value-in-words" id="valueInWords"></p>
        </div>

        <!-- STEP 4: Bên B -->
        <div class="wizard-step-panel" data-wizard-panel="party-b">
          <p class="field-hint" style="margin-bottom:14px;">Đã tự động điền từ Cài đặt hệ thống. Chỉ sửa nếu hợp đồng này cần thông tin khác.</p>
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên công ty <span class="req">*</span></label>
              <input type="text" id="b-companyName" />
            </div>
            <div class="form-field">
              <label>Mã số thuế <span class="req">*</span></label>
              <input type="text" id="b-taxCode" />
            </div>
            <div class="form-field">
              <label>Danh xưng</label>
              <select id="b-representativeTitle">
                <option value="Ông">Ông</option>
                <option value="Bà">Bà</option>
              </select>
            </div>
            <div class="form-field">
              <label>Người đại diện <span class="req">*</span></label>
              <input type="text" id="b-representativeName" />
            </div>
            <div class="form-field">
              <label>Chức vụ <span class="req">*</span></label>
              <input type="text" id="b-representativePosition" />
            </div>
            <div class="form-field form-field--full">
              <label>Địa chỉ <span class="req">*</span></label>
              <input type="text" id="b-address" />
            </div>
            <div class="form-field">
              <label>Hotline <span class="req">*</span></label>
              <input type="text" id="b-hotline" />
            </div>
            <div class="form-field">
              <label>Email <span class="req">*</span></label>
              <input type="email" id="b-email" />
            </div>
            <div class="form-field">
              <label>Số tài khoản</label>
              <input type="text" id="b-bankAccount" />
            </div>
            <div class="form-field">
              <label>Ngân hàng</label>
              <input type="text" id="b-bankName" />
            </div>
          </div>
        </div>

        <!-- STEP 5: Xem trước -->
        <div class="wizard-step-panel" data-wizard-panel="preview">
          <div id="previewContent" class="contract-preview"></div>
          <div class="preview-actions">
            <button type="button" class="btn btn-ghost" id="btnExportPdf">In / Lưu PDF</button>
            <button type="button" class="btn btn-primary" id="btnExportDocx">Tải file Word (.docx)</button>
          </div>
        </div>

      </div>

      <div class="wizard-nav">
        <button type="button" class="btn btn-ghost" data-wizard-prev>Quay lại</button>
        <button type="button" class="btn btn-primary" data-wizard-next>Tiếp theo</button>
      </div>
    </div>
  `;
}

// ==========================================================================
// BIND: từng bước đọc/ghi vào `state`
// ==========================================================================
function bindStepInfo(root, state) {
  const numberInput = root.querySelector("#f-contractNumber");
  const dateInput = root.querySelector("#f-signDate");
  dateInput.value = state.signDate;
  numberInput.value = state.contractNumber;

  numberInput.addEventListener("input", () => {
    state.numberTouched = true;
    state.contractNumber = numberInput.value.trim();
  });
  dateInput.addEventListener("change", () => {
    state.signDate = dateInput.value;
    // Ngày ký đổi -> làm mới số HĐ gợi ý (nếu người dùng chưa tự sửa tay)
    maybeRegenerateNumber(root, state);
  });
}

function bindStepPartyA(root, state) {
  const map = {
    companyName: "#a-companyName", taxCode: "#a-taxCode", representativeTitle: "#a-representativeTitle",
    representativeName: "#a-representativeName", representativePosition: "#a-representativePosition",
    address: "#a-address", phone: "#a-phone", email: "#a-email",
  };
  wireFields(root, map, state.partyA);
}

function bindStepContent(root, state) {
  const map = {
    domainNote: "#c-domainNote", hostingNote: "#c-hostingNote", extraServicesNote: "#c-extraServicesNote",
    demoDays: "#c-demoDays", acceptanceDays: "#c-acceptanceDays", contractValue: "#c-contractValue",
    vatPercent: "#c-vatPercent", effectiveDate: "#c-effectiveDate", liquidationDate: "#c-liquidationDate",
  };
  Object.entries(map).forEach(([key, sel]) => {
    root.querySelector(sel).value = state.content[key] ?? "";
  });
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    el.addEventListener("input", () => {
      state.content[key] = el.type === "number" ? Number(el.value) : el.value;
      if (key === "contractValue") updateValueInWords(root, state);
    });
  });
  updateValueInWords(root, state);
}

function bindStepPartyB(root, state) {
  const map = {
    companyName: "#b-companyName", taxCode: "#b-taxCode", representativeTitle: "#b-representativeTitle",
    representativeName: "#b-representativeName", representativePosition: "#b-representativePosition",
    address: "#b-address", hotline: "#b-hotline", email: "#b-email",
    bankAccount: "#b-bankAccount", bankName: "#b-bankName",
  };
  wireFields(root, map, state.partyB);
}

function wireFields(root, map, target) {
  Object.entries(map).forEach(([key, sel]) => {
    root.querySelector(sel).value = target[key] ?? "";
  });
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    el.addEventListener("input", () => {
      target[key] = el.value;
    });
  });
}

function updateValueInWords(root, state) {
  const el = root.querySelector("#valueInWords");
  if (!el) return;
  const v = Number(state.content.contractValue) || 0;
  el.textContent = v > 0 ? `Bằng chữ: ${soTienBangChu(v)}.` : "";
}

function maybeRegenerateNumber(root, state) {
  if (state.numberTouched) return;
  const signDate = parseInputDate(state.signDate) || new Date();
  const suggestion = buildContractNumber({
    signDate,
    representativeName: state.partyA.representativeName,
    type: "web",
  });
  state.contractNumber = suggestion;
  const numberInput = root.querySelector("#f-contractNumber");
  if (numberInput) numberInput.value = suggestion;
}

// ==========================================================================
// VALIDATE
// ==========================================================================
function validateStep(stepId, root, state) {
  if (stepId === "info") {
    if (!state.contractNumber.trim()) return fail("Vui lòng nhập số hợp đồng.");
    if (!state.signDate) return fail("Vui lòng chọn ngày ký hợp đồng.");
    return true;
  }

  if (stepId === "party-a") {
    const a = state.partyA;
    if (!a.companyName || !a.taxCode || !a.representativeName || !a.representativePosition || !a.address || !a.phone || !a.email) {
      return fail("Vui lòng điền đầy đủ thông tin Bên A.");
    }
    if (!EMAIL_REGEX.test(a.email)) return fail("Email Bên A không đúng định dạng.");
    return true;
  }

  if (stepId === "content") {
    const c = state.content;
    if (!c.domainNote || !c.hostingNote) return fail("Vui lòng điền tên miền và hosting.");
    if (!c.demoDays || c.demoDays <= 0) return fail("Thời gian bàn giao demo không hợp lệ.");
    if (!c.acceptanceDays || c.acceptanceDays <= 0) return fail("Thời gian nghiệm thu không hợp lệ.");
    if (!c.contractValue || c.contractValue <= 0) return fail("Vui lòng nhập giá trị hợp đồng.");
    if (c.vatPercent < 0 || c.vatPercent > 100) return fail("Thuế VAT không hợp lệ.");
    return true;
  }

  if (stepId === "party-b") {
    const b = state.partyB;
    if (!b.companyName || !b.taxCode || !b.address || !b.hotline || !b.email || !b.representativeName || !b.representativePosition) {
      return fail("Vui lòng điền đầy đủ thông tin Bên B.");
    }
    if (!EMAIL_REGEX.test(b.email)) return fail("Email Bên B không đúng định dạng.");
    return true;
  }

  return true;
}

function fail(message) {
  showToast(message, "error");
  return false;
}

// ==========================================================================
// PREVIEW (bước 5)
// ==========================================================================
function renderPreview(root, state) {
  const el = root.querySelector("#previewContent");
  const signDate = parseInputDate(state.signDate) || new Date();
  const c = state.content;
  const vatAmount = Math.round((c.contractValue * c.vatPercent) / (100 + c.vatPercent));
  const dot1 = Math.round(c.contractValue / 2);
  const dot2 = c.contractValue - dot1;

  el.innerHTML = `
    <h3 class="preview-title">HỢP ĐỒNG DỊCH VỤ THIẾT KẾ WEBSITE</h3>
    <p class="preview-sub">Số: ${escapeHtml(state.contractNumber)}</p>
    <p class="preview-sub">${toVietnameseLongDate(signDate)}</p>

    <div class="preview-grid">
      <div>
        <h4>BÊN A</h4>
        <p><strong>${escapeHtml(state.partyA.companyName)}</strong></p>
        <p>MST: ${escapeHtml(state.partyA.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(state.partyA.representativeTitle)} ${escapeHtml(state.partyA.representativeName)} — ${escapeHtml(state.partyA.representativePosition)}</p>
        <p>${escapeHtml(state.partyA.address)}</p>
        <p>${escapeHtml(state.partyA.phone)} · ${escapeHtml(state.partyA.email)}</p>
      </div>
      <div>
        <h4>BÊN B</h4>
        <p><strong>${escapeHtml(state.partyB.companyName)}</strong></p>
        <p>MST: ${escapeHtml(state.partyB.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(state.partyB.representativeTitle)} ${escapeHtml(state.partyB.representativeName)} — ${escapeHtml(state.partyB.representativePosition)}</p>
        <p>${escapeHtml(state.partyB.address)}</p>
        <p>${escapeHtml(state.partyB.hotline)} · ${escapeHtml(state.partyB.email)}</p>
        <p>STK: ${escapeHtml(state.partyB.bankAccount)} — ${escapeHtml(state.partyB.bankName)}</p>
      </div>
    </div>

    <h4>Nội dung & Giá trị hợp đồng</h4>
    <ul class="preview-list">
      <li>Tên miền: ${escapeHtml(c.domainNote)} · Hosting: ${escapeHtml(c.hostingNote)}</li>
      <li>${escapeHtml(c.extraServicesNote)}</li>
      <li>Bàn giao demo trong ${c.demoDays} ngày làm việc · Nghiệm thu trong ${c.acceptanceDays} ngày làm việc</li>
      <li>Giá trị hợp đồng: <strong>${c.contractValue.toLocaleString("vi-VN")} VNĐ</strong> (đã gồm VAT ${c.vatPercent}% = ${vatAmount.toLocaleString("vi-VN")} VNĐ)</li>
      <li>Bằng chữ: ${soTienBangChu(c.contractValue)}</li>
      <li>Đợt 1: ${dot1.toLocaleString("vi-VN")} VNĐ (ký hợp đồng) · Đợt 2: ${dot2.toLocaleString("vi-VN")} VNĐ (nghiệm thu)</li>
    </ul>

    <p class="field-hint">Toàn bộ 10 Điều khoản đầy đủ (phạm vi, thời gian, thanh toán, quyền & nghĩa vụ, nghiệm thu, bàn giao, bảo hành, chấm dứt, bồi thường, điều khoản chung) sẽ được đưa nguyên văn vào file xuất ra — đúng như hợp đồng mẫu gốc.</p>
  `;
}

// ==========================================================================
// FINISH: lưu Firestore + xuất file
// ==========================================================================
function collectFormData(state) {
  const signDate = parseInputDate(state.signDate) || new Date();
  return {
    contractNumber: state.contractNumber,
    signDate,
    partyA: { ...state.partyA },
    partyB: { ...state.partyB },
    content: {
      ...state.content,
      effectiveDate: state.content.effectiveDate ? parseInputDate(state.content.effectiveDate) : null,
      liquidationDate: state.content.liquidationDate ? parseInputDate(state.content.liquidationDate) : null,
    },
  };
}

async function handleFinish(root, state, wizard) {
  try {
    await exportPdf(root, state);
  } catch {
    // Đã báo lỗi bên trong exportPdf(); dừng lại, KHÔNG lưu Firestore
    // nếu file chưa xuất được, tránh tạo bản ghi "đã hoàn tất" ảo.
    return;
  }
  await persistContract(state, wizard);
}

async function persistContract(state, wizard) {
  try {
    await saveContract(collectFormData(state), "web");
    showToast("Đã lưu hợp đồng vào hệ thống.", "success");
  } catch (err) {
    if (String(err?.message).startsWith("DUPLICATE_CONTRACT_NUMBER")) {
      showToast("Số hợp đồng này đã tồn tại. Vui lòng quay lại Bước 1 để sửa số khác.", "error");
      wizard?.goTo(0);
      return;
    }
    console.error("Lỗi lưu hợp đồng:", err);
    showToast("Xuất file thành công nhưng lưu vào hệ thống thất bại.", "warning");
  }
}

async function exportDocx(root, state) {
  const btn = root.querySelector("#btnExportDocx");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Đang tạo file..."; }
  try {
    const blob = await generateContractDocx(collectFormData(state));
    downloadBlob(blob, `${state.contractNumber.replace(/[\\/:*?"<>|]/g, "-")}.docx`);
    showToast("Đã tạo file Word thành công!", "success");
  } catch (err) {
    console.error("Lỗi xuất file Word:", err);
    showToast("Không thể tạo file Word. Vui lòng thử lại.", "error");
    throw err;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

/**
 * Xuất file PDF THẬT (khác với exportPdfViaPrint — hộp thoại in của trình duyệt).
 * Gắn với nút "Hoàn tất & Xuất file" ở thanh điều hướng dưới cùng của wizard.
 */
async function exportPdf(root, state) {
  const btn = root.querySelector("[data-wizard-next]");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Đang tạo file PDF..."; }
  try {
    const blob = await generateContractPdf(collectFormData(state));
    downloadBlob(blob, `${state.contractNumber.replace(/[\\/:*?"<>|]/g, "-")}.pdf`);
    showToast("Đã tạo file PDF thành công!", "success");
  } catch (err) {
    console.error("Lỗi xuất file PDF:", err);
    showToast("Không thể tạo file PDF. Vui lòng thử lại.", "error");
    throw err;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

function exportPdfViaPrint(root, state) {
  const printWindow = window.open("", "_blank");
  const el = root.querySelector("#previewContent");
  printWindow.document.write(`
    <html><head><title>${escapeHtml(state.contractNumber)}</title>
    <style>
      body{font-family:'Times New Roman',serif;padding:32px;color:#111;}
      h3,h4{margin:12px 0 6px;}
      .preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:12px 0;}
      ul{padding-left:18px;}
    </style>
    </head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* update PDF */
