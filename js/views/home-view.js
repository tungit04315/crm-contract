// ==========================================================================
// VIEWS/HOME-VIEW.JS — Trang "Trang chủ" (dashboard tổng quan)
// Đây là ví dụ mẫu cho cấu trúc 1 view: tự chứa markup + hành vi riêng,
// không đụng tới sidebar/topbar (đã được app.js cập nhật tiêu đề sẵn).
//
// Dữ liệu thống kê/biểu đồ hiện là dữ liệu tĩnh minh họa (giữ nguyên như
// bản gốc). Khi nối API/Firestore thật, chỉ cần thay hàm buildHomeHtml()
// hoặc thêm bước fetch trước khi gán innerHTML bên dưới.
// ==========================================================================

/**
 * @param {HTMLElement} container - #main-content, vùng động duy nhất
 * @param {{ user: object }} ctx
 * @returns {void} view này không cần dọn dẹp (không có subscription/listener)
 */
export function render(container, { user }) {
  const displayName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Người dùng");

  container.innerHTML = buildHomeHtml(displayName);

  const fab = container.querySelector(".fab");
  fab?.addEventListener("click", () => {
    window.location.hash = "#contract/web";
  });
}

function buildHomeHtml(displayName) {
  return `
        <!-- Banner -->
        <section class="banner">
          <div class="banner__text">
            <p class="hello">Chào mừng trở lại,</p>
            <h2>${displayName} \u{1F44B}</h2>
            <p class="sub">Dưới đây là tổng quan hoạt động hệ thống của bạn.</p>
          </div>
          <div class="banner__art">
            <svg width="190" height="150" viewBox="0 0 190 150" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="95" cy="130" rx="80" ry="10" fill="#DCE6FB" />
              <rect x="82" y="34" width="66" height="82" rx="8" fill="#fff" stroke="#C9D8F5" stroke-width="1.5"
                transform="rotate(6 82 34)" />
              <rect x="70" y="26" width="66" height="82" rx="8" fill="#EFF5FF" stroke="#BFD2F5" stroke-width="1.5" />
              <rect x="82" y="42" width="42" height="5" rx="2.5" fill="#93B4EF" />
              <rect x="82" y="54" width="34" height="5" rx="2.5" fill="#C7D8F7" />
              <rect x="82" y="66" width="38" height="5" rx="2.5" fill="#C7D8F7" />
              <circle cx="46" cy="60" r="34" fill="#2563EB" opacity="0.12" />
              <path d="M46 34c9 3 17 3 17 3v22c0 15-9 22-17 26-8-4-17-11-17-26V37s8 0 17-3Z" fill="#2563EB" />
              <path d="M37 57l6 6 12-13" stroke="#fff" stroke-width="3.4" stroke-linecap="round"
                stroke-linejoin="round" />
              <rect x="120" y="90" width="46" height="8" rx="4" fill="#2563EB" transform="rotate(-18 120 90)" />
              <circle cx="164" cy="82" r="5" fill="#F59E0B" />
            </svg>
          </div>
        </section>

        <!-- Stat cards -->
        <section class="stat-grid">
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--blue">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor"
                  stroke-width="1.7" />
                <path d="M14 3v5h5" stroke="currentColor" stroke-width="1.7" />
              </svg>
            </div>
            <div class="stat-card__row">
              <span class="stat-card__value">128</span>
              <span class="stat-card__trend stat-card__trend--up">↑ 12.5%</span>
            </div>
            <div class="stat-card__label">Tổng hợp đồng</div>
            <div class="stat-card__note">So với tháng trước</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--green">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor"
                  stroke-width="1.7" />
                <path d="M14 3v5h5M9 13h4M9 17h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </div>
            <div class="stat-card__row">
              <span class="stat-card__value">68</span>
              <span class="stat-card__trend stat-card__trend--up">↑ 8.3%</span>
            </div>
            <div class="stat-card__label">Hợp đồng đang thực hiện</div>
            <div class="stat-card__note">So với tháng trước</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--orange">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" stroke="currentColor" stroke-width="1.7" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </div>
            <div class="stat-card__row">
              <span class="stat-card__value">45</span>
              <span class="stat-card__trend stat-card__trend--up">↑ 15.7%</span>
            </div>
            <div class="stat-card__label">Hợp đồng đã hoàn thành</div>
            <div class="stat-card__note">So với tháng trước</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--violet">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.7" />
                <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </div>
            <div class="stat-card__row">
              <span class="stat-card__value">15</span>
              <span class="stat-card__trend stat-card__trend--warn">↑ 5.1%</span>
            </div>
            <div class="stat-card__label">Hợp đồng sắp hết hạn</div>
            <div class="stat-card__note">Cần xử lý sớm</div>
          </div>
        </section>

        <!-- Row 2: revenue / recent contracts / upcoming tasks -->
        <section class="row-2">

          <div class="panel">
            <div class="panel__head">
              <span class="panel__title">Tổng quan doanh thu</span>
              <span class="revenue__legend" style="margin-left:16px;"><span class="dot dot--blue"></span>Doanh thu
                (VNĐ)</span>
              <span class="select-chip" style="margin-left:auto;">6 tháng
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </span>
            </div>
            <div class="revenue__figure">
              <span class="revenue__amount">1.250.450.000 VNĐ</span>
              <span class="revenue__delta">↑ 18.6% <span>so với 6 tháng trước</span></span>
            </div>
            <div class="chart-wrap">
              <svg viewBox="0 0 620 260" width="100%" height="260" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <!-- gridlines -->
                <g stroke="#EEF1F6" stroke-width="1">
                  <line x1="46" y1="20" x2="610" y2="20" />
                  <line x1="46" y1="76" x2="610" y2="76" />
                  <line x1="46" y1="132" x2="610" y2="132" />
                  <line x1="46" y1="188" x2="610" y2="188" />
                </g>
                <!-- y labels -->
                <g font-size="11" fill="#94A3B8" font-family="'Be Vietnam Pro',sans-serif" font-weight="600">
                  <text x="0" y="24">600M</text>
                  <text x="0" y="80">400M</text>
                  <text x="0" y="136">200M</text>
                  <text x="20" y="192">0</text>
                </g>
                <!-- area + line -->
                <path d="M60,168 L165,120 L270,96 L375,140 L480,128 L585,58 L585,188 L60,188 Z" fill="url(#areaFill)" />
                <path d="M60,168 L165,120 L270,96 L375,140 L480,128 L585,58" fill="none" stroke="#2563EB"
                  stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
                <g fill="#2563EB">
                  <circle cx="60" cy="168" r="4.5" stroke="#fff" stroke-width="2" />
                  <circle cx="165" cy="120" r="4.5" stroke="#fff" stroke-width="2" />
                  <circle cx="270" cy="96" r="4.5" stroke="#fff" stroke-width="2" />
                  <circle cx="375" cy="140" r="4.5" stroke="#fff" stroke-width="2" />
                  <circle cx="480" cy="128" r="4.5" stroke="#fff" stroke-width="2" />
                  <circle cx="585" cy="58" r="5.5" stroke="#fff" stroke-width="2.4" />
                </g>
                <!-- x labels -->
                <g font-size="11.5" fill="#64748B" font-family="'Be Vietnam Pro',sans-serif" font-weight="600">
                  <text x="48" y="212">Tho1</text>
                  <text x="152" y="212">Tho2</text>
                  <text x="258" y="212">Tho3</text>
                  <text x="362" y="212">Tho4</text>
                  <text x="467" y="212">Tho5</text>
                  <text x="572" y="212">Tho6</text>
                </g>
              </svg>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head">
              <span class="panel__title">Hợp đồng gần đây</span>
              <a href="#" class="panel__link">Xem tất cả</a>
            </div>
            <div class="list-row">
              <div class="doc-icon doc-icon--web">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" />
                  <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="list-row__body">
                <div class="list-row__top">
                  <span class="list-row__code">HĐTK-WEB-2026-0012</span>
                  <span class="status-pill status-pill--progress">Đang thực hiện</span>
                </div>
                <div class="list-row__meta">Công ty TNHH ABC</div>
                <div class="list-row__date">20/06/2026</div>
              </div>
            </div>
            <div class="list-row">
              <div class="doc-icon doc-icon--seo">SEO</div>
              <div class="list-row__body">
                <div class="list-row__top">
                  <span class="list-row__code">HĐSEO-2026-0011</span>
                  <span class="status-pill status-pill--pending">Chờ ký</span>
                </div>
                <div class="list-row__meta">Công ty Cổ phần XYZ</div>
                <div class="list-row__date">19/06/2026</div>
              </div>
            </div>
            <div class="list-row">
              <div class="doc-icon doc-icon--web">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" />
                  <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="list-row__body">
                <div class="list-row__top">
                  <span class="list-row__code">HĐTK-WEB-2026-0010</span>
                  <span class="status-pill status-pill--done">Đã hoàn thành</span>
                </div>
                <div class="list-row__meta">Công ty TNHH DEF</div>
                <div class="list-row__date">18/06/2026</div>
              </div>
            </div>
            <div class="list-row">
              <div class="doc-icon doc-icon--seo">SEO</div>
              <div class="list-row__body">
                <div class="list-row__top">
                  <span class="list-row__code">HĐSEO-2026-0009</span>
                  <span class="status-pill status-pill--expiring">Sắp hết hạn</span>
                </div>
                <div class="list-row__meta">Công ty Cổ phần GHI</div>
                <div class="list-row__date">16/06/2026</div>
              </div>
            </div>
            <div class="list-row">
              <div class="doc-icon doc-icon--web">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" />
                  <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </div>
              <div class="list-row__body">
                <div class="list-row__top">
                  <span class="list-row__code">HĐTK-WEB-2026-0008</span>
                  <span class="status-pill status-pill--progress">Đang thực hiện</span>
                </div>
                <div class="list-row__meta">Công ty TNHH JKL</div>
                <div class="list-row__date">15/06/2026</div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head">
              <span class="panel__title">Công việc sắp tới</span>
              <a href="#" class="panel__link">Xem tất cả</a>
            </div>
            <div class="task-row">
              <div class="task-date"><span class="task-date__day">20</span><span class="task-date__month">Th06</span>
              </div>
              <div style="flex:1;">
                <div class="task-row__title">Ký hợp đồng với Công ty TNHH ABC</div>
                <div class="task-row__time"><span class="dot" style="background:#3B82F6;"></span>09:00 AM</div>
              </div>
            </div>
            <div class="task-row">
              <div class="task-date"><span class="task-date__day">21</span><span class="task-date__month">Th06</span>
              </div>
              <div style="flex:1;">
                <div class="task-row__title">Gửi báo giá dịch vụ SEO cho Công ty XYZ</div>
                <div class="task-row__time"><span class="dot" style="background:#8B5CF6;"></span>10:30 AM</div>
              </div>
            </div>
            <div class="task-row">
              <div class="task-date"><span class="task-date__day">22</span><span class="task-date__month">Th06</span>
              </div>
              <div style="flex:1;">
                <div class="task-row__title">Nghiệm thu hợp đồng HĐTK-WEB-2026-0010</div>
                <div class="task-row__time"><span class="dot" style="background:#F59E0B;"></span>02:00 PM</div>
              </div>
            </div>
            <div class="task-row">
              <div class="task-date"><span class="task-date__day">24</span><span class="task-date__month">Th06</span>
              </div>
              <div style="flex:1;">
                <div class="task-row__title">Bàn giao website cho Công ty DEF</div>
                <div class="task-row__time"><span class="dot" style="background:#22C55E;"></span>11:00 AM</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Row 3: donuts / activity -->
        <section class="row-3">

          <div class="panel donut-panel">
            <div>
              <div class="panel__title" style="margin-bottom:18px;">Tình trạng hợp đồng</div>
              <svg width="150" height="150" viewBox="0 0 150 150">
                <g transform="translate(75,75) rotate(-90)">
                  <circle r="60" fill="none" stroke="#F1F4F9" stroke-width="22" />
                  <circle r="60" fill="none" stroke="#3B82F6" stroke-width="22" stroke-dasharray="169.9 207.1"
                    stroke-dashoffset="0" />
                  <circle r="60" fill="none" stroke="#22C55E" stroke-width="22" stroke-dasharray="112.4 264.6"
                    stroke-dashoffset="-169.9" />
                  <circle r="60" fill="none" stroke="#F59E0B" stroke-width="22" stroke-dasharray="49.9 327.1"
                    stroke-dashoffset="-282.3" />
                  <circle r="60" fill="none" stroke="#EF4444" stroke-width="22" stroke-dasharray="37.4 339.6"
                    stroke-dashoffset="-332.2" />
                  <circle r="60" fill="none" stroke="#8B5CF6" stroke-width="22" stroke-dasharray="7.5 369.5"
                    stroke-dashoffset="-369.6" />
                </g>
                <text x="75" y="71" text-anchor="middle" font-size="24" font-weight="800" fill="#0F172A"
                  font-family="'Be Vietnam Pro',sans-serif">128</text>
                <text x="75" y="90" text-anchor="middle" font-size="12" fill="#94A3B8" font-weight="600"
                  font-family="'Be Vietnam Pro',sans-serif">Tổng</text>
              </svg>
            </div>
            <div class="donut-legend">
              <div class="legend-item"><span class="dot" style="background:#3B82F6;"></span>
                <div><span class="legend-item__value">68</span><span class="legend-item__label">Đang thực hiện <span
                      class="legend-item__pct">(53.1%)</span></span></div>
              </div>
              <div class="legend-item"><span class="dot" style="background:#EF4444;"></span>
                <div><span class="legend-item__value">15</span><span class="legend-item__label">Sắp hết hạn <span
                      class="legend-item__pct">(11.7%)</span></span></div>
              </div>
              <div class="legend-item"><span class="dot" style="background:#F59E0B;"></span>
                <div><span class="legend-item__value">20</span><span class="legend-item__label">Chờ ký <span
                      class="legend-item__pct">(15.6%)</span></span></div>
              </div>
              <div class="legend-item"><span class="dot" style="background:#8B5CF6;"></span>
                <div><span class="legend-item__value">3</span><span class="legend-item__label">Đã hủy <span
                      class="legend-item__pct">(2.3%)</span></span></div>
              </div>
              <div class="legend-item"><span class="dot" style="background:#22C55E;"></span>
                <div><span class="legend-item__value">45</span><span class="legend-item__label">Đã hoàn thành <span
                      class="legend-item__pct">(35.2%)</span></span></div>
              </div>
            </div>
          </div>

          <div class="panel donut-panel">
            <div>
              <div class="panel__title" style="margin-bottom:18px;">Thống kê theo loại hợp đồng</div>
              <svg width="150" height="150" viewBox="0 0 150 150">
                <g transform="translate(75,75) rotate(-90)">
                  <circle r="60" fill="none" stroke="#F1F4F9" stroke-width="22" />
                  <circle r="60" fill="none" stroke="#8B5CF6" stroke-width="22" stroke-dasharray="141.3 235.7"
                    stroke-dashoffset="0" />
                  <circle r="60" fill="none" stroke="#2563EB" stroke-width="22" stroke-dasharray="235.7 141.3"
                    stroke-dashoffset="-141.3" />
                </g>
              </svg>
            </div>
            <div class="donut-legend donut-legend--single">
              <div class="legend-item"><span class="dot" style="background:#2563EB;"></span>
                <div><span class="legend-item__value">80</span><span class="legend-item__label">Hợp đồng Web <span
                      class="legend-item__pct">(62.5%)</span></span></div>
              </div>
              <div class="legend-item"><span class="dot" style="background:#8B5CF6;"></span>
                <div><span class="legend-item__value">48</span><span class="legend-item__label">Hợp đồng SEO <span
                      class="legend-item__pct">(37.5%)</span></span></div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__title" style="margin-bottom:16px;">Hoạt động gần đây</div>
            <div class="activity-row">
              <div class="activity-icon"><img src="https://i.pravatar.cc/80?img=13" alt=""></div>
              <div class="activity-row__body">
                <div class="activity-row__title">Bạn đã tạo hợp đồng mới</div>
                <div class="activity-row__sub">HĐTK-WEB-2026-0012</div>
              </div>
              <div class="activity-row__time">10 phút trước</div>
            </div>
            <div class="activity-row">
              <div class="activity-icon activity-icon--doc">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor"
                    stroke-width="1.8" />
                  <path d="M14 3v5h5" stroke="currentColor" stroke-width="1.8" />
                </svg>
              </div>
              <div class="activity-row__body">
                <div class="activity-row__title">Hợp đồng HĐSEO-2026-0011</div>
                <div class="activity-row__sub">đã được cập nhật</div>
              </div>
              <div class="activity-row__time">1 giờ trước</div>
            </div>
            <div class="activity-row">
              <div class="activity-icon activity-icon--check">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" stroke="currentColor" stroke-width="1.8" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </div>
              <div class="activity-row__body">
                <div class="activity-row__title">Hợp đồng HĐTK-WEB-2026-0010</div>
                <div class="activity-row__sub">đã được nghiệm thu</div>
              </div>
              <div class="activity-row__time">3 giờ trước</div>
            </div>
            <div class="activity-row">
              <div class="activity-icon activity-icon--user">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8" />
                  <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" />
                </svg>
              </div>
              <div class="activity-row__body">
                <div class="activity-row__title">Bạn đã đăng nhập hệ thống</div>
                <div class="activity-row__sub">Hôm nay, 08:30 AM</div>
              </div>
            </div>
          </div>

        </section>

    <button class="fab" aria-label="Tạo mới">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
      </svg>
    </button>
  `;
}
