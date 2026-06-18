import { ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import {
  CustomerSearchLocation,
  RootStackParamList,
} from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerLocationSearch'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

type LocationPickerItem = CustomerSearchLocation & {
  old?: boolean;
};

type LocationsResponse = {
  results: CustomerSearchLocation[];
};

const popularOriginLocations: LocationPickerItem[] = [
  { id: 10001, name: 'Hà Nội' },
  { id: 10002, name: 'Đà Nẵng', old: true },
  { id: 10003, name: 'Hồ Chí Minh', old: true },
  { id: 10004, name: 'Bà Rịa-Vũng Tàu', old: true },
  { id: 10005, name: 'Quy Nhơn - Bình Định', old: true },
  { id: 10006, name: 'Nha Trang - Khánh Hoà', old: true },
  { id: 10007, name: 'Đà Lạt - Lâm Đồng', old: true },
];

const popularDestinationLocations: LocationPickerItem[] = [
  { id: 20001, name: 'Hà Giang', old: true },
  { id: 20002, name: 'Hải Phòng', old: true },
  { id: 20003, name: 'Nghệ An' },
  { id: 20004, name: 'Ninh Bình', old: true },
  { id: 20005, name: 'Quảng Ninh' },
  { id: 20006, name: 'Sa Pa - Lào Cai', old: true },
  { id: 20007, name: 'Sơn La' },
  { id: 20008, name: 'Thanh Hoá' },
];

function locationDisplayName(location: CustomerSearchLocation) {
  return location.display_name || location.name;
}

export function CustomerLocationSearchScreen({ route, navigation }: Props) {
  const { mode, currentLocation } = route.params;
  const isOrigin = mode === 'origin';
  const title = isOrigin ? 'Nơi xuất phát' : 'Bạn muốn đi đâu?';
  const accentColor = isOrigin ? APP_COLORS.primaryDark : '#d9a94f';
  const markerIcon: IconName = isOrigin ? 'radio-button-on' : 'location';
  const popularLocations = isOrigin
    ? popularOriginLocations
    : popularDestinationLocations;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const renderedLocations = trimmedQuery ? results : popularLocations;

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          search: trimmedQuery,
          limit: '30',
        });
        const data = await requestJson<LocationsResponse>(
          `/api/nhaxe/odoo/locations/?${params.toString()}`,
          {
            method: 'GET',
            logLabel: 'customer-address-location-search',
          },
        );
        setResults(data.results || []);
      } catch (searchError) {
        const message =
          searchError instanceof Error
            ? searchError.message
            : 'Không tìm được địa điểm.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  const currentLabel = useMemo(
    () => (currentLocation ? locationDisplayName(currentLocation) : ''),
    [currentLocation],
  );

  const resolveLocation = async (location: CustomerSearchLocation) => {
    if (location.id < 10000) {
      return location;
    }

    const params = new URLSearchParams({
      search: location.name,
      limit: '20',
    });
    const data = await requestJson<LocationsResponse>(
      `/api/nhaxe/odoo/locations/?${params.toString()}`,
      {
        method: 'GET',
        logLabel: 'customer-popular-location-resolve',
      },
    );
    const exactMatch = data.results.find(
      item => item.name.toLowerCase() === location.name.toLowerCase(),
    );
    const resolvedLocation = exactMatch || data.results[0];
    if (!resolvedLocation) {
      throw new Error('Không tìm thấy địa điểm này trên hệ thống.');
    }
    return resolvedLocation;
  };

  const selectLocation = async (location: CustomerSearchLocation) => {
    setSelectingId(location.id);
    setError(null);
    try {
      const resolvedLocation = await resolveLocation(location);
      navigation.navigate('MainTabs', {
        screen: 'CustomerHome',
        params: {
          selectedLocation: {
            mode,
            location: resolvedLocation,
          },
          selectionKey: Date.now(),
        },
      });
    } catch (selectError) {
      const message =
        selectError instanceof Error
          ? selectError.message
          : 'Không chọn được địa điểm.';
      setError(message);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.surface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.newAddressWrap}>
          <Text style={styles.newAddressText}>Địa chỉ mới</Text>
          <View style={styles.newAddressSwitch}>
            <View style={styles.newAddressKnob} />
          </View>
        </View>
      </View>

      <View style={styles.searchCard}>
        <Ionicons name={markerIcon} size={30} color={accentColor} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tên tỉnh/thành phố, quận/huyện"
          placeholderTextColor="#9aa8a8"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {currentLabel ? (
        <Text style={styles.currentText}>Đang chọn: {currentLabel}</Text>
      ) : null}

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>
          {trimmedQuery ? 'Kết quả tìm kiếm' : 'Địa danh phổ biến'}
        </Text>

        {loading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator size="small" color={APP_COLORS.primaryDark} />
            <Text style={styles.stateText}>Đang tìm địa điểm...</Text>
          </View>
        ) : null}

        {!loading && error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && trimmedQuery && !error && !renderedLocations.length ? (
          <Text style={styles.stateText}>Không có địa điểm phù hợp.</Text>
        ) : null}

        {!loading
          ? renderedLocations.map(location => (
              <LocationRow
                key={`${location.id}-${location.name}`}
                location={location}
                selected={locationDisplayName(location) === currentLabel}
                selecting={selectingId === location.id}
                onPress={() => selectLocation(location)}
              />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationRow({
  location,
  selected,
  selecting,
  onPress,
}: {
  location: LocationPickerItem;
  selected: boolean;
  selecting: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.locationRow, selected && styles.locationRowSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locationDisplayName(location)}
    >
      <Ionicons
        name={selected ? 'checkmark-circle' : 'location-outline'}
        size={26}
        color={selected ? APP_COLORS.primaryDark : '#9b9b9b'}
      />
      <View style={styles.locationNameWrap}>
        <Text style={styles.locationName} numberOfLines={1}>
          {locationDisplayName(location)}
        </Text>
        {location.old ? (
          <View style={styles.oldBadge}>
            <Text style={styles.oldBadgeText}>cũ</Text>
          </View>
        ) : null}
      </View>
      {selecting ? (
        <ActivityIndicator size="small" color={APP_COLORS.primaryDark} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f7f5',
  },
  header: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: APP_COLORS.primaryDark,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    color: APP_COLORS.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  newAddressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newAddressText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  newAddressSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: APP_COLORS.success,
  },
  newAddressKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: APP_COLORS.surface,
  },
  searchCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: 0,
  },
  currentText: {
    marginHorizontal: 18,
    marginTop: 10,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
  },
  sectionTitle: {
    color: '#5f6f6d',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 10,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stateText: {
    color: APP_COLORS.placeholder,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  errorText: {
    color: APP_COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  locationRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    backgroundColor: APP_COLORS.surface,
  },
  locationRowSelected: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryLight,
  },
  locationNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationName: {
    flexShrink: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  oldBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#8f8f8f',
  },
  oldBadgeText: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});
