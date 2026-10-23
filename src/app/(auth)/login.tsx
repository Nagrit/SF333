import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Check, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchWithAuth, saveToken } from '../../services/api';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
}

export interface LoginResponse {
  token: string;
  user?: UserProfile;
  message?: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scale = screenWidth / 375;
  const normalize = (size: number) => Math.round(size * scale);

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenHeight < 670;

  const iconSize = Math.min(Math.max(screenHeight * 0.09, 64), 120);
  const inputHeight = Math.min(Math.max(screenHeight * 0.065, 52), 62);
  const fontSizeBase = isTablet ? 1.2 : 1.05;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSavedEmail();
  }, []);

  const loadSavedEmail = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync('savedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {
      console.log('Error loading saved email:', e);
    }
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending login request for:', cleanEmail);
      const data = await fetchWithAuth<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      if (!data?.token) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบ Token จากเซิร์ฟเวอร์ กรุณาเช็ก Response จาก Backend');
        return;
      }

      // 1. เซฟ Token ลง SecureStore
      console.log('1. Saving token...');
      await saveToken(data.token);
      console.log('2. Token saved successfully!');

      // 2. เซฟข้อมูล User
      if (data?.user) {
        try {
          await SecureStore.setItemAsync('userInfo', JSON.stringify(data.user));
          console.log('3. User info saved');
        } catch (storeError) {
          console.warn('Failed to save userInfo:', storeError);
        }
      }

      // 3. จัดการ Remember Me
      if (rememberMe) {
        try {
          await SecureStore.setItemAsync('savedEmail', cleanEmail);
        } catch (storeError) {
          console.warn('Failed to save email to SecureStore:', storeError);
        }
      } else {
        try {
          await SecureStore.deleteItemAsync('savedEmail');
        } catch (storeError) {
          console.warn('Failed to delete savedEmail:', storeError);
        }
      }

      // 4. สั่งนำทางไปยังหน้าหลักครั้งเดียว
      console.log('4. Navigating to (tabs)...');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingTop: Math.max(insets.top + 12, 20),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View
            style={{
              flex: 1,
              width: '100%',
              maxWidth: isTablet ? 500 : '100%',
              justifyContent: 'space-between',
            }}
          >
            {/* Header Section */}
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 20,
                marginBottom: isSmallScreen ? 12 : 20,
              }}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/j7d71pvq/image/upload/f_auto,q_auto/ปฏิทินเพื่อนสุดคิวต์' }}
                style={{
                  width: iconSize * 3, 
                  height: iconSize * 3,
                  resizeMode: 'contain',
                  marginBottom: isSmallScreen ? 12 : 2,
                }}
              />
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Text
                  style={{
                    fontWeight: '700',
                    color: '#000000',
                    letterSpacing: 1.2,
                    fontSize: Math.max(28 * fontSizeBase, 24),
                  }}
                >
                  สวัสดี!
                </Text>
                <Text
                  style={{
                    fontWeight: '700',
                    color: '#4A5568',
                    marginTop: 2,
                    fontSize: Math.max(18 * fontSizeBase, 16),
                  }}
                >
                  Welcome back,
                </Text>
              </View>
            </View>

            {/* Form Card Section */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#489B9B',
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                width: '100%',
                paddingHorizontal: normalize(26),
                paddingTop: isSmallScreen ? 24 : 32,
                paddingBottom: Math.max(insets.bottom + 24, 32),
                elevation: 8,
              }}
            >
              <View style={{ marginBottom: isSmallScreen ? 20 : 28 }}>
                <Text
                  style={{
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: 1,
                    fontSize: Math.max(24 * fontSizeBase, 20),
                  }}
                >
                  เข้าสู่ระบบ
                </Text>
                <Text
                  style={{
                    color: '#E0F2F1',
                    marginTop: 4,
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                >
                  กรอกอีเมลและรหัสผ่าน เพื่อเข้าสู่ระบบ
                </Text>
              </View>

              {/* Email Input */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 16,
                  height: inputHeight,
                }}
              >
                <Mail color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(15 * fontSizeBase, 14),
                  }}
                />
              </View>

              {/* Password Input */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 16,
                  height: inputHeight,
                }}
              >
                <Lock color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#A0AEC0"
                  secureTextEntry={!showPassword}
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(15 * fontSizeBase, 14),
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 6 }}
                >
                  {showPassword ? (
                    <EyeOff color="#1C4E4E" size={normalize(20)} />
                  ) : (
                    <Eye color="#1C4E4E" size={normalize(20)} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Checkbox & Forgot Password */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                  marginBottom: isSmallScreen ? 20 : 28,
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    flex: 1,
                    paddingRight: 10,
                  }}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: rememberMe ? '#1C4E4E' : '#ffffff',
                      backgroundColor: rememberMe ? '#1C4E4E' : 'transparent',
                      marginRight: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {rememberMe && <Check color="#ffffff" size={13} strokeWidth={3} />}
                  </View>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontWeight: '600',
                      flexShrink: 1,
                      fontSize: Math.max(12 * fontSizeBase, 13),
                    }}
                    numberOfLines={1}
                  >
                    จำการเข้าสู่ระบบ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 6, paddingLeft: 10 }}
                  onPress={() => router.push('/(auth)/forgot-password')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: Math.max(14 * fontSizeBase, 13),
                    }}
                  >
                    ลืมรหัสผ่าน?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#1C4E4E',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                  height: inputHeight,
                  elevation: 4,
                }}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text
                    style={{
                      color: '#ffffff',
                      fontWeight: '800',
                      letterSpacing: 1,
                      fontSize: Math.max(16 * fontSizeBase, 15),
                    }}
                  >
                    เข้าสู่ระบบ
                  </Text>
                )}
              </TouchableOpacity>

              {/* Footer Link */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#E0F2F1',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                >
                  ยังไม่มีบัญชีผู้ใช้?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      fontSize: Math.max(14 * fontSizeBase, 13),
                    }}
                  >
                    สมัครบัญชีผู้ใช้
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}