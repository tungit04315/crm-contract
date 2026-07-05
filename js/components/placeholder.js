// ==========================================================================
// COMPONENTS/PLACEHOLDER.JS — Markup dùng chung cho các view đơn giản
// chưa triển khai đầy đủ tính năng (stub), tránh lặp code ở nhiều view.
// ==========================================================================

/**
 * @param {{ title: string, description: string, iconSvg: string }} opts
 * @returns {string} HTML string
 */
export function placeholderMarkup({ title, description, iconSvg }) {
  return `
    <div class="placeholder-panel">
      <div class="placeholder-panel__icon">${iconSvg}</div>
      <h2>${title}</h2>
      <p>${description}</p>
    </div>
  `;
}
