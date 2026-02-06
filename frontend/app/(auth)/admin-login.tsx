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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { authAPI } from '@/src/services/api';
import { t } from '@/src/utils/helpers';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login, language, setLanguage } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.adminLogin({ username, password });
      
      await login(response.data.access_token, {
        id: response.data.user_id,
        name: response.data.user_name,
        type: 'admin',
      });
      
      router.replace('/(admin)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid credentials');
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
        <Text style={styles.headerTitle}>{t('admin', language)} {t('login', language)}</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.formSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color={colors.secondary} />
          </View>
          <Text style={styles.title}>{t('admin', language)} Portal</Text>
          <Text style={styles.subtitle}>
            {language === 'en' 
              ? 'Enter your admin credentials to continue'
              : 'जारी रखने के लिए अपने क्रेडेंशियल दर्ज करें'}
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('username', language)}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor={colors.grayLight}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('password', language)}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.grayLight}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={colors.gray} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={styles.hintText}>
              {language === 'en' 
                ? 'Default: admin / admin123'
                : 'डिफ़ॉल्ट: admin / admin123'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!username || !password) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('login', language)}</Text>
            )}
          </TouchableOpacity>
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
  header: {
    backgroundColor: colors.secondary,
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
    color: colors.secondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
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
    backgroundColor: colors.secondary + '15',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    width: '100%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.black,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.info,
    marginLeft: spacing.xs,
  },
  button: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.grayLight,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
