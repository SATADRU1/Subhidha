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
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { isFirebaseConfigured } from '@/src/config/firebase';
import { t } from '@/src/utils/helpers';

export default function AdminLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loginWithEmail, language, setLanguage, isFirebaseReady } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('error', language), 'Please enter email and password');
      return;
    }
    if (!isFirebaseReady) {
      Alert.alert(t('error', language), 'Firebase is not configured. Add your Firebase config to .env');
      return;
    }
    setIsLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      router.replace('/(admin)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
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
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.accent, '#008577']}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('adminLogin', language)}</Text>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        >
          <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.formCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={40} color={colors.accent} />
          </View>
          <Text style={styles.title}>{t('adminLogin', language)}</Text>
          <Text style={styles.subtitle}>
            {language === 'en'
              ? 'Sign in with your Firebase admin email'
              : 'अपने Firebase ऐडमिन ईमेल से साइन इन करें'}
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder={t('password', language)}
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!email.trim() || !password) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading || !email.trim() || !password}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.primaryBtnText}>{t('login', language)}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.hintBox}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={styles.hintText}>
            {language === 'en'
              ? 'Use an account created in Firebase Console (Authentication > Users) with Email/Password sign-in enabled.'
              : 'Firebase Console में बनाया गया अकाउंट इस्तेमाल करें।'}
          </Text>
        </View>
      </View>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.accent,
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    color: colors.accent,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
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
    backgroundColor: colors.accent + '15',
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
  inputGroup: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.accent,
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
