// ==========================================================================
// DOCX-GENERATOR.JS — Xuất hợp đồng ra file .docx ngay trên trình duyệt,
// bám sát 100% bố cục + nội dung file gốc "HĐ THIẾT KẾ WEBSITE.docx"
// (giữ nguyên toàn bộ 10 Điều khoản cố định, chỉ thay các trường động).
//
// Dùng thư viện "docx" (chạy được trong browser) qua CDN ESM — không cần
// build step, đúng phong cách import hiện tại của dự án (giống cách
// firebase-auth.js/-firestore.js đang được import trong auth.js, app.js...).
//
// Cách dùng (trong view):
//   import { generateContractDocx } from "../services/docx-generator.js";
//   const blob = await generateContractDocx(formData);
//   downloadBlob(blob, `${formData.contractNumber}.docx`);
// ==========================================================================

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from "https://esm.sh/docx@8.5.0";
import { toVietnameseLongDate, toShortDate, addDays } from "../utils/date-utils.js";
import { soTienBangChu } from "../utils/number-to-words.js";

const FONT = "Times New Roman";

// ---------- Helper để giảm lặp code khi tạo Paragraph/TextRun ----------
function p(text, opts = {}) {
  const { bold, italic, size = 24, align, spacingAfter = 120, indent } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter },
    indent,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, bold, italics: italic, size, font: FONT })],
  });
}

function heading(text) {
  return new Paragraph({
    spacing: { before: 260, after: 140 },
    children: [new TextRun({ text, bold: true, size: 24, font: FONT })],
  });
}

function run(text, opts = {}) {
  return new TextRun({ text, size: 24, font: FONT, ...opts });
}

function itemLetter(letter, text) {
  return p([run(`${letter}. `, { bold: false }), run(text)], { indent: { left: 360 }, spacingAfter: 100 });
}

function itemNumber(n, text) {
  return p([run(`${n}. `), run(text)], { indent: { left: 200 }, spacingAfter: 100 });
}

/**
 * @param {object} data - dữ liệu tổng hợp từ 4 bước của form (xem contract-web-view.js)
 * @returns {Promise<Blob>} file .docx sẵn sàng tải xuống
 */
