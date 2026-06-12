import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function FleetManagementScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenContainer title="Quản lý Đội xe" subtitle="Theo dõi và quản lý đội xe">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primaryDark} />}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="bus-outline" size={28} color={APP_COLORS.primaryDark} />
          </View>
          <Text style={styles.title}>Quản lý Đội xe</Text>
          <Text style={styles.hint}>Màn hình đội xe đã sẵn sàng để tích hợp danh sách xe và trạng thái vận hành.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.background,
  },
  title: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
