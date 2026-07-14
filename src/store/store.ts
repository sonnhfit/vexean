import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { clearStoredAuth, writeStoredAuth } from '../services/authStorage';
import {
  deleteAccount,
  signIn,
  signOut,
  updateProfile,
  verifyCustomerOtp,
} from './authSlice';
import authReducer from './authSlice';

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  matcher: action =>
    signIn.fulfilled.match(action) || verifyCustomerOtp.fulfilled.match(action),
  effect: async action => {
    try {
      await writeStoredAuth({
          accessToken: action.payload.access,
          refreshToken: action.payload.refresh,
          user: action.payload.user,
      });
    } catch {
      // Ignore storage errors so login still works.
    }
  },
});

authListenerMiddleware.startListening({
  matcher: action =>
    signOut.match(action) || deleteAccount.fulfilled.match(action),
  effect: async () => {
    try {
      await clearStoredAuth();
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

      await writeStoredAuth({
          accessToken: state.auth.accessToken,
          refreshToken: state.auth.refreshToken,
          user: {
            ...state.auth.user,
            ...action.payload,
          },
      });
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
