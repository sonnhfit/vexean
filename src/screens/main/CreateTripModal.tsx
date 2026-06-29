import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type TripState = 'draft' | 'confirmed';
type DateTimeField = 'departure' | 'arrival';
type PickerState = { field: DateTimeField; mode: 'date' | 'time' } | null;

type CreateTripPayload = {
  route_id: number;
  vehicle_id: number;
  driver_id: number;
  co_driver_id?: number;
  departure_time: string;
  arrival_time?: string;
  price?: number;
  state: TripState;
  note?: string;
};

type OdooRoute = {
  id: number;
  name: string;
  code?: string;
  origin?: string;
  destination?: string;
  price?: number | string;
};

type OdooVehicle = {
  id: number;
  name?: string;
  license_plate?: string;
  vehicle_type?: string;
  capacity?: number;
};

type OdooDriver = {
  id: number;
  name: string;
  phone?: string;
  license_number?: string;
};

type ListResponse<T> = { results?: T[] } | T[];

export type TripSelectOption = {
  id: number;
  label: string;
  description?: string;
};

type Props = {
  visible: boolean;
  initialDate: string;
  onClose: () => void;
  onCreated: () => void;
};

function formatIsoWithLocalOffset(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(
    Math.floor(absoluteOffset / 60),
  )}:${pad(absoluteOffset % 60)}`;
}

function parseDate(value: string) {
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function defaultDeparture(initialDate: string) {
  const now = new Date();
  const [year, month, day] = initialDate.split('-').map(Number);
  const date = new Date(
    year || now.getFullYear(),
    (month || now.getMonth() + 1) - 1,
    day || now.getDate(),
    now.getHours() + 1,
    0,
    0,
    0,
  );
  return formatIsoWithLocalOffset(date);
}

function parseOptionalAmount(value: string) {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeList<T>(data: ListResponse<T>) {
  return Array.isArray(data) ? data : data.results || [];
}

export function CreateTripModal({
  visible,
  initialDate,
  onClose,
  onCreated,
}: Props) {
  const [routeId, setRouteId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [coDriverId, setCoDriverId] = useState<number | null>(null);
  const [routes, setRoutes] = useState<OdooRoute[]>([]);
  const [vehicles, setVehicles] = useState<OdooVehicle[]>([]);
  const [drivers, setDrivers] = useState<OdooDriver[]>([]);
  const [coDrivers, setCoDrivers] = useState<OdooDriver[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [coDriversLoading, setCoDriversLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  const [state, setState] = useState<TripState>('confirmed');
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<PickerState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setRouteId(null);
    setVehicleId(null);
    setDriverId(null);
    setCoDriverId(null);
    setCoDrivers([]);
    setDepartureTime(defaultDeparture(initialDate));
    setArrivalTime('');
    setPrice('');
    setState('confirmed');
    setNote('');
    setPicker(null);
    setError(null);

    let active = true;
    setOptionsLoading(true);
    setOptionsError(null);
    Promise.all([
      requestJson<ListResponse<OdooRoute>>(
        '/api/nhaxe/odoo/routes/?active=true&limit=200',
        { method: 'GET', auth: true, logLabel: 'admin-trip-routes' },
      ),
      requestJson<ListResponse<OdooVehicle>>(
        '/api/nhaxe/odoo/vehicles/?active=true&limit=200',
        { method: 'GET', auth: true, logLabel: 'admin-trip-vehicles' },
      ),
      requestJson<ListResponse<OdooDriver>>(
        '/api/nhaxe/odoo/drivers/?active=true&limit=200',
        { method: 'GET', auth: true, logLabel: 'admin-trip-drivers' },
      ),
    ])
      .then(([routeData, vehicleData, driverData]) => {
        if (!active) {
          return;
        }
        setRoutes(normalizeList(routeData));
        setVehicles(normalizeList(vehicleData));
        setDrivers(normalizeList(driverData));
      })
      .catch(loadError => {
        if (active) {
          setOptionsError(
            loadError instanceof Error
              ? loadError.message
              : 'Không tải được dữ liệu cho form.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setOptionsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialDate, visible]);

  useEffect(() => {
    if (!visible || !driverId) {
      setCoDrivers([]);
      setCoDriverId(null);
      return;
    }

    let active = true;
    setCoDriversLoading(true);
    setCoDriverId(null);
    setOptionsError(null);
    requestJson<ListResponse<OdooDriver>>(
      `/api/nhaxe/odoo/co-drivers/?active=true&exclude_driver_id=${driverId}&limit=200`,
      { method: 'GET', auth: true, logLabel: 'admin-trip-co-drivers' },
    )
      .then(data => {
        if (active) {
          setCoDrivers(normalizeList(data));
          setOptionsError(null);
        }
      })
      .catch(loadError => {
        if (active) {
          setCoDrivers([]);
          setOptionsError(
            loadError instanceof Error
              ? loadError.message
              : 'Không tải được danh sách phụ xe.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setCoDriversLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [driverId, visible]);

  const close = () => {
    if (!submitting) {
      onClose();
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setPicker(null);
      return;
    }
    if (!picker || !selectedDate) {
      return;
    }

    const currentValue =
      picker.field === 'departure'
        ? departureTime
        : arrivalTime || departureTime;
    const currentDate = parseDate(currentValue) || new Date();
    const nextDate = new Date(selectedDate);

    if (picker.mode === 'date') {
      nextDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    } else {
      nextDate.setFullYear(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      );
      nextDate.setSeconds(0, 0);
    }

    const value = formatIsoWithLocalOffset(nextDate);
    if (picker.field === 'departure') {
      setDepartureTime(value);
    } else {
      setArrivalTime(value);
    }
    if (Platform.OS === 'android') {
      setPicker(null);
    }
  };

  const submit = async () => {
    const parsedPrice = parseOptionalAmount(price);

    if (!routeId || !vehicleId || !driverId) {
      setError('Vui lòng chọn tuyến, xe và tài xế.');
      return;
    }
    if (parsedPrice === null) {
      setError('Giá vé không hợp lệ.');
      return;
    }
    const departureDate = parseDate(departureTime);
    const arrivalDate = arrivalTime ? parseDate(arrivalTime) : null;
    if (!departureDate) {
      setError('Giờ khởi hành không hợp lệ.');
      return;
    }
    if (arrivalTime && !arrivalDate) {
      setError('Giờ đến không hợp lệ.');
      return;
    }
    if (arrivalDate && arrivalDate <= departureDate) {
      setError('Giờ đến phải sau giờ khởi hành.');
      return;
    }

    const payload: CreateTripPayload = {
      route_id: routeId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      departure_time: departureTime,
      state,
    };
    if (coDriverId) {
      payload.co_driver_id = coDriverId;
    }
    if (arrivalTime) {
      payload.arrival_time = arrivalTime;
    }
    if (parsedPrice !== undefined) {
      payload.price = parsedPrice;
    }
    if (note.trim()) {
      payload.note = note.trim();
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestJson<unknown>('/api/nhaxe/odoo/trips/', {
        method: 'POST',
        auth: true,
        body: payload,
        logLabel: 'admin-create-trip',
      });
      onCreated();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể tạo chuyến đi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const routeOptions: TripSelectOption[] = routes.map(route => ({
    id: route.id,
    label:
      route.origin && route.destination
        ? `${route.origin} → ${route.destination}`
        : route.name,
    description: [
      route.code,
      route.price ? `${Number(route.price).toLocaleString('vi-VN')}đ` : '',
    ]
      .filter(Boolean)
      .join(' • '),
  }));
  const vehicleOptions: TripSelectOption[] = vehicles.map(vehicle => ({
    id: vehicle.id,
    label: vehicle.license_plate || vehicle.name || `Xe #${vehicle.id}`,
    description: [
      vehicle.vehicle_type,
      vehicle.capacity ? `${vehicle.capacity} ghế` : '',
    ]
      .filter(Boolean)
      .join(' • '),
  }));
  const driverOptions: TripSelectOption[] = drivers.map(driver => ({
    id: driver.id,
    label: driver.name,
    description: [
      driver.phone,
      driver.license_number ? `GPLX ${driver.license_number}` : '',
    ]
      .filter(Boolean)
      .join(' • '),
  }));
  const coDriverOptions: TripSelectOption[] = coDrivers.map(driver => ({
    id: driver.id,
    label: driver.name,
    description: driver.phone,
  }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Thêm chuyến đi</Text>
              <Text style={styles.subtitle}>
                Tạo chuyến và phân công tài xế
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={close}>
              <Ionicons name="close" size={22} color={APP_COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {optionsLoading ? (
              <View style={styles.optionsLoading}>
                <ActivityIndicator color={APP_COLORS.primaryDark} />
                <Text style={styles.optionsLoadingText}>
                  Đang tải tuyến, xe và tài xế...
                </Text>
              </View>
            ) : null}

            {optionsError ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={APP_COLORS.danger}
                />
                <Text style={styles.errorText}>{optionsError}</Text>
              </View>
            ) : null}

            <TripSelectionField
              label="Tuyến đường *"
              placeholder="Chọn tuyến đường"
              options={routeOptions}
              selectedId={routeId}
              loading={optionsLoading}
              onSelect={id => {
                setRouteId(id);
                const selectedRoute = routes.find(route => route.id === id);
                if (selectedRoute?.price !== undefined) {
                  setPrice(String(selectedRoute.price));
                }
              }}
            />
            <TripSelectionField
              label="Xe *"
              placeholder="Chọn xe"
              options={vehicleOptions}
              selectedId={vehicleId}
              loading={optionsLoading}
              onSelect={setVehicleId}
            />
            <TripSelectionField
              label="Tài xế chính *"
              placeholder="Chọn tài xế"
              options={driverOptions}
              selectedId={driverId}
              loading={optionsLoading}
              onSelect={setDriverId}
            />
            <TripSelectionField
              label="Phụ xe"
              placeholder={
                driverId
                  ? 'Chọn phụ xe (không bắt buộc)'
                  : 'Chọn tài xế chính trước'
              }
              options={coDriverOptions}
              selectedId={coDriverId}
              loading={coDriversLoading}
              disabled={!driverId}
              optional
              emptyLabel="Không chọn phụ xe"
              onSelect={setCoDriverId}
            />

            <DateTimeFieldView
              label="Giờ khởi hành *"
              value={departureTime}
              field="departure"
              picker={picker}
              setPicker={setPicker}
              onChange={onPickerChange}
            />
            <DateTimeFieldView
              label="Giờ đến dự kiến"
              value={arrivalTime}
              field="arrival"
              picker={picker}
              setPicker={setPicker}
              onChange={onPickerChange}
              onClear={() => {
                setArrivalTime('');
                setPicker(null);
              }}
            />

            <Text style={styles.label}>Giá vé</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Ví dụ: 250000"
              placeholderTextColor={APP_COLORS.placeholder}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Trạng thái</Text>
            <View style={styles.segmented}>
              {(['confirmed', 'draft'] as const).map(value => (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    state === value && styles.segmentButtonActive,
                  ]}
                  onPress={() => setState(value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      state === value && styles.segmentTextActive,
                    ]}
                  >
                    {value === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Chuyến sáng..."
              placeholderTextColor={APP_COLORS.placeholder}
              multiline
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={APP_COLORS.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={close}
            >
              <Text style={styles.cancelText}>Huỷ</Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                styles.submitButton,
                submitting && styles.disabled,
              ]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={APP_COLORS.surface} />
              ) : (
                <Text style={styles.submitText}>Tạo chuyến</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function TripSelectionField({
  label,
  placeholder,
  options,
  selectedId,
  loading,
  disabled,
  optional,
  emptyLabel,
  onSelect,
}: {
  label: string;
  placeholder: string;
  options: TripSelectOption[];
  selectedId: number | null;
  loading?: boolean;
  disabled?: boolean;
  optional?: boolean;
  emptyLabel?: string;
  onSelect: (id: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find(option => option.id === selectedId);
  const keyword = search.trim().toLocaleLowerCase('vi');
  const filteredOptions = keyword
    ? options.filter(option =>
        `${option.label} ${option.description || ''}`
          .toLocaleLowerCase('vi')
          .includes(keyword),
      )
    : options;

  return (
    <View style={styles.selectionField}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[
          styles.selectionButton,
          expanded && styles.selectionButtonActive,
          disabled && styles.disabled,
        ]}
        disabled={disabled || loading}
        onPress={() => setExpanded(value => !value)}
      >
        <View style={styles.selectionValueWrap}>
          {loading ? (
            <Text style={styles.selectionPlaceholder}>Đang tải...</Text>
          ) : selected ? (
            <>
              <Text style={styles.selectionValue}>{selected.label}</Text>
              {selected.description ? (
                <Text style={styles.selectionDescription} numberOfLines={1}>
                  {selected.description}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.selectionPlaceholder}>{placeholder}</Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={APP_COLORS.primaryDark} />
        ) : (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={19}
            color={APP_COLORS.primaryDark}
          />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.optionsPanel}>
          <View style={styles.optionSearchBox}>
            <Ionicons
              name="search-outline"
              size={17}
              color={APP_COLORS.placeholder}
            />
            <TextInput
              style={styles.optionSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm kiếm..."
              placeholderTextColor={APP_COLORS.placeholder}
            />
          </View>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.optionsList}
          >
            {optional ? (
              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  onSelect(null);
                  setExpanded(false);
                  setSearch('');
                }}
              >
                <Text style={styles.optionLabel}>
                  {emptyLabel || 'Không chọn'}
                </Text>
              </Pressable>
            ) : null}
            {filteredOptions.length === 0 ? (
              <Text style={styles.noOptionsText}>Không có dữ liệu phù hợp</Text>
            ) : (
              filteredOptions.map(option => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionRow,
                    option.id === selectedId && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    onSelect(option.id);
                    setExpanded(false);
                    setSearch('');
                  }}
                >
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.description ? (
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  {option.id === selectedId ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={APP_COLORS.primaryDark}
                    />
                  ) : null}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function DateTimeFieldView({
  label,
  value,
  field,
  picker,
  setPicker,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  field: DateTimeField;
  picker: PickerState;
  setPicker: (value: PickerState) => void;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  onClear?: () => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateBox}>
        <Text style={[styles.dateValue, !value && styles.placeholder]}>
          {value || 'Chưa chọn'}
        </Text>
        <View style={styles.dateActions}>
          <Pressable
            style={styles.dateButton}
            onPress={() => setPicker({ field, mode: 'date' })}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={APP_COLORS.primaryDark}
            />
            <Text style={styles.dateButtonText}>Ngày</Text>
          </Pressable>
          <Pressable
            style={styles.dateButton}
            onPress={() => setPicker({ field, mode: 'time' })}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={APP_COLORS.primaryDark}
            />
            <Text style={styles.dateButtonText}>Giờ</Text>
          </Pressable>
          {value && onClear ? (
            <Pressable style={styles.clearButton} onPress={onClear}>
              <Ionicons name="close" size={17} color={APP_COLORS.danger} />
            </Pressable>
          ) : null}
        </View>
        {picker?.field === field ? (
          <DateTimePicker
            value={parseDate(value) || new Date()}
            mode={picker.mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    maxHeight: '94%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: APP_COLORS.background,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  titleWrap: { flex: 1 },
  title: { color: APP_COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  subtitle: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  content: { padding: 16, gap: 8 },
  label: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  optionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  optionsLoadingText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  selectionField: {
    gap: 7,
  },
  selectionButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    backgroundColor: APP_COLORS.surface,
  },
  selectionButtonActive: {
    borderColor: APP_COLORS.primaryDark,
  },
  selectionValueWrap: {
    flex: 1,
    paddingRight: 8,
  },
  selectionValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  selectionDescription: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  selectionPlaceholder: {
    color: APP_COLORS.placeholder,
    fontSize: 14,
  },
  optionsPanel: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
  },
  optionSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  optionSearchInput: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: 8,
  },
  optionsList: {
    maxHeight: 210,
  },
  optionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.border,
  },
  optionRowSelected: {
    backgroundColor: APP_COLORS.primaryLight,
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionDescription: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  noOptionsText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 12,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  noteInput: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' },
  dateBox: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    backgroundColor: APP_COLORS.surface,
    padding: 10,
    gap: 9,
  },
  dateValue: { color: APP_COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  placeholder: { color: APP_COLORS.placeholder },
  dateActions: { flexDirection: 'row', gap: 8 },
  dateButton: {
    flex: 1,
    minHeight: 37,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: APP_COLORS.primaryLight,
  },
  dateButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  clearButton: {
    width: 37,
    minHeight: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: APP_COLORS.dangerLight,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 9,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  segmentButtonActive: { backgroundColor: APP_COLORS.primaryLight },
  segmentText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: { color: APP_COLORS.primaryDark },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 8,
    backgroundColor: APP_COLORS.dangerLight,
  },
  errorText: {
    flex: 1,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  cancelButton: { borderWidth: 1, borderColor: APP_COLORS.border },
  cancelText: { color: APP_COLORS.textPrimary, fontWeight: '700' },
  submitButton: { backgroundColor: APP_COLORS.primaryDark },
  submitText: { color: APP_COLORS.surface, fontWeight: '800' },
  disabled: { opacity: 0.65 },
});
