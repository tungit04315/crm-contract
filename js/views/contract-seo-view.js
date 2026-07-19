import { getBusinessInfo } from "../services/settings-service.js";
import { buildContractNumber, saveContract } from "../services/contract-service.js";
import { generateSeoContractDocx, downloadBlob } from "../services/docx-generator.js";
import { generateSeoContractPdf } from "../services/pdf-generator.js";
import { soTienBangChu } from "../utils/number-to-words.js";
import { toInputDateValue, toVietnameseLongDate, toShortDate, parseInputDate } from "../utils/date-utils.js";
import { createFormWizard } from "../components/form-wizard.js";
import { showToast } from "../services/toast.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { id: "info", label: "Thông tin hợp đồng" },
  { id: "party-a", label: "Bên A - Khách hàng" },
  { id: "content", label: "Phạm vi & Giá trị" },
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
    signPlace: "TP. Hồ Chí Minh",
    partyA: { companyName: "", taxCode: "", representativeTitle: "Ông", representativeName: "", representativePosition: "", address: "", phone: "", email: "" },
    content: {
      keywordsScope: "",
      articleCount: "",
      reportFrequency: "Hàng tháng",
      timeline: "",
      specialRequirements: "Không có",
      contractValue: 0,
      vatIncluded: "included", // "included" | "excluded"
      dot1Percent: 50,
      dot2Percent: 30,
      dot2Milestone: "giai đoạn 1",
      lateInterestPercent: 0.05,
      acceptanceDays: 5,
      freeRevisions: 2,
      confidentialityYears: 2,
      effectiveDate: "",
    },
    partyB: businessInfo || { companyName: "", taxCode: "", address: "", hotline: "", email: "", bankAccount: "", bankName: "", representativeTitle: "Ông", representativeName: "", representativePosition: "" },
  };

  container.innerHTML = buildMarkup();

  const root = container.querySelector("[data-wizard-root]");
  const businessWarning = container.querySelector("#businessMissingWarning");
  if (!businessInfo || !businessInfo.companyName) {
    businessWarning.classList.remove("hidden");
  }

  // Sinh sẵn số hợp đồng gợi ý ngay khi mở trang (xem ghi chú tương tự ở contract-web-view.js)
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
        <h2>Tạo hợp đồng SEO</h2>
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
            <div class="form-field">
              <label>Nơi ký hợp đồng <span class="req">*</span></label>
              <input type="text" id="f-signPlace" placeholder="TP. Hồ Chí Minh" />
            </div>
          </div>
        </div>

        <!-- STEP 2: Bên A -->
        <div class="wizard-step-panel" data-wizard-panel="party-a">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên đơn vị <span class="req">*</span></label>
              <input type="text" id="a-companyName" placeholder="CÔNG TY CỔ PHẦN ..." />
            </div>
            <div class="form-field">
              <label>Mã số thuế/CCCD <span class="req">*</span></label>
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
              <label>Điện thoại <span class="req">*</span></label>
              <input type="text" id="a-phone" />
            </div>
            <div class="form-field">
              <label>Email <span class="req">*</span></label>
              <input type="email" id="a-email" />
            </div>
          </div>
        </div>

        <!-- STEP 3: Phạm vi & Giá trị (Phụ lục 01 + Điều 5/6/9/10/16) -->
        <div class="wizard-step-panel" data-wizard-panel="content">
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Danh mục từ khóa / nhóm chủ đề <span class="req">*</span></label>
              <input type="text" id="c-keywordsScope" placeholder="VD: Nhóm từ khóa dịch vụ, nhóm từ khóa thương hiệu..." />
            </div>
            <div class="form-field">
              <label>Số lượng bài viết / landing page <span class="req">*</span></label>
              <input type="text" id="c-articleCount" placeholder="VD: 20 bài viết/tháng" />
            </div>
            <div class="form-field">
              <label>Tần suất báo cáo <span class="req">*</span></label>
              <select id="c-reportFrequency">
                <option value="Hàng tuần">Hàng tuần</option>
                <option value="Hàng tháng">Hàng tháng</option>
                <option value="Hàng quý">Hàng quý</option>
              </select>
            </div>
            <div class="form-field form-field--full">
              <label>Timeline triển khai <span class="req">*</span></label>
              <input type="text" id="c-timeline" placeholder="VD: 06 tháng, chia 3 giai đoạn..." />
            </div>
            <div class="form-field form-field--full">
              <label>Yêu cầu đặc biệt khác</label>
              <input type="text" id="c-specialRequirements" />
            </div>

            <div class="form-field">
              <label>Giá trị hợp đồng (VNĐ) <span class="req">*</span></label>
              <input type="number" min="0" step="1000" id="c-contractValue" />
            </div>
            <div class="form-field">
              <label>Thuế VAT <span class="req">*</span></label>
              <select id="c-vatIncluded">
                <option value="included">Đã bao gồm VAT</option>
                <option value="excluded">Chưa bao gồm VAT</option>
              </select>
            </div>

            <div class="form-field">
              <label>Đợt 1 - % thanh toán khi ký <span class="req">*</span></label>
              <input type="number" min="0" max="100" id="c-dot1Percent" />
            </div>
            <div class="form-field">
              <label>Đợt 2 - % thanh toán <span class="req">*</span></label>
              <input type="number" min="0" max="100" id="c-dot2Percent" />
            </div>
            <div class="form-field form-field--full">
              <label>Đợt 2 - Bàn giao sau giai đoạn <span class="req">*</span></label>
              <input type="text" id="c-dot2Milestone" placeholder="VD: giai đoạn 1 / tháng thứ 1" />
            </div>

            <div class="form-field">
              <label>Lãi chậm thanh toán (%/ngày) <span class="req">*</span></label>
              <input type="number" min="0" step="0.01" id="c-lateInterestPercent" />
            </div>
            <div class="form-field">
              <label>Thời hạn phản hồi nghiệm thu (ngày làm việc) <span class="req">*</span></label>
              <input type="number" min="1" id="c-acceptanceDays" />
            </div>
            <div class="form-field">
              <label>Số lần chỉnh sửa miễn phí / hạng mục <span class="req">*</span></label>
              <input type="number" min="0" id="c-freeRevisions" />
            </div>
            <div class="form-field">
              <label>Thời hạn bảo mật sau khi chấm dứt HĐ (năm) <span class="req">*</span></label>
              <input type="number" min="0" id="c-confidentialityYears" />
            </div>

            <div class="form-field">
              <label>Ngày hiệu lực hợp đồng</label>
              <input type="date" id="c-effectiveDate" />
              <p class="field-hint">Bỏ trống = lấy theo ngày ký.</p>
            </div>
          </div>
          <p class="value-in-words" id="valueInWords"></p>
          <p class="value-in-words" id="paymentSplitPreview"></p>
        </div>

        <!-- STEP 4: Bên B -->
        <div class="wizard-step-panel" data-wizard-panel="party-b">
          <p class="field-hint" style="margin-bottom:14px;">Đã tự động điền từ Cài đặt hệ thống. Chỉ sửa nếu hợp đồng này cần thông tin khác.</p>
          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>Tên đơn vị/Cá nhân <span class="req">*</span></label>
              <input type="text" id="b-companyName" />
            </div>
            <div class="form-field">
              <label>Mã số thuế/CCCD <span class="req">*</span></label>
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
              <label>Điện thoại <span class="req">*</span></label>
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
  placeInput.addEventListener("input", () => {
    state.signPlace = placeInput.value;
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
    keywordsScope: "#c-keywordsScope", articleCount: "#c-articleCount", reportFrequency: "#c-reportFrequency",
    timeline: "#c-timeline", specialRequirements: "#c-specialRequirements",
    contractValue: "#c-contractValue", vatIncluded: "#c-vatIncluded",
    dot1Percent: "#c-dot1Percent", dot2Percent: "#c-dot2Percent", dot2Milestone: "#c-dot2Milestone",
    lateInterestPercent: "#c-lateInterestPercent", acceptanceDays: "#c-acceptanceDays",
    freeRevisions: "#c-freeRevisions", confidentialityYears: "#c-confidentialityYears",
    effectiveDate: "#c-effectiveDate",
  };
  const numericKeys = new Set(["contractValue", "dot1Percent", "dot2Percent", "lateInterestPercent", "acceptanceDays", "freeRevisions", "confidentialityYears"]);

  Object.entries(map).forEach(([key, sel]) => {
    root.querySelector(sel).value = state.content[key] ?? "";
  });
  Object.entries(map).forEach(([key, sel]) => {
    const el = root.querySelector(sel);
    el.addEventListener("input", () => {
      state.content[key] = numericKeys.has(key) ? Number(el.value) : el.value;
      if (key === "contractValue" || key === "dot1Percent" || key === "dot2Percent") updateValueInWords(root, state);
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
  const wordsEl = root.querySelector("#valueInWords");
  const splitEl = root.querySelector("#paymentSplitPreview");
  const c = state.content;
  const v = Number(c.contractValue) || 0;
  if (wordsEl) wordsEl.textContent = v > 0 ? `Bằng chữ: ${soTienBangChu(v)}.` : "";

  if (splitEl) {
    const dot1 = Math.round((v * (Number(c.dot1Percent) || 0)) / 100);
    const dot2 = Math.round((v * (Number(c.dot2Percent) || 0)) / 100);
    const dot3Percent = Math.max(0, 100 - (Number(c.dot1Percent) || 0) - (Number(c.dot2Percent) || 0));
    const dot3 = v - dot1 - dot2;
    splitEl.textContent = v > 0
      ? `Đợt 1: ${dot1.toLocaleString("vi-VN")} VNĐ · Đợt 2: ${dot2.toLocaleString("vi-VN")} VNĐ · Đợt 3 (${dot3Percent}%): ${dot3.toLocaleString("vi-VN")} VNĐ`
      : "";
  }
}

function maybeRegenerateNumber(root, state) {
  if (state.numberTouched) return;
  const signDate = parseInputDate(state.signDate) || new Date();
  const suggestion = buildContractNumber({
    signDate,
    representativeName: state.partyA.representativeName,
    type: "seo",
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
    if (!state.signPlace.trim()) return fail("Vui lòng nhập nơi ký hợp đồng.");
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
    if (!c.keywordsScope || !c.articleCount || !c.timeline) return fail("Vui lòng điền đầy đủ phạm vi công việc (Phụ lục 01).");
    if (!c.contractValue || c.contractValue <= 0) return fail("Vui lòng nhập giá trị hợp đồng.");
    if (c.dot1Percent < 0 || c.dot2Percent < 0 || c.dot1Percent + c.dot2Percent > 100) {
      return fail("Tổng % Đợt 1 + Đợt 2 không được vượt quá 100%.");
    }
    if (!c.dot2Milestone.trim()) return fail("Vui lòng nhập mốc bàn giao Đợt 2.");
    if (c.lateInterestPercent < 0) return fail("Lãi chậm thanh toán không hợp lệ.");
    if (!c.acceptanceDays || c.acceptanceDays <= 0) return fail("Thời hạn phản hồi nghiệm thu không hợp lệ.");
    if (c.freeRevisions < 0) return fail("Số lần chỉnh sửa miễn phí không hợp lệ.");
    if (c.confidentialityYears < 0) return fail("Thời hạn bảo mật không hợp lệ.");
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
  const dot1 = Math.round((c.contractValue * c.dot1Percent) / 100);
  const dot2 = Math.round((c.contractValue * c.dot2Percent) / 100);
  const dot3Percent = Math.max(0, 100 - c.dot1Percent - c.dot2Percent);
  const dot3 = c.contractValue - dot1 - dot2;
  const vatLabel = c.vatIncluded === "included" ? "Đã bao gồm VAT" : "Chưa bao gồm VAT";

  el.innerHTML = `
    <h3 class="preview-title">HỢP ĐỒNG DỊCH VỤ SEO WEBSITE</h3>
    <p class="preview-sub">Số: ${escapeHtml(state.contractNumber)}</p>
    <p class="preview-sub">${toVietnameseLongDate(signDate)}, tại ${escapeHtml(state.signPlace)}</p>

    <div class="preview-grid">
      <div>
        <h4>BÊN A</h4>
        <p><strong>${escapeHtml(state.partyA.companyName)}</strong></p>
        <p>MST/CCCD: ${escapeHtml(state.partyA.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(state.partyA.representativeTitle)} ${escapeHtml(state.partyA.representativeName)} — ${escapeHtml(state.partyA.representativePosition)}</p>
        <p>${escapeHtml(state.partyA.address)}</p>
        <p>${escapeHtml(state.partyA.phone)} · ${escapeHtml(state.partyA.email)}</p>
      </div>
      <div>
        <h4>BÊN B</h4>
        <p><strong>${escapeHtml(state.partyB.companyName)}</strong></p>
        <p>MST/CCCD: ${escapeHtml(state.partyB.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(state.partyB.representativeTitle)} ${escapeHtml(state.partyB.representativeName)} — ${escapeHtml(state.partyB.representativePosition)}</p>
        <p>${escapeHtml(state.partyB.address)}</p>
        <p>${escapeHtml(state.partyB.hotline)} · ${escapeHtml(state.partyB.email)}</p>
        <p>STK: ${escapeHtml(state.partyB.bankAccount)} — ${escapeHtml(state.partyB.bankName)}</p>
      </div>
    </div>

    <h4>Phạm vi công việc (Phụ lục 01)</h4>
    <ul class="preview-list">
      <li>Từ khóa/chủ đề: ${escapeHtml(c.keywordsScope)}</li>
      <li>Số lượng bài viết/landing page: ${escapeHtml(c.articleCount)}</li>
      <li>Tần suất báo cáo: ${escapeHtml(c.reportFrequency)}</li>
      <li>Timeline: ${escapeHtml(c.timeline)}</li>
      <li>Yêu cầu đặc biệt: ${escapeHtml(c.specialRequirements || "Không có")}</li>
    </ul>

    <h4>Giá trị & Thanh toán</h4>
    <ul class="preview-list">
      <li>Giá trị hợp đồng: <strong>${c.contractValue.toLocaleString("vi-VN")} VNĐ</strong> (${vatLabel})</li>
      <li>Bằng chữ: ${soTienBangChu(c.contractValue)}</li>
      <li>Đợt 1 (${c.dot1Percent}%): ${dot1.toLocaleString("vi-VN")} VNĐ — ngay khi ký</li>
      <li>Đợt 2 (${c.dot2Percent}%): ${dot2.toLocaleString("vi-VN")} VNĐ — sau khi bàn giao ${escapeHtml(c.dot2Milestone)}</li>
      <li>Đợt 3 (${dot3Percent}%): ${dot3.toLocaleString("vi-VN")} VNĐ — nghiệm thu toàn bộ/theo chu kỳ</li>
      <li>Lãi chậm thanh toán: ${c.lateInterestPercent}%/ngày</li>
      <li>Phản hồi nghiệm thu trong ${c.acceptanceDays} ngày làm việc · ${c.freeRevisions} lần chỉnh sửa miễn phí/hạng mục</li>
      <li>Bảo mật sau chấm dứt hợp đồng: ${c.confidentialityYears} năm</li>
    </ul>

    <p class="field-hint">Toàn bộ 16 Điều khoản đầy đủ + Phụ lục 01 sẽ được đưa nguyên văn vào file xuất ra — đúng như hợp đồng mẫu gốc.</p>
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
    signPlace: state.signPlace,
    partyA: { ...state.partyA },
    partyB: { ...state.partyB },
    content: {
      ...state.content,
      effectiveDate: state.content.effectiveDate ? parseInputDate(state.content.effectiveDate) : null,
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
    await saveContract(collectFormData(state), "seo");
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
    const blob = await generateSeoContractDocx(collectFormData(state));
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

async function exportPdf(root, state) {
  const btn = root.querySelector("[data-wizard-next]");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Đang tạo file PDF..."; }
  try {
    const blob = await generateSeoContractPdf(collectFormData(state));
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
