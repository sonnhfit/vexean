import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function DriverManagementScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // TODO: Implement API call to fetch driver list
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenContainer title="Quản lý tài xế" subtitle="Danh sách và quản lý tài xế">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primaryDark} />}
      >
        <View style={styles.placeholderCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={32} color={APP_COLORS.primaryDark} />
          </View>
          <Text style={styles.placeholderText}>Tính năng quản lý tài xế</Text>
          <Text style={styles.placeholderHint}>Hiện đang phát triển - Sẽ sớm có danh sách tài xế và công cụ quản lý</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    justifyContent: 'center',
    minHeight: 400,
  },
  placeholderCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 24,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  placeholderHint: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
