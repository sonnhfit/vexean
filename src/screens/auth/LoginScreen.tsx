import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { requestCustomerOtp, verifyCustomerOtp } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(state => state.auth);
  const [phone, setPhone] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  const isLoading = status === 'loading';
  const isOtpStep = Boolean(submittedPhone);
  const normalizedPhone = normalizePhoneNumber(phone);
  const canSubmitPhone = Boolean(normalizedPhone) && !isLoading;
  const canSubmitOtp = otpCode.length === 6 && !isLoading;

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleRequestOtp = async () => {
    if (!canSubmitPhone) {
      return;
    }

    const action = await dispatch(
      requestCustomerOtp({ phoneNumber: normalizedPhone }),
    );
    if (!requestCustomerOtp.fulfilled.match(action)) {
      return;
    }

    const response = action.payload;
    setSubmittedPhone(response.phone_number || normalizedPhone);
    setOtpCode('');
    setResendSeconds(60);
  };

  const handleVerifyOtp = async () => {
    if (!canSubmitOtp) {
      return;
    }

    await dispatch(
      verifyCustomerOtp({ phoneNumber: submittedPhone, otpCode }),
    );
  };

  const handleChangePhone = () => {
    setSubmittedPhone('');
    setOtpCode('');
    setResendSeconds(0);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroWave} />
            <Pressable style={styles.backButton} accessibilityRole="button">
              <Ionicons name="arrow-back" size={28} color={APP_COLORS.surface} />
            </Pressable>
            <Text style={styles.heroTitle}>Xin chào</Text>
            <Text style={styles.heroSubtitle}>
              Đăng nhập để tận hưởng nhiều ưu đãi
            </Text>
            <View style={styles.busScene}>
              <View style={styles.busBack}>
                <View style={styles.busWindowWide} />
                <View style={styles.busWheel} />
              </View>
              <View style={styles.busFront}>
                <View style={styles.busWindowWide} />
                <View style={styles.busLines} />
                <View style={[styles.busWheel, styles.busWheelLeft]} />
                <View style={[styles.busWheel, styles.busWheelRight]} />
              </View>
            </View>
          </View>

          <View style={styles.formArea}>
            {!isOtpStep ? (
              <>
                <Text style={styles.formTitle}>Đăng nhập bằng số điện thoại</Text>
                <Text style={styles.formHint}>
                  Chúng tôi sẽ gửi mã OTP để xác thực tài khoản của bạn.
                </Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryBox}>
                    <Text style={styles.flagText}>🇻🇳</Text>
                    <Text style={styles.countryCode}>(+84)</Text>
                  </View>
                  <View style={styles.phoneInputWrap}>
                    <TextInput
                      value={phone}
                      onChangeText={value => setPhone(value.replace(/[^0-9+]/g, ''))}
                      placeholder="Số điện thoại"
                      placeholderTextColor="#b7b7b7"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      style={styles.phoneInput}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={handleRequestOtp}
                  disabled={!canSubmitPhone}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canSubmitPhone && styles.submitButtonDisabled,
                    pressed && canSubmitPhone && styles.buttonPressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={APP_COLORS.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Nhận mã OTP</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={styles.otpArea}>
                <Text style={styles.formTitle}>Nhập mã OTP</Text>
                <Text style={styles.formHint}>
                  Mã 6 số đã được gửi đến {displayPhoneNumber(submittedPhone)}.
                </Text>
                <TextInput
                  value={otpCode}
                  onChangeText={value => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  placeholderTextColor="#b7b7b7"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={styles.otpInput}
                  accessibilityLabel="Mã OTP gồm 6 chữ số"
                />
                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={!canSubmitOtp}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canSubmitOtp && styles.submitButtonDisabled,
                    pressed && canSubmitOtp && styles.buttonPressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={APP_COLORS.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Xác nhận và đăng nhập</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleRequestOtp}
                  disabled={isLoading || resendSeconds > 0}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendButtonText}>
                    {resendSeconds > 0
                      ? `Gửi lại mã sau ${resendSeconds}s`
                      : 'Gửi lại mã OTP'}
                  </Text>
                </Pressable>
                <Pressable onPress={handleChangePhone} style={styles.changePhoneButton}>
                  <Text style={styles.changePhoneText}>Đổi số điện thoại</Text>
                </Pressable>
              </View>
            )}

            {error ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) {
    return `+84${digits.slice(1)}`;
  }

  if (/^84\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return '';
}

