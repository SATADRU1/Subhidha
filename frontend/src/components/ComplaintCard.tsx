import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { formatDateTime, getStatusColor } from '@/src/utils/helpers';

interface ComplaintCardProps {
  complaint: {
    id: string;
    category: string;
    complaint_number: string;
    description: string;
    status: string;
    created_at: string;
    priority?: string;
  };
  onPress: () => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onPress }) => {
  const statusColor = getStatusColor(complaint.status);
  const categoryColor = colors[complaint.category as keyof typeof colors] || colors.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name="document-text" size={24} color={categoryColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.complaintNumber}>{complaint.complaint_number}</Text>
          <Text style={styles.category}>{complaint.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {complaint.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>
      
      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color={colors.gray} />
          <Text style={styles.date}>{formatDateTime(complaint.created_at)}</Text>
        </View>
        {complaint.priority && (
          <View style={[styles.priorityBadge, { 
            backgroundColor: complaint.priority === 'urgent' || complaint.priority === 'high' 
              ? colors.error + '20' 
              : colors.warning + '20' 
          }]}>
            <Text style={[styles.priorityText, {
              color: complaint.priority === 'urgent' || complaint.priority === 'high'
                ? colors.error
                : colors.warning
            }]}>
              {complaint.priority.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
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
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  complaintNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.black,
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.gray,
    marginLeft: 4,
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
