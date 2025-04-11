// src/utils
import { BET_CONFIG } from '@/config/data';

/**
 * Determine if a bet type is a permutation type
 * @param {string} betTypeAlias - Bet type alias
 * @returns {boolean} True if it's a permutation type
 */
export function isPermutationType(betTypeAlias) {
  if (!betTypeAlias) return false;

  // Sử dụng BET_CONFIG để xác định các kiểu cược permutation
  const betType = BET_CONFIG.betTypes.find((bt) =>
    bt.aliases.some(
      (alias) => alias.toLowerCase() === betTypeAlias.toLowerCase()
    )
  );

  return betType && betType.is_permutation;
}

/**
 * Get all permutations for an array of numbers
 * @param {string[]} numbers - Array of numbers
 * @returns {Object} Map of original numbers to their permutations
 */
export function getAllPermutations(numbers) {
  const permutationsMap = {};

  for (const number of numbers) {
    permutationsMap[number] = generatePermutations(number);
  }

  return permutationsMap;
}

/**
 * Get total count of all unique permutations
 * @param {string[]} numbers - Array of numbers
 * @returns {number} Total permutation count
 */
export function getTotalPermutationsCount(numbers) {
  const allPermutations = new Set();

  for (const number of numbers) {
    const perms = generatePermutations(number);
    perms.forEach((p) => allPermutations.add(p));
  }

  return allPermutations.size;
}

/**
 * Format permutations as a display string
 * @param {string[]} permutations - Array of permutations
 * @returns {string} Formatted string
 */
export function formatPermutationsDisplay(permutations) {
  if (!permutations || permutations.length <= 1) return '';
  return permutations.slice(1).join(', ');
}

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
