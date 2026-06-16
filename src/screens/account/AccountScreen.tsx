import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ComponentProps } from 'react';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { bootstrapAuth, signOut } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export function AccountScreen() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const user = useAppSelector(state => state.auth.user);
  const roleLabel = user?.role_display || user?.role || 'Chưa xác định';
  const role = (user?.role || '').toLowerCase();
  const isCustomer =
    role === 'customer' ||
    role === 'client' ||
    role === 'passenger' ||
    role === 'khachhang' ||
    role === 'khach_hang';

  const onRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await dispatch(bootstrapAuth()).unwrap();
    } finally {
      setRefreshing(false);
    }
  };

  if (isCustomer) {
    return (
      <SafeAreaView style={styles.customerSafeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.customerContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={APP_COLORS.surface}
            />
          }
        >
          <View style={styles.customerHeader}>
            <View style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Ionicons name="person" size={26} color="#95bdf6" />
              </View>
              <View style={styles.memberTextWrap}>
                <Text style={styles.memberTitle}>Thành viên An Nhiên</Text>
                <Text style={styles.memberText}>Đăng nhập để tận hưởng quyền lợi riêng</Text>
              </View>
              <Pressable>
                <Text style={styles.customerLoginLink}>Đăng nhập</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.customerMenu}>
            <CustomerMenuItem
              icon="star-outline"
              title="Điểm thưởng của tôi"
              text="Tích lũy điểm thưởng để đổi ưu đãi hấp dẫn"
              locked
            />
            <CustomerMenuItem
              icon="pricetag-outline"
              title="Ưu đãi"
              text="Xem danh sách các ưu đãi dành riêng cho bạn"
              locked
            />
            <CustomerMenuItem
              icon="gift-outline"
              title="Giới thiệu nhận quà"
              badge="Mới"
              locked
            />
            <CustomerMenuItem
              icon="card-outline"
              title="Quản lý thẻ"
              text="Lưu thẻ và thanh toán chỉ với 1 chạm"
              locked
            />
            <CustomerMenuItem
              icon="create-outline"
              title="Đánh giá chuyến đi"
              text="Chia sẻ cảm nhận để nhận điểm thưởng"
              locked
            />
          </View>

          <View style={styles.customerDivider} />

          <View style={styles.customerMenu}>
            <CustomerMenuItem icon="settings-outline" title="Cài đặt" value="v8.9.51p" />
            <CustomerMenuItem icon="help-circle-outline" title="Trung tâm Hỗ trợ" />
            <CustomerMenuItem icon="mail-outline" title="Góp ý" />
            <CustomerMenuItem icon="briefcase-outline" title="Cơ hội cùng An Nhiên" />
            <CustomerMenuItem icon="bus-outline" title="Về An Nhiên" />
          </View>

          <View style={styles.languageRow}>
            <View style={styles.languageItem}>
              <Text style={styles.flagText}>🇻🇳</Text>
              <Text style={styles.languageTextActive}>Tiếng Việt</Text>
            </View>
            <View style={styles.languageItem}>
              <Text style={styles.flagText}>🇬🇧</Text>
              <Text style={styles.languageText}>English</Text>
            </View>
          </View>

          <Pressable style={styles.customerSignOut} onPress={() => dispatch(signOut())}>
            <Ionicons name="log-out-outline" size={18} color={APP_COLORS.primaryDark} />
            <Text style={styles.customerSignOutText}>Đăng xuất</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <ScreenContainer title="Tài khoản" subtitle="Hồ sơ và quyền truy cập">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primaryDark} />}
      >
        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>Vai trò đang đăng nhập</Text>
          <Text style={styles.roleValue}>{roleLabel}</Text>
        </View>

        <View style={styles.buttonGroup}>
          <AccountAction
            icon="person-circle-outline"
            title="Xem hồ sơ"
            text="Thông tin cá nhân và vai trò"
            onPress={() => navigation.navigate('Profile')}
          />
          <AccountAction
            icon="create-outline"
            title="Chỉnh sửa thông tin"
            text="Cập nhật tên, email và SĐT liên kết"
            onPress={() => navigation.navigate('EditProfile')}
          />
        </View>
        <Pressable style={styles.signOutButton} onPress={() => dispatch(signOut())}>
          <Ionicons name="log-out-outline" size={18} color={APP_COLORS.surface} />
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function CustomerMenuItem({
  icon,
  title,
  text,
  badge,
  value,
  locked = false,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  text?: string;
  badge?: string;
  value?: string;
  locked?: boolean;
}) {
  return (
    <Pressable style={styles.customerMenuItem}>
      <Ionicons name={icon} size={24} color={APP_COLORS.primaryDark} />
      <View style={styles.customerMenuTextWrap}>
        <View style={styles.customerMenuTitleRow}>
          <Text style={styles.customerMenuTitle}>{title}</Text>
          {badge ? (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {text ? <Text style={styles.customerMenuText}>{text}</Text> : null}
      </View>
      {locked ? (
        <Ionicons name="lock-closed" size={20} color="#000000" />
      ) : (
        <View style={styles.menuRight}>
          {value ? <Text style={styles.menuValue}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={22} color="#8a8a8a" />
        </View>
      )}
    </Pressable>
  );
}

function AccountAction({
  icon,
  title,
  text,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={APP_COLORS.primaryDark} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={APP_COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  customerSafeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  customerContent: {
    paddingBottom: 24,
    backgroundColor: APP_COLORS.surface,
  },
  customerHeader: {
    minHeight: 112,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: APP_COLORS.primaryDark,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8e8ff',
  },
  memberTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  memberTitle: {
    color: APP_COLORS.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  memberText: {
    marginTop: 4,
    color: APP_COLORS.surface,
    fontSize: 13,
    lineHeight: 19,
  },
  customerLoginLink: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  customerMenu: {
    paddingHorizontal: 18,
    backgroundColor: APP_COLORS.surface,
  },
  customerMenuItem: {
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  customerMenuTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  customerMenuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerMenuTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '400',
  },
  customerMenuText: {
    marginTop: 4,
    color: '#929292',
    fontSize: 13,
    lineHeight: 18,
  },
  menuBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#d9a94f',
  },
  menuBadgeText: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  menuValue: {
    color: '#858585',
    fontSize: 13,
  },
  customerDivider: {
    height: 12,
    backgroundColor: '#f4f4f4',
  },
  languageRow: {
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagText: {
    fontSize: 22,
  },
  languageTextActive: {
    color: APP_COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '600',
  },
  languageText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
  customerSignOut: {
    alignSelf: 'center',
    minHeight: 40,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  customerSignOutText: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  roleCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  roleTitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonGroup: {
    marginBottom: 16,
    gap: 10,
  },
  actionRow: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  actionText: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  signOutButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  signOutText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
