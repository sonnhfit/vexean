import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMenuDetail'>;
type IconName = ComponentProps<typeof Ionicons>['name'];
type Section = RootStackParamList['AdminMenuDetail']['section'];

type SectionConfig = {
  title: string;
  description: string;
  icon: IconName;
  items: Array<{ title: string; description: string; icon: IconName }>;
};

const sections: Record<Section, SectionConfig> = {
  referral: {
    title: 'Giới thiệu An Nhiên',
    description: 'Theo dõi chương trình giới thiệu và hoa hồng của nhà xe.',
    icon: 'megaphone-outline',
    items: [
      { title: 'Mã giới thiệu', description: 'Chia sẻ mã của nhà xe với đối tác và khách hàng.', icon: 'share-social-outline' },
      { title: 'Hoa hồng', description: 'Theo dõi doanh thu và hoa hồng từ lượt giới thiệu.', icon: 'wallet-outline' },
    ],
  },
  marketing: {
    title: 'Công cụ Marketing',
    description: 'Các công cụ hỗ trợ quảng bá và chăm sóc khách hàng.',
    icon: 'trending-up-outline',
    items: [
      { title: 'Chiến dịch', description: 'Quản lý các chương trình truyền thông đang chạy.', icon: 'rocket-outline' },
      { title: 'Mã khuyến mãi', description: 'Tạo và theo dõi chương trình ưu đãi.', icon: 'pricetag-outline' },
    ],
  },
  reviews: {
    title: 'Quản lý đánh giá',
    description: 'Theo dõi phản hồi của hành khách sau mỗi chuyến đi.',
    icon: 'chatbox-ellipses-outline',
    items: [
      { title: 'Đánh giá mới', description: 'Kiểm tra các đánh giá mới từ hành khách.', icon: 'star-outline' },
      { title: 'Phản hồi', description: 'Quản lý nội dung nhà xe đã phản hồi.', icon: 'return-up-back-outline' },
    ],
  },
  management: {
    title: 'Quản lý',
    description: 'Tổng hợp các nội dung và tác vụ vận hành của nhà xe.',
    icon: 'newspaper-outline',
    items: [
      { title: 'Nội dung', description: 'Quản lý thông tin hiển thị và thông báo vận hành.', icon: 'document-text-outline' },
      { title: 'Báo cáo', description: 'Xem báo cáo tổng hợp hoạt động.', icon: 'bar-chart-outline' },
    ],
  },
  passengerApp: {
    title: 'Ứng dụng hành khách',
    description: 'Quản lý nội dung và tính năng hiển thị cho hành khách.',
    icon: 'shapes-outline',
    items: [
      { title: 'Trang chủ', description: 'Cấu hình nội dung trên trang chủ hành khách.', icon: 'home-outline' },
      { title: 'Thông báo', description: 'Quản lý thông báo gửi đến ứng dụng.', icon: 'notifications-outline' },
    ],
  },
  appSettings: {
    title: 'Cài đặt ứng dụng',
    description: 'Thiết lập trải nghiệm và tính năng của ứng dụng.',
    icon: 'apps-outline',
    items: [
      { title: 'Thông báo', description: 'Thiết lập cách nhận thông báo trên thiết bị.', icon: 'notifications-outline' },
      { title: 'Hiển thị', description: 'Điều chỉnh tùy chọn hiển thị của ứng dụng.', icon: 'phone-portrait-outline' },
    ],
  },
  generalSettings: {
    title: 'Cài đặt chung',
    description: 'Các thiết lập dùng chung cho hoạt động của nhà xe.',
    icon: 'settings-outline',
    items: [
      { title: 'Thông tin nhà xe', description: 'Cập nhật tên, địa chỉ và thông tin liên hệ.', icon: 'business-outline' },
      { title: 'Ngôn ngữ', description: 'Thiết lập ngôn ngữ mặc định.', icon: 'language-outline' },
    ],
  },
  systemSettings: {
    title: 'Cài đặt hệ thống',
    description: 'Quản lý phân quyền và cấu hình hệ thống.',
    icon: 'cog-outline',
    items: [
      { title: 'Phân quyền', description: 'Quản lý quyền truy cập theo vai trò.', icon: 'shield-checkmark-outline' },
      { title: 'Đồng bộ dữ liệu', description: 'Kiểm tra trạng thái đồng bộ dữ liệu.', icon: 'sync-outline' },
    ],
  },
};

export function AdminMenuDetailScreen({ route }: Props) {
  const config = sections[route.params.section];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name={config.icon} size={32} color={APP_COLORS.surface} />
        </View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.description}>{config.description}</Text>
      </View>
      {config.items.map(item => (
        <View key={item.title} style={styles.card}>
          <Ionicons name={item.icon} size={25} color={APP_COLORS.primaryDark} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  content: { padding: 20, gap: 14 },
  hero: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.primary },
  title: { marginTop: 14, color: APP_COLORS.textPrimary, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  description: { marginTop: 8, color: APP_COLORS.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 12, backgroundColor: APP_COLORS.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: APP_COLORS.border },
  cardText: { flex: 1, marginLeft: 15 },
  cardTitle: { color: APP_COLORS.textPrimary, fontSize: 17, fontWeight: '600' },
  cardDescription: { marginTop: 5, color: APP_COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
});
