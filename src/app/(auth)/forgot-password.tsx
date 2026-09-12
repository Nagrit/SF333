import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
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

// Firebase Auth Imports
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ส่งลิงก์รีเซ็ตรหัสผ่านผ่าน Firebase Auth
  const handleResetPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert('Error', 'Please enter your Email address');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      Alert.alert(
        'Email Sent', 
        'Password restore link has been sent to your email.',
        [{ text: 'OK', onPress: () => router.push('/login') }]
      );
    } catch (error: any) {
      let errorMessage = 'Failed to send password reset email.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }

      Alert.alert('Reset Failed', errorMessage);
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
          <Text style={styles.cardTitle}>Forgot Password</Text>
          <Text style={styles.cardSubtitle}>Enter your Email for password restore</Text>

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

          {/* Reset Password Button */}
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {/* Return to Login */}
          <TouchableOpacity 
            style={styles.returnButton} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.returnButtonText}>Return to Login</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1 },
  headerSection: { alignItems: 'center', paddingBottom: 24 },
  calendarIcon: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 4 },
  brandTitle: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', color: '#1C4E4E' },
  
  formCard: {
    flex: 1,
    backgroundColor: '#489B9B',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    paddingTop: 32,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 11, color: '#E0F2F1', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 8 },
  textInput: { flex: 1, fontSize: 13, color: '#1C4E4E' },

  primaryButton: {
    backgroundColor: '#1C4E4E',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  returnButton: { alignItems: 'center', paddingVertical: 8 },
  returnButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' },
});