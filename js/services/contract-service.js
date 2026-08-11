// ==========================================================================
// CONTRACT-SERVICE.JS — Sinh số hợp đồng tự động + lưu hợp đồng vào Firestore.
// Dùng chung cho mọi loại hợp đồng (Web, SEO, ...). Thêm loại mới chỉ cần
// truyền `type` khác (vd "SEO") khi gọi buildContractNumber()/saveContract().
//
// Lưu tại: Firestore collection "contracts", mỗi document là 1 hợp đồng đã
// tạo (dùng lại được cho trang chủ thống kê, danh sách hợp đồng sau này).
//
// CẬP NHẬT: bổ sung subscribeContracts() — lắng nghe realtime TOÀN BỘ danh
// sách hợp đồng đã tạo, phục vụ trang "Lịch sử xuất" (export-history-view.js).
// ==========================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getCountFromServer,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION = "contracts";

const TYPE_CODE = {
  web: "HĐTK-WEB",
  seo: "HĐTK-SEO",
};

/** Bỏ dấu + lấy chữ cái đầu mỗi từ, in hoa. "Nguyễn Xuân Đàm" -> "NXĐ" */
function getInitials(fullName) {
  return (fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Sinh số hợp đồng dạng: {ddMMyy}{Tên viết tắt người đại diện Bên A}/{HĐTK-WEB}/....
 * Ví dụ: 200326NXĐ/HĐTK-WEB/....
 * Có thể chỉnh sửa lại tự do sau khi sinh — đây chỉ là gợi ý mặc định.
 *
 * @param {{ signDate: Date, representativeName: string, type?: "web"|"seo" }} opts
 */
export function buildContractNumber({ signDate, representativeName, type = "web" }) {
  const d = signDate instanceof Date ? signDate : new Date(signDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const initials = getInitials(representativeName) || "KH";
  const typeCode = TYPE_CODE[type] || TYPE_CODE.web;
  return `${dd}${mm}${yy}${initials}/${typeCode}/....`;
}

/**
 * Đếm số hợp đồng đã tạo trong ngày (cùng loại) để gợi ý số thứ tự, phòng khi
 * nhiều khách hàng ký cùng ngày trùng số. Không bắt buộc dùng.
 */
export async function countContractsToday(type = "web") {
  const todayKey = new Date().toISOString().slice(0, 10);
  const q = query(
    collection(db, COLLECTION),
    where("type", "==", type),
    where("dateKey", "==", todayKey)
  );
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.error("Không thể đếm hợp đồng trong ngày:", err);
    return 0;
  }
}

/**
 * Kiểm tra số hợp đồng đã tồn tại chưa (vì người dùng có thể sửa tay số gợi ý,
 * dẫn tới trùng). Dùng trước khi lưu để tránh 2 hợp đồng cùng số.
 * @param {string} contractNumber
 * @returns {Promise<boolean>}
 */
export async function isContractNumberTaken(contractNumber) {
  if (!contractNumber) return false;
  const q = query(collection(db, COLLECTION), where("contractNumber", "==", contractNumber));
  try {
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error("Không thể kiểm tra trùng số hợp đồng:", err);
    return false; // không chặn người dùng nếu việc kiểm tra bị lỗi mạng
  }
}

/**
 * Lưu hợp đồng đã tạo vào Firestore (sau khi người dùng xuất file ở bước xem trước).
 * Tự kiểm tra trùng số hợp đồng trước khi ghi; nếu trùng sẽ báo lỗi rõ ràng để
 * người dùng quay lại Bước 1 sửa số hợp đồng.
 * @param {object} contractData - toàn bộ dữ liệu form (bên A, bên B, nội dung, số HĐ...)
 * @param {"web"|"seo"} type
 */
export async function saveContract(contractData, type = "web") {
  const taken = await isContractNumberTaken(contractData.contractNumber);
  if (taken) {
    throw new Error(`DUPLICATE_CONTRACT_NUMBER:${contractData.contractNumber}`);
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...contractData,
    type,
    dateKey: new Date().toISOString().slice(0, 10),
    status: "pending", // pending -> in_progress -> completed (mở rộng sau)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ==========================================================================
// LỊCH SỬ XUẤT HỢP ĐỒNG (export-history-view.js)
// ==========================================================================

/** Chuyển Firestore Timestamp -> Date. Giữ nguyên nếu đã là Date hoặc null/undefined. */
function toDateIfTimestamp(value) {
  if (value && typeof value.toDate === "function") return value.toDate();
  return value ?? null;
}

/**
 * Chuẩn hoá 1 document hợp đồng lấy từ Firestore về dạng dùng lại được NGAY
 * với docx-generator.js / pdf-generator.js / contract-preview.js — không cần
 * xử lý gì thêm ở nơi gọi (signDate, content.effectiveDate,
 * content.liquidationDate, createdAt, updatedAt đều được chuyển từ
 * Firestore Timestamp sang Date object).
 */
function normalizeContract(id, raw) {
  const content = { ...(raw.content || {}) };
  if ("effectiveDate" in content) content.effectiveDate = toDateIfTimestamp(content.effectiveDate);
  if ("liquidationDate" in content) content.liquidationDate = toDateIfTimestamp(content.liquidationDate);

  return {
    ...raw,
    id,
    signDate: toDateIfTimestamp(raw.signDate),
    createdAt: toDateIfTimestamp(raw.createdAt),
    updatedAt: toDateIfTimestamp(raw.updatedAt),
    content,
    status: raw.status || "pending",
  };
}

/**
 * Lắng nghe realtime TOÀN BỘ danh sách hợp đồng đã tạo (mới xuất trước),
 * dùng cho trang "Lịch sử xuất". Việc lọc/tìm kiếm/sắp xếp/phân trang được
 * xử lý ở phía client (export-history-view.js) — vì số lượng hợp đồng của
 * 1 doanh nghiệp vừa/nhỏ thường không quá lớn, cách này tránh phải tạo
 * composite index thủ công trên Firestore Console khi kết hợp nhiều điều
 * kiện lọc cùng lúc (loại + trạng thái + khoảng ngày + khoảng giá trị).
 *
 * @param {(contracts: object[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} hàm hủy lắng nghe (gọi khi rời trang)
 */
export function subscribeContracts(onData, onError) {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => normalizeContract(d.id, d.data()))),
    (err) => {
      console.error("Không thể tải lịch sử hợp đồng:", err);
      onError?.(err);
    }
  );
}