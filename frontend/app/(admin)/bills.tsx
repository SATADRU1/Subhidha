import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { adminAPI } from '@/src/services/api';
import { formatCurrency, formatDate, getStatusColor, getServiceIcon } from '@/src/utils/helpers';

export default function AdminBills() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [citizens, setCitizens] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBill, setNewBill] = useState({
    citizen_id: '',
    service_type: 'electricity',
    amount: '',
    due_date: '',
    billing_period: '',
    consumer_number: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [billsRes, citizensRes] = await Promise.all([
        adminAPI.getBills(),
        adminAPI.getCitizens(),
      ]);
      setBills(billsRes.data);
      setCitizens(citizensRes.data);
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

  const handleCreateBill = async () => {
    if (!newBill.citizen_id || !newBill.amount || !newBill.due_date) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      await adminAPI.createBill({
        ...newBill,
        amount: parseFloat(newBill.amount),
      });
      setModalVisible(false);
      setNewBill({
        citizen_id: '',
        service_type: 'electricity',
        amount: '',
        due_date: '',
        billing_period: '',
        consumer_number: '',
      });
      fetchData();
      Alert.alert('Success', 'Bill created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create bill');
    }
  };

  const serviceTypes = ['electricity', 'gas', 'water', 'sanitation'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'Manage Bills' : 'बिल प्रबंधित करें'}
        </Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
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
          {bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyText}>No bills found</Text>
            </View>
          ) : (
            bills.map((bill) => (
              <View key={bill.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: colors[bill.service_type as keyof typeof colors] + '20' }]}>
                    <Ionicons 
                      name={getServiceIcon(bill.service_type) as any} 
                      size={24} 
                      color={colors[bill.service_type as keyof typeof colors]} 
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.billNumber}>{bill.bill_number}</Text>
                    <Text style={styles.serviceType}>{bill.service_type.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                      {bill.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Citizen:</Text>
                    <Text style={styles.detailValue}>{bill.citizen_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValueBold}>{formatCurrency(bill.amount)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(bill.due_date)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Create Bill Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Bill</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Citizen *</Text>
              <ScrollView horizontal style={styles.citizenList}>
                {citizens.map((citizen) => (
                  <TouchableOpacity
                    key={citizen.id}
                    style={[
                      styles.citizenChip,
                      newBill.citizen_id === citizen.id && styles.citizenChipActive,
                    ]}
                    onPress={() => setNewBill({ ...newBill, citizen_id: citizen.id })}
                  >
                    <Text style={[
                      styles.citizenChipText,
                      newBill.citizen_id === citizen.id && styles.citizenChipTextActive,
                    ]}>
                      {citizen.name || citizen.mobile}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Service Type *</Text>
              <View style={styles.serviceTypeContainer}>
                {serviceTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.serviceTypeChip,
                      newBill.service_type === type && styles.serviceTypeChipActive,
                    ]}
                    onPress={() => setNewBill({ ...newBill, service_type: type })}
                  >
                    <Ionicons 
                      name={getServiceIcon(type) as any} 
                      size={18} 
                      color={newBill.service_type === type ? colors.white : colors.gray} 
                    />
                    <Text style={[
                      styles.serviceTypeText,
                      newBill.service_type === type && styles.serviceTypeTextActive,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={newBill.amount}
                onChangeText={(text) => setNewBill({ ...newBill, amount: text })}
              />

              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-12-31"
                value={newBill.due_date}
                onChangeText={(text) => setNewBill({ ...newBill, due_date: text })}
              />

              <Text style={styles.inputLabel}>Billing Period</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Jan 2024"
                value={newBill.billing_period}
                onChangeText={(text) => setNewBill({ ...newBill, billing_period: text })}
              />

              <Text style={styles.inputLabel}>Consumer Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Consumer number"
                value={newBill.consumer_number}
                onChangeText={(text) => setNewBill({ ...newBill, consumer_number: text })}
              />

              <TouchableOpacity style={styles.createButton} onPress={handleCreateBill}>
                <Text style={styles.createButtonText}>Create Bill</Text>
              </TouchableOpacity>
            </ScrollView>
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
    alignItems: 'center',
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  billNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  serviceType: {
    fontSize: fontSize.xs,
    color: colors.gray,
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
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.grayLighter,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  detailValueBold: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
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
    maxHeight: '80%',
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
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  citizenList: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  citizenChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.grayLighter,
    marginRight: spacing.sm,
  },
  citizenChipActive: {
    backgroundColor: colors.primary,
  },
  citizenChipText: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  citizenChipTextActive: {
    color: colors.white,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.grayLighter,
  },
  serviceTypeChipActive: {
    backgroundColor: colors.primary,
  },
  serviceTypeText: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  serviceTypeTextActive: {
    color: colors.white,
  },
  createButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
