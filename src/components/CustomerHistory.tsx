import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { requestJson } from '../services/apiClient';

export type PreviousTicket = {
  id: number;
  booking_code: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_location: string;
  dropoff_location: string;
  created_at: string;
  status: string;
};

export function CustomerHistory({
  phone,
  onSelect,
}: {
  phone: string;
  onSelect: (ticket: PreviousTicket) => void;
}) {
  const [tickets, setTickets] = useState<PreviousTicket[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setTickets([]);
    setMessage('');
    if (phone.replace(/\D/g, '').length < 8) return;
    const timer = setTimeout(async () => {
      setMessage('Đang tìm khách cũ...');
      try {
        const result = await requestJson<{
          passenger_bookings: PreviousTicket[];
        }>(`/api/nhaxe/lookup/?phone=${encodeURIComponent(phone)}`, {
          method: 'GET',
          auth: true,
        });
        if (!active) return;
        const previous = result.passenger_bookings.filter(
          ticket => ticket.status !== 'cancelled',
        );
        setTickets(previous.slice(0, 5));
        setMessage(
          previous.length
            ? 'Khách cũ · Chọn vé để điền lại tên và điểm đón/trả'
            : 'Chưa có lịch sử vé',
        );
      } catch {
        if (active)
          setMessage('Không tải được lịch sử khách. Bạn vẫn có thể nhập vé.');
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [phone]);
  return (
    <View>
      {message ? <Text>{message}</Text> : null}
      {tickets.map(ticket => (
        <Pressable
          key={ticket.id}
          accessibilityRole="button"
          onPress={() => onSelect(ticket)}
          style={styles.card}
        >
          <Text style={styles.name}>
            {ticket.passenger_name} · {ticket.booking_code}
          </Text>
          <Text style={styles.text}>
            Đón: {ticket.pickup_location || '—'}
            {'\n'}Trả: {ticket.dropoff_location || '—'}
          </Text>
          <Text style={styles.text}>
            {new Date(ticket.created_at).toLocaleDateString('vi-VN')} · Dùng lại
            thông tin
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 10,
    marginVertical: 4,
    backgroundColor: '#fff6bd',
    borderRadius: 8,
  },
  name: { color: '#171700', fontWeight: '700' },
  text: { color: '#171700' },
});
