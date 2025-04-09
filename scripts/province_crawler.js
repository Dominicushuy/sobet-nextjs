// tinh_theo_ngay.js - Lấy danh sách tỉnh thành theo ngày từ trang minhngoc

const axios = require('axios');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

// Cấu hình
const CONFIG = {
  // Có thể dễ dàng mở rộng sau này
  mien: ['mien-bac', 'mien-trung', 'mien-nam'],
  ngay: ['thu-hai', 'thu-ba', 'thu-tu', 'thu-nam', 'thu-sau', 'thu-bay', 'chu-nhat'],
  baseUrl: 'https://www.minhngoc.net.vn/ket-qua-xo-so',
  outputFile: 'data/danh_sach_tinh_theo_ngay.json',
  delayBetweenRequests: 1000, // ms
  maxRetries: 3,
};

// Chỉ lấy một số miền và ngày để kiểm thử
const DEBUG = {
  enable: false,
  mien: ['mien-bac'],
  ngay: ['thu-hai', 'thu-ba'],
};

/**
 * Tạo thời gian chờ giữa các request
 * @param {number} ms - Thời gian chờ tính bằng milliseconds
 * @returns {Promise} Promise sẽ được resolve sau khoảng thời gian chờ
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lấy HTML từ URL với cơ chế thử lại
 * @param {string} url - URL cần lấy dữ liệu
 * @param {number} retries - Số lần thử lại tối đa
 * @returns {Promise<string>} HTML content
 */
async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Thử lại (${CONFIG.maxRetries - retries + 1}/${CONFIG.maxRetries}): ${url}`);
    await delay(CONFIG.delayBetweenRequests);
    return fetchWithRetry(url, retries - 1);
  }
}

/**
 * Tạo chuỗi ngày chuẩn từ dữ liệu thô
 * @param {string} rawDate - Chuỗi ngày thô (VD: "17/03/2025")
 * @returns {string} Chuỗi ngày định dạng chuẩn (VD: "2025-03-17")
 */
function formatDate(rawDate) {
  if (!rawDate) return '';
  const parts = rawDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return rawDate;
}

/**
 * Trích xuất dữ liệu xổ số miền Bắc
 * @param {Element} boxKqxs - Element chứa kết quả xổ số miền Bắc
 * @returns {Object} Dữ liệu xổ số đã được cấu trúc
 */
function extractMienBacData(boxKqxs) {
  // Lấy thông tin tỉnh thành từ tiêu đề
  const titleElement = boxKqxs.querySelector('.title');
  let tenTinh = '';

  if (titleElement) {
    const tinhLink = titleElement.querySelector('a:first-child');
    if (tinhLink) {
      const tinhText = tinhLink.textContent;
      tenTinh = tinhText.replace('KẾT QUẢ XỔ SỐ', '').trim();
    }
  }

  // Lấy thông tin ngày
  const ngayElement = boxKqxs.querySelector('.ngay a');
  const rawDate = ngayElement ? ngayElement.textContent.trim() : '';
  const ngay = formatDate(rawDate);

  // Lấy thông tin thứ
  const thuElement = boxKqxs.querySelector('.thu a');
  const thu = thuElement ? thuElement.textContent.trim() : '';

  return {
    tinh: tenTinh || 'Xổ số Miền Bắc',
    ngay,
    thu,
  };
}

/**
 * Trích xuất dữ liệu xổ số miền Nam, Trung
 * @param {Element} table - Element chứa kết quả xổ số
 * @returns {Object} Dữ liệu xổ số đã được cấu trúc
 */
function extractMienNamTrungData(table) {
  // Lấy thông tin ngày và thứ
  const thuElement = table.querySelector('.thu a');
  const thu = thuElement ? thuElement.textContent.trim() : '';

  const ngayElement = table.querySelector('.ngay a');
  const rawDate = ngayElement ? ngayElement.textContent.trim() : '';
  const ngay = formatDate(rawDate);

  // Xử lý cho miền Nam và miền Trung
  const provinceTableNodes = table.querySelectorAll('table.rightcl');
  const danhSachTinh = [];

  provinceTableNodes.forEach((provinceTable) => {
    const tenTinh = provinceTable.querySelector('.tinh a')?.textContent.trim() || '';
    const maTinh = provinceTable.querySelector('.matinh')?.textContent.trim() || '';

    danhSachTinh.push({
      tinh: tenTinh,
      maTinh,
    });
  });

  return {
    ngay,
    thu,
    cacTinh: danhSachTinh,
  };
}

/**
 * Lấy dữ liệu xổ số cho một ngày và miền cụ thể
 * @param {string} mien - Tên miền (mien-bac, mien-trung, mien-nam)
 * @param {string} ngay - Tên ngày (thu-hai, thu-ba, ...)
 * @returns {Promise<Object>} Dữ liệu xổ số
 */
async function layDuLieuNgay(mien, ngay) {
  try {
    console.log(`Đang lấy dữ liệu ${mien} - ${ngay}...`);
    const url = `${CONFIG.baseUrl}/${mien}/${ngay}.html`;

    // Lấy HTML từ trang web
    const html = await fetchWithRetry(url);

    // Phân tích HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;

    if (mien === 'mien-bac') {
      // Xử lý riêng cho miền Bắc
      const boxKqxs = document.querySelector('.box_kqxs');
      if (!boxKqxs) {
        console.log(`Không tìm thấy kết quả xổ số cho ${mien} - ${ngay}`);
        return null;
      }
      return extractMienBacData(boxKqxs);
    } else {
      // Xử lý cho miền Nam và miền Trung
      const targetTable = document.querySelector('table.bkqmiennam');
      if (!targetTable) {
        console.log(`Không tìm thấy bảng kết quả xổ số cho ${mien} - ${ngay}`);
        return null;
      }
      return extractMienNamTrungData(targetTable);
    }
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu ${mien} - ${ngay}:`, error.message);
    return null;
  }
}

