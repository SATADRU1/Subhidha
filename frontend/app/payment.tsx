import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { billsAPI, paymentsAPI } from '@/src/services/api';
import { t, formatCurrency, formatDate, getServiceIcon } from '@/src/utils/helpers';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bill, setBill] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      const response = await billsAPI.getById(params.billId as string);
      setBill(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch bill details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: 'phone-portrait', desc: 'Pay using UPI apps' },
    { id: 'card', name: 'Card', icon: 'card', desc: 'Credit/Debit Card' },
    { id: 'netbanking', name: 'Net Banking', icon: 'business', desc: 'Pay via bank' },
    { id: 'wallet', name: 'Wallet', icon: 'wallet', desc: 'Digital Wallet' },
  ];

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await paymentsAPI.create({
        bill_id: params.billId as string,
        payment_method: selectedMethod,
      });
      
      setPaymentResult(response.data);
      setPaymentSuccess(true);
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data?.detail || 'Please try again');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (paymentSuccess && paymentResult) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>
            {language === 'en' ? 'Payment Status' : 'भुगतान स्थिति'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>
            {language === 'en' ? 'Payment Successful!' : 'भुगतान सफल!'}
          </Text>
          <Text style={styles.successAmount}>{formatCurrency(paymentResult.amount)}</Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transaction ID</Text>
              <Text style={styles.receiptValue}>{paymentResult.transaction_id}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Receipt No.</Text>
              <Text style={styles.receiptValue}>{paymentResult.receipt_number}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Bill Number</Text>
              <Text style={styles.receiptValue}>{bill?.bill_number}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Service</Text>
              <Text style={styles.receiptValue}>{bill?.service_type?.toUpperCase()}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/(tabs)/bills')}
          >
            <Text style={styles.doneButtonText}>{t('done', language)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'Pay Bill' : 'बिल भुगतान'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Summary */}
        <View style={styles.billSummary}>
          <View style={[styles.serviceIcon, { backgroundColor: colors[bill?.service_type as keyof typeof colors] + '20' }]}>
            <Ionicons 
              name={getServiceIcon(bill?.service_type) as any} 
              size={32} 
              color={colors[bill?.service_type as keyof typeof colors]} 
            />
          </View>
          <View style={styles.billInfo}>
            <Text style={styles.serviceType}>{bill?.service_type?.toUpperCase()} BILL</Text>
            <Text style={styles.billNumber}>{bill?.bill_number}</Text>
          </View>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>
            {language === 'en' ? 'Amount to Pay' : 'भुगतान की राशि'}
          </Text>
          <Text style={styles.amountValue}>{formatCurrency(bill?.amount || 0)}</Text>
          <Text style={styles.dueDate}>
            {language === 'en' ? 'Due: ' : 'नियत तारीख: '}
            {formatDate(bill?.due_date)}
          </Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Select Payment Method' : 'भुगतान विधि चुनें'}
          </Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodIcon}>
                <Ionicons name={method.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDesc}>{method.desc}</Text>
              </View>
              <View style={[
                styles.radio,
                selectedMethod === method.id && styles.radioSelected,
              ]}>
                {selectedMethod === method.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mock Payment Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.noticeText}>
            {language === 'en' 
              ? 'This is a mock payment gateway. All payments will succeed for testing purposes.'
              : 'यह एक मॉक पेमेंट गेटवे है। परीक्षण के लिए सभी भुगतान सफल होंगे।'}
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color={colors.white} />
              <Text style={styles.payButtonText}>
                {language === 'en' ? 'Pay ' : 'भुगतान करें '}
                {formatCurrency(bill?.amount || 0)}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  billSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    marginLeft: spacing.md,
  },
  serviceType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  billNumber: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  amountCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
    marginVertical: spacing.xs,
  },
  dueDate: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.8,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: colors.primary,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  methodName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
  },
  methodDesc: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    marginLeft: spacing.sm,
  },
  payButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  payButtonDisabled: {
    backgroundColor: colors.grayLight,
  },
  payButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  successAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.lg,
  },
  receiptCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  receiptLabel: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  receiptValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.sm,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
