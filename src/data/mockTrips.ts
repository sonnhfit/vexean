export type MockTrip = {
  id: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  origin: string;
  destination: string;
  operator: string;
  vehicleType: string;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  seatsLeft: number;
  rating: number;
  reviewCount: number;
  color: string;
  badge?: string;
  endsIn?: string;
  perks: string[];
};

export const mockTrips: MockTrip[] = [
  {
    id: 'hk-buslines',
    departureTime: '23:45',
    arrivalTime: '05:45',
    duration: '6h',
    origin: 'Văn phòng 70 Nguyễn Hữu Huân',
    destination: 'Văn phòng 732 Điện Biên Phủ',
    operator: 'HK BUSLINES',
    vehicleType: 'Limousine giường phòng 24 chỗ',
    price: 420000,
    originalPrice: 450000,
    discountLabel: '-7%',
    seatsLeft: 1,
    rating: 4.7,
    reviewCount: 2974,
    color: '#d97a27',
    badge: 'ƯU ĐÃI GIỜ CHÓT',
    endsIn: 'Kết thúc sau 00:30:02',
    perks: [
      'Không cần thanh toán trước',
      'Đón trả tận nơi',
      'Xác nhận chỗ ngay lập tức',
      'Theo dõi hành trình xe',
    ],
  },
  {
    id: 'futa-ha-son',
    departureTime: '23:00',
    arrivalTime: '06:10',
    duration: '7h 10p',
    origin: 'Nút giao Vạn Điểm, Thường Tín, Hà Nội',
    destination: 'Bến xe Sapa, Lào Cai',
    operator: 'FUTA HÀ SƠN',
    vehicleType: 'Limousine 24 chỗ',
    price: 450000,
    seatsLeft: 13,
    rating: 4.8,
    reviewCount: 1075,
    color: '#d9412f',
    perks: ['Không cần thanh toán trước', 'Xác nhận chỗ ngay lập tức'],
  },
  {
    id: 's-trip-viet-nam',
    departureTime: '23:31',
    arrivalTime: '06:01',
    duration: '6h 30p',
    origin: 'Văn phòng Hồng Tiến',
    destination: 'Văn phòng 697 Điện Biên Phủ',
    operator: 'S Trip Việt Nam',
    vehicleType: 'Cabin 24 Phòng',
    price: 420000,
    seatsLeft: 15,
    rating: 4.6,
    reviewCount: 832,
    color: '#c67b2c',
    perks: ['Không cần thanh toán trước', 'Đón trả tận nơi'],
  },
  {
    id: 'g8-sapa-open-tour',
    departureTime: '23:45',
    arrivalTime: '05:21',
    duration: '5h 36p',
    origin: 'Văn phòng 105 Hoàng Quốc Việt',
    destination: 'Văn phòng Sapa (Đường N2)',
    operator: 'G8 SAPA OPEN TOUR',
    vehicleType: 'Limousine giường 22 chỗ',
    price: 460000,
    originalPrice: 480000,
    discountLabel: '-5%',
    seatsLeft: 8,
    rating: 4.8,
    reviewCount: 1248,
    color: '#d6b485',
    perks: ['Không cần thanh toán trước', 'Xác nhận chỗ ngay lập tức'],
  },
];

const favoriteTripIds = new Set<string>();

export function addFavoriteTrip(tripId: string) {
  favoriteTripIds.add(tripId);
}

export function removeFavoriteTrip(tripId: string) {
  favoriteTripIds.delete(tripId);
}

export function isFavoriteTrip(tripId: string) {
  return favoriteTripIds.has(tripId);
}

export function getFavoriteTrips() {
  return mockTrips.filter(trip => favoriteTripIds.has(trip.id));
}

export function formatTripPrice(price: number) {
  return `${price.toLocaleString('vi-VN')}đ`;
}
