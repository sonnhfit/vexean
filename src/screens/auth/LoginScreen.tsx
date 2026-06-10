import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { APP_COLORS } from '../../theme/colors';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = Boolean(username && password);

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Ionicons name="bus-outline" size={28} color={APP_COLORS.primaryDark} />
          </View>
          <Text style={styles.brand}>An Nhiên</Text>
          <Text style={styles.heroTitle}>Chào mừng quay lại</Text>
          <Text style={styles.heroSubtitle}>
            Đăng nhập để tiếp tục theo dõi chuyến xe, hàng hoá và vận hành.
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="shield-checkmark-outline" size={14} color={APP_COLORS.primaryDark} />
              <Text style={styles.chipText}>An toàn</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="flash-outline" size={14} color={APP_COLORS.primaryDark} />
              <Text style={styles.chipText}>Nhanh</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="sync-outline" size={14} color={APP_COLORS.primaryDark} />
              <Text style={styles.chipText}>Đồng bộ</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={APP_COLORS.textSecondary} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={APP_COLORS.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                placeholder="Nhập mật khẩu"
                placeholderTextColor={APP_COLORS.textSecondary}
              />
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
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
          </View>

          <View style={styles.helperRow}>
            <Text style={styles.helperText}>Bạn đang dùng tài khoản nội bộ của hệ thống.</Text>
            <Pressable accessibilityRole="button">
              <Text style={styles.linkText}>Quên mật khẩu?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={signIn}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Đăng nhập</Text>
          </Pressable>

          <Text style={styles.footerNote}>
            Tip: dùng tài khoản nội bộ để vào ứng dụng vận hành.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: APP_COLORS.primaryLight,
    opacity: 0.9,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: APP_COLORS.infoLight,
    opacity: 0.7,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 18,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
    marginBottom: 12,
  },
  brand: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 8,
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    color: APP_COLORS.textPrimary,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  helperText: {
    flex: 1,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  linkText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    marginTop: 4,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    backgroundColor: APP_COLORS.border,
  },
  buttonText: {
    color: APP_COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 12,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
