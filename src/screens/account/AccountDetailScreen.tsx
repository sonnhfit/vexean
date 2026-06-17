import { ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDetail'>;
type IconName = ComponentProps<typeof Ionicons>['name'];
type SectionKey = RootStackParamList['AccountDetail']['section'];

type DetailItem = {
  id: string;
  title: string;
  text: string;
  icon: IconName;
  value?: string;
};

type DetailConfig = {
  title: string;
  subtitle: string;
  icon: IconName;
  heroValue: string;
  heroLabel: string;
  items: DetailItem[];
  actionLabel: string;
};

const accountDetailContent: Record<SectionKey, DetailConfig> = {
  rewards: {
    title: 'Điểm thưởng của tôi',
    subtitle: 'Tích điểm mỗi chuyến Cẩm Phả - Hà Nội cùng An Nhiên',
    icon: 'star-outline',
    heroValue: '1.240',
    heroLabel: 'điểm khả dụng',
    actionLabel: 'Đổi ưu đãi',
    items: [
      {
        id: 'earn',
        title: 'Tích điểm tự động',
        text: 'Mỗi vé Cẩm Phả - Hà Nội hoàn tất sẽ cộng điểm vào tài khoản.',
        icon: 'add-circle-outline',
        value: '+5%',
      },
      {
        id: 'next',
        title: 'Hạng thành viên',
        text: 'Còn 3 chuyến nữa để lên hạng Bạc An Nhiên.',
        icon: 'medal-outline',
      },
    ],
  },
  offers: {
    title: 'Ưu đãi',
    subtitle: 'Mã giảm giá mock dành cho khách đi tuyến Cẩm Phả - Hà Nội',
    icon: 'pricetag-outline',
    heroValue: '3',
    heroLabel: 'ưu đãi đang có',
    actionLabel: 'Lưu ưu đãi',
    items: [
      {
        id: 'morning',
        title: 'Giảm 30K chuyến sáng',
        text: 'Áp dụng cho chuyến Cẩm Phả đi Hà Nội trước 09:00.',
        icon: 'sunny-outline',
        value: '30K',
      },
      {
        id: 'round',
        title: 'Khứ hồi tiết kiệm',
        text: 'Đặt vé hai chiều Hà Nội - Cẩm Phả nhận thêm ưu đãi 5%.',
        icon: 'repeat-outline',
        value: '5%',
      },
      {
        id: 'weekend',
        title: 'Cuối tuần An Nhiên',
        text: 'Giữ giá tốt cho khách đặt trước từ 24 giờ.',
        icon: 'calendar-outline',
      },
    ],
  },
  referral: {
    title: 'Giới thiệu nhận quà',
    subtitle: 'Mời bạn bè đặt chuyến An Nhiên và nhận voucher mock',
    icon: 'gift-outline',
    heroValue: 'ANHIEN24',
    heroLabel: 'mã giới thiệu của bạn',
    actionLabel: 'Chia sẻ mã',
    items: [
      {
        id: 'friend',
        title: 'Bạn mới nhận 20K',
        text: 'Áp dụng khi đặt chuyến đầu tiên Cẩm Phả - Hà Nội.',
        icon: 'person-add-outline',
      },
      {
        id: 'you',
        title: 'Bạn nhận 20K',
        text: 'Voucher được cộng sau khi bạn bè hoàn tất chuyến đi.',
        icon: 'wallet-outline',
      },
    ],
  },
  cards: {
    title: 'Quản lý thẻ',
    subtitle: 'Lưu phương thức thanh toán để đặt vé nhanh hơn',
    icon: 'card-outline',
    heroValue: '0',
    heroLabel: 'thẻ đã lưu',
    actionLabel: 'Thêm thẻ mock',
    items: [
      {
        id: 'cash',
        title: 'Thanh toán tại văn phòng',
        text: 'Văn phòng An Nhiên Cẩm Phả và Hà Nội hỗ trợ thanh toán tiền mặt.',
        icon: 'cash-outline',
      },
      {
        id: 'transfer',
        title: 'Chuyển khoản',
        text: 'Thông tin chuyển khoản sẽ được gửi sau khi giữ chỗ thành công.',
        icon: 'swap-horizontal-outline',
      },
    ],
  },
  reviews: {
    title: 'Đánh giá chuyến đi',
    subtitle: 'Chia sẻ trải nghiệm để đội xe An Nhiên phục vụ tốt hơn',
    icon: 'create-outline',
    heroValue: '4.8',
    heroLabel: 'điểm hài lòng trung bình',
    actionLabel: 'Viết đánh giá',
    items: [
      {
        id: 'recent',
        title: 'Chuyến gần nhất',
        text: 'Cẩm Phả - Hà Nội, xe limousine 16 chỗ, khởi hành 07:30.',
        icon: 'bus-outline',
      },
      {
        id: 'reward',
        title: 'Nhận điểm thưởng',
        text: 'Hoàn tất đánh giá hợp lệ để nhận thêm 50 điểm.',
        icon: 'star-outline',
        value: '+50',
      },
    ],
  },
  settings: {
    title: 'Cài đặt',
    subtitle: 'Thiết lập trải nghiệm sử dụng ứng dụng An Nhiên',
    icon: 'settings-outline',
    heroValue: 'v8.9.51p',
    heroLabel: 'phiên bản ứng dụng',
    actionLabel: 'Lưu cài đặt',
    items: [
      {
        id: 'notify',
        title: 'Thông báo chuyến đi',
        text: 'Nhận nhắc lịch trước giờ xe Cẩm Phả - Hà Nội khởi hành.',
        icon: 'notifications-outline',
        value: 'Bật',
      },
      {
        id: 'language',
        title: 'Ngôn ngữ',
        text: 'Ứng dụng đang dùng Tiếng Việt.',
        icon: 'language-outline',
      },
    ],
  },
  support: {
    title: 'Trung tâm Hỗ trợ',
    subtitle: 'Đội ngũ An Nhiên hỗ trợ khách hàng 24/7',
    icon: 'help-circle-outline',
    heroValue: '1900 88 68',
    heroLabel: 'hotline mock',
    actionLabel: 'Gửi yêu cầu',
    items: [
      {
        id: 'route',
        title: 'Hỗ trợ tuyến Cẩm Phả - Hà Nội',
        text: 'Tra cứu điểm đón, giờ chạy, hành lý và chính sách đổi vé.',
        icon: 'map-outline',
      },
      {
        id: 'office',
        title: 'Văn phòng An Nhiên',
        text: 'Cẩm Phả: 12 Trần Phú. Hà Nội: 70 Nguyễn Hữu Huân.',
        icon: 'business-outline',
      },
    ],
  },
  feedback: {
    title: 'Góp ý',
    subtitle: 'An Nhiên lắng nghe mọi góp ý để cải thiện chuyến đi',
    icon: 'mail-outline',
    heroValue: '24h',
    heroLabel: 'thời gian phản hồi dự kiến',
    actionLabel: 'Gửi góp ý',
    items: [
      {
        id: 'quality',
        title: 'Chất lượng xe',
        text: 'Góp ý về vệ sinh xe, ghế ngồi, điều hòa hoặc tiện ích trên xe.',
        icon: 'sparkles-outline',
      },
      {
        id: 'driver',
        title: 'Tài xế và phục vụ',
        text: 'Gửi phản hồi về thái độ phục vụ, điểm đón trả và đúng giờ.',
        icon: 'people-outline',
      },
    ],
  },
  careers: {
    title: 'Cơ hội cùng An Nhiên',
    subtitle: 'Gia nhập đội ngũ vận hành tuyến Cẩm Phả - Hà Nội',
    icon: 'briefcase-outline',
    heroValue: '5',
    heroLabel: 'vị trí mock đang tuyển',
    actionLabel: 'Ứng tuyển',
    items: [
      {
        id: 'driver',
        title: 'Tài xế tuyến cố định',
        text: 'Ưu tiên ứng viên quen tuyến Quảng Ninh - Hà Nội.',
        icon: 'car-outline',
      },
      {
        id: 'operator',
        title: 'Điều hành văn phòng',
        text: 'Theo dõi lịch xe, hỗ trợ khách đặt vé và xử lý phát sinh.',
        icon: 'headset-outline',
      },
    ],
  },
  about: {
    title: 'Về An Nhiên',
    subtitle: 'Hãng xe chuyên tuyến Cẩm Phả - Hà Nội',
    icon: 'bus-outline',
    heroValue: '12+',
    heroLabel: 'chuyến mỗi ngày',
    actionLabel: 'Xem tuyến chạy',
    items: [
      {
        id: 'mission',
        title: 'Đi an tâm, về nhẹ nhàng',
        text: 'An Nhiên tập trung vận hành tuyến Cẩm Phả - Hà Nội ổn định, đúng giờ.',
        icon: 'shield-checkmark-outline',
      },
      {
        id: 'fleet',
        title: 'Dòng xe chủ lực',
        text: 'Limousine ghế ngả, xe giường nằm và xe khách chất lượng cao.',
        icon: 'bus-outline',
      },
      {
        id: 'route',
        title: 'Tuyến nổi bật',
        text: 'Cẩm Phả - Hạ Long - Hải Dương - Hà Nội và chiều ngược lại.',
        icon: 'git-branch-outline',
      },
    ],
  },
};

export function AccountDetailScreen({ route, navigation }: Props) {
  const content = accountDetailContent[route.params.section];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={APP_COLORS.surface} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{content.title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {content.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name={content.icon} size={26} color={APP_COLORS.primaryDark} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroValue}>{content.heroValue}</Text>
            <Text style={styles.heroLabel}>{content.heroLabel}</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>Tuyến chính An Nhiên</Text>
          <Text style={styles.routeText}>Cẩm Phả ⇄ Hà Nội</Text>
          <View style={styles.routeMetaRow}>
            <RouteMeta icon="time-outline" text="5h 30p" />
            <RouteMeta icon="bus-outline" text="12 chuyến/ngày" />
            <RouteMeta icon="location-outline" text="Đón trả linh hoạt" />
          </View>
        </View>

        <View style={styles.itemList}>
          {content.items.map(item => (
            <View key={item.id} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={item.icon} size={20} color={APP_COLORS.primaryDark} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
              {item.value ? <Text style={styles.infoValue}>{item.value}</Text> : null}
            </View>
          ))}
        </View>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{content.actionLabel}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteMeta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.routeMeta}>
      <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
      <Text style={styles.routeMetaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  header: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 18,
    backgroundColor: APP_COLORS.primaryDark,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: APP_COLORS.surface,
    fontSize: 21,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 4,
    color: APP_COLORS.surface,
    fontSize: 13,
    lineHeight: 18,
  },
  contentContainer: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: '#f6f7f5',
  },
  heroCard: {
    minHeight: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: APP_COLORS.surface,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroValue: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '800',
  },
  heroLabel: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  routeCard: {
    borderRadius: 10,
    padding: 16,
    backgroundColor: APP_COLORS.primaryLight,
  },
  routeTitle: {
    color: APP_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  routeText: {
    marginTop: 5,
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  routeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  routeMeta: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: APP_COLORS.surface,
  },
  routeMetaText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  itemList: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
  },
  infoRow: {
    minHeight: 78,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  infoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  infoText: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  infoValue: {
    color: APP_COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1d58a',
  },
  primaryButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
});
