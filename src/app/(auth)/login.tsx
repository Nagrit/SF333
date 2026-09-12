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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase & Google Sign-In Imports
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

// ⚙️ กำหนดค่า Web Client ID ของ Google (ต้องตรงกับหน้า Register)
// GoogleSignin.configure({
//   webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
// });

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  // 🚀 ฟังก์ชันสุ่มรหัสเพื่อน (กรณีสมัครผ่าน Google ครั้งแรกจากหน้า Login)
  const generateFriendCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const getUniqueFriendCode = async () => {
    let uniqueCode = '';
    let isUnique = false;
    while (!isUnique) {
      uniqueCode = generateFriendCode();
      const q = query(collection(db, 'users'), where('friendCode', '==', uniqueCode));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      }
    }
    return uniqueCode;
  };

  // 🚀 ฟังก์ชันเข้าสู่ระบบด้วย Google
  // const handleGoogleLogin = async () => {
  //   try {
  //     setIsGoogleLoading(true);
  //     await GoogleSignin.hasPlayServices();
  //     const userInfo = await GoogleSignin.signIn();
  //     const idToken = userInfo.data?.idToken;

  //     if (!idToken) {
  //       throw new Error('ไม่สามารถดึงข้อมูล Token จาก Google ได้');
  //     }

  //     const credential = GoogleAuthProvider.credential(idToken);
  //     const userCredential = await signInWithCredential(auth, credential);
  //     const user = userCredential.user;
  //     const userToken = await user.getIdToken();

  //     // บันทึก Token ลง SecureStore
  //     await SecureStore.setItemAsync('userToken', userToken);
  //     await SecureStore.setItemAsync('userInfo', JSON.stringify({
  //       name: user.displayName || 'Google User',
  //       email: user.email,
  //       avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`
  //     }));

  //     // ตรวจสอบข้อมูลใน Firestore ว่าเคยบันทึกไว้หรือยัง
  //     const userDocRef = doc(db, 'users', user.uid);
  //     const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));

  //     if (userDocSnap.empty) {
  //       const uniqueFriendCode = await getUniqueFriendCode();
  //       const generatedUsername = user.email ? user.email.split('@')[0].toLowerCase() : `user_${user.uid.slice(0, 5)}`;

  //       await setDoc(userDocRef, {
  //         uid: user.uid,
  //         name: user.displayName || 'Google User',
  //         username: generatedUsername,
  //         email: user.email || '',
  //         friendCode: uniqueFriendCode,
  //         avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
  //         createdAt: new Date().toISOString(),
  //         totalGroups: 0,
  //         monthlyAppointments: 0,
  //         responseRate: '100%'
  //       });
  //     }

  //     router.replace('/');
  //   } catch (error: any) {
  //     console.log('Google Login Error:', error);
  //     Alert.alert('Google Login ไม่สำเร็จ', error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google');
  //   } finally {
  //     setIsGoogleLoading(false);
  //   }
  // };

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      const userToken = await user.getIdToken();

      await SecureStore.setItemAsync('userToken', userToken);
      await SecureStore.setItemAsync('userInfo', JSON.stringify({
        name: user.displayName || cleanEmail.split('@')[0],
        email: user.email,
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`
      }));

      if (rememberMe) {
        await SecureStore.setItemAsync('savedEmail', cleanEmail);
      } else {
        await SecureStore.deleteItemAsync('savedEmail');
      }

      router.replace('/');
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 12, 20) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.mainWrapper, { maxWidth: isTablet ? 500 : '100%' }]}>

            {/* Header Section */}
            <View style={[styles.headerSection, { marginBottom: isSmallScreen ? 12 : 20 }]}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' }}
                style={{
                  width: iconSize,
                  height: iconSize,
                  resizeMode: 'contain',
                  marginBottom: isSmallScreen ? 6 : 8,
                }}
              />
              <Text style={[styles.brandTitle, { fontSize: Math.max(15 * fontSizeBase, 14) }]}>
                friends Calendar
              </Text>
              
              <View style={styles.welcomeBox}>
                <Text style={[styles.welcomeText, { fontSize: Math.max(28 * fontSizeBase, 24) }]}>
                  HELLO!
                </Text>
                <Text style={[styles.welcomeSubText, { fontSize: Math.max(18 * fontSizeBase, 16) }]}>
                  Welcome back,
                </Text>
              </View>
            </View>

            {/* Form Card Section */}
            <View
              style={[
                styles.formCard,
                {
                  paddingHorizontal: normalize(26),
                  paddingTop: isSmallScreen ? 24 : 32,
                  paddingBottom: Math.max(insets.bottom + 24, 32),
                }
              ]}
            >
              <View style={[styles.cardHeader, { marginBottom: isSmallScreen ? 20 : 28 }]}>
                <Text style={[styles.cardTitle, { fontSize: Math.max(24 * fontSizeBase, 20) }]}>
                  LOGIN
                </Text>
                <Text style={[styles.cardSubtitle, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>
                  Enter your Email to continue
                </Text>
              </View>

              {/* Email Input */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <Mail color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Password Input */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <Lock color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#A0AEC0"
                  secureTextEntry={!showPassword}
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? (
                    <EyeOff color="#1C4E4E" size={normalize(20)} />
                  ) : (
                    <Eye color="#1C4E4E" size={normalize(20)} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Checkbox & Forgot Password */}
              <View style={[styles.rowBetween, { marginBottom: isSmallScreen ? 20 : 28 }]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Check color="#ffffff" size={13} strokeWidth={3} />}
                  </View>
                  <Text 
                    style={[styles.checkboxText, { fontSize: Math.max(14 * fontSizeBase, 13) }]}
                    numberOfLines={1}
                  >
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.forgotButton}
                  onPress={() => router.push('/forgot-password')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.forgotText, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { height: inputHeight }]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={[styles.primaryButtonText, { fontSize: Math.max(16 * fontSizeBase, 15) }]}>
                    LOGIN
                  </Text>
                )}
              </TouchableOpacity>

              {/* Social Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontSize: Math.max(13 * fontSizeBase, 12) }]}>Or Login with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons (Google Sign-In) */}
              {/* <View style={styles.socialRow}>
                <TouchableOpacity 
                  style={[styles.socialCircle, { width: inputHeight, height: inputHeight, borderRadius: inputHeight / 2 }]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  activeOpacity={0.8}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color="#1C4E4E" size="small" />
                  ) : (
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialImg} />
                  )}
                </TouchableOpacity>
              </View> */}

              {/* Footer Link */}
              <View style={styles.footerLinkRow}>
                <Text style={[styles.footerText, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={[styles.footerLink, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>
                    Sign up
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  mainWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandTitle: {
    fontWeight: '700',
    color: '#1C4E4E',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  welcomeBox: {
    alignItems: 'center',
    marginTop: 4,
  },
  welcomeText: {
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
  },
  welcomeSubText: {
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 2,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#489B9B',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {},
  cardTitle: {
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  cardSubtitle: {
    color: '#E0F2F1',
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    color: '#1C4E4E',
    fontWeight: '500',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    flex: 1,
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1C4E4E',
    borderColor: '#1C4E4E',
  },
  checkboxText: {
    color: '#ffffff',
    fontWeight: '600',
    flexShrink: 1,
  },
  forgotButton: {
    paddingVertical: 6,
    paddingLeft: 10,
  },
  forgotText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#1C4E4E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1C4E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#ffffff',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialCircle: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  socialImg: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#E0F2F1',
    fontWeight: '500',
  },
  footerLink: {
    color: '#ffffff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});