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
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [newBill, setNewBill] = useState({
    citizen_id: '',
    service_type: 'electricity',
    amount: '',
    due_date: '',
    billing_period: '',
    consumer_number: '',
    units_consumed: '',
    meter_reading: '',
  });
  const [sectionBill, setSectionBill] = useState({
    service_type: 'electricity',
    billing_period: '',
    due_date: '',
    base_rate: '',
    unit_rate: '',
    fixed_charges: '',
    generate_for_all: true,
    citizen_ids: [] as string[],
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
        citizen_id: newBill.citizen_id,
        service_type: newBill.service_type,
        amount: parseFloat(newBill.amount),
        due_date: newBill.due_date,
        billing_period: newBill.billing_period || undefined,
        consumer_number: newBill.consumer_number || undefined,
        units_consumed: newBill.units_consumed ? parseFloat(newBill.units_consumed) : undefined,
        meter_reading: newBill.meter_reading ? parseFloat(newBill.meter_reading) : undefined,
      });
      setModalVisible(false);
      setNewBill({
        citizen_id: '',
        service_type: 'electricity',
        amount: '',
        due_date: '',
        billing_period: '',
        consumer_number: '',
        units_consumed: '',
        meter_reading: '',
      });
      fetchData();
      Alert.alert('Success', 'Bill created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create bill');
    }
  };

  const handleGenerateSectionBills = async () => {
    if (!sectionBill.service_type || !sectionBill.billing_period || !sectionBill.due_date) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...sectionBill,
        base_rate: sectionBill.base_rate ? parseFloat(sectionBill.base_rate) : undefined,
        unit_rate: sectionBill.unit_rate ? parseFloat(sectionBill.unit_rate) : undefined,
        fixed_charges: sectionBill.fixed_charges ? parseFloat(sectionBill.fixed_charges) : 0,
        citizen_ids: sectionBill.generate_for_all ? undefined : sectionBill.citizen_ids,
      };

      const response = await adminAPI.generateSectionBills(payload);
      setSectionModalVisible(false);
      setSectionBill({
        service_type: 'electricity',
        billing_period: '',
        due_date: '',
        base_rate: '',
        unit_rate: '',
        fixed_charges: '',
        generate_for_all: true,
        citizen_ids: [] as string[],
      });
      fetchData();
      Alert.alert('Success', `Generated ${response.data.total_bills} bills for ${sectionBill.service_type}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate section bills');
    }
  };

  const toggleCitizenSelection = (citizenId: string) => {
    setSectionBill(prev => ({
      ...prev,
      citizen_ids: prev.citizen_ids.includes(citizenId)
        ? prev.citizen_ids.filter(id => id !== citizenId)
        : [...prev.citizen_ids, citizenId]
    }));
  };

  const serviceTypes = ['electricity', 'gas', 'water', 'air_pollution'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'Manage Bills' : 'बिल प्रबंधित करें'}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setSectionModalVisible(true)} style={styles.headerButton}>
            <Ionicons name="flash" size={20} color={colors.textWhite} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerButton}>
            <Ionicons name="add" size={24} color={colors.textWhite} />
          </TouchableOpacity>
        </View>
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
          {bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    {bill.status === 'paid' && (
                      <Ionicons name="checkmark-circle" size={16} color={getStatusColor(bill.status)} />
                    )}
                    <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                      {bill.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer ID:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{bill.citizen_id?.slice(0, 12)}…</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Citizen:</Text>
                    <Text style={styles.detailValue}>{bill.citizen_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValueBold}>{formatCurrency(bill.amount)}</Text>
                  </View>
                  {bill.units_consumed != null && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Units:</Text>
                      <Text style={styles.detailValue}>{bill.units_consumed}</Text>
                    </View>
                  )}
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
              <Text style={styles.inputLabel}>Select Customer (by Customer ID) *</Text>
              <ScrollView horizontal style={styles.citizenList} showsHorizontalScrollIndicator={false}>
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
                    ]} numberOfLines={1}>
                      {citizen.name || citizen.mobile} ({citizen.id.slice(0, 8)})
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

              <Text style={styles.inputLabel}>Units Consumed (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 120"
                keyboardType="decimal-pad"
                value={newBill.units_consumed}
                onChangeText={(text) => setNewBill({ ...newBill, units_consumed: text })}
              />

              <Text style={styles.inputLabel}>Meter Reading (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5040"
                keyboardType="decimal-pad"
                value={newBill.meter_reading}
                onChangeText={(text) => setNewBill({ ...newBill, meter_reading: text })}
              />

              <TouchableOpacity style={styles.createButton} onPress={handleCreateBill}>
                <Text style={styles.createButtonText}>Create Bill</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Section Bill Generation Modal */}
      <Modal
        visible={sectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Section Bills</Text>
              <TouchableOpacity onPress={() => setSectionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Service Type *</Text>
              <View style={styles.serviceTypeContainer}>
                {serviceTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.serviceTypeChip,
                      sectionBill.service_type === type && styles.serviceTypeChipActive,
                    ]}
                    onPress={() => setSectionBill({ ...sectionBill, service_type: type })}
                  >
                    <Ionicons 
                      name={getServiceIcon(type) as any} 
                      size={18} 
                      color={sectionBill.service_type === type ? colors.textWhite : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.serviceTypeText,
                      sectionBill.service_type === type && styles.serviceTypeTextActive,
                    ]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Billing Period *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., January 2024"
                value={sectionBill.billing_period}
                onChangeText={(text) => setSectionBill({ ...sectionBill, billing_period: text })}
              />

              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-12-31"
                value={sectionBill.due_date}
                onChangeText={(text) => setSectionBill({ ...sectionBill, due_date: text })}
              />

              <Text style={styles.inputLabel}>Base Rate (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Base rate (optional)"
                keyboardType="numeric"
                value={sectionBill.base_rate}
                onChangeText={(text) => setSectionBill({ ...sectionBill, base_rate: text })}
              />

              <Text style={styles.inputLabel}>Unit Rate (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Rate per unit (optional)"
                keyboardType="numeric"
                value={sectionBill.unit_rate}
                onChangeText={(text) => setSectionBill({ ...sectionBill, unit_rate: text })}
              />

              <Text style={styles.inputLabel}>Fixed Charges (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Fixed charges"
                keyboardType="numeric"
                value={sectionBill.fixed_charges}
                onChangeText={(text) => setSectionBill({ ...sectionBill, fixed_charges: text })}
              />

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Generate for all citizens</Text>
                <TouchableOpacity
                  style={[styles.switch, sectionBill.generate_for_all && styles.switchActive]}
                  onPress={() => setSectionBill({ ...sectionBill, generate_for_all: !sectionBill.generate_for_all })}
                >
                  <View style={[styles.switchThumb, sectionBill.generate_for_all && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {!sectionBill.generate_for_all && (
                <>
                  <Text style={styles.inputLabel}>Select Citizens</Text>
                  <ScrollView style={styles.citizenSelectionList} nestedScrollEnabled>
                    {citizens.map((citizen) => (
                      <TouchableOpacity
                        key={citizen.id}
                        style={[
                          styles.citizenSelectionItem,
                          sectionBill.citizen_ids.includes(citizen.id) && styles.citizenSelectionItemActive,
                        ]}
                        onPress={() => toggleCitizenSelection(citizen.id)}
                      >
                        <Text style={[
                          styles.citizenSelectionText,
                          sectionBill.citizen_ids.includes(citizen.id) && styles.citizenSelectionTextActive,
                        ]}>
                          {citizen.name || citizen.mobile}
                        </Text>
                        <Ionicons 
                          name={sectionBill.citizen_ids.includes(citizen.id) ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={sectionBill.citizen_ids.includes(citizen.id) ? colors.primary : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <TouchableOpacity style={styles.createButton} onPress={handleGenerateSectionBills}>
                <Text style={styles.createButtonText}>Generate Bills</Text>
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
    backgroundColor: colors.border,
    marginRight: spacing.sm,
  },
  citizenChipActive: {
    backgroundColor: colors.primary,
  },
  citizenChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  citizenChipTextActive: {
    color: colors.textWhite,
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
    backgroundColor: colors.border,
  },
  serviceTypeChipActive: {
    backgroundColor: colors.primary,
  },
  serviceTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  serviceTypeTextActive: {
    color: colors.textWhite,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  createButtonText: {
    color: colors.textWhite,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textWhite,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  citizenSelectionList: {
    maxHeight: 200,
    marginVertical: spacing.sm,
  },
  citizenSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  citizenSelectionItemActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  citizenSelectionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  citizenSelectionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
