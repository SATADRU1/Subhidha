import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { formatCurrency, formatDate, getStatusColor, getServiceIcon } from '@/src/utils/helpers';

interface BillCardProps {
  bill: {
    id: string;
    service_type: string;
    bill_number: string;
    amount: number;
    due_date: string;
    status: string;
    consumer_number?: string;
  };
  onPress: () => void;
  onPayPress?: () => void;
}

export const BillCard: React.FC<BillCardProps> = ({ bill, onPress, onPayPress }) => {
  const serviceColor = colors[bill.service_type as keyof typeof colors] || colors.primary;
  const statusColor = getStatusColor(bill.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: serviceColor + '20' }]}>
          <Ionicons name={getServiceIcon(bill.service_type) as any} size={24} color={serviceColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.serviceType}>{bill.service_type.toUpperCase()}</Text>
          <Text style={styles.billNumber}>{bill.bill_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{bill.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>{formatDate(bill.due_date)}</Text>
        </View>
      </View>
      
      {bill.status !== 'paid' && onPayPress && (
        <TouchableOpacity 
          style={[styles.payButton, { backgroundColor: colors.primary }]} 
          onPress={onPayPress}
          activeOpacity={0.8}
        >
          <Ionicons name="card" size={18} color={colors.white} />
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  serviceType: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.black,
  },
  billNumber: {
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
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.grayLighter,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.black,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  payButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.md,
    marginLeft: spacing.xs,
  },
});
