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
import { ServiceCard } from '@/src/components/ServiceCard';
import { billsAPI, announcementsAPI, complaintsAPI } from '@/src/services/api';
import { t, formatCurrency } from '@/src/utils/helpers';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, language, setLanguage, logout } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [pendingComplaints, setPendingComplaints] = useState(0);
  const [totalDue, setTotalDue] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [billsRes, announcementsRes, complaintsRes] = await Promise.all([
        billsAPI.getPending(),
        announcementsAPI.getAll(),
        complaintsAPI.getAll(),
      ]);

      setPendingBills(billsRes.data);
      setAnnouncements(announcementsRes.data);
      
      const pending = complaintsRes.data.filter(
        (c: any) => c.status === 'submitted' || c.status === 'in_progress'
      ).length;
      setPendingComplaints(pending);
      
      const total = billsRes.data.reduce((sum: number, bill: any) => sum + bill.amount, 0);
      setTotalDue(total);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.greeting}>
                {language === 'en' ? 'Welcome' : 'नमस्ते'}
              </Text>
              <Text style={styles.userName}>{user?.name || 'Citizen'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
              <Text style={styles.langText}>{language === 'en' ? 'हिं' : 'EN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/notifications')} 
              style={styles.notifButton}
            >
              <Ionicons name="notifications" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(totalDue)}</Text>
            <Text style={styles.statLabel}>{t('pendingBills', language)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAlt]}>
            <Text style={styles.statValue}>{pendingComplaints}</Text>
            <Text style={styles.statLabel}>{t('complaints', language)}</Text>
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
        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <Ionicons name="megaphone" size={20} color={colors.warning} />
                <Text style={styles.announcementTitle}>{announcements[0].title}</Text>
              </View>
              <Text style={styles.announcementText} numberOfLines={2}>
                {announcements[0].message}
              </Text>
            </View>
          </View>
        )}

        {/* Services Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('services', language)}</Text>
          <View style={styles.servicesGrid}>
            <ServiceCard
              title={t('electricity', language)}
              icon="flash"
              color={colors.electricity}
              onPress={() => router.push('/service-request?type=electricity')}
            />
            <ServiceCard
              title={t('gas', language)}
              icon="flame"
              color={colors.gas}
              onPress={() => router.push('/service-request?type=gas')}
            />
            <ServiceCard
              title={t('water', language)}
              icon="water"
              color={colors.water}
              onPress={() => router.push('/service-request?type=water')}
            />
            <ServiceCard
              title={t('sanitation', language)}
              icon="leaf"
              color={colors.sanitation}
              onPress={() => router.push('/service-request?type=sanitation')}
            />
            <ServiceCard
              title={t('pendingBills', language)}
              icon="receipt"
              color={colors.error}
              badge={pendingBills.length}
              onPress={() => router.push('/(tabs)/bills')}
            />
            <ServiceCard
              title={t('fileComplaint', language)}
              icon="document-text"
              color={colors.municipal}
              onPress={() => router.push('/new-complaint')}
            />
          </View>
        </View>

        {/* Pending Bills Preview */}
        {pendingBills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('pendingBills', language)}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                <Text style={styles.seeAll}>
                  {language === 'en' ? 'See All' : 'सभी देखें'}
                </Text>
              </TouchableOpacity>
            </View>
            {pendingBills.slice(0, 2).map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={styles.billPreview}
                onPress={() => router.push(`/bill-details?id=${bill.id}`)}
              >
                <View style={styles.billLeft}>
                  <Ionicons 
                    name={bill.service_type === 'electricity' ? 'flash' : 
                          bill.service_type === 'water' ? 'water' : 'flame'} 
                    size={24} 
                    color={colors[bill.service_type as keyof typeof colors] || colors.primary} 
                  />
                  <View style={styles.billInfo}>
                    <Text style={styles.billType}>{bill.service_type.toUpperCase()}</Text>
                    <Text style={styles.billNumber}>{bill.bill_number}</Text>
                  </View>
                </View>
                <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
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
    color: colors.primary,
  },
  notifButton: {
    padding: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statCardAlt: {
    backgroundColor: colors.primaryLight,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  announcementCard: {
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  announcementTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginLeft: spacing.xs,
  },
  announcementText: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  billPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billInfo: {
    marginLeft: spacing.sm,
  },
  billType: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.black,
  },
  billNumber: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  billAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
});
