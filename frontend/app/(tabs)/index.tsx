import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { billsAPI, announcementsAPI, complaintsAPI } from '@/src/services/api';
import { t, formatCurrency, getGreeting, getServiceColor, getServiceIcon } from '@/src/utils/helpers';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, language, setLanguage } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
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
      setComplaints(complaintsRes.data);
      setTotalDue(billsRes.data.reduce((sum: number, b: any) => sum + b.amount, 0));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const activeComplaints = complaints.filter(
    c => c.status === 'submitted' || c.status === 'in_progress'
  ).length;

  // Quick Action Items - PhonePe Style
  const quickActions = [
    { 
      id: 'electricity', 
      title: t('electricityBill', language),
      subtitle: t('electricityBillDesc', language),
      icon: 'flash',
      color: colors.electricity,
      route: '/payment?type=electricity',
    },
    { 
      id: 'water', 
      title: t('waterBill', language),
      subtitle: t('waterBillDesc', language),
      icon: 'water',
      color: colors.water,
      route: '/payment?type=water',
    },
    { 
      id: 'gas', 
      title: t('gasBill', language),
      subtitle: t('gasBillDesc', language),
      icon: 'flame',
      color: colors.gas,
      route: '/payment?type=gas',
    },
    { 
      id: 'complaint', 
      title: t('fileComplaint', language),
      subtitle: t('fileComplaintDesc', language),
      icon: 'document-text',
      color: colors.complaint,
      route: '/new-complaint',
    },
  ];

  // All Services - Organized by Category
  const serviceCategories = [
    {
      title: t('electricityServices', language),
      services: [
        { title: t('electricityBill', language), desc: t('electricityBillDesc', language), icon: 'flash', color: colors.electricity, route: '/(tabs)/bills' },
        { title: t('newConnection', language), desc: t('newConnectionDesc', language), icon: 'add-circle', color: colors.electricity, route: '/service-request?type=electricity' },
        { title: t('meterReading', language), desc: t('meterReadingDesc', language), icon: 'speedometer', color: colors.electricity, route: '/service-request?type=electricity&request=meter_reading' },
      ]
    },
    {
      title: t('waterServices', language),
      services: [
        { title: t('waterBill', language), desc: t('waterBillDesc', language), icon: 'water', color: colors.water, route: '/(tabs)/bills' },
        { title: t('newConnection', language), desc: t('newConnectionDesc', language), icon: 'add-circle', color: colors.water, route: '/service-request?type=water' },
      ]
    },
    {
      title: t('complaintsGrievances', language),
      services: [
        { title: t('fileComplaint', language), desc: t('fileComplaintDesc', language), icon: 'create', color: colors.complaint, route: '/new-complaint' },
        { title: t('trackComplaint', language), desc: t('trackComplaintDesc', language), icon: 'search', color: colors.info, route: '/(tabs)/complaints' },
      ]
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loading', language)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.textWhite} />
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting(language)}</Text>
              <Text style={styles.userName}>{user?.name || t('hello', language)}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            >
              <Ionicons name="language" size={22} color={colors.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications" size={22} color={colors.textWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/bills')}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="receipt" size={20} color={colors.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>{t('pendingPayments', language)}</Text>
              <Text style={styles.statValue}>{formatCurrency(totalDue)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/complaints')}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="document-text" size={20} color={colors.info} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>{t('activeComplaints', language)}</Text>
              <Text style={styles.statValue}>{activeComplaints}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Announcements Banner */}
        {announcements.length > 0 && (
          <View style={styles.announcementBanner}>
            <View style={styles.announcementIcon}>
              <Ionicons name="megaphone" size={18} color={colors.warning} />
            </View>
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>{announcements[0].title}</Text>
              <Text style={styles.announcementText} numberOfLines={1}>
                {announcements[0].message}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions - PhonePe Style Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('quickActions', language)}</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <Text style={styles.quickActionTitle} numberOfLines={1}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Bills */}
        {pendingBills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('pendingBills', language)}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                <Text style={styles.viewAllText}>{t('viewAll', language)}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingBills.slice(0, 3).map((bill) => (
                <TouchableOpacity
                  key={bill.id}
                  style={styles.billCard}
                  onPress={() => router.push(`/payment?billId=${bill.id}`)}
                >
                  <View style={[styles.billIcon, { backgroundColor: getServiceColor(bill.service_type) + '15' }]}>
                    <Ionicons 
                      name={getServiceIcon(bill.service_type) as any} 
                      size={24} 
                      color={getServiceColor(bill.service_type)} 
                    />
                  </View>
                  <Text style={styles.billType}>{bill.service_type.toUpperCase()}</Text>
                  <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                  <Text style={styles.billDue}>Due: {bill.due_date?.split('T')[0]}</Text>
                  <View style={styles.payBtnSmall}>
                    <Text style={styles.payBtnText}>{t('payNow', language)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Services by Category */}
        {serviceCategories.map((category, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
            </View>
            <View style={styles.servicesList}>
              {category.services.map((service, sIndex) => (
                <TouchableOpacity
                  key={sIndex}
                  style={styles.serviceItem}
                  onPress={() => router.push(service.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color + '15' }]}>
                    <Ionicons name={service.icon as any} size={22} color={service.color} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceDesc}>{service.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: spacing.xxxl }} />
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
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textWhite,
    opacity: 0.8,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textWhite,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  announcementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  announcementIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  announcementTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  announcementText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  billCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  billType: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  billAmount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  billDue: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  payBtnSmall: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  payBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textWhite,
  },
  servicesList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  serviceTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  serviceDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