function displayPhoneNumber(phoneNumber: string) {
  if (phoneNumber.startsWith('+84')) {
    return `0${phoneNumber.slice(3)}`;
  }

  return phoneNumber;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: APP_COLORS.surface,
  },
  hero: {
    minHeight: 274,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 28,
    backgroundColor: APP_COLORS.primaryDark,
  },
  heroWave: {
    position: 'absolute',
    top: -78,
    right: -54,
    width: 260,
    height: 240,
    borderRadius: 120,
    backgroundColor: APP_COLORS.primary,
    opacity: 0.28,
    transform: [{ rotate: '-26deg' }],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  heroTitle: {
    marginTop: 14,
    color: APP_COLORS.surface,
    fontSize: 24,
    fontWeight: '600',
  },
  heroSubtitle: {
    marginTop: 12,
    color: '#eef8f6',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  busScene: {
    height: 96,
    marginTop: 14,
  },
  busBack: {
    position: 'absolute',
    left: 86,
    bottom: 20,
    width: 156,
    height: 50,
    borderRadius: 8,
    borderTopWidth: 4,
    borderTopColor: '#b9e7e5',
    backgroundColor: '#8fc9c7',
  },
  busFront: {
    position: 'absolute',
    right: 28,
    bottom: 12,
    width: 204,
    height: 60,
    borderRadius: 8,
    borderTopWidth: 4,
    borderTopColor: '#f2f6f7',
    backgroundColor: '#edf4f4',
  },
  busWindowWide: {
    height: 20,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 4,
    backgroundColor: '#121212',
  },
  busLines: {
    position: 'absolute',
    right: 10,
    bottom: 18,
    width: 24,
    height: 2,
    backgroundColor: '#222222',
  },
  busWheel: {
    position: 'absolute',
    bottom: -9,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 5,
    borderColor: '#1f3f4a',
    backgroundColor: '#e4f4f3',
  },
  busWheelLeft: {
    left: 42,
  },
  busWheelRight: {
    right: 50,
  },
  formArea: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: APP_COLORS.surface,
  },
  formTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  formHint: {
    marginTop: 8,
    marginBottom: 20,
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 14,
  },
  countryBox: {
    width: 108,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: APP_COLORS.surface,
  },
  flagText: {
    fontSize: 18,
  },
  countryCode: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInputWrap: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.surface,
  },
  phoneInput: {
    color: '#111111',
    fontSize: 16,
    paddingVertical: 0,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  otpArea: {
    alignItems: 'stretch',
  },
  otpInput: {
    minHeight: 58,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 10,
    color: '#111111',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 10,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  resendButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '600',
  },
  changePhoneButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changePhoneText: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  primaryButtonText: {
    color: APP_COLORS.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  passwordModeButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9e4e3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fbfa',
  },
  passwordModeText: {
    color: APP_COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '600',
  },
  passwordCard: {
    marginTop: 12,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e7e6',
    padding: 12,
    backgroundColor: '#fbfcfc',
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: APP_COLORS.surface,
  },
  input: {
    flex: 1,
    color: '#111111',
    fontSize: 15,
    paddingVertical: 0,
  },
  errorText: {
    color: APP_COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  submitButtonDisabled: {
    backgroundColor: '#c7d2d1',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    color: APP_COLORS.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dedede',
  },
  dividerText: {
    color: '#222222',
    fontSize: 15,
  },
  socialButton: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 14,
    backgroundColor: APP_COLORS.surface,
  },
  googleMark: {
    width: 30,
    color: '#4285f4',
    fontSize: 24,
    fontWeight: '800',
  },
  socialButtonText: {
    flex: 1,
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 30,
  },
  registerRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    color: '#222222',
    fontSize: 14,
  },
  registerLink: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
