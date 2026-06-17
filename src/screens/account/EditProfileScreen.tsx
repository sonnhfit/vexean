import { useMemo, useState } from 'react';
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
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';
import { updateProfile } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';
import { getLinkedPhoneNumber } from '../../utils/userPhone';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const linkedPhone = useMemo(() => getLinkedPhoneNumber(user), [user]);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(linkedPhone);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if (!user) {
      showToast({
        type: 'warning',
        title: 'Chưa đăng nhập',
        message: 'Vui lòng đăng nhập lại để cập nhật hồ sơ.',
      });
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone_number: phoneNumber.trim(),
    };

    setSaving(true);
    try {
      await dispatch(updateProfile(payload)).unwrap();
      showToast({
        type: 'success',
        title: 'Đã cập nhật',
        message: 'Thông tin cá nhân đã được lưu.',
      });
      navigation.goBack();
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : 'Không cập nhật được hồ sơ. Vui lòng thử lại.';
      showToast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      title="Chỉnh sửa hồ sơ"
      subtitle="Cập nhật thông tin cá nhân và SĐT liên kết"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.noticeCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={APP_COLORS.primaryDark}
          />
          <Text style={styles.noticeText}>
            SĐT liên kết sẽ được dùng để hiển thị vé của tôi và đơn gửi hàng
            của tôi.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Field
            label="Tài khoản"
            value={user?.username || ''}
            editable={false}
          />
          <Field
            label="Tên"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="An"
          />
          <Field
            label="Họ / tên đệm"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nguyễn"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="SĐT liên kết"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="0909000000"
            keyboardType="phone-pad"
          />
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={saveProfile}
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
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={APP_COLORS.placeholder}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, !editable && styles.inputDisabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  formCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  inputDisabled: {
    color: APP_COLORS.textSecondary,
    backgroundColor: APP_COLORS.primaryLight,
  },
  saveButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
