import { requestJson } from './apiClient';
import {
  CargoBooking,
  CargoCreateInput,
  CargoRole,
  CargoState,
  CargoTracking,
  OdooRef,
} from '../types/cargo';

type CargoEnvelope = CargoBooking[] | { results?: CargoBooking[]; cargo?: CargoBooking[] };

function idempotencyKey(operation: string) {
  const uuid = `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return `cargo-${operation}-${uuid}`;
}

function ref(value: unknown): OdooRef {
  return Array.isArray(value) && typeof value[0] === 'number'
    ? [value[0], String(value[1] || '')]
    : null;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeCargo(raw: CargoBooking & Record<string, unknown>): CargoBooking {
  return {
    ...raw,
    name: raw.name || String(raw.code || raw.reference || `#${raw.id}`),
    version: number(raw.version),
    state: raw.state || 'draft',
    trip_id: ref(raw.trip_id),
    route_id: ref(raw.route_id),
    sender_name: raw.sender_name || '',
    sender_phone: raw.sender_phone || '',
    receiver_name: raw.receiver_name || '',
    receiver_phone: raw.receiver_phone || '',
    pickup_location: raw.pickup_location || null,
    delivery_location: raw.delivery_location || String(raw.dropoff_location || '') || null,
    cargo_description: raw.cargo_description || String(raw.description || ''),
    weight_kg: number(raw.weight_kg),
    quantity: number(raw.quantity) || 1,
    is_fragile: Boolean(raw.is_fragile),
    special_instructions: raw.special_instructions || null,
    shipping_fee: number(raw.shipping_fee),
    cod_amount: number(raw.cod_amount),
    total_collect_amount: number(raw.total_collect_amount) || number(raw.shipping_fee) + number(raw.cod_amount),
    payment_method: raw.payment_method || 'cash',
    payment_status: raw.payment_status || 'pending',
    departure_time: raw.departure_time || null,
    pickup_time: raw.pickup_time || null,
    pickup_confirmed_at: raw.pickup_confirmed_at || null,
    delivered_at: raw.delivered_at || null,
    cancelled_reason: raw.cancelled_reason || null,
    created_at: raw.created_at || String(raw.create_date || ''),
    updated_at: raw.updated_at || String(raw.write_date || ''),
  };
}

function listFrom(data: CargoEnvelope) {
  const rows = Array.isArray(data) ? data : data.results || data.cargo || [];
  return rows.map(item => normalizeCargo(item as CargoBooking & Record<string, unknown>));
}

export async function listCargo(role: CargoRole) {
  const today = new Date().toISOString().slice(0, 10);
  const path = role === 'customer'
    ? '/api/nhaxe/odoo/my-cargo-bookings/?limit=200'
    : role === 'driver'
      ? `/api/nhaxe/odoo/driver/me/cargo/?date_from=${today}&date_to=${today}&limit=200`
      : '/api/nhaxe/odoo/cargo-bookings/?limit=200';
  return listFrom(await requestJson<CargoEnvelope>(path, { auth: true, logLabel: `cargo-${role}` }));
}

export async function createCargo(input: CargoCreateInput) {
  const result = await requestJson<CargoBooking>('/api/nhaxe/odoo/cargo-bookings/', {
    method: 'POST', auth: true, body: input,
    headers: { 'Idempotency-Key': idempotencyKey('create') },
    logLabel: 'cargo-create',
  });
  return normalizeCargo(result as CargoBooking & Record<string, unknown>);
}

export type CargoAction = 'confirm' | 'pickup' | 'start-transit' | 'deliver' | 'cancel';

export async function actOnCargo(cargo: CargoBooking, action: CargoAction, reason?: string) {
  const result = await requestJson<CargoBooking>(
    `/api/nhaxe/odoo/cargo-bookings/${cargo.id}/${action}/`,
    {
      method: 'POST', auth: true,
      headers: { 'Idempotency-Key': idempotencyKey(action) },
      body: action === 'cancel'
        ? { version: cargo.version, reason }
        : { version: cargo.version, occurred_at: new Date().toISOString() },
      logLabel: `cargo-${action}`,
    },
  );
  return normalizeCargo(result as CargoBooking & Record<string, unknown>);
}

export function cargoActions(state: CargoState, role: CargoRole): CargoAction[] {
  if (role === 'customer') {
    return state === 'draft' || state === 'confirmed' ? ['cancel'] : [];
  }
  const actions: CargoAction[] = [];
  if (state === 'draft') actions.push('confirm', 'pickup');
  if (state === 'confirmed') actions.push('pickup');
  if (state === 'picked_up') actions.push('start-transit', 'deliver');
  if (state === 'in_transit') actions.push('deliver');
  if (role === 'admin' && state !== 'delivered' && state !== 'cancelled') actions.push('cancel');
  return actions;
}

export function loadCargoTracking(id: number) {
  return requestJson<CargoTracking>(`/api/nhaxe/odoo/cargo-bookings/${id}/tracking/`, {
    auth: true, logLabel: 'cargo-tracking',
  });
}
