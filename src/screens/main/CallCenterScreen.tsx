import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type PassengerBooking = {
  id: number;
  booking_code: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_location: string;
  dropoff_location: string;
  total_amount: string;
  payment_status: string;
  status: string;
  created_at: string;
};

type CargoBooking = {
  id: number;
  booking_code: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  delivery_location: string;
  shipping_fee: string;
  status: string;
  created_at: string;
};

type LookupResponse = {
  phone: string;
  passenger_bookings: PassengerBooking[];
  cargo_bookings: CargoBooking[];
};

type ViewMode = 'lookup' | 'detail';
type ScheduleType = 'appointment' | 'pickup';
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

export function CallCenterScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');
  const [isFormModalVisible, setFormModalVisible] = useState(false);
  const [activeFormType, setActiveFormType] =
    useState<ScheduleType>('appointment');

  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentNote, setAppointmentNote] = useState('');

  const [pickupName, setPickupName] = useState('');
  const [pickupTitle, setPickupTitle] = useState('');
  const [pickupDate, setPickupDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [pickupTime, setPickupTime] = useState('15:00');
  const [pickupNote, setPickupNote] = useState('');

  const totalRecords = useMemo(() => {
    if (!result) {
      return 0;
    }

    return result.passenger_bookings.length + result.cargo_bookings.length;
  }, [result]);

  const fetchLookup = async (targetPhone: string) => {
    const data = await requestJson<LookupResponse>(
      `/api/nhaxe/lookup/?phone=${encodeURIComponent(targetPhone)}`,
      {
        method: 'GET',
        auth: true,
        logLabel: 'nhaxe-lookup',
      },
    );

    setResult(data);
    setViewMode('detail');
  };

  const lookupByPhone = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setError('Vui lòng nhập số điện thoại cần tra cứu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchLookup(normalizedPhone);
    } catch (lookupError) {
      const message =
        lookupError instanceof Error
          ? lookupError.message
          : 'Tra cứu thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing || loading) {
      return;
    }

    const targetPhone =
      (viewMode === 'detail' ? result?.phone : phone)?.trim() || '';
    if (!targetPhone) {
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      await fetchLookup(targetPhone);
    } catch (lookupError) {
      const message =
        lookupError instanceof Error
          ? lookupError.message
          : 'Làm mới thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  };

  const goBackToLookup = () => {
    setViewMode('lookup');
  };

  const openFormModal = (type: ScheduleType) => {
    setActiveFormType(type);
    setFormModalVisible(true);
  };

  const openTicketBookingScreen = () => {
    const knownPhone = result?.phone || phone;
    navigation.navigate('TicketBooking', {
      initialPhone: knownPhone.trim(),
    });
  };

  const addAppointment = () => {
    if (
      !appointmentName ||
      !appointmentTitle ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return;
    }

    setAppointmentName('');
    setAppointmentTitle('');
    setAppointmentNote('');
    setFormModalVisible(false);
  };

  const addPickup = () => {
    if (!pickupName || !pickupTitle || !pickupDate || !pickupTime) {
      return;
    }

    setPickupName('');
    setPickupTitle('');
    setPickupNote('');
    setFormModalVisible(false);
  };

  if (viewMode === 'detail' && result) {
    return (
      <ScreenContainer title="Tổng Đài" subtitle="Chi tiết tra cứu khách hàng">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={APP_COLORS.primaryDark}
            />
          }
        >
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color={APP_COLORS.primaryDark}
                />
              </View>
              <Text style={styles.sectionTitle}>Thông tin tra cứu</Text>
            </View>
            <Text style={styles.metaText}>Số điện thoại: {result.phone}</Text>
            <Text style={styles.metaText}>Tổng bản ghi: {totalRecords}</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name="ticket-outline"
                  size={16}
                  color={APP_COLORS.primaryDark}
                />
              </View>
              <Text style={styles.sectionTitle}>Đặt vé Odoo</Text>
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={openTicketBookingScreen}
            >
              <View style={styles.buttonContent}>
                <Ionicons
                  name="ticket-outline"
                  size={16}
                  color={APP_COLORS.surface}
                />
                <Text style={styles.primaryButtonText}>Đặt vé</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lịch sử đặt vé hành khách</Text>
            {result.passenger_bookings.length === 0 ? (
              <Text style={styles.emptyText}>
                Không có lịch sử đặt vé hành khách.
              </Text>
            ) : (
              result.passenger_bookings.map(item => (
                <View key={`passenger-${item.id}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.booking_code}</Text>
                  <Text style={styles.itemMeta}>
                    Khách: {item.passenger_name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    SĐT: {item.passenger_phone}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Điểm đón: {item.pickup_location}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Điểm trả: {item.dropoff_location}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Thanh toán: {item.total_amount} ({item.payment_status})
                  </Text>
                  <Text style={styles.itemMeta}>Trạng thái: {item.status}</Text>
                  <Text style={styles.itemMeta}>
                    Tạo lúc: {formatDateTime(item.created_at)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lịch sử đơn hàng hoá</Text>
            {result.cargo_bookings.length === 0 ? (
              <Text style={styles.emptyText}>
                Không có lịch sử đơn hàng hoá.
              </Text>
            ) : (
              result.cargo_bookings.map(item => (
                <View key={`cargo-${item.id}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.booking_code}</Text>
                  <Text style={styles.itemMeta}>
                    Người gửi: {item.sender_name} ({item.sender_phone})
                  </Text>
                  <Text style={styles.itemMeta}>
                    Người nhận: {item.receiver_name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Nơi giao: {item.delivery_location}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Cước phí: {item.shipping_fee}
                  </Text>
                  <Text style={styles.itemMeta}>Trạng thái: {item.status}</Text>
                  <Text style={styles.itemMeta}>
                    Tạo lúc: {formatDateTime(item.created_at)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Pressable style={styles.secondaryButton} onPress={goBackToLookup}>
            <View style={styles.buttonContent}>
              <Ionicons
                name="arrow-back-outline"
                size={16}
                color={APP_COLORS.primaryDark}
              />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </View>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Tổng Đài"
      subtitle="Tra cứu lịch sử theo số điện thoại"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={APP_COLORS.primaryDark}
              />
            </View>
            <Text style={styles.sectionTitle}>Tạo lịch mới</Text>
          </View>
          <Text style={styles.sectionHint}>
            Chọn loại lịch cần thêm để mở biểu mẫu.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => openFormModal('appointment')}
            >
              <View style={styles.buttonContent}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={APP_COLORS.surface}
                />
                <Text style={styles.primaryButtonText}>
                  Thêm lịch hẹn khách
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => openFormModal('pickup')}
            >
              <View style={styles.buttonContent}>
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={APP_COLORS.primaryDark}
                />
                <Text style={styles.secondaryButtonText}>
                  Thêm lịch lấy hàng
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons
                name="ticket-outline"
                size={16}
                color={APP_COLORS.primaryDark}
              />
            </View>
            <Text style={styles.sectionTitle}>Đặt vé Odoo</Text>
          </View>
          <Text style={styles.sectionHint}>
            Chọn chuyến và bấm ghế trống để tạo vé nhanh cho khách gọi tổng đài.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={openTicketBookingScreen}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name="ticket-outline"
                size={16}
                color={APP_COLORS.surface}
              />
              <Text style={styles.primaryButtonText}>Đặt vé</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons
                name="search-outline"
                size={16}
                color={APP_COLORS.primaryDark}
              />
            </View>
            <Text style={styles.sectionTitle}>Tra cứu theo Số Điện Thoại</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.input}
              keyboardType="phone-pad"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.disabledButton]}
            disabled={loading}
            onPress={lookupByPhone}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="search" size={16} color={APP_COLORS.surface} />
              <Text style={styles.primaryButtonText}>
                {loading ? 'Đang tra cứu...' : 'Tra cứu'}
              </Text>
            </View>
          </Pressable>
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
                  name={
                    activeFormType === 'appointment'
                      ? 'calendar-outline'
                      : 'cube-outline'
                  }
                  size={16}
                  color={APP_COLORS.primaryDark}
                />
              </View>
              <Text style={styles.sectionTitle}>
                {activeFormType === 'appointment'
                  ? 'Thêm lịch hẹn khách'
                  : 'Thêm lịch trình lấy hàng'}
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
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nội dung lịch hẹn</Text>
                  <TextInput
                    value={appointmentTitle}
                    onChangeText={setAppointmentTitle}
                    placeholder="Ví dụ: Tư vấn tuyến xe"
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={styles.input}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
                    <TextInput
                      value={appointmentDate}
                      onChangeText={setAppointmentDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={APP_COLORS.placeholder}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Giờ (HH:mm)</Text>
                    <TextInput
                      value={appointmentTime}
                      onChangeText={setAppointmentTime}
                      placeholder="10:00"
                      placeholderTextColor={APP_COLORS.placeholder}
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
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={[styles.input, styles.noteInput]}
                    multiline
                  />
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={addAppointment}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="save-outline"
                      size={16}
                      color={APP_COLORS.surface}
                    />
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
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nội dung lấy hàng</Text>
                  <TextInput
                    value={pickupTitle}
                    onChangeText={setPickupTitle}
                    placeholder="Ví dụ: Lấy hàng COD quận 1"
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={styles.input}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
                    <TextInput
                      value={pickupDate}
                      onChangeText={setPickupDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={APP_COLORS.placeholder}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Giờ (HH:mm)</Text>
                    <TextInput
                      value={pickupTime}
                      onChangeText={setPickupTime}
                      placeholder="15:00"
                      placeholderTextColor={APP_COLORS.placeholder}
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
                    placeholderTextColor={APP_COLORS.placeholder}
                    style={[styles.input, styles.noteInput]}
                    multiline
                  />
                </View>

                <Pressable style={styles.primaryButton} onPress={addPickup}>
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="save-outline"
                      size={16}
                      color={APP_COLORS.surface}
                    />
                    <Text style={styles.primaryButtonText}>
                      Lưu lịch lấy hàng
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setFormModalVisible(false)}
            >
              <View style={styles.buttonContent}>
                <Ionicons
                  name="close-outline"
                  size={16}
                  color={APP_COLORS.textSecondary}
                />
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
  formGroup: {
    marginBottom: 10,
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
  sectionHint: {
    marginBottom: 10,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
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
  disabledButton: {
    opacity: 0.7,
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
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    marginBottom: 8,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  successBox: {
    borderWidth: 1,
    borderColor: APP_COLORS.successLight,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.successLight,
    marginBottom: 10,
  },
  successTitle: {
    color: APP_COLORS.success,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.primaryLight,
    marginBottom: 8,
  },
  itemTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemMeta: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
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
    maxHeight: '90%',
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
