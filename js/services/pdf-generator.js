// ==========================================================================
// PDF-GENERATOR.JS — Xuất hợp đồng ra file .pdf THẬT ngay trên trình duyệt
// (khác với "In / Lưu PDF" qua window.print() — hàm này tạo trực tiếp file
// PDF nhị phân và tải về, không cần thao tác tay ở hộp thoại in).
//
// Dùng thư viện "pdfmake" (chạy được trong browser) qua CDN ESM — cùng
// phong cách với docx-generator.js (import "docx" qua esm.sh).
//
// LƯU Ý QUAN TRỌNG (đọc trước khi dùng):
//   - pdfmake cần nạp "vfs" (bộ font nhúng sẵn) trước khi gọi createPdf().
//     Bản build mặc định của pdfmake nhúng sẵn font Roboto — Roboto có đầy đủ
//     bộ dấu tiếng Việt nên KHÔNG cần nhúng font riêng.
//   - Cách các CDN "biến" package CommonJS (như pdfmake) thành ESM có thể
//     khác nhau tùy thời điểm, nên đoạn nạp `vfs` bên dưới có kiểm tra nhiều
//     dạng export để tránh vỡ khi esm.sh đổi cách wrap. Nếu sau này thấy lỗi
//     "Font 'Roboto' not found" hoặc PDF ra chữ vuông (tofu) thay vì tiếng
//     Việt có dấu, mở Console kiểm tra `pdfFontsModule` để xem đúng field nào
//     chứa vfs, rồi cập nhật lại đoạn gán `vfs` bên dưới cho khớp.
//
// Cách dùng (trong view):
//   import { generateContractPdf } from "../services/pdf-generator.js";
//   const blob = await generateContractPdf(formData);
//   downloadBlob(blob, `${formData.contractNumber}.pdf`);
// ==========================================================================

import pdfMakeModule from "https://esm.sh/pdfmake@0.2.10/build/pdfmake.js";
import pdfFontsModule from "https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js";
import { toVietnameseLongDate, toShortDate, addDays } from "../utils/date-utils.js";
import { soTienBangChu } from "../utils/number-to-words.js";

// pdfMake đôi khi được esm.sh trả về dạng { default } thay vì trực tiếp.
const pdfMake = pdfMakeModule?.default ?? pdfMakeModule;

// Thử lần lượt các dạng export phổ biến của vfs_fonts.js để tìm đúng bộ vfs.
const vfs =
  pdfFontsModule?.default?.pdfMake?.vfs ??
  pdfFontsModule?.pdfMake?.vfs ??
  pdfFontsModule?.default?.vfs ??
  pdfFontsModule?.vfs;

if (vfs) {
  pdfMake.vfs = vfs;
} else {
  console.warn(
    "[pdf-generator] Không tìm thấy vfs (bộ font) của pdfmake. " +
    "File PDF có thể không tạo được hoặc thiếu font. Xem ghi chú ở đầu file pdf-generator.js."
  );
}

function formatVnd(n) {
  return Math.round(n).toLocaleString("vi-VN");
}

// ---------- Helper dựng nội dung theo định dạng của pdfmake ----------
function para(text, opts = {}) {
  const { bold, italic, align, marginTop = 0, marginBottom = 6 } = opts;
  return { text, bold, italics: italic, alignment: align, margin: [0, marginTop, 0, marginBottom] };
}

function heading(text) {
  return { text, bold: true, margin: [0, 14, 0, 6] };
}

function subheading(text) {
  return { text, bold: true, margin: [0, 4, 0, 4] };
}

function itemNumber(n, text) {
  return { text: [{ text: `${n}. ` }, { text }], margin: [10, 0, 0, 5] };
}

function itemLetter(letter, text) {
  return { text: [{ text: `${letter}. ` }, { text }], margin: [18, 0, 0, 5] };
}

