import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AdminBookingScreen } from '../src/screens/main/AdminBookingScreen';
import { requestJson } from '../src/services/apiClient';

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal', Pressable: 'Pressable', RefreshControl: 'RefreshControl',
  ScrollView: 'ScrollView', Text: 'Text', View: 'View', TextInput: 'TextInput',
  Platform: { OS: 'ios' }, StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@react-native-vector-icons/ionicons', () => 'Ionicons');
jest.mock('../src/components/Toast', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/services/apiClient', () => ({ requestJson: jest.fn() }));

const firstTrip = { id: 1, departure_time: '2026-10-04 08:00:00', available_seats: 1, total_seats: 3 };
const secondTrip = { ...firstTrip, id: 2, departure_time: '2026-10-04 10:00:00' };
const bookedSeat = { id: 1, name: 'A1', state: 'booked', row: 0, col: 0 };
const ticket = { id: 10, name: 'VE-10', passenger_name: 'Khách đã đặt', state: 'confirmed', seat_name: 'A1' };
let renderer: Renderer.ReactTestRenderer;

beforeAll(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); jest.clearAllMocks(); });

function nextTripButton() {
  return renderer.root.findAllByType('Pressable' as React.ElementType).find(button =>
    button.findAllByType('Ionicons' as React.ElementType).some(icon => icon.props.name === 'chevron-forward' && icon.props.size === 21),
  )!;
}

test('shows booked and unassigned tickets and disables booked seats', async () => {
  (requestJson as jest.Mock).mockImplementation(async (url: string) => url.includes('/seats/') ? {
    results: [bookedSeat], tickets: [ticket, { ...ticket, id: 11, name: 'VE-11', seat_name: '' }, { ...ticket, id: 12, name: 'CANCELLED', state: 'cancelled' }],
  } : { results: [firstTrip] });
  await act(async () => { renderer = Renderer.create(<AdminBookingScreen />); });
  const output = JSON.stringify(renderer.toJSON(), (key, value) => key === 'props' ? undefined : value);
  expect(output).toContain('Đã đặt');
  expect(output).toContain('Chưa xếp ghế');
  expect(output).not.toContain('CANCELLED');
  const seat = renderer.root.findAllByType('Pressable' as React.ElementType).find(button =>
    button.findAllByType('Text' as React.ElementType).some(text => text.props.children === 'A1'),
  );
  expect(seat?.props.disabled).toBe(true);
});

test('late response from another departure cannot overwrite the selected trip', async () => {
  let resolveFirst!: (data: unknown) => void;
  (requestJson as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/1/seats/')) return new Promise(resolve => { resolveFirst = resolve; });
    if (url.includes('/2/seats/')) return Promise.resolve({ results: [{ ...bookedSeat, name: 'A2' }], tickets: [{ ...ticket, name: 'SECOND-TRIP' }] });
    return Promise.resolve({ results: [firstTrip, secondTrip] });
  });
  await act(async () => { renderer = Renderer.create(<AdminBookingScreen />); });
  await act(async () => nextTripButton().props.onPress());
  await act(async () => resolveFirst({ results: [bookedSeat], tickets: [{ ...ticket, name: 'STALE-FIRST-TRIP' }] }));
  const output = JSON.stringify(renderer.toJSON(), (key, value) => key === 'props' ? undefined : value);
  expect(output).toContain('SECOND-TRIP');
  expect(output).not.toContain('STALE-FIRST-TRIP');
});

test('refresh reloads tickets even when the trip ID stays the same', async () => {
  let calls = 0;
  (requestJson as jest.Mock).mockImplementation(async (url: string) => {
    if (url.includes('/seats/')) return { results: [bookedSeat], tickets: ++calls === 1 ? [] : [ticket] };
    return { results: [firstTrip] };
  });
  await act(async () => { renderer = Renderer.create(<AdminBookingScreen />); });
  expect(JSON.stringify(renderer.toJSON(), (key, value) => key === 'props' ? undefined : value)).not.toContain('VE-10');
  const scroll = renderer.root.findAllByType('ScrollView' as React.ElementType)[0];
  await act(async () => scroll.props.refreshControl.props.onRefresh());
  expect(JSON.stringify(renderer.toJSON(), (key, value) => key === 'props' ? undefined : value)).toContain('VE-10');
});
