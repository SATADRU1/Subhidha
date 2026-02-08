import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { adminAPI } from '@/src/services/api';
import { t, formatCurrency } from '@/src/utils/helpers';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, language, setLanguage } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      const message = error?.message === 'Network Error'
        ? (language === 'en' ? 'Cannot reach server. Use same Wi‑Fi and set backend URL in .env (EXPO_PUBLIC_BACKEND_URL).' : 'सर्वर तक पहुँच नहीं। एक ही Wi‑Fi और .env में EXPO_PUBLIC_BACKEND_URL सेट करें।')
        : (error?.response?.data?.detail || error?.message || 'Failed to load dashboard');
      setFetchError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (fetchError && !stats) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Ionicons name="shield" size={24} color={colors.white} />
              </View>
              <View>
                <Text style={styles.greeting}>Admin Panel</Text>
                <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={colors.textLight} />
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchData(); }}>
            <Text style={styles.retryButtonText}>{language === 'en' ? 'Retry' : 'पुनः प्रयास करें'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="shield" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.greeting}>Admin Panel</Text>
              <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
              <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color={colors.primary} />
            <Text style={styles.statValue}>{stats?.citizens?.total || 0}</Text>
            <Text style={styles.statLabel}>{t('totalCitizens', language)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={28} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(stats?.payments?.revenue || 0)}</Text>
            <Text style={styles.statLabel}>{t('totalRevenue', language)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="document-text" size={28} color={colors.warning} />
            <Text style={styles.statValue}>{stats?.complaints?.pending || 0}</Text>
            <Text style={styles.statLabel}>{t('pendingComplaints', language)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={28} color={colors.info} />
            <Text style={styles.statValue}>{stats?.bills?.pending || 0}</Text>
            <Text style={styles.statLabel}>{t('pendingBills', language)}</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Manage' : 'प्रबंधन'}
          </Text>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/complaints')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="document-text" size={24} color={colors.warning} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('manageComplaints', language)}</Text>
              <Text style={styles.menuSubtitle}>
                {stats?.complaints?.total || 0} {language === 'en' ? 'total' : 'कुल'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/bills')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="receipt" size={24} color={colors.info} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('manageBills', language)}</Text>
              <Text style={styles.menuSubtitle}>
                {stats?.bills?.total || 0} {language === 'en' ? 'total' : 'कुल'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/citizens')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>
                {language === 'en' ? 'View Citizens' : 'नागरिक देखें'}
              </Text>
              <Text style={styles.menuSubtitle}>
                {stats?.citizens?.total || 0} {language === 'en' ? 'registered' : 'पंजीकृत'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/announcements')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="megaphone" size={24} color={colors.success} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('announcements', language)}</Text>
              <Text style={styles.menuSubtitle}>
                {language === 'en' ? 'Push notices' : 'सूचनाएं भेजें'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textWhite,
  },
  header: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  langText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.secondary,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.black,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLighter,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
});
