// ==========================================================================
// UTILS/DATE-UTILS.JS — Định dạng ngày tháng dùng chung cho các form hợp đồng
// ==========================================================================

/**
 * "2026-03-20" (giá trị input[type=date]) -> Date object (local, không lệch múi giờ)
 * @param {string} isoDate
 */
export function parseInputDate(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Date -> "yyyy-MM-dd" cho value của input[type=date] */
export function toInputDateValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Date -> "Hôm nay, ngày 20 tháng 03 năm 2026" */
export function toVietnameseLongDate(date, prefix = "Hôm nay,") {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${prefix} ngày ${dd} tháng ${mm} năm ${yyyy}`;
}

/** Date -> "20/03/2026" */
export function toShortDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Cộng thêm n ngày vào 1 Date, trả về Date mới */
export function addDays(date, days) {
  const d = new Date(date instanceof Date ? date : new Date(date));
  d.setDate(d.getDate() + days);
  return d;
}
