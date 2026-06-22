import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import {
  signIn,
  signOut,
  updateProfile,
  verifyCustomerOtp,
} from './authSlice';
import authReducer from './authSlice';

const AUTH_STORAGE_KEY = 'vexean.auth';

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  matcher: action =>
    signIn.fulfilled.match(action) || verifyCustomerOtp.fulfilled.match(action),
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

authListenerMiddleware.startListening({
  actionCreator: updateProfile.fulfilled,
  effect: async (action, listenerApi) => {
    try {
      const state = listenerApi.getState() as RootState;
      if (!state.auth.accessToken || !state.auth.refreshToken) {
        return;
      }

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          accessToken: state.auth.accessToken,
          refreshToken: state.auth.refreshToken,
          user: {
            ...state.auth.user,
            ...action.payload,
          },
        }),
      );
    } catch {
      // Ignore storage errors so profile update still works.
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
