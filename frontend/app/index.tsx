import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { t } from '@/src/utils/helpers';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.type === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.logoCircle}>
          <Ionicons name="business" size={48} color={colors.primary} />
        </View>
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Section with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.topSection, { paddingTop: insets.top + spacing.lg }]}
      >
        {/* Language Toggle */}
        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        >
          <Ionicons name="language" size={18} color={colors.primary} />
          <Text style={styles.langText}>{language === 'en' ? 'हिंदी' : 'English'}</Text>
        </TouchableOpacity>

        {/* Logo & Title */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="business" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appTitle}>{t('appName', language)}</Text>
          <Text style={styles.tagline}>{t('tagline', language)}</Text>
        </View>

        {/* Illustration Icons */}
        <View style={styles.iconsRow}>
          <View style={[styles.serviceIconSmall, { backgroundColor: colors.electricity + '30' }]}>
            <Ionicons name="flash" size={24} color={colors.electricity} />
          </View>
          <View style={[styles.serviceIconSmall, { backgroundColor: colors.water + '30' }]}>
            <Ionicons name="water" size={24} color={colors.water} />
          </View>
          <View style={[styles.serviceIconSmall, { backgroundColor: colors.gas + '30' }]}>
            <Ionicons name="flame" size={24} color={colors.gas} />
          </View>
          <View style={[styles.serviceIconSmall, { backgroundColor: colors.sanitation + '30' }]}>
            <Ionicons name="leaf" size={24} color={colors.sanitation} />
          </View>
        </View>
      </LinearGradient>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.welcomeText}>{t('welcomeTitle', language)}</Text>
        <Text style={styles.subtitleText}>{t('welcomeSubtitle', language)}</Text>

        {/* Citizen Card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(auth)/citizen-login')}
          activeOpacity={0.7}
        >
          <View style={[styles.roleIconBox, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>{t('iAmCitizen', language)}</Text>
            <Text style={styles.roleDesc}>{t('citizenDesc', language)}</Text>
          </View>
          <View style={styles.arrowBox}>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Admin Card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(auth)/admin-login')}
          activeOpacity={0.7}
        >
          <View style={[styles.roleIconBox, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
          </View>
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>{t('iAmAdmin', language)}</Text>
            <Text style={styles.roleDesc}>{t('adminDesc', language)}</Text>
          </View>
          <View style={[styles.arrowBox, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="arrow-forward" size={20} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Ionicons name="shield-checkmark" size={16} color={colors.textSecondary} />
          <Text style={styles.footerText}>{t('governmentOf', language)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textWhite,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  langButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  langText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appTitle: {
    fontSize: fontSize.hero,
    fontWeight: 'bold',
    color: colors.textWhite,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textWhite,
    opacity: 0.85,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  serviceIconSmall: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    marginTop: -spacing.xxl,
  },
  welcomeText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleIconBox: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  roleTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  roleDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  arrowBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
