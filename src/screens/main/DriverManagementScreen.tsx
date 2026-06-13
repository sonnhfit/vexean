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

type IconName = ComponentProps<typeof Ionicons>['name'];

type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'inactive';

type Driver = {
  id: number;
  user: number | null;
  full_name: string;
  phone: string;
  id_number: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  date_of_birth: string;
  address: string;
  avatar: string | null;
  status: DriverStatus;
  assigned_vehicle: number | null;
  assigned_vehicle_plate: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DriverForm = {
  full_name: string;
  phone: string;
  id_number: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  date_of_birth: string;
  address: string;
  status: DriverStatus;
  notes: string;
  is_active: boolean;
};

type DriverDateField = 'license_expiry' | 'date_of_birth';

type OdooDriver = {
  id: number;
  name: string;
  phone: string;
  license_number: string;
  license_type: string;
  license_expiry: string;
  active: boolean;
  note: string;
};

type OdooDriverListResponse = {
  results?: OdooDriver[];
};

const DRIVER_ENDPOINT = '/api/nhaxe/odoo/drivers/';

const statusMeta: Record<
  DriverStatus,
  { label: string; color: string; backgroundColor: string; icon: IconName }
> = {
  available: {
    label: 'Sẵn sàng',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  on_trip: {
    label: 'Đang chạy',
    color: APP_COLORS.info,
    backgroundColor: APP_COLORS.infoLight,
    icon: 'navigate-outline',
  },
  off_duty: {
    label: 'Nghỉ ca',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
    icon: 'moon-outline',
  },
  inactive: {
    label: 'Ngưng hoạt động',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'ban-outline',
  },
};

const emptyForm: DriverForm = {
  full_name: '',
  phone: '',
  id_number: '',
  license_number: '',
  license_class: '',
  license_expiry: '',
  date_of_birth: '',
  address: '',
  status: 'available',
  notes: '',
  is_active: true,
};

function mapOdooDriver(driver: OdooDriver): Driver {
  return {
    id: driver.id,
    user: null,
    full_name: driver.name || 'Chưa cập nhật',
    phone: driver.phone || '',
    id_number: '',
    license_number: driver.license_number || '',
    license_class: driver.license_type || '',
    license_expiry: driver.license_expiry || '',
    date_of_birth: '',
    address: '',
    avatar: null,
    status: driver.active ? 'available' : 'inactive',
    assigned_vehicle: null,
    assigned_vehicle_plate: null,
    notes: driver.note || '',
    is_active: driver.active,
    created_at: '',
    updated_at: '',
  };
}

function normalizeDriverList(data: OdooDriverListResponse) {
  return Array.isArray(data.results) ? data.results.map(mapOdooDriver) : [];
}

function buildDriverPayload(form: DriverForm) {
  return {
    full_name: form.full_name.trim(),
    phone: form.phone.trim(),
    id_number: form.id_number.trim(),
    license_number: form.license_number.trim(),
    license_class: form.license_class.trim(),
    license_expiry: form.license_expiry.trim() || null,
    date_of_birth: form.date_of_birth.trim() || null,
    address: form.address.trim(),
    status: form.status,
    notes: form.notes.trim(),
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

export function DriverManagementScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverForm>(emptyForm);

  const activeDrivers = useMemo(
    () => drivers.filter(driver => driver.is_active).length,
    [drivers],
  );
  const availableDrivers = useMemo(
    () => drivers.filter(driver => driver.status === 'available').length,
    [drivers],
  );

  const fetchDrivers = useCallback(
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
        const data = await requestJson<OdooDriverListResponse>(
          `${DRIVER_ENDPOINT}${suffix}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-drivers-list',
          },
        );

        setDrivers(normalizeDriverList(data));
        setAppliedSearch(targetSearch.trim());
      } catch (driverError) {
        const message =
          driverError instanceof Error
            ? driverError.message
            : 'Không thể tải danh sách tài xế.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchDrivers('', 'initial');
  }, [fetchDrivers]);

  const searchDrivers = () => {
    fetchDrivers(searchText, 'initial');
  };

  const clearSearch = () => {
    setSearchText('');
    fetchDrivers('', 'initial');
  };

  const onRefresh = () => {
    if (loading || refreshing) {
      return;
    }

    fetchDrivers(appliedSearch, 'refresh');
  };

  const openAddModal = () => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      'Danh sách tài xế đang được lấy từ Odoo. Vui lòng thêm hoặc sửa tài xế trên Odoo.',
    );
  };

  const openEditModal = () => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      'Thông tin tài xế đang được đồng bộ từ Odoo. Vui lòng cập nhật trên Odoo.',
    );
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    setFormModalVisible(false);
    setEditingDriver(null);
    setForm(emptyForm);
  };

  const updateForm = <K extends keyof DriverForm>(
    key: K,
    value: DriverForm[K],
  ) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const saveDriver = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập họ tên và số điện thoại tài xế.',
      );
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingDriver);
      await requestJson<Driver>(
        isEditing ? `${DRIVER_ENDPOINT}${editingDriver?.id}/` : DRIVER_ENDPOINT,
        {
          method: isEditing ? 'PATCH' : 'POST',
          auth: true,
          body: buildDriverPayload(form),
          logLabel: isEditing ? 'drivers-update' : 'drivers-create',
        },
      );

      setFormModalVisible(false);
      setEditingDriver(null);
      setForm(emptyForm);
      await fetchDrivers(appliedSearch, 'initial');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu thông tin tài xế.';
      Alert.alert('Lưu thất bại', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteDriver = async (driver: Driver) => {
    Alert.alert(
      'Dữ liệu từ Odoo',
      `Tài xế ${driver.full_name} đang được quản lý trên Odoo. Vui lòng xoá hoặc ngưng hoạt động trên Odoo.`,
    );
  };

  return (
    <ScreenContainer
      title="Quản lý tài xế"
      subtitle="Danh sách tài xế đồng bộ từ Odoo"
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
              placeholder="Tìm theo tên, SĐT hoặc số bằng lái"
              placeholderTextColor={APP_COLORS.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={searchDrivers}
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
            onPress={searchDrivers}
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
            <Text style={styles.summaryValue}>{drivers.length}</Text>
            <Text style={styles.summaryLabel}>Tổng hồ sơ</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{availableDrivers}</Text>
            <Text style={styles.summaryLabel}>Sẵn sàng</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{activeDrivers}</Text>
            <Text style={styles.summaryLabel}>Đang hoạt động</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.sectionTitle}>Danh sách tài xế</Text>
            <Text style={styles.sectionHint}>
              {appliedSearch
                ? `Kết quả cho "${appliedSearch}"`
                : 'Dữ liệu tài xế đang hoạt động từ Odoo'}
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
              onPress={() => fetchDrivers(appliedSearch, 'initial')}
            >
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !error ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={APP_COLORS.primaryDark} />
            <Text style={styles.feedbackText}>
              Đang tải danh sách tài xế...
            </Text>
          </View>
        ) : null}

        {!loading && !error && drivers.length === 0 ? (
          <View style={styles.feedbackCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="id-card-outline"
                size={26}
                color={APP_COLORS.primaryDark}
              />
            </View>
            <Text style={styles.feedbackTitle}>Chưa có tài xế</Text>
            <Text style={styles.feedbackText}>
              Chưa có tài xế hoạt động phù hợp trên Odoo.
            </Text>
          </View>
        ) : null}

        {!loading && !error
          ? drivers.map(driver => (
              <DriverCard
                key={driver.id}
                driver={driver}
                deleting={false}
                onEdit={openEditModal}
                onDelete={() => deleteDriver(driver)}
              />
            ))
          : null}
      </ScrollView>

      <DriverFormModal
        visible={formModalVisible}
        form={form}
        saving={saving}
        editing={Boolean(editingDriver)}
        onChange={updateForm}
        onClose={closeFormModal}
        onSave={saveDriver}
      />
    </ScreenContainer>
  );
}

function DriverCard({
  driver,
  deleting,
  onEdit,
  onDelete,
}: {
  driver: Driver;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[driver.status] || statusMeta.inactive;

  return (
    <View style={styles.driverRow}>
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarText}>
          {driver.full_name.trim().charAt(0).toUpperCase() || 'T'}
        </Text>
      </View>
      <View style={styles.driverTitleWrap}>
        <View style={styles.driverTitleLine}>
          <Text style={styles.driverName} numberOfLines={1}>
            {driver.full_name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: meta.backgroundColor },
            ]}
          >
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>
        <Text style={styles.driverPhone} numberOfLines={1}>
          {driver.phone || 'Chưa có SĐT'} • GPLX{' '}
          {driver.license_number || 'chưa cập nhật'} •{' '}
          {driver.assigned_vehicle_plate || 'chưa phân xe'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconButton} onPress={onEdit}>
          <Ionicons
            name="create-outline"
            size={17}
            color={APP_COLORS.primaryDark}
          />
        </Pressable>
        <Pressable
          style={[styles.iconButton, styles.deleteButton]}
          onPress={onDelete}
          disabled={deleting}
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
    </View>
  );
}

function DriverFormModal({
  visible,
  form,
  saving,
  editing,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  form: DriverForm;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof DriverForm>(key: K, value: DriverForm[K]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [activeDateField, setActiveDateField] =
    useState<DriverDateField | null>(null);
  const activeDateTitle =
    activeDateField === 'license_expiry'
      ? 'Chọn ngày hết hạn GPLX'
      : 'Chọn ngày sinh';

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
                {editing ? 'Cập nhật tài xế' : 'Thêm tài xế'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Nhập thông tin hồ sơ và giấy phép
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
              label="Họ tên"
              value={form.full_name}
              onChangeText={value => onChange('full_name', value)}
              placeholder="Nguyễn Văn A"
            />
            <FormInput
              label="Số điện thoại"
              value={form.phone}
              onChangeText={value => onChange('phone', value)}
              placeholder="0901234567"
              keyboardType="phone-pad"
            />
            <FormInput
              label="CCCD/CMND"
              value={form.id_number}
              onChangeText={value => onChange('id_number', value)}
              placeholder="001234567890"
              keyboardType="number-pad"
            />
            <View style={styles.formRow}>
              <FormInput
                label="Số GPLX"
                value={form.license_number}
                onChangeText={value => onChange('license_number', value)}
                placeholder="B2-001234"
                compact
              />
              <FormInput
                label="Hạng bằng"
                value={form.license_class}
                onChangeText={value => onChange('license_class', value)}
                placeholder="D"
                compact
              />
            </View>
            <View style={styles.formRow}>
              <DateField
                label="Ngày hết hạn"
                value={form.license_expiry}
                placeholder="Chọn ngày"
                onPress={() => setActiveDateField('license_expiry')}
                compact
              />
              <DateField
                label="Ngày sinh"
                value={form.date_of_birth}
                placeholder="Chọn ngày"
                onPress={() => setActiveDateField('date_of_birth')}
                compact
              />
            </View>
            <FormInput
              label="Địa chỉ"
              value={form.address}
              onChangeText={value => onChange('address', value)}
              placeholder="Hà Nội"
            />
            <Text style={styles.formLabel}>Trạng thái</Text>
            <View style={styles.statusOptions}>
              {(Object.keys(statusMeta) as DriverStatus[]).map(status => {
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
            <Pressable
              style={styles.activeToggle}
              onPress={() => onChange('is_active', !form.is_active)}
            >
              <Ionicons
                name={form.is_active ? 'checkbox-outline' : 'square-outline'}
                size={20}
                color={APP_COLORS.primaryDark}
              />
              <Text style={styles.activeToggleText}>Hồ sơ đang hoạt động</Text>
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

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  multiline?: boolean;
  compact?: boolean;
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
        style={[styles.formInput, multiline && styles.formTextArea]}
      />
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
  driverRow: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  avatarText: {
    color: APP_COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  driverTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  driverTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  driverPhone: {
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
  cardActions: {
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
    paddingBottom: 8,
    gap: 10,
  },
  formGroup: {
    gap: 6,
  },
  formGroupCompact: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
  },
  dateField: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontWeight: '500',
  },
  formTextArea: {
    minHeight: 82,
    textAlignVertical: 'top',
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
    backgroundColor: APP_COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  activeToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  activeToggleText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
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
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 11,
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(8, 36, 35, 0.45)',
  },
  datePickerCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    gap: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  datePickerPreview: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    gap: 8,
  },
  dateStepperLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  dateStepButton: {
    width: 38,
    height: 30,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepperValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  datePickerFooter: {
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  clearDateButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  clearDateButtonText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  pickDateButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  pickDateButtonText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '800',
  },
});
