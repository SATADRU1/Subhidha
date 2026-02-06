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
import { billsAPI } from '@/src/services/api';
import { t, formatCurrency, formatDate, getStatusColor, getStatusLabel, getServiceIcon, getServiceColor } from '@/src/utils/helpers';

type TabType = 'pending' | 'paid' | 'all';

export default function BillsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);

  const fetchBills = useCallback(async () => {
    try {
      const response = await billsAPI.getAll();
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const filteredBills = bills.filter((bill) => {
    if (activeTab === 'pending') return bill.status === 'pending' || bill.status === 'overdue';
    if (activeTab === 'paid') return bill.status === 'paid';
    return true;
  });

  const totalPending = bills
    .filter(b => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: t('pendingBills', language), count: bills.filter(b => b.status !== 'paid').length },
    { key: 'paid', label: t('paidBills', language), count: bills.filter(b => b.status === 'paid').length },
    { key: 'all', label: language === 'en' ? 'All' : 'सभी', count: bills.length },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <Text style={styles.headerTitle}>{t('myBills', language)}</Text>
        
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{t('pendingPayments', language)}</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalPending)}</Text>
            </View>
            {totalPending > 0 && (
              <TouchableOpacity 
                style={styles.payAllBtn}
                onPress={() => router.push('/(tabs)/bills')}
              >
                <Text style={styles.payAllText}>{t('payNow', language)}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textWhite} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredBills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>{t('noBills', language)}</Text>
              <Text style={styles.emptyText}>{t('noBillsDesc', language)}</Text>
            </View>
          ) : (
            filteredBills.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                onPress={() => router.push(`/payment?billId=${bill.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.billHeader}>
                  <View style={[styles.billIcon, { backgroundColor: getServiceColor(bill.service_type) + '15' }]}>
                    <Ionicons 
                      name={getServiceIcon(bill.service_type) as any} 
                      size={24} 
                      color={getServiceColor(bill.service_type)} 
                    />
                  </View>
                  <View style={styles.billInfo}>
                    <Text style={styles.billType}>{bill.service_type.toUpperCase()} BILL</Text>
                    <Text style={styles.billNumber}>{bill.bill_number}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                      {getStatusLabel(bill.status, language)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.billDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('billAmount', language)}</Text>
                    <Text style={styles.detailValue}>{formatCurrency(bill.amount)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('dueDate', language)}</Text>
                    <Text style={[styles.detailValue, bill.status === 'overdue' && styles.overdueText]}>
                      {formatDate(bill.due_date)}
                    </Text>
                  </View>
                </View>

                {bill.status !== 'paid' && (
                  <TouchableOpacity 
                    style={styles.payBtn}
                    onPress={() => router.push(`/payment?billId=${bill.id}`)}
                  >
                    <Ionicons name="card" size={18} color={colors.textWhite} />
                    <Text style={styles.payBtnText}>{t('payNow', language)}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textWhite,
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textWhite,
  },
  payAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  payAllText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textWhite,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textWhite,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  billCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  billType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  billNumber: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  billDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  overdueText: {
    color: colors.error,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  payBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
