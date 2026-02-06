import React, { useState } from 'react';
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
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { authAPI } from '@/src/services/api';
import { t } from '@/src/utils/helpers';

export default function CitizenLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, language, setLanguage } = useAuth();
  
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (mobile.length < 10) {
      Alert.alert(t('error', language), 'Please enter a valid 10-digit mobile number');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.sendOTP(mobile);
      setStep('otp');
      Alert.alert(t('success', language), 'OTP sent! Use 123456 for testing');
    } catch (error: any) {
      Alert.alert(t('error', language), error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('error', language), 'Please enter a valid 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authAPI.verifyOTP({ mobile, otp, name: name || undefined, language });
      await login(response.data.access_token, {
        id: response.data.user_id,
        name: response.data.user_name || name,
        mobile,
        type: 'citizen',
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('error', language), error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
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
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step === 'otp' && styles.stepActive]}>
            <Text style={[styles.stepNumber, step !== 'otp' && styles.stepNumberInactive]}>2</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {step === 'mobile' ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>{t('enterMobileNumber', language)}</Text>
              <Text style={styles.subtitle}>
                {language === 'en' 
                  ? 'We will send you an OTP to verify'
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

              <Text style={styles.optionalLabel}>{t('yourName', language)}</Text>
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

        {/* Test Hint */}
        <View style={styles.hintBox}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={styles.hintText}>
            {language === 'en' ? 'For testing, use OTP: 123456' : 'परीक्षण के लिए OTP: 123456'}
          </Text>
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  hintText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    marginLeft: spacing.sm,
  },
});
