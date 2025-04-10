// src/app/actions/lottery-results.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// Cập nhật hàm fetchLotteryResults để hỗ trợ tham số date
export async function fetchLotteryResults({ date } = {}) {
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

      const NAM_TIME = 16 * 60 + 30; // 16:30

      if (currentTime < NAM_TIME) {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - 1);
      } else {
        targetDate = now;
      }

      // Format ngày thành chuỗi YYYY-MM-DD
      targetDate = targetDate.toISOString().split('T')[0];
    }

    // Sửa lại cú pháp quan hệ trong query
    const { data, error } = await supabaseAdmin
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
      .eq('draw_date', targetDate)
      .order('station_id', { ascending: true });

    if (error) {
      console.error('Error fetching lottery results:', error);
      return { data: null, error: error.message };
    }

    // console.log(`Found ${data?.length || 0} results for date ${targetDate}`);

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

    // Thời gian mốc: 16:30 (Nam)
    const NAM_TIME = 16 * 60 + 30; // 16:30

    // Xác định ngày cần lấy kết quả
    let targetDate;
    if (currentTime < NAM_TIME) {
      // Nếu thời gian hiện tại < 16:30, lấy kết quả của ngày hôm qua
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      // Nếu >= 16:30, lấy kết quả của ngày hiện tại
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
    let dayOfWeek;

    if (specificDate) {
      // Sử dụng ngày cụ thể được cung cấp
      targetDate = new Date(specificDate);

      // Xác định thứ trong tuần từ ngày cụ thể
      const daysMapping = [
        'chu-nhat',
        'thu-hai',
        'thu-ba',
        'thu-tu',
        'thu-nam',
        'thu-sau',
        'thu-bay',
      ];
      dayOfWeek = daysMapping[targetDate.getDay()];
    } else {
      // Sử dụng ngày hiện tại
      targetDate = new Date();
      const daysMapping = [
        'chu-nhat',
        'thu-hai',
        'thu-ba',
        'thu-tu',
        'thu-nam',
        'thu-sau',
        'thu-bay',
      ];
      dayOfWeek = daysMapping[targetDate.getDay()];
    }

    const results = [];

    for (const mien of mienList) {
      const url = `${baseUrl}/${mien}/${dayOfWeek}.html`;

      try {
        const response = await axios.get(url);
        const html = response.data;
        const dom = new JSDOM(html);
        const document = dom.window.document;

        if (mien === 'mien-bac') {
          // [Mã xử lý cho miền Bắc giữ nguyên]
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

            // Lấy thứ
            let thu;
            if (specificDate) {
              // Thứ đã được xác định ở trên
              thu = dayOfWeek;
            } else {
              const thuElement = boxKqxs.querySelector('.thu a');
              thu = thuElement ? thuElement.textContent.trim() : '';
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
                    day_of_week: thu,
                    ...formattedData,
                    source: url,
                    created_by: userId,
                  });
                }
              }
            }
          }
        } else {
          // [Mã xử lý cho miền Nam và miền Trung giữ nguyên]
          const targetTable = document.querySelector('table.bkqmiennam');
          if (targetTable) {
            // Lấy thông tin ngày và thứ
            let thu;
            if (specificDate) {
              // Thứ đã được xác định ở trên
              thu = dayOfWeek;
            } else {
              const thuElement = targetTable.querySelector('.thu a');
              thu = thuElement ? thuElement.textContent.trim() : '';
            }

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
                      day_of_week: thu,
                      ...formattedData,
                      source: url,
                      created_by: userId,
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

    // Lưu kết quả vào database
    const savedResults = [];
    for (const result of results) {
      // Kiểm tra xem đã có kết quả này chưa
      const { data: existing } = await supabaseAdmin
        .from('lottery_results')
        .select('id')
        .eq('station_id', result.station_id)
        .eq('draw_date', result.draw_date)
        .maybeSingle();

      if (!existing) {
        // Nếu chưa có, lưu mới
        const { data, error } = await supabaseAdmin
          .from('lottery_results')
          .insert(result)
          .select();

        if (error) {
          console.error('Error saving lottery result:', error);
        } else if (data) {
          savedResults.push(data[0]);
        }
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
