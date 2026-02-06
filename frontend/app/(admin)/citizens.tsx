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
import { adminAPI } from '@/src/services/api';
import { formatDateTime } from '@/src/utils/helpers';

export default function AdminCitizens() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [citizens, setCitizens] = useState<any[]>([]);

  const fetchCitizens = useCallback(async () => {
    try {
      const response = await adminAPI.getCitizens();
      setCitizens(response.data);
    } catch (error) {
      console.error('Error fetching citizens:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCitizens();
  }, [fetchCitizens]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCitizens();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'All Citizens' : 'सभी नागरिक'}
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
          {citizens.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyText}>No citizens found</Text>
            </View>
          ) : (
            citizens.map((citizen) => (
              <View key={citizen.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color={colors.white} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{citizen.name || 'Unknown'}</Text>
                    <Text style={styles.mobile}>+91 {citizen.mobile}</Text>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  {citizen.email && (
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color={colors.gray} />
                      <Text style={styles.detailText}>{citizen.email}</Text>
                    </View>
                  )}
                  {citizen.address && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color={colors.gray} />
                      <Text style={styles.detailText} numberOfLines={2}>{citizen.address}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color={colors.gray} />
                    <Text style={styles.detailText}>
                      Registered: {formatDateTime(citizen.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  mobile: {
    fontSize: fontSize.sm,
    color: colors.gray,
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.grayLighter,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginLeft: spacing.xs,
    flex: 1,
  },
});
