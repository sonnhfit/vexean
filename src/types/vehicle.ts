export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export type Vehicle = {
  id: number;
  license_plate: string;
  vehicle_type: number | null;
  vehicle_type_name: string;
  brand: string;
  model: string;
  year: number | null;
  seat_count: number | null;
  color: string;
  has_ac: boolean;
  has_wifi: boolean;
  has_usb: boolean;
  has_tv: boolean;
  has_toilet: boolean;
  notes: string;
  status: VehicleStatus;
  insurance_expiry: string;
  registration_expiry: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleListResponse =
  | Vehicle[]
  | {
      results?: Vehicle[];
    };
