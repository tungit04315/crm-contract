// ==========================================================================
// VIEWS/CONTRACT-TICK-VIEW.JS — Biên soạn "Hợp đồng dịch vụ tư vấn đăng ký
// Tích xanh Facebook (Meta)". Wizard 5 bước, cùng khung với contract-seo-view.js:
//   1) Thông tin HĐ  2) Bên A  3) Dịch vụ & Giá trị  4) Bên B  5) Xem trước & Xuất
//
// Điểm nâng cấp so với các form cũ:
//   - Nội dung hợp đồng nằm ở 1 nơi (services/tick-contract-model.js) -> Word, PDF
//     và bản xem trước luôn khớp nhau; bước 5 hiển thị TOÀN VĂN hợp đồng.
//   - Nhập phí dịch vụ trước thuế, tự tính VAT + tổng + bằng chữ theo thời gian thực.
//   - Kiểm tra link Fanpage hợp lệ; các mốc (số dư thẻ, ngày Via, bảo hành,
//     hiệu lực, hoàn tiền) chỉnh được ngay trên form.
//   - Xuất cả Word (.docx) và PDF (.pdf) ở bước cuối.
// ==========================================================================

import { getBusinessInfo } from "../services/settings-service.js";
import { buildContractNumber, saveContract } from "../services/contract-service.js";
import { generateTickContractDocx, downloadBlob } from "../services/docx-generator.js";
import { generateTickContractPdf } from "../services/pdf-generator.js";
import { TICK_DEFAULTS, calcTickAmounts, formatVnd } from "../services/tick-contract-model.js";
import { buildContractPreviewHtml, escapeHtml } from "../utils/contract-preview.js";
import { soTienBangChu } from "../utils/number-to-words.js";
import { toInputDateValue, parseInputDate } from "../utils/date-utils.js";
import { createFormWizard } from "../components/form-wizard.js";
import { showToast } from "../services/toast.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Chấp nhận facebook.com / fb.com / fb.me / m.facebook.com / web.facebook.com (có hoặc không có https://)
const FB_URL_REGEX = /^(https?:\/\/)?([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.me)\/\S+/i;

const STEPS = [
  { id: "info", label: "Thông tin hợp đồng" },
  { id: "party-a", label: "Bên A - Khách hàng" },
  { id: "content", label: "Dịch vụ & Giá trị" },
  { id: "party-b", label: "Bên B - Cung cấp" },
  { id: "preview", label: "Xem trước & Xuất file" },
];

const NUMERIC_KEYS = new Set([
  "serviceFee", "vatPercent", "minCardBalance", "viaDays", "warrantyMonths", "validityMonths", "refundWeeks",
]);

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
    signPlace: "TP. Hồ Chí Minh",
    partyA: {
      companyName: "", taxCode: "", representativeTitle: "Ông", representativeName: "",
      representativePosition: "", address: "", phone: "", email: "", authorizationNumber: "",
    },
    content: {
      fanpageName: "",
      fanpageUrl: "",
      serviceFee: 0,
      vatPercent: TICK_DEFAULTS.vatPercent,
      minCardBalance: TICK_DEFAULTS.minCardBalance,
      viaDays: TICK_DEFAULTS.viaDays,
      warrantyMonths: TICK_DEFAULTS.warrantyMonths,
      validityMonths: TICK_DEFAULTS.validityMonths,
      refundWeeks: TICK_DEFAULTS.refundWeeks,
      additionalAgreement: "",
    },
    partyB: {
      companyName: "", taxCode: "", address: "", hotline: "", email: "", bankAccount: "", bankName: "",
      representativeTitle: "Ông", representativeName: "", representativePosition: "",
      ...(businessInfo || {}),
      bankHolder: businessInfo?.bankHolder || businessInfo?.representativeName || "",
    },
  };

  container.innerHTML = buildMarkup();

  const root = container.querySelector("[data-wizard-root]");
  if (!businessInfo || !businessInfo.companyName) {
    container.querySelector("#businessMissingWarning").classList.remove("hidden");
  }

  maybeRegenerateNumber(root, state);

  bindStepInfo(root, state);
  bindStepPartyA(root, state);
  bindStepContent(root, state);
  bindStepPartyB(root, state);

  const wizard = createFormWizard({
    root,
    steps: STEPS,
    validateStep: (stepId) => validateStep(stepId, state),
    onStepEnter: (stepId) => {
      if (stepId === "content" || stepId === "party-b") maybeRegenerateNumber(root, state);
      if (stepId === "preview") renderPreview(root, state);
    },
    onFinish: () => handleFinish(root, state, wizard),
  });

  root.querySelector("#btnExportDocx")?.addEventListener("click", () => exportDocx(root, state));
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
        <h2>Tạo hợp đồng Tích xanh Meta</h2>
        <p>Hợp đồng dịch vụ tư vấn đăng ký Tích xanh Facebook. Thông tin Bên B được lấy tự động từ Cài đặt hệ thống.</p>
      </div>
    </div>

    <div id="businessMissingWarning" class="banner-warning hidden">
      Chưa có thông tin doanh nghiệp (Bên B). Vào <strong>Cài đặt hệ thống → Thông tin doanh nghiệp</strong>
      để thiết lập một lần, các hợp đồng sau sẽ tự động điền.
    </div>

    <div class="wizard-panel panel" data-wizard-root>
      <div class="wizard-indicator" data-wizard-indicator></div>

      <div class="wizard-body">

        <!-- STEP 1 -->
        <div class="wizard-step-panel" data-wizard-panel="info">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Số hợp đồng <span class="req">*</span></label>
              <input type="text" id="f-contractNumber" placeholder="Tự động sinh khi nhập Bên A / ngày ký" />
              <p class="field-hint">Tự động gợi ý theo ngày ký + tên người đại diện Bên A. Bạn có thể sửa lại tự do.</p>
            </div>
            <div class="form-field">
              <label>Ngày ký hợp đồng <span class="req">*</span></label>
              <input type="date" id="f-signDate" />
            </div>
            <div class="form-field">
              <label>Nơi ký hợp đồng</label>
              <input type="text" id="f-signPlace" placeholder="TP. Hồ Chí Minh (có thể để trống)" />
            </div>
          </div>
        </div>

        <!-- STEP 2: Bên A -->
        <div class="wizard-step-panel" data-wizard-panel="party-a">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên đơn vị / cá nhân <span class="req">*</span></label>
              <input type="text" id="a-companyName" placeholder="CÔNG TY ..." />
            </div>
            <div class="form-field">
              <label>Mã số thuế/CCCD <span class="req">*</span></label>
              <input type="text" id="a-taxCode" />
            </div>
            <div class="form-field">
              <label>Điện thoại <span class="req">*</span></label>
              <input type="text" id="a-phone" />
            </div>
            <div class="form-field form-field--full">
              <label>Địa chỉ trụ sở <span class="req">*</span></label>
              <input type="text" id="a-address" />
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
            <div class="form-field">
              <label>Email</label>
              <input type="email" id="a-email" placeholder="Không bắt buộc" />
            </div>
            <div class="form-field form-field--full">
              <label>Ủy quyền số (nếu có)</label>
              <input type="text" id="a-authorizationNumber" placeholder="VD: 01/2026/UQ-GĐ ngày 01/09/2026 — để trống nếu không có" />
            </div>
          </div>
        </div>

        <!-- STEP 3: Dịch vụ & giá trị -->
        <div class="wizard-step-panel" data-wizard-panel="content">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên Fanpage cần lên Tích xanh <span class="req">*</span></label>
              <input type="text" id="c-fanpageName" placeholder="VD: Công ty ABC Official" />
            </div>
            <div class="form-field form-field--full">
              <label>Link Fanpage <span class="req">*</span></label>
              <input type="text" id="c-fanpageUrl" placeholder="https://www.facebook.com/tenfanpage" />
            </div>

            <div class="form-field">
              <label>Chi phí dịch vụ - chưa VAT (VNĐ) <span class="req">*</span></label>
              <input type="number" min="0" step="1000" id="c-serviceFee" />
            </div>
            <div class="form-field">
              <label>Thuế VAT (%) <span class="req">*</span></label>
              <input type="number" min="0" max="100" step="0.5" id="c-vatPercent" />
              <p class="field-hint">Nhập 0 nếu không áp dụng VAT.</p>
            </div>

            <div class="form-field">
              <label>Số dư tối thiểu trong thẻ Visa (VNĐ) <span class="req">*</span></label>
              <input type="number" min="0" step="10000" id="c-minCardBalance" />
            </div>
            <div class="form-field">
              <label>Via cầm Fanpage tối thiểu (ngày) <span class="req">*</span></label>
              <input type="number" min="1" id="c-viaDays" />
            </div>
            <div class="form-field">
              <label>Thời gian bảo hành (tháng) <span class="req">*</span></label>
              <input type="number" min="1" id="c-warrantyMonths" />
            </div>
            <div class="form-field">
              <label>Hiệu lực hợp đồng (tháng) <span class="req">*</span></label>
              <input type="number" min="1" id="c-validityMonths" />
            </div>
            <div class="form-field">
              <label>Thời hạn hoàn tiền nếu không thực hiện được (tuần) <span class="req">*</span></label>
              <input type="number" min="1" id="c-refundWeeks" />
            </div>
            <div class="form-field form-field--full">
              <label>Thỏa thuận bổ sung (nếu có)</label>
              <input type="text" id="c-additionalAgreement" placeholder="Sẽ được thêm vào Điều 8 — để trống nếu không có" />
            </div>
          </div>
          <p class="value-in-words" id="feeSummary"></p>
          <p class="value-in-words" id="valueInWords"></p>
        </div>

        <!-- STEP 4: Bên B -->
        <div class="wizard-step-panel" data-wizard-panel="party-b">
          <p class="field-hint" style="margin-bottom:14px;">Đã tự động điền từ Cài đặt hệ thống. Chỉ sửa nếu hợp đồng này cần thông tin khác.</p>
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên đơn vị / cá nhân cung cấp dịch vụ <span class="req">*</span></label>
              <input type="text" id="b-companyName" />
            </div>
            <div class="form-field">
              <label>Mã số thuế/CCCD <span class="req">*</span></label>
              <input type="text" id="b-taxCode" />
            </div>
            <div class="form-field">
              <label>Điện thoại</label>
              <input type="text" id="b-hotline" />
            </div>
            <div class="form-field form-field--full">
              <label>Địa chỉ <span class="req">*</span></label>
              <input type="text" id="b-address" />
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
            <div class="form-field">
              <label>Email</label>
              <input type="email" id="b-email" />
            </div>
            <div class="form-field">
              <label>Số tài khoản nhận thanh toán <span class="req">*</span></label>
              <input type="text" id="b-bankAccount" />
            </div>
            <div class="form-field">
              <label>Chủ tài khoản <span class="req">*</span></label>
              <input type="text" id="b-bankHolder" />
            </div>
            <div class="form-field form-field--full">
              <label>Ngân hàng <span class="req">*</span></label>
              <input type="text" id="b-bankName" placeholder="VD: Ngân hàng TMCP Tiên Phong (TP Bank)" />
            </div>
          </div>
        </div>

        <!-- STEP 5: Xem trước -->
        <div class="wizard-step-panel" data-wizard-panel="preview">
          <p class="field-hint" style="margin-bottom:10px;">Đây là toàn văn hợp đồng sẽ được xuất ra. Kiểm tra kỹ rồi bấm “Hoàn tất & Xuất file” (PDF) hoặc tải bản Word để chỉnh sửa thêm.</p>
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
// BIND
// ==========================================================================
function bindStepInfo(root, state) {
  const numberInput = root.querySelector("#f-contractNumber");
  const dateInput = root.querySelector("#f-signDate");
  const placeInput = root.querySelector("#f-signPlace");
  dateInput.value = state.signDate;
  numberInput.value = state.contractNumber;
  placeInput.value = state.signPlace;

  numberInput.addEventListener("input", () => {
    state.numberTouched = true;
    state.contractNumber = numberInput.value.trim();
  });
  dateInput.addEventListener("change", () => {
    state.signDate = dateInput.value;
    maybeRegenerateNumber(root, state);
  });
  placeInput.addEventListener("input", () => { state.signPlace = placeInput.value; });
}

