import { ComponentProps, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';
import {
  getLinkedPhoneNumber,
  isUsernamePhoneNumber,
} from '../../utils/userPhone';

type ProfileNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const user = useAppSelector(state => state.auth.user);
  const linkedPhone = getLinkedPhoneNumber(user);
  const fullName =
    user?.full_name?.trim() || user?.username || 'Thành viên An Nhiên';
  const roleLabel = user?.role_display || user?.role || 'Thành viên';
  const avatarLetter = useMemo(
    () => fullName.trim().charAt(0).toLocaleUpperCase('vi-VN'),
    [fullName],
  );
  const needsPhoneUpdate =
    !linkedPhone && user?.username && !isUsernamePhoneNumber(user);

  return (
    <ScreenContainer
      title="Hồ sơ của bạn"
      subtitle="Quản lý thông tin cá nhân và liên hệ"
      headerRight={
        <Pressable
          style={styles.editIconButton}
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa hồ sơ"
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={APP_COLORS.primaryDark}
          />
        </Pressable>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.profileIdentity}>
            <Text style={styles.fullName} numberOfLines={1}>
              {fullName}
            </Text>
            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={APP_COLORS.primaryDark}
              />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thông tin tài khoản</Text>
          <ProfileItem
            icon="person-outline"
            label="Họ và tên"
            value={user?.full_name || 'Chưa cập nhật'}
          />
          <ProfileItem
            icon="at-outline"
            label="Tài khoản"
            value={user?.username || 'Chưa cập nhật'}
          />
          <ProfileItem
            icon="mail-outline"
            label="Email"
            value={user?.email || 'Chưa cập nhật'}
            isLast={!linkedPhone}
          />
          {linkedPhone ? (
            <ProfileItem
              icon="call-outline"
              label="Số điện thoại liên kết"
              value={linkedPhone}
              isLast
            />
          ) : null}
        </View>

        {needsPhoneUpdate ? (
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={APP_COLORS.warning}
              />
            </View>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                Thêm số điện thoại liên kết
              </Text>
              <Text style={styles.noticeText}>
                Cập nhật SĐT đã xác minh để xem vé và đơn gửi hàng của bạn.
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={APP_COLORS.surface}
          />
          <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileItem({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color={APP_COLORS.primaryDark} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 14,
  },
  editIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  profileHero: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  avatarText: {
    color: APP_COLORS.primaryDark,
    fontSize: 28,
    fontWeight: '800',
  },
  profileIdentity: {
    flex: 1,
    marginLeft: 14,
  },
  fullName: {
    color: APP_COLORS.surface,
    fontSize: 20,
    fontWeight: '800',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    backgroundColor: APP_COLORS.surface,
  },
  cardTitle: {
    paddingTop: 16,
    paddingBottom: 6,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.primaryLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  infoText: {
    flex: 1,
    marginLeft: 11,
  },
  infoLabel: {
    color: APP_COLORS.placeholder,
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 3,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  noticeCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: APP_COLORS.warningLight,
    flexDirection: 'row',
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 9,
  },
  noticeTitle: {
    color: APP_COLORS.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  noticeText: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  editButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    gap: 8,
  },
  editButtonText: {
    color: APP_COLORS.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});
