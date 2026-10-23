import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch } from '../../services/api';

// กำหนด Interface สำหรับข้อมูล Response จาก Forgot Password API
export interface ForgotPasswordResponse {
  message?: string;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลของคุณ');
      return;
    }

    setIsLoading(true);

    try {
      // ระบุ Generic Type <ForgotPasswordResponse> เพื่อให้ TypeScript รู้จัก property message
      const data = await apiFetch<ForgotPasswordResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });

      Alert.alert(
        'ส่งอีเมลสำเร็จ',
        data?.message || 'ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว',
        [{ text: 'ตกลง', onPress: () => router.push('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert('ทำรายการไม่สำเร็จ', error.message || 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้');
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
            paddingTop: Math.max(insets.top + 12, 20),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header Illustration */}
          <View style={{ alignItems: 'center', paddingBottom: 24, paddingHorizontal: 20 }}>
            <Image
              source={{ uri: 'https://res.cloudinary.com/j7d71pvq/image/upload/f_auto,q_auto/ปฏิทินเพื่อนสุดคิวต์' }}
              style={{ width: 200, height: 200, resizeMode: 'contain', marginBottom: 6 }}
            />
          </View>

          {/* Teal Form Container */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#489B9B',
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingHorizontal: 24,
              paddingTop: 32,
              paddingBottom: Math.max(insets.bottom + 24, 32),
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                letterSpacing: 0.5,
              }}
            >
              ฉันลืมรหัสผ่าน
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#E0F2F1',
                textAlign: 'center',
                marginTop: 4,
                marginBottom: 28,
              }}
            >
              กรุณาใส่อีเมลที่ใช้งาน เพื่อรับลิงค์รีเซ็ตรหัสผ่าน
            </Text>

            {/* Email Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                paddingHorizontal: 16,
                height: 52,
                marginBottom: 20,
              }}
            >
              <Mail color="#1C4E4E" size={20} style={{ marginRight: 12 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="อีเมล"
                placeholderTextColor="#8EAEAE"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#1C4E4E',
                  fontWeight: '500',
                }}
              />
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#1C4E4E',
                borderRadius: 14,
                height: 52,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                elevation: 4,
              }}
              onPress={handleResetPassword}
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
                    fontSize: 15,
                    letterSpacing: 0.5,
                  }}
                >
                  ส่งคำขอ
                </Text>
              )}
            </TouchableOpacity>

            {/* Return to Login */}
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 10 }}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: '700',
                  textDecorationLine: 'underline',
                }}
              >
               หน้าเข้าสู่ระบบ
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}