function bindStepPartyA(root, state) {
  wireFields(root, {
    companyName: "#a-companyName", taxCode: "#a-taxCode", representativeTitle: "#a-representativeTitle",
    representativeName: "#a-representativeName", representativePosition: "#a-representativePosition",
    address: "#a-address", phone: "#a-phone", email: "#a-email", authorizationNumber: "#a-authorizationNumber",
  }, state.partyA, () => maybeRegenerateNumber(root, state));
}

function bindStepContent(root, state) {
  const map = {
    fanpageName: "#c-fanpageName", fanpageUrl: "#c-fanpageUrl",
    serviceFee: "#c-serviceFee", vatPercent: "#c-vatPercent",
    minCardBalance: "#c-minCardBalance", viaDays: "#c-viaDays",
    warrantyMonths: "#c-warrantyMonths", validityMonths: "#c-validityMonths", refundWeeks: "#c-refundWeeks",
    additionalAgreement: "#c-additionalAgreement",
  };
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    const v = state.content[key];
    el.value = NUMERIC_KEYS.has(key) && !v ? "" : (v ?? "");
  });
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    el.addEventListener("input", () => {
      state.content[key] = NUMERIC_KEYS.has(key) ? Number(el.value) : el.value;
      if (key === "serviceFee" || key === "vatPercent") updateSummary(root, state);
    });
  });
  updateSummary(root, state);
}

