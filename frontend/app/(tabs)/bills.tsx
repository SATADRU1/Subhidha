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
import { BillCard } from '@/src/components/BillCard';
import { billsAPI } from '@/src/services/api';
import { t } from '@/src/utils/helpers';

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

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

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

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pending', label: t('pendingBills', language) },
    { key: 'paid', label: t('paidBills', language) },
    { key: 'all', label: t('allBills', language) },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>{t('bills', language)}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredBills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyText}>{t('noData', language)}</Text>
            </View>
          ) : (
            filteredBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onPress={() => router.push(`/bill-details?id=${bill.id}`)}
                onPayPress={
                  bill.status !== 'paid'
                    ? () => router.push(`/payment?billId=${bill.id}`)
                    : undefined
                }
              />
            ))
          )}
          <View style={{ height: spacing.xxl }} />
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLighter,
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
    color: colors.gray,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.gray,
    marginTop: spacing.md,
  },
});
