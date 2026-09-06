import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type Relation = false | [number, string];

type DriverTrip = {
  id: number;
  name?: string;
  state?: string;
  assignment_role?: 'driver' | 'co_driver' | string;
  departure_time?: string;
  arrival_time?: string;
  route_id?: Relation;
  vehicle_id?: Relation;
  route?: {
    name?: string;
    origin?: string;
    destination?: string;
  };
  vehicle?: {
    name?: string;
    license_plate?: string;
  };
  passenger_pickup_schedule?: DriverPassenger[];
  cargo_to_pickup?: DriverCargo[];
  summary?: DriverTripSummary;
};

type DriverPassenger = {
  id?: number;
  ticket_id?: number;
  passenger_name?: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  phone_number?: string;
  seat?: string;
  seat_name?: string;
  seat_number?: string | number;
  pickup_location?: string;
  pickup_time?: string;
  dropoff_location?: string;
  state?: string;
  checkin_time?: string | false | null;
  checkout_time?: string | false | null;
  price?: number | string;
  total_amount?: number | string;
  payment_method?: 'cash' | 'transfer' | string;
  payment_status?: string;
  note?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  cancelled_reason?: string;
};

type DriverCargo = {
  id?: number;
  name?: string;
  code?: string;
  sender_name?: string;
  receiver_name?: string;
  pickup_location?: string;
  state?: string;
};

type DriverTripSummary = {
  passenger_count?: number;
  total_passengers?: number;
  checked_in_count?: number;
  checked_out_count?: number;
  cargo_to_pickup_count?: number;
};

type TripListResponse =
  | DriverTrip[]
  | { results?: DriverTrip[]; trips?: DriverTrip[] };
type TripDetailResponse = DriverTrip | { trip?: DriverTrip };
type PaymentResponse = {
  ticket?: DriverPassenger;
  payment_method?: 'cash' | 'transfer';
  qr_code_url?: string;
  amount?: number;
  transfer_note?: string;
};

const ACTIVE_STATES = 'confirmed,boarding,running';
const CANCELLATION_REASONS = [
  'Khách đổi lịch',
  'Khách không nghe máy',
  'Khách không có mặt tại điểm đón',
  'Khách đã đi xe khác',
  'Khách báo không đi',
];

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isToday(date: Date) {
  return formatQueryDate(date) === formatQueryDate(new Date());
}

