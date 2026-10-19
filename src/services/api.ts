
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// --------------------
// Token Management
// --------------------

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('userToken', token);
    }
    return;
  }

  await SecureStore.setItemAsync('userToken', token);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem('userToken')
      : null;
  }

  return SecureStore.getItemAsync('userToken');
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userToken');
    }
    return;
  }

  await SecureStore.deleteItemAsync('userToken');
}

// --------------------
// API Fetch
// Supports JSON and FormData
// --------------------

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  if (isFormData) {
    // ให้ fetch สร้าง multipart boundary ให้อัตโนมัติ
    headers.delete('Content-Type');
  } else if (
    options.body != null &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      await removeToken();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
      }));

      throw new Error(
        errorData.message || `HTTP Error: ${response.status}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Network Timeout) กรุณาตรวจสอบ IP และการเชื่อมต่อ',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Alias สำหรับโค้ดเดิมที่ใช้ fetchWithAuth
export const fetchWithAuth = apiFetch;
