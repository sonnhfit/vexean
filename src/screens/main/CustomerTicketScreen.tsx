import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { MainTabParamList } from '../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'CustomerOrders'>;
type IconName = ComponentProps<typeof Ionicons>['name'];
type OdooRelation = false | [number, string];

type OdooTicket = {
  id: number;
  name?: string;
  booking_code?: string;
  passenger_name?: string;
  passenger_phone?: string;
  state?: string;
  status?: string;
  payment_status?: string;
  price?: number | string;
  amount_total?: number | string;
  total_amount?: number | string;
  seat_id?: OdooRelation;
  trip_id?: OdooRelation;
  route_id?: OdooRelation;
  vehicle_id?: OdooRelation;
  departure_time?: string;
  arrival_time?: string;
  pickup_location?: string;
  dropoff_location?: string;
  created_at?: string;
  create_date?: string;
  trip?: {
    name?: string;
    departure_time?: string;
    arrival_time?: string;
    route?: {
      name?: string;
      origin?: string;
      destination?: string;
    };
    vehicle?: {
      name?: string;
      license_plate?: string;
    };
  };
  route?: {
    name?: string;
    origin?: string;
    destination?: string;
  };
  vehicle?: {
    name?: string;
    license_plate?: string;
  };
};

type OdooTicketListResponse = OdooTicket[] | {
  phone?: string;
  results?: OdooTicket[];
};

const ticketSteps = ['Đã đặt', 'Xác nhận', 'Chờ đi', 'Hoàn tất'];

function relationName(value: OdooRelation | undefined) {
  return Array.isArray(value) ? value[1] : '';
}

function parseOdooDateTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string | undefined) {
  const date = parseOdooDateTime(value);
  if (!value) {
    return 'Chưa cập nhật';
  }
  if (!date) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount) || amount <= 0) {
    return 'Chưa cập nhật';
  }

  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
}

function normalizeStatus(value: string | undefined) {
  return (value || '').toLowerCase().replace(/\s+/g, '_');
}

function getTicketStepIndex(status: string | undefined) {
  const normalized = normalizeStatus(status);
  if (
    normalized.includes('done') ||
    normalized.includes('complete') ||
    normalized.includes('used')
  ) {
    return 3;
  }
  if (
    normalized.includes('boarding') ||
    normalized.includes('waiting') ||
    normalized.includes('ready')
  ) {
    return 2;
  }
  if (
    normalized.includes('confirm') ||
    normalized.includes('book') ||
    normalized.includes('paid')
  ) {
    return 1;
  }
  return 0;
}

function getRouteName(ticket: OdooTicket) {
  if (ticket.route?.origin && ticket.route?.destination) {
    return `${ticket.route.origin} - ${ticket.route.destination}`;
  }
  if (ticket.trip?.route?.origin && ticket.trip.route.destination) {
    return `${ticket.trip.route.origin} - ${ticket.trip.route.destination}`;
  }

  return (
    ticket.route?.name ||
    ticket.trip?.route?.name ||
    relationName(ticket.route_id) ||
    'Chưa cập nhật tuyến'
  );
}

function getVehicleName(ticket: OdooTicket) {
  return (
    ticket.vehicle?.license_plate ||
    ticket.trip?.vehicle?.license_plate ||
    ticket.vehicle?.name ||
    ticket.trip?.vehicle?.name ||
    relationName(ticket.vehicle_id) ||
    'Chưa cập nhật xe'
  );
}

function getTripName(ticket: OdooTicket) {
  return (
    ticket.trip?.name ||
    relationName(ticket.trip_id) ||
    getRouteName(ticket)
  );
}

function getDepartureTime(ticket: OdooTicket) {
  return (
    ticket.departure_time ||
    ticket.trip?.departure_time ||
    ticket.created_at ||
    ticket.create_date
  );
}

function getTicketPrice(ticket: OdooTicket) {
  return ticket.price || ticket.amount_total || ticket.total_amount;
}