/**
 * Lấy danh sách tỉnh thành theo ngày từ trang minhngoc
 */
async function layDanhSachTinhTheongay() {
  try {
    console.log('Bắt đầu lấy danh sách tỉnh thành theo ngày...');

    // Lấy danh sách miền và ngày từ cấu hình debug hoặc cấu hình chính
    const danhSachMien = DEBUG.enable ? DEBUG.mien : CONFIG.mien;
    const danhSachNgay = DEBUG.enable ? DEBUG.ngay : CONFIG.ngay;

    // Cấu trúc dữ liệu kết quả
    const danhSachTinh = {
      metadata: {
        version: '1.0',
        nguon: CONFIG.baseUrl,
        ngayLayDuLieu: new Date().toISOString(),
        tongSoMien: danhSachMien.length,
        tongSoNgay: danhSachNgay.length,
      },
      duLieu: {},
    };

    // Duyệt qua từng ngày
    for (const ngay of danhSachNgay) {
      danhSachTinh.duLieu[ngay] = {};

      // Duyệt qua từng miền
      for (const mien of danhSachMien) {
        console.log(`Đang lấy danh sách tỉnh: ${mien} - ${ngay}...`);

        // Lấy dữ liệu
        const duLieu = await layDuLieuNgay(mien, ngay);

        // Trích xuất danh sách tỉnh dựa trên miền
        let danhSachTinhTheoMien = [];

        if (duLieu) {
          if (mien === 'mien-bac') {
            // Miền Bắc chỉ có một tỉnh
            danhSachTinhTheoMien.push({
              tinh: duLieu.tinh || 'Xổ số Miền Bắc',
              ngay: duLieu.ngay,
              thu: duLieu.thu,
              mien: 'mien-bac',
            });
          } else {
            // Miền Trung và Miền Nam có nhiều tỉnh
            if (duLieu.cacTinh && Array.isArray(duLieu.cacTinh)) {
              danhSachTinhTheoMien = duLieu.cacTinh.map((tinhData) => ({
                tinh: tinhData.tinh,
                maTinh: tinhData.maTinh,
                ngay: duLieu.ngay,
                thu: duLieu.thu,
                mien: mien,
              }));
            }
          }
        }

        danhSachTinh.duLieu[ngay][mien] = danhSachTinhTheoMien;

        // Đợi giữa các request
        await delay(CONFIG.delayBetweenRequests);
      }
    }

    // Tạo thư mục output nếu chưa tồn tại
    const outputDir = path.dirname(CONFIG.outputFile);
    if (outputDir !== '.' && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Lưu dữ liệu vào file JSON
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(danhSachTinh, null, 2));

    console.log(`Đã lưu danh sách tỉnh thành vào file ${CONFIG.outputFile}`);
    return danhSachTinh;
  } catch (error) {
    console.error('Đã xảy ra lỗi khi lấy danh sách tỉnh thành:', error.message);
    throw error;
  }
}

// Gọi hàm chính để lấy danh sách tỉnh theo ngày
layDanhSachTinhTheongay().catch((error) => {
  console.error('Lỗi khi lấy danh sách tỉnh theo ngày:', error);
  process.exit(1);
});
