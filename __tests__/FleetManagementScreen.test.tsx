import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Pressable, TextInput } from 'react-native';
import { FleetManagementScreen } from '../src/screens/main/FleetManagementScreen';
import { requestJson } from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({ requestJson: jest.fn() }));
jest.mock('../src/components/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@react-native-vector-icons/ionicons', () => 'Ionicons');

test.each([{}, { rows: [] }, false, null, '2_1'])(
  'opens the fleet list and edit form with seat_layout=%j',
  async seatLayout => {
    (requestJson as jest.Mock).mockResolvedValue({
      results: [{
        id: 1, name: 'Xe trung chuyển', license_plate: '29B-12345',
        vehicle_type: 'bus', capacity: 16, floor_count: 1,
        seat_layout: seatLayout, active: true, note: '',
      }],
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<FleetManagementScreen />);
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('29B-12345');
    const editButton = renderer.root.findAllByType(Pressable).find(button =>
      button.findAllByType('Ionicons' as React.ElementType)
        .some(icon => icon.props.name === 'create-outline'),
    );
    expect(editButton).toBeDefined();
    await act(async () => {
      editButton!.props.onPress({ stopPropagation: jest.fn() });
    });
    const layoutInput = renderer.root.findAllByType(TextInput)
      .find(input => input.props.placeholder === '2_2, 2_1 hoặc 1_1');
    expect(layoutInput?.props.value).toBe(typeof seatLayout === 'string' ? seatLayout : '2_2');
    await act(async () => renderer.unmount());
  },
);
