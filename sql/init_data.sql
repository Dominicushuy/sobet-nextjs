-- init_data.sql - Dữ liệu khởi tạo cho hệ thống quản lý cược xổ số

-- 1. Dữ liệu cho bảng Roles
INSERT INTO roles (name, description) VALUES 
('super_admin', 'Super administrator with full access'),
('admin', 'Administrator with limited access'),
('user', 'Regular user');

-- 2. Dữ liệu cho bảng Regions và thêm aliases
INSERT INTO regions (name, code, aliases) VALUES 
('Miền Bắc', 'north', ARRAY['mb', 'mienbac', 'miền bắc', 'hanoi', 'hn', 'hà nội', 'daibac', 'dbac', 'đài bắc', 'đài miền bắc', 'db']),
('Miền Trung', 'central', ARRAY['mt', 'dmt', 'dt', 'dtrung', 'mientrung', 'mien trung', 'miền trung', 'đài trung', 'đài miền trung', 'mtrung']),
('Miền Nam', 'south', ARRAY['mn', 'dmn', 'dn', 'dnam', 'miennam', 'mien nam', 'miền nam', 'đài nam', 'đài miền nam', 'mnam']);

-- 3. Dữ liệu cho bảng Stations
DO $$
DECLARE
    south_id INT;
    central_id INT;
    north_id INT;
