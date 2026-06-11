import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { LOGIN_ENDPOINT } from '../config/api';

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
};

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'idle',
  error: null,
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

export const signIn = createAsyncThunk<LoginPayload, SignInInput, { rejectValue: string }>(
  'auth/signIn',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Đăng nhập thất bại.';
        try {
          const errorData = (await response.json()) as unknown;
          errorMessage = extractErrorMessage(errorData) || errorMessage;
        } catch {
        }
        return rejectWithValue(errorMessage);
      }

      let loginResponse: Partial<LoginPayload>;
      try {
        loginResponse = (await response.json()) as Partial<LoginPayload>;
      } catch {
        return rejectWithValue('Phản hồi máy chủ không hợp lệ. Vui lòng thử lại.');
      }

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
    } catch {
      return rejectWithValue('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signOut: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(signIn.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
        state.user = action.payload.user;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Đăng nhập thất bại.';
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
      });
  },
});

export const { signOut } = authSlice.actions;
export default authSlice.reducer;
