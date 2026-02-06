import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { citizenAPI } from '@/src/services/api';
import { t } from '@/src/utils/helpers';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, language, setLanguage } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await citizenAPI.getProfile();
      setProfile(response.data);
      setEditedProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await citizenAPI.updateProfile(editedProfile);
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Success', language === 'en' ? 'Profile updated successfully' : 'प्रोफ़ाइल सफलतापूर्वक अपडेट हुआ');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout', language),
      language === 'en' ? 'Are you sure you want to logout?' : 'क्या आप वाकई लॉगआउट करना चाहते हैं?',
      [
        { text: t('cancel', language), style: 'cancel' },
        { 
          text: t('logout', language), 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        },
      ]
    );
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    setEditedProfile({ ...editedProfile, language: newLang });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>{t('profile', language)}</Text>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="pencil" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={colors.white} />
          </View>
          <Text style={styles.name}>{profile?.name || 'Citizen'}</Text>
          <Text style={styles.mobile}>+91 {profile?.mobile}</Text>
        </View>

        {/* Profile Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Personal Information' : 'व्यक्तिगत जानकारी'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('enterName', language)}</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.name || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                placeholder="Enter name"
              />
            ) : (
              <Text style={styles.value}>{profile?.name || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('enterAadhaar', language)}</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.aadhaar_number || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, aadhaar_number: text })}
                placeholder="Enter Aadhaar"
                keyboardType="number-pad"
                maxLength={12}
              />
            ) : (
              <Text style={styles.value}>{profile?.aadhaar_number || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.email || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.value}>{profile?.email || '-'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{language === 'en' ? 'Address' : 'पता'}</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProfile.address || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, address: text })}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{profile?.address || '-'}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>{language === 'en' ? 'City' : 'शहर'}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.city || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, city: text })}
                  placeholder="City"
                />
              ) : (
                <Text style={styles.value}>{profile?.city || '-'}</Text>
              )}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>{language === 'en' ? 'Pincode' : 'पिनकोड'}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.pincode || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, pincode: text })}
                  placeholder="Pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              ) : (
                <Text style={styles.value}>{profile?.pincode || '-'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Language Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Preferences' : 'प्राथमिकताएं'}
          </Text>
          <TouchableOpacity style={styles.settingRow} onPress={toggleLanguage}>
            <View style={styles.settingLeft}>
              <Ionicons name="language" size={24} color={colors.primary} />
              <Text style={styles.settingLabel}>
                {language === 'en' ? 'Language' : 'भाषा'}
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {language === 'en' ? 'English' : 'हिंदी'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {isEditing ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setEditedProfile(profile);
              }}
            >
              <Text style={styles.cancelButtonText}>{t('cancel', language)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{t('save', language)}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color={colors.error} />
            <Text style={styles.logoutText}>{t('logout', language)}</Text>
          </TouchableOpacity>
        )}

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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.black,
  },
  mobile: {
    fontSize: fontSize.md,
    color: colors.gray,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.black,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.black,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.black,
    marginLeft: spacing.sm,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: fontSize.md,
    color: colors.gray,
    marginRight: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.grayLighter,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.gray,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
    marginLeft: spacing.sm,
  },
});
