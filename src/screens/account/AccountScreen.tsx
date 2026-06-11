import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Button, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
          <Button title="Xem hồ sơ" onPress={() => navigation.navigate('Profile')} color={APP_COLORS.primaryDark} />
        </View>
        <Button title="Đăng xuất" onPress={() => dispatch(signOut())} color={APP_COLORS.primaryDark} />
      </ScrollView>
    </ScreenContainer>
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
  },
});
