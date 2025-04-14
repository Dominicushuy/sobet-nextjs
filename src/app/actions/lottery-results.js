'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// Mảng mapping giữa định dạng slug và index
const DAYS_MAPPING = [
  'chu-nhat', // 0
  'thu-hai', // 1
  'thu-ba', // 2
  'thu-tu', // 3
  'thu-nam', // 4
  'thu-sau', // 5
  'thu-bay', // 6
];

// Hàm kiểm tra thời gian hợp lệ cho từng miền
function isValidTimeForRegion(regionCode) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // Thời gian hiện tại tính bằng phút

  // Các mốc thời gian (tính bằng phút)
  const NAM_VALID_TIME = 16 * 60 + 40; // 16:40
  const TRUNG_VALID_TIME = 17 * 60 + 40; // 17:40
  const BAC_VALID_TIME = 18 * 60 + 40; // 18:40

  // Log thông tin để debug
  console.log(
    `Current time: ${currentHour}:${currentMinute} (${currentTime} minutes)`
  );
  console.log(`Checking region: ${regionCode}`);
  console.log(`NAM_VALID_TIME: ${NAM_VALID_TIME} minutes`);
  console.log(`TRUNG_VALID_TIME: ${TRUNG_VALID_TIME} minutes`);
  console.log(`BAC_VALID_TIME: ${BAC_VALID_TIME} minutes`);

  let isValid = false;
  switch (regionCode) {
    case 'south': // Miền Nam
      isValid = currentTime >= NAM_VALID_TIME;
      console.log(`South region valid: ${isValid}`);
      return isValid;
    case 'central': // Miền Trung
      isValid = currentTime >= TRUNG_VALID_TIME;
      console.log(`Central region valid: ${isValid}`);
      return isValid;
    case 'north': // Miền Bắc
      isValid = currentTime >= BAC_VALID_TIME;
      console.log(`North region valid: ${isValid}`);
      return isValid;
    default:
      console.log(`Unknown region: ${regionCode}`);
      return false;
  }
}

