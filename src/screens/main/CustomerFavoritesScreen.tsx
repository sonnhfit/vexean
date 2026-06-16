import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS } from '../../theme/colors';

export function CustomerFavoritesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yêu thích</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.emptyWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={APP_COLORS.surface} />
          </View>
          <View style={styles.shadow} />
          <Text style={styles.emptyTitle}>Bạn chưa đăng nhập</Text>
          <Text style={styles.emptyText}>
            Đăng nhập để lưu và đặt lại chuyến xe yêu thích trong tích tắc
          </Text>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  header: {
    height: 104,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: APP_COLORS.primaryDark,
  },
  headerTitle: {
    color: APP_COLORS.surface,
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    backgroundColor: '#f6f7f5',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 104,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fc9c7',
  },
  shadow: {
    width: 48,
    height: 8,
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 24,
    backgroundColor: '#dedede',
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#555555',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loginButton: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: 10,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123b70',
  },
  loginButtonText: {
    color: APP_COLORS.surface,
    fontSize: 17,
    fontWeight: '700',
  },
});