function bindStepPartyB(root, state) {
  wireFields(root, {
    companyName: "#b-companyName", taxCode: "#b-taxCode", representativeTitle: "#b-representativeTitle",
    representativeName: "#b-representativeName", representativePosition: "#b-representativePosition",
    address: "#b-address", hotline: "#b-hotline", email: "#b-email",
    bankAccount: "#b-bankAccount", bankName: "#b-bankName", bankHolder: "#b-bankHolder",
  }, state.partyB);
}

function wireFields(root, map, target, onChange) {
  Object.entries(map).forEach(([key, sel]) => {
    root.querySelector(sel).value = target[key] ?? "";
  });
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    el.addEventListener("input", () => {
      target[key] = el.value;
      onChange?.(key);
    });
  });
}

function updateSummary(root, state) {
  const { fee, vatPercent, vatAmount, total } = calcTickAmounts(state.content);
  const summaryEl = root.querySelector("#feeSummary");
  const wordsEl = root.querySelector("#valueInWords");
  if (fee <= 0) {
    summaryEl.textContent = "";
    wordsEl.textContent = "";
    return;
  }
  summaryEl.textContent = `Phí dịch vụ ${formatVnd(fee)} + VAT ${vatPercent}% (${formatVnd(vatAmount)}) = Tổng giá trị hợp đồng ${formatVnd(total)} VNĐ`;
  wordsEl.textContent = `Bằng chữ: ${soTienBangChu(total)}.`;
}

