import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// --------------------
// In-Memory Token Cache (ป้องกัน Race Condition บน Android)
// --------------------
let inMemoryToken: string | null = null;

// --------------------
// Token Management
// --------------------

export async function saveToken(token: string): Promise<void> {
  inMemoryToken = token; // บันทึกลง Memory ทันที
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('userToken', token);
    }
    return;
  }

  await SecureStore.setItemAsync('userToken', token);
}

export async function getToken(): Promise<string | null> {
  // อ่านจาก Memory ก่อนเพื่อความเร็วสูงสุด
  if (inMemoryToken) {
    return inMemoryToken;
  }

  if (Platform.OS === 'web') {
    const webToken = typeof window !== 'undefined'
      ? window.localStorage.getItem('userToken')
      : null;
    inMemoryToken = webToken;
    return webToken;
  }

  const storedToken = await SecureStore.getItemAsync('userToken');
  inMemoryToken = storedToken;
  return storedToken;
}

export async function removeToken(): Promise<void> {
  inMemoryToken = null; // ล้าง Memory
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
    headers.delete('Content-Type');
  } else if (
    options.body != null &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`⚠️ [apiFetch] Warning: No token found when calling ${endpoint}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      console.log(`❌ [apiFetch] 401 Unauthorized from: ${endpoint}`);
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
        'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Network Timeout) กรุณาตรวจสอบการเชื่อมต่อ',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const fetchWithAuth = apiFetch;