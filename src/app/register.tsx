import { useRouter } from 'expo-router';
import { Check, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
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

// Firebase Imports
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    // 1. Validation เช็คความถูกต้องของข้อมูล
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
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
      // 2. สมัครสมาชิกด้วย Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 3. อัปเดต Display Name บน Firebase Auth Profile
      await updateProfile(user, {
        displayName: fullName.trim(),
        photoURL: `https://picsum.photos/seed/${user.uid}/200`
      });

      // 4. บันทึกข้อมูลลง Cloud Firestore Collection 'users'
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        avatar: `https://picsum.photos/seed/${user.uid}/200`,
        createdAt: new Date().toISOString(),
        totalGroups: 0,
        monthlyAppointments: 0,
        responseRate: '100%'
      });

      Alert.alert('สำเร็จ', 'สมัครสมาชิกเรียบร้อยแล้ว!', [
        { text: 'ตกลง', onPress: () => router.replace('/login') }
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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}>
        
        {/* Header Illustration */}
        <View style={styles.headerSection}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' }}
            style={styles.calendarIcon}
          />
          <Text style={styles.brandTitle}>friends Calendar</Text>
        </View>

        {/* Teal Form Container */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>SIGN UP</Text>
          <Text style={styles.cardSubtitle}>Enter your details to create an account</Text>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <User color="#1C4E4E" size={18} style={styles.inputIcon} />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
              placeholderTextColor="#8EAEAE"
              style={styles.textInput}
            />
          </View>

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Lock color="#1C4E4E" size={18} style={styles.inputIcon} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#8EAEAE"
              secureTextEntry
              style={styles.textInput}
            />
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity 
            style={styles.termsRow} 
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Check color="#ffffff" size={12} />}
            </View>
            <Text style={styles.termsText}>
              By continuing, you agree with our <Text style={styles.termsBold}>Term service</Text> and <Text style={styles.termsBold}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Social Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialCircle, { backgroundColor: '#ffffff' }]}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.socialImg} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialCircle, { backgroundColor: '#1877F2' }]}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png' }} style={styles.socialImg} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialCircle, { backgroundColor: '#06C755' }]}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3670/3670089.png' }} style={styles.socialImg} />
            </TouchableOpacity>
          </View>

          {/* Return to Login */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  headerSection: { alignItems: 'center', paddingBottom: 12 },
  calendarIcon: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 4 },
  brandTitle: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', color: '#1C4E4E' },
  
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
    height: 42,
    marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  textInput: { flex: 1, fontSize: 13, color: '#1C4E4E' },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10 },
  checkbox: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#ffffff', marginRight: 8, marginTop: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#1C4E4E', borderColor: '#1C4E4E' },
  termsText: { color: '#ffffff', fontSize: 10, flex: 1, lineHeight: 14 },
  termsBold: { fontWeight: 'bold', textDecorationLine: 'underline' },

  primaryButton: {
    backgroundColor: '#1C4E4E',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  dividerText: { marginHorizontal: 8, color: '#ffffff', fontSize: 11 },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
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
  socialImg: { width: 24, height: 24, resizeMode: 'contain' },

  footerLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#ffffff', fontSize: 11 },
  footerLink: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', textDecorationLine: 'underline' },
});