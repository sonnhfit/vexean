import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { requestJson } from '../services/apiClient';

const AUTH_STORAGE_KEY = 'vexean.auth';

type UserPermissions = Record<string, boolean>;
type UserPhoneProfile = {
  phone?: string;
  phone_number?: string;
  role?: string;
};

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
  user_role?: UserPhoneProfile;
  employee?: UserPhoneProfile;
};

type LoginPayload = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export type UpdateProfileInput = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
};

type SignInInput = {
  username: string;
  password: string;
};

type RequestCustomerOtpInput = {
  phoneNumber: string;
};

type RequestCustomerOtpResponse = {
  phone_number?: string;
  message?: string;
  expires_in?: number;
};

type VerifyCustomerOtpInput = {
  phoneNumber: string;
  otpCode: string;
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

function isAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const asRecord = user as Record<string, unknown>;
  return typeof asRecord.id === 'number' && typeof asRecord.username === 'string';
}

function normalizeProfileUser(response: unknown): AuthUser | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const data = response as Record<string, unknown>;
  const id = typeof data.id === 'number' ? data.id : data.user_id;
  const username = data.username;
  const userRole =
    data.user_role && typeof data.user_role === 'object'
      ? (data.user_role as Record<string, unknown>)
      : undefined;

  if (typeof id !== 'number' || typeof username !== 'string') {
    return null;
  }

  return {
    id,
    username,
    full_name: typeof data.full_name === 'string' ? data.full_name : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    first_name:
      typeof data.first_name === 'string' ? data.first_name : undefined,
    last_name: typeof data.last_name === 'string' ? data.last_name : undefined,
    phone_number:
      typeof data.phone_number === 'string' ? data.phone_number : undefined,
    role: typeof data.role === 'string' ? data.role : undefined,
    role_display:
      typeof data.role_display === 'string' ? data.role_display : undefined,
    permissions:
      data.permissions && typeof data.permissions === 'object'
        ? (data.permissions as UserPermissions)
        : undefined,
    is_staff: typeof data.is_staff === 'boolean' ? data.is_staff : undefined,
    is_active:
      typeof data.is_active === 'boolean' ? data.is_active : undefined,
    user_role: userRole
      ? {
          role: typeof userRole.role === 'string' ? userRole.role : undefined,
          phone:
            typeof userRole.phone === 'string' ? userRole.phone : undefined,
          phone_number:
            typeof userRole.phone_number === 'string'
              ? userRole.phone_number
              : undefined,
        }
      : undefined,
  };
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
      if (__DEV__) {
        console.warn('[auth:signIn] start', { username });
      }

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
      if (__DEV__) {
        console.warn('[auth:signIn] failed', error instanceof Error ? { name: error.name, message: error.message } : error);
      }

      if (error instanceof Error && error.name === 'ApiError') {
        return rejectWithValue(error.message);
      }

      return rejectWithValue('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  },
);

export const requestCustomerOtp = createAsyncThunk<
  RequestCustomerOtpResponse,
  RequestCustomerOtpInput,
  { rejectValue: string }
>('auth/requestCustomerOtp', async ({ phoneNumber }, { rejectWithValue }) => {
  try {
    return await requestJson<RequestCustomerOtpResponse>(
      '/api/nhaxe/customer/register/',
      {
        method: 'POST',
        body: { phone_number: phoneNumber },
        logLabel: 'requestCustomerOtp',
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return rejectWithValue(error.message);
    }

    return rejectWithValue('Không thể gửi mã OTP. Vui lòng thử lại.');
  }
});

export const verifyCustomerOtp = createAsyncThunk<
  LoginPayload,
  VerifyCustomerOtpInput,
  { rejectValue: string }
>('auth/verifyCustomerOtp', async ({ phoneNumber, otpCode }, { rejectWithValue }) => {
  try {
    const response = await requestJson<Partial<LoginPayload>>(
      '/api/nhaxe/customer/verify-otp/',
      {
        method: 'POST',
        body: { phone_number: phoneNumber, otp_code: otpCode },
        logLabel: 'verifyCustomerOtp',
      },
    );

    if (!response.access || !response.refresh) {
      return rejectWithValue('Dữ liệu xác thực không hợp lệ từ máy chủ.');
    }

    const user = isAuthUser(response.user)
      ? response.user
      : normalizeProfileUser(
          await requestJson<unknown>('/api/users/profile/', {
            headers: { Authorization: `Bearer ${response.access}` },
            logLabel: 'customerProfile',
          }),
        );

    if (!user) {
      return rejectWithValue('Không lấy được thông tin tài khoản. Vui lòng thử lại.');
    }

    return { access: response.access, refresh: response.refresh, user };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return rejectWithValue(error.message);
    }

    return rejectWithValue('Không thể xác thực mã OTP. Vui lòng thử lại.');
  }
});

export const updateProfile = createAsyncThunk<
  AuthUser,
  UpdateProfileInput,
  { rejectValue: string }
>('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const response = await requestJson<unknown>('/api/users/profile/', {
      method: 'PATCH',
      auth: true,
      body: payload,
      logLabel: 'updateProfile',
    });
    const user = normalizeProfileUser(response);
    if (!user) {
      return rejectWithValue('Dữ liệu hồ sơ không hợp lệ từ máy chủ.');
    }

    return user;
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return rejectWithValue(error.message);
    }

    return rejectWithValue('Không cập nhật được hồ sơ. Vui lòng thử lại.');
  }
});

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
      })
      .addCase(requestCustomerOtp.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestCustomerOtp.fulfilled, state => {
        state.status = 'idle';
        state.error = null;
      })
      .addCase(requestCustomerOtp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Không thể gửi mã OTP.';
      })
      .addCase(verifyCustomerOtp.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyCustomerOtp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.user = action.payload.user;
        state.hydrated = true;
      })
      .addCase(verifyCustomerOtp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Xác thực mã OTP thất bại.';
      })
      .addCase(updateProfile.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = {
          ...state.user,
          ...action.payload,
        };
        state.hydrated = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Cập nhật hồ sơ thất bại.';
      });
  },
});

export const { signOut } = authSlice.actions;
export default authSlice.reducer;
