import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { toApiFailure } from "./errors";
import {
  accessToken,
  forgetTokens,
  refreshToken,
  replaceAccessToken,
} from "./tokens";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "/api";

export const REQUEST_TIMEOUT_MS = 20_000;

const NEVER_REFRESHED = ["/auth/login", "/auth/refresh", "/auth/logout"];

interface RetriedConfig extends InternalAxiosRequestConfig {
  retriedAfterRefresh?: boolean;
}

function isAuthRoute(url: string | undefined): boolean {
  return NEVER_REFRESHED.some((route) => (url ?? "").includes(route));
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  const token = accessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function requestNewAccessToken(): Promise<boolean> {
  const token = refreshToken();
  if (!token) return false;
  try {
    const response = await axios.post<{ access_token: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: token },
      { timeout: REQUEST_TIMEOUT_MS, headers: { Accept: "application/json" } },
    );
    if (!response.data?.access_token) return false;
    replaceAccessToken(response.data.access_token);
    return true;
  } catch {
    return false;
  }
}

export function refreshSession(): Promise<boolean> {
  refreshing ??= requestNewAccessToken().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const failure = toApiFailure(error);
    const config = (error as { config?: RetriedConfig }).config;

    if (
      failure.kind !== "unauthorized" ||
      !config ||
      config.retriedAfterRefresh ||
      isAuthRoute(config.url)
    ) {
      return Promise.reject(failure);
    }

    if (!(await refreshSession())) {
      forgetTokens("expired");
      return Promise.reject(failure);
    }

    config.retriedAfterRefresh = true;
    return http(config);
  },
);