// ---------- Bảng "Danh mục tính năng website" (STT / Tên tính năng / Mô tả) ----------
function featureTable(features) {
  return {
    margin: [10, 2, 0, 10],
    table: {
      headerRows: 1,
      widths: [28, 110, "*"],
      body: [
        [
          { text: "STT", bold: true, fillColor: "#EFEFEF" },
          { text: "Tên tính năng", bold: true, fillColor: "#EFEFEF" },
          { text: "Mô tả", bold: true, fillColor: "#EFEFEF" },
        ],
        ...features.map((f, i) => [
          { text: String(i + 1) },
          { text: f.name },
          { text: f.description || "" },
        ]),
      ],
    },
    layout: {
      hLineColor: () => "#999999",
      vLineColor: () => "#999999",
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}

/**
 * @param {object} data - dữ liệu tổng hợp từ 4 bước của form (giống docx-generator.js)
 * @returns {Promise<Blob>} file .pdf sẵn sàng tải xuống
 */
export function generateContractPdf(data) {
  const {
    contractNumber,
    signDate,
    partyA,
    partyB,
    content,
    features = [],
  } = data;

  const vatAmount = Math.round((content.contractValue * content.vatPercent) / (100 + content.vatPercent));
  const dot1 = Math.round(content.contractValue / 2);
  const dot2 = content.contractValue - dot1;
  const liquidationDate = content.liquidationDate || addDays(signDate, 30);
  const effectiveDate = content.effectiveDate || signDate;

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [71, 57, 57, 57], // ~ giống lề docx-generator.js (2.5cm/2cm/2cm/2cm)
    defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.15 },
    content: [
      para("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, align: "center", marginBottom: 2 }),
      para("Độc lập - Tự do - Hạnh phúc", { italic: true, align: "center", marginBottom: 2 }),
      para("---o0o---", { align: "center", marginBottom: 14 }),

      { text: "HỢP ĐỒNG DỊCH VỤ THIẾT KẾ WEBSITE", bold: true, fontSize: 13, alignment: "center", margin: [0, 0, 0, 2] },
      para(`(Số: ${contractNumber})`, { italic: true, align: "center", marginBottom: 14 }),

      para("Căn cứ Bộ luật Dân sự số 91/2015/QH13 do Quốc hội Nước CHXHCN Việt Nam thông qua ngày 24/11/2015;", { italic: true }),
      para("Căn cứ Luật thương mại số 36/2005/QH11 do Quốc hội Nước CHXHCN Việt Nam thông qua ngày 14/06/2005;", { italic: true }),
      para("Căn cứ vào nhu cầu và khả năng của hai Bên.", { italic: true, marginBottom: 14 }),

      para(`${toVietnameseLongDate(signDate)}, chúng tôi gồm có:`, { marginBottom: 14 }),

      // ---------------- BÊN A ----------------
      heading(`BÊN A: ${partyA.companyName.toUpperCase()}`),
      para(`Mã số thuế: ${partyA.taxCode}`),
      para(`Người đại diện: ${partyA.representativeTitle} ${partyA.representativeName.toUpperCase()}`),
      para(`Chức vụ: ${partyA.representativePosition}`),
      para(`Địa chỉ: ${partyA.address}`),
      para(`Số điện thoại: ${partyA.phone}`),
      para(`Email: ${partyA.email}`, { marginBottom: 14 }),

      // ---------------- BÊN B ----------------
      heading(`BÊN B: ${partyB.companyName.toUpperCase()}`),
      para(`Địa chỉ: ${partyB.address}`),
      para(`Mã số thuế: ${partyB.taxCode}`),
      para(`Số tài khoản: ${partyB.bankAccount}  Ngân hàng: ${partyB.bankName}`),
      para(`Số điện thoại: ${partyB.hotline}  Email: ${partyB.email}`),
      para(`Người đại diện: ${partyB.representativeTitle} ${partyB.representativeName.toUpperCase()}`),
      para(`Chức vụ: ${partyB.representativePosition}`, { marginBottom: 6 }),
      para('Sau khi trao đổi, hai Bên thống nhất ký kết Hợp đồng Thiết kế Website (sau đây gọi tắt là "Hợp đồng") với các điều khoản sau đây:', { italic: true, marginBottom: 14 }),

      // ---------------- ĐIỀU 1 ----------------
      heading("ĐIỀU 1. PHẠM VI HỢP ĐỒNG"),
      itemNumber(1, 'Bên B cung cấp dịch vụ Thiết kế Website theo yêu cầu của Bên A. Chi tiết về cấu trúc, bố cục (sau đây gọi tắt là "Giao diện") và chức năng của website được hai Bên trao đổi, thống nhất theo thỏa thuận trước khi tiến hành dịch vụ.'),
      itemNumber(2, "Bên B hỗ trợ các dịch vụ đi kèm như sau:"),
      itemLetter("a", `Cung cấp tên miền và hosting để phục vụ cho phạm vi công việc thiết kế website quy định tại Điều 1.1 Hợp đồng này, cụ thể: Tên miền: ${content.domainNote}; Hosting: ${content.hostingNote}.`),
      itemLetter("b", `Nội dung khác: ${content.extraServicesNote}`),
      ...(features.length ? [
        itemNumber(3, "Danh mục tính năng website chi tiết như sau:"),
        featureTable(features),
      ] : []),
      itemNumber(features.length ? 4 : 3, "Trong quá trình triển khai, việc chỉnh sửa chỉ được thực hiện nếu trước đó hai Bên có thoả thuận. Phạm vi và thời gian chỉnh sửa do các Bên thỏa thuận tuy nhiên không được thay đổi layout đã thống nhất từ ban đầu."),
      itemNumber(features.length ? 5 : 4, "Trường hợp chỉnh sửa những vấn đề không nằm trong thoả thuận ban đầu, thì tùy thuộc vào nội dung yêu cầu chỉnh sửa, hai Bên sẽ thống nhất lại về giá cả, phương thức thực hiện trước khi tiến hành và lập biên bản mới với nội dung như đã thỏa thuận. Biên bản này có thể được coi là một Hợp đồng mới giữa hai Bên."),

      // ---------------- ĐIỀU 2 ----------------
      heading("ĐIỀU 2: THỜI GIAN THỰC HIỆN"),
      itemNumber(1, `Thời gian thực hiện: Trong vòng ${content.demoDays} ngày làm việc kể từ khi Bên B nhận đủ thông tin, hình ảnh và Bên A hoàn thành thanh toán đợt 1 theo quy định tại Điều 3.2 Hợp đồng, Bên B sẽ bàn giao bản thiết kế thử nghiệm Website (gọi tắt là "bản thiết kế demo") để Bên A kiểm tra giao diện, hiệu ứng và cách vận hành. Thời gian thực hiện có thể thay đổi phụ thuộc vào tính chất công việc, những vấn đề phát sinh thêm trong quá trình thực hiện và sẽ do hai bên thỏa thuận. Ngày làm việc không bao gồm Thứ 7, Chủ nhật và các ngày nghỉ lễ tết theo quy định. Thời gian thực hiện không bao gồm thời gian Bên A duyệt layout nếu có. Thời gian chỉnh sửa (nếu có): Do các Bên thỏa thuận.`),
      itemNumber(2, `Thời gian nghiệm thu: Bên B sẽ hoàn chỉnh và tiến hành nghiệm thu Website trong vòng ${content.acceptanceDays} (bằng số) ngày làm việc kể từ khi các Bên A duyệt bản thiết kế demo.`),
      itemNumber(3, "Sau khi thống nhất được bản thiết kế giao diện website mẫu với Bên A, Bên B không có trách nhiệm thay đổi bất cứ hạng mục thiết kế nào so với bản giao diện website mẫu ban đầu."),
      itemNumber(4, "Mọi thay đổi so với bản giao diện website mẫu sẽ được hai bên bàn bạc, thống nhất. Tùy theo từng trường hợp mà những thay đổi sẽ lập thành phụ lục đính kèm theo bản Hợp đồng này hay sẽ được thành lập bản Hợp đồng mới, trong trường hợp đó, bản Hợp đồng này cũng như tất cả các bản sao của nó đều không còn giá trị."),

      // ---------------- ĐIỀU 3 ----------------
      heading("ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG & PHƯƠNG THỨC THANH TOÁN"),
      subheading("3.1. Giá trị hợp đồng:"),
      para(`Giá trị Hợp đồng là: ${formatVnd(content.contractValue)} VNĐ. (VAT ${formatVnd(vatAmount)})`),
      para(`(Bằng chữ: ${soTienBangChu(content.contractValue)}).`, { italic: true }),
      para(`Giá trị hợp đồng đã bao gồm ${content.vatPercent}% thuế Giá trị gia tăng (VAT) và các chi phí phát sinh khi chỉnh sửa (nếu có).`, { marginBottom: 10 }),
      subheading("3.2. Phương thức thanh toán:"),
      para("Bên A thanh toán cho Bên B Tổng giá trị Hợp đồng theo quy định tại Điều 3.1 Hợp đồng thành 02 đợt như sau:"),
      itemLetter("a", `Đợt 1: thanh toán ${formatVnd(dot1)} VNĐ ngay sau khi các bên ký Hợp đồng này.`),
      itemLetter("b", `Đợt 2: thanh toán ${formatVnd(dot2)} VNĐ sau khi nghiệm thu dịch vụ.`),
      subheading("3.3. Hình thức thanh toán"),
      para("Bên A thanh toán cho Bên B bằng tiền mặt hoặc chuyển khoản vào tài khoản của bên B.", { marginBottom: 14 }),

      // ---------------- ĐIỀU 4 ----------------
      heading("ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN"),
      subheading("4.1. Quyền và nghĩa vụ của bên A:"),
      itemLetter("a", "Có quyền khiếu nại về chất lượng thông tin, chất lượng dịch vụ do Bên B cung cấp. Mọi khiếu nại phải được gửi cho Bên B dưới dạng văn bản trong vòng 03 (ba) ngày kể từ ngày phát sinh vấn đề và Bên B trả lời khiếu nại cho Bên A trong vòng 03 (ba) ngày kể từ ngày Bên B nhận được công văn của Bên A."),
      itemLetter("b", "Bên A có quyền yêu cầu Bên B hoàn trả 100% phí tạm ứng nếu sau thời hạn quy định tại Điều 2 mà Bên B vẫn chưa hoàn thành nghĩa vụ cung cấp dịch vụ."),
      itemLetter("c", "Cung cấp cho Bên B đầy đủ, kịp thời các tài liệu, dữ liệu cần thiết phục vụ cho việc thực hiện Hợp đồng."),
      itemLetter("d", "Thanh toán phí dịch vụ theo đúng thời gian đã thỏa thuận. Trường hợp thanh toán chậm thì phải chịu trách nhiệm trả lãi theo quy định tại điều 9.2 của Hợp đồng."),
      itemLetter("e", "Bên A có trách nhiệm tự cập nhật nội dung website sau khi nhận được Website đã được hoàn thiện về giao diện từ Bên B và tự chịu trách nhiệm trước pháp luật về các nội dung (thông tin, hình ảnh, bài viết,...) mà Bên A đăng tải lên website."),
      itemLetter("f", "Không được tự ý sửa chữa cấu trúc, định dạng của website. Nếu tự ý sửa dẫn đến phát sinh lỗi thì Bên B không chịu trách nhiệm."),
      itemLetter("g", "Liên hệ Bên B để đóng phí gia hạn nếu Bên A sử dụng hosting và tên miền của Bên B cung cấp. Phí dịch vụ sẽ được quy định tại thời điểm gia hạn."),
      itemLetter("h", "Bên A có nghĩa vụ thực hiện đúng các quy định sử dụng dịch vụ được đăng tải cụ thể tại địa chỉ website của bên B."),
      subheading("4.2. Quyền và nghĩa vụ của bên B"),
      itemLetter("i", "Bên B có nghĩa vụ cung cấp dịch vụ cho Bên A theo đúng nội dung trên hợp đồng."),
      itemLetter("j", "Bên B có nghĩa vụ đăng ký tên miền, khởi tạo hosting để chạy dữ liệu website trong vòng 3 ngày làm việc kể từ ngày ký hợp đồng nếu là dịch vụ miễn phí do bên B cung cấp."),
      itemLetter("k", "Yêu cầu bên A thanh toán chi phí theo thỏa thuận trong hợp đồng và bồi thường các thiệt hại thực tế xảy ra cho bên B nếu bên A chấm dứt hợp đồng trái pháp luật."),
      itemLetter("l", "Thông báo cho bên A tiến độ thực hiện hợp đồng. Nếu có vấn đề gì bất lợi phát sinh, bên B phải kịp thời thông báo cho bên A để cùng nhau bàn bạc, giải quyết."),
      itemLetter("m", "Trong quá trình triển khai, Bên B có quyền thay người thực hiện dự án nhưng phải bảo đảm không làm ảnh hưởng đến tiến độ thực hiện dịch vụ."),
      itemLetter("n", "Hỗ trợ bảo hành Website cho Bên A theo đúng thỏa thuận đã nêu trong hợp đồng."),
      itemLetter("o", "Được toàn quyền xử lý tài khoản quản trị Website trong trường hợp nêu tại điểm b Điều 6.1 Hợp đồng."),
      itemLetter("p", "Bên B có quyền đơn phương chấm dứt hợp đồng, ngừng cung cấp dịch vụ và yêu cầu bồi thường thiệt hại nếu Bên A không thực hiện đúng các nội dung, điều khoản quy định trên hợp đồng này."),

      // ---------------- ĐIỀU 5 ----------------
      heading("ĐIỀU 5: NGHIỆM THU"),
      itemNumber(1, "Hai bên tiến hành nghiệm thu và lập Biên bản nghiệm thu Website khi Bên B đã thiết kế xong Website đúng như thỏa thuận được thống nhất giữa hai Bên."),
      itemNumber(2, "Sau khi nghiệm thu, trường hợp Bên A có yêu cầu phát sinh hoặc chỉnh sửa nào ngoài phạm vi bảo hành đã được hai bên thỏa thuận trước, hai Bên sẽ cùng thỏa thuận về thời gian và chi phí thực hiện."),

      // ---------------- ĐIỀU 6 ----------------
      heading("ĐIỀU 6: HƯỚNG DẪN SỬ DỤNG VÀ BÀN GIAO"),
      itemNumber(1, "Bên B hướng dẫn cách thức sử dụng và quản trị website cho bên A."),
      itemNumber(2, "Bên B bàn giao đầy đủ code và tài khoản quản trị admin cho bên A."),
      itemNumber(3, "Trường hợp Bên A sử dụng hosting và tên miền do Bên B cung cấp miễn phí, Bên B sẽ quản lý tài khoản quản trị trong 1 (một) năm đầu kể từ ngày nghiệm thu. Sau 1 (một) năm:"),
      itemLetter("a", "Nếu Bên A gia hạn sử dụng hosting và tên miền: Bên B hỗ trợ thủ tục gia hạn (chi phí Bên A chịu được tính tại thời điểm gia hạn) và sẽ bàn giao tài khoản quản trị cho Bên A."),
      itemLetter("b", "Nếu Bên A không gia hạn sử dụng hosting và tên miền: bên B sẽ không bàn giao tài khoản quản trị."),
      itemNumber(4, "Trong năm đầu sử dụng dịch vụ tên miền và hosting miễn phí, nếu bên A yêu cầu cung cấp tài khoản quản trị để tự quản lí, thì sẽ đóng một khoản phí theo quy định của bên B để được cung cấp."),

      // ---------------- ĐIỀU 7 ----------------
      heading("ĐIỀU 7: BẢO HÀNH VÀ BẢO TRÌ"),
      itemNumber(1, "Bảo hành vĩnh viễn nếu Bên A sử dụng dịch vụ website và hosting của Bên B."),
      itemNumber(2, "Bên B chỉ bảo hành soucode trong thời hạn 12 tháng kể từ ngày ký biên bản nghiệm thu trong trường hợp:"),
      itemLetter("a", "Bên A sử dụng hosting, tên miền không phải do Bên B cung cấp."),
      itemLetter("b", "Bên A yêu cầu cung cấp tài khoản quản trị hosting và tên miền."),
      itemLetter("c", "Bên A tự ý sửa chữa hoặc xóa bỏ dòng bản quyền thiết kế của Bên B."),
      itemNumber(3, "Bên B sẽ hỗ trợ bảo hành, bảo trì cho Bên A các vấn đề liên quan tới lỗi vận hành, backup dữ liệu nếu có phát sinh về yêu cầu. Chi phí sẽ phụ thuộc từng trường hợp cụ thể và sự thỏa thuận giữa các Bên."),
      itemNumber(4, "Bên B không có nghĩa vụ bảo hành khi Bên A can thiệp vào tài khoản hosting và mã nguồn website do Bên B cài đặt ban đầu hoặc/và Bên A nhờ sự can thiệp của đơn vị quản lý website khác chỉnh sửa website mà bên B thiết kế."),
      itemNumber(5, `Các vấn đề liên quan đến hỗ trợ kỹ thuật (bảo hành, bảo trì, nâng cấp, chỉnh sửa,...) Bên A cần sử dụng email đăng ký trên hợp đồng để gửi yêu cầu cho phòng kỹ thuật của Bên B qua địa chỉ email: ${partyB.email}.`),

      // ---------------- ĐIỀU 8 ----------------
      heading("ĐIỀU 8: CHẤM DỨT HỢP ĐỒNG"),
      itemNumber(1, `Hợp đồng được thanh lý sau khi hai Bên đã hoàn thành các nghĩa vụ quy định trong Hợp đồng mà không có bất kỳ khiếu nại, khiếu kiện nào trong vòng 07 ngày kể từ ngày hoàn thành nghĩa vụ. Thời hạn thanh lý Hợp đồng chậm nhất là ngày ${toShortDate(liquidationDate)}.`),
      itemNumber(2, "Bên A được quyền đơn phương chấm dứt hợp đồng nhưng không được nhận lại số tiền đã thanh toán cho Bên B."),
      itemNumber(3, "Bên B có quyền chấm dứt hợp đồng khi Bên A vi phạm nội dung của hợp đồng này dẫn đến quá trình triển khai không đúng như thoả thuận. Trong trường hợp này, phí dịch vụ sẽ được tính trên chi phí thực tế mà bên B đã thực hiện."),
      itemNumber(4, "Trong trường hợp Hợp đồng không được thực hiện do các tác nhân bất khả kháng theo luật định, thì Bên bị ảnh hưởng bởi các tác nhân này phải thông báo ngay cho Bên kia bằng văn bản trong vòng 48 giờ kể từ ngày xảy ra tác nhân bất khả kháng. Thông báo này phải nêu rõ bản chất, thời gian ảnh hưởng của các tác nhân này và cách khắc phục (nếu có). Trường hợp bên bị ảnh hưởng bởi các tác nhân bất khả kháng không thể khắc phục hậu quả trong thời hạn 01 tháng thì mỗi Bên có quyền chấm dứt hợp đồng bằng văn bản gởi cho Bên kia trước 01 tuần. Quyền và nghĩa vụ của các Bên sẽ được giải quyết theo luật định tại thời điểm chấm dứt hợp đồng."),

      // ---------------- ĐIỀU 9 ----------------
      heading("ĐIỀU 9: BỒI THƯỜNG THIỆT HẠI VÀ PHẠT VI PHẠM HỢP ĐỒNG"),
      itemNumber(1, "Nếu một trong hai Bên vi phạm Hợp đồng mà không chấm dứt hành vi vi phạm dù đã được Bên còn lại nhắc nhở bằng văn bản hoặc thư điện tử nhưng không được giải quyết trong thời gian 5 ngày thì Bên vi phạm có trách nhiệm:"),
      itemLetter("a", "Hoàn trả 100% số tiền đã nhận nếu Bên vi phạm là Bên B hoặc thanh toán toàn bộ giá trị Hợp đồng còn lại nếu Bên vi phạm là Bên A."),
      itemLetter("b", "Bồi thường thiệt hại thực tế mà Bên bị vi phạm phải gánh chịu do sự vi phạm Hợp đồng của Bên còn lại. Mức bồi thường tối đa 100% giá trị hợp đồng."),
      itemNumber(2, "Trong trường hợp Bên A chậm thanh toán thì, ngoài số tiền phải thanh toán, Bên A sẽ thanh toán cho Bên B số tiền phạt chậm thanh toán với lãi suất chậm thanh toán bằng 0,05% tổng giá trị mà Bên A thanh toán trễ cho mỗi ngày thanh toán chậm."),

      // ---------------- ĐIỀU 10 ----------------
      heading("ĐIỀU 10: ĐIỀU KHOẢN CHUNG"),
      itemNumber(1, `Hợp đồng có hiệu lực kể từ ngày ${toShortDate(effectiveDate)}.`),
      itemNumber(2, "Mọi sửa đổi, bổ sung (nếu có) liên quan đến hợp đồng này chỉ có giá trị pháp lý khi được sự thỏa thuận của các bên và lập thành biên bản có chữ ký của các bên xác nhận."),
      itemNumber(3, "Hai bên cam kết thực hiện các điều khoản đã ghi trong hợp đồng. Trong trường hợp có tranh chấp, các Bên cùng nhau bàn bạc giải quyết. Trong trường hợp không thể giải quyết được thông qua thương lượng, các Bên có quyền yêu cầu Tòa Án có thẩm quyền giải quyết theo quy định của pháp luật."),
      itemNumber(4, "Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau. Mỗi Bên giữ 01 (một) bản để làm căn cứ thực hiện."),

      // ---------------- CHỮ KÝ ----------------
      {
        margin: [0, 24, 0, 0],
        table: {
          widths: ["*", "*"],
          body: [
            [
              { text: "ĐẠI DIỆN BÊN A", bold: true, alignment: "center", margin: [0, 0, 0, 40] },
              { text: "ĐẠI DIỆN BÊN B", bold: true, alignment: "center", margin: [0, 0, 0, 40] },
            ],
            [
              { text: partyA.representativeName.toUpperCase(), bold: true, alignment: "center" },
              { text: partyB.representativeName.toUpperCase(), bold: true, alignment: "center" },
            ],
          ],
        },
        layout: "noBorders",
      },
    ],
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
    } catch (err) {
      reject(err);
    }
  });
}

