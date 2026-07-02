import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  actOnCargo,
  CargoAction,
  cargoActions,
  createCargo,
  listCargo,
  loadCargoTracking,
} from '../../services/cargoApi';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { CargoBooking, CargoCreateInput, CargoRole, CargoState, CargoTracking } from '../../types/cargo';

const stateMeta: Record<CargoState, { label: string; color: string; bg: string }> = {
  draft: { label: 'Chờ xác nhận', color: APP_COLORS.warning, bg: APP_COLORS.warningLight },
  confirmed: { label: 'Đã xác nhận', color: APP_COLORS.info, bg: APP_COLORS.infoLight },
  picked_up: { label: 'Đã nhận hàng', color: APP_COLORS.primaryDark, bg: APP_COLORS.primaryLight },
  in_transit: { label: 'Đang vận chuyển', color: APP_COLORS.info, bg: APP_COLORS.infoLight },
  delivered: { label: 'Đã giao', color: APP_COLORS.success, bg: APP_COLORS.successLight },
  cancelled: { label: 'Đã hủy', color: APP_COLORS.danger, bg: APP_COLORS.dangerLight },
};

const actionLabels: Record<CargoAction, string> = {
  confirm: 'Xác nhận', pickup: 'Đã nhận hàng', 'start-transit': 'Bắt đầu chở',
  deliver: 'Xác nhận giao', cancel: 'Hủy kiện',
};

function currentRole(value?: string): CargoRole {
  const role = (value || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (['driver', 'taixe', 'tai_xe'].includes(role)) return 'driver';
  return 'customer';
}

function money(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;
}

function displayDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export function CargoBookingsScreen() {
  const user = useAppSelector(state => state.auth.user);
  const role = currentRole(user?.user_role?.role || user?.role);
  const [items, setItems] = useState<CargoBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CargoState | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<CargoBooking | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setItems(await listCargo(role)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được danh sách hàng hoá.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return items.filter(item => {
      if (filter !== 'all' && item.state !== filter) return false;
      if (!keyword) return true;
      return [item.name, item.sender_name, item.sender_phone, item.receiver_name,
        item.receiver_phone, item.cargo_description, item.pickup_location,
        item.delivery_location].some(value => String(value || '').toLocaleLowerCase('vi').includes(keyword));
    });
  }, [filter, items, search]);

  const updateItem = (next: CargoBooking) => {
    setItems(current => current.map(item => item.id === next.id ? next : item));
    setSelected(next);
  };

  return (
    <ScreenContainer
      title="Hàng hoá"
      subtitle={role === 'admin' ? 'Quản lý gửi hàng và hành trình vận đơn' : role === 'driver' ? 'Nhận, vận chuyển và bàn giao hàng' : 'Gửi hàng và theo dõi vận đơn của bạn'}
      headerRight={<Pressable style={styles.addButton} onPress={() => setCreating(true)}><Ionicons name="add" size={22} color={APP_COLORS.surface} /><Text style={styles.addText}>Tạo đơn</Text></Pressable>}
    >
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={APP_COLORS.placeholder} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Mã vận đơn, SĐT, người gửi..." placeholderTextColor={APP_COLORS.placeholder} />
        {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={APP_COLORS.placeholder} /></Pressable> : null}
      </View>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Filter active={filter === 'all'} label={`Tất cả (${items.length})`} onPress={() => setFilter('all')} />
          {(Object.keys(stateMeta) as CargoState[]).map(state => (
            <Filter key={state} active={filter === state} label={stateMeta[state].label}
              onPress={() => setFilter(state)} />
          ))}
        </ScrollView>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={APP_COLORS.primaryDark} />}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? <Empty loading text="Đang tải hàng hoá từ Odoo..." />
          : error ? <Empty error text={error} onRetry={() => load()} />
          : shown.length === 0 ? <Empty text="Chưa có kiện hàng phù hợp." />
          : shown.map(item => <CargoCard key={item.id} item={item} onPress={() => setSelected(item)} />)}
      </ScrollView>
      <CreateCargoModal visible={creating} role={role} userName={user?.full_name || user?.username || ''}
        userPhone={user?.phone_number || user?.user_role?.phone_number || user?.user_role?.phone || ''}
        onClose={() => setCreating(false)} onCreated={item => { setItems(current => [item, ...current]); setCreating(false); setSelected(item); }} />
      <CargoDetailModal item={selected} role={role} onClose={() => setSelected(null)} onChanged={updateItem} />
    </ScreenContainer>
  );
}