BEGIN
    -- Lấy ID của các miền
    SELECT id INTO south_id FROM regions WHERE code = 'south';
    SELECT id INTO central_id FROM regions WHERE code = 'central';
    SELECT id INTO north_id FROM regions WHERE code = 'north';
    
    -- Thêm các đài Miền Nam
    INSERT INTO stations (name, region_id, aliases, is_active) VALUES
    ('TP. HCM', south_id, ARRAY['tp', 'tpho', 'thanh pho', 'hcm', 'tp hcm', 'thanh pho ho chi minh', 'thành phố hồ chí minh', 'thanh pho hcm', 'thành phố hcm', 'hồ chí minh', 'ho chi minh', 'saigon', 'sài gòn', 'sg'], TRUE),
    ('Đồng Tháp', south_id, ARRAY['dt', 'dthap', 'dongthap', 'dong thap', 'đồng tháp'], TRUE),
    ('Cà Mau', south_id, ARRAY['cm', 'cmau', 'camau', 'ca mau', 'cà mau'], TRUE),
    ('Bến Tre', south_id, ARRAY['bt', 'btre', 'bentre', 'ben tre', 'bến tre'], TRUE),
    ('Vũng Tàu', south_id, ARRAY['vt', 'vtau', 'vungtau', 'vung tau', 'vũng tàu'], TRUE),
    ('Bạc Liêu', south_id, ARRAY['bl', 'blieu', 'baclieu', 'bac lieu', 'bạc liêu'], TRUE),
    ('Đồng Nai', south_id, ARRAY['dnai', 'dongnai', 'dong nai', 'đồng nai'], TRUE),
    ('Cần Thơ', south_id, ARRAY['ct', 'ctho', 'cantho', 'can tho', 'cần thơ'], TRUE),
    ('Sóc Trăng', south_id, ARRAY['st', 'strang', 'soctrang', 'soc trang', 'sóc trăng'], TRUE),
    ('Tây Ninh', south_id, ARRAY['tn', 'tninh', 'tayninh', 'tay ninh', 'tây ninh'], TRUE),
    ('An Giang', south_id, ARRAY['ag', 'agiang', 'angiang', 'an giang'], TRUE),
    ('Bình Thuận', south_id, ARRAY['bthuan', 'binhthuan', 'binh thuan', 'bình thuận'], TRUE),
    ('Vĩnh Long', south_id, ARRAY['vl', 'vlong', 'vinhlong', 'vinh long', 'vĩnh long'], TRUE),
    ('Bình Dương', south_id, ARRAY['bd', 'bduong', 'binhduong', 'binh duong', 'bình dương'], TRUE),
    ('Trà Vinh', south_id, ARRAY['tv', 'tvinh', 'travinh', 'tra vinh', 'trà vinh'], TRUE),
    ('Long An', south_id, ARRAY['la', 'lan', 'longan', 'long an'], TRUE),
    ('Bình Phước', south_id, ARRAY['bp', 'bphuoc', 'binhphuoc', 'binh phuoc', 'bình phước'], TRUE),
    ('Hậu Giang', south_id, ARRAY['hg', 'hgiang', 'haugiang', 'hau giang', 'hậu giang'], TRUE),
    ('Tiền Giang', south_id, ARRAY['tg', 'tgiang', 'tiengiang', 'tien giang', 'tiền giang'], TRUE),
    ('Kiên Giang', south_id, ARRAY['kg', 'kgiang', 'kiengiang', 'kien giang', 'kiên giang'], TRUE),
    ('Đà Lạt', south_id, ARRAY['dl', 'dlat', 'dalat', 'da lat', 'đà lạt'], TRUE);

    -- Thêm các đài Miền Trung
    INSERT INTO stations (name, region_id, aliases, is_active) VALUES
    ('Đà Nẵng', central_id, ARRAY['dn', 'dnang', 'danang', 'da nang', 'đà nẵng'], TRUE),
    ('Quảng Nam', central_id, ARRAY['qn', 'qnam', 'quangnam', 'quang nam', 'quảng nam'], TRUE),
    ('Đắk Lắk', central_id, ARRAY['dl', 'dlak', 'daklak', 'dak lak', 'đắk lắk'], TRUE),
    ('Khánh Hòa', central_id, ARRAY['kh', 'khoa', 'khanhhoa', 'khanh hoa', 'khánh hòa'], TRUE),
    ('Thừa T. Huế', central_id, ARRAY['hue', 'tthue', 'thuathienhue', 'thua thien hue', 'thừa thiên huế'], TRUE),
    ('Phú Yên', central_id, ARRAY['py', 'pyen', 'phuyen', 'phu yen', 'phú yên'], TRUE),
    ('Bình Định', central_id, ARRAY['bd', 'bdinh', 'binhdinh', 'binh dinh', 'bình định'], TRUE),
    ('Quảng Trị', central_id, ARRAY['qt', 'qtri', 'quangtri', 'quang tri', 'quảng trị'], TRUE),
    ('Quảng Bình', central_id, ARRAY['qb', 'qbinh', 'quangbinh', 'quang binh', 'quảng bình'], TRUE),
    ('Gia Lai', central_id, ARRAY['gl', 'glai', 'gialai', 'gia lai'], TRUE),
    ('Ninh Thuận', central_id, ARRAY['nt', 'nthuan', 'ninhthuan', 'ninh thuan', 'ninh thuận'], TRUE),
    ('Quảng Ngãi', central_id, ARRAY['qngai', 'quangngai', 'quang ngai', 'quảng ngãi'], TRUE),
    ('Đắk Nông', central_id, ARRAY['dn', 'dnong', 'daknong', 'dak nong', 'đắk nông'], TRUE),
    ('Kon Tum', central_id, ARRAY['kt', 'ktum', 'kontum', 'kon tum'], TRUE);
    
    -- Thêm các đài con của Miền Bắc
    INSERT INTO stations (name, region_id, aliases, is_active) VALUES
    ('Hà Nội', north_id, ARRAY['hanoi', 'hn', 'hà nội'], TRUE),
    ('Quảng Ninh', north_id, ARRAY['qn', 'qninh', 'quangninh', 'quang ninh', 'quảng ninh'], TRUE),
    ('Bắc Ninh', north_id, ARRAY['bn', 'bninh', 'bacninh', 'bac ninh', 'bắc ninh'], TRUE),
    ('Hải Phòng', north_id, ARRAY['hp', 'hphong', 'haiphong', 'hai phong', 'hải phòng'], TRUE),
    ('Nam Định', north_id, ARRAY['nd', 'ndinh', 'namdinh', 'nam dinh', 'nam định'], TRUE),
    ('Thái Bình', north_id, ARRAY['tb', 'tbinh', 'thaibinh', 'thai binh', 'thái bình'], TRUE);
