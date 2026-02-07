import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithPhoneNumber } from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { auth, isFirebaseConfigured } from '@/src/config/firebase';
import { t } from '@/src/utils/helpers';

export default function CitizenLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUserTypeAfterLogin, language, setLanguage, isFirebaseReady } = useAuth();

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<{ confirm: (code: string) => Promise<unknown> } | null>(null);

  const handleSendOTP = async () => {
    if (mobile.length < 10) {
      Alert.alert(t('error', language), 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!isFirebaseReady || !auth) {
      Alert.alert(t('error', language), 'Firebase is not configured. Add your Firebase config to .env');
      return;
    }
    setIsLoading(true);
    try {
      const fullPhone = '+91' + mobile;
      const verifier = recaptchaVerifier.current;
      if (!verifier) {
        Alert.alert(t('error', language), 'Verification not ready. Try again.');
        setIsLoading(false);
        return;
      }
      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmationResult(result as unknown as { confirm: (code: string) => Promise<unknown> });
      setStep('otp');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      Alert.alert(t('error', language), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('error', language), 'Please enter a valid 6-digit OTP');
      return;
    }
    if (!confirmationResult) {
      Alert.alert(t('error', language), 'Session expired. Please request OTP again.');
      return;
    }
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      await setUserTypeAfterLogin('citizen');
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid OTP';
      Alert.alert(t('error', language), message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="warning" size={48} color={colors.warning} />
        <Text style={styles.errorTitle}>Firebase not configured</Text>
        <Text style={styles.errorText}>
          Copy .env.example to .env and add your Firebase web app credentials (EXPO_PUBLIC_FIREBASE_*).
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={{
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        }}
      />
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('iAmCitizen', language)}</Text>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        >
          <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepIndicator}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step === 'otp' && styles.stepActive]}>
            <Text style={[styles.stepNumber, step !== 'otp' && styles.stepNumberInactive]}>2</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {step === 'mobile' ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>{t('enterMobileNumber', language)}</Text>
              <Text style={styles.subtitle}>
                {language === 'en'
                  ? 'We will send you an OTP to verify (Firebase Phone Auth)'
                  : 'हम आपको सत्यापित करने के लिए OTP भेजेंगे'}
              </Text>

              <View style={styles.phoneInput}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneField}
                  placeholder={t('mobileNumber', language)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, mobile.length < 10 && styles.btnDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading || mobile.length < 10}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('sendOTP', language)}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="keypad" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>{t('enterOTP', language)}</Text>
              <Text style={styles.subtitle}>
                {t('otpSentTo', language)} +91 {mobile}
              </Text>

              <TextInput
                style={styles.otpInput}
                placeholder="- - - - - -"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                textAlign="center"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.optionalLabel}>{t('yourName', language)} (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('name', language)}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textLight}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, otp.length !== 6 && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('verifyAndContinue', language)}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('mobile')} style={styles.linkBtn}>
                <Text style={styles.linkText}>{t('changeMobile', language)}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
  },
  langBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  langText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textWhite,
  },
  stepNumberInactive: {
    color: colors.textSecondary,
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  phoneInput: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: spacing.xl,
  },
  countryCode: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  countryCodeText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phoneField: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  otpInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 12,
    marginBottom: spacing.lg,
  },
  optionalLabel: {
    alignSelf: 'flex-start',
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.disabled,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textWhite,
  },
  linkBtn: {
    marginTop: spacing.lg,
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
});
