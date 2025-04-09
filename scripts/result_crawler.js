const axios = require("axios");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const path = require("path");

// Cấu hình chi tiết và mở rộng
const CONFIG = {
  // Cấu hình miền
  mien: ["mien-bac", "mien-trung", "mien-nam"],

  // Ngày trong tuần
  ngay: [
    "thu-hai",
    "thu-ba",
    "thu-tu",
    "thu-nam",
    "thu-sau",
    "thu-bay",
    "chu-nhat",
  ],

  baseUrl: "https://www.minhngoc.net.vn/ket-qua-xo-so",
  outputFile: "data/ketqua_xoso.json",
  delayBetweenRequests: 1000, // ms
  maxRetries: 3,
};

// Chỉ lấy một số miền và ngày để kiểm thử
const DEBUG = {
  enable: false,
  mien: ["mien-bac"],
  ngay: ["thu-hai", "thu-ba"],
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
    console.log(
      `Thử lại (${CONFIG.maxRetries - retries + 1}/${
        CONFIG.maxRetries
      }): ${url}`
    );
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
  if (!rawDate) return "";
  const parts = rawDate.split("/");
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
  const titleElement = boxKqxs.querySelector(".title");
  let tenTinh = "";

  if (titleElement) {
    const tinhLink = titleElement.querySelector("a:first-child");
    if (tinhLink) {
      const tinhText = tinhLink.textContent;
      tenTinh = tinhText.replace("KẾT QUẢ XỔ SỐ", "").trim();
    }
  }

  // Lấy thông tin ngày
  const ngayElement = boxKqxs.querySelector(".ngay a");
  const rawDate = ngayElement ? ngayElement.textContent.trim() : "";
  const ngay = formatDate(rawDate);

  // Lấy thông tin thứ
  const thuElement = boxKqxs.querySelector(".thu a");
  const thu = thuElement ? thuElement.textContent.trim() : "";

  // Lấy mã vé số
  const loaiVeElement = boxKqxs.querySelector(".loaive_content");
  const loaiVe = loaiVeElement ? loaiVeElement.textContent.trim() : "";

  // Tìm bảng kết quả xổ số
  const kqTable = boxKqxs.querySelector("table.box_kqxs_content");
  if (!kqTable) {
    console.log("Không tìm thấy bảng kết quả xổ số");
    return null;
  }

  // Trích xuất kết quả các giải
  const ketQua = {
    giaiDacBiet: Array.from(kqTable.querySelectorAll("td.giaidb div")).map(
      (div) => div.textContent.trim()
    ),
    giaiNhat: Array.from(kqTable.querySelectorAll("td.giai1 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiNhi: Array.from(kqTable.querySelectorAll("td.giai2 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiBa: Array.from(kqTable.querySelectorAll("td.giai3 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiTu: Array.from(kqTable.querySelectorAll("td.giai4 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiNam: Array.from(kqTable.querySelectorAll("td.giai5 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiSau: Array.from(kqTable.querySelectorAll("td.giai6 div")).map((div) =>
      div.textContent.trim()
    ),
    giaiBay: Array.from(kqTable.querySelectorAll("td.giai7 div")).map((div) =>
      div.textContent.trim()
    ),
  };

  return {
    tinh: tenTinh,
    ngay,
    thu,
    loaiVe,
    ketQua,
  };
}

/**
 * Trích xuất dữ liệu xổ số miền Nam, Trung
 * @param {Element} table - Element chứa kết quả xổ số
 * @returns {Object} Dữ liệu xổ số đã được cấu trúc
 */
function extractMienNamTrungData(table) {
  // Lấy thông tin ngày và thứ
  const thuElement = table.querySelector(".thu a");
  const thu = thuElement ? thuElement.textContent.trim() : "";

  const ngayElement = table.querySelector(".ngay a");
  const rawDate = ngayElement ? ngayElement.textContent.trim() : "";
  const ngay = formatDate(rawDate);

  // Xử lý cho miền Nam và miền Trung
  const provinceTableNodes = table.querySelectorAll("table.rightcl");
  const danhSachTinh = [];

  provinceTableNodes.forEach((provinceTable) => {
    const tenTinh =
      provinceTable.querySelector(".tinh a")?.textContent.trim() || "";
    const maTinh =
      provinceTable.querySelector(".matinh")?.textContent.trim() || "";

    // Lấy thông tin các giải thưởng
    const ketQua = {
      giaiDacBiet: Array.from(
        provinceTable.querySelectorAll(".giaidb div")
      ).map((div) => div.textContent.trim()),
      giaiNhat: Array.from(provinceTable.querySelectorAll(".giai1 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiNhi: Array.from(provinceTable.querySelectorAll(".giai2 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiBa: Array.from(provinceTable.querySelectorAll(".giai3 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiTu: Array.from(provinceTable.querySelectorAll(".giai4 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiNam: Array.from(provinceTable.querySelectorAll(".giai5 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiSau: Array.from(provinceTable.querySelectorAll(".giai6 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiBay: Array.from(provinceTable.querySelectorAll(".giai7 div")).map(
        (div) => div.textContent.trim()
      ),
      giaiTam: Array.from(provinceTable.querySelectorAll(".giai8 div")).map(
        (div) => div.textContent.trim()
      ),
    };

    danhSachTinh.push({
      tinh: tenTinh,
      maTinh,
      ketQua,
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

    let duLieu;
    if (mien === "mien-bac") {
      const boxKqxs = document.querySelector(".box_kqxs");
      if (!boxKqxs) {
        console.log(`Không tìm thấy kết quả xổ số cho ${mien} - ${ngay}`);
        return null;
      }
      duLieu = extractMienBacData(boxKqxs);
    } else {
      const targetTable = document.querySelector("table.bkqmiennam");
      if (!targetTable) {
        console.log(`Không tìm thấy bảng kết quả xổ số cho ${mien} - ${ngay}`);
        return null;
      }
      duLieu = extractMienNamTrungData(targetTable);
    }

    return duLieu;
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu ${mien} - ${ngay}:`, error.message);
    return null;
  }
}

/**
 * Lấy dữ liệu xổ số cho tất cả các miền
 */
async function layDuLieuXoSo() {
  try {
    console.log("Bắt đầu lấy dữ liệu xổ số...");

    // Lấy danh sách miền từ cấu hình debug hoặc cấu hình chính
    const danhSachMien = DEBUG.enable ? DEBUG.mien : CONFIG.mien;

    // Xác định thời gian hiện tại
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Thời gian hiện tại tính bằng phút

    // Định nghĩa thời gian mốc cho từng miền
    const NAM_TIME = 16 * 60 + 30; // 16:30
    const TRUNG_TIME = 17 * 60 + 15; // 17:15
    const BAC_TIME = 18 * 60; // 18:00

    // Tạo ngày hiện tại và ngày hôm qua
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Xác định thứ của ngày hiện tại và hôm qua
    const daysMapping = [
      "chu-nhat",
      "thu-hai",
      "thu-ba",
      "thu-tu",
      "thu-nam",
      "thu-sau",
      "thu-bay",
    ];

    const todayDayOfWeek = daysMapping[today.getDay()];
    const yesterdayDayOfWeek = daysMapping[yesterday.getDay()];

    // Cấu trúc dữ liệu kết quả
    const ketQuaXoSo = {
      metadata: {
        version: "1.2",
        nguon: CONFIG.baseUrl,
        ngayLayDuLieu: new Date().toISOString(),
        tongSoMien: danhSachMien.length,
        quyTacApDung:
          "Lấy dữ liệu theo thời gian cụ thể của từng miền: Nam (16:30), Trung (17:15), Bắc (18:00)",
      },
      duLieu: {},
    };

    // Khởi tạo cấu trúc dữ liệu cho cả hai ngày có thể
    ketQuaXoSo.duLieu[todayDayOfWeek] = {};
    ketQuaXoSo.duLieu[yesterdayDayOfWeek] = {};

    // Xác định ngày và thứ cần lấy dữ liệu cho từng miền
    for (const mien of danhSachMien) {
      let targetDay, targetDayOfWeek;

      // Quyết định lấy ngày nào dựa vào thời gian hiện tại và miền
      if (currentTime < NAM_TIME) {
        // Trước 16:30 - lấy dữ liệu ngày hôm qua cho tất cả các miền
        targetDay = yesterday;
        targetDayOfWeek = yesterdayDayOfWeek;
      } else if (currentTime < TRUNG_TIME) {
        // Từ 16:30 đến trước 17:15 - Miền Nam lấy hôm nay, Miền Trung và Bắc lấy hôm qua
        if (mien === "mien-nam") {
          targetDay = today;
          targetDayOfWeek = todayDayOfWeek;
        } else {
          targetDay = yesterday;
          targetDayOfWeek = yesterdayDayOfWeek;
        }
      } else if (currentTime < BAC_TIME) {
        // Từ 17:15 đến trước 18:00 - Miền Nam và Trung lấy hôm nay, Miền Bắc lấy hôm qua
        if (mien === "mien-nam" || mien === "mien-trung") {
          targetDay = today;
          targetDayOfWeek = todayDayOfWeek;
        } else {
          targetDay = yesterday;
          targetDayOfWeek = yesterdayDayOfWeek;
        }
      } else {
        // Sau 18:00 - lấy dữ liệu ngày hôm nay cho tất cả các miền
        targetDay = today;
        targetDayOfWeek = todayDayOfWeek;
      }

      console.log(
        `Lấy dữ liệu cho ${mien} - ${targetDayOfWeek} (${
          targetDay.toISOString().split("T")[0]
        })`
      );

      // Lấy dữ liệu
      const duLieu = await layDuLieuNgay(mien, targetDayOfWeek);

      // Đảm bảo cấu trúc dữ liệu tồn tại trước khi gán
      if (!ketQuaXoSo.duLieu[targetDayOfWeek][mien]) {
        ketQuaXoSo.duLieu[targetDayOfWeek][mien] = duLieu;
      }

      // Đợi giữa các request
      await delay(CONFIG.delayBetweenRequests);
    }

    // Xóa bỏ các ngày không có dữ liệu
    for (const day of Object.keys(ketQuaXoSo.duLieu)) {
      if (Object.keys(ketQuaXoSo.duLieu[day]).length === 0) {
        delete ketQuaXoSo.duLieu[day];
      }
    }

    // Cập nhật metadata tổng số ngày
    ketQuaXoSo.metadata.tongSoNgay = Object.keys(ketQuaXoSo.duLieu).length;
    ketQuaXoSo.metadata.cacNgayDaLay = Object.keys(ketQuaXoSo.duLieu).join(
      ", "
    );

    // Tạo thư mục output nếu chưa tồn tại
    const outputDir = path.dirname(CONFIG.outputFile);
    if (outputDir !== "." && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Lưu dữ liệu vào file JSON
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(ketQuaXoSo, null, 2));

    console.log(`Đã lưu dữ liệu vào file ${CONFIG.outputFile}`);
    return ketQuaXoSo;
  } catch (error) {
    console.error("Đã xảy ra lỗi chung:", error.message);
    throw error;
  }
}

// Gọi hàm chính
layDuLieuXoSo().catch((error) => {
  console.error("Lỗi khi lấy dữ liệu xổ số:", error);
  process.exit(1);
});