END $$;

-- 4. Dữ liệu cho bảng StationSchedules
DO $$
DECLARE
    station_id INT;
BEGIN
    -- TP. HCM - Thứ 2 và Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'TP. HCM';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'monday', 1),
    (station_id, 'saturday', 1);
    
    -- Đồng Tháp - Thứ 2
    SELECT id INTO station_id FROM stations WHERE name = 'Đồng Tháp';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'monday', 2);
    
    -- Cà Mau - Thứ 2
    SELECT id INTO station_id FROM stations WHERE name = 'Cà Mau';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'monday', 3);
    
    -- Bến Tre - Thứ 3
    SELECT id INTO station_id FROM stations WHERE name = 'Bến Tre';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'tuesday', 1);
    
    -- Vũng Tàu - Thứ 3
    SELECT id INTO station_id FROM stations WHERE name = 'Vũng Tàu';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'tuesday', 2);
    
    -- Bạc Liêu - Thứ 3
    SELECT id INTO station_id FROM stations WHERE name = 'Bạc Liêu';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'tuesday', 3);
    
    -- Đồng Nai - Thứ 4
    SELECT id INTO station_id FROM stations WHERE name = 'Đồng Nai';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'wednesday', 1);
    
    -- Cần Thơ - Thứ 4
    SELECT id INTO station_id FROM stations WHERE name = 'Cần Thơ';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'wednesday', 2);
    
    -- Sóc Trăng - Thứ 4
    SELECT id INTO station_id FROM stations WHERE name = 'Sóc Trăng';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'wednesday', 3);
    
    -- Tây Ninh - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'Tây Ninh';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 1);
    
    -- An Giang - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'An Giang';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 2);
    
    -- Bình Thuận - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'Bình Thuận';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 3);
    
    -- Vĩnh Long - Thứ 6
    SELECT id INTO station_id FROM stations WHERE name = 'Vĩnh Long';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'friday', 1);
    
    -- Bình Dương - Thứ 6
    SELECT id INTO station_id FROM stations WHERE name = 'Bình Dương';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'friday', 2);
    
    -- Trà Vinh - Thứ 6
    SELECT id INTO station_id FROM stations WHERE name = 'Trà Vinh';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'friday', 3);
    
    -- Long An - Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Long An';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'saturday', 2);
    
    -- Bình Phước - Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Bình Phước';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'saturday', 3);
    
    -- Hậu Giang - Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Hậu Giang';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'saturday', 4);
    
    -- Tiền Giang - Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Tiền Giang';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'sunday', 1);
    
    -- Kiên Giang - Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Kiên Giang';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'sunday', 2);
    
    -- Đà Lạt - Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Đà Lạt';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'sunday', 3);
    
    -- Đà Nẵng - Thứ 4 và Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Đà Nẵng';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'wednesday', 1),
    (station_id, 'saturday', 1);
    
    -- Quảng Nam - Thứ 3
    SELECT id INTO station_id FROM stations WHERE name = 'Quảng Nam';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'tuesday', 2);
    
    -- Đắk Lắk - Thứ 3
    SELECT id INTO station_id FROM stations WHERE name = 'Đắk Lắk';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'tuesday', 1);
    
    -- Khánh Hòa - Thứ 4 và Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Khánh Hòa';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'wednesday', 2),
    (station_id, 'sunday', 2);
    
    -- Thừa Thiên Huế - Thứ 2 và Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Thừa Thiên Huế';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'monday', 2),
    (station_id, 'sunday', 3);
    
    -- Phú Yên - Thứ 2
    SELECT id INTO station_id FROM stations WHERE name = 'Phú Yên';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'monday', 1);
    
    -- Bình Định - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'Bình Định';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 1);
    
    -- Quảng Trị - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'Quảng Trị';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 2);
    
    -- Quảng Bình - Thứ 5
    SELECT id INTO station_id FROM stations WHERE name = 'Quảng Bình';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'thursday', 3);
    
    -- Gia Lai - Thứ 6
    SELECT id INTO station_id FROM stations WHERE name = 'Gia Lai';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'friday', 1);
    
    -- Ninh Thuận - Thứ 6
    SELECT id INTO station_id FROM stations WHERE name = 'Ninh Thuận';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'friday', 2);
    
    -- Quảng Ngãi - Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Quảng Ngãi';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'saturday', 2);
    
    -- Đắk Nông - Thứ 7
    SELECT id INTO station_id FROM stations WHERE name = 'Đắk Nông';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'saturday', 3);
    
    -- Kon Tum - Chủ nhật
    SELECT id INTO station_id FROM stations WHERE name = 'Kon Tum';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'sunday', 1);
    
    -- Miền Bắc - Hàng ngày
    SELECT id INTO station_id FROM stations WHERE name = 'Miền Bắc';
    INSERT INTO station_schedules (station_id, day_of_week, order_number) VALUES
    (station_id, 'daily', 1);
