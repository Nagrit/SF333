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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase & Google Sign-In Imports
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

// ⚙️ กำหนดค่า Web Client ID ของ Google (เปลี่ยนเป็นค่า Web Client ID จริงจาก Firebase Console ของคุณ)
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', 
});

export default function RegisterScreen() {
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

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ฟังก์ชันสุ่มรหัสเพื่อน (Friend Code / User ID)
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

  // 🚀 ฟังก์ชันสมัครสมาชิก / ล็อกอินด้วย Google
  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('ไม่สามารถดึงข้อมูล Token จาก Google ได้');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));

      if (userDocSnap.empty) {
        const uniqueFriendCode = await getUniqueFriendCode();
        const generatedUsername = user.email ? user.email.split('@')[0].toLowerCase() : `user_${user.uid.slice(0, 5)}`;

        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'Google User',
          username: generatedUsername,
          email: user.email || '',
          friendCode: uniqueFriendCode,
          avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
          createdAt: new Date().toISOString(),
          totalGroups: 0,
          monthlyAppointments: 0,
          responseRate: '100%'
        });
      }

      Alert.alert('สำเร็จ', 'เข้าสู่ระบบด้วย Google เรียบร้อย!', [
        { text: 'ตกลง', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.log('Google Sign-In Error:', error);
      Alert.alert('Google Sign-In ไม่สำเร็จ', error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async () => {
    const trimmedUsername = username.trim().toLowerCase();

    if (!fullName.trim() || !trimmedUsername || !email.trim() || !password || !confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
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
      const usernameQuery = query(collection(db, 'users'), where('username', '==', trimmedUsername));
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        Alert.alert('Username ถูกใช้งานแล้ว', 'กรุณาใช้ชื่อ Username อื่นสำหรับลงทะเบียน');
        setIsLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const uniqueFriendCode = await getUniqueFriendCode();

      await updateProfile(user, {
        displayName: fullName.trim(),
        photoURL: `https://picsum.photos/seed/${user.uid}/200`
      });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: fullName.trim(),
        username: trimmedUsername,
        email: email.trim().toLowerCase(),
        friendCode: uniqueFriendCode,
        avatar: `https://picsum.photos/seed/${user.uid}/200`,
        createdAt: new Date().toISOString(),
        totalGroups: 0,
        monthlyAppointments: 0,
        responseRate: '100%'
      });

      Alert.alert('สำเร็จ', `สมัครสมาชิกเรียบร้อย!\nรหัสเพื่อนของคุณคือ: ${uniqueFriendCode}`, [
        { text: 'ตกลง', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error: any) {
      let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'อีเมลนี้ถูกใช้งานในระบบแล้ว';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'รหัสผ่านไม่ปลอดภัยพอ';
      }
      Alert.alert('สมัครสมาชิกไม่สำเร็จ', errorMessage);
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
            
            {/* Header Illustration */}
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
            </View>

            {/* Form Container */}
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
                <Text style={[styles.cardTitle, { fontSize: Math.max(24 * fontSizeBase, 20) }]}>SIGN UP</Text>
                <Text style={[styles.cardSubtitle, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>
                  Enter your details to create an account
                </Text>
              </View>

              {/* Full Name */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <User color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor="#8EAEAE"
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Username */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <AtSign color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor="#8EAEAE"
                  autoCapitalize="none"
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Email */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <Mail color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#8EAEAE"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <Lock color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#8EAEAE"
                  secureTextEntry
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Confirm Password */}
              <View style={[styles.inputWrapper, { height: inputHeight }]}>
                <Lock color="#1C4E4E" size={normalize(20)} style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="#8EAEAE"
                  secureTextEntry
                  style={[styles.textInput, { fontSize: Math.max(15 * fontSizeBase, 14) }]}
                />
              </View>

              {/* Terms Agreement */}
              <TouchableOpacity 
                style={styles.termsRow} 
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && <Check color="#ffffff" size={13} strokeWidth={3} />}
                </View>
                <Text style={[styles.termsText, { fontSize: Math.max(13 * fontSizeBase, 12) }]}>
                  By continuing, you agree with our <Text style={styles.termsBold}>Term service</Text> and <Text style={styles.termsBold}>Privacy Policy</Text>.
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity 
                style={[styles.primaryButton, { height: inputHeight }]} 
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={[styles.primaryButtonText, { fontSize: Math.max(16 * fontSizeBase, 15) }]}>SIGN UP</Text>
                )}
              </TouchableOpacity>

              {/* Social Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontSize: Math.max(13 * fontSizeBase, 12) }]}>Or Sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons (เชื่อมต่อ Google Sign-In) */}
              <View style={styles.socialRow}>
                <TouchableOpacity 
                  style={[styles.socialCircle, { width: inputHeight, height: inputHeight, borderRadius: inputHeight / 2 }]}
                  onPress={handleGoogleSignUp}
                  disabled={isGoogleLoading}
                  activeOpacity={0.8}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color="#1C4E4E" size="small" />
                  ) : (
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialImg} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Return to Login */}
              <View style={styles.footerLinkRow}>
                <Text style={[styles.footerText, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={[styles.footerLink, { fontSize: Math.max(14 * fontSizeBase, 13) }]}>Sign in</Text>
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
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#1C4E4E',
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1C4E4E',
    borderColor: '#1C4E4E',
  },
  termsText: {
    color: '#ffffff',
    flex: 1,
    lineHeight: 20,
  },
  termsBold: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#1C4E4E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
    marginBottom: 20,
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
    gap: 20,
    marginBottom: 24,
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