export async function generateContractDocx(data) {
  const {
    contractNumber,
    signDate, // Date
    partyA, // { companyName, taxCode, representativeTitle, representativeName, representativePosition, address, phone, email }
    partyB, // { companyName, taxCode, address, hotline, email, bankAccount, bankName, representativeTitle, representativeName, representativePosition }
    content, // { domainNote, hostingNote, demoDays, acceptanceDays, contractValue, vatPercent, effectiveDate, liquidationDate }
  } = data;

  const vatAmount = Math.round((content.contractValue * content.vatPercent) / (100 + content.vatPercent));
  const dot1 = Math.round(content.contractValue / 2);
  const dot2 = content.contractValue - dot1;
  const liquidationDate = content.liquidationDate || addDays(signDate, 30);
  const effectiveDate = content.effectiveDate || signDate;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } },
        },
        children: [
          p("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, align: AlignmentType.CENTER, spacingAfter: 40 }),
          p("Độc lập - Tự do - Hạnh phúc", { italic: true, align: AlignmentType.CENTER, spacingAfter: 40 }),
          p("---o0o---", { align: AlignmentType.CENTER, spacingAfter: 200 }),

          p("HỢP ĐỒNG DỊCH VỤ THIẾT KẾ WEBSITE", { bold: true, align: AlignmentType.CENTER, size: 28, spacingAfter: 40 }),
          p(`(Số: ${contractNumber})`, { italic: true, align: AlignmentType.CENTER, spacingAfter: 200 }),

          p("Căn cứ Bộ luật Dân sự số 91/2015/QH13 do Quốc hội Nước CHXHCN Việt Nam thông qua ngày 24/11/2015;", { italic: true }),
          p("Căn cứ Luật thương mại số 36/2005/QH11 do Quốc hội Nước CHXHCN Việt Nam thông qua ngày 14/06/2005;", { italic: true }),
          p("Căn cứ vào nhu cầu và khả năng của hai Bên.", { italic: true, spacingAfter: 200 }),

          p(toVietnameseLongDate(signDate) + ", chúng tôi gồm có:", { spacingAfter: 200 }),

          // ---------------- BÊN A ----------------
          heading(`BÊN A: ${partyA.companyName.toUpperCase()}`),
          p(`Mã số thuế: ${partyA.taxCode}`),
          p(`Người đại diện: ${partyA.representativeTitle} ${partyA.representativeName.toUpperCase()}`),
          p(`Chức vụ: ${partyA.representativePosition}`),
          p(`Địa chỉ: ${partyA.address}`),
          p(`Số điện thoại: ${partyA.phone}`),
          p(`Email: ${partyA.email}`, { spacingAfter: 200 }),

          // ---------------- BÊN B ----------------
          heading(`BÊN B: ${partyB.companyName.toUpperCase()}`),
          p(`Địa chỉ: ${partyB.address}`),
          p(`Mã số thuế: ${partyB.taxCode}`),
          p(`Số tài khoản: ${partyB.bankAccount}  Ngân hàng: ${partyB.bankName}`),
          p(`Số điện thoại: ${partyB.hotline}  Email: ${partyB.email}`),
          p(`Người đại diện: ${partyB.representativeTitle} ${partyB.representativeName.toUpperCase()}`),
          p(`Chức vụ: ${partyB.representativePosition}`, { spacingAfter: 100 }),
          p('Sau khi trao đổi, hai Bên thống nhất ký kết Hợp đồng Thiết kế Website (sau đây gọi tắt là "Hợp đồng") với các điều khoản sau đây:', { italic: true, spacingAfter: 200 }),

          // ---------------- ĐIỀU 1 ----------------
          heading("ĐIỀU 1. PHẠM VI HỢP ĐỒNG"),
          itemNumber(1, 'Bên B cung cấp dịch vụ Thiết kế Website theo yêu cầu của Bên A. Chi tiết về cấu trúc, bố cục (sau đây gọi tắt là "Giao diện") và chức năng của website được hai Bên trao đổi, thống nhất theo thỏa thuận trước khi tiến hành dịch vụ.'),
          itemNumber(2, "Bên B hỗ trợ các dịch vụ đi kèm như sau:"),
          itemLetter("a", `Cung cấp tên miền và hosting để phục vụ cho phạm vi công việc thiết kế website quy định tại Điều 1.1 Hợp đồng này, cụ thể: Tên miền: ${content.domainNote}; Hosting: ${content.hostingNote}.`),
          itemLetter("b", `Nội dung khác: ${content.extraServicesNote}`),
          itemNumber(3, "Trong quá trình triển khai, việc chỉnh sửa chỉ được thực hiện nếu trước đó hai Bên có thoả thuận. Phạm vi và thời gian chỉnh sửa do các Bên thỏa thuận tuy nhiên không được thay đổi layout đã thống nhất từ ban đầu."),
          itemNumber(4, "Trường hợp chỉnh sửa những vấn đề không nằm trong thoả thuận ban đầu, thì tùy thuộc vào nội dung yêu cầu chỉnh sửa, hai Bên sẽ thống nhất lại về giá cả, phương thức thực hiện trước khi tiến hành và lập biên bản mới với nội dung như đã thỏa thuận. Biên bản này có thể được coi là một Hợp đồng mới giữa hai Bên."),

          // ---------------- ĐIỀU 2 ----------------
          heading("ĐIỀU 2: THỜI GIAN THỰC HIỆN"),
          itemNumber(1, `Thời gian thực hiện: Trong vòng ${content.demoDays} ngày làm việc kể từ khi Bên B nhận đủ thông tin, hình ảnh và Bên A hoàn thành thanh toán đợt 1 theo quy định tại Điều 3.2 Hợp đồng, Bên B sẽ bàn giao bản thiết kế thử nghiệm Website (gọi tắt là "bản thiết kế demo") để Bên A kiểm tra giao diện, hiệu ứng và cách vận hành. Thời gian thực hiện có thể thay đổi phụ thuộc vào tính chất công việc, những vấn đề phát sinh thêm trong quá trình thực hiện và sẽ do hai bên thỏa thuận. Ngày làm việc không bao gồm Thứ 7, Chủ nhật và các ngày nghỉ lễ tết theo quy định. Thời gian thực hiện không bao gồm thời gian Bên A duyệt layout nếu có. Thời gian chỉnh sửa (nếu có): Do các Bên thỏa thuận.`),
          itemNumber(2, `Thời gian nghiệm thu: Bên B sẽ hoàn chỉnh và tiến hành nghiệm thu Website trong vòng ${content.acceptanceDays} (bằng số) ngày làm việc kể từ khi các Bên A duyệt bản thiết kế demo.`),
          itemNumber(3, "Sau khi thống nhất được bản thiết kế giao diện website mẫu với Bên A, Bên B không có trách nhiệm thay đổi bất cứ hạng mục thiết kế nào so với bản giao diện website mẫu ban đầu."),
          itemNumber(4, "Mọi thay đổi so với bản giao diện website mẫu sẽ được hai bên bàn bạc, thống nhất. Tùy theo từng trường hợp mà những thay đổi sẽ lập thành phụ lục đính kèm theo bản Hợp đồng này hay sẽ được thành lập bản Hợp đồng mới, trong trường hợp đó, bản Hợp đồng này cũng như tất cả các bản sao của nó đều không còn giá trị."),

          // ---------------- ĐIỀU 3 ----------------
          heading("ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG & PHƯƠNG THỨC THANH TOÁN"),
          p("3.1. Giá trị hợp đồng:", { bold: true, spacingAfter: 60 }),
          p(`Giá trị Hợp đồng là: ${formatVnd(content.contractValue)} VNĐ. (VAT ${formatVnd(vatAmount)})`),
          p(`(Bằng chữ: ${soTienBangChu(content.contractValue)}).`, { italic: true }),
          p(`Giá trị hợp đồng đã bao gồm ${content.vatPercent}% thuế Giá trị gia tăng (VAT) và các chi phí phát sinh khi chỉnh sửa (nếu có).`, { spacingAfter: 160 }),
          p("3.2. Phương thức thanh toán:", { bold: true, spacingAfter: 60 }),
          p("Bên A thanh toán cho Bên B Tổng giá trị Hợp đồng theo quy định tại Điều 3.1 Hợp đồng thành 02 đợt như sau:"),
          itemLetter("a", `Đợt 1: thanh toán ${formatVnd(dot1)} VNĐ ngay sau khi các bên ký Hợp đồng này.`),
          itemLetter("b", `Đợt 2: thanh toán ${formatVnd(dot2)} VNĐ sau khi nghiệm thu dịch vụ.`),
          p("3.3. Hình thức thanh toán", { bold: true, spacingAfter: 60 }),
          p("Bên A thanh toán cho Bên B bằng tiền mặt hoặc chuyển khoản vào tài khoản của bên B.", { spacingAfter: 200 }),

          // ---------------- ĐIỀU 4 ----------------
          heading("ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN"),
          p("4.1. Quyền và nghĩa vụ của bên A:", { bold: true, spacingAfter: 60 }),
          itemLetter("a", "Có quyền khiếu nại về chất lượng thông tin, chất lượng dịch vụ do Bên B cung cấp. Mọi khiếu nại phải được gửi cho Bên B dưới dạng văn bản trong vòng 03 (ba) ngày kể từ ngày phát sinh vấn đề và Bên B trả lời khiếu nại cho Bên A trong vòng 03 (ba) ngày kể từ ngày Bên B nhận được công văn của Bên A."),
          itemLetter("b", "Bên A có quyền yêu cầu Bên B hoàn trả 100% phí tạm ứng nếu sau thời hạn quy định tại Điều 2 mà Bên B vẫn chưa hoàn thành nghĩa vụ cung cấp dịch vụ."),
          itemLetter("c", "Cung cấp cho Bên B đầy đủ, kịp thời các tài liệu, dữ liệu cần thiết phục vụ cho việc thực hiện Hợp đồng."),
          itemLetter("d", "Thanh toán phí dịch vụ theo đúng thời gian đã thỏa thuận. Trường hợp thanh toán chậm thì phải chịu trách nhiệm trả lãi theo quy định tại điều 9.2 của Hợp đồng."),
          itemLetter("e", "Bên A có trách nhiệm tự cập nhật nội dung website sau khi nhận được Website đã được hoàn thiện về giao diện từ Bên B và tự chịu trách nhiệm trước pháp luật về các nội dung (thông tin, hình ảnh, bài viết,...) mà Bên A đăng tải lên website."),
          itemLetter("f", "Không được tự ý sửa chữa cấu trúc, định dạng của website. Nếu tự ý sửa dẫn đến phát sinh lỗi thì Bên B không chịu trách nhiệm."),
          itemLetter("g", "Liên hệ Bên B để đóng phí gia hạn nếu Bên A sử dụng hosting và tên miền của Bên B cung cấp. Phí dịch vụ sẽ được quy định tại thời điểm gia hạn."),
          itemLetter("h", "Bên A có nghĩa vụ thực hiện đúng các quy định sử dụng dịch vụ được đăng tải cụ thể tại địa chỉ website của bên B."),
          p("4.2. Quyền và nghĩa vụ của bên B", { bold: true, spacingAfter: 60 }),
          itemLetter("i", "Bên B có nghĩa vụ cung cấp dịch vụ cho Bên A theo đúng nội dung trên hợp đồng."),
          itemLetter("j", "Bên B có nghĩa vụ đăng ký tên miền, khởi tạo hosting để chạy dữ liệu website trong vòng 3 ngày làm việc kể từ ngày ký hợp đồng nếu là dịch vụ miễn phí do bên B cung cấp."),
          itemLetter("k", "Yêu cầu bên A thanh toán chi phí theo thỏa thuận trong hợp đồng và bồi thường các thiệt hại thực tế xảy ra cho bên B nếu bên A chấm dứt hợp đồng trái pháp luật."),
          itemLetter("l", "Thông báo cho bên A tiến độ thực hiện hợp đồng. Nếu có vấn đề gì bất lợi phát sinh, bên B phải kịp thời thông báo cho bên A để cùng nhau bàn bạc, giải quyết."),
          itemLetter("m", "Trong quá trình triển khai, Bên B có quyền thay người thực hiện dự án nhưng phải bảo đảm không làm ảnh hưởng đến tiến độ thực hiện dịch vụ."),
          itemLetter("n", "Hỗ trợ bảo hành Website cho Bên A theo đúng thỏa thuận đã nêu trong hợp đồng."),
          itemLetter("o", "Được toàn quyền xử lý tài khoản quản trị Website trong trường hợp nêu tại điểm b Điều 6.1 Hợp đồng."),
          itemLetter("p", "Bên B có quyền đơn phương chấm dứt hợp đồng, ngừng cung cấp dịch vụ và yêu cầu bồi thường thiệt hại nếu Bên A không thực hiện đúng các nội dung, điều khoản quy định trên hợp đồng này.",),

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

          new Paragraph({ spacing: { before: 300 }, children: [] }),

          // ---------------- CHỮ KÝ ----------------
          new Table({
            width: { size: 9638, type: WidthType.DXA },
            borders: noBorders(),
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4819, type: WidthType.DXA },
                    borders: noBorders(),
                    children: [
                      p("ĐẠI DIỆN BÊN A", { bold: true, align: AlignmentType.CENTER, spacingAfter: 800 }),
                      p(partyA.representativeName.toUpperCase(), { bold: true, align: AlignmentType.CENTER }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4819, type: WidthType.DXA },
                    borders: noBorders(),
                    children: [
                      p("ĐẠI DIỆN BÊN B", { bold: true, align: AlignmentType.CENTER, spacingAfter: 800 }),
                      p(partyB.representativeName.toUpperCase(), { bold: true, align: AlignmentType.CENTER }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: none, bottom: none, left: none, right: none };
}

function formatVnd(n) {
  return Math.round(n).toLocaleString("vi-VN");
}

/** Kích hoạt tải file Blob về máy người dùng. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}