function parseDate(value?: string | false | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(
    value.includes(' ') ? value.replace(' ', 'T') : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string | false | null) {
  const date = parseDate(value);
  if (!date) {
    return 'Chưa cập nhật';
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relationName(value?: Relation) {
  return Array.isArray(value) ? value[1] : '';
}

function getRouteName(trip: DriverTrip) {
  if (trip.route?.origin && trip.route?.destination) {
    return `${trip.route.origin} → ${trip.route.destination}`;
  }
  return (
    trip.route?.name ||
    relationName(trip.route_id) ||
    trip.name ||
    `Chuyến #${trip.id}`
  );
}

function getVehicleName(trip: DriverTrip) {
  return (
    trip.vehicle?.license_plate ||
    trip.vehicle?.name ||
    relationName(trip.vehicle_id) ||
    'Chưa phân xe'
  );
}

function normalizeTrips(data: TripListResponse) {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results || data.trips || [];
}

function normalizeTripDetail(data: TripDetailResponse) {
  return 'trip' in data && data.trip ? data.trip : (data as DriverTrip);
}

function passengerId(passenger: DriverPassenger) {
  return passenger.ticket_id || passenger.id;
}

function passengerName(passenger: DriverPassenger) {
  return (
    passenger.passenger_name ||
    passenger.customer_name ||
    passenger.name ||
    'Hành khách'
  );
}

function passengerSeat(passenger: DriverPassenger) {
  return (
    passenger.seat_name ||
    passenger.seat ||
    passenger.seat_number ||
    'Chưa xếp ghế'
  );
}

function stateLabel(state?: string) {
  const labels: Record<string, string> = {
    draft: 'Nháp',
    confirmed: 'Đã xác nhận',
    boarding: 'Đang đón khách',
    running: 'Đang chạy',
    done: 'Hoàn thành',
    boarded: 'Đã lên xe',
  };
  return state ? labels[state] || state : 'Chưa cập nhật';
}

function formatDepartureTime(value?: string) {
  const date = parseDate(value);
  return date
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
}

function formatMoney(value?: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '0k';
  }
  return `${Math.round(amount / 1000)}k`;
}

function SwipeToCancelRow({
  children,
  onCancel,
}: PropsWithChildren<{ onCancel: () => void }>) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.max(-116, Math.min(0, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(translateX, {
          toValue: gesture.dx < -52 ? -116 : 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <Pressable style={styles.cancelReveal} onPress={onCancel}>
        <Ionicons name="close-circle-outline" size={22} color={APP_COLORS.surface} />
        <Text style={styles.cancelRevealText}>Khách đã huỷ</Text>
      </Pressable>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function DriverTripsScreen() {
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<DriverTrip | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'waiting' | 'picked'>('waiting');
  const [paymentPassenger, setPaymentPassenger] =
    useState<DriverPassenger | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [qrPayment, setQrPayment] = useState<PaymentResponse | null>(null);
  const [pickupPassenger, setPickupPassenger] =
    useState<DriverPassenger | null>(null);
  const [cancelPassenger, setCancelPassenger] =
    useState<DriverPassenger | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const scheduleDate = formatQueryDate(selectedDate);
  const tripListRequestId = useRef(0);

  const changeDateBy = (numberOfDays: number) => {
    setShowDatePicker(false);
    setSelectedDate(currentDate => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + numberOfDays);
      return nextDate;
    });
  };

  const onDatePickerChange = (
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type !== 'dismissed' && date) {
        setSelectedDate(date);
      }
    } else if (date) {
      setPickerDate(date);
    }
  };

  const loadTrips = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const requestId = ++tripListRequestId.current;
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date_from: scheduleDate,
          date_to: scheduleDate,
          states: ACTIVE_STATES,
          limit: '200',
        });
        const data = await requestJson<TripListResponse>(
          `/api/nhaxe/odoo/driver/me/trips/?${params.toString()}`,
          { method: 'GET', auth: true, logLabel: 'driver-my-trips' },
        );
        if (requestId === tripListRequestId.current) {
          setTrips(normalizeTrips(data));
        }
      } catch (loadError) {
        if (requestId === tripListRequestId.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không tải được chuyến của bạn.',
          );
        }
      } finally {
        if (requestId === tripListRequestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [scheduleDate],
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const loadTripDetail = useCallback(async (tripId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await requestJson<TripDetailResponse>(
        `/api/nhaxe/odoo/driver/me/trips/${tripId}/`,
        { method: 'GET', auth: true, logLabel: 'driver-trip-detail' },
      );
      setSelectedTrip(normalizeTripDetail(data));
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : 'Không tải được chi tiết chuyến.',
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openTrip = (trip: DriverTrip) => {
    setDetailTab('waiting');
    setSelectedTrip(trip);
    loadTripDetail(trip.id);
  };

  const choosePaymentMethod = async (paymentMethod: 'cash' | 'transfer') => {
    const ticketId = paymentPassenger && passengerId(paymentPassenger);
    if (!selectedTrip || !ticketId) {
      return;
    }
    setPaymentLoading(true);
    setPaymentError(null);
    setQrPayment(null);
    try {
      const data = await requestJson<PaymentResponse>(
        `/api/nhaxe/odoo/driver/me/trips/${selectedTrip.id}/passengers/${ticketId}/payment/`,
        {
          method: 'POST',
          auth: true,
          body: { payment_method: paymentMethod },
          logLabel: 'driver-passenger-payment',
        },
      );
      if (paymentMethod === 'transfer') {
        setQrPayment(data);
      } else {
        setPaymentPassenger(null);
        await loadTripDetail(selectedTrip.id);
      }
    } catch (paymentRequestError) {
      setPaymentError(
        paymentRequestError instanceof Error
          ? paymentRequestError.message
          : 'Không tạo được thông tin thanh toán.',
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const closePayment = () => {
    setPaymentPassenger(null);
    setPaymentError(null);
    setQrPayment(null);
    if (selectedTrip) {
      loadTripDetail(selectedTrip.id);
    }
  };

  const updatePassenger = async (
    passenger: DriverPassenger,
    action: 'check-in' | 'check-out',
  ) => {
    const ticketId = passengerId(passenger);
    if (!selectedTrip || !ticketId) {
      setDetailError('Không xác định được mã vé để cập nhật.');
      return;
    }
    const key = `${ticketId}-${action}`;
    setActionKey(key);
    setDetailError(null);
    try {
      await requestJson<unknown>(
        `/api/nhaxe/odoo/driver/me/trips/${selectedTrip.id}/passengers/${ticketId}/${action}/`,
        { method: 'POST', auth: true, logLabel: `driver-passenger-${action}` },
      );
      await loadTripDetail(selectedTrip.id);
    } catch (actionError) {
      setDetailError(
        actionError instanceof Error
          ? actionError.message
          : 'Không cập nhật được hành khách.',
      );
    } finally {
      setActionKey(null);
    }
  };

  const cancelPassengerBooking = async (reason: string) => {
    const ticketId = cancelPassenger && passengerId(cancelPassenger);
    if (!selectedTrip || !ticketId) {
      return;
    }
    const key = `${ticketId}-cancel`;
    setActionKey(key);
    setDetailError(null);
    try {
      await requestJson<unknown>(
        `/api/nhaxe/odoo/driver/me/trips/${selectedTrip.id}/passengers/${ticketId}/cancel/`,
        {
          method: 'POST',
          auth: true,
          body: { reason },
          logLabel: 'driver-passenger-cancel',
        },
      );
      setCancelPassenger(null);
      await loadTripDetail(selectedTrip.id);
    } catch (cancelError) {
      setDetailError(
        cancelError instanceof Error
          ? cancelError.message
          : 'Không huỷ được vé của khách.',
      );
      setCancelPassenger(null);
    } finally {
      setActionKey(null);
    }
  };

  const callPassenger = async (phone: string) => {
    if (phone === 'Chưa có SĐT') {
      setDetailError('Khách chưa có số điện thoại.');
      return;
    }
    const normalizedPhone = phone.replace(/[^+\d]/g, '');
    try {
      await Linking.openURL(`tel:${normalizedPhone}`);
    } catch {
      setDetailError('Không mở được ứng dụng gọi điện.');
    }
  };

  const passengers = selectedTrip?.passenger_pickup_schedule || [];

  if (selectedTrip) {
    const activePassengers = passengers.filter(
      passenger => passenger.state !== 'cancelled',
    );
    const pickedUpCount =
      activePassengers.filter(
        item => Boolean(item.checkin_time) || item.state === 'boarded',
      ).length;
    const waitingCount = Math.max(0, activePassengers.length - pickedUpCount);
    const displayedPassengers = activePassengers.filter(passenger => {
      const checkedIn =
        Boolean(passenger.checkin_time) || passenger.state === 'boarded';
      return detailTab === 'picked' ? checkedIn : !checkedIn;
    });

    return (
      <SafeAreaView style={styles.detailScreen}>
        <View style={styles.detailHeader}>
          <Pressable
            accessibilityLabel="Quay lại danh sách chuyến"
            style={styles.backButton}
            onPress={() => setSelectedTrip(null)}
          >
            <Ionicons name="chevron-back" size={25} color={APP_COLORS.surface} />
          </Pressable>
          <Text style={styles.detailHeading} numberOfLines={1}>
            {formatDepartureTime(selectedTrip.departure_time)} | {pickedUpCount} đón | {waitingCount} chưa
          </Text>
          <Pressable
            accessibilityLabel="Tải lại chi tiết chuyến"
            style={styles.calendarButton}
            onPress={() => loadTripDetail(selectedTrip.id)}
          >
            <Ionicons name="refresh" size={25} color={APP_COLORS.surface} />
          </Pressable>
        </View>

        <View style={styles.detailTabs}>
          <Pressable
            style={styles.detailTab}
            onPress={() => setDetailTab('waiting')}
          >
            <Text style={[styles.detailTabText, detailTab === 'waiting' && styles.detailTabTextActive]}>
              Khách chờ đón
            </Text>
            {detailTab === 'waiting' ? <View style={styles.detailTabIndicator} /> : null}
          </Pressable>
          <Pressable style={styles.detailTab} onPress={() => setDetailTab('picked')}>
            <Text style={[styles.detailTabText, detailTab === 'picked' && styles.detailTabTextActive]}>
              Đã đón ({pickedUpCount})
            </Text>
            {detailTab === 'picked' ? <View style={styles.detailTabIndicator} /> : null}
          </Pressable>
        </View>

        {detailLoading && passengers.length === 0 ? (
          <StateCard loading message="Đang tải lịch đón khách..." />
        ) : (
          <ScrollView
            style={styles.passengerList}
            contentContainerStyle={styles.passengerListContent}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical
            refreshControl={
              <RefreshControl
                refreshing={detailLoading}
                onRefresh={() => loadTripDetail(selectedTrip.id)}
                tintColor={APP_COLORS.primaryDark}
              />
            }
          >
            <Text style={styles.tripReference} numberOfLines={1}>
              {selectedTrip.name || `Chuyến #${selectedTrip.id}`} - {getRouteName(selectedTrip)}
            </Text>
            {detailError ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{detailError}</Text></View>
            ) : null}
            {displayedPassengers.length === 0 ? (
              <Text style={styles.emptyText}>
                {detailTab === 'picked'
                  ? 'Chưa có hành khách nào đã đón.'
                  : 'Không còn hành khách chờ đón.'}
              </Text>
            ) : (
              displayedPassengers.map((passenger, index) => {
                const id = passengerId(passenger);
                const checkedIn = Boolean(passenger.checkin_time) || passenger.state === 'boarded';
                const checkedOut = Boolean(passenger.checkout_time);
                const phone = passenger.phone_number || passenger.phone || 'Chưa có SĐT';
                const row = (
                  <View style={styles.pickupRow}>
                    <View style={styles.pickupRowMain}>
                      <View style={styles.pickupInfo}>
                        <Text style={styles.pickupLocation}>
                          {passenger.pickup_location || 'Chưa cập nhật điểm đón'}
                        </Text>
                        <Pressable onPress={() => callPassenger(phone)}>
                          <Text style={styles.phoneNumber}>{phone}</Text>
                        </Pressable>
                        <Text style={styles.ticketLine}>
                          Ghế: {String(passengerSeat(passenger))}{'  '}
                          <Text style={styles.totalText}>
                            Tổng: {formatMoney(passenger.total_amount ?? passenger.price)}
                          </Text>
                        </Text>
                        <Text style={styles.passengerMeta}>
                          TC: {passengerName(passenger)}
                        </Text>
                      </View>
                      {id ? (
                        <Pressable
                          disabled={Boolean(actionKey) || checkedOut}
                          style={[
                            styles.pickupButton,
                            checkedIn && styles.dropoffButton,
                            checkedOut && styles.disabled,
                          ]}
                          onPress={() => {
                            if (checkedIn) {
                              updatePassenger(passenger, 'check-out');
                            } else {
                              setPickupPassenger(passenger);
                            }
                          }}
                        >
                          {actionKey === `${id}-${checkedIn ? 'check-out' : 'check-in'}` ? (
                            <ActivityIndicator size="small" color={APP_COLORS.surface} />
                          ) : (
                            <Text style={styles.pickupButtonText}>
                              {checkedOut ? 'Đã trả' : checkedIn ? 'Trả' : 'Đón'}
                            </Text>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.paymentButton}
                      onPress={() => {
                        setPaymentError(null);
                        setQrPayment(null);
                        setPaymentPassenger(passenger);
                      }}
                    >
                      <Ionicons name="wallet-outline" size={16} color={APP_COLORS.primaryDark} />
                      <Text style={styles.paymentButtonText}>
                        {passenger.payment_method === 'transfer'
                          ? 'Chuyển khoản'
                          : 'Chọn thanh toán'}
                        </Text>
                    </Pressable>
                  </View>
                );
                return checkedIn ? (
                  <View key={id || `${phone}-${index}`}>{row}</View>
                ) : (
                  <SwipeToCancelRow
                    key={id || `${phone}-${index}`}
                    onCancel={() => setCancelPassenger(passenger)}
                  >
                    {row}
                  </SwipeToCancelRow>
                );
              })
            )}
          </ScrollView>
        )}
        <Modal
          visible={Boolean(pickupPassenger)}
          transparent
          animationType="fade"
          onRequestClose={() => setPickupPassenger(null)}
        >
          <View style={styles.centeredOverlay}>
            <View style={styles.confirmDialog}>
              <Ionicons name="person-add-outline" size={38} color={APP_COLORS.primaryDark} />
              <Text style={styles.confirmTitle}>Xác nhận đã đón khách?</Text>
              <Text style={styles.confirmMessage}>
                {pickupPassenger ? passengerName(pickupPassenger) : ''}
              </Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.dialogCancelButton} onPress={() => setPickupPassenger(null)}>
                  <Text style={styles.dialogCancelText}>Quay lại</Text>
                </Pressable>
                <Pressable
                  style={styles.dialogConfirmButton}
                  onPress={() => {
                    if (pickupPassenger) {
                      const passenger = pickupPassenger;
                      setPickupPassenger(null);
                      updatePassenger(passenger, 'check-in');
                    }
                  }}
                >
                  <Text style={styles.dialogConfirmText}>Xác nhận đón</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={Boolean(cancelPassenger)}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelPassenger(null)}
        >
          <View style={styles.paymentOverlay}>
            <View style={styles.paymentSheet}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Lý do khách huỷ</Text>
                <Pressable onPress={() => setCancelPassenger(null)}>
                  <Ionicons name="close" size={24} color={APP_COLORS.textPrimary} />
                </Pressable>
              </View>
              <Text style={styles.paymentPassengerName}>
                {cancelPassenger ? passengerName(cancelPassenger) : ''}
              </Text>
              <View style={styles.reasonList}>
                {CANCELLATION_REASONS.map(reason => (
                  <Pressable
                    key={reason}
                    disabled={Boolean(actionKey)}
                    style={styles.reasonButton}
                    onPress={() => cancelPassengerBooking(reason)}
                  >
                    <Text style={styles.reasonText}>{reason}</Text>
                    <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
                  </Pressable>
                ))}
              </View>
              {actionKey?.endsWith('-cancel') ? (
                <ActivityIndicator style={styles.paymentLoader} color={APP_COLORS.danger} />
              ) : null}
            </View>
          </View>
        </Modal>
        <Modal
          visible={Boolean(paymentPassenger)}
          transparent
          animationType="fade"
          onRequestClose={closePayment}
        >
          <View style={styles.paymentOverlay}>
            <View style={styles.paymentSheet}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Hình thức thanh toán</Text>
                <Pressable onPress={closePayment}>
                  <Ionicons name="close" size={24} color={APP_COLORS.textPrimary} />
                </Pressable>
              </View>
              <Text style={styles.paymentPassengerName}>
                {paymentPassenger ? passengerName(paymentPassenger) : ''} ·{' '}
                {formatMoney(paymentPassenger?.total_amount ?? paymentPassenger?.price)}
              </Text>
              {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
              {qrPayment?.qr_code_url ? (
                <View style={styles.qrWrap}>
                  <Image source={{ uri: qrPayment.qr_code_url }} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrHint}>Quét mã để chuyển khoản</Text>
                  <Text style={styles.transferNote}>Nội dung: {qrPayment.transfer_note}</Text>
                </View>
              ) : (
                <View style={styles.paymentOptions}>
                  <Pressable
                    disabled={paymentLoading}
                    style={styles.paymentOption}
                    onPress={() => choosePaymentMethod('cash')}
                  >
                    <Ionicons name="cash-outline" size={27} color={APP_COLORS.success} />
                    <Text style={styles.paymentOptionText}>Tiền mặt</Text>
                  </Pressable>
                  <Pressable
                    disabled={paymentLoading}
                    style={styles.paymentOption}
                    onPress={() => choosePaymentMethod('transfer')}
                  >
                    <Ionicons name="qr-code-outline" size={27} color={APP_COLORS.info} />
                    <Text style={styles.paymentOptionText}>Chuyển khoản</Text>
                  </Pressable>
                </View>
              )}
              {paymentLoading ? <ActivityIndicator style={styles.paymentLoader} color={APP_COLORS.primaryDark} /> : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <>
      <ScreenContainer
        title="Chuyến của tôi"
        subtitle={`Lịch phân công ${formatDisplayDate(selectedDate)}`}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTrips('refresh')}
              tintColor={APP_COLORS.primaryDark}
            />
          }
        >
          <View style={styles.dateFilter}>
            <Pressable
              accessibilityLabel="Xem ngày trước"
              style={styles.dateArrowButton}
              onPress={() => changeDateBy(-1)}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={APP_COLORS.primaryDark}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Chọn ngày xem lịch chuyến"
              style={styles.datePickerButton}
              onPress={() => {
                setPickerDate(selectedDate);
                setShowDatePicker(true);
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={APP_COLORS.primaryDark}
              />
              <View>
                <Text style={styles.datePickerLabel}>
                  {isToday(selectedDate) ? 'Hôm nay' : 'Ngày đã chọn'}
                </Text>
                <Text style={styles.datePickerValue}>
                  {selectedDate.toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel="Xem ngày tiếp theo"
              style={styles.dateArrowButton}
              onPress={() => changeDateBy(1)}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={APP_COLORS.primaryDark}
              />
            </Pressable>
          </View>
          {showDatePicker ? (
            Platform.OS === 'ios' ? (
              <View style={styles.iosDatePickerCard}>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  locale="vi-VN"
                  onChange={onDatePickerChange}
                />
                <View style={styles.iosDatePickerActions}>
                  <Pressable
                    style={styles.datePickerActionButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>Huỷ</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.datePickerActionButton,
                      styles.datePickerConfirmButton,
                    ]}
                    onPress={() => {
                      setSelectedDate(pickerDate);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerConfirmText}>Xem chuyến</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDatePickerChange}
              />
            )
          ) : null}
          {loading ? (
            <StateCard loading message="Đang tải lịch chuyến..." />
          ) : error ? (
            <StateCard message={error} error onRetry={() => loadTrips()} />
          ) : trips.length === 0 ? (
            <StateCard
              message={`Bạn chưa được phân công chuyến nào ngày ${selectedDate.toLocaleDateString(
                'vi-VN',
              )}.`}
            />
          ) : (
            trips.map(trip => (
              <Pressable
                key={trip.id}
                style={styles.tripCard}
                onPress={() => openTrip(trip)}
              >
                <View style={styles.tripHeader}>
                  <View style={styles.tripTitleWrap}>
                    <Text style={styles.tripTitle}>{getRouteName(trip)}</Text>
                    <Text style={styles.tripCode}>
                      {trip.name || `Chuyến #${trip.id}`}
                    </Text>
                  </View>
                  <View style={styles.stateBadge}>
                    <Text style={styles.stateBadgeText}>
                      {stateLabel(trip.state)}
                    </Text>
                  </View>
                </View>
                <InfoLine
                  icon="time-outline"
                  text={`Khởi hành: ${formatDateTime(trip.departure_time)}`}
                />
                <InfoLine
                  icon="bus-outline"
                  text={`Xe: ${getVehicleName(trip)}`}
                />
                <InfoLine
                  icon="person-outline"
                  text={
                    trip.assignment_role === 'co_driver'
                      ? 'Phân công: Phụ xe'
                      : 'Phân công: Tài xế chính'
                  }
                />
                <View style={styles.detailLink}>
                  <Text style={styles.detailLinkText}>Xem lịch đón khách</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={APP_COLORS.primaryDark}
                  />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </ScreenContainer>

    </>
  );
}

function InfoLine({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={16} color={APP_COLORS.textSecondary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function StateCard({
  message,
  loading,
  error,
  onRetry,
}: {
  message: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      {loading ? (
        <ActivityIndicator color={APP_COLORS.primaryDark} />
      ) : (
        <Ionicons
          name={error ? 'alert-circle-outline' : 'calendar-outline'}
          size={30}
          color={error ? APP_COLORS.danger : APP_COLORS.primaryDark}
        />
      )}
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detailScreen: { flex: 1, backgroundColor: APP_COLORS.surface },
  detailHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primary,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: APP_COLORS.primaryDark,
  },
  detailHeading: {
    flex: 1,
    paddingHorizontal: 10,
    color: APP_COLORS.surface,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTabs: {
    height: 56,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dedede',
    backgroundColor: APP_COLORS.surface,
  },
  detailTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detailTabText: { color: '#999999', fontSize: 17, fontWeight: '700' },
  detailTabTextActive: { color: '#9650ec' },
  detailTabIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: '#9650ec',
  },
  passengerList: { flex: 1, backgroundColor: '#fbfbfd' },
  passengerListContent: { paddingBottom: 28 },
  tripReference: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    backgroundColor: '#f4f3f8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0dfe4',
  },
  pickupRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  swipeContainer: { overflow: 'hidden', backgroundColor: APP_COLORS.danger },
  cancelReveal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 116,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: APP_COLORS.danger,
  },
  cancelRevealText: {
    paddingHorizontal: 6,
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickupRowMain: { flexDirection: 'row', alignItems: 'center' },
  pickupInfo: { flex: 1, paddingRight: 10 },
  pickupLocation: {
    color: '#f23d72',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  phoneNumber: {
    alignSelf: 'flex-start',
    marginTop: 4,
    color: APP_COLORS.info,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
  },
  ticketLine: {
    marginTop: 2,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  pickupButton: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: APP_COLORS.success,
  },
  dropoffButton: { backgroundColor: APP_COLORS.info },
  pickupButtonText: { color: APP_COLORS.surface, fontSize: 15, fontWeight: '800' },
  passengerMainLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: 3,
  },
  phoneAndSeat: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  },
  totalText: { color: '#b63ee8', fontWeight: '700' },
  unseenText: { color: '#3199e8', fontSize: 17, fontWeight: '700' },
  passengerMeta: {
    marginTop: 2,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  compactActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  paymentButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryLight,
  },
  paymentButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  paymentSheet: {
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: APP_COLORS.surface,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentTitle: { color: APP_COLORS.textPrimary, fontSize: 19, fontWeight: '800' },
  paymentPassengerName: { marginTop: 6, color: APP_COLORS.textSecondary, fontSize: 14 },
  paymentError: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
  },
  paymentOptions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  paymentOption: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    backgroundColor: APP_COLORS.background,
  },
  paymentOptionText: { color: APP_COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  paymentLoader: { marginTop: 16 },
  qrWrap: { alignItems: 'center', marginTop: 14 },
  qrImage: { width: 280, height: 280, backgroundColor: APP_COLORS.surface },
  qrHint: { color: APP_COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  transferNote: { marginTop: 5, color: APP_COLORS.textSecondary, fontSize: 13 },
  centeredOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    backgroundColor: APP_COLORS.surface,
  },
  confirmTitle: {
    marginTop: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  confirmMessage: { marginTop: 5, color: APP_COLORS.textSecondary, fontSize: 15 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  dialogCancelButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
  },
  dialogCancelText: { color: APP_COLORS.textSecondary, fontWeight: '700' },
  dialogConfirmButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
  },
  dialogConfirmText: { color: APP_COLORS.surface, fontWeight: '800' },
  reasonList: { marginTop: 16 },
  reasonButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  reasonText: { flex: 1, color: APP_COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  mapEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: APP_COLORS.background,
  },
  mapEmptyTitle: {
    marginTop: 12,
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  mapEmptyText: {
    marginTop: 6,
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  content: { paddingBottom: 24, gap: 12 },
  dateFilter: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
  },
  dateArrowButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: APP_COLORS.primaryLight,
  },
  datePickerButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  datePickerLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  datePickerValue: {
    marginTop: 2,
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  iosDatePickerCard: {
    marginHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
  },
  iosDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
  },
  datePickerActionButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 9,
  },
  datePickerConfirmButton: { backgroundColor: APP_COLORS.primaryDark },
  datePickerCancelText: { color: APP_COLORS.textSecondary, fontWeight: '700' },
  datePickerConfirmText: { color: APP_COLORS.surface, fontWeight: '700' },
  tripCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripTitleWrap: { flex: 1, paddingRight: 8 },
  tripTitle: { color: APP_COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  tripCode: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  stateBadge: {
    backgroundColor: APP_COLORS.infoLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stateBadgeText: { color: APP_COLORS.info, fontSize: 11, fontWeight: '700' },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },
  infoText: { flex: 1, color: APP_COLORS.textSecondary, fontSize: 13 },
  detailLink: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  detailLinkText: {
    color: APP_COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  stateCard: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  stateText: {
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryText: { color: APP_COLORS.surface, fontWeight: '700' },
  modalSafeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  closeButton: { padding: 6 },
  reloadButton: { padding: 8 },
  modalTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  modalTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalContent: { padding: 16, paddingBottom: 32 },
  errorBox: {
    backgroundColor: APP_COLORS.dangerLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: APP_COLORS.danger, fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 18 },
  summaryItem: {
    flex: 1,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryLight,
  },
  summaryValue: {
    color: APP_COLORS.primaryDark,
    fontSize: 19,
    fontWeight: '800',
  },
  summaryLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 10,
    marginBottom: 12,
  },
  passengerCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  seatBadge: {
    minWidth: 44,
    height: 38,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  seatText: { color: APP_COLORS.primaryDark, fontWeight: '800', fontSize: 12 },
  passengerTitleWrap: { flex: 1, marginLeft: 10 },
  passengerName: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  passengerPhone: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryDark,
  },
  actionButtonSecondary: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.primaryDark,
  },
  actionText: { color: APP_COLORS.surface, fontSize: 13, fontWeight: '700' },
  actionTextSecondary: { color: APP_COLORS.primaryDark },
  disabled: { opacity: 0.5 },
  cargoCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 11,
    padding: 12,
    marginBottom: 9,
  },
  cargoTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  metaText: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
});
