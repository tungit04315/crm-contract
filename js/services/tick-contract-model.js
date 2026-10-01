// ==========================================================================
// TICK-CONTRACT-MODEL.JS — NGUỒN NỘI DUNG DUY NHẤT cho "Hợp đồng dịch vụ tư vấn
// đăng ký Tích xanh Facebook (Meta)".
//
// Bám sát file mẫu "[Mẫu] HĐ lên tick xanh FB KH.doc": giữ nguyên 8 Điều khoản,
// chỉ thay các trường động (xem danh sách trường ở TICK_DEFAULTS bên dưới).
//
// Thiết kế: nội dung được mô tả bằng một mảng "block" trung lập (không phụ
// thuộc thư viện). docx-generator.js và pdf-generator.js chỉ việc "vẽ" các
// block này ra Word/PDF => sửa điều khoản MỘT CHỖ DUY NHẤT tại file này, bản
// Word và bản PDF luôn khớp nhau.
//
// Các loại block:
//   { k: "c",  t, b?, i?, sz?, after? }   dòng căn giữa (quốc hiệu, tiêu đề)
//   { k: "h",  t }                        tiêu đề ĐIỀU
//   { k: "s",  t }                        tiêu đề mục con in đậm (vd 2.5. ...)
//   { k: "p",  t, b?, i? }                đoạn văn thường
//   { k: "li", t, l }                     gạch đầu dòng, l = 1 | 2 (cấp lồng)
//   { k: "sig" }                          khối chữ ký 2 bên
// `t` là chuỗi hoặc mảng đoạn { t, b?, i? } để in đậm một phần câu.
// ==========================================================================

import { toVietnameseLongDate } from "../utils/date-utils.js";
import { soTienBangChu } from "../utils/number-to-words.js";

/** Giá trị mặc định của các trường động (lấy đúng theo hợp đồng mẫu). */
export const TICK_DEFAULTS = {
  vatPercent: 8,          // Điều 3.1: VAT 8%
  minCardBalance: 300000, // Điều 2.4: số dư tối thiểu trong thẻ Visa
  viaDays: 7,             // Điều 2.4: Via cầm Fanpage trên 7 ngày
  warrantyMonths: 1,      // Điều 2.6: thời gian bảo hành
  validityMonths: 1,      // Điều 4: hiệu lực hợp đồng
  refundWeeks: 4,         // Điều 7.3: hoàn tiền trong 04 tuần
};

const WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười", "mười một", "mười hai"];

export function formatVnd(n) {
  return Math.round(Number(n) || 0).toLocaleString("vi-VN");
}

/** 1 -> "01 (một) tháng" ; 4 -> "04 (bốn) tuần" ; 15 -> "15 ngày" */
function countText(n, unit) {
  const v = Math.round(Number(n) || 0);
  if (v >= 0 && v < WORDS.length) return `${String(v).padStart(2, "0")} (${WORDS[v]}) ${unit}`;
  return `${v} ${unit}`;
}

/** Tính phí / VAT / tổng — dùng chung cho form (hiển thị live), preview và file xuất. */
export function calcTickAmounts(content = {}) {
  const fee = Math.max(0, Math.round(Number(content.serviceFee) || 0));
  const vatPercent = Math.max(0, Number(content.vatPercent) || 0);
  const vatAmount = Math.round((fee * vatPercent) / 100);
  return { fee, vatPercent, vatAmount, total: fee + vatAmount };
}

const B = (t) => ({ t, b: true });
const T = (t) => ({ t });
const I = (t) => ({ t, i: true });
const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * @param {object} data - { contractNumber, signDate, signPlace, partyA, partyB, content }
 * @returns {Array} danh sách block
 */
