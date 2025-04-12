// src/utils/formatters.js

/**
 * Định dạng số thành chuỗi tiền tệ
 * @param {number} value - Giá trị cần định dạng
 * @param {boolean} useCommaDecimal - Sử dụng dấu phẩy làm dấu thập phân
 * @param {number} decimals - Số chữ số thập phân
 * @returns {string} Chuỗi tiền tệ đã định dạng
 */
export function formatMoney(value, useCommaDecimal = false, decimals = 0) {
  if (value === null || value === undefined) return '0';

  // Làm tròn số
  const roundedValue = roundToDecimals(value, decimals);

  // Chuyển đổi thành định dạng hiển thị
  if (useCommaDecimal) {
    // Định dạng Châu Âu: 1.000,50
    return roundedValue
      .toFixed(decimals)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else {
    // Định dạng Mỹ/UK: 1,000.50
    return roundedValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

/**
 * Làm tròn số đến số chữ số thập phân cụ thể
 * @param {number} value - Giá trị cần làm tròn
 * @param {number} decimals - Số chữ số thập phân (mặc định: 2)
 * @returns {number} Giá trị đã làm tròn
 */
export function roundToDecimals(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Chuyển đổi định dạng chuỗi tiền thành số
 * @param {string} moneyString - Chuỗi tiền (vd: "1,000.50", "1.000,50")
 * @returns {number} Giá trị số
 */
export function parseMoneyString(moneyString) {
  if (!moneyString) return 0;

  // Xác định định dạng (phẩy làm dấu thập phân hoặc chấm làm dấu thập phân)
  const hasCommaDecimal = /\d,\d{1,2}$/.test(moneyString);

  // Làm sạch chuỗi
  let cleanedString = moneyString.replace(/[^\d,.]/g, '');

  if (hasCommaDecimal) {
    // Định dạng Châu Âu: 1.000,50
    cleanedString = cleanedString.replace(/\./g, ''); // Xóa dấu chấm phân cách hàng nghìn
    cleanedString = cleanedString.replace(',', '.'); // Đổi dấu phẩy thành dấu chấm thập phân
  } else {
    // Định dạng Mỹ/UK: 1,000.50
    cleanedString = cleanedString.replace(/,/g, ''); // Xóa dấu phẩy phân cách hàng nghìn
  }

  return parseFloat(cleanedString) || 0;
}

/**
 * Định dạng ngày giờ thành chuỗi
 * @param {Date} date - Ngày giờ cần định dạng
 * @param {boolean} includeTime - Có hiển thị thời gian không
 * @returns {string} Chuỗi ngày giờ đã định dạng
 */
export function formatDateTime(date, includeTime = true) {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Định dạng phần trăm
 * @param {number} value - Giá trị cần định dạng
 * @param {number} decimals - Số chữ số thập phân
 * @returns {string} Chuỗi phần trăm đã định dạng
 */
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined) return '0%';

  const roundedValue = roundToDecimals(value, decimals);
  return `${roundedValue.toFixed(decimals)}%`;
}

/**
 * Chuyển đổi chuỗi về dạng Camel Case
 * @param {string} str - Chuỗi đầu vào
 * @returns {string} Chuỗi dạng Camel Case
 */
export function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, '');
}

/**
 * Chuyển đổi chuỗi về dạng Title Case (viết hoa chữ cái đầu mỗi từ)
 * @param {string} str - Chuỗi đầu vào
 * @returns {string} Chuỗi dạng Title Case
 */
export function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Rút gọn chuỗi nếu vượt quá độ dài cho phép
 * @param {string} str - Chuỗi đầu vào
 * @param {number} maxLength - Độ dài tối đa
 * @param {string} suffix - Hậu tố (mặc định: "...")
 * @returns {string} Chuỗi đã rút gọn
 */
export function truncateString(str, maxLength, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;

  return str.substring(0, maxLength) + suffix;
}

/**
 * Định dạng số thành chuỗi có phân cách hàng nghìn
 * @param {number} value - Giá trị cần định dạng
 * @param {number} decimals - Số chữ số thập phân
 * @returns {string} Chuỗi đã định dạng
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return '0';

  const roundedValue = roundToDecimals(value, decimals);
  return roundedValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
