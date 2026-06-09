import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

const dutyShift = {
  route: 'DL-0726 • SGN → Đà Lạt',
  network: 'Offline: 6 giao dịch chờ sync',
  updatedAt: 'Cập nhật 09:18',
};

const pickupTasks = [
  { stop: 'VP Quận 10', action: 'Điều hướng', phone: '0907 882 631', eta: '10 phút' },
  { stop: 'Bến xe Miền Đông mới', action: 'Gọi khách', phone: '0918 004 553', eta: '18 phút' },
];

const codAndCargo = [
  { code: 'COD-3012', amount: '1,850,000đ', status: 'Đã thu', qr: 'QR hợp lệ', tone: 'success' as const },
  { code: 'KG-4471', amount: '450,000đ', status: 'Đang giao', qr: 'Quét 09:02', tone: 'info' as const },
  { code: 'COD-3024', amount: '920,000đ', status: 'Chờ xác nhận', qr: 'Chưa quét QR', tone: 'warning' as const },
];

const shiftMoney = {
  fare: '14,700,000đ',
  cod: '2,770,000đ',
  fuel: '1,350,000đ',
  net: '16,120,000đ',
};

const toneColors = {
  success: { bg: APP_COLORS.successLight, text: APP_COLORS.success },
  info: { bg: APP_COLORS.infoLight, text: APP_COLORS.info },
  warning: { bg: APP_COLORS.warningLight, text: APP_COLORS.warning },
};

export function CargoScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  return (
    <ScreenContainer
      title="Hàng hoá"
      subtitle="Ký gửi, COD và tiền ca theo thời gian thực"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primaryDark}
            colors={[APP_COLORS.primaryDark, APP_COLORS.info]}
          />
        }
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin ca chạy</Text>
          <Text style={styles.infoText}>{dutyShift.route}</Text>
          <Text style={styles.infoSub}>{dutyShift.network}</Text>
          <Text style={styles.infoSub}>{dutyShift.updatedAt}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Điểm đón cần xử lý</Text>
          {pickupTasks.map((task) => (
            <View key={`${task.stop}-${task.phone}`} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{task.stop}</Text>
              <Text style={styles.rowMeta}>{task.action}</Text>
              <Text style={styles.rowMeta}>{task.phone}</Text>
              <Text style={styles.rowEta}>{task.eta}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ký gửi & COD</Text>
          {codAndCargo.map((item) => (
            <View key={item.code} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemCode}>{item.code}</Text>
                <Text style={styles.itemAmount}>{item.amount}</Text>
              </View>
              <Text style={[styles.itemStatus, { color: toneColors[item.tone].text, backgroundColor: toneColors[item.tone].bg }]}>
                {item.status}
              </Text>
              <Text style={styles.rowMeta}>{item.qr}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thống kê tiền trong ca</Text>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Cước vé</Text>
            <Text style={styles.moneyValue}>{shiftMoney.fare}</Text>
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>COD</Text>
            <Text style={styles.moneyValue}>{shiftMoney.cod}</Text>
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Nhiên liệu</Text>
            <Text style={[styles.moneyValue, styles.moneyExpense]}>- {shiftMoney.fuel}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng tiền ca</Text>
            <Text style={styles.totalValue}>{shiftMoney.net}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  infoSub: {
    marginTop: 4,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  rowCard: {
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  rowTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowEta: {
    marginTop: 2,
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCode: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  itemAmount: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  itemStatus: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  moneyLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
  },
  moneyValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  moneyExpense: {
    color: APP_COLORS.warning,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    marginTop: 2,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    color: APP_COLORS.success,
    fontSize: 14,
    fontWeight: '700',
  },
});