function maybeRegenerateNumber(root, state) {
  if (state.numberTouched) return;
  const signDate = parseInputDate(state.signDate) || new Date();
  const suggestion = buildContractNumber({
    signDate,
    representativeName: state.partyA.representativeName,
    type: "tick",
  });
  state.contractNumber = suggestion;
  const numberInput = root.querySelector("#f-contractNumber");
  if (numberInput) numberInput.value = suggestion;
}

// ==========================================================================
// VALIDATE
// ==========================================================================
function validateStep(stepId, state) {
  if (stepId === "info") {
    if (!state.contractNumber.trim()) return fail("Vui lòng nhập số hợp đồng.");
    if (!state.signDate) return fail("Vui lòng chọn ngày ký hợp đồng.");
    return true;
  }

  if (stepId === "party-a") {
    const a = state.partyA;
    if (!a.companyName.trim() || !a.taxCode.trim() || !a.address.trim() || !a.phone.trim()
      || !a.representativeName.trim() || !a.representativePosition.trim()) {
      return fail("Vui lòng điền đầy đủ thông tin Bên A.");
    }
    if (a.email.trim() && !EMAIL_REGEX.test(a.email.trim())) return fail("Email Bên A không đúng định dạng.");
    return true;
  }

  if (stepId === "content") {
    const c = state.content;
    if (!c.fanpageName.trim()) return fail("Vui lòng nhập tên Fanpage cần lên Tích xanh.");
    if (!FB_URL_REGEX.test(c.fanpageUrl.trim())) return fail("Link Fanpage không hợp lệ (cần dạng facebook.com/tenfanpage).");
    if (!c.serviceFee || c.serviceFee <= 0) return fail("Vui lòng nhập chi phí dịch vụ.");
    if (!(c.vatPercent >= 0 && c.vatPercent <= 100)) return fail("Thuế VAT phải nằm trong khoảng 0–100%.");
    if (!(c.minCardBalance >= 0)) return fail("Số dư tối thiểu trong thẻ Visa không hợp lệ.");
    if (!(c.viaDays >= 1)) return fail("Số ngày Via cầm Fanpage phải từ 1 ngày trở lên.");
    if (!(c.warrantyMonths >= 1)) return fail("Thời gian bảo hành phải từ 1 tháng trở lên.");
    if (!(c.validityMonths >= 1)) return fail("Hiệu lực hợp đồng phải từ 1 tháng trở lên.");
    if (!(c.refundWeeks >= 1)) return fail("Thời hạn hoàn tiền phải từ 1 tuần trở lên.");
    return true;
  }

  if (stepId === "party-b") {
    const b = state.partyB;
    if (!b.companyName.trim() || !b.taxCode.trim() || !b.address.trim()
      || !b.representativeName.trim() || !b.representativePosition.trim()) {
      return fail("Vui lòng điền đầy đủ thông tin Bên B.");
    }
    if (!b.bankAccount.trim() || !b.bankName.trim() || !b.bankHolder.trim()) {
      return fail("Vui lòng điền đủ thông tin tài khoản nhận thanh toán (Điều 3.3).");
    }
    if (b.email && b.email.trim() && !EMAIL_REGEX.test(b.email.trim())) return fail("Email Bên B không đúng định dạng.");
    return true;
  }

  return true;
}

