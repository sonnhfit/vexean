import { useState } from 'react';
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
import { signIn } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(state => state.auth);
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);

  const isLoading = status === 'loading';
  const canSubmit = Boolean(username.trim() && password) && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    await dispatch(signIn({ username: username.trim(), password }));
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
            {usePasswordLogin ? (
              <View style={styles.passwordCard}>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={APP_COLORS.textSecondary}
                  />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    placeholder="Username"
                    placeholderTextColor="#a7a7a7"
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={APP_COLORS.textSecondary}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    placeholder="Password"
                    placeholderTextColor="#a7a7a7"
                  />
                  <Pressable
                    onPress={() => setShowPassword(value => !value)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={APP_COLORS.textSecondary}
                    />
                  </Pressable>
                </View>
                {error ? (
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.submitButton,
                    !canSubmit && styles.submitButtonDisabled,
                    pressed && canSubmit && styles.buttonPressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={APP_COLORS.surface} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Đăng nhập
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.phoneRow}>
                  <Pressable style={styles.countryBox} accessibilityRole="button">
                    <Text style={styles.flagText}>🇻🇳</Text>
                    <Text style={styles.countryCode}>(+84)</Text>
                    <Ionicons name="chevron-down" size={18} color="#111111" />
                  </Pressable>
                  <View style={styles.phoneInputWrap}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Số điện thoại"
                      placeholderTextColor="#b7b7b7"
                      keyboardType="phone-pad"
                      style={styles.phoneInput}
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setUsePasswordLogin(true)}
                >
                  <Text style={styles.primaryButtonText}>Đăng nhập</Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.passwordModeButton}
              onPress={() => setUsePasswordLogin(value => !value)}
            >
              <Ionicons
                name={usePasswordLogin ? 'call-outline' : 'key-outline'}
                size={18}
                color={APP_COLORS.primaryDark}
              />
              <Text style={styles.passwordModeText}>
                {usePasswordLogin
                  ? 'Sử dụng số điện thoại'
                  : 'Sử dụng username/password'}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButton provider="google" title="Tiếp tục với Google" />
            <SocialButton provider="apple" title="Tiếp tục với Apple" />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
              <Pressable>
                <Text style={styles.registerLink}>Đăng ký</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SocialButton({
  provider,
  title,
}: {
  provider: 'google' | 'apple';
  title: string;
}) {
  return (
    <Pressable style={styles.socialButton}>
      {provider === 'google' ? (
        <Text style={styles.googleMark}>G</Text>
      ) : (
        <Ionicons name="logo-apple" size={28} color="#000000" />
      )}
      <Text style={styles.socialButtonText}>{title}</Text>
    </Pressable>
  );
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
