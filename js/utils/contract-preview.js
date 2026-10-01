// ==========================================================================
// UTILS/CONTRACT-PREVIEW.JS — Sinh HTML "xem trước hợp đồng" DÙNG CHUNG.
//
// Logic/markup được tách ra từ renderPreview() trong contract-web-view.js
// và contract-seo-view.js, để trang "Lịch sử xuất" (export-history-view.js)
// có thể xem lại đúng hợp đồng đã lưu trong Firestore mà không phải lặp code.
//
// LƯU Ý QUAN TRỌNG:
//   - contract-web-view.js và contract-seo-view.js VẪN GIỮ NGUYÊN hàm
//     renderPreview() riêng của chúng (không đổi gì ở 2 file đó) để không
//     ảnh hưởng tới luồng tạo hợp đồng đang chạy ổn định.
//   - Module này chỉ phục vụ việc XEM LẠI hợp đồng sau khi đã lưu.
//   - `data` truyền vào phải là dữ liệu đã "chuẩn hoá": signDate là đối
//     tượng Date (không phải Firestore Timestamp). Xem contract-service.js
//     -> normalizeContract().
// ==========================================================================

import { toVietnameseLongDate } from "./date-utils.js";
import { soTienBangChu } from "./number-to-words.js";
import { buildTickContractBlocks, tickSignatureNames } from "../services/tick-contract-model.js";

export function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * @param {"web"|"seo"|"tick"} type
 * @param {object} data - dữ liệu hợp đồng đã chuẩn hoá (xem contract-service.js)
 * @returns {string} HTML xem trước, gán trực tiếp vào innerHTML
 */
export function buildContractPreviewHtml(type, data) {
    if (type === "tick") return buildTickPreview(data);
    return type === "seo" ? buildSeoPreview(data) : buildWebPreview(data);
}

function asDate(value) {
    if (value instanceof Date) return value;
    return value ? new Date(value) : new Date();
}

// ==========================================================================
// HỢP ĐỒNG WEB
// ==========================================================================
function buildWebPreview(data) {
    const { contractNumber, partyA = {}, partyB = {}, content = {}, features = [] } = data;
    const c = content;
    const signDate = asDate(data.signDate);
    const contractValue = Number(c.contractValue) || 0;
    const vatPercent = Number(c.vatPercent) || 0;
    const vatAmount = Math.round((contractValue * vatPercent) / (100 + vatPercent));
    const dot1 = Math.round(contractValue / 2);
    const dot2 = contractValue - dot1;

    return `
    <h3 class="preview-title">HỢP ĐỒNG DỊCH VỤ THIẾT KẾ WEBSITE</h3>
    <p class="preview-sub">Số: ${escapeHtml(contractNumber)}</p>
    <p class="preview-sub">${toVietnameseLongDate(signDate)}</p>

    <div class="preview-grid">
      <div>
        <h4>BÊN A</h4>
        <p><strong>${escapeHtml(partyA.companyName)}</strong></p>
        <p>MST: ${escapeHtml(partyA.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(partyA.representativeTitle)} ${escapeHtml(partyA.representativeName)} — ${escapeHtml(partyA.representativePosition)}</p>
        <p>${escapeHtml(partyA.address)}</p>
        <p>${escapeHtml(partyA.phone)} · ${escapeHtml(partyA.email)}</p>
      </div>
      <div>
        <h4>BÊN B</h4>
        <p><strong>${escapeHtml(partyB.companyName)}</strong></p>
        <p>MST: ${escapeHtml(partyB.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(partyB.representativeTitle)} ${escapeHtml(partyB.representativeName)} — ${escapeHtml(partyB.representativePosition)}</p>
        <p>${escapeHtml(partyB.address)}</p>
        <p>${escapeHtml(partyB.hotline)} · ${escapeHtml(partyB.email)}</p>
        <p>STK: ${escapeHtml(partyB.bankAccount)} — ${escapeHtml(partyB.bankName)}</p>
      </div>
    </div>

    <h4>Danh mục tính năng website</h4>
    <table class="preview-feature-table">
      <thead>
        <tr><th>STT</th><th>Tên tính năng</th><th>Mô tả</th></tr>
      </thead>
      <tbody>
        ${features.map((f, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(f.name)}</td>
            <td>${escapeHtml(f.description)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <h4>Nội dung & Giá trị hợp đồng</h4>
    <ul class="preview-list">
      <li>Tên miền: ${escapeHtml(c.domainNote)} · Hosting: ${escapeHtml(c.hostingNote)}</li>
      <li>${escapeHtml(c.extraServicesNote)}</li>
      <li>Bàn giao demo trong ${c.demoDays} ngày làm việc · Nghiệm thu trong ${c.acceptanceDays} ngày làm việc</li>
      <li>Giá trị hợp đồng: <strong>${contractValue.toLocaleString("vi-VN")} VNĐ</strong> (đã gồm VAT ${vatPercent}% = ${vatAmount.toLocaleString("vi-VN")} VNĐ)</li>
      <li>Bằng chữ: ${soTienBangChu(contractValue)}</li>
      <li>Đợt 1: ${dot1.toLocaleString("vi-VN")} VNĐ (ký hợp đồng) · Đợt 2: ${dot2.toLocaleString("vi-VN")} VNĐ (nghiệm thu)</li>
    </ul>
  `;
}

