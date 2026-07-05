// ==========================================================================
// COMPONENTS/FORM-WIZARD.JS — Điều khiển chung cho form nhiều bước
// (step-by-step wizard): thanh tiến trình, chuyển bước, validate từng bước
// trước khi cho đi tiếp, bước cuối luôn là "Xem trước".
//
// KHÔNG chứa logic riêng của hợp đồng Web/SEO — chỉ là bộ khung UI dùng lại
// được cho bất kỳ form nhiều bước nào trong dự án (giống vai trò của
// components/sidebar.js, components/topbar.js với shell).
//
// Cách dùng: xem views/contract-web-view.js
// ==========================================================================

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root - phần tử chứa toàn bộ wizard (đã có sẵn markup)
 * @param {{ id: string, label: string }[]} opts.steps - danh sách bước (thứ tự hiển thị)
 * @param {(stepId: string) => boolean} opts.validateStep - trả về true nếu bước hợp lệ để đi tiếp
 * @param {(stepId: string, index: number) => void} [opts.onStepEnter] - gọi mỗi khi vào 1 bước (để render preview...)
 * @param {() => void} [opts.onFinish] - gọi khi bấm hoàn tất ở bước cuối
 */
export function createFormWizard({ root, steps, validateStep, onStepEnter, onFinish }) {
  const indicatorEl = root.querySelector("[data-wizard-indicator]");
  const panels = steps.map((s) => root.querySelector(`[data-wizard-panel="${s.id}"]`));
  const prevBtn = root.querySelector("[data-wizard-prev]");
  const nextBtn = root.querySelector("[data-wizard-next]");

  let current = 0;

  function renderIndicator() {
    if (!indicatorEl) return;
    indicatorEl.innerHTML = steps
      .map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return `
          <div class="wizard-step wizard-step--${state}" data-step-index="${i}">
            <span class="wizard-step__dot">${i < current ? "✓" : i + 1}</span>
            <span class="wizard-step__label">${s.label}</span>
          </div>
        `;
      })
      .join(`<span class="wizard-step__line"></span>`);
  }

  function renderPanels() {
    panels.forEach((panel, i) => {
      if (!panel) return;
      panel.classList.toggle("is-active", i === current);
    });
  }

  function renderNav() {
    if (prevBtn) prevBtn.style.visibility = current === 0 ? "hidden" : "visible";
    if (nextBtn) {
      const isLast = current === steps.length - 1;
      nextBtn.textContent = isLast ? "Hoàn tất & Xuất file" : "Tiếp theo";
    }
  }

  function goTo(index) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    renderIndicator();
    renderPanels();
    renderNav();
    onStepEnter?.(steps[current].id, current);
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  prevBtn?.addEventListener("click", () => {
    if (current > 0) goTo(current - 1);
  });

  nextBtn?.addEventListener("click", () => {
    const stepId = steps[current].id;
    if (validateStep && !validateStep(stepId)) return;

    if (current === steps.length - 1) {
      onFinish?.();
      return;
    }
    goTo(current + 1);
  });

  goTo(0);

  return {
    goTo,
    getCurrentStepId: () => steps[current].id,
  };
}