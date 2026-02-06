import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { adminAPI } from '@/src/services/api';
import { formatDateTime, getStatusColor } from '@/src/utils/helpers';

export default function AdminComplaints() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await adminAPI.getComplaints();
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedComplaint) return;
    
    try {
      await adminAPI.updateComplaint(selectedComplaint.id, { status });
      setModalVisible(false);
      fetchComplaints();
      Alert.alert('Success', 'Complaint status updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const statuses = [
    { value: 'submitted', label: 'Submitted', color: colors.warning },
    { value: 'in_progress', label: 'In Progress', color: colors.info },
    { value: 'resolved', label: 'Resolved', color: colors.success },
    { value: 'rejected', label: 'Rejected', color: colors.error },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'Manage Complaints' : 'शिकायतें प्रबंधित करें'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {complaints.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyText}>No complaints found</Text>
            </View>
          ) : (
            complaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.id}
                style={styles.card}
                onPress={() => {
                  setSelectedComplaint(complaint);
                  setModalVisible(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.complaintNumber}>{complaint.complaint_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
                      {complaint.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.category}>{complaint.category.toUpperCase()}</Text>
                <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.citizen}>{complaint.citizen_name || 'Unknown'}</Text>
                  <Text style={styles.date}>{formatDateTime(complaint.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Status Update Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            {selectedComplaint && (
              <View style={styles.modalBody}>
                <Text style={styles.modalComplaintNumber}>
                  {selectedComplaint.complaint_number}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedComplaint.description}
                </Text>

                <Text style={styles.selectLabel}>Select new status:</Text>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusOption,
                      selectedComplaint.status === status.value && styles.statusOptionActive,
                    ]}
                    onPress={() => handleUpdateStatus(status.value)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={styles.statusOptionText}>{status.label}</Text>
                    {selectedComplaint.status === status.value && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
    paddingBottom: spacing.md,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  complaintNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.grayLighter,
    paddingTop: spacing.sm,
  },
  citizen: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.grayLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  modalBody: {
    paddingVertical: spacing.sm,
  },
  modalComplaintNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.lg,
  },
  selectLabel: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLighter,
  },
  statusOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusOptionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.black,
  },
});
