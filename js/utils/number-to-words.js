// ==========================================================================
// UTILS/NUMBER-TO-WORDS.JS — Đổi số tiền (VNĐ) sang chữ tiếng Việt.
// Dùng cho phần "Bằng chữ: ..." trong hợp đồng (Điều 3.1).
// Thuần hàm, không phụ thuộc DOM/Firebase -> tái sử dụng được ở bất kỳ đâu
// (view, docx-generator, v.v.)
// ==========================================================================

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const DON_VI = ["", "nghìn", "triệu", "tỷ"];

function docSo3ChuSo(number, isFull) {
  const tram = Math.floor(number / 100);
  const chuc = Math.floor((number % 100) / 10);
  const donvi = number % 10;
  let result = "";

  if (tram === 0 && isFull) {
    result += "không trăm";
  } else if (tram !== 0) {
    result += CHU_SO[tram] + " trăm";
  }

  if (chuc === 0) {
    if (isFull || tram !== 0) {
      if (donvi !== 0) result += " lẻ";
    }
  } else if (chuc === 1) {
    result += " mười";
  } else {
    result += " " + CHU_SO[chuc] + " mươi";
  }

  switch (donvi) {
    case 1:
      result += chuc >= 2 ? " mốt" : " một";
      break;
    case 5:
      result += chuc === 0 ? " năm" : " lăm";
      break;
    case 0:
      break;
    default:
      result += " " + CHU_SO[donvi];
  }

  return result.trim();
}

/**
 * Đổi một số nguyên dương (VNĐ) sang chữ tiếng Việt.
 * @param {number} number
 * @returns {string} ví dụ: "sáu triệu một trăm linh năm nghìn sáu trăm đồng"
 */
export function soTienBangChu(number) {
  const n = Math.round(Number(number) || 0);
  if (n === 0) return "không đồng";
  if (n < 0) return "âm " + soTienBangChu(-n);

  let words = [];
  let remaining = n;
  let groupIndex = 0;

  while (remaining > 0) {
    const group = remaining % 1000;
    if (group !== 0) {
      const groupIsFull = groupIndex > 0 && remaining >= 1000;
      const groupWords = docSo3ChuSo(group, groupIsFull);
      words.unshift(`${groupWords}${DON_VI[groupIndex] ? " " + DON_VI[groupIndex] : ""}`.trim());
    }
    remaining = Math.floor(remaining / 1000);
    groupIndex++;
  }

  let sentence = words.join(" ").replace(/\s+/g, " ").trim();
  // Sửa "linh năm" chuẩn văn phong hợp đồng (một trăm linh năm) thay vì "lẻ năm"
  sentence = sentence.split(" lẻ ").join(" linh ");
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return `${sentence} đồng`;
}
