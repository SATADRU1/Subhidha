import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { t } from '@/src/utils/helpers';

export default function LandingScreen() {
  const router = useRouter();
  const { language, setLanguage, isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    // If already authenticated, redirect to appropriate dashboard
    if (isAuthenticated && user) {
      if (user.type === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, user]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <View style={styles.container}>
      {/* Language Toggle */}
      <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
        <Text style={styles.langText}>{language === 'en' ? 'हिंदी' : 'English'}</Text>
      </TouchableOpacity>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="business" size={64} color={colors.white} />
        </View>
        <Text style={styles.appName}>SUVIDHA</Text>
        <Text style={styles.tagline}>{t('tagline', language)}</Text>
      </View>

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.selectText}>{t('selectRole', language)}</Text>
        
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(auth)/citizen-login')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person" size={36} color={colors.white} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>{t('citizen', language)}</Text>
            <Text style={styles.roleDesc}>
              {language === 'en' ? 'Access civic services, pay bills, file complaints' : 'नागरिक सेवाएं, बिल भुगतान, शिकायतें'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(auth)/admin-login')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="shield" size={36} color={colors.white} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>{t('admin', language)}</Text>
            <Text style={styles.roleDesc}>
              {language === 'en' ? 'Manage services, view analytics, push notices' : 'सेवा प्रबंधन, विश्लेषण, सूचनाएं'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Government of India Initiative</Text>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  langToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    zIndex: 10,
  },
  langText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  roleSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  selectText: {
    fontSize: fontSize.md,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  roleTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  roleDesc: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.grayLight,
    marginTop: 2,
  },
});
