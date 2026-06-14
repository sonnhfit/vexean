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
