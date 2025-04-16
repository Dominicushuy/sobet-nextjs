// src/utils/bet.js

/**
 * Tính số lượng hoán vị của một số (không tính trùng lặp)
 * @param {string} number - Số cần tính hoán vị
 * @returns {number} Số lượng hoán vị
 */
export function calculatePermutationCount(number) {
  if (!number) return 1;

  // Đếm số lượng mỗi chữ số
  const digitCounts = {};
  for (let i = 0; i < number.length; i++) {
    const digit = number[i];
    digitCounts[digit] = (digitCounts[digit] || 0) + 1;
  }

  // Tính giai thừa của độ dài số
  let factorial = 1;
  for (let i = 2; i <= number.length; i++) {
    factorial *= i;
  }

  // Chia cho giai thừa của số lần xuất hiện của mỗi chữ số
  for (const digit in digitCounts) {
    let digitFactorial = 1;
    for (let i = 2; i <= digitCounts[digit]; i++) {
      digitFactorial *= i;
    }
    factorial /= digitFactorial;
  }

  return factorial;
}

/**
 * Tạo tất cả các hoán vị có thể có của một số
 * @param {string} number - Số cần tạo hoán vị
 * @returns {string[]} Mảng các hoán vị
 */
export function generatePermutations(number) {
  if (!number || number.length <= 1) return [number];

  const uniquePerms = new Set();

  // Sử dụng thuật toán Heap để tạo hoán vị
  function heapPermutation(a, size) {
    // Nếu size là 1, hoán vị hoàn tất
    if (size === 1) {
      uniquePerms.add(a.join(''));
      return;
    }

    for (let i = 0; i < size; i++) {
      heapPermutation(a, size - 1);

      // Nếu size là số lẻ, đổi phần tử 0 và size-1
      // Nếu size là số chẵn, đổi phần tử i và size-1
      const j = size % 2 === 0 ? i : 0;
      const temp = a[j];
      a[j] = a[size - 1];
      a[size - 1] = temp;
    }
  }

  const digits = number.split('');
  heapPermutation([...digits], digits.length);

  return Array.from(uniquePerms);
}

/**
 * Lấy ngày xổ số dự kiến
 * @param {boolean} isSaveBet - Chế độ lưu cược (true nếu trong DEV_MODE)
 * @returns {string} Ngày xổ số dưới dạng chuỗi ISO (YYYY-MM-DD)
 */
export function getDrawDate(isSaveBet = false) {
  // Kiểm tra chế độ DEV_MODE từ biến môi trường
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && isSaveBet) {
    // Trong DEV_MODE, trả về ngày hôm qua
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Logic tiêu chuẩn cho chế độ production
  const now = new Date();
  const drawDate = new Date(now);

  // Nếu sau 16:00 (4 PM), ngày xổ số là ngày mai
  if (now.getHours() >= 16) {
    drawDate.setDate(drawDate.getDate() + 1);
  }

  // Định dạng ngày dưới dạng chuỗi ISO (YYYY-MM-DD)
  return drawDate.toISOString().split('T')[0];
}
