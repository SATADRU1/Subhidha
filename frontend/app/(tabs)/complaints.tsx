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
import { complaintsAPI } from '@/src/services/api';
import { t, formatDateTime, getStatusColor, getStatusLabel, getServiceColor } from '@/src/utils/helpers';

type TabType = 'all' | 'active' | 'resolved';

export default function ComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<any[]>([]);

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await complaintsAPI.getAll();
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const filteredComplaints = complaints.filter((c) => {
    if (activeTab === 'active') return c.status === 'submitted' || c.status === 'in_progress';
    if (activeTab === 'resolved') return c.status === 'resolved' || c.status === 'closed';
    return true;
  });

  const activeCount = complaints.filter(c => c.status === 'submitted' || c.status === 'in_progress').length;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: language === 'en' ? 'All' : 'सभी', count: complaints.length },
    { key: 'active', label: language === 'en' ? 'Active' : 'सक्रिय', count: activeCount },
    { key: 'resolved', label: t('statusResolved', language), count: complaints.length - activeCount },
  ];

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      electricity: 'flash',
      water: 'water',
      gas: 'flame',
      sanitation: 'leaf',
      municipal: 'business',
      other: 'ellipse',
    };
    return icons[category] || 'document-text';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('myComplaints', language)}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/new-complaint')}
          >
            <Ionicons name="add" size={24} color={colors.textWhite} />
          </TouchableOpacity>
        </View>
        
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{complaints.length}</Text>
            <Text style={styles.summaryLabel}>{language === 'en' ? 'Total' : 'कुल'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>{language === 'en' ? 'Active' : 'सक्रिय'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{complaints.length - activeCount}</Text>
            <Text style={styles.summaryLabel}>{t('statusResolved', language)}</Text>
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
          {filteredComplaints.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>{t('noComplaints', language)}</Text>
              <Text style={styles.emptyText}>{t('noComplaintsDesc', language)}</Text>
              <TouchableOpacity
                style={styles.fileBtn}
                onPress={() => router.push('/new-complaint')}
              >
                <Ionicons name="add-circle" size={20} color={colors.textWhite} />
                <Text style={styles.fileBtnText}>{t('newComplaint', language)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredComplaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.id}
                style={styles.complaintCard}
                onPress={() => router.push(`/complaint-details?id=${complaint.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: getServiceColor(complaint.category) + '15' }]}>
                    <Ionicons 
                      name={getCategoryIcon(complaint.category) as any} 
                      size={22} 
                      color={getServiceColor(complaint.category)} 
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.complaintNumber}>{complaint.complaint_number}</Text>
                    <Text style={styles.categoryText}>{complaint.category.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
                      {getStatusLabel(complaint.status, language)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.description} numberOfLines={2}>
                  {complaint.description}
                </Text>
                
                <View style={styles.cardFooter}>
                  <View style={styles.dateRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.dateText}>{formatDateTime(complaint.created_at)}</Text>
                  </View>
                  {complaint.priority && (
                    <View style={[
                      styles.priorityBadge, 
                      { backgroundColor: complaint.priority === 'urgent' || complaint.priority === 'high' 
                        ? colors.error + '15' 
                        : colors.warning + '15' 
                      }
                    ]}>
                      <Text style={[
                        styles.priorityText,
                        { color: complaint.priority === 'urgent' || complaint.priority === 'high'
                          ? colors.error
                          : colors.warning
                        }
                      ]}>
                        {complaint.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/new-complaint')}
      >
        <Ionicons name="add" size={28} color={colors.textWhite} />
      </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textWhite,
  },
  addBtn: {
    position: 'absolute',
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textWhite,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textWhite,
    opacity: 0.8,
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
    marginBottom: spacing.xl,
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  fileBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textWhite,
  },
  complaintCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  complaintNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryText: {
    fontSize: fontSize.xs,
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
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
});