function fail(message) {
  showToast(message, "error");
  return false;
}

// ==========================================================================
// PREVIEW — dùng chung bộ dựng với trang "Lịch sử xuất" (toàn văn hợp đồng)
// ==========================================================================
function renderPreview(root, state) {
  root.querySelector("#previewContent").innerHTML = buildContractPreviewHtml("tick", collectFormData(state));
}

// ==========================================================================
// FINISH: lưu Firestore + xuất file
// ==========================================================================
function collectFormData(state) {
  return {
    contractNumber: state.contractNumber,
    signDate: parseInputDate(state.signDate) || new Date(),
    signPlace: state.signPlace.trim(),
    partyA: { ...state.partyA },
    partyB: { ...state.partyB },
    content: {
      ...state.content,
      fanpageName: state.content.fanpageName.trim(),
      fanpageUrl: state.content.fanpageUrl.trim(),
      // lưu sẵn các số đã tính để trang Lịch sử xuất (lọc/sắp xếp theo giá trị) dùng ngay
      contractValue: calcTickAmounts(state.content).total,
    },
  };
}

async function handleFinish(root, state, wizard) {
  try {
    await exportPdf(root, state);
  } catch {
    return;
  }
  await persistContract(state, wizard);
}

async function persistContract(state, wizard) {
  try {
    await saveContract(collectFormData(state), "tick");
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

function safeFileName(state) {
  return state.contractNumber.replace(/[\\/:*?"<>|]/g, "-");
}

async function exportDocx(root, state) {
  const btn = root.querySelector("#btnExportDocx");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Đang tạo file..."; }
  try {
    const blob = await generateTickContractDocx(collectFormData(state));
    downloadBlob(blob, `${safeFileName(state)}.docx`);
    showToast("Đã tạo file Word thành công!", "success");
  } catch (err) {
    console.error("Lỗi xuất file Word:", err);
    showToast("Không thể tạo file Word. Vui lòng thử lại.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

async function exportPdf(root, state) {
  const btn = root.querySelector("[data-wizard-next]");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Đang tạo file PDF..."; }
  try {
    const blob = await generateTickContractPdf(collectFormData(state));
    downloadBlob(blob, `${safeFileName(state)}.pdf`);
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
  if (!printWindow) {
    showToast("Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.", "warning");
    return;
  }
  const el = root.querySelector("#previewContent");
  printWindow.document.write(`
    <html><head><title>${escapeHtml(state.contractNumber)}</title>
    <style>
      body{font-family:'Times New Roman',serif;padding:32px;color:#111;font-size:13.5px;line-height:1.5;}
      @media print { body{padding:0;} }
    </style>
    </head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
