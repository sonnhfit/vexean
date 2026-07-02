export type CargoState =
  | 'draft'
  | 'confirmed'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type CargoRole = 'admin' | 'driver' | 'customer';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'transfer' | 'cod';
export type CargoSource = 'counter' | 'roadside_driver' | 'customer_app';
export type OdooRef = [number, string] | null;

export type CargoBooking = {
  id: number;
  name: string;
  version: number;
  source?: CargoSource;
  state: CargoState;
  trip_id: OdooRef;
  route_id: OdooRef;
  departure_time: string | null;
  sender_name: string;
  sender_phone: string;
  pickup_location: string | null;
  pickup_time: string | null;
  receiver_name: string;
  receiver_phone: string;
  delivery_location: string | null;
  cargo_description: string;
  weight_kg: number;
  quantity: number;
  is_fragile: boolean;
  special_instructions: string | null;
  shipping_fee: number;
  cod_amount: number;
  total_collect_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  pickup_confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CargoCreateInput = {
  trip_id?: number;
  sender_name: string;
  sender_phone: string;
  pickup_location?: string;
  receiver_name: string;
  receiver_phone: string;
  delivery_location?: string;
  cargo_description: string;
  weight_kg?: number;
  quantity?: number;
  is_fragile?: boolean;
  special_instructions?: string;
  shipping_fee?: number;
  cod_amount?: number;
  payment_method?: PaymentMethod;
  create_partners?: boolean;
  initial_action?: 'confirm' | 'pickup';
};

export type CargoTrackingEvent = {
  id: number;
  event_type: string;
  from_state: CargoState | null;
  to_state: CargoState;
  occurred_at: string;
  note?: string | null;
  actor?: { display_name?: string; role?: string } | null;
};

export type CargoTracking = {
  cargo_id: number;
  cargo_code: string;
  current_state: CargoState;
  events: CargoTrackingEvent[];
};