// ==========================================================================
// HỢP ĐỒNG SEO
// ==========================================================================
function buildSeoPreview(data) {
    const { contractNumber, signPlace, partyA = {}, partyB = {}, content = {} } = data;
    const c = content;
    const signDate = asDate(data.signDate);
    const contractValue = Number(c.contractValue) || 0;
    const dot1Percent = Number(c.dot1Percent) || 0;
    const dot2Percent = Number(c.dot2Percent) || 0;
    const dot1 = Math.round((contractValue * dot1Percent) / 100);
    const dot2 = Math.round((contractValue * dot2Percent) / 100);
    const dot3Percent = Math.max(0, 100 - dot1Percent - dot2Percent);
    const dot3 = contractValue - dot1 - dot2;
    const vatLabel = c.vatIncluded === "included" ? "Đã bao gồm VAT" : "Chưa bao gồm VAT";

    return `
    <h3 class="preview-title">HỢP ĐỒNG DỊCH VỤ SEO WEBSITE</h3>
    <p class="preview-sub">Số: ${escapeHtml(contractNumber)}</p>
    <p class="preview-sub">${toVietnameseLongDate(signDate)}${signPlace ? `, tại ${escapeHtml(signPlace)}` : ""}</p>

    <div class="preview-grid">
      <div>
        <h4>BÊN A</h4>
        <p><strong>${escapeHtml(partyA.companyName)}</strong></p>
        <p>MST/CCCD: ${escapeHtml(partyA.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(partyA.representativeTitle)} ${escapeHtml(partyA.representativeName)} — ${escapeHtml(partyA.representativePosition)}</p>
        <p>${escapeHtml(partyA.address)}</p>
        <p>${escapeHtml(partyA.phone)} · ${escapeHtml(partyA.email)}</p>
      </div>
      <div>
        <h4>BÊN B</h4>
        <p><strong>${escapeHtml(partyB.companyName)}</strong></p>
        <p>MST/CCCD: ${escapeHtml(partyB.taxCode)}</p>
        <p>Đại diện: ${escapeHtml(partyB.representativeTitle)} ${escapeHtml(partyB.representativeName)} — ${escapeHtml(partyB.representativePosition)}</p>
        <p>${escapeHtml(partyB.address)}</p>
        <p>${escapeHtml(partyB.hotline)} · ${escapeHtml(partyB.email)}</p>
        <p>STK: ${escapeHtml(partyB.bankAccount)} — ${escapeHtml(partyB.bankName)}</p>
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
      <li>Giá trị hợp đồng: <strong>${contractValue.toLocaleString("vi-VN")} VNĐ</strong> (${vatLabel})</li>
      <li>Bằng chữ: ${soTienBangChu(contractValue)}</li>
      <li>Đợt 1 (${dot1Percent}%): ${dot1.toLocaleString("vi-VN")} VNĐ — ngay khi ký</li>
      <li>Đợt 2 (${dot2Percent}%): ${dot2.toLocaleString("vi-VN")} VNĐ — sau khi bàn giao ${escapeHtml(c.dot2Milestone)}</li>
      <li>Đợt 3 (${dot3Percent}%): ${dot3.toLocaleString("vi-VN")} VNĐ — nghiệm thu toàn bộ/theo chu kỳ</li>
      <li>Lãi chậm thanh toán: ${c.lateInterestPercent}%/ngày</li>
      <li>Phản hồi nghiệm thu trong ${c.acceptanceDays} ngày làm việc · ${c.freeRevisions} lần chỉnh sửa miễn phí/hạng mục</li>
      <li>Bảo mật sau chấm dứt hợp đồng: ${c.confidentialityYears} năm</li>
    </ul>
  `;
}

