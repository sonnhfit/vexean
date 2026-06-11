import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const LOGIN_ENDPOINT = 'https://backend.nhaxeannhien.vn/api/users/token/';

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

      const data = (await response.json().catch(() => null)) as Partial<LoginPayload> & {
        detail?: string;
        message?: string;
      };

      if (!response.ok) {
        const errorMessage = data?.detail || data?.message || 'Đăng nhập thất bại.';
        return rejectWithValue(errorMessage);
      }

      if (!data?.access || !data?.refresh || !data?.user) {
        return rejectWithValue('Dữ liệu đăng nhập không hợp lệ từ máy chủ.');
      }

      return {
        access: data.access,
        refresh: data.refresh,
        user: data.user,
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