// Cập nhật hàm fetchLotteryResults để hỗ trợ tham số date
export async function fetchLotteryResults({ region, stationId, date } = {}) {
  try {
    // const supabase = await createClient();

    // Xác định ngày cần lấy kết quả
    let targetDate;
    if (date) {
      targetDate = date;
    } else {
      // Logic để xác định ngày dựa trên thời gian
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const NAM_TIME = 16 * 60 + 40; // 16:40 - Sử dụng thời điểm sớm nhất để xác định ngày

      if (currentTime < NAM_TIME) {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - 1);
      } else {
        targetDate = now;
      }

      // Format ngày thành chuỗi YYYY-MM-DD
      targetDate = targetDate.toISOString().split('T')[0];
    }

    // Xây dựng query cơ bản
    let query = supabaseAdmin
      .from('lottery_results')
      .select(
        `  
        *,  
        station:stations(  
          id,  
          name,  
          region_id,  
          region:regions(  
            id,  
            name,  
            code  
          )  
        )  
      `
      )
      .eq('draw_date', targetDate);

    // Thêm các filter nếu có
    if (region) {
      query = query.eq('station.region.code', region);
    }

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    // Thực hiện query
    const { data, error } = await query.order('station_id', {
      ascending: true,
    });

    if (error) {
      console.error('Error fetching lottery results:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Unexpected error in fetchLotteryResults:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Thêm hàm mới để kiểm tra xem một ngày đã có kết quả chưa
export async function checkResultsExist(date) {
  try {
    const { count, error } = await supabaseAdmin
      .from('lottery_results')
      .select('*', { count: 'exact', head: true })
      .eq('draw_date', date);

    if (error) {
      console.error('Error checking results existence:', error);
      return { data: false, error: error.message };
    }

    return { data: count > 0, error: null };
  } catch (error) {
    console.error('Unexpected error in checkResultsExist:', error);
    return { data: false, error: 'Internal server error' };
  }
}

// Hàm để lấy thông tin ngày gần nhất có kết quả
export async function getLatestResultDate() {
  try {
    // Xác định ngày lấy kết quả dựa trên thời gian hiện tại
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Thời gian hiện tại tính bằng phút

    // Thời gian mốc: 16:40 (Nam - sớm nhất)
    const NAM_TIME = 16 * 60 + 40; // 16:40

    // Xác định ngày cần lấy kết quả
    let targetDate;
    if (currentTime < NAM_TIME) {
      // Nếu thời gian hiện tại < 16:40, lấy kết quả của ngày hôm qua
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      // Nếu >= 16:40, lấy kết quả của ngày hiện tại
      targetDate = now;
    }

    // Format ngày thành chuỗi YYYY-MM-DD
    const formattedDate = targetDate.toISOString().split('T')[0];

    return { data: formattedDate, error: null };
  } catch (error) {
    console.error('Unexpected error in getLatestResultDate:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Format lại array JSON thành phù hợp với database
function formatLotteryData(data) {
  if (!data) return null;

  return {
    special_prize: Array.isArray(data.giaiDacBiet) ? data.giaiDacBiet : [],
    first_prize: Array.isArray(data.giaiNhat) ? data.giaiNhat : [],
    second_prize: Array.isArray(data.giaiNhi) ? data.giaiNhi : [],
    third_prize: Array.isArray(data.giaiBa) ? data.giaiBa : [],
    fourth_prize: Array.isArray(data.giaiTu) ? data.giaiTu : [],
    fifth_prize: Array.isArray(data.giaiNam) ? data.giaiNam : [],
    sixth_prize: Array.isArray(data.giaiSau) ? data.giaiSau : [],
    seventh_prize: Array.isArray(data.giaiBay) ? data.giaiBay : [],
    eighth_prize: Array.isArray(data.giaiTam) ? data.giaiTam : [],
  };
}

// Hàm format ngày
function formatDate(rawDate) {
  if (!rawDate) return '';
  const parts = rawDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return rawDate;
}

// Hàm để crawl kết quả mới nhất từ nguồn bên ngoài
export async function crawlLatestResults(userId, specificDate = null) {
  try {
    const { data: stations, error: stationsError } = await supabaseAdmin
      .from('stations')
      .select(
        'id, name, region_id, aliases, region:regions(id, name, code, aliases)'
      )
      .eq('is_active', true);

    if (stationsError) {
      console.error('Error fetching stations:', stationsError);
      return { data: null, error: stationsError.message };
    }

    // Map để dễ tìm station theo tên
    const stationMap = {};
    stations.forEach((station) => {
      stationMap[station.name.toLowerCase()] = station;

      // Thêm các alias vào map
      if (station.aliases && Array.isArray(station.aliases)) {
        station.aliases.forEach((alias) => {
          stationMap[alias.toLowerCase()] = station;
        });
      }
    });

    // Lấy kết quả từ nguồn
    const baseUrl = 'https://www.minhngoc.net.vn/ket-qua-xo-so';
    const mienList = ['mien-bac', 'mien-trung', 'mien-nam'];

    // Xử lý ngày cụ thể nếu được cung cấp
    let targetDate;
    let dayOfWeekSlug;
    let dayOfWeekIndex;

    if (specificDate) {
      // Sử dụng ngày cụ thể được cung cấp
      targetDate = new Date(specificDate);

      // Xác định thứ trong tuần từ ngày cụ thể
      dayOfWeekIndex = targetDate.getDay(); // 0 = Chủ nhật, 1 = Thứ hai, ...
      dayOfWeekSlug = DAYS_MAPPING[dayOfWeekIndex];
    } else {
      // Sử dụng ngày hiện tại
      targetDate = new Date();
      dayOfWeekIndex = targetDate.getDay();
      dayOfWeekSlug = DAYS_MAPPING[dayOfWeekIndex];
    }

    const results = [];

    for (const mien of mienList) {
      // Xác định region code từ mien
      let regionCode;
      switch (mien) {
        case 'mien-bac':
          regionCode = 'north';
          break;
        case 'mien-trung':
          regionCode = 'central';
          break;
        case 'mien-nam':
          regionCode = 'south';
          break;
        default:
          regionCode = '';
      }

      console.log(`Processing region: ${regionCode} (${mien})`);

      // Chúng ta không bỏ qua việc crawl dữ liệu, chỉ kiểm tra khi lưu
      // Điều này cho phép chúng ta lấy tất cả dữ liệu nhưng chỉ lưu khi đúng thời gian
      // Nếu là ngày cụ thể, không cần thông báo gì
      if (!specificDate) {
        const canSave = isValidTimeForRegion(regionCode);
        console.log(`Can save ${regionCode} region results: ${canSave}`);
      }

      const url = `${baseUrl}/${mien}/${dayOfWeekSlug}.html`;

      try {
        const response = await axios.get(url);
        const html = response.data;
        const dom = new JSDOM(html);
        const document = dom.window.document;

        if (mien === 'mien-bac') {
          // [Mã xử lý cho miền Bắc]
          const boxKqxs = document.querySelector('.box_kqxs');
          if (boxKqxs) {
            // Lấy thông tin tỉnh
            const titleElement = boxKqxs.querySelector('.title');
            let tenTinh = '';
            if (titleElement) {
              const tinhLink = titleElement.querySelector('a:first-child');
              if (tinhLink) {
                const tinhText = tinhLink.textContent;
                tenTinh = tinhText.replace('KẾT QUẢ XỔ SỐ', '').trim();
              }
            }

            // Lấy ngày
            let ngay;
            // Nếu có ngày cụ thể, sử dụng ngày đó
            if (specificDate) {
              ngay = specificDate;
            } else {
              const ngayElement = boxKqxs.querySelector('.ngay a');
              const rawDate = ngayElement ? ngayElement.textContent.trim() : '';
              ngay = formatDate(rawDate);
            }

            // Tìm station phù hợp
            const matchedStation = stationMap[tenTinh.toLowerCase()];
            if (matchedStation && ngay) {
              // Lấy kết quả
              const kqTable = boxKqxs.querySelector('table.box_kqxs_content');
              if (kqTable) {
                const ketQua = {
                  giaiDacBiet: Array.from(
                    kqTable.querySelectorAll('td.giaidb div')
                  ).map((div) => div.textContent.trim()),
                  giaiNhat: Array.from(
                    kqTable.querySelectorAll('td.giai1 div')
                  ).map((div) => div.textContent.trim()),
                  giaiNhi: Array.from(
                    kqTable.querySelectorAll('td.giai2 div')
                  ).map((div) => div.textContent.trim()),
                  giaiBa: Array.from(
                    kqTable.querySelectorAll('td.giai3 div')
                  ).map((div) => div.textContent.trim()),
                  giaiTu: Array.from(
                    kqTable.querySelectorAll('td.giai4 div')
                  ).map((div) => div.textContent.trim()),
                  giaiNam: Array.from(
                    kqTable.querySelectorAll('td.giai5 div')
                  ).map((div) => div.textContent.trim()),
                  giaiSau: Array.from(
                    kqTable.querySelectorAll('td.giai6 div')
                  ).map((div) => div.textContent.trim()),
                  giaiBay: Array.from(
                    kqTable.querySelectorAll('td.giai7 div')
                  ).map((div) => div.textContent.trim()),
                };

                // Format dữ liệu
                const formattedData = formatLotteryData(ketQua);

                if (formattedData && formattedData.special_prize.length > 0) {
                  results.push({
                    station_id: matchedStation.id,
                    draw_date: ngay,
                    day_of_week: dayOfWeekIndex, // Lưu dưới dạng số
                    ...formattedData,
                    source: url,
                    created_by: userId,
                    region_code: regionCode,
                  });
                }
              }
            }
          }
        } else {
          // [Mã xử lý cho miền Nam và miền Trung]
          const targetTable = document.querySelector('table.bkqmiennam');
          if (targetTable) {
            // Lấy thông tin ngày
            let ngay;
            if (specificDate) {
              ngay = specificDate;
            } else {
              const ngayElement = targetTable.querySelector('.ngay a');
              const rawDate = ngayElement ? ngayElement.textContent.trim() : '';
              ngay = formatDate(rawDate);
            }

            if (ngay) {
              // Xử lý cho từng tỉnh
              const provinceTableNodes =
                targetTable.querySelectorAll('table.rightcl');

              provinceTableNodes.forEach((provinceTable) => {
                const tenTinh =
                  provinceTable.querySelector('.tinh a')?.textContent.trim() ||
                  '';

                // Tìm station phù hợp
                const matchedStation = stationMap[tenTinh.toLowerCase()];
                if (matchedStation) {
                  // Lấy kết quả
                  const ketQua = {
                    giaiDacBiet: Array.from(
                      provinceTable.querySelectorAll('.giaidb div')
                    ).map((div) => div.textContent.trim()),
                    giaiNhat: Array.from(
                      provinceTable.querySelectorAll('.giai1 div')
                    ).map((div) => div.textContent.trim()),
                    giaiNhi: Array.from(
                      provinceTable.querySelectorAll('.giai2 div')
                    ).map((div) => div.textContent.trim()),
                    giaiBa: Array.from(
                      provinceTable.querySelectorAll('.giai3 div')
                    ).map((div) => div.textContent.trim()),
                    giaiTu: Array.from(
                      provinceTable.querySelectorAll('.giai4 div')
                    ).map((div) => div.textContent.trim()),
                    giaiNam: Array.from(
                      provinceTable.querySelectorAll('.giai5 div')
                    ).map((div) => div.textContent.trim()),
                    giaiSau: Array.from(
                      provinceTable.querySelectorAll('.giai6 div')
                    ).map((div) => div.textContent.trim()),
                    giaiBay: Array.from(
                      provinceTable.querySelectorAll('.giai7 div')
                    ).map((div) => div.textContent.trim()),
                    giaiTam: Array.from(
                      provinceTable.querySelectorAll('.giai8 div')
                    ).map((div) => div.textContent.trim()),
                  };

                  // Format dữ liệu
                  const formattedData = formatLotteryData(ketQua);

                  if (formattedData && formattedData.special_prize.length > 0) {
                    results.push({
                      station_id: matchedStation.id,
                      draw_date: ngay,
                      day_of_week: dayOfWeekIndex, // Lưu dưới dạng số
                      ...formattedData,
                      source: url,
                      created_by: userId,
                      region_code: regionCode,
                    });
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error crawling ${mien}:`, error);
        // Continue with other regions
      }
    }

    // Lưu kết quả vào database với kiểm tra thời gian cho từng kết quả
    const savedResults = [];

    // Save results to json file in `data` folder
    // const fs = require('fs');
    // const path = require('path');
    // const dataDir = path.join(process.cwd(), 'data');
    // const filePath = path.join(dataDir, 'lottery_results.json');
    // fs.mkdirSync(dataDir, { recursive: true });
    // fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    // console.log(`Saved results to ${filePath}`);

    // Thêm log để debug
    // console.log(`Total crawled results: ${results.length}`);

    // Xử lý từng kết quả một thay vì Promise.all để có thể debug rõ ràng
    for (const result of results) {
      // Kiểm tra xem đã có kết quả này chưa
      const { data: existing } = await supabaseAdmin
        .from('lottery_results')
        .select('id')
        .eq('station_id', result.station_id)
        .eq('draw_date', result.draw_date)
        .maybeSingle();

      // Log thông tin
      // console.log(
      //   `Processing result for station ID: ${result.station_id}, region: ${result.region_code}, date: ${result.draw_date}`
      // );
      // console.log(`Result already exists: ${existing ? 'Yes' : 'No'}`);

      // Kiểm tra thời gian nếu không phải ngày cụ thể
      const shouldSave = specificDate
        ? true
        : isValidTimeForRegion(result.region_code);

      // console.log(`Should save: ${shouldSave}`);

      if (!existing && shouldSave) {
        // Lưu lại region_code để log, nhưng tạo một bản sao để xóa trước khi lưu
        const resultToSave = { ...result };
        delete resultToSave.region_code; // Loại bỏ region_code trước khi lưu vì đây chỉ là field tạm thời

        // Nếu chưa có và đã đến thời gian cho phép, lưu mới
        // console.log(`Saving result for station ID: ${result.station_id}`);
        const { data, error } = await supabaseAdmin
          .from('lottery_results')
          .insert(resultToSave)
          .select();

        if (error) {
          console.error(
            `Error saving lottery result for station ID: ${result.station_id}`,
            error
          );
        } else if (data) {
          // console.log(
          //   `Successfully saved result for station ID: ${result.station_id}`
          // );
          savedResults.push(data[0]);
        }
      } else {
        // console.log(
        //   `Skipping saving result for station ID: ${result.station_id}`
        // );
      }
    }

    revalidatePath('/lottery-results');
    return {
      data: {
        total: results.length,
        saved: savedResults.length,
        results: savedResults,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in crawlLatestResults:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm kiểm tra xem có thể hiển thị nút cập nhật kết quả chưa
export async function canShowUpdateButton() {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Thời gian mốc: 16:35 (Nam - sớm nhất)
    const NAM_TIME = 16 * 60 + 40; // 16:40

    // Chỉ hiển thị nút nếu đã qua thời gian mốc
    return { data: currentTime >= NAM_TIME, error: null };
  } catch (error) {
    console.error('Error in canShowUpdateButton:', error);
    return { data: false, error: 'Internal server error' };
  }
}
