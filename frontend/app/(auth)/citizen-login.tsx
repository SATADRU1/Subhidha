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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { authAPI } from '../../src/services/api';
import { t } from '../../src/utils/helpers';

export default function CitizenLoginScreen() {
  const router = useRouter();
  const { login, language, setLanguage } = useAuth();
  
  const [step, setStep] = useState<'mobile' | 'otp' | 'details'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');

  const handleSendOTP = async () => {
    if (mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.sendOTP(mobile);
      setOtpHint(response.data.hint || '');
      setStep('otp');
      Alert.alert('OTP Sent', response.data.hint || 'OTP has been sent to your mobile');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.verifyOTP({
        mobile,
        otp,
        name: name || undefined,
        aadhaar_number: aadhaar || undefined,
        language,
      });
      
      await login(response.data.access_token, {
        id: response.data.user_id,
        name: response.data.user_name || name,
        mobile,
        type: 'citizen',
      });
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('citizen', language)} {t('login', language)}</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step !== 'mobile' && styles.stepDotCompleted]} />
          <View style={[styles.stepLine, step !== 'mobile' && styles.stepLineCompleted]} />
          <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
        </View>

        {step === 'mobile' && (
          <View style={styles.formSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('enterMobile', language)}</Text>
            <Text style={styles.subtitle}>
              {language === 'en' 
                ? 'We will send you an OTP to verify your number'
                : 'हम आपके नंबर को सत्यापित करने के लिए OTP भेजेंगे'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
                placeholderTextColor={colors.grayLight}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, mobile.length < 10 && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={isLoading || mobile.length < 10}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>{t('sendOTP', language)}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.formSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="keypad" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('enterOTP', language)}</Text>
            <Text style={styles.subtitle}>
              {language === 'en'
                ? `Enter the 6-digit OTP sent to +91 ${mobile}`
                : `+91 ${mobile} पर भेजा गया 6 अंकों का OTP दर्ज करें`}
            </Text>
            {otpHint && <Text style={styles.hint}>{otpHint}</Text>}

            <TextInput
              style={styles.otpInput}
              placeholder="- - - - - -"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
              placeholderTextColor={colors.grayLight}
            />

            {/* Optional Details */}
            <Text style={styles.optionalTitle}>
              {language === 'en' ? 'Optional Details' : 'वैकल्पिक विवरण'}
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder={t('enterName', language)}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.grayLight}
            />

            <TextInput
              style={styles.textInput}
              placeholder={t('enterAadhaar', language)}
              keyboardType="number-pad"
              maxLength={12}
              value={aadhaar}
              onChangeText={setAadhaar}
              placeholderTextColor={colors.grayLight}
            />

            <TouchableOpacity
              style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>{t('verifyOTP', language)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('mobile')} style={styles.linkButton}>
              <Text style={styles.linkText}>
                {language === 'en' ? 'Change Mobile Number' : 'मोबाइल नंबर बदलें'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  langButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
    marginBottom: spacing.xl,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.grayLighter,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.grayLighter,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  formSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  prefix: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    color: colors.black,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    fontSize: fontSize.lg,
    color: colors.black,
  },
  otpInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: '600',
    width: '100%',
    marginBottom: spacing.lg,
    letterSpacing: 8,
    color: colors.black,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    width: '100%',
    marginBottom: spacing.md,
    color: colors.black,
  },
  optionalTitle: {
    fontSize: fontSize.sm,
    color: colors.gray,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: colors.grayLight,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: spacing.lg,
  },
  linkText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
});