// ==========================================================================
// HỢP ĐỒNG TÍCH XANH FACEBOOK (META) — hiển thị TOÀN VĂN hợp đồng, dựng từ
// cùng nguồn block với file Word/PDF (services/tick-contract-model.js).
// Dùng style inline để chạy được ở cả trang tạo hợp đồng lẫn modal Lịch sử xuất.
// ==========================================================================
function tickPartsHtml(t, base = {}) {
    const parts = Array.isArray(t) ? t : [{ t }];
    return parts.map((x) => {
        let h = escapeHtml(x.t);
        if (x.b ?? base.b) h = `<strong>${h}</strong>`;
        if (x.i ?? base.i) h = `<em>${h}</em>`;
        return h;
    }).join("");
}

function buildTickPreview(data) {
    const blocks = buildTickContractBlocks(data);
    const names = tickSignatureNames(data);
    const wrap = "font-family:'Times New Roman',serif;font-size:14px;line-height:1.55;color:#111;";
    const body = blocks.map((b) => {
        switch (b.k) {
            case "c":
                return `<p style="text-align:center;margin:0 0 ${Math.max(4, Math.round((b.after ?? 120) / 20))}px;${b.sz ? "font-size:17px;" : ""}">${tickPartsHtml(b.t, { b: b.b, i: b.i })}</p>`;
            case "h":
                return `<p style="margin:18px 0 6px;font-weight:700;">${escapeHtml(b.t)}</p>`;
            case "s":
                return `<p style="margin:10px 0 4px;font-weight:700;">${escapeHtml(b.t)}</p>`;
            case "p":
                return `<p style="margin:0 0 6px;text-align:justify;">${tickPartsHtml(b.t, { b: b.b, i: b.i })}</p>`;
            case "li":
                return `<p style="margin:0 0 4px;padding-left:${b.l === 2 ? 44 : 20}px;text-indent:-12px;text-align:justify;">${b.l === 2 ? "+" : "-"}&nbsp; ${tickPartsHtml(b.t)}</p>`;
            case "sig":
                return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;text-align:center;">
                    <div><strong>ĐẠI DIỆN BÊN A</strong><br><em style="font-size:12px;">(Ký, ghi rõ họ tên, đóng dấu)</em><div style="height:64px;"></div><strong>${escapeHtml(names.a)}</strong></div>
                    <div><strong>ĐẠI DIỆN BÊN B</strong><br><em style="font-size:12px;">(Ký, ghi rõ họ tên, đóng dấu)</em><div style="height:64px;"></div><strong>${escapeHtml(names.b)}</strong></div>
                </div>`;
            default:
                return "";
        }
    }).join("");
    return `<div style="${wrap}">${body}</div>`;
}

