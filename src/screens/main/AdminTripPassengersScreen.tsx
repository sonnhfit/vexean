import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS as C } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Ticket = {
  id: number;
  name?: string;
  passenger_name?: string;
  passenger_phone?: string;
  seat_name?: string;
  total_amount?: number | string;
  payment_status?: string;
  payment_method?: string;
  state?: string;
  pickup_location?: string;
  dropoff_location?: string;
};

const stateLabels: Record<string, string> = {
  draft: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  boarded: 'Đã lên xe',
  cancelled: 'Đã huỷ',
};
const money = (value?: number | string) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

export function AdminTripPassengersScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'AdminTripPassengers'>>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await requestJson<{ results?: Ticket[] }>(
        `/api/nhaxe/odoo/my-tickets/?trip_id=${params.tripId}&limit=200`,
        { method: 'GET', auth: true, logLabel: 'admin-trip-passengers' },
      );
      if (id === requestId.current) setTickets(result.results || []);
    } catch (reason) {
      if (id === requestId.current) {
        setError(reason instanceof Error ? reason.message : 'Không tải được danh sách hành khách.');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [params.tripId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  const active = tickets.filter(t => t.state !== 'cancelled');

  const collected = (method: string) => active.filter(ticket => ticket.payment_status === 'paid' && ticket.payment_method === method).reduce((sum, ticket) => sum + Number(ticket.total_amount || 0), 0);
  const unpaid = active.filter(ticket => ['pending', 'unpaid', 'not_paid'].includes(ticket.payment_status || '')).reduce((sum, ticket) => sum + Number(ticket.total_amount || 0), 0);
  const methodLabel = (method?: string) => method === 'cash' ? 'Tiền mặt' : method === 'transfer' ? 'Chuyển khoản' : 'Chưa xác định';
  const collectionSummary = `Đã thu tiền mặt: ${money(collected('cash'))} · Đã thu chuyển khoản: ${money(collected('transfer'))} · Chưa thu: ${money(unpaid)}`;
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={tickets}
      keyExtractor={item => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading && tickets.length > 0} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.route}>{params.routeName}</Text>
          <Text style={styles.meta}>{formatTime(params.departureTime)} · {params.vehicleName}</Text>
          <Text style={styles.meta}>Tài xế: {params.driverName}</Text>
          <Text style={styles.count}>{active.length} vé hợp lệ / {tickets.length} vé</Text>
          <Text style={styles.meta}>{collectionSummary}</Text>
          {error ? <Text style={styles.empty}>{error}</Text> : null}
          <Pressable disabled={loading || Boolean(error)} onPress={async () => { try { await Share.share({ message: [params.routeName, `Tài xế: ${params.driverName}`, collectionSummary, ...active.map(ticket => `${ticket.name} · ${ticket.passenger_name} · ${ticket.passenger_phone} · Đón: ${ticket.pickup_location || '—'} · Trả: ${ticket.dropoff_location || '—'} · ${money(ticket.total_amount)} · ${methodLabel(ticket.payment_method)} · ${ticket.payment_status === 'paid' ? 'Đã thu' : ticket.payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thu'}`)].join('\n') }); } catch { setError('Không thể chia sẻ danh sách.'); } }}><Text style={styles.count}>Xuất / chia sẻ danh sách và thu tiền</Text></Pressable>
        </View>
      }
      ListEmptyComponent={
        loading ? <ActivityIndicator style={styles.center} color={C.primary} />
          : error ? <Text style={[styles.empty, { color: C.danger }]}>{error}</Text>
          : <Text style={styles.empty}>Chuyến này chưa có hành khách.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.passenger_name || '—'}</Text>
            <Text style={[styles.badge, item.state === 'cancelled' && { color: C.danger }]}>
              {stateLabels[item.state || ''] || item.state}
            </Text>
          </View>
          <Text style={styles.meta}>{item.passenger_phone} · Ghế {item.seat_name || '—'} · {item.name}</Text>
          {item.pickup_location ? <Text style={styles.stop}>Đón: {item.pickup_location}</Text> : null}
          {item.dropoff_location ? <Text style={styles.stop}>Trả: {item.dropoff_location}</Text> : null}
          <Text style={styles.meta}>{money(item.total_amount)} · {methodLabel(item.payment_method)} · {item.payment_status === 'paid' ? 'Đã thu' : item.payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thu'}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: C.background },
  content: { padding: 16, gap: 10 },
  header: { marginBottom: 6, gap: 2 },
  route: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  count: { marginTop: 6, fontWeight: '600', color: C.primaryDark },
  card: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: C.textPrimary, flexShrink: 1 },
  badge: { fontWeight: '600', color: C.primaryDark },
  stop: { backgroundColor: '#ffeb00', color: '#171700', fontSize: 17, fontWeight: '700', padding: 6, borderRadius: 5 },
  meta: { color: C.textSecondary },
  center: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: C.placeholder },
});
