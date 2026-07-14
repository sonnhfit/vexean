import { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { ToastProvider } from './src/components/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { bootstrapAuth, signOut } from './src/store/authSlice';
import { setSessionExpiredHandler } from './src/services/apiClient';
import { useAppDispatch } from './src/store/hooks';
import { store } from './src/store/store';
import { APP_COLORS } from './src/theme/colors';

const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: APP_COLORS.primary,
    background: APP_COLORS.background,
    card: APP_COLORS.surface,
    text: APP_COLORS.textPrimary,
    border: APP_COLORS.border,
  },
};

const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: APP_COLORS.primary,
  },
};

function AppContent({ isDarkMode }: { isDarkMode: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(bootstrapAuth());
    setSessionExpiredHandler(() => dispatch(signOut()));
    return () => setSessionExpiredHandler(null);
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer theme={isDarkMode ? darkNavigationTheme : lightNavigationTheme}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <AppContent isDarkMode={isDarkMode} />
    </Provider>
  );
}

export default App;
