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
import { formatDateTime } from '@/src/utils/helpers';

export default function AdminAnnouncements() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'general',
    service_type: '',
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await adminAPI.getAnnouncements();
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      await adminAPI.createAnnouncement(newAnnouncement);
      setModalVisible(false);
      setNewAnnouncement({ title: '', message: '', type: 'general', service_type: '' });
      fetchAnnouncements();
      Alert.alert('Success', 'Announcement created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create announcement');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteAnnouncement(id);
              fetchAnnouncements();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete announcement');
            }
          },
        },
      ]
    );
  };

  const announcementTypes = [
    { value: 'general', label: 'General', icon: 'megaphone' },
    { value: 'maintenance', label: 'Maintenance', icon: 'construct' },
    { value: 'outage', label: 'Outage', icon: 'warning' },
    { value: 'emergency', label: 'Emergency', icon: 'alert-circle' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return colors.error;
      case 'outage': return colors.warning;
      case 'maintenance': return colors.info;
      default: return colors.success;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'en' ? 'Announcements' : 'घोषणाएं'}
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
          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyText}>No announcements</Text>
            </View>
          ) : (
            announcements.map((announcement) => (
              <View key={announcement.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: getTypeColor(announcement.type) + '20' }]}>
                    <Ionicons 
                      name={announcementTypes.find(t => t.value === announcement.type)?.icon as any || 'megaphone'} 
                      size={20} 
                      color={getTypeColor(announcement.type)} 
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.title}>{announcement.title}</Text>
                    <Text style={styles.type}>{announcement.type.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteAnnouncement(announcement.id)}>
                    <Ionicons name="trash" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.message}>{announcement.message}</Text>
                <Text style={styles.date}>{formatDateTime(announcement.created_at)}</Text>
              </View>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Create Announcement Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Type *</Text>
              <View style={styles.typeContainer}>
                {announcementTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      newAnnouncement.type === type.value && styles.typeChipActive,
                    ]}
                    onPress={() => setNewAnnouncement({ ...newAnnouncement, type: type.value })}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={16} 
                      color={newAnnouncement.type === type.value ? colors.white : colors.gray} 
                    />
                    <Text style={[
                      styles.typeChipText,
                      newAnnouncement.type === type.value && styles.typeChipTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Announcement title"
                value={newAnnouncement.title}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, title: text })}
              />

              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Announcement message"
                multiline
                numberOfLines={4}
                value={newAnnouncement.message}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, message: text })}
              />

              <TouchableOpacity style={styles.createButton} onPress={handleCreateAnnouncement}>
                <Text style={styles.createButtonText}>Create Announcement</Text>
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
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  type: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.sm,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.grayLighter,
  },
  typeChipActive: {
    backgroundColor: colors.secondary,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginLeft: spacing.xs,
  },
  typeChipTextActive: {
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