function Filter({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable style={[styles.filter, active && styles.filterActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

function CargoCard({ item, onPress }: { item: CargoBooking; onPress: () => void }) {
  const meta = stateMeta[item.state];
  return <Pressable style={styles.card} onPress={onPress}>
    <View style={styles.cardHead}><View style={styles.flex}><Text style={styles.code}>{item.name}</Text><Text style={styles.trip}>{item.trip_id?.[1] || 'Chưa gán chuyến'}</Text></View>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}><Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text></View></View>
    <Text style={styles.description} numberOfLines={2}>{item.cargo_description}</Text>
    <View style={styles.routeRow}><View style={styles.routeDot} /><View style={styles.flex}><Text style={styles.routeName}>{item.sender_name} • {item.sender_phone}</Text><Text style={styles.routePlace}>{item.pickup_location || 'Chưa có điểm lấy'}</Text></View></View>
    <View style={styles.routeRow}><Ionicons name="location" size={16} color={APP_COLORS.primaryDark} /><View style={styles.flex}><Text style={styles.routeName}>{item.receiver_name} • {item.receiver_phone}</Text><Text style={styles.routePlace}>{item.delivery_location || 'Chưa có điểm giao'}</Text></View></View>
    <View style={styles.cardFoot}><Text style={styles.small}>SL {item.quantity} • {item.weight_kg || 0} kg</Text><Text style={styles.collect}>Thu: {money(item.total_collect_amount)}</Text><Ionicons name="chevron-forward" size={18} color={APP_COLORS.placeholder} /></View>
  </Pressable>;
}

type Form = { trip: string; sender: string; senderPhone: string; pickup: string; receiver: string; receiverPhone: string; delivery: string; description: string; weight: string; quantity: string; fee: string; cod: string; note: string; fragile: boolean; pickupNow: boolean };

function CreateCargoModal({ visible, role, userName, userPhone, onClose, onCreated }: { visible: boolean; role: CargoRole; userName: string; userPhone: string; onClose: () => void; onCreated: (item: CargoBooking) => void }) {
  const initial: Form = { trip: '', sender: role === 'customer' ? userName : '', senderPhone: role === 'customer' ? userPhone : '', pickup: '', receiver: '', receiverPhone: '', delivery: '', description: '', weight: '', quantity: '1', fee: '', cod: '', note: '', fragile: false, pickupNow: role === 'driver' };
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof Form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  useEffect(() => { if (visible) setForm(initial); }, [visible, userName, userPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!form.sender.trim() || !form.senderPhone.trim() || !form.receiver.trim() || !form.receiverPhone.trim() || !form.description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đủ người gửi, người nhận, số điện thoại và mô tả hàng.'); return;
    }
    if (role === 'driver' && !Number(form.trip)) { Alert.alert('Thiếu chuyến', 'Tài xế phải nhập ID chuyến được phân công.'); return; }
    const payload: CargoCreateInput = {
      sender_name: form.sender.trim(), sender_phone: form.senderPhone.trim(), receiver_name: form.receiver.trim(), receiver_phone: form.receiverPhone.trim(), cargo_description: form.description.trim(),
      pickup_location: form.pickup.trim() || undefined, delivery_location: form.delivery.trim() || undefined,
      quantity: Math.max(1, Number(form.quantity) || 1), weight_kg: Math.max(0, Number(form.weight) || 0), is_fragile: form.fragile,
      special_instructions: form.note.trim() || undefined, cod_amount: Math.max(0, Number(form.cod) || 0), payment_method: Number(form.cod) > 0 ? 'cod' : 'cash', create_partners: true,
    };
    if (Number(form.trip)) payload.trip_id = Number(form.trip);
    if (role === 'admin') { payload.shipping_fee = Math.max(0, Number(form.fee) || 0); payload.initial_action = form.pickupNow ? 'pickup' : 'confirm'; }
    setSaving(true);
    try { onCreated(await createCargo(payload)); }
    catch (cause) { Alert.alert('Không tạo được kiện hàng', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} navigationBarTranslucent={false} onRequestClose={onClose}>
    <SafeAreaView style={styles.modal} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader title="Tạo kiện hàng" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {(role !== 'customer') && <Field label={`ID chuyến${role === 'driver' ? ' *' : ''}`} value={form.trip} onChangeText={v => set('trip', v)} keyboardType="number-pad" placeholder="Ví dụ: 7" />}
        <Text style={styles.groupTitle}>Người gửi</Text><Field label="Họ tên *" value={form.sender} onChangeText={v => set('sender', v)} /><Field label="Số điện thoại *" value={form.senderPhone} onChangeText={v => set('senderPhone', v)} keyboardType="phone-pad" /><Field label="Điểm lấy hàng" value={form.pickup} onChangeText={v => set('pickup', v)} />
        <Text style={styles.groupTitle}>Người nhận</Text><Field label="Họ tên *" value={form.receiver} onChangeText={v => set('receiver', v)} /><Field label="Số điện thoại *" value={form.receiverPhone} onChangeText={v => set('receiverPhone', v)} keyboardType="phone-pad" /><Field label="Điểm giao hàng" value={form.delivery} onChangeText={v => set('delivery', v)} />
        <Text style={styles.groupTitle}>Kiện hàng</Text><Field label="Mô tả *" value={form.description} onChangeText={v => set('description', v)} multiline /><View style={styles.twoCols}><Field wrap label="Số lượng" value={form.quantity} onChangeText={v => set('quantity', v)} keyboardType="number-pad" /><Field wrap label="Khối lượng (kg)" value={form.weight} onChangeText={v => set('weight', v)} keyboardType="decimal-pad" /></View>
        <View style={styles.twoCols}>{role === 'admin' && <Field wrap label="Cước phí (VND)" value={form.fee} onChangeText={v => set('fee', v)} keyboardType="number-pad" />}<Field wrap label="Thu hộ COD" value={form.cod} onChangeText={v => set('cod', v)} keyboardType="number-pad" /></View>
        <Field label="Lưu ý" value={form.note} onChangeText={v => set('note', v)} multiline />
        <Toggle label="Hàng dễ vỡ" value={form.fragile} onValueChange={v => set('fragile', v)} />
        {role === 'admin' && <Toggle label="Quầy đã nhận hàng" value={form.pickupNow} onValueChange={v => set('pickupNow', v)} />}
        </ScrollView>
        <View style={styles.stickyFooter}>
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={submit} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <><Ionicons name="cube-outline" size={20} color="white" /><Text style={styles.primaryText}>Tạo vận đơn</Text></>}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

function CargoDetailModal({ item, role, onClose, onChanged }: { item: CargoBooking | null; role: CargoRole; onClose: () => void; onChanged: (item: CargoBooking) => void }) {
  const [tracking, setTracking] = useState<CargoTracking | null>(null);
  const [trackingError, setTrackingError] = useState(false);
  const [acting, setActing] = useState<CargoAction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  useEffect(() => {
    setTracking(null); setTrackingError(false); setCancelReason('');
    if (item) loadCargoTracking(item.id).then(setTracking).catch(() => setTrackingError(true));
  }, [item]);
  if (!item) return null;
  const actions = cargoActions(item.state, role);
  const run = async (action: CargoAction) => {
    if (action === 'cancel' && !cancelReason.trim()) { Alert.alert('Cần lý do hủy', 'Vui lòng nhập lý do hủy kiện hàng.'); return; }
    setActing(action);
    try { const next = await actOnCargo(item, action, cancelReason.trim()); onChanged(next); if (action === 'cancel') setCancelReason(''); }
    catch (cause) { Alert.alert('Không cập nhật được', cause instanceof Error ? cause.message : 'Vui lòng tải lại và thử lại.'); }
    finally { setActing(null); }
  };
  return <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} navigationBarTranslucent={false} onRequestClose={onClose}>
    <SafeAreaView style={styles.modal} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader title={item.name} onClose={onClose} />
        <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
      <View style={[styles.detailState, { backgroundColor: stateMeta[item.state].bg }]}><Text style={[styles.detailStateText, { color: stateMeta[item.state].color }]}>{stateMeta[item.state].label}</Text><Text style={styles.version}>Phiên bản {item.version}</Text></View>
      <DetailSection title="Hành trình"><Detail label="Chuyến" value={item.trip_id?.[1] || 'Chưa gán'} /><Detail label="Lấy hàng" value={item.pickup_location || 'Chưa cập nhật'} /><Detail label="Giao hàng" value={item.delivery_location || 'Chưa cập nhật'} /></DetailSection>
      <DetailSection title="Liên hệ"><Detail label="Người gửi" value={`${item.sender_name} • ${item.sender_phone}`} /><Detail label="Người nhận" value={`${item.receiver_name} • ${item.receiver_phone}`} /></DetailSection>
      <DetailSection title="Thông tin hàng"><Detail label="Mô tả" value={item.cargo_description} /><Detail label="Số lượng / cân nặng" value={`${item.quantity} kiện • ${item.weight_kg} kg${item.is_fragile ? ' • Dễ vỡ' : ''}`} /><Detail label="Cước phí" value={money(item.shipping_fee)} /><Detail label="COD" value={money(item.cod_amount)} /><Detail label="Tổng cần thu" value={money(item.total_collect_amount)} /></DetailSection>
      {actions.includes('cancel') && <Field label="Lý do hủy (bắt buộc khi hủy)" value={cancelReason} onChangeText={setCancelReason} placeholder="Nhập lý do..." />}
      <Text style={styles.groupTitle}>Lịch sử tracking</Text>
      {tracking ? tracking.events.map((event, index) => <View key={event.id} style={styles.timeline}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < tracking.events.length - 1 && <View style={styles.line} />}</View><View style={styles.timelineBody}><Text style={styles.timelineTitle}>{stateMeta[event.to_state]?.label || event.event_type}</Text><Text style={styles.timelineTime}>{displayDate(event.occurred_at)}{event.actor?.display_name ? ` • ${event.actor.display_name}` : ''}</Text>{event.note ? <Text style={styles.timelineNote}>{event.note}</Text> : null}</View></View>)
        : <Text style={styles.timelineEmpty}>{trackingError ? 'Backend chưa cung cấp lịch sử tracking hoặc bạn không có quyền xem.' : 'Đang tải lịch sử...'}</Text>}
        </ScrollView>
        {actions.length > 0 && <View style={styles.stickyFooter}><Text style={styles.actionHint}>Thao tác tiếp theo</Text><View style={styles.actionWrap}>{actions.map(action => <Pressable key={action} disabled={Boolean(acting)} onPress={() => run(action)} style={[styles.actionButton, action === 'cancel' && styles.cancelButton]}>{acting === action ? <ActivityIndicator size="small" color={action === 'cancel' ? APP_COLORS.danger : APP_COLORS.surface} /> : <Text style={[styles.actionText, action === 'cancel' && styles.cancelText]}>{actionLabels[action]}</Text>}</Pressable>)}</View></View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 8), paddingRight: Math.max(insets.right, 16) }]}><Text style={styles.modalTitle} numberOfLines={1}>{title}</Text><Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng"><Ionicons name="close" size={24} color={APP_COLORS.textPrimary} /></Pressable></View>;
}
function Field({ label, wrap, ...props }: { label: string; wrap?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={[styles.field, wrap && styles.fieldWrap]}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor={APP_COLORS.placeholder} /></View>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) { return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ true: APP_COLORS.primary }} /></View>; }
function DetailSection({ title, children }: React.PropsWithChildren<{ title: string }>) { return <View style={styles.detailSection}><Text style={styles.groupTitle}>{title}</Text>{children}</View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function Empty({ text, loading, error, onRetry }: { text: string; loading?: boolean; error?: boolean; onRetry?: () => void }) { return <View style={styles.empty}>{loading ? <ActivityIndicator color={APP_COLORS.primaryDark} /> : <Ionicons name={error ? 'alert-circle-outline' : 'cube-outline'} size={34} color={error ? APP_COLORS.danger : APP_COLORS.primaryDark} />}<Text style={styles.emptyText}>{text}</Text>{onRetry && <Pressable style={styles.retry} onPress={onRetry}><Text style={styles.retryText}>Thử lại</Text></Pressable>}</View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, addButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: APP_COLORS.primaryDark, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, addText: { color: 'white', fontWeight: '700', fontSize: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 45, borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'white' }, searchInput: { flex: 1, color: APP_COLORS.textPrimary, paddingVertical: 9 },
  filters: { height: 49 }, filterContent: { gap: 8, alignItems: 'center' }, filter: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'white' }, filterActive: { backgroundColor: APP_COLORS.primaryDark, borderColor: APP_COLORS.primaryDark }, filterText: { color: APP_COLORS.textSecondary, fontSize: 12 }, filterTextActive: { color: 'white', fontWeight: '700' }, list: { paddingBottom: 28, gap: 11 },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 14, padding: 14 }, cardHead: { flexDirection: 'row', alignItems: 'flex-start' }, code: { fontSize: 16, fontWeight: '800', color: APP_COLORS.textPrimary }, trip: { fontSize: 11, color: APP_COLORS.textSecondary, marginTop: 3 }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, badgeText: { fontSize: 10, fontWeight: '700' }, description: { color: APP_COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginVertical: 11 }, routeRow: { flexDirection: 'row', gap: 9, marginTop: 7 }, routeDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: APP_COLORS.primary, margin: 3 }, routeName: { color: APP_COLORS.textSecondary, fontSize: 12, fontWeight: '600' }, routePlace: { color: APP_COLORS.placeholder, fontSize: 11, marginTop: 2 }, cardFoot: { borderTopWidth: 1, borderTopColor: APP_COLORS.border, marginTop: 12, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, small: { flex: 1, color: APP_COLORS.textSecondary, fontSize: 11 }, collect: { color: APP_COLORS.success, fontWeight: '800', fontSize: 12 },
  empty: { alignItems: 'center', padding: 35, marginTop: 20, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border }, emptyText: { marginTop: 10, textAlign: 'center', color: APP_COLORS.textSecondary }, retry: { marginTop: 12, backgroundColor: APP_COLORS.primaryDark, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 }, retryText: { color: 'white', fontWeight: '700' },
  modal: { flex: 1, backgroundColor: APP_COLORS.background }, modalHeader: { minHeight: 60, paddingLeft: 16, paddingBottom: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { flex: 1, minWidth: 0, fontSize: 20, fontWeight: '800', color: APP_COLORS.textPrimary }, closeButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }, form: { padding: 16, paddingBottom: 20 }, groupTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.textPrimary, marginTop: 12, marginBottom: 9 }, field: { marginBottom: 11 }, fieldWrap: { flex: 1 }, fieldLabel: { color: APP_COLORS.textSecondary, fontSize: 12, marginBottom: 5 }, input: { minHeight: 48, borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, paddingHorizontal: 12, color: APP_COLORS.textPrimary, backgroundColor: 'white' }, multiline: { minHeight: 75, paddingTop: 11, textAlignVertical: 'top' }, twoCols: { flexDirection: 'row', gap: 10 }, toggle: { flexDirection: 'row', minHeight: 52, alignItems: 'center', justifyContent: 'space-between' }, toggleLabel: { color: APP_COLORS.textPrimary, fontWeight: '600' }, stickyFooter: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: APP_COLORS.border }, primaryButton: { minHeight: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: APP_COLORS.primaryDark }, disabled: { opacity: 0.6 }, primaryText: { color: 'white', fontWeight: '800', fontSize: 15 },
  detail: { padding: 16, paddingBottom: 24 }, detailState: { padding: 13, borderRadius: 11, flexDirection: 'row', justifyContent: 'space-between' }, detailStateText: { fontWeight: '800' }, version: { color: APP_COLORS.textSecondary, fontSize: 11 }, detailSection: { marginTop: 8, padding: 13, backgroundColor: 'white', borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 12 }, detailRow: { flexDirection: 'row', gap: 12, marginBottom: 9 }, detailLabel: { width: 105, color: APP_COLORS.placeholder, fontSize: 12 }, detailValue: { flex: 1, color: APP_COLORS.textPrimary, fontSize: 12, fontWeight: '600' }, actionHint: { color: APP_COLORS.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8 }, actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, actionButton: { flexGrow: 1, minWidth: '47%', backgroundColor: APP_COLORS.primaryDark, borderRadius: 10, paddingHorizontal: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, actionText: { color: 'white', fontWeight: '700', fontSize: 13 }, cancelButton: { backgroundColor: APP_COLORS.dangerLight, borderWidth: 1, borderColor: APP_COLORS.danger }, cancelText: { color: APP_COLORS.danger },
  timeline: { flexDirection: 'row', minHeight: 65 }, timelineRail: { width: 22, alignItems: 'center' }, timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: APP_COLORS.primaryDark, marginTop: 3 }, line: { width: 2, flex: 1, backgroundColor: APP_COLORS.border }, timelineBody: { flex: 1, paddingBottom: 16 }, timelineTitle: { fontWeight: '700', color: APP_COLORS.textPrimary, fontSize: 13 }, timelineTime: { color: APP_COLORS.placeholder, fontSize: 11, marginTop: 3 }, timelineNote: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 4 }, timelineEmpty: { color: APP_COLORS.textSecondary, paddingVertical: 15 },
});
