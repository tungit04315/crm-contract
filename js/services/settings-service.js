// ==========================================================================
// SETTINGS-SERVICE.JS — Bọc Firestore cho "Thông tin doanh nghiệp" (Bên B).
// Đây là cấu hình DÙNG CHUNG cho mọi hợp đồng, chỉ nhập 1 lần tại
// Cài đặt hệ thống > Thông tin doanh nghiệp, sau đó các form tạo hợp đồng
// tự động điền vào (autofill) và người dùng có thể sửa riêng cho từng hợp
// đồng nếu cần mà KHÔNG làm thay đổi cấu hình gốc.
//
// Lưu tại: Firestore document  settings/business  (1 document duy nhất).
// ==========================================================================

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SETTINGS_COLLECTION = "settings";
const BUSINESS_DOC_ID = "business";

export const BUSINESS_INFO_DEFAULTS = {
  companyName: "",
  taxCode: "",
  address: "",
  hotline: "",
  email: "",
  bankAccount: "",
  bankName: "",
  representativeName: "",
  representativeTitle: "Ông", // "Ông" | "Bà"
  representativePosition: "Giám đốc",
};

function businessDocRef() {
  return doc(db, SETTINGS_COLLECTION, BUSINESS_DOC_ID);
}

/**
 * Lấy thông tin doanh nghiệp (Bên B) hiện tại.
 * @returns {Promise<typeof BUSINESS_INFO_DEFAULTS>}
 */
export async function getBusinessInfo() {
  const snap = await getDoc(businessDocRef());
  return snap.exists() ? { ...BUSINESS_INFO_DEFAULTS, ...snap.data() } : { ...BUSINESS_INFO_DEFAULTS };
}

/**
 * Lắng nghe thay đổi realtime của thông tin doanh nghiệp (dùng cho trang Cài đặt).
 * @param {(info: typeof BUSINESS_INFO_DEFAULTS) => void} callback
 * @returns {() => void} hàm hủy đăng ký
 */
export function onBusinessInfoChange(callback) {
  return onSnapshot(businessDocRef(), (snap) => {
    callback(snap.exists() ? { ...BUSINESS_INFO_DEFAULTS, ...snap.data() } : { ...BUSINESS_INFO_DEFAULTS });
  });
}

/**
 * Lưu (tạo/cập nhật) thông tin doanh nghiệp.
 * @param {Partial<typeof BUSINESS_INFO_DEFAULTS>} data
 */
export async function saveBusinessInfo(data) {
  await setDoc(
    businessDocRef(),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}