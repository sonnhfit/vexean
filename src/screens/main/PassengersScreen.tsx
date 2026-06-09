import { useCallback, useState } from 'react';
import { Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

const seatConfig = {
  vehicle: '51B-238.90 • Limousine 34',
  customLayout: 'Sơ đồ 2-1 VIP + 4 ghế cuối',
  lockedSeats: 12,
  pendingLocks: 2,
};

const pickupSlots = [
  {
    point: 'Bến xe Miền Tây',
    time: '06:35',
    booked: '14 khách',
    operator: 'Tổng đài A',
    location: { lat: 10.7381, lng: 106.6172 },
  },
  {
    point: 'Ngã tư An Sương',
    time: '06:50',
    booked: '9 khách',
    operator: 'Tổng đài B',
    location: { lat: 10.8507, lng: 106.6247 },
  },
  {
    point: 'VP Quận 10',
    time: '07:05',
    booked: '11 khách',
    operator: 'Tổng đài A',
    location: { lat: 10.7749, lng: 106.6678 },
  },
];

const passengerList = [
  {
    seat: 'A01',
    name: 'Nguyễn Văn Lâm',
    phone: '0908 112 778',
    checkin: 'Đã check-in',
    roleView: 'Tổng đài',
    tone: 'success' as const,
  },
  {
    seat: 'A02',
    name: 'Lê Minh Tú',
    phone: '0913 228 999',
    checkin: 'Chờ check-in',
    roleView: 'Tổng đài',
    tone: 'warning' as const,
  },
  {
    seat: 'B04',
    name: 'Phạm Thuỳ Dung',
    phone: '0934 552 701',
    checkin: 'Đã check-in',
    roleView: 'Quản trị',
    tone: 'info' as const,
  },
];

const toneColors = {
  success: { bg: APP_COLORS.successLight, text: APP_COLORS.success },
  warning: { bg: APP_COLORS.warningLight, text: APP_COLORS.warning },
  info: { bg: APP_COLORS.infoLight, text: APP_COLORS.info },
};

const pickupCoordinates = pickupSlots.map((slot) => ({
  latitude: slot.location.lat,
  longitude: slot.location.lng,
}));

function getPickupRegion() {
  const latitudes = pickupCoordinates.map((item) => item.latitude);
  const longitudes = pickupCoordinates.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.06),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.06),
  };
}

export function PassengersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const openPickupMap = useCallback(() => {
    setMapVisible(true);
  }, []);

  return (
    <>
      <ScreenContainer
        title="Hành khách"
        subtitle="Danh sách chuyến, điểm đón và trạng thái check-in"
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
            <Text style={styles.sectionTitle}>Tình trạng ghế</Text>
            <Text style={styles.infoText}>{seatConfig.vehicle}</Text>
            <Text style={styles.infoSub}>{seatConfig.customLayout}</Text>
            <View style={styles.chipRow}>
              <Text style={styles.chip}>Đã khoá: {seatConfig.lockedSeats}</Text>
              <Text style={styles.chip}>Đang giữ chỗ: {seatConfig.pendingLocks}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Điểm đón & khung giờ</Text>
            <TouchableOpacity style={styles.mapButton} onPress={openPickupMap} activeOpacity={0.85}>
              <Ionicons name="map-outline" size={16} color={APP_COLORS.surface} />
              <Text style={styles.mapButtonText}>Xem bản đồ đón khách</Text>
            </TouchableOpacity>
            {pickupSlots.map((slot) => (
              <View key={`${slot.point}-${slot.time}`} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle}>{slot.point}</Text>
                  <Text style={styles.rowTime}>{slot.time}</Text>
                </View>
                <Text style={styles.rowMeta}>{slot.booked}</Text>
                <Text style={styles.rowMeta}>Điều phối: {slot.operator}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Danh sách hành khách</Text>
            {passengerList.map((item) => (
              <View key={`${item.seat}-${item.phone}`} style={styles.passengerCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.passengerName}>{item.name}</Text>
                  <Text style={styles.passengerSeat}>{item.seat}</Text>
                </View>
                <Text style={styles.rowMeta}>{item.phone}</Text>
                <Text style={[styles.checkinText, { color: toneColors[item.tone].text }]}>{item.checkin}</Text>
                <Text style={[styles.roleText, { color: toneColors[item.tone].text, backgroundColor: toneColors[item.tone].bg }]}>
                  {item.roleView}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScreenContainer>

      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <SafeAreaView style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Bản đồ đón khách</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMapVisible(false)} activeOpacity={0.85}>
              <Ionicons name="close" size={18} color={APP_COLORS.surface} />
            </TouchableOpacity>
          </View>

          <MapView style={styles.map} initialRegion={getPickupRegion()}>
            {pickupSlots.map((slot, index) => (
              <Marker
                key={slot.point}
                coordinate={{ latitude: slot.location.lat, longitude: slot.location.lng }}
                title={`${index + 1}. ${slot.point}`}
                description={`${slot.booked} • ${slot.time}`}
              />
            ))}
            <Polyline coordinates={pickupCoordinates} strokeWidth={4} strokeColor={APP_COLORS.primaryDark} />
          </MapView>

          <View style={styles.mapHint}>
            <Ionicons name="information-circle-outline" size={14} color={APP_COLORS.info} />
            <Text style={styles.mapHintText}>Lộ trình nối các điểm đón để tài xế tối ưu thứ tự ghé khách.</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </>
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
  chipRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: APP_COLORS.infoLight,
    color: APP_COLORS.info,
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rowCard: {
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  mapButton: {
    marginBottom: 10,
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  mapHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  mapTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  map: {
    flex: 1,
  },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.infoLight,
    borderRadius: 8,
  },
  mapHintText: {
    color: APP_COLORS.info,
    fontSize: 12,
    fontWeight: '500',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  rowTime: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  rowMeta: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  passengerCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  passengerName: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  passengerSeat: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  roleText: {
    alignSelf: 'flex-start',
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkinText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
