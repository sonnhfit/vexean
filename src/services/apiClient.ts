import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const AUTH_STORAGE_KEY = 'vexean.auth';

type HeaderValue = string | undefined;

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  headers?: Record<string, HeaderValue>;
  body?: unknown;
  logLabel?: string;
  auth?: boolean;
};

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T | null;

  constructor(message: string, status: number, data: T | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type StoredAuth = {
  accessToken?: string | null;
};

function isJsonBody(body: unknown) {
  return (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams) &&
    typeof body !== 'string'
  );
}

function escapeShell(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildFullUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${API_BASE_URL}${pathOrUrl}`;
}

function buildCurlCommand(url: string, init: RequestInit) {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  const parts = ['curl', '-X', method];

  headers.forEach((value, key) => {
    const maskedValue =
      key.toLowerCase() === 'authorization' ? 'Bearer <redacted>' : value;
    parts.push('-H', escapeShell(`${key}: ${maskedValue}`));
  });

  if (init.body && typeof init.body === 'string') {
    parts.push('--data-raw', escapeShell(init.body));
  }

  parts.push(escapeShell(url));
  return parts.join(' ');
}

function logApi(message: string, payload: unknown) {
  if (!__DEV__) {
    return;
  }

  console.warn(message, payload);
}

async function getAuthHeader(auth: boolean | undefined) {
  if (!auth) {
    return undefined;
  }

  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }

    const accessToken = (parsed as StoredAuth).accessToken;
    if (!accessToken) {
      return undefined;
    }

    return `Bearer ${accessToken}`;
  } catch {
    return undefined;
  }
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function extractApiErrorMessage(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== 'object') {
    return undefined;
  }

  const data = responseBody as Record<string, unknown>;
  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (typeof data.error === 'string') {
    return data.error;
  }

  if (data.error && typeof data.error === 'object') {
    const apiError = data.error as Record<string, unknown>;
    if (typeof apiError.message === 'string') {
      return apiError.message;
    }
  }

  if (
    Array.isArray(data.non_field_errors) &&
    typeof data.non_field_errors[0] === 'string'
  ) {
    return data.non_field_errors[0];
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }

  return undefined;
}

export async function requestJson<T>(
  pathOrUrl: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, logLabel, auth, ...rest } = options;
  const url = buildFullUrl(pathOrUrl);

  const finalHeaders = new Headers(
    headers as Record<string, string> | undefined,
  );
  finalHeaders.set('Accept', 'application/json');

  const authHeader = await getAuthHeader(auth);
  if (authHeader && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', authHeader);
  }

  let finalBody: RequestInit['body'];
  if (isJsonBody(body)) {
    finalHeaders.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  } else if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    finalBody = body as RequestInit['body'];
  }

  const requestInit: RequestInit = {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  };

  const curlCommand = buildCurlCommand(url, requestInit);
  logApi(`[api${logLabel ? `:${logLabel}` : ''}] request`, curlCommand);

  const response = await fetch(url, requestInit);
  const responseBody = await readResponseBody(response);

  logApi(`[api${logLabel ? `:${logLabel}` : ''}] response`, {
    url,
    status: response.status,
    ok: response.ok,
    body: responseBody,
  });

  if (!response.ok) {
    const message =
      extractApiErrorMessage(responseBody) ||
      `Request failed with status ${response.status}`;
    logApi(`[api${logLabel ? `:${logLabel}` : ''}] error`, {
      url,
      status: response.status,
      body: responseBody,
    });
    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody as T;
}
