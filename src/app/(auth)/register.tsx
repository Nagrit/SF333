import { useRouter } from 'expo-router';
import { AtSign, Check, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
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

export interface RegisterResponse {
  token?: string;
  message?: string;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    friendCode?: string;
  };
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scale = screenWidth / 375;
  const normalize = (size: number) => Math.round(size * scale);

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenHeight < 670;

  const iconSize = Math.min(Math.max(screenHeight * 0.08, 56), 110);
  const inputHeight = Math.min(Math.max(screenHeight * 0.06, 48), 58);
  const fontSizeBase = isTablet ? 1.2 : 1.05;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanName || !cleanUsername || !cleanEmail || !password || !confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (cleanUsername.length < 3) {
      Alert.alert('ข้อผิดพลาด', 'Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (password.length < 6) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('เงื่อนไขการใช้งาน', 'กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว');
      return;
    }

    setIsLoading(true);

    try {
      const data = await fetchWithAuth<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          password,
        }),
      });

      if (data?.token) {
        await saveToken(data.token);
      }

      Alert.alert('สำเร็จ', 'สมัครสมาชิกเรียบร้อยแล้ว!', [
        { text: 'ตกลง', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      Alert.alert('สมัครสมาชิกไม่สำเร็จ', error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
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
            paddingTop: Math.max(insets.top + 8, 16),
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
            {/* Header Illustration */}
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 20,
                marginBottom: isSmallScreen ? 8 : 16,
              }}
            >
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' }}
                style={{
                  width: iconSize,
                  height: iconSize,
                  resizeMode: 'contain',
                  marginBottom: isSmallScreen ? 4 : 6,
                }}
              />
              <Text
                style={{
                  fontWeight: '700',
                  color: '#1C4E4E',
                  letterSpacing: 0.5,
                  fontSize: Math.max(15 * fontSizeBase, 14),
                }}
              >
                friends Calendar
              </Text>
            </View>

            {/* Form Container */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#489B9B',
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                width: '100%',
                paddingHorizontal: normalize(26),
                paddingTop: isSmallScreen ? 20 : 28,
                paddingBottom: Math.max(insets.bottom + 20, 28),
                elevation: 8,
              }}
            >
              <View style={{ marginBottom: isSmallScreen ? 16 : 22 }}>
                <Text
                  style={{
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: 1,
                    fontSize: Math.max(24 * fontSizeBase, 20),
                  }}
                >
                  SIGN UP
                </Text>
                <Text
                  style={{
                    color: '#E0F2F1',
                    marginTop: 4,
                    fontSize: Math.max(13 * fontSizeBase, 12),
                  }}
                >
                  Enter your details to create an account
                </Text>
              </View>

              {/* Full Name */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  height: inputHeight,
                }}
              >
                <User color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name (ชื่อ - นามสกุล)"
                  placeholderTextColor="#8EAEAE"
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                />
              </View>

              {/* Username */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  height: inputHeight,
                }}
              >
                <AtSign color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username (เช่น john_doe)"
                  placeholderTextColor="#8EAEAE"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                />
              </View>

              {/* Email */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  height: inputHeight,
                }}
              >
                <Mail color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#8EAEAE"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                />
              </View>

              {/* Password */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  height: inputHeight,
                }}
              >
                <Lock color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#8EAEAE"
                  secureTextEntry
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                />
              </View>

              {/* Confirm Password */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  height: inputHeight,
                }}
              >
                <Lock color="#1C4E4E" size={normalize(20)} style={{ marginRight: 12 }} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="#8EAEAE"
                  secureTextEntry
                  style={{
                    flex: 1,
                    color: '#1C4E4E',
                    fontWeight: '500',
                    fontSize: Math.max(14 * fontSizeBase, 13),
                  }}
                />
              </View>

              {/* Terms Agreement */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginVertical: 8,
                  paddingRight: 10,
                }}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: agreeTerms ? '#1C4E4E' : '#ffffff',
                    backgroundColor: agreeTerms ? '#1C4E4E' : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {agreeTerms && <Check color="#ffffff" size={12} strokeWidth={3} />}
                </View>
                <Text
                  style={{
                    color: '#ffffff',
                    flex: 1,
                    lineHeight: 18,
                    fontSize: Math.max(12 * fontSizeBase, 11),
                  }}
                >
                  By continuing, you agree with our{' '}
                  <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    Terms of service
                  </Text>{' '}
                  and{' '}
                  <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#1C4E4E',
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 6,
                  marginBottom: 16,
                  height: inputHeight,
                  elevation: 4,
                }}
                onPress={handleSignUp}
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
                      fontSize: Math.max(15 * fontSizeBase, 14),
                    }}
                  >
                    SIGN UP
                  </Text>
                )}
              </TouchableOpacity>

              {/* Return to Login */}
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
                    fontSize: Math.max(13 * fontSizeBase, 12),
                  }}
                >
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      fontSize: Math.max(13 * fontSizeBase, 12),
                    }}
                  >
                    Sign in
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