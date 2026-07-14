import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDetail'>;

const content = {
  privacy: {
    title: 'Chính sách quyền riêng tư',
    intro: 'An Nhiên chỉ xử lý dữ liệu cần thiết để cung cấp dịch vụ vận chuyển và quản lý tài khoản.',
    sections: [
      ['Dữ liệu được xử lý', 'Thông tin tài khoản, họ tên, số điện thoại, email; thông tin vé, chuyến đi, kiện hàng, địa điểm đón trả; và dữ liệu kỹ thuật cần thiết để vận hành ứng dụng.'],
      ['Mục đích sử dụng', 'Xác thực tài khoản, đặt và quản lý vé, vận chuyển hàng hóa, gửi thông báo dịch vụ, hỗ trợ khách hàng, bảo mật và xử lý sự cố.'],
      ['Quyền camera và vị trí', 'Camera chỉ được dùng khi bạn chủ động quét mã QR. Vị trí được dùng để tìm và hiển thị điểm đón trả; ứng dụng không yêu cầu vị trí nền.'],
      ['Chia sẻ dữ liệu', 'Dữ liệu có thể được xử lý bởi hệ thống vận hành của nhà xe và nhà cung cấp hạ tầng cần thiết. An Nhiên không bán dữ liệu cá nhân.'],
      ['Lưu giữ và bảo vệ', 'Dữ liệu được lưu trong thời gian cần thiết để cung cấp dịch vụ, giải quyết khiếu nại và đáp ứng nghĩa vụ pháp lý. Kết nối đến máy chủ sử dụng HTTPS.'],
      ['Quyền của bạn', 'Bạn có thể xem, sửa hoặc yêu cầu xóa tài khoản trong ứng dụng. Một số chứng từ giao dịch có thể phải được lưu theo quy định pháp luật.'],
    ],
  },
  terms: {
    title: 'Điều khoản sử dụng',
    intro: 'Khi sử dụng ứng dụng An Nhiên, bạn đồng ý cung cấp thông tin chính xác và sử dụng dịch vụ đúng mục đích.',
    sections: [
      ['Tài khoản', 'Bạn chịu trách nhiệm bảo vệ mã OTP và thông tin đăng nhập. Hãy báo ngay cho nhà xe nếu nghi ngờ tài khoản bị truy cập trái phép.'],
      ['Đặt vé và hàng hóa', 'Giá, lịch chạy, chỗ trống và điều kiện đổi hủy được hiển thị tại thời điểm giao dịch. Thông tin có thể thay đổi do điều kiện vận hành thực tế.'],
      ['Nội dung bị cấm', 'Không sử dụng ứng dụng để gửi hàng cấm, gian lận, gây gián đoạn hệ thống hoặc xâm phạm quyền của người khác.'],
      ['Giới hạn dịch vụ', 'Dịch vụ có thể tạm gián đoạn do bảo trì, mạng hoặc sự kiện ngoài khả năng kiểm soát. An Nhiên sẽ cố gắng khôi phục trong thời gian hợp lý.'],
      ['Thay đổi điều khoản', 'Các thay đổi quan trọng sẽ được thông báo trong ứng dụng hoặc qua kênh liên hệ đã đăng ký.'],
    ],
  },
  deleteAccount: {
    title: 'Xóa tài khoản',
    intro: 'Yêu cầu này sẽ xóa quyền truy cập và dữ liệu tài khoản có thể xóa khỏi hệ thống An Nhiên.',
    sections: [
      ['Trước khi tiếp tục', 'Bạn sẽ bị đăng xuất và không thể xem lại lịch sử trong ứng dụng. Dữ liệu bắt buộc lưu theo quy định kế toán, giao dịch hoặc giải quyết tranh chấp có thể được giữ trong thời hạn áp dụng.'],
      ['Không thể hoàn tác', 'Sau khi xử lý, bạn cần đăng ký lại nếu muốn sử dụng ứng dụng. Hãy hoàn tất các chuyến đi, đơn hàng hoặc yêu cầu hỗ trợ đang mở trước khi xóa.'],
    ],
  },
} as const;

export function AccountDetailScreen({ route, navigation }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.auth.status);
  const page = content[route.params.section];
  const deleting = status === 'loading';

  const confirmDelete = () => {
    Alert.alert(
      'Xóa tài khoản vĩnh viễn?',
      'Thao tác này không thể hoàn tác. Dữ liệu thuộc diện phải lưu theo pháp luật có thể chưa được xóa ngay.',
      [
        { text: 'Không, quay lại', style: 'cancel' },
        {
          text: 'Xóa tài khoản',
          style: 'destructive',
          onPress: async () => {
            const action = await dispatch(deleteAccount());
            if (deleteAccount.rejected.match(action)) {
              Alert.alert('Chưa thể xóa tài khoản', action.payload || 'Vui lòng thử lại sau.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={24} color={APP_COLORS.surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{page.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Cập nhật: 05/07/2026</Text>
        <Text style={styles.intro}>{page.intro}</Text>
        {page.sections.map(([title, text]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{text}</Text>
          </View>
        ))}
        {route.params.section === 'deleteAccount' ? (
          <Pressable disabled={deleting} onPress={confirmDelete} style={[styles.deleteButton, deleting && styles.disabled]} accessibilityRole="button">
            <Text style={styles.deleteText}>{deleting ? 'Đang xử lý…' : 'Xóa tài khoản của tôi'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { minHeight: 84, paddingHorizontal: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { flex: 1, color: APP_COLORS.surface, fontSize: 21, fontWeight: '700', paddingBottom: 6 },
  content: { padding: 18, paddingBottom: 36, gap: 12, backgroundColor: APP_COLORS.background },
  updated: { color: APP_COLORS.textSecondary, fontSize: 12 },
  intro: { color: APP_COLORS.textPrimary, fontSize: 16, lineHeight: 24, fontWeight: '600', marginBottom: 4 },
  section: { backgroundColor: APP_COLORS.surface, borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 12, padding: 16 },
  sectionTitle: { color: APP_COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 7 },
  sectionText: { color: APP_COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  deleteButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.danger, marginTop: 8 },
  deleteText: { color: APP_COLORS.surface, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.55 },
});