export function buildTickContractBlocks(data) {
  const { contractNumber, signDate, signPlace, partyA = {}, partyB = {}, content = {} } = data;
  const c = { ...TICK_DEFAULTS, ...content };
  const { fee, vatPercent, vatAmount, total } = calcTickAmounts(c);
  const hasVat = vatPercent > 0;
  const fanpage = c.fanpageName || "………….";
  const holder = partyB.bankHolder || partyB.representativeName || partyB.companyName || "";
  const blocks = [];
  const add = (...b) => blocks.push(...b);

  // ---------------------------------------------------------------- Quốc hiệu
  add(
    { k: "c", t: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", b: true, after: 40 },
    { k: "c", t: "Độc lập - Tự do - Hạnh phúc", b: true, after: 40 },
    { k: "c", t: "----------o0o-----------", i: true, after: 200 },
    { k: "c", t: "HỢP ĐỒNG DỊCH VỤ TƯ VẤN ĐĂNG KÝ TÍCH XANH FACEBOOK", b: true, sz: 28, after: 60 },
    { k: "c", t: `Số: ${contractNumber}`, b: true, after: 200 },
    { k: "p", t: "Căn cứ Bộ Luật Dân sự được Quốc hội nước Cộng hoà xã hội chủ nghĩa Việt Nam thông qua ngày 24 tháng 11 năm 2015;", i: true },
    { k: "p", t: "Căn cứ Luật Thương mại 2005;", i: true },
    { k: "p", t: "Căn cứ Luật Quảng cáo 2012;", i: true },
    { k: "p", t: "Căn cứ nhu cầu và khả năng của hai bên:", i: true },
    { k: "p", t: `${toVietnameseLongDate(signDate, "Hôm nay,")}${signPlace ? `, tại ${signPlace}` : ""}, chúng tôi gồm có:` },
  );

  // ------------------------------------------------------------------- Bên A
  add(
    { k: "p", t: [B("BÊN A: BÊN SỬ DỤNG DỊCH VỤ")] },
    { k: "p", t: [B((partyA.companyName || "").toUpperCase())] },
    { k: "p", t: `Mã số thuế/CCCD: ${partyA.taxCode || ""}` },
    { k: "p", t: `Địa chỉ trụ sở: ${partyA.address || ""}` },
    { k: "p", t: `Đại diện: ${partyA.representativeTitle || ""} ${partyA.representativeName || ""} – Chức vụ: ${partyA.representativePosition || ""}` },
    { k: "p", t: `Điện thoại: ${partyA.phone || ""}` },
  );
  if (partyA.email) add({ k: "p", t: `Email: ${partyA.email}` });
  if (partyA.authorizationNumber) add({ k: "p", t: `(Ủy quyền số ${partyA.authorizationNumber})`, i: true });

  // ------------------------------------------------------------------- Bên B
  add(
    { k: "p", t: [B("BÊN B: BÊN CUNG CẤP DỊCH VỤ")] },
    { k: "p", t: [B((partyB.companyName || "").toUpperCase())] },
    { k: "p", t: `Mã số thuế/CCCD: ${partyB.taxCode || ""}` },
    { k: "p", t: `Địa chỉ: ${partyB.address || ""}` },
    { k: "p", t: `Đại diện: ${partyB.representativeTitle || ""} ${partyB.representativeName || ""} – Chức vụ: ${partyB.representativePosition || ""}` },
  );
  if (partyB.hotline) add({ k: "p", t: `Điện thoại: ${partyB.hotline}` });

  add({ k: "p", t: [T("Hai bên đồng thuận ký kết Hợp đồng cung cấp dịch vụ về nội dung: "), B("Tư vấn đăng ký tích xanh Facebook "), T("theo những điều khoản như sau:")] });

  // ------------------------------------------------------------------ ĐIỀU 1
  add(
    { k: "h", t: "ĐIỀU 1: GIẢI THÍCH TỪ NGỮ." },
    { k: "li", l: 1, t: [B("Tích xanh Facebook"), T(" là trạng thái hiển thị dấu tích xanh của mạng xã hội Facebook trên tài khoản cá nhân hoặc trang Fanpage Facebook, thể hiện tính chính chủ của tài khoản cá nhân hoặc trang Fanpage đó.")] },
    { k: "li", l: 1, t: [B("BM (Tài khoản Business Manager)"), T(" là một dạng tài khoản quản lý Doanh nghiệp trên Facebook. Đây là một loại tài khoản Facebook cho phép các doanh nghiệp có một không gian làm việc rất tiện lợi và quản lý nhiều tài khoản trên Facebook như: tạo nhiều tài khoản quảng cáo khác nhau, quản lý nhiều Fanpage trên tài khoản, kết nối đối tác, quản lý các bên dịch vụ chạy quảng cáo cho doanh nghiệp,…")] },
    { k: "li", l: 1, t: [B("Via"), T(" là viết tắt của từ tiếng Anh “Verify Information Account”, là tài khoản Facebook đã được xác minh thông tin.")] },
  );

  // ------------------------------------------------------------------ ĐIỀU 2
  add(
    { k: "h", t: "ĐIỀU 2: NỘI DUNG HỢP ĐỒNG" },
    { k: "s", t: "2.1. Nội dung dịch vụ" },
    { k: "p", t: `Bên A có nhu cầu sử dụng dịch vụ và Bên B đồng ý cung cấp dịch vụ tư vấn và hỗ trợ đăng ký Tích xanh Facebook cho Trang Fanpage “${fanpage}” của Bên A.` },
  );
  if (c.fanpageUrl) add({ k: "p", t: `Đường dẫn (link) Fanpage: ${c.fanpageUrl}` });
  add(
    { k: "s", t: "2.2. Hồ sơ Bên A cung cấp" },
    { k: "p", t: "Bên A cung cấp link tài khoản Fanpage cần lên Tích xanh cho Bên B và Giấy phép đăng ký kinh doanh theo yêu cầu của Bên B để Bên B thực hiện kiểm tra, đăng ký tài khoản Tích xanh cho Fanpage của Bên A." },
    { k: "s", t: "2.3. Công việc Bên A thực hiện theo hướng dẫn của Bên B" },
    { k: "p", t: "Bên A thực hiện các công việc theo hướng dẫn của Bên B để Bên B tiến hành đăng ký Tích xanh Facebook cho Fanpage của Bên A, bao gồm:" },
    { k: "li", l: 1, t: "Cung cấp email nhận BM mới;" },
    { k: "li", l: 1, t: "Thêm Fanpage vào dòng 1 khi nhận BM mới (Bên B sẽ hướng dẫn chi tiết);" },
    { k: "li", l: 1, t: "Chuẩn bị thẻ Ngân hàng Visa và cung cấp thông tin thẻ cho Bên B để Bên B thêm thẻ vào Fanpage;" },
    { k: "li", l: 1, t: "Gửi email Via là quản trị viên Fanpage." },
    { k: "s", t: "2.4. Yêu cầu đối với Bên A trong quá trình Bên B tiến hành công việc" },
    { k: "li", l: 1, t: `Thẻ Ngân hàng Visa để thêm vào Fanpage có sẵn tối thiểu ${formatVnd(c.minCardBalance)}đ (${soTienBangChu(c.minCardBalance)});` },
    { k: "li", l: 1, t: "Duy trì số dư hàng tháng để gia hạn Tích xanh hàng tháng (chi phí này sẽ thanh toán trực tiếp cho Facebook);" },
    { k: "li", l: 1, t: "Không tự ý thêm thẻ Ngân hàng vào Fanpage gây lệch IP;" },
    { k: "li", l: 1, t: `Via quản trị viên Fanpage phải cầm Fanpage trên ${c.viaDays} ngày;` },
    { k: "li", l: 1, t: "Via phải là Via sạch, không bị hạn chế, không vi phạm." },

    { k: "s", t: "2.5. Bàn giao dịch vụ" },
    { k: "p", t: "Bên B tiến hành tư vấn, hỗ trợ đăng ký Tích xanh Facebook cho Fanpage của Bên A theo phạm vi công việc đã thỏa thuận trong Hợp đồng." },
    { k: "p", t: "Sau khi Fanpage của Bên A hiển thị Tích xanh thành công, Bên B thực hiện bàn giao Fanpage và hướng dẫn Bên A các nội dung cần thiết để tiếp tục quản lý, sử dụng và duy trì trạng thái Tích xanh, bao gồm:" },
    { k: "li", l: 1, t: "Hướng dẫn Bên A thực hiện việc gia hạn Tích xanh cho kỳ tiếp theo theo phương thức thanh toán do Facebook/Meta áp dụng tại thời điểm gia hạn." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A kiểm tra phương thức thanh toán, thời hạn gia hạn và các thông báo liên quan đến phí duy trì Tích xanh." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A thực hiện các thiết lập bảo vệ Fanpage/tài khoản theo tính năng bảo vệ được Facebook/Meta hỗ trợ tại thời điểm bàn giao, bao gồm tính năng “Protech” hoặc tính năng tương đương nếu có trên hệ thống." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A kiểm tra quyền quản trị Fanpage, BM và các tài khoản có liên quan sau khi hoàn tất quá trình bàn giao." },
    { k: "p", t: "Sau khi Fanpage đã hiển thị Tích xanh, Bên A xác nhận đã nhận bàn giao và Bên A hoàn tất thanh toán đầy đủ 100% giá trị Hợp đồng, Bên B sẽ thực hiện thoát các tài khoản, quyền quản trị và quyền truy cập của Bên B khỏi BM/Fanpage của Bên A." },
    { k: "p", t: "Kể từ thời điểm Bên B hoàn tất việc thoát quyền truy cập và bàn giao, Bên A chịu trách nhiệm quản lý, vận hành, bảo mật tài khoản, gia hạn Tích xanh và sử dụng Fanpage theo đúng chính sách của Facebook/Meta." },

    { k: "s", t: "2.6. Thời gian bảo hành dịch vụ" },
    { k: "p", t: `Thời gian bảo hành dịch vụ là ${countText(c.warrantyMonths, "tháng")} kể từ ngày Fanpage của Bên A hiển thị Tích xanh thành công.` },
    { k: "p", t: "Trong thời gian bảo hành, Bên B có trách nhiệm hỗ trợ Bên A xử lý các vấn đề phát sinh có liên quan trực tiếp đến phần công việc do Bên B thực hiện." },
    { k: "p", t: "Bên B không thực hiện bảo hành đối với các trường hợp Fanpage bị mất Tích xanh, bị hạn chế, bị đình chỉ, bị tạm ngưng hoặc bị ảnh hưởng do các nguyên nhân thuộc quá trình quản lý, vận hành của Bên A hoặc do quyết định xử lý của Facebook/Meta." },
    { k: "p", t: "Các trường hợp không thuộc phạm vi bảo hành bao gồm nhưng không giới hạn:" },
    { k: "li", l: 1, t: "Fanpage bị người dùng hoặc bên thứ ba báo cáo (report) dẫn đến bị hạn chế, đình chỉ, tạm ngưng, vô hiệu hóa hoặc mất Tích xanh." },
    { k: "li", l: 1, t: "Fanpage bị Facebook/Meta đình chỉ, tạm ngưng, vô hiệu hóa hoặc áp dụng các biện pháp hạn chế khác do vi phạm chính sách nền tảng." },
    { k: "li", l: 1, t: "Bên A quên, không thực hiện hoặc thực hiện không đúng thời hạn việc gia hạn Tích xanh hoặc không thanh toán đầy đủ phí duy trì Tích xanh cho Facebook/Meta." },
    { k: "li", l: 1, t: "Fanpage bị gỡ khỏi, bị loại khỏi hoặc mất liên kết với BM đã sử dụng trong quá trình đăng ký/xác minh Tích xanh do thao tác của Bên A hoặc người do Bên A quản lý." },
    { k: "li", l: 1, t: "Fanpage hoặc tài khoản liên quan bị hạn chế, khóa hoặc mất tính năng do Bên A tự ý thay đổi BM, quyền quản trị, phương thức thanh toán hoặc thực hiện các thao tác khác làm ảnh hưởng đến trạng thái Tích xanh." },
    { k: "li", l: 1, t: "Bên A đăng bài, chia sẻ, sao chép hoặc sử dụng nội dung có dấu hiệu hoặc bị Facebook/Meta xác định là vi phạm bản quyền, quyền sở hữu trí tuệ, nhãn hiệu hoặc các quyền hợp pháp của bên thứ ba." },
    { k: "li", l: 1, t: "Bên A đăng bài, chia sẻ bài viết hoặc thực hiện các hành vi bị Facebook/Meta xác định là spam, lạm dụng tính năng, phát tán nội dung hàng loạt hoặc có hành vi bất thường dẫn đến Fanpage bị cảnh báo, hạn chế hoặc mất Tích xanh." },
    { k: "li", l: 1, t: "Tài khoản doanh nghiệp (BM) của Bên A bị khóa, hạn chế, vô hiệu hóa hoặc bị cấm sử dụng tính năng quảng cáo do vi phạm chính sách hoặc các nguyên nhân khác thuộc hệ thống Facebook/Meta." },
    { k: "li", l: 1, t: "Tài khoản doanh nghiệp của Bên A bị cấm hoặc hạn chế chạy quảng cáo, dẫn đến ảnh hưởng đến Fanpage hoặc trạng thái Tích xanh." },
    { k: "li", l: 1, t: "Tài khoản quản trị được sử dụng trong quá trình đăng ký/xác minh Tích xanh bị Facebook/Meta hạn chế, khóa hoặc bị loại khỏi tài khoản doanh nghiệp/BM." },
    { k: "li", l: 1, t: "Tài khoản quảng cáo có liên quan đến Fanpage, BM hoặc phương thức thanh toán phát sinh nợ tiền, quá hạn thanh toán, thẻ thanh toán không hợp lệ hoặc các vấn đề tài chính với Facebook/Meta dẫn đến việc tài khoản, Fanpage hoặc BM bị hạn chế." },
    { k: "li", l: 1, t: "Fanpage bị hủy đăng, bị hạn chế đăng bài, bị hạn chế các tính năng hoặc bị áp dụng biện pháp xử lý khác do nội dung, hành vi hoặc thao tác của Bên A hoặc bên thứ ba." },
    { k: "li", l: 1, t: "Fanpage bị hack, bị chiếm quyền quản trị, bị mất quyền kiểm soát hoặc bị thay đổi thông tin bởi bên thứ ba không xuất phát từ lỗi trực tiếp của Bên B." },
    { k: "li", l: 1, t: "Bên A hoặc người do Bên A quản lý thực hiện các hành vi vi phạm chính sách của Facebook/Meta, bao gồm nhưng không giới hạn ở:" },
    { k: "li", l: 2, t: "Nội dung kích động thù địch, phân biệt đối xử hoặc kích động bạo lực đối với cá nhân hoặc nhóm người." },
    { k: "li", l: 2, t: "Lừa đảo, giả mạo, mạo danh cá nhân, doanh nghiệp, tổ chức hoặc thương hiệu." },
    { k: "li", l: 2, t: "Phát tán thông tin sai lệch hoặc thông tin bị nền tảng xác định là vi phạm chính sách." },
    { k: "li", l: 2, t: "Quảng bá, mua bán hàng hóa hoặc dịch vụ bị cấm hoặc trái pháp luật." },
    { k: "li", l: 2, t: "Nội dung khiêu dâm, nội dung bạo lực hoặc nội dung xâm hại bị Facebook/Meta cấm." },
    { k: "li", l: 2, t: "Sử dụng quảng cáo để lừa đảo, gây hiểu nhầm hoặc thu thập dữ liệu cá nhân trái phép." },
    { k: "li", l: 2, t: "Vi phạm bản quyền, quyền sở hữu trí tuệ hoặc sử dụng nội dung chưa được phép." },
    { k: "li", l: 2, t: "Quấy rối, đe dọa, xúc phạm hoặc thực hiện hành vi tấn công đối với người khác." },
    { k: "li", l: 2, t: "Các hành vi khác bị Facebook/Meta hạn chế, cảnh báo hoặc xử lý theo chính sách tại từng thời điểm." },
    { k: "li", l: 1, t: "Fanpage bị ảnh hưởng bởi các thay đổi về chính sách, thuật toán, tiêu chuẩn xét duyệt, quy trình xác minh, biện pháp kiểm duyệt hoặc lỗi hệ thống của Facebook/Meta mà Bên B không có khả năng kiểm soát." },
    { k: "p", t: "Trong mọi trường hợp nêu trên, việc Fanpage bị mất Tích xanh hoặc bị hạn chế không được xem là lỗi của Bên B và không thuộc phạm vi bảo hành." },

    { k: "s", t: "2.7. Trách nhiệm duy trì Tích xanh sau khi bàn giao" },
    { k: "p", t: "Sau khi hoàn tất bàn giao, Bên A có trách nhiệm:" },
    { k: "li", l: 1, t: "Chủ động gia hạn Tích xanh đúng thời hạn." },
    { k: "li", l: 1, t: "Đảm bảo phương thức thanh toán hợp lệ và đủ điều kiện thanh toán phí duy trì cho Facebook/Meta." },
    { k: "li", l: 1, t: "Không tự ý tháo, gỡ, thay đổi hoặc làm mất liên kết giữa Fanpage và BM đã sử dụng trong quá trình đăng ký/xác minh." },
    { k: "li", l: 1, t: "Không tự ý thực hiện các thao tác có thể ảnh hưởng đến trạng thái Tích xanh hoặc hệ thống quản lý Fanpage." },
    { k: "li", l: 1, t: "Tuân thủ các chính sách, tiêu chuẩn cộng đồng, chính sách quảng cáo và các quy định khác của Facebook/Meta trong suốt quá trình vận hành." },
    { k: "li", l: 1, t: "Chủ động bảo vệ tài khoản, mật khẩu, mã xác thực, thiết bị đăng nhập và quyền quản trị Fanpage." },
    { k: "p", t: "Bên B không chịu trách nhiệm đối với các sự cố phát sinh sau thời điểm bàn giao do Bên A hoặc bên thứ ba quản lý, sử dụng hoặc tác động vào Fanpage, BM, tài khoản quảng cáo hoặc tài khoản quản trị." },
  );

  // ------------------------------------------------------------------ ĐIỀU 3
  const feeLines = [
    { k: "li", l: 1, t: [T("Chi phí dịch vụ: "), B(`${formatVnd(fee)} VNĐ`), T(` (${soTienBangChu(fee)})`)] },
  ];
  if (hasVat) {
    feeLines.push(
      { k: "li", l: 1, t: [T(`Thuế Giá trị Gia tăng (VAT) ${vatPercent}%: `), B(`${formatVnd(vatAmount)} VNĐ`), T(` (${soTienBangChu(vatAmount)})`)] },
      { k: "li", l: 1, t: [T("Tổng giá trị Hợp đồng (đã bao gồm thuế GTGT): "), B(`${formatVnd(total)} VNĐ`), T(` (${soTienBangChu(total)})`)] },
    );
  } else {
    feeLines.push(
      { k: "li", l: 1, t: "Thuế Giá trị Gia tăng (VAT): không áp dụng." },
      { k: "li", l: 1, t: [T("Tổng giá trị Hợp đồng: "), B(`${formatVnd(total)} VNĐ`), T(` (${soTienBangChu(total)})`)] },
    );
  }

  add(
    { k: "h", t: "ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG" },
    { k: "s", t: "3.1. Giá trị Hợp đồng" },
    ...feeLines,
    { k: "s", t: "3.2. Thời hạn thanh toán" },
    { k: "p", t: [T("Bên A thanh toán cho Bên B số tiền "), B(`${formatVnd(total)} VNĐ (${lower1(soTienBangChu(total))})`), T(" tương ứng 100% giá trị Hợp đồng ngay sau khi Hợp đồng có hiệu lực.")] },
    { k: "s", t: "3.3. Hình thức thanh toán" },
    { k: "p", t: "Bên A thanh toán cho Bên B bằng phương thức chuyển khoản theo thông tin bên dưới:" },
    { k: "li", l: 1, t: [T("Số tài khoản: "), B(partyB.bankAccount || "")] },
    { k: "li", l: 1, t: [T("Chủ tài khoản: "), B(holder)] },
    { k: "li", l: 1, t: partyB.bankName || "" },
  );

  // ------------------------------------------------------------------ ĐIỀU 4
  add(
    { k: "h", t: "ĐIỀU 4: THỜI HẠN CỦA HỢP ĐỒNG" },
    { k: "p", t: `Hợp đồng có hiệu lực ${countText(c.validityMonths, "tháng")} kể từ thời điểm hai bên ký hợp đồng.` },
    { k: "p", t: "Hợp đồng không có điều khoản gia hạn." },
  );

  // ------------------------------------------------------------------ ĐIỀU 5
  add(
    { k: "h", t: "ĐIỀU 5: QUYỀN VÀ TRÁCH NHIỆM CỦA BÊN A" },
    { k: "s", t: "5.1. Trách nhiệm của Bên A." },
    { k: "li", l: 1, t: "Thanh toán đúng thời hạn và đầy đủ giá trị Hợp đồng theo Điều 3 của Hợp đồng này." },
    { k: "li", l: 1, t: "Tự chịu trách nhiệm về các nghĩa vụ tài chính phát sinh với Facebook trong quá trình sử dụng, vận hành Fanpage nêu trên." },
    { k: "li", l: 1, t: "Cung cấp thông tin trung thực, chính xác về thông tin của sản phẩm, dịch vụ và chịu trách nhiệm về các thông tin do mình cung cấp trên các bài viết tại trang Fanpage thuộc sở hữu của Bên A." },
    { k: "li", l: 1, t: "Nếu có tranh chấp về nhãn hiệu, bản quyền… sản phẩm/dịch vụ của Bên A thì Bên A phải hoàn toàn tự chịu trách nhiệm." },
    { k: "li", l: 1, t: "Cung cấp đầy đủ các nội dung theo yêu cầu để Bên B tiến hành công việc." },
    { k: "li", l: 1, t: "Thực hiện đúng các công việc đã nêu trong Hợp đồng." },
    { k: "li", l: 1, t: "Bồi thường thiệt hại cho Bên B nếu vi phạm các thỏa thuận trong Hợp đồng." },
    { k: "li", l: 1, t: "Có trách nhiệm thực hiện đúng các hướng dẫn của Bên B trong suốt quá trình đăng ký và trong thời gian bảo hành." },
    { k: "li", l: 1, t: "Có trách nhiệm cung cấp và duy trì phương thức thanh toán hợp lệ để thực hiện việc gia hạn Tích xanh theo yêu cầu của Facebook/Meta." },
    { k: "li", l: 1, t: "Sau khi được Bên B hướng dẫn bàn giao, Bên A tự chịu trách nhiệm theo dõi thời hạn gia hạn và chủ động thực hiện gia hạn đúng kỳ." },
    { k: "li", l: 1, t: "Không tự ý thay đổi, tháo gỡ hoặc làm ảnh hưởng đến BM, Fanpage, tài khoản quản trị, tài khoản quảng cáo và các thiết lập đã sử dụng để thực hiện đăng ký/xác minh Tích xanh." },
    { k: "li", l: 1, t: "Không cung cấp quyền truy cập Fanpage/BM cho bên thứ ba không được kiểm soát nếu việc đó có thể ảnh hưởng đến trạng thái Tích xanh." },
    { k: "li", l: 1, t: "Tự chịu trách nhiệm đối với mọi nội dung do Bên A hoặc người được Bên A ủy quyền đăng tải, chia sẻ hoặc thực hiện trên Fanpage." },
    { k: "li", l: 1, t: "Tự chịu trách nhiệm đối với các hành vi vi phạm chính sách Facebook/Meta phát sinh trong quá trình vận hành Fanpage sau khi bàn giao." },
    { k: "s", t: "5.2. Quyền của Bên A." },
    { k: "li", l: 1, t: "Có quyền kiểm tra, giám sát việc thực hiện hợp đồng của Bên B theo các thỏa thuận đã ký kết." },
    { k: "li", l: 1, t: "Có quyền yêu cầu Bên B báo cáo tiến độ thực hiện nội dung thỏa thuận đã ký kết." },
    { k: "li", l: 1, t: "Có quyền yêu cầu Bên B bồi thường thiệt hại nếu Bên B vi phạm thỏa thuận của hợp đồng." },
  );

  // ------------------------------------------------------------------ ĐIỀU 6
  add(
    { k: "h", t: "ĐIỀU 6: QUYỀN VÀ TRÁCH NHIỆM CỦA BÊN B" },
    { k: "s", t: "6.1. Trách nhiệm của Bên B." },
    { k: "li", l: 1, t: "Thực hiện công việc tư vấn, hỗ trợ đăng ký Tích xanh Facebook cho Fanpage của Bên A đúng nội dung đã thỏa thuận trong hợp đồng." },
    { k: "li", l: 1, t: "Không sử dụng hình ảnh/video thuộc quyền sở hữu của Bên A khi chưa được Bên A đồng ý bằng văn bản." },
    { k: "li", l: 1, t: "Không nhân danh Bên A tự cung cấp sản phẩm/dịch vụ của Bên A hoặc lấy thông tin Khách hàng vào bất cứ mục đích nào." },
    { k: "li", l: 1, t: "Cam kết bảo mật đối với mọi thông tin, dữ liệu bảo mật mà Bên A cung cấp cho Bên B trừ trường hợp Bên B cần phải cung cấp thông tin theo yêu cầu của Cơ quan chức năng có thẩm quyền." },
    { k: "li", l: 1, t: "Báo cáo cho Bên A tiến độ và kết quả công việc theo yêu cầu của Bên A." },
    { k: "li", l: 1, t: "Bàn giao lại Fanpage cho Bên A ngay sau khi hoàn thành công việc." },
    { k: "li", l: 1, t: "Bồi thường thiệt hại cho Bên A nếu vi phạm các thỏa thuận trong Hợp đồng." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A thực hiện việc gia hạn Tích xanh cho kỳ tiếp theo theo quy trình và giao diện mà Facebook/Meta cung cấp tại thời điểm bàn giao." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A kiểm tra phương thức thanh toán, thời hạn gia hạn và các thông báo liên quan đến việc duy trì Tích xanh." },
    { k: "li", l: 1, t: "Hướng dẫn Bên A thiết lập các biện pháp bảo vệ Fanpage/tài khoản theo các tính năng mà Facebook/Meta hỗ trợ tại thời điểm bàn giao." },
    { k: "li", l: 1, t: "Thực hiện thoát quyền quản trị, quyền truy cập và các tài khoản của Bên B khỏi BM/Fanpage sau khi Bên A xác nhận bàn giao và hoàn tất thanh toán 100% giá trị Hợp đồng." },
    { k: "li", l: 1, t: "Không chịu trách nhiệm đối với trạng thái Tích xanh sau thời điểm bàn giao nếu nguyên nhân phát sinh từ hoạt động quản lý, vận hành, nội dung, thanh toán hoặc các thao tác của Bên A hoặc bên thứ ba." },
    { k: "s", t: "6.2. Quyền của Bên B." },
    { k: "li", l: 1, t: "Yêu cầu Bên A thanh toán đúng hạn theo quy định tại Điều 3 Hợp đồng." },
    { k: "li", l: 1, t: "Nếu Bên A yêu cầu dịch vụ có tính chất vi phạm pháp luật, thuần phong mỹ tục,… thì Bên B được quyền từ chối thực hiện theo thỏa thuận." },
  );

  // ------------------------------------------------------------------ ĐIỀU 7
  add(
    { k: "h", t: "ĐIỀU 7: CHẤM DỨT HỢP ĐỒNG" },
    { k: "s", t: "7.1. Hợp đồng sẽ chấm dứt trong các trường hợp sau:" },
    { k: "li", l: 1, t: "Hợp đồng hết thời hạn và hai bên đã hoàn thành tất cả trách nhiệm, nghĩa vụ đối với nhau theo Hợp đồng." },
    { k: "li", l: 1, t: "Hai bên thỏa thuận chấm dứt Hợp đồng trước thời hạn. Trong trường hợp này, hai bên sẽ đối soát lại các khoản chi phí đã chi cho công việc tại thời điểm chấm dứt Hợp đồng và hoàn trả/thanh toán cho nhau những chi phí còn lại." },
    { k: "s", t: "7.2. Đơn phương chấm dứt Hợp đồng" },
    { k: "p", t: "Một trong các bên có quyền đơn phương chấm dứt Hợp đồng trong trường hợp:" },
    { k: "li", l: 1, t: "Bên A không thực hiện thanh toán đúng hạn cho Bên B theo quy định tại Điều 3 Hợp đồng thì Bên B có quyền đơn phương chấm dứt Hợp đồng đồng thời có quyền yêu cầu Bên A phải thực hiện nghĩa vụ trả tiền theo đúng quy định tại Điều 3 của Hợp đồng." },
    { k: "li", l: 1, t: "Nếu Bên B không đảm bảo thực hiện công việc theo cam kết (trừ trường hợp bất khả kháng hoặc lỗi không do Bên B) thì Bên A có quyền đơn phương chấm dứt Hợp đồng đồng thời yêu cầu Bên B chịu phạt vi phạm và bồi thường thiệt hại theo các thỏa thuận trong Hợp đồng." },
    { k: "li", l: 1, t: "Trường hợp Fanpage đã hiển thị Tích xanh, Bên B đã hoàn tất việc bàn giao và Bên A đã xác nhận bàn giao thì dịch vụ được xem là đã hoàn thành theo phạm vi công việc của Hợp đồng, kể cả trường hợp trạng thái Tích xanh sau đó bị ảnh hưởng bởi nguyên nhân thuộc về Bên A, bên thứ ba hoặc quyết định của Facebook/Meta." },
    { k: "s", t: "7.3. Hoàn trả chi phí dịch vụ" },
    { k: "li", l: 1, t: "Bên B không có nghĩa vụ hoàn trả phí dịch vụ đối với trường hợp Facebook/Meta từ chối, hạn chế, đình chỉ, tạm ngưng hoặc hủy trạng thái Tích xanh do nguyên nhân không xuất phát từ lỗi trực tiếp của Bên B." },
    { k: "li", l: 1, t: "Trường hợp Bên B không thực hiện phần công việc thuộc phạm vi Hợp đồng do lỗi trực tiếp của Bên B thì hai bên có trách nhiệm đối soát phần công việc đã thực hiện để xác định nghĩa vụ hoàn trả, nếu có." },
    { k: "li", l: 1, t: `Trường hợp chấm dứt Hợp đồng do Bên B không thực hiện được dịch vụ theo Hợp đồng, Bên B hoàn lại chi phí dịch vụ mà Bên A đã thanh toán, thời gian hoàn trả trong vòng ${countText(c.refundWeeks, "tuần")} kể từ ngày hai bên ký kết và nhận được đầy đủ hồ sơ hủy Hợp đồng.` },
  );

  // ------------------------------------------------------------------ ĐIỀU 8
  add(
    { k: "h", t: "ĐIỀU 8: ĐIỀU KHOẢN CUỐI CÙNG" },
    { k: "li", l: 1, t: "Hợp đồng này có hiệu lực kể từ thời điểm các bên ký kết. Mọi sửa đổi bổ sung phải được cả hai bên lập thành văn bản." },
    { k: "li", l: 1, t: "Việc bàn giao được xác nhận bằng tin nhắn, email, biên bản bàn giao hoặc hình thức điện tử khác có thể xác định được nội dung và thời điểm xác nhận của Bên A." },
    { k: "li", l: 1, t: "Kể từ thời điểm Bên A xác nhận đã nhận bàn giao và Bên B hoàn tất việc thoát quyền truy cập khỏi BM/Fanpage, Bên A chịu trách nhiệm quản lý, bảo mật, gia hạn và vận hành Fanpage." },
    { k: "li", l: 1, t: "Hai bên thống nhất rằng việc xét duyệt, duy trì, hạn chế hoặc hủy trạng thái Tích xanh thuộc quyền quyết định của Facebook/Meta." },
    { k: "li", l: 1, t: "Trường hợp Facebook/Meta thay đổi chính sách, quy trình, tiêu chuẩn xét duyệt, tính năng, mức phí, cơ chế bảo vệ hoặc các điều kiện liên quan đến Tích xanh thì hai bên thực hiện theo chính sách và điều kiện được Facebook/Meta áp dụng tại thời điểm phát sinh." },
    { k: "li", l: 1, t: "Trong quá trình thực hiện Hợp đồng mà phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc tôn trọng quyền lợi của nhau; trong trường hợp không giải quyết được, thì một trong hai bên có quyền khởi kiện để yêu cầu Tòa án có thẩm quyền giải quyết theo quy định của pháp luật." },
  );
  if (c.additionalAgreement && String(c.additionalAgreement).trim()) {
    add({ k: "li", l: 1, t: `Thỏa thuận bổ sung: ${String(c.additionalAgreement).trim()}` });
  }
  add(
    { k: "li", l: 1, t: "Hai bên đều đã tự đọc lại toàn bộ nội dung của Hợp đồng này, đã hiểu và đồng ý với toàn bộ nội dung ghi trong Hợp đồng, không có điều gì vướng mắc. Bên A, Bên B đã tự nguyện ký tên/đóng dấu vào Hợp đồng này." },
    { k: "li", l: 1, t: "Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản làm bằng chứng." },
    { k: "sig" },
  );

  return blocks;
}

/** Chữ ký: dùng chung cho docx/pdf. */
export function tickSignatureNames(data) {
  return {
    a: (data.partyA?.representativeName || "").toUpperCase(),
    b: (data.partyB?.representativeName || "").toUpperCase(),
  };
}