END $$;

-- 5. Dữ liệu cho bảng BetTypes
INSERT INTO bet_types (name, aliases, applicable_regions, bet_rule, matching_method, payout_rate, combinations, is_permutation, special_calc, is_active) VALUES
('Đầu Đuôi', 
 ARRAY['dd', 'dau duoi', 'đầu đuôi', 'head and tail'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits'], 
 'Match the last 2 digits of head prize (8th prize in South/Central, 7th prize in North) and tail prize (special prize)', 
 '{"south": 75, "central": 75, "north": 75}'::jsonb, 
 '{"south": 2, "central": 2, "north": 5}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Xỉu chủ', 
 ARRAY['xc', 'x', 'xiu chu', 'xiuchu', 'three digits'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['3 digits'], 
 'Match the last 3 digits of head prize (7th prize in South/Central, 6th prize in North) and tail prize (special prize)', 
 '650'::jsonb, 
 '{"south": 2, "central": 2, "north": 4}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Đầu', 
 ARRAY['dau', 'đầu', 'head'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits', '3 digits'], 
 'Match the last 2 or 3 digits of head prize only (8th prize in South/Central or 7th prize in North for 2 digits, 7th prize in South/Central or 6th prize in North for 3 digits)', 
 '{"2 digits": 75, "3 digits": 650}'::jsonb, 
 '{"2 digits": {"south": 1, "central": 1, "north": 4}, "3 digits": {"south": 1, "central": 1, "north": 3}}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Đuôi', 
 ARRAY['duoi', 'dui', 'đuôi', 'tail'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits', '3 digits'], 
 'Match the last 2 or 3 digits of special prize only', 
 '{"2 digits": 75, "3 digits": 650}'::jsonb, 
 '{"2 digits": {"south": 1, "central": 1, "north": 1}, "3 digits": {"south": 1, "central": 1, "north": 1}}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Bao Lô', 
 ARRAY['b', 'bao', 'bao lo', 'bao lô', 'cover all'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits', '3 digits', '4 digits'], 
 'Match the last 2, 3, or 4 digits of any prize across all available prizes', 
 '{"2 digits": 75, "3 digits": 650, "4 digits": 5500}'::jsonb, 
 '{"2 digits": {"south": 18, "central": 18, "north": 27}, "3 digits": {"south": 17, "central": 17, "north": 23}, "4 digits": {"south": 16, "central": 16, "north": 20}}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Đảo Bao Lô', 
 ARRAY['daob', 'bdao', 'dao bao', 'dao bao lo', 'permutation cover'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits', '3 digits'], 
 'Match any permutation of the last 2 or 3 digits across all available prizes', 
 '{"2 digits": 75, "3 digits": 650}'::jsonb, 
 '{"2 digits": {"south": 18, "central": 18, "north": 27}, "3 digits": {"south": 17, "central": 17, "north": 23}}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Bao Lô 7', 
 ARRAY['baobay', 'b7l', 'b7lo', 'bao lo 7', 'cover seven'], 
 ARRAY['south', 'central'], 
 ARRAY['2 digits'], 
 'Match the last 2 digits of 7 specific prizes: 8th, 7th, 6th, 5th prizes and special prize in South/Central', 
 '75'::jsonb, 
 '{"south": 7, "central": 7}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Bao Lô 8', 
 ARRAY['baotam', 'b8l', 'b8lo', 'bao lo 8', 'cover eight'], 
 ARRAY['north'], 
 ARRAY['2 digits'], 
 'Match the last 2 digits of 8 specific prizes: 7th prize (4 numbers), 6th prize (3 numbers) and special prize (1 number) in North', 
 '75'::jsonb, 
 '{"north": 8}'::jsonb, 
 FALSE, 
 NULL,
 TRUE),

('Bao Lô 7 Đảo', 
 ARRAY['b7ld', 'b7ldao', 'cover seven permutation'], 
 ARRAY['south', 'central'], 
 ARRAY['2 digits'], 
 'Match any permutation of the last 2 digits of 7 specific prizes: 8th, 7th, 6th, 5th prizes and special prize in South/Central', 
 '75'::jsonb, 
 '{"south": 7, "central": 7}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Bao Lô 8 Đảo', 
 ARRAY['b8ld', 'b8ldao', 'cover eight permutation'], 
 ARRAY['north'], 
 ARRAY['2 digits'], 
 'Match any permutation of the last 2 digits of 8 specific prizes: 7th prize (4 numbers), 6th prize (3 numbers) and special prize (1 number) in North', 
 '75'::jsonb, 
 '{"north": 8}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Đá', 
 ARRAY['da', 'dv'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['2 digits'], 
 'At least 2 bet numbers must match the last 2 digits of any prizes, with special calculation for multiple matches and bonuses for repeated numbers', 
 '{"bridgeOneStation": 750, "bridgeTwoStations": 550, "bridgeNorth": 650}'::jsonb, 
 '{"south": 18, "central": 18, "north": 27}'::jsonb, 
 FALSE, 
 'bridge',
 TRUE),

('Đảo Xỉu Chủ', 
 ARRAY['daoxc', 'dxc', 'xcd', 'xcdao', 'permutation three digits'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['3 digits'], 
 'Match any permutation of the last 3 digits of head prize (7th prize in South/Central, 6th prize in North) and tail prize (special prize)', 
 '650'::jsonb, 
 '{"south": 2, "central": 2, "north": 4}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Đảo Xỉu Chủ Đầu', 
 ARRAY['dxcdau', 'daodau', 'ddau', 'permutation head'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['3 digits'], 
 'Match any permutation of the last 3 digits of head prize only (7th prize in South/Central, 6th prize in North)', 
 '650'::jsonb, 
 '{"south": 1, "central": 1, "north": 3}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Đảo Xỉu Chủ Đuôi', 
 ARRAY['dxcduoi', 'daoduoi', 'daodui', 'dduoi', 'ddui', 'permutation tail'], 
 ARRAY['south', 'central', 'north'], 
 ARRAY['3 digits'], 
 'Match any permutation of the last 3 digits of special prize only', 
 '650'::jsonb, 
 '{"south": 1, "central": 1, "north": 1}'::jsonb, 
 TRUE, 
 NULL,
 TRUE),

('Nhất To', 
 ARRAY['nt', 'nto', 'nhatto', 'first prize'], 
 ARRAY['north'], 
 ARRAY['2 digits', '3 digits', '4 digits'], 
 'Match the last 2, 3, or 4 digits of the first prize in North only', 
 '{"2 digits": 75, "3 digits": 650, "4 digits": 5500}'::jsonb, 
 '{"north": 1}'::jsonb, 
 FALSE, 
 NULL,
 TRUE);

-- 6. Dữ liệu cho bảng NumberCombinations
INSERT INTO number_combinations (name, aliases, definition, syntax, applicable_bet_types, examples, calculation_method, is_active) VALUES
('Kéo', 
 ARRAY['keo', 'sequence'], 
 'Chọn số bắt đầu, số tiếp theo và số kết thúc để tạo một dãy số', 
 '[startNumber]/[nextNumber]keo[endNumber]', 
 ARRAY['dau', 'duoi', 'dd', 'xc'], 
 ARRAY['10/20keo90 (sequence: 10, 20, 30, 40, 50, 60, 70, 80, 90)', '10/11keo19 (sequence: 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)', '111/222keo999 (sequence: 111, 222, 333, 444, 555, 666, 777, 888, 999)'], 
 'Let startNumber=A, nextNumber=B, endNumber=C. Step size D = B-A. Number of variations = (C-A)/D + 1', 
 TRUE),

('Tài', 
 ARRAY['tai', 'high'], 
 'Bao gồm 50 số từ 50 đến 99', 
 'tai', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['tai (numbers: 50, 51, 52, ..., 99)'], 
 'Fixed set of 50 numbers from 50 to 99', 
 TRUE),

('Xỉu', 
 ARRAY['xiu', 'low'], 
 'Bao gồm 50 số từ 00 đến 49', 
 'xiu', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['xiu (numbers: 00, 01, 02, ..., 49)'], 
 'Fixed set of 50 numbers from 00 to 49', 
 TRUE),

('Chẵn', 
 ARRAY['chan', 'even'], 
 'Bao gồm 50 số chẵn từ 00 đến 98', 
 'chan', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['chan (numbers: 00, 02, 04, ..., 98)'], 
 'Fixed set of 50 even numbers from 00 to 98', 
 TRUE),

('Lẻ', 
 ARRAY['le', 'odd'], 
 'Bao gồm 50 số lẻ từ 01 đến 99', 
 'le', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['le (numbers: 01, 03, 05, ..., 99)'], 
 'Fixed set of 50 odd numbers from 01 to 99', 
 TRUE),

('Chẵn Chẵn', 
 ARRAY['chanchan', 'even-even'], 
 'Bao gồm 25 số có cả hai chữ số đều chẵn', 
 'chanchan', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['chanchan (numbers: 00, 02, 04, 06, 08, 20, 22, 24, 26, 28, ...)'], 
 'Fixed set of 25 numbers where both digits are even', 
 TRUE),

('Lẻ Lẻ', 
 ARRAY['lele', 'odd-odd'], 
 'Bao gồm 25 số có cả hai chữ số đều lẻ', 
 'lele', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['lele (numbers: 11, 13, 15, 17, 19, 31, 33, 35, 37, 39, ...)'], 
 'Fixed set of 25 numbers where both digits are odd', 
 TRUE),

('Chẵn Lẻ', 
 ARRAY['chanle', 'even-odd'], 
 'Bao gồm 25 số có chữ số đầu là chẵn và chữ số thứ hai là lẻ', 
 'chanle', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['chanle (numbers: 01, 03, 05, 07, 09, 21, 23, 25, 27, 29, ...)'], 
 'Fixed set of 25 numbers where first digit is even and second digit is odd', 
 TRUE),

('Lẻ Chẵn', 
 ARRAY['lechan', 'odd-even'], 
 'Bao gồm 25 số có chữ số đầu là lẻ và chữ số thứ hai là chẵn', 
 'lechan', 
 ARRAY['dau', 'duoi', 'dd'], 
 ARRAY['lechan (numbers: 10, 12, 14, 16, 18, 30, 32, 34, 36, 38, ...)'], 
 'Fixed set of 25 numbers where first digit is odd and second digit is even', 
 TRUE);