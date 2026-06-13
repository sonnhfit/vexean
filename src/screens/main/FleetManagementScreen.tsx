import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { Vehicle, VehicleStatus } from '../../types/vehicle';

type IconName = ComponentProps<typeof Ionicons>['name'];

type VehicleForm = {
  license_plate: string;
  vehicle_type: string;
  brand: string;
  model: string;
  year: string;
  seat_count: string;
  color: string;
  has_ac: boolean;
  has_wifi: boolean;
  has_usb: boolean;
  has_tv: boolean;
  has_toilet: boolean;
  notes: string;
  status: VehicleStatus;
  insurance_expiry: string;
  registration_expiry: string;
  is_active: boolean;
};

type VehicleDateField = 'insurance_expiry' | 'registration_expiry';

type OdooVehicle = {
  id: number;
  name: string;
  license_plate: string;
  vehicle_type: string;
  capacity: number;
  floor_count: number;
  seat_layout: string;
  active: boolean;
  note: string;
};

type OdooVehicleListResponse = {
  results?: OdooVehicle[];
};

const VEHICLE_ENDPOINT = '/api/nhaxe/odoo/vehicles/';

const statusMeta: Record<
  VehicleStatus,
  { label: string; color: string; backgroundColor: string; icon: IconName }
> = {
  active: {
    label: 'Hoạt động',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  maintenance: {
    label: 'Bảo dưỡng',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
    icon: 'construct-outline',
  },
  inactive: {
    label: 'Ngưng',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'ban-outline',
  },
};

const emptyForm: VehicleForm = {
  license_plate: '',
  vehicle_type: '',
  brand: '',
  model: '',
  year: '',
  seat_count: '',
  color: '',
  has_ac: true,
  has_wifi: false,
  has_usb: false,
  has_tv: false,
  has_toilet: false,
  notes: '',
  status: 'active',
  insurance_expiry: '',
  registration_expiry: '',
  is_active: true,
};

function mapOdooVehicle(vehicle: OdooVehicle): Vehicle {
  return {
    id: vehicle.id,
    license_plate: vehicle.license_plate || vehicle.name || 'Chưa cập nhật',
    vehicle_type: null,
    vehicle_type_name: vehicle.vehicle_type || 'Chưa cập nhật',
    brand: '',
    model: vehicle.name || '',
    year: null,
    seat_count: vehicle.capacity || null,
    color: vehicle.seat_layout || '',
    has_ac: false,
    has_wifi: false,
    has_usb: false,
    has_tv: false,
    has_toilet: false,
    notes: vehicle.note || '',
    status: vehicle.active ? 'active' : 'inactive',
    insurance_expiry: '',
    registration_expiry: '',
    is_active: vehicle.active,
    created_at: '',
    updated_at: '',
  };
}

function normalizeVehicleList(data: OdooVehicleListResponse) {
  return Array.isArray(data.results) ? data.results.map(mapOdooVehicle) : [];
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildVehiclePayload(form: VehicleForm) {
  return {
    license_plate: form.license_plate.trim(),
    vehicle_type: toOptionalNumber(form.vehicle_type),
    brand: form.brand.trim(),
    model: form.model.trim(),
    year: toOptionalNumber(form.year),
    seat_count: toOptionalNumber(form.seat_count),
    color: form.color.trim(),
    has_ac: form.has_ac,
    has_wifi: form.has_wifi,
    has_usb: form.has_usb,
    has_tv: form.has_tv,
    has_toilet: form.has_toilet,
    notes: form.notes.trim(),
    status: form.status,
    insurance_expiry: form.insurance_expiry.trim() || null,
    registration_expiry: form.registration_expiry.trim() || null,
    is_active: form.is_active,
  };
}

function formatDate(value: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateValue(year: number, month: number, day: number) {
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDateValue(value: string) {
  const [yearText, monthText, dayText] = value.split('-');
  const now = new Date();
  const year = Number(yearText) || now.getFullYear();
  const month = Number(monthText) || now.getMonth() + 1;
  const maxDay = getDaysInMonth(year, month);
  const day = Math.min(Number(dayText) || now.getDate(), maxDay);

  return { year, month, day };
}

export function FleetManagementScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const activeVehicles = useMemo(
    () => vehicles.filter(vehicle => vehicle.is_active).length,
    [vehicles],
  );
  const maintenanceVehicles = useMemo(
    () => vehicles.filter(vehicle => vehicle.status === 'maintenance').length,
    [vehicles],
  );

  const fetchVehicles = useCallback(
    async (targetSearch: string, mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();
        if (targetSearch.trim()) {
          params.set('search', targetSearch.trim());
        }
        params.set('active', 'true');
        params.set('limit', '200');

        const suffix = params.toString() ? `?${params.toString()}` : '';
        const data = await requestJson<OdooVehicleListResponse>(
          `${VEHICLE_ENDPOINT}${suffix}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-vehicles-list',
          },
        );

        setVehicles(normalizeVehicleList(data));
        setAppliedSearch(targetSearch.trim());
      } catch (vehicleError) {
        const message =
          vehicleError instanceof Error
            ? vehicleError.message
            : 'Không thể tải danh sách xe.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchVehicles('', 'initial');
  }, [fetchVehicles]);

  const searchVehicles = () => {
    fetchVehicles(searchText, 'initial');
  };

  const clearSearch = () => {
    setSearchText('');
    fetchVehicles('', 'initial');
  };

  const onRefresh = () => {
    if (loading || refreshing) {
      return;
    }

    fetchVehicles(appliedSearch, 'refresh');
  };

  const openAddModal = () => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      'Danh sách xe đang được lấy từ Odoo. Vui lòng thêm hoặc sửa xe trên Odoo.',
    );
  };

  const openEditModal = () => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      'Thông tin xe đang được đồng bộ từ Odoo. Vui lòng cập nhật trên Odoo.',
    );
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    setFormModalVisible(false);
    setEditingVehicle(null);
    setForm(emptyForm);
  };

  const updateForm = <K extends keyof VehicleForm>(
    key: K,
    value: VehicleForm[K],
  ) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const saveVehicle = async () => {
    if (!form.license_plate.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập biển số xe.');
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingVehicle);
      await requestJson<Vehicle>(
        isEditing
          ? `${VEHICLE_ENDPOINT}${editingVehicle?.id}/`
          : VEHICLE_ENDPOINT,
        {
          method: isEditing ? 'PATCH' : 'POST',
          auth: true,
          body: buildVehiclePayload(form),
          logLabel: isEditing ? 'vehicles-update' : 'vehicles-create',
        },
      );

      setFormModalVisible(false);
      setEditingVehicle(null);
      setForm(emptyForm);
      await fetchVehicles(appliedSearch, 'initial');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu thông tin xe.';
      Alert.alert('Lưu thất bại', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (vehicle: Vehicle) => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      `Xe ${vehicle.license_plate} đang được quản lý trên Odoo. Vui lòng xoá hoặc ngưng hoạt động trên Odoo.`,
    );
  };

  return (
    <ScreenContainer
      title="Quản lý đội xe"
      subtitle="Danh sách xe đồng bộ từ Odoo"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color={APP_COLORS.textSecondary}
            />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Tìm biển số hoặc tên xe"
              placeholderTextColor={APP_COLORS.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={searchVehicles}
            />
            {searchText ? (
              <Pressable
                style={styles.clearButton}
                onPress={clearSearch}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={APP_COLORS.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={searchVehicles}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={APP_COLORS.surface} size="small" />
            ) : (
              <Ionicons name="search" size={18} color={APP_COLORS.surface} />
            )}
            <Text style={styles.searchButtonText}>Tìm</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{vehicles.length}</Text>
            <Text style={styles.summaryLabel}>Tổng xe</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{activeVehicles}</Text>
            <Text style={styles.summaryLabel}>Đang hoạt động</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{maintenanceVehicles}</Text>
            <Text style={styles.summaryLabel}>Bảo dưỡng</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.sectionTitle}>Danh sách xe</Text>
            <Text style={styles.sectionHint}>
              {appliedSearch
                ? `Kết quả cho "${appliedSearch}"`
                : 'Dữ liệu xe đang hoạt động từ Odoo'}
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={24} color={APP_COLORS.surface} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.feedbackCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={APP_COLORS.danger}
            />
            <Text style={styles.feedbackTitle}>Không tải được dữ liệu</Text>
            <Text style={styles.feedbackText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchVehicles(appliedSearch, 'initial')}
            >
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !error ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={APP_COLORS.primaryDark} />
            <Text style={styles.feedbackText}>Đang tải danh sách xe...</Text>
          </View>
        ) : null}

        {!loading && !error && vehicles.length === 0 ? (
          <View style={styles.feedbackCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="bus-outline"
                size={26}
                color={APP_COLORS.primaryDark}
              />
            </View>
            <Text style={styles.feedbackTitle}>Chưa có xe</Text>
            <Text style={styles.feedbackText}>
              Chưa có xe hoạt động phù hợp trên Odoo.
            </Text>
          </View>
        ) : null}

        {!loading && !error
          ? vehicles.map(vehicle => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                deleting={false}
                onPress={() =>
                  Alert.alert(
                    'Dữ liệu từ Odoo',
                    'Chi tiết xe đang được quản lý trên Odoo. Vui lòng xem hoặc cập nhật trên Odoo.',
                  )
                }
                onEdit={openEditModal}
                onDelete={() => deleteVehicle(vehicle)}
              />
            ))
          : null}
      </ScrollView>

      <VehicleFormModal
        visible={formModalVisible}
        form={form}
        saving={saving}
        editing={Boolean(editingVehicle)}
        onChange={updateForm}
        onClose={closeFormModal}
        onSave={saveVehicle}
      />
    </ScreenContainer>
  );
}

function VehicleRow({
  vehicle,
  deleting,
  onPress,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  deleting: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[vehicle.status] || statusMeta.inactive;
  const name =
    `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() ||
    vehicle.vehicle_type_name ||
    'Chưa cập nhật';

  return (
    <Pressable
      style={({ pressed }) => [styles.vehicleRow, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="bus-outline" size={21} color={APP_COLORS.primaryDark} />
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.vehiclePlate} numberOfLines={1}>
            {vehicle.license_plate}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: meta.backgroundColor },
            ]}
          >
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>
        <Text style={styles.vehicleMeta} numberOfLines={1}>
          {name} •{' '}
          {vehicle.seat_count ? `${vehicle.seat_count} ghế` : 'Chưa có số ghế'}{' '}
          • {vehicle.color || 'Chưa có màu'}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          style={styles.iconButton}
          onPress={event => {
            event.stopPropagation();
            onEdit();
          }}
          hitSlop={8}
        >
          <Ionicons
            name="create-outline"
            size={17}
            color={APP_COLORS.primaryDark}
          />
        </Pressable>
        <Pressable
          style={[styles.iconButton, styles.deleteButton]}
          onPress={event => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          hitSlop={8}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={APP_COLORS.danger} />
          ) : (
            <Ionicons
              name="trash-outline"
              size={17}
              color={APP_COLORS.danger}
            />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

function VehicleFormModal({
  visible,
  form,
  saving,
  editing,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: VehicleForm;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof VehicleForm>(
    key: K,
    value: VehicleForm[K],
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [activeDateField, setActiveDateField] =
    useState<VehicleDateField | null>(null);
  const activeDateTitle =
    activeDateField === 'insurance_expiry'
      ? 'Chọn hạn bảo hiểm'
      : 'Chọn hạn đăng kiểm';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {editing ? 'Cập nhật xe' : 'Thêm xe mới'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Nhập thông tin xe và giấy tờ vận hành
              </Text>
            </View>
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={APP_COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <FormInput
              label="Biển số"
              value={form.license_plate}
              onChangeText={value => onChange('license_plate', value)}
              placeholder="29B-12345"
              autoCapitalize="characters"
            />
            <View style={styles.formRow}>
              <FormInput
                label="ID loại xe"
                value={form.vehicle_type}
                onChangeText={value => onChange('vehicle_type', value)}
                placeholder="2"
                keyboardType="number-pad"
                compact
              />
              <FormInput
                label="Số ghế"
                value={form.seat_count}
                onChangeText={value => onChange('seat_count', value)}
                placeholder="45"
                keyboardType="number-pad"
                compact
              />
            </View>
            <View style={styles.formRow}>
              <FormInput
                label="Hãng"
                value={form.brand}
                onChangeText={value => onChange('brand', value)}
                placeholder="Hyundai"
                compact
              />
              <FormInput
                label="Dòng xe"
                value={form.model}
                onChangeText={value => onChange('model', value)}
                placeholder="Universe"
                compact
              />
            </View>
            <View style={styles.formRow}>
              <FormInput
                label="Năm"
                value={form.year}
                onChangeText={value => onChange('year', value)}
                placeholder="2020"
                keyboardType="number-pad"
                compact
              />
              <FormInput
                label="Màu"
                value={form.color}
                onChangeText={value => onChange('color', value)}
                placeholder="Trắng"
                compact
              />
            </View>
            <View style={styles.formRow}>
              <DateField
                label="Hạn bảo hiểm"
                value={form.insurance_expiry}
                placeholder="Chọn ngày"
                onPress={() => setActiveDateField('insurance_expiry')}
                compact
              />
              <DateField
                label="Hạn đăng kiểm"
                value={form.registration_expiry}
                placeholder="Chọn ngày"
                onPress={() => setActiveDateField('registration_expiry')}
                compact
              />
            </View>
            <Text style={styles.formLabel}>Trạng thái</Text>
            <View style={styles.statusOptions}>
              {(Object.keys(statusMeta) as VehicleStatus[]).map(status => {
                const meta = statusMeta[status];
                const selected = form.status === status;
                return (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusOption,
                      selected && styles.statusOptionSelected,
                    ]}
                    onPress={() => onChange('status', status)}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={15}
                      color={selected ? APP_COLORS.surface : meta.color}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        selected && styles.statusOptionTextSelected,
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.formLabel}>Tiện ích</Text>
            <View style={styles.featureOptions}>
              <FeatureToggle
                label="Điều hoà"
                icon="snow-outline"
                selected={form.has_ac}
                onPress={() => onChange('has_ac', !form.has_ac)}
              />
              <FeatureToggle
                label="Wi-Fi"
                icon="wifi-outline"
                selected={form.has_wifi}
                onPress={() => onChange('has_wifi', !form.has_wifi)}
              />
              <FeatureToggle
                label="USB"
                icon="flash-outline"
                selected={form.has_usb}
                onPress={() => onChange('has_usb', !form.has_usb)}
              />
              <FeatureToggle
                label="TV"
                icon="tv-outline"
                selected={form.has_tv}
                onPress={() => onChange('has_tv', !form.has_tv)}
              />
              <FeatureToggle
                label="Toilet"
                icon="water-outline"
                selected={form.has_toilet}
                onPress={() => onChange('has_toilet', !form.has_toilet)}
              />
            </View>
            <Pressable
              style={styles.activeToggle}
              onPress={() => onChange('is_active', !form.is_active)}
            >
              <Ionicons
                name={form.is_active ? 'checkbox-outline' : 'square-outline'}
                size={20}
                color={APP_COLORS.primaryDark}
              />
              <Text style={styles.activeToggleText}>Xe đang hoạt động</Text>
            </Pressable>
            <FormInput
              label="Ghi chú"
              value={form.notes}
              onChangeText={value => onChange('notes', value)}
              placeholder="Ghi chú nội bộ"
              multiline
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Huỷ</Text>
            </Pressable>
            <Pressable
              style={styles.saveButton}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={APP_COLORS.surface} size="small" />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={17}
                  color={APP_COLORS.surface}
                />
              )}
              <Text style={styles.saveButtonText}>
                {editing ? 'Lưu sửa' : 'Thêm mới'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={Boolean(activeDateField)}
        title={activeDateTitle}
        value={activeDateField ? form[activeDateField] : ''}
        onClose={() => setActiveDateField(null)}
        onClear={() => {
          if (activeDateField) {
            onChange(activeDateField, '');
          }
          setActiveDateField(null);
        }}
        onSelect={value => {
          if (activeDateField) {
            onChange(activeDateField, value);
          }
          setActiveDateField(null);
        }}
      />
    </Modal>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  compact,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  multiline?: boolean;
  compact?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={[styles.formGroup, compact && styles.formGroupCompact]}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={APP_COLORS.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={[styles.formInput, multiline && styles.formTextArea]}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  placeholder,
  onPress,
  compact,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.formGroup, compact && styles.formGroupCompact]}>
      <Text style={styles.formLabel}>{label}</Text>
      <Pressable style={styles.dateField} onPress={onPress}>
        <Text
          style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={17}
          color={APP_COLORS.primaryDark}
        />
      </Pressable>
    </View>
  );
}

function FeatureToggle({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.featureOption, selected && styles.featureOptionSelected]}
      onPress={onPress}
    >
      <Ionicons
        name={selected ? 'checkbox-outline' : icon}
        size={16}
        color={selected ? APP_COLORS.surface : APP_COLORS.primaryDark}
      />
      <Text
        style={[
          styles.featureOptionText,
          selected && styles.featureOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DatePickerModal({
  visible,
  title,
  value,
  onClose,
  onClear,
  onSelect,
}: {
  visible: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onClear: () => void;
  onSelect: (value: string) => void;
}) {
  const initialDate = useMemo(() => parseDateValue(value), [value]);
  const [year, setYear] = useState(initialDate.year);
  const [month, setMonth] = useState(initialDate.month);
  const [day, setDay] = useState(initialDate.day);

  useEffect(() => {
    if (visible) {
      const nextDate = parseDateValue(value);
      setYear(nextDate.year);
      setMonth(nextDate.month);
      setDay(nextDate.day);
    }
  }, [value, visible]);

  const maxDay = getDaysInMonth(year, month);
  const selectedValue = formatDateValue(year, month, Math.min(day, maxDay));

  const changeYear = (amount: number) => {
    setYear(current => {
      const nextYear = Math.min(2099, Math.max(1940, current + amount));
      setDay(currentDay =>
        Math.min(currentDay, getDaysInMonth(nextYear, month)),
      );
      return nextYear;
    });
  };

  const changeMonth = (amount: number) => {
    setMonth(current => {
      const nextMonth = current + amount;
      if (nextMonth < 1) {
        setYear(currentYear => Math.max(1940, currentYear - 1));
        setDay(currentDay =>
          Math.min(currentDay, getDaysInMonth(year - 1, 12)),
        );
        return 12;
      }

      if (nextMonth > 12) {
        setYear(currentYear => Math.min(2099, currentYear + 1));
        setDay(currentDay => Math.min(currentDay, getDaysInMonth(year + 1, 1)));
        return 1;
      }

      setDay(currentDay =>
        Math.min(currentDay, getDaysInMonth(year, nextMonth)),
      );
      return nextMonth;
    });
  };

  const changeDay = (amount: number) => {
    setDay(current => Math.min(maxDay, Math.max(1, current + amount)));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerCard}>
          <View style={styles.datePickerHeader}>
            <View>
              <Text style={styles.datePickerTitle}>{title}</Text>
              <Text style={styles.datePickerPreview}>
                {formatDate(selectedValue)}
              </Text>
            </View>
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={APP_COLORS.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.dateWheelRow}>
            <DateStepper
              label="Ngày"
              value={padNumber(Math.min(day, maxDay))}
              onDecrease={() => changeDay(-1)}
              onIncrease={() => changeDay(1)}
            />
            <DateStepper
              label="Tháng"
              value={padNumber(month)}
              onDecrease={() => changeMonth(-1)}
              onIncrease={() => changeMonth(1)}
            />
            <DateStepper
              label="Năm"
              value={String(year)}
              onDecrease={() => changeYear(-1)}
              onIncrease={() => changeYear(1)}
            />
          </View>

          <View style={styles.datePickerFooter}>
            <Pressable style={styles.clearDateButton} onPress={onClear}>
              <Text style={styles.clearDateButtonText}>Xoá ngày</Text>
            </Pressable>
            <Pressable
              style={styles.pickDateButton}
              onPress={() => onSelect(selectedValue)}
            >
              <Ionicons name="checkmark" size={18} color={APP_COLORS.surface} />
              <Text style={styles.pickDateButtonText}>Chọn</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DateStepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.dateStepper}>
      <Text style={styles.dateStepperLabel}>{label}</Text>
      <Pressable style={styles.dateStepButton} onPress={onIncrease}>
        <Ionicons name="chevron-up" size={20} color={APP_COLORS.primaryDark} />
      </Pressable>
      <Text style={styles.dateStepperValue}>{value}</Text>
      <Pressable style={styles.dateStepButton} onPress={onDecrease}>
        <Ionicons
          name="chevron-down"
          size={20}
          color={APP_COLORS.primaryDark}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  searchCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    minWidth: 76,
    height: 44,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  searchButtonText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.primaryLight,
  },
  summaryValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 18,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    gap: 8,
  },
  feedbackTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  retryButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  vehicleRow: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rowPressed: {
    backgroundColor: APP_COLORS.primaryLight,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehiclePlate: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  vehicleMeta: {
    marginTop: 4,
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: APP_COLORS.dangerLight,
    borderColor: APP_COLORS.dangerLight,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 36, 35, 0.35)',
  },
  modalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    gap: 6,
  },
  formGroupCompact: {
    flex: 1,
  },
  formLabel: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  formInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    backgroundColor: APP_COLORS.background,
    fontSize: 13,
  },
  formTextArea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  dateField: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateFieldText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dateFieldPlaceholder: {
    color: APP_COLORS.textSecondary,
    fontWeight: '400',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusOptionSelected: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryDark,
  },
  statusOptionText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  statusOptionTextSelected: {
    color: APP_COLORS.surface,
  },
  featureOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureOptionSelected: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryDark,
  },
  featureOptionText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  featureOptionTextSelected: {
    color: APP_COLORS.surface,
  },
  activeToggle: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeToggleText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  saveButtonText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  datePickerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(8, 36, 35, 0.35)',
  },
  datePickerCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    gap: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  datePickerPreview: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  dateWheelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateStepper: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    backgroundColor: APP_COLORS.background,
    gap: 7,
  },
  dateStepperLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dateStepButton: {
    width: 34,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  dateStepperValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  datePickerFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  clearDateButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDateButtonText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  pickDateButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pickDateButtonText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '800',
  },
});