// ==========================================================================
// generateSeoContractPdf — Xuất hợp đồng DỊCH VỤ SEO WEBSITE ra .pdf THẬT,
// nội dung khớp 100% với generateSeoContractDocx() / file mẫu gốc.
// Tái dùng helper para()/heading()/subheading()/itemNumber()/itemLetter()/
// formatVnd() đã có sẵn phía trên trong file này.
// ==========================================================================

const SEO_CURE_DAYS_PDF = 15;        // Điều 12.2 & 14.1
const SEO_MAX_PENALTY_PERCENT_PDF = 100; // Điều 14.2
const SEO_NEGOTIATION_DAYS_PDF = 30; // Điều 15.2

function bulletItem(text) {
  return { text: `•  ${text}`, margin: [10, 0, 0, 5] };
}

/**
 * @param {object} data - dữ liệu tổng hợp từ 4 bước của form (giống docx-generator.js)
 * @returns {Promise<Blob>} file .pdf sẵn sàng tải xuống
 */
export function generateSeoContractPdf(data) {
  const { contractNumber, signDate, signPlace, partyA, partyB, content } = data;

  const dot1 = Math.round((content.contractValue * content.dot1Percent) / 100);
  const dot2 = Math.round((content.contractValue * content.dot2Percent) / 100);
  const dot3Percent = Math.max(0, 100 - content.dot1Percent - content.dot2Percent);
  const dot3 = content.contractValue - dot1 - dot2;
  const effectiveDate = content.effectiveDate || signDate;
  const vatText = content.vatIncluded === "included"
    ? "Giá trị Hợp đồng đã bao gồm thuế Giá trị gia tăng (VAT) theo quy định pháp luật."
    : "Giá trị Hợp đồng chưa bao gồm thuế Giá trị gia tăng (VAT). Trường hợp có VAT, hai bên ghi rõ tại Phụ lục 01 hoặc hóa đơn.";

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [71, 57, 57, 57],
    defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.15 },
    content: [
      para("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, align: "center", marginBottom: 2 }),
      para("Độc lập - Tự do - Hạnh phúc", { italic: true, align: "center", marginBottom: 2 }),
      para("---o0o---", { align: "center", marginBottom: 14 }),

      { text: "HỢP ĐỒNG DỊCH VỤ SEO WEBSITE", bold: true, fontSize: 13, alignment: "center", margin: [0, 0, 0, 2] },
      para(`(Số: ${contractNumber})`, { italic: true, align: "center", marginBottom: 14 }),

      para(`${toVietnameseLongDate(signDate)}, tại ${signPlace}, chúng tôi gồm có:`, { marginBottom: 14 }),

      // BÊN A
      heading("BÊN A: BÊN SỬ DỤNG DỊCH VỤ"),
      para(`Tên đơn vị: ${partyA.companyName}`),
      para(`Mã số thuế/CCCD: ${partyA.taxCode}`),
      para(`Địa chỉ: ${partyA.address}`),
      para(`Đại diện: ${partyA.representativeTitle} ${partyA.representativeName.toUpperCase()}`),
      para(`Chức vụ: ${partyA.representativePosition}`),
      para(`Điện thoại: ${partyA.phone}`),
      para(`Email: ${partyA.email}`, { marginBottom: 14 }),

      // BÊN B
      heading("BÊN B: BÊN CUNG CẤP DỊCH VỤ"),
      para(`Tên đơn vị/Cá nhân: ${partyB.companyName}`),
      para(`Mã số thuế/CCCD: ${partyB.taxCode}`),
      para(`Địa chỉ: ${partyB.address}`),
      para(`Đại diện: ${partyB.representativeTitle} ${partyB.representativeName.toUpperCase()}`),
      para(`Chức vụ: ${partyB.representativePosition}`),
      para(`Điện thoại: ${partyB.hotline}`),
      para(`Email: ${partyB.email}`, { marginBottom: 6 }),
      para("Hai bên thống nhất ký kết Hợp đồng dịch vụ SEO Website với các điều khoản sau:", { italic: true, marginBottom: 14 }),

      // ĐIỀU 1
      heading("ĐIỀU 1. ĐỐI TƯỢNG HỢP ĐỒNG"),
      itemNumber(1, "Bên B cung cấp cho Bên A dịch vụ SEO Website theo nhu cầu, mục tiêu kinh doanh và kế hoạch triển khai đã được hai bên thống nhất bằng văn bản, email hoặc phụ lục hợp đồng."),
      itemNumber(2, "Dịch vụ SEO có thể bao gồm một hoặc nhiều hạng mục sau, tùy theo phạm vi ký kết:"),
      bulletItem("Nghiên cứu từ khóa, phân tích thị trường, phân tích đối thủ;"),
      bulletItem("Audit SEO kỹ thuật, SEO Onpage, cấu trúc website, internal link;"),
      bulletItem("Lập kế hoạch nội dung SEO;"),
      bulletItem("Viết bài SEO/brief nội dung/outline;"),
      bulletItem("Tối ưu tiêu đề, mô tả, heading, schema, liên kết nội bộ;"),
      bulletItem("Tối ưu trải nghiệm người dùng ở mức khuyến nghị;"),
      bulletItem("Theo dõi thứ hạng, lưu lượng truy cập và báo cáo định kỳ;"),
      bulletItem("Đề xuất cải thiện chuyển đổi và các hạng mục SEO bổ trợ khác nếu có thỏa thuận."),
      itemNumber(3, "Phạm vi công việc cụ thể, số lượng từ khóa, số lượng bài viết, số trang, số lần báo cáo, thời gian bàn giao và các KPI đầu ra được quy định tại Phụ lục 01 kèm theo Hợp đồng này."),
      itemNumber(4, "Mọi yêu cầu ngoài phạm vi Phụ lục 01 chỉ được thực hiện khi hai bên thống nhất bằng văn bản, email, tin nhắn hoặc phụ lục bổ sung."),

      // ĐIỀU 2
      heading("ĐIỀU 2. MỤC TIÊU VÀ NGUYÊN TẮC TRIỂN KHAI"),
      itemNumber(1, "Mục tiêu của dịch vụ là cải thiện khả năng hiển thị của website trên công cụ tìm kiếm, tăng truy cập tự nhiên, tăng chất lượng traffic, hỗ trợ tạo lead và nâng cao hiệu quả marketing của Bên A."),
      itemNumber(2, "Bên A hiểu và đồng ý rằng SEO là dịch vụ tối ưu theo quá trình, chịu ảnh hưởng bởi nhiều yếu tố như thuật toán công cụ tìm kiếm, mức độ cạnh tranh, chất lượng website, nguồn lực nội dung, tốc độ phê duyệt và hành vi thị trường."),
      itemNumber(3, "Bên B cam kết thực hiện đúng chuyên môn, quy trình kỹ thuật và nỗ lực tối đa để đạt được mục tiêu của Hợp đồng. Tuy nhiên, Bên B không cam kết tuyệt đối vị trí thứ hạng cụ thể nếu không có thỏa thuận riêng bằng văn bản."),

      // ĐIỀU 3
      heading("ĐIỀU 3. THỜI GIAN THỰC HIỆN"),
      itemNumber(1, "Hợp đồng có hiệu lực kể từ ngày ký hoặc từ ngày được ghi tại phần hiệu lực của Hợp đồng."),
      itemNumber(2, "Thời gian bắt đầu triển khai tính từ thời điểm Bên B nhận đủ:"),
      bulletItem("Thông tin, tài liệu, hình ảnh, dữ liệu, quyền truy cập cần thiết;"),
      bulletItem("Khoản tạm ứng hoặc thanh toán đợt đầu theo Điều 5 của Hợp đồng;"),
      bulletItem("Xác nhận nội dung yêu cầu và phạm vi công việc từ Bên A."),
      itemNumber(3, "Tiến độ thực hiện từng giai đoạn được hai bên thống nhất tại Phụ lục 01 hoặc lịch triển khai riêng."),
      itemNumber(4, "Thời gian thực hiện sẽ được gia hạn tương ứng trong các trường hợp:"),
      bulletItem("Bên A chậm cung cấp thông tin, hình ảnh, phê duyệt nội dung hoặc phản hồi;"),
      bulletItem("Có thay đổi phạm vi công việc;"),
      bulletItem("Phát sinh sự kiện bất khả kháng;"),
      bulletItem("Có yêu cầu phát sinh được hai bên thống nhất."),

      // ĐIỀU 4
      heading("ĐIỀU 4. PHẠM VI CÔNG VIỆC CỤ THỂ CỦA BÊN B"),
      itemNumber(1, "Bên B có trách nhiệm thực hiện các công việc đã thỏa thuận theo đúng chất lượng và tiến độ, bao gồm nhưng không giới hạn:"),
      bulletItem("Phân tích website hiện tại và đề xuất phương án tối ưu;"),
      bulletItem("Nghiên cứu từ khóa theo cụm chủ đề và ý định tìm kiếm;"),
      bulletItem("Xây dựng cấu trúc nội dung, kế hoạch bài viết và liên kết nội bộ;"),
      bulletItem("Tối ưu Onpage cho các trang được chỉ định;"),
      bulletItem("Viết/chỉnh sửa nội dung SEO theo brief đã duyệt;"),
      bulletItem("Tối ưu tiêu đề, mô tả, heading, CTA, hình ảnh, alt text ở mức nội dung;"),
      bulletItem("Báo cáo định kỳ tiến độ công việc, kết quả và khuyến nghị cải thiện."),
      itemNumber(2, "Bên B có quyền đề xuất thay đổi chiến lược, cấu trúc nội dung hoặc phương án triển khai nếu nhận thấy cần thiết để nâng cao hiệu quả SEO. Việc thay đổi chỉ được thực hiện sau khi Bên A xác nhận."),
      itemNumber(3, "Trừ khi hai bên có thỏa thuận khác, Bên B không chịu trách nhiệm đối với:"),
      bulletItem("Các lỗi phát sinh do bên thứ ba can thiệp vào website;"),
      bulletItem("Việc bị tụt hạng do thay đổi thuật toán công cụ tìm kiếm;"),
      bulletItem("Hiệu quả thấp do Bên A chậm duyệt nội dung, không đăng tải đúng kế hoạch hoặc không triển khai khuyến nghị kỹ thuật;"),
      bulletItem("Các hoạt động quảng cáo, PR, backlink, social signal, technical fixing ngoài phạm vi Hợp đồng."),

      // ĐIỀU 5
      heading("ĐIỀU 5. GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN"),
      subheading("5.1. Giá trị Hợp đồng:"),
      para(`Tổng giá trị: ${formatVnd(content.contractValue)} VNĐ`),
      para(`Bằng chữ: ${soTienBangChu(content.contractValue)}.`, { italic: true, marginBottom: 8 }),
      para("5.2. " + vatText, { marginBottom: 8 }),
      subheading("5.3. Phương thức thanh toán:"),
      bulletItem(`Đợt 1: ${content.dot1Percent}% ngay sau khi ký Hợp đồng (${formatVnd(dot1)} VNĐ);`),
      bulletItem(`Đợt 2: ${content.dot2Percent}% sau khi bàn giao ${content.dot2Milestone} (${formatVnd(dot2)} VNĐ);`),
      bulletItem(`Đợt 3: ${dot3Percent}% sau khi nghiệm thu toàn bộ hoặc theo chu kỳ tháng/quý (${formatVnd(dot3)} VNĐ).`),
      para("5.4. Hình thức thanh toán: chuyển khoản hoặc tiền mặt theo thông tin của Bên B.", { marginBottom: 8 }),
      para(`5.5. Trường hợp Bên A thanh toán chậm, Bên A phải thanh toán thêm khoản lãi chậm trả là ${content.lateInterestPercent}%/ngày trên số tiền chậm thanh toán, hoặc theo mức các bên thống nhất trong giới hạn pháp luật cho phép.`),
      para("5.6. Các chi phí phát sinh ngoài phạm vi Hợp đồng chỉ được thực hiện khi có xác nhận trước của Bên A bằng văn bản, email hoặc tin nhắn có thể lưu vết.", { marginBottom: 14 }),

      // ĐIỀU 6
      heading("ĐIỀU 6. NGHIỆM THU VÀ BÀN GIAO"),
      itemNumber(1, "Bên B bàn giao kết quả theo từng giai đoạn hoặc theo đợt công việc đã thỏa thuận."),
      itemNumber(2, "Hình thức bàn giao có thể gồm:"),
      bulletItem("File tài liệu Word/Google Docs/Excel/PDF;"),
      bulletItem("Danh sách từ khóa, kế hoạch nội dung, báo cáo SEO;"),
      bulletItem("Nội dung bài viết SEO;"),
      bulletItem("File tổng hợp đo lường và khuyến nghị."),
      itemNumber(3, `Bên A có trách nhiệm phản hồi, góp ý hoặc xác nhận nghiệm thu trong vòng ${content.acceptanceDays} ngày làm việc kể từ ngày nhận bàn giao.`),
      itemNumber(4, "Nếu hết thời hạn trên Bên A không phản hồi bằng văn bản, email hoặc tin nhắn xác nhận, hạng mục được xem là tạm nghiệm thu."),
      itemNumber(5, "Sau nghiệm thu, mọi yêu cầu chỉnh sửa ngoài phạm vi thỏa thuận ban đầu sẽ được tính là công việc phát sinh và hai bên sẽ thống nhất phí riêng."),

      // ĐIỀU 7
      heading("ĐIỀU 7. QUYỀN VÀ NGHĨA VỤ CỦA BÊN A"),
      itemNumber(1, "Cung cấp đầy đủ, chính xác, kịp thời tài liệu, hình ảnh, thông tin sản phẩm/dịch vụ, định hướng thương hiệu, quyền truy cập cần thiết và các nội dung liên quan đến công việc."),
      itemNumber(2, "Phối hợp phản hồi, duyệt nội dung và xác nhận tiến độ đúng thời gian để không ảnh hưởng đến kế hoạch triển khai."),
      itemNumber(3, "Thanh toán đúng hạn theo điều khoản Hợp đồng."),
      itemNumber(4, "Chịu trách nhiệm về tính hợp pháp, tính chính xác và quyền sử dụng của các tài liệu, hình ảnh, dữ liệu do Bên A cung cấp."),
      itemNumber(5, "Có quyền yêu cầu Bên B chỉnh sửa trong phạm vi công việc đã thỏa thuận."),
      itemNumber(6, "Không tự ý chỉnh sửa, can thiệp hoặc ủy quyền bên thứ ba can thiệp vào tài liệu, nội dung, hệ thống hoặc quy trình đã bàn giao nếu việc đó gây ảnh hưởng đến kết quả công việc mà không thông báo cho Bên B."),

      // ĐIỀU 8
      heading("ĐIỀU 8. QUYỀN VÀ NGHĨA VỤ CỦA BÊN B"),
      itemNumber(1, "Thực hiện dịch vụ đúng phạm vi, tiến độ và chất lượng đã cam kết."),
      itemNumber(2, "Đề xuất phương án tối ưu chuyên môn để nâng cao hiệu quả SEO cho Bên A."),
      itemNumber(3, "Bảo mật thông tin, tài liệu, dữ liệu, chiến lược kinh doanh và các thông tin nội bộ của Bên A."),
      itemNumber(4, "Không sử dụng thông tin, tài sản nội dung của Bên A cho mục đích khác nếu chưa có sự đồng ý của Bên A."),
      itemNumber(5, "Thông báo kịp thời cho Bên A về các vấn đề phát sinh có thể ảnh hưởng đến tiến độ hoặc chất lượng dịch vụ."),
      itemNumber(6, "Có quyền tạm ngừng triển khai hoặc từ chối bàn giao một phần công việc nếu Bên A chậm thanh toán, chậm phản hồi hoặc vi phạm nghĩa vụ hợp đồng."),

      // ĐIỀU 9
      heading("ĐIỀU 9. CHỈNH SỬA, BỔ SUNG VÀ PHÁT SINH"),
      itemNumber(1, `Số lần chỉnh sửa miễn phí cho mỗi bài viết/hạng mục: ${content.freeRevisions} lần, áp dụng trong phạm vi brief đã thống nhất.`),
      itemNumber(2, "Những yêu cầu làm thay đổi hoàn toàn mục tiêu, cấu trúc, độ dài, nhóm từ khóa, tông giọng hoặc định hướng nội dung sẽ được xem là công việc mới."),
      itemNumber(3, "Mọi phát sinh phải được xác nhận trước bằng văn bản, email hoặc tin nhắn có thể lưu vết trước khi thực hiện."),

      // ĐIỀU 10
      heading("ĐIỀU 10. BẢN QUYỀN, SỞ HỮU TRÍ TUỆ VÀ BẢO MẬT"),
      itemNumber(1, "Sau khi Bên A thanh toán đầy đủ toàn bộ giá trị Hợp đồng, quyền sử dụng kết quả công việc thuộc về Bên A, trừ khi hai bên có thỏa thuận khác bằng văn bản."),
      itemNumber(2, "Bên B cam kết không sao chép trái phép, không sử dụng lại nội dung của bên thứ ba vi phạm bản quyền. Trường hợp có sử dụng nguồn tham khảo, Bên B có trách nhiệm diễn giải lại phù hợp và/hoặc trích dẫn theo chuẩn mực chuyên môn nếu cần."),
      itemNumber(3, "Bên B không tiết lộ các thông tin mật liên quan đến:"),
      bulletItem("Kế hoạch marketing;"),
      bulletItem("Từ khóa;"),
      bulletItem("Báo cáo hiệu quả;"),
      bulletItem("Thông tin khách hàng;"),
      bulletItem("Dữ liệu nội bộ;"),
      bulletItem("Các tài liệu liên quan khác của Bên A."),
      itemNumber(4, `Nghĩa vụ bảo mật có hiệu lực trong suốt thời gian hợp đồng và tiếp tục có hiệu lực sau khi hợp đồng chấm dứt trong thời hạn ${content.confidentialityYears} năm hoặc theo quy định pháp luật.`),

      // ĐIỀU 11
      heading("ĐIỀU 11. BÁO CÁO VÀ THEO DÕI HIỆU QUẢ"),
      itemNumber(1, `Bên B cung cấp báo cáo định kỳ: ${content.reportFrequency.toLowerCase()}, tùy theo thỏa thuận.`),
      itemNumber(2, "Nội dung báo cáo có thể bao gồm:"),
      bulletItem("Kết quả công việc đã thực hiện;"),
      bulletItem("Từ khóa và trang đích đang theo dõi;"),
      bulletItem("Tăng trưởng traffic;"),
      bulletItem("Chỉ số tương tác/chuyển đổi nếu có dữ liệu;"),
      bulletItem("Vấn đề tồn đọng và khuyến nghị."),
      itemNumber(3, "Các chỉ số đo lường chỉ có giá trị tham khảo và phục vụ quản trị hiệu quả, không mặc nhiên là cam kết tuyệt đối nếu không ghi rõ trong Phụ lục."),

      // ĐIỀU 12
      heading("ĐIỀU 12. TẠM NGỪNG, CHẤM DỨT HỢP ĐỒNG"),
      itemNumber(1, "Hợp đồng chấm dứt khi:"),
      bulletItem("Hai bên đã hoàn thành toàn bộ nghĩa vụ;"),
      bulletItem("Một trong hai bên đơn phương chấm dứt theo quy định của Hợp đồng;"),
      bulletItem("Xảy ra bất khả kháng theo Điều 13;"),
      bulletItem("Theo quyết định của cơ quan có thẩm quyền."),
      itemNumber(2, `Một bên có quyền đơn phương chấm dứt Hợp đồng nếu bên còn lại vi phạm nghiêm trọng nghĩa vụ và không khắc phục trong vòng ${SEO_CURE_DAYS_PDF} ngày làm việc kể từ khi nhận thông báo bằng văn bản.`),
      itemNumber(3, "Trường hợp Bên A đơn phương chấm dứt Hợp đồng không do lỗi của Bên B, Bên A phải thanh toán phần công việc Bên B đã thực hiện thực tế đến thời điểm chấm dứt."),
      itemNumber(4, "Trường hợp Bên B đơn phương chấm dứt Hợp đồng không do lỗi của Bên A, Bên B phải hoàn trả khoản tiền đã nhận tương ứng với phần công việc chưa thực hiện, sau khi trừ đi phần giá trị công việc đã hoàn thành hợp lệ."),
      itemNumber(5, "Việc chấm dứt hợp đồng không làm mất hiệu lực các điều khoản về thanh toán, bảo mật, bản quyền, xử lý vi phạm và giải quyết tranh chấp."),

      // ĐIỀU 13
      heading("ĐIỀU 13. BẤT KHẢ KHÁNG"),
      itemNumber(1, "Bất khả kháng là các sự kiện xảy ra khách quan, không thể lường trước và không thể khắc phục được dù đã áp dụng mọi biện pháp cần thiết và khả năng cho phép, bao gồm nhưng không giới hạn ở: thiên tai, hỏa hoạn, dịch bệnh, chiến tranh, bạo loạn, sự cố diện rộng của hạ tầng mạng, quyết định của cơ quan nhà nước có thẩm quyền."),
      itemNumber(2, "Bên bị ảnh hưởng bởi sự kiện bất khả kháng phải thông báo cho bên còn lại trong vòng 48 giờ kể từ khi xảy ra sự kiện, đồng thời nêu rõ phạm vi ảnh hưởng và phương án khắc phục dự kiến."),
      itemNumber(3, "Trong thời gian bất khả kháng, hai bên cùng trao đổi để gia hạn tiến độ hoặc điều chỉnh phương án thực hiện phù hợp."),

      // ĐIỀU 14
      heading("ĐIỀU 14. PHẠT VI PHẠM VÀ BỒI THƯỜNG THIỆT HẠI"),
      itemNumber(1, `Nếu một trong hai bên vi phạm nghĩa vụ mà không khắc phục sau khi đã được nhắc nhở bằng văn bản/email/tin nhắn trong thời hạn ${SEO_CURE_DAYS_PDF} ngày làm việc, bên vi phạm phải:`),
      bulletItem("Khắc phục vi phạm;"),
      bulletItem("Hoàn trả/ thanh toán phần nghĩa vụ tương ứng;"),
      bulletItem("Bồi thường thiệt hại thực tế phát sinh cho bên bị vi phạm."),
      itemNumber(2, `Mức bồi thường tối đa không vượt quá ${SEO_MAX_PENALTY_PERCENT_PDF}% giá trị phần nghĩa vụ bị vi phạm hoặc theo thỏa thuận riêng giữa hai bên.`),
      itemNumber(3, "Trường hợp Bên A chậm thanh toán, Bên A phải chịu khoản phạt chậm thanh toán theo Điều 5.5 của Hợp đồng."),
      itemNumber(4, "Trường hợp Bên A yêu cầu dừng việc triển khai trái với tiến độ đã chốt, Bên A vẫn phải thanh toán phần công việc đã thực hiện và các chi phí phát sinh hợp lý nếu có."),

      // ĐIỀU 15
      heading("ĐIỀU 15. GIẢI QUYẾT TRANH CHẤP"),
      itemNumber(1, "Mọi tranh chấp phát sinh từ Hợp đồng trước hết được giải quyết bằng thương lượng và hòa giải trên tinh thần hợp tác."),
      itemNumber(2, `Nếu không thể giải quyết bằng thương lượng trong thời hạn ${SEO_NEGOTIATION_DAYS_PDF} ngày, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền giải quyết theo quy định pháp luật Việt Nam.`),
      itemNumber(3, "Chi phí phát sinh trong quá trình giải quyết tranh chấp do bên thua kiện hoặc theo quyết định của cơ quan có thẩm quyền chịu trách nhiệm thanh toán."),

      // ĐIỀU 16
      heading("ĐIỀU 16. ĐIỀU KHOẢN CHUNG"),
      itemNumber(1, `Hợp đồng có hiệu lực kể từ ngày ${toShortDate(effectiveDate)} và chỉ chấm dứt khi các bên đã hoàn thành toàn bộ nghĩa vụ.`),
      itemNumber(2, "Mọi sửa đổi, bổ sung, phụ lục của Hợp đồng chỉ có giá trị khi được lập thành văn bản và có xác nhận của hai bên."),
      itemNumber(3, "Email, tin nhắn, tài liệu trao đổi, phụ lục, biên bản nghiệm thu và các xác nhận có thể lưu vết được hai bên chấp thuận là căn cứ thực hiện Hợp đồng nếu không trái quy định pháp luật."),
      itemNumber(4, "Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản."),

      // CHỮ KÝ
      {
        margin: [0, 24, 0, 0],
        table: {
          widths: ["*", "*"],
          body: [
            [
              { text: "ĐẠI DIỆN BÊN A", bold: true, alignment: "center", margin: [0, 0, 0, 40] },
              { text: "ĐẠI DIỆN BÊN B", bold: true, alignment: "center", margin: [0, 0, 0, 40] },
            ],
            [
              { text: partyA.representativeName.toUpperCase(), bold: true, alignment: "center" },
              { text: partyB.representativeName.toUpperCase(), bold: true, alignment: "center" },
            ],
          ],
        },
        layout: "noBorders",
      },

      // PHỤ LỤC 01 (trang mới)
      { text: "PHỤ LỤC 01: PHẠM VI CÔNG VIỆC, KPI VÀ BÀN GIAO", bold: true, pageBreak: "before", margin: [0, 0, 0, 6] },
      itemNumber(1, `Danh mục từ khóa/nhóm chủ đề: ${content.keywordsScope}`),
      itemNumber(2, `Số lượng bài viết/landing page: ${content.articleCount}`),
      itemNumber(3, `Tần suất báo cáo: ${content.reportFrequency}`),
      itemNumber(4, `Timeline triển khai: ${content.timeline}`),
      itemNumber(5, `Yêu cầu đặc biệt khác: ${content.specialRequirements || "Không có"}`),
    ],
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
    } catch (err) {
      reject(err);
    }
  });
}

