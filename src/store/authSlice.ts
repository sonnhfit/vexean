import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { requestJson } from '../services/apiClient';

const AUTH_STORAGE_KEY = 'vexean.auth';

type UserPermissions = Record<string, boolean>;

export type AuthUser = {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: string;
  role_display?: string;
  permissions?: UserPermissions;
  is_staff?: boolean;
  is_active?: boolean;
};

type LoginPayload = {
  access: string;
  refresh: string;
  user: AuthUser;
};

type SignInInput = {
  username: string;
  password: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  hydrated: boolean;
};

type PersistedAuthState = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'idle',
  error: null,
  hydrated: false,
};

function extractErrorMessage(errorData: unknown): string | undefined {
  if (!errorData || typeof errorData !== 'object') {
    return undefined;
  }

  const asRecord = errorData as Record<string, unknown>;
  const detail = asRecord.detail;
  const message = asRecord.message;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const first = detail[0];
    return typeof first === 'string' ? first : undefined;
  }

  if (typeof message === 'string') {
    return message;
  }

  return undefined;
}

function isAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const asRecord = user as Record<string, unknown>;
  return typeof asRecord.id === 'number' && typeof asRecord.username === 'string';
}

function isPersistedAuthState(value: unknown): value is PersistedAuthState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const asRecord = value as Record<string, unknown>;
  return (
    typeof asRecord.accessToken === 'string' &&
    typeof asRecord.refreshToken === 'string' &&
    isAuthUser(asRecord.user)
  );
}

export const bootstrapAuth = createAsyncThunk<PersistedAuthState | null>('auth/bootstrap', async () => {
  try {
    const storedValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    return isPersistedAuthState(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
});

export const signIn = createAsyncThunk<LoginPayload, SignInInput, { rejectValue: string }>(
  'auth/signIn',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const loginResponse = await requestJson<Partial<LoginPayload>>('/api/users/token/', {
        method: 'POST',
        body: { username, password },
        logLabel: 'signIn',
      });

      if (
        !loginResponse.access ||
        !loginResponse.refresh ||
        !loginResponse.user ||
        !isAuthUser(loginResponse.user)
      ) {
        return rejectWithValue('Dữ liệu đăng nhập không hợp lệ từ máy chủ.');
      }

      return {
        access: loginResponse.access,
        refresh: loginResponse.refresh,
        user: loginResponse.user,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        return rejectWithValue(error.message);
      }

      return rejectWithValue('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signOut: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      state.hydrated = true;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.hydrated = true;

        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
        }
      })
      .addCase(bootstrapAuth.rejected, state => {
        state.hydrated = true;
      })
      .addCase(signIn.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.user = action.payload.user;
        state.hydrated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Đăng nhập thất bại.';
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.hydrated = true;
      });
  },
});

export const { signOut } = authSlice.actions;
export default authSlice.reducer;
