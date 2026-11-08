/**
 * Offline Vietnamese location dataset for the MOCK shipping provider.
 * Shape mirrors GHN master-data (ProvinceID / DistrictID / WardCode) so the
 * frontend works identically against either provider.
 *
 * NOTE: IDs here are local mock IDs. When switching SHIPPING_PROVIDER to `ghn`,
 * addresses must be re-selected so they carry real GHN IDs.
 */
const PROVINCES = [
  {
    id: 201, name: 'Hà Nội', region: 'NORTH',
    districts: [
      { id: 1484, name: 'Quận Ba Đình', wards: ['Phường Điện Biên', 'Phường Kim Mã', 'Phường Ngọc Hà', 'Phường Liễu Giai'] },
      { id: 1489, name: 'Quận Hoàn Kiếm', wards: ['Phường Hàng Bạc', 'Phường Hàng Trống', 'Phường Tràng Tiền', 'Phường Lý Thái Tổ'] },
      { id: 1485, name: 'Quận Cầu Giấy', wards: ['Phường Dịch Vọng', 'Phường Mai Dịch', 'Phường Nghĩa Đô', 'Phường Yên Hòa'] },
      { id: 1486, name: 'Quận Đống Đa', wards: ['Phường Láng Hạ', 'Phường Ô Chợ Dừa', 'Phường Văn Miếu', 'Phường Trung Liệt'] },
      { id: 1493, name: 'Quận Hai Bà Trưng', wards: ['Phường Bách Khoa', 'Phường Bạch Mai', 'Phường Lê Đại Hành', 'Phường Minh Khai'] }
    ]
  },
  {
    id: 202, name: 'Hồ Chí Minh', region: 'SOUTH',
    districts: [
      { id: 1442, name: 'Quận 1', wards: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Đa Kao', 'Phường Nguyễn Thái Bình'] },
      { id: 1443, name: 'Quận 3', wards: ['Phường Võ Thị Sáu', 'Phường 9', 'Phường 11', 'Phường 14'] },
      { id: 1444, name: 'Quận 7', wards: ['Phường Tân Phong', 'Phường Tân Phú', 'Phường Tân Hưng', 'Phường Phú Mỹ'] },
      { id: 1462, name: 'Quận Bình Thạnh', wards: ['Phường 1', 'Phường 2', 'Phường 25', 'Phường 26'] },
      { id: 3695, name: 'Thành phố Thủ Đức', wards: ['Phường Linh Trung', 'Phường Thảo Điền', 'Phường An Phú', 'Phường Hiệp Phú'] }
    ]
  },
  {
    id: 203, name: 'Đà Nẵng', region: 'CENTRAL',
    districts: [
      { id: 1526, name: 'Quận Hải Châu', wards: ['Phường Hải Châu I', 'Phường Thạch Thang', 'Phường Bình Hiên', 'Phường Hòa Thuận Đông'] },
      { id: 1527, name: 'Quận Sơn Trà', wards: ['Phường An Hải Bắc', 'Phường Mân Thái', 'Phường Phước Mỹ', 'Phường Thọ Quang'] },
      { id: 1528, name: 'Quận Ngũ Hành Sơn', wards: ['Phường Mỹ An', 'Phường Khuê Mỹ', 'Phường Hòa Hải', 'Phường Hòa Quý'] }
    ]
  },
  {
    id: 224, name: 'Hải Phòng', region: 'NORTH',
    districts: [
      { id: 1586, name: 'Quận Hồng Bàng', wards: ['Phường Hoàng Văn Thụ', 'Phường Minh Khai', 'Phường Quán Toan'] },
      { id: 1587, name: 'Quận Lê Chân', wards: ['Phường An Biên', 'Phường Cát Dài', 'Phường Dư Hàng'] },
      { id: 1588, name: 'Quận Ngô Quyền', wards: ['Phường Cầu Đất', 'Phường Lạch Tray', 'Phường Máy Tơ'] }
    ]
  },
  {
    id: 220, name: 'Cần Thơ', region: 'SOUTH',
    districts: [
      { id: 1572, name: 'Quận Ninh Kiều', wards: ['Phường An Cư', 'Phường An Hòa', 'Phường Tân An', 'Phường Xuân Khánh'] },
      { id: 1573, name: 'Quận Cái Răng', wards: ['Phường Lê Bình', 'Phường Hưng Phú', 'Phường Ba Láng'] }
    ]
  },
  {
    id: 241, name: 'Thừa Thiên Huế', region: 'CENTRAL',
    districts: [
      { id: 1690, name: 'Thành phố Huế', wards: ['Phường Phú Hội', 'Phường Vĩnh Ninh', 'Phường Thuận Thành', 'Phường Phú Nhuận'] }
    ]
  },
  {
    id: 268, name: 'Khánh Hòa', region: 'CENTRAL',
    districts: [
      { id: 1810, name: 'Thành phố Nha Trang', wards: ['Phường Lộc Thọ', 'Phường Tân Lập', 'Phường Vĩnh Hải', 'Phường Phước Tiến'] }
    ]
  },
  {
    id: 206, name: 'Bình Dương', region: 'SOUTH',
    districts: [
      { id: 1540, name: 'Thành phố Thủ Dầu Một', wards: ['Phường Phú Cường', 'Phường Hiệp Thành', 'Phường Chánh Nghĩa'] },
      { id: 1541, name: 'Thành phố Dĩ An', wards: ['Phường Dĩ An', 'Phường Đông Hòa', 'Phường Tân Bình'] }
    ]
  }
];

// Deterministic ward codes: `${districtId}${index+1 padded}`
const provinces = PROVINCES.map(({ id, name, region }) => ({ id, name, region }));

const districtsByProvince = {};
const wardsByDistrict = {};
const provinceOfDistrict = {};

for (const p of PROVINCES) {
  districtsByProvince[p.id] = p.districts.map((d) => ({ id: d.id, name: d.name, provinceId: p.id }));
  for (const d of p.districts) {
    provinceOfDistrict[d.id] = p.id;
    wardsByDistrict[d.id] = d.wards.map((w, i) => ({
      code: `${d.id}${String(i + 1).padStart(2, '0')}`,
      name: w,
      districtId: d.id
    }));
  }
}

function regionOf(provinceId) {
  const p = provinces.find((x) => x.id === Number(provinceId));
  return p ? p.region : 'UNKNOWN';
}

module.exports = {
  provinces,
  districtsByProvince,
  wardsByDistrict,
  provinceOfDistrict,
  regionOf
};
