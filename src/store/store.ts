import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import authReducer, { signIn, signOut } from './authSlice';

const AUTH_STORAGE_KEY = 'vexean.auth';

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  actionCreator: signIn.fulfilled,
  effect: async action => {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          accessToken: action.payload.access,
          refreshToken: action.payload.refresh,
          user: action.payload.user,
        }),
      );
    } catch {
      // Ignore storage errors so login still works.
    }
  },
});

authListenerMiddleware.startListening({
  actionCreator: signOut,
  effect: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors during logout.
    }
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(authListenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
