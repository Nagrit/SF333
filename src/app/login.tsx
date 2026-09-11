import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Check, Lock, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase Auth & Firestore Imports
import {
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // ✅ แก้ Path ให้ตรงกับโฟลเดอร์ services

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth Config
  const redirectUri = makeRedirectUri({ native: 'calendarsf333://' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const googleToken = id_token || access_token;
      if (googleToken) {
        handleGoogleLogin(googleToken);
      }
    }
  }, [response]);

  // ล็อกอินผ่าน Google + ยืนยันตัวตนกับ Firebase
  const handleGoogleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      // 1. นำ Token จาก Google แปลงเป็น Firebase Credential
      const credential = GoogleAuthProvider.credential(token);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // 2. ตรวจสอบ/เพิ่มข้อมูลลงใน Cloud Firestore ถ้ายังไม่มีข้อมูล
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'Google User',
          email: user.email,
          avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
          createdAt: new Date().toISOString(),
          totalGroups: 0,
          monthlyAppointments: 0,
          responseRate: '100%'
        });
      }

      // 3. บันทึก Session และข้อมูล User ลง SecureStore
      const userToken = await user.getIdToken();
      await SecureStore.setItemAsync('userToken', userToken);
      await SecureStore.setItemAsync('userInfo', JSON.stringify({
        name: user.displayName || 'Google User',
        email: user.email,
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`
      }));

      router.replace('/');
    } catch (e: any) {
      Alert.alert('Login Failed', 'Google Sign-in กับ Firebase ไม่สำเร็จ: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ล็อกอินด้วย Email & Password ผ่าน Firebase
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Email and Password');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const userToken = await user.getIdToken();

      // บันทึก Session ลง SecureStore
      await SecureStore.setItemAsync('userToken', userToken);
      await SecureStore.setItemAsync('userInfo', JSON.stringify({
        name: user.displayName || email.split('@')[0],
        email: user.email,
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`
      }));

      router.replace('/');
    } catch (error: any) {
      let errorMessage = 'An error occurred during login.';
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}>

        {/* Header Illustration */}
        <View style={styles.headerSection}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' }}
            style={styles.calendarIcon}
          />
          <Text style={styles.brandTitle}>friends Calendar</Text>
          <Text style={styles.welcomeText}>HELLO!</Text>
          <Text style={styles.welcomeSubText}>Welcome back,</Text>
        </View>

        {/* Teal Form Container */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>LOGIN</Text>
          <Text style={styles.cardSubtitle}>Enter your Email to continue</Text>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Mail color="#1C4E4E" size={18} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#8EAEAE"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Lock color="#1C4E4E" size={18} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8EAEAE"
              secureTextEntry
              style={styles.textInput}
            />
          </View>

          {/* Remember me & Forgot Password */}
          <View style={styles.rowBetween}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Check color="#ffffff" size={12} />}
              </View>
              <Text style={styles.checkboxText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          {/* Social Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Login with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            {/* ปุ่ม Google */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: '#ffffff' }]}
              onPress={() => promptAsync && promptAsync()}
              disabled={!request || isLoading}
            >
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                style={styles.socialImg}
              />
            </TouchableOpacity>

            {/* ปุ่ม Facebook */}
            <TouchableOpacity style={[styles.socialCircle, { backgroundColor: '#1877F2' }]}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png' }}
                style={styles.socialImg}
              />
            </TouchableOpacity>

            {/* ปุ่ม LINE */}
            <TouchableOpacity style={[styles.socialCircle, { backgroundColor: '#06C755' }]}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3670/3670089.png' }}
                style={styles.socialImg}
              />
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1 },
  headerSection: { alignItems: 'center', paddingBottom: 20 },
  calendarIcon: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 4 },
  brandTitle: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', color: '#1C4E4E', marginBottom: 12 },
  welcomeText: { fontSize: 24, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  welcomeSubText: { fontSize: 20, fontWeight: '800', color: '#000000' },

  formCard: {
    flex: 1,
    backgroundColor: '#489B9B',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    paddingBottom: 40,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 11, color: '#E0F2F1', marginBottom: 16 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 8 },
  textInput: { flex: 1, fontSize: 13, color: '#1C4E4E' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#ffffff', marginRight: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#1C4E4E', borderColor: '#1C4E4E' },
  checkboxText: { color: '#ffffff', fontSize: 11, fontWeight: '500' },
  forgotText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },

  primaryButton: {
    backgroundColor: '#1C4E4E',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  dividerText: { marginHorizontal: 8, color: '#ffffff', fontSize: 11 },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  socialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  socialImg: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  socialTextBtn: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  footerLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#ffffff', fontSize: 11 },
  footerLink: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', textDecorationLine: 'underline' },
});