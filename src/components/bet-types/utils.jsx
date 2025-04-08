// Utility functions
export const formatRegionName = (region) => {
  const regionMap = {
    north: 'Miền Bắc',
    central: 'Miền Trung',
    south: 'Miền Nam',
  };
  return regionMap[region] || region;
};

export const getBetTypeDescription = (betType) => {
  const descriptions = {
    'Đầu Đuôi':
      'Đánh vào 2 chữ số cuối của các lô ở đầu (giải 8/7) và đuôi (giải đặc biệt).',
    'Xỉu chủ': 'Đánh vào 3 chữ số cuối của các lô ở giải 7/6 và giải đặc biệt.',
    Đầu: 'Đánh vào 2 hoặc 3 chữ số cuối của các lô ở giải 8/7 (2 số) hoặc giải 7/6 (3 số).',
    Đuôi: 'Đánh vào 2 hoặc 3 chữ số cuối của giải đặc biệt.',
    'Bao Lô': 'Đánh vào 2, 3 hoặc 4 chữ số cuối của tất cả các lô.',
    'Đảo Bao Lô': 'Tương tự Bao Lô nhưng tính cả hoán vị của các số.',
    'Bao Lô 7':
      'Đánh vào 2 chữ số cuối của 7 lô ở các giải 8, 7, 6, 5 và đặc biệt (chỉ miền Nam/Trung).',
    'Bao Lô 8':
      'Đánh vào 2 chữ số cuối của 8 lô ở các giải 7, 6 và đặc biệt (chỉ miền Bắc).',
    'Bao Lô 7 Đảo': 'Tương tự Bao Lô 7 nhưng tính cả hoán vị.',
    'Bao Lô 8 Đảo': 'Tương tự Bao Lô 8 nhưng tính cả hoán vị.',
    Đá: 'Đánh vào việc ít nhất 2 số trùng với 2 chữ số cuối của các lô.',
    'Đảo Xỉu Chủ':
      'Đánh vào hoán vị của 3 chữ số cuối của các lô ở giải 7/6 và giải đặc biệt.',
    'Đảo Xỉu Chủ Đầu':
      'Đánh vào hoán vị của 3 chữ số cuối của các lô ở giải 7/6.',
    'Đảo Xỉu Chủ Đuôi': 'Đánh vào hoán vị của 3 chữ số cuối của giải đặc biệt.',
    'Nhất To': 'Đánh vào 2, 3 hoặc 4 chữ số cuối của giải nhất (chỉ miền Bắc).',
  };

  return descriptions[betType.name] || 'Không có mô tả.';
};

export const getBetTypeExample = (betType) => {
  const examples = {
    'Đầu Đuôi': 'Ví dụ: 45dd10 - Đánh số 45 kiểu đầu đuôi với 10.000đ',
    'Xỉu chủ': 'Ví dụ: 123xc5 - Đánh số 123 kiểu xỉu chủ với 5.000đ',
    Đầu: 'Ví dụ: 45dau10 - Đánh số 45 kiểu đầu với 10.000đ',
    Đuôi: 'Ví dụ: 45duoi10 - Đánh số 45 kiểu đuôi với 10.000đ',
    'Bao Lô': 'Ví dụ: 45b10 - Đánh số 45 kiểu bao lô với 10.000đ',
    'Đảo Bao Lô': 'Ví dụ: 45daob10 - Đánh số 45 và 54 kiểu bao lô với 10.000đ',
    'Bao Lô 7': 'Ví dụ: 45b7l10 - Đánh số 45 kiểu bao lô 7 với 10.000đ',
    'Bao Lô 8': 'Ví dụ: 45b8l10 - Đánh số 45 kiểu bao lô 8 với 10.000đ',
    'Bao Lô 7 Đảo':
      'Ví dụ: 45b7ld10 - Đánh số 45 và 54 kiểu bao lô 7 với 10.000đ',
    'Bao Lô 8 Đảo':
      'Ví dụ: 45b8ld10 - Đánh số 45 và 54 kiểu bao lô 8 với 10.000đ',
    Đá: 'Ví dụ: 45.67.89da10 - Đánh đá các cặp số 45-67, 45-89, 67-89 với 10.000đ',
    'Đảo Xỉu Chủ':
      'Ví dụ: 123dxc10 - Đánh tất cả hoán vị của 123 kiểu xỉu chủ với 10.000đ',
    'Đảo Xỉu Chủ Đầu':
      'Ví dụ: 123dxcdau10 - Đánh tất cả hoán vị của 123 ở đầu với 10.000đ',
    'Đảo Xỉu Chủ Đuôi':
      'Ví dụ: 123dxcduoi10 - Đánh tất cả hoán vị của 123 ở đuôi với 10.000đ',
    'Nhất To': 'Ví dụ: 45nt10 - Đánh số 45 kiểu nhất to với 10.000đ',
  };

  return examples[betType.name] || 'Không có ví dụ.';
};

// Mapping tên tỷ lệ tiếng Anh sang tiếng Việt
export const getPayoutRateLabel = (key) => {
  const payoutRateMap = {
    // Số chữ số
    '2 digits': '2 chữ số',
    '3 digits': '3 chữ số',
    '4 digits': '4 chữ số',

    // Các loại đá
    bridgeNorth: 'Đá Miền Bắc',
    bridgeOneStation: 'Đá 1 đài',
    bridgeTwoStations: 'Đá 2 đài',

    // Các miền
    north: 'Miền Bắc',
    central: 'Miền Trung',
    south: 'Miền Nam',
  };

  return payoutRateMap[key] || key;
};
