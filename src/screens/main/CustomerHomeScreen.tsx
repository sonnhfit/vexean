import { ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { MainTabParamList, RootStackParamList } from '../../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];
type CustomerHomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'CustomerHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type OdooCargoBookingResponse = {
  id: number;
  name: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  delivery_location: string;
  cargo_description: string;
  state: string;
};

type MapAddressSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export function CustomerHomeScreen() {
  const navigation = useNavigation<CustomerHomeNavigation>();
  const user = useAppSelector(state => state.auth.user);
  const defaultPhone = user?.phone_number || '';
  const displayName =
    user?.full_name || user?.first_name || user?.username || 'Quý khách';

  const [cargoSenderPhone, setCargoSenderPhone] = useState(defaultPhone);
  const [cargoReceiverName, setCargoReceiverName] = useState('');
  const [cargoReceiverPhone, setCargoReceiverPhone] = useState('');
  const [cargoRoute, setCargoRoute] = useState('');
  const [cargoNote, setCargoNote] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<
    MapAddressSuggestion[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [cargoSubmitting, setCargoSubmitting] = useState(false);

  useEffect(() => {
    const query = cargoRoute.trim();
    if (!addressFocused || query.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAddressLoading(true);
      setAddressError(null);

      try {
        const params = new URLSearchParams({
          format: 'json',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'vn',
          q: query,
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'vi',
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Không lấy được gợi ý bản đồ.');
        }

        const data = (await response.json()) as MapAddressSuggestion[];
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch (suggestionError) {
        if (
          suggestionError instanceof Error &&
          suggestionError.name === 'AbortError'
        ) {
          return;
        }

        setAddressSuggestions([]);
        setAddressError('Không tải được gợi ý địa chỉ.');
      } finally {
        setAddressLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [addressFocused, cargoRoute]);

  const submitCargoRequest = async () => {
    if (!cargoSenderPhone.trim() || !cargoReceiverPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập SĐT gửi và nhận.');
      return;
    }

    if (!cargoReceiverName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên người nhận.');
      return;
    }

    if (!cargoNote.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả hàng hoá.');
      return;
    }

    setCargoSubmitting(true);

    try {
      const data = await requestJson<OdooCargoBookingResponse>(
        '/api/nhaxe/odoo/cargo-bookings/',
        {
          method: 'POST',
          auth: true,
          logLabel: 'odoo-cargo-create',
          body: {
            sender_name: displayName,
            sender_phone: cargoSenderPhone.trim(),
            receiver_name: cargoReceiverName.trim(),
            receiver_phone: cargoReceiverPhone.trim(),
            delivery_location: cargoRoute.trim(),
            cargo_description: cargoNote.trim(),
            create_partners: true,
            payment_method: 'cash',
            payment_status: 'pending',
          },
        },
      );

      Alert.alert(
        'Gửi đồ thành công',
        `Mã đơn: ${data.name || `#${data.id}`}`,
      );
      setCargoReceiverName('');
      setCargoReceiverPhone('');
      setCargoRoute('');
      setCargoNote('');
      navigation.navigate('CustomerOrders', {
        initialPhone: cargoSenderPhone.trim(),
        refreshKey: Date.now(),
      });
    } catch (cargoError) {
      const message =
        cargoError instanceof Error
          ? cargoError.message
          : 'Không tạo được đơn gửi hàng.';
      Alert.alert('Gửi đồ thất bại', message);
    } finally {
      setCargoSubmitting(false);
    }
  };

  const selectAddressSuggestion = (suggestion: MapAddressSuggestion) => {
    setCargoRoute(suggestion.display_name);
    setAddressSuggestions([]);
    setAddressError(null);
    setAddressFocused(false);
  };

  return (
    <ScreenContainer
      title="Trang chủ"
      subtitle={`Xin chào, ${displayName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="ticket-outline"
              size={28}
              color={APP_COLORS.primaryDark}
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Đặt vé xe</Text>
            <Text style={styles.heroMeta}>Chọn chuyến, chọn ghế, xác nhận vé</Text>
          </View>
          <Pressable
            style={styles.heroButton}
            onPress={() =>
              navigation.navigate('TicketBooking', {
                initialPhone: cargoSenderPhone.trim() || defaultPhone,
                initialPassengerName: displayName,
              })
            }
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={APP_COLORS.surface}
            />
          </Pressable>
        </View>

        <View style={styles.actionGrid}>
          <QuickAction
            icon="bus-outline"
            title="Mua vé"
            text="Chọn chỗ nhanh"
            onPress={() =>
              navigation.navigate('TicketBooking', {
                initialPhone: cargoSenderPhone.trim() || defaultPhone,
                initialPassengerName: displayName,
              })
            }
          />
          <QuickAction
            icon="cube-outline"
            title="Gửi đồ"
            text="Tạo yêu cầu"
            onPress={() => {
              setCargoSenderPhone(current => current || defaultPhone);
            }}
          />
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle icon="cube-outline" title="Gửi đồ" />
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>SĐT người gửi</Text>
              <TextInput
                value={cargoSenderPhone}
                onChangeText={setCargoSenderPhone}
                placeholder="0909000000"
                placeholderTextColor={APP_COLORS.placeholder}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>SĐT người nhận</Text>
              <TextInput
                value={cargoReceiverPhone}
                onChangeText={setCargoReceiverPhone}
                placeholder="0912000000"
                placeholderTextColor={APP_COLORS.placeholder}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên người nhận</Text>
            <TextInput
              value={cargoReceiverName}
              onChangeText={setCargoReceiverName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.input}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tuyến / nơi giao</Text>
            <TextInput
              value={cargoRoute}
              onChangeText={value => {
                setCargoRoute(value);
                setAddressFocused(true);
              }}
              placeholder="Ví dụ: Hà Nội - Quảng Ninh"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.input}
              onFocus={() => setAddressFocused(true)}
            />
            {addressFocused && cargoRoute.trim().length >= 3 ? (
              <View style={styles.suggestionBox}>
                {addressLoading ? (
                  <View style={styles.suggestionStatus}>
                    <ActivityIndicator
                      color={APP_COLORS.primaryDark}
                      size="small"
                    />
                    <Text style={styles.suggestionStatusText}>
                      Đang tìm địa chỉ...
                    </Text>
                  </View>
                ) : null}
                {!addressLoading && addressError ? (
                  <Text style={styles.suggestionError}>{addressError}</Text>
                ) : null}
                {!addressLoading && !addressError
                  ? addressSuggestions.map(suggestion => (
                      <Pressable
                        key={suggestion.place_id}
                        style={styles.suggestionItem}
                        onPress={() => selectAddressSuggestion(suggestion)}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={APP_COLORS.primaryDark}
                        />
                        <Text style={styles.suggestionText} numberOfLines={2}>
                          {suggestion.display_name}
                        </Text>
                      </Pressable>
                    ))
                  : null}
              </View>
            ) : null}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ghi chú hàng</Text>
            <TextInput
              value={cargoNote}
              onChangeText={setCargoNote}
              placeholder="Tên hàng, số kiện, cân nặng"
              placeholderTextColor={APP_COLORS.placeholder}
              style={[styles.input, styles.noteInput]}
              multiline
            />
          </View>
          <Pressable
            style={[
              styles.primaryButton,
              cargoSubmitting && styles.disabledButton,
            ]}
            onPress={submitCargoRequest}
            disabled={cargoSubmitting}
          >
            {cargoSubmitting ? (
              <ActivityIndicator color={APP_COLORS.surface} size="small" />
            ) : (
              <Ionicons
                name="send-outline"
                size={16}
                color={APP_COLORS.surface}
              />
            )}
            <Text style={styles.primaryButtonText}>
              {cargoSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.trackButton}
          onPress={() =>
            navigation.navigate('CustomerOrders', {
              initialPhone: cargoSenderPhone.trim() || defaultPhone,
            })
          }
        >
          <Ionicons
            name="receipt-outline"
            size={18}
            color={APP_COLORS.primaryDark}
          />
          <Text style={styles.trackButtonText}>Theo dõi đơn hàng của tôi</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={APP_COLORS.primaryDark}
          />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={19} color={APP_COLORS.primaryDark} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  heroMeta: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.primaryLight,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    marginBottom: 8,
  },
  quickTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  quickText: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
    fontWeight: '800',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 6,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  suggestionBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
  },
  suggestionStatus: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  suggestionStatusText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionError: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  suggestionText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  trackButton: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 13,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackButtonText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
