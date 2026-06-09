import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScreenContainer title="Đăng nhập hệ thống" subtitle="Sử dụng tài khoản users hiện có">
      <View style={styles.formGroup}>
        <Text style={styles.label}>Tên đăng nhập</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
          placeholder="Nhập tên đăng nhập"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholder="Nhập mật khẩu"
        />
      </View>
      <Button title="Đăng nhập" onPress={signIn} disabled={!username || !password} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