export function CustomerTicketScreen({ route }: Props) {
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<OdooTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accountPhone, setAccountPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const status = normalizeStatus(ticket.state || ticket.status);
      return !status.includes('cancel');
    }).length;
  }, [tickets]);

  const loadTickets = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: '100',
        });
        const searchTerm = search.trim();
        if (searchTerm) {
          params.set('search', searchTerm);
        }
        const data = await requestJson<OdooTicketListResponse>(
          `/api/nhaxe/odoo/my-tickets/?${params.toString()}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-my-tickets',
          },
        );

        setTickets(Array.isArray(data) ? data : data.results || []);
        setAccountPhone(Array.isArray(data) ? '' : data.phone || '');
      } catch (ticketError) {
        const message =
          ticketError instanceof Error
            ? ticketError.message
            : 'Không tải được vé từ Odoo.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search],
  );

  useEffect(() => {
    loadTickets('initial');
    // Search text should only submit when the user presses search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.refreshKey]);

  return (
    <ScreenContainer title="Đơn hàng">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTickets('refresh')}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="call-outline"
              size={17}
              color={APP_COLORS.textSecondary}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm mã vé, tên khách, ghi chú"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => loadTickets('initial')}
            />
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => loadTickets('initial')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={APP_COLORS.surface} size="small" />
            ) : (
              <Ionicons name="search" size={17} color={APP_COLORS.surface} />
            )}
          </Pressable>
        </View>

        {error ? (
          <FeedbackCard
            icon="alert-circle-outline"
            title="Không tải được vé"
            text={error}
            tone="danger"
          />
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="ticket-outline"
              size={24}
              color={APP_COLORS.primaryDark}
            />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>{tickets.length} vé đã tìm thấy</Text>
            <Text style={styles.summaryText}>
              {activeTickets} vé đang hiệu lực
              {accountPhone ? ` - SĐT: ${accountPhone}` : ''}
            </Text>
          </View>
        </View>

        {!loading && !error && tickets.length === 0 ? (
          <FeedbackCard
            icon="ticket-outline"
            title="Chưa có vé"
            text="Khi bạn đặt vé, thông tin ghế và chuyến đi sẽ hiển thị tại đây."
          />
        ) : null}

        {tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function FeedbackCard({
  icon,
  title,
  text,
  tone = 'primary',
}: {
  icon: IconName;
  title: string;
  text: string;
  tone?: 'primary' | 'danger';
}) {
  return (
    <View style={styles.feedbackCard}>
      <Ionicons
        name={icon}
        size={24}
        color={tone === 'danger' ? APP_COLORS.danger : APP_COLORS.primaryDark}
      />
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackText}>{text}</Text>
    </View>
  );
}

function TicketCard({ ticket }: { ticket: OdooTicket }) {
  const status = ticket.state || ticket.status || 'draft';
  const seatName = relationName(ticket.seat_id) || 'Chưa cập nhật';
  const code = ticket.name || ticket.booking_code || `Vé #${ticket.id}`;

  return (
    <View style={styles.ticketCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Ionicons
            name="ticket-outline"
            size={20}
            color={APP_COLORS.primaryDark}
          />
          <View style={styles.cardTitleTextWrap}>
            <Text style={styles.cardTitle}>{code}</Text>
            <Text style={styles.cardMeta}>{getTripName(ticket)}</Text>
          </View>
        </View>
        <Text style={styles.badgeText}>{status}</Text>
      </View>

      <View style={styles.mainInfoRow}>
        <InfoPill icon="bus-outline" label={getRouteName(ticket)} />
        <InfoPill icon="location-outline" label={`Ghế ${seatName}`} />
      </View>

      <View style={styles.timeline}>
        {ticketSteps.map((step, index) => {
          const active = index <= getTicketStepIndex(status);
          return (
            <View key={step} style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  active && styles.timelineDotActive,
                ]}
              />
              <Text
                style={[
                  styles.timelineText,
                  active && styles.timelineTextActive,
                ]}
                numberOfLines={2}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.detailGrid}>
        <DetailItem
          icon="person-outline"
          label="Hành khách"
          value={ticket.passenger_name || 'Chưa cập nhật'}
        />
        <DetailItem
          icon="call-outline"
          label="Số điện thoại"
          value={ticket.passenger_phone || 'Chưa cập nhật'}
        />
        <DetailItem
          icon="time-outline"
          label="Giờ đi"
          value={formatDateTime(getDepartureTime(ticket))}
        />
        <DetailItem
          icon="car-outline"
          label="Xe"
          value={getVehicleName(ticket)}
        />
        <DetailItem
          icon="cash-outline"
          label="Giá vé"
          value={formatMoney(getTicketPrice(ticket))}
        />
        <DetailItem
          icon="card-outline"
          label="Thanh toán"
          value={ticket.payment_status || 'Chưa cập nhật'}
        />
      </View>

      {ticket.pickup_location || ticket.dropoff_location ? (
        <View style={styles.locationBox}>
          {ticket.pickup_location ? (
            <Text style={styles.locationText}>
              Đón: {ticket.pickup_location}
            </Text>
          ) : null}
          {ticket.dropoff_location ? (
            <Text style={styles.locationText}>
              Trả: {ticket.dropoff_location}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function InfoPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={15} color={APP_COLORS.primaryDark} />
      <Text style={styles.infoPillText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={15} color={APP_COLORS.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  searchCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    gap: 7,
  },
  feedbackTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  ticketCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  cardMeta: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  badgeText: {
    color: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  mainInfoRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  infoPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoPillText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  timeline: {
    marginTop: 13,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 6,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  timelineDotActive: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryDark,
  },
  timelineText: {
    color: APP_COLORS.placeholder,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  timelineTextActive: {
    color: APP_COLORS.textPrimary,
  },
  detailGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    width: '48%',
    minHeight: 74,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 9,
    backgroundColor: APP_COLORS.background,
  },
  detailLabel: {
    marginTop: 4,
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  detailValue: {
    marginTop: 3,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  locationBox: {
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.primaryLight,
    gap: 4,
  },
  locationText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});
