import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

type ScheduleType = 'appointment' | 'pickup';
type FilterMode = 'all' | 'day' | 'month';

type ScheduleItem = {
  id: string;
  type: ScheduleType;
  title: string;
  customerName: string;
  note?: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm
};

const initialSchedules: ScheduleItem[] = [
  {
    id: 'AP-1001',
    type: 'appointment',
    title: 'Tư vấn vé tuyến SGN → ĐL',
    customerName: 'Lê Thanh Nam',
    note: 'Khách muốn đặt 4 ghế cuối tuần',
    date: '2026-06-11',
    time: '09:30',
  },
  {
    id: 'PK-1002',
    type: 'pickup',
    title: 'Lấy hàng COD quận 3',
    customerName: 'Shop Minh Hương',
    note: '2 kiện hàng, tổng 18kg',
    date: '2026-06-11',
    time: '14:00',
  },
  {
    id: 'AP-1003',
    type: 'appointment',
    title: 'Hẹn xác nhận đổi giờ xe',
    customerName: 'Trần Hoài An',
    note: 'Đổi từ 16:00 sang 18:00',
    date: '2026-06-12',
    time: '08:45',
  },
];

function toDateTimeValue(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function CallCenterScreen() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [isFormModalVisible, setFormModalVisible] = useState(false);
  const [activeFormType, setActiveFormType] = useState<ScheduleType>('appointment');

  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('2026-06-11');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentNote, setAppointmentNote] = useState('');

  const [pickupName, setPickupName] = useState('');
  const [pickupTitle, setPickupTitle] = useState('');
  const [pickupDate, setPickupDate] = useState('2026-06-11');
  const [pickupTime, setPickupTime] = useState('15:00');
  const [pickupNote, setPickupNote] = useState('');

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterDate, setFilterDate] = useState('2026-06-11');
  const [filterMonth, setFilterMonth] = useState('2026-06');

  const filteredSchedules = useMemo(() => {
    let items = schedules;

    if (filterMode === 'day') {
      items = items.filter(item => item.date === filterDate);
    }

    if (filterMode === 'month') {
      items = items.filter(item => item.date.startsWith(filterMonth));
    }

    return [...items].sort((a, b) => {
      const aTime = new Date(toDateTimeValue(a.date, a.time)).getTime();
      const bTime = new Date(toDateTimeValue(b.date, b.time)).getTime();
      return aTime - bTime;
    });
  }, [schedules, filterMode, filterDate, filterMonth]);

  const addAppointment = () => {
    if (!appointmentName || !appointmentTitle || !appointmentDate || !appointmentTime) {
      return;
    }

    const newItem: ScheduleItem = {
      id: `AP-${Date.now()}`,
      type: 'appointment',
      title: appointmentTitle.trim(),
      customerName: appointmentName.trim(),
      note: appointmentNote.trim() || undefined,
      date: appointmentDate,
      time: appointmentTime,
    };

    setSchedules(prev => [newItem, ...prev]);
    setAppointmentName('');
    setAppointmentTitle('');
    setAppointmentNote('');
    setFormModalVisible(false);
  };

  const addPickup = () => {
    if (!pickupName || !pickupTitle || !pickupDate || !pickupTime) {
      return;
    }

    const newItem: ScheduleItem = {
      id: `PK-${Date.now()}`,
      type: 'pickup',
      title: pickupTitle.trim(),
      customerName: pickupName.trim(),
      note: pickupNote.trim() || undefined,
      date: pickupDate,
      time: pickupTime,
    };

    setSchedules(prev => [newItem, ...prev]);
    setPickupName('');
    setPickupTitle('');
    setPickupNote('');
    setFormModalVisible(false);
  };

  const openFormModal = (type: ScheduleType) => {
    setActiveFormType(type);
    setFormModalVisible(true);
  };

  return (
    <ScreenContainer title="Tổng Đài" subtitle="Quản lý lịch hẹn khách và lịch trình lấy hàng">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="add-circle-outline" size={16} color={APP_COLORS.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Tạo lịch mới</Text>
          </View>
          <Text style={styles.sectionHint}>Chọn loại lịch cần thêm để mở biểu mẫu.</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.primaryButton} onPress={() => openFormModal('appointment')}>
              <View style={styles.buttonContent}>
                <Ionicons name="calendar-outline" size={16} color={APP_COLORS.surface} />
                <Text style={styles.primaryButtonText}>Thêm lịch hẹn khách</Text>
              </View>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => openFormModal('pickup')}>
              <View style={styles.buttonContent}>
                <Ionicons name="cube-outline" size={16} color={APP_COLORS.primaryDark} />
                <Text style={styles.secondaryButtonText}>Thêm lịch lấy hàng</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="list-outline" size={16} color={APP_COLORS.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Lịch trình tổng đài</Text>
          </View>

          <View style={styles.filterModeRow}>
            <Pressable
              style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}
              onPress={() => setFilterMode('all')}
            >
              <Ionicons
                name="apps-outline"
                size={13}
                color={filterMode === 'all' ? APP_COLORS.primaryDark : APP_COLORS.textSecondary}
              />
              <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>Tất cả</Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, filterMode === 'day' && styles.filterChipActive]}
              onPress={() => setFilterMode('day')}
            >
              <Ionicons
                name="today-outline"
                size={13}
                color={filterMode === 'day' ? APP_COLORS.primaryDark : APP_COLORS.textSecondary}
              />
              <Text style={[styles.filterChipText, filterMode === 'day' && styles.filterChipTextActive]}>Theo ngày</Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, filterMode === 'month' && styles.filterChipActive]}
              onPress={() => setFilterMode('month')}
            >
              <Ionicons
                name="calendar-number-outline"
                size={13}
                color={filterMode === 'month' ? APP_COLORS.primaryDark : APP_COLORS.textSecondary}
              />
              <Text style={[styles.filterChipText, filterMode === 'month' && styles.filterChipTextActive]}>Theo tháng</Text>
            </Pressable>
          </View>

          {filterMode === 'day' ? (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày lọc (YYYY-MM-DD)</Text>
              <TextInput
                value={filterDate}
                onChangeText={setFilterDate}
                placeholder="2026-06-11"
                placeholderTextColor={APP_COLORS.textSecondary}
                style={styles.input}
              />
            </View>
          ) : null}

          {filterMode === 'month' ? (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tháng lọc (YYYY-MM)</Text>
              <TextInput
                value={filterMonth}
                onChangeText={setFilterMonth}
                placeholder="2026-06"
                placeholderTextColor={APP_COLORS.textSecondary}
                style={styles.input}
              />
            </View>
          ) : null}

          <View style={styles.listWrap}>
            {filteredSchedules.length === 0 ? (
              <Text style={styles.emptyText}>Không có lịch trình phù hợp bộ lọc.</Text>
            ) : (
              filteredSchedules.map(item => (
                <View key={item.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleTypeWrap}>
                      <Ionicons
                        name={item.type === 'appointment' ? 'call-outline' : 'cube-outline'}
                        size={13}
                        color={APP_COLORS.primaryDark}
                      />
                      <Text style={styles.scheduleType}>{item.type === 'appointment' ? 'Lịch hẹn khách' : 'Lịch lấy hàng'}</Text>
                    </View>
                    <View style={styles.scheduleTimeWrap}>
                      <Ionicons name="time-outline" size={12} color={APP_COLORS.textSecondary} />
                      <Text style={styles.scheduleDateTime}>{item.date} • {item.time}</Text>
                    </View>
                  </View>
                  <Text style={styles.scheduleTitle}>{item.title}</Text>
                  <Text style={styles.scheduleMeta}>Khách: {item.customerName}</Text>
                  {item.note ? <Text style={styles.scheduleMeta}>Ghi chú: {item.note}</Text> : null}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isFormModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name={activeFormType === 'appointment' ? 'calendar-outline' : 'cube-outline'}
                  size={16}
                  color={APP_COLORS.primaryDark}
                />
              </View>
              <Text style={styles.sectionTitle}>
                {activeFormType === 'appointment' ? 'Thêm lịch hẹn khách' : 'Thêm lịch trình lấy hàng'}
              </Text>
            </View>

            {activeFormType === 'appointment' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tên khách</Text>
                  <TextInput
                    value={appointmentName}
                    onChangeText={setAppointmentName}
                    placeholder="Nhập tên khách"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nội dung lịch hẹn</Text>
                  <TextInput
                    value={appointmentTitle}
                    onChangeText={setAppointmentTitle}
                    placeholder="Ví dụ: Tư vấn tuyến xe"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
                    <TextInput
                      value={appointmentDate}
                      onChangeText={setAppointmentDate}
                      placeholder="2026-06-11"
                      placeholderTextColor={APP_COLORS.textSecondary}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Giờ (HH:mm)</Text>
                    <TextInput
                      value={appointmentTime}
                      onChangeText={setAppointmentTime}
                      placeholder="10:00"
                      placeholderTextColor={APP_COLORS.textSecondary}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ghi chú</Text>
                  <TextInput
                    value={appointmentNote}
                    onChangeText={setAppointmentNote}
                    placeholder="Ghi chú thêm nếu có"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={[styles.input, styles.noteInput]}
                    multiline
                  />
                </View>

                <Pressable style={styles.primaryButton} onPress={addAppointment}>
                  <View style={styles.buttonContent}>
                    <Ionicons name="save-outline" size={16} color={APP_COLORS.surface} />
                    <Text style={styles.primaryButtonText}>Lưu lịch hẹn</Text>
                  </View>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Khách/Đơn vị gửi</Text>
                  <TextInput
                    value={pickupName}
                    onChangeText={setPickupName}
                    placeholder="Nhập tên khách hoặc đơn vị"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nội dung lấy hàng</Text>
                  <TextInput
                    value={pickupTitle}
                    onChangeText={setPickupTitle}
                    placeholder="Ví dụ: Lấy hàng COD quận 1"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
                    <TextInput
                      value={pickupDate}
                      onChangeText={setPickupDate}
                      placeholder="2026-06-11"
                      placeholderTextColor={APP_COLORS.textSecondary}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Giờ (HH:mm)</Text>
                    <TextInput
                      value={pickupTime}
                      onChangeText={setPickupTime}
                      placeholder="15:00"
                      placeholderTextColor={APP_COLORS.textSecondary}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ghi chú</Text>
                  <TextInput
                    value={pickupNote}
                    onChangeText={setPickupNote}
                    placeholder="Thông tin kiện hàng, cân nặng..."
                    placeholderTextColor={APP_COLORS.textSecondary}
                    style={[styles.input, styles.noteInput]}
                    multiline
                  />
                </View>

                <Pressable style={styles.primaryButton} onPress={addPickup}>
                  <View style={styles.buttonContent}>
                    <Ionicons name="save-outline" size={16} color={APP_COLORS.surface} />
                    <Text style={styles.primaryButtonText}>Lưu lịch lấy hàng</Text>
                  </View>
                </Pressable>
              </>
            )}

            <Pressable style={styles.modalCloseButton} onPress={() => setFormModalVisible(false)}>
              <View style={styles.buttonContent}>
                <Ionicons name="close-outline" size={16} color={APP_COLORS.textSecondary} />
                <Text style={styles.modalCloseText}>Đóng</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHint: {
    marginBottom: 10,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 6,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
  },
  noteInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  actionRow: {
    gap: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: APP_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  filterModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: APP_COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primaryLight,
    borderColor: APP_COLORS.primary,
  },
  filterChipText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: APP_COLORS.primaryDark,
  },
  listWrap: {
    marginTop: 4,
    gap: 8,
  },
  scheduleCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.primaryLight,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  scheduleTypeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  scheduleType: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  scheduleDateTime: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleTitle: {
    marginTop: 4,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleMeta: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  modalCloseButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  modalCloseText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
