import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { complaintsAPI } from '@/src/services/api';
import { t } from '@/src/utils/helpers';

export default function NewComplaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState({
    category: params.category as string || '',
    subcategory: '',
    description: '',
    location: '',
    photo: '',
    priority: 'medium',
  });

  const categories = [
    { value: 'electricity', label: t('electricity', language), icon: 'flash', color: colors.electricity },
    { value: 'gas', label: t('gas', language), icon: 'flame', color: colors.gas },
    { value: 'water', label: t('water', language), icon: 'water', color: colors.water },
    { value: 'sanitation', label: t('sanitation', language), icon: 'leaf', color: colors.sanitation },
    { value: 'municipal', label: t('municipal', language), icon: 'business', color: colors.municipal },
    { value: 'other', label: language === 'en' ? 'Other' : 'अन्य', icon: 'ellipse', color: colors.gray },
  ];

  const priorities = [
    { value: 'low', label: language === 'en' ? 'Low' : 'कम', color: colors.success },
    { value: 'medium', label: language === 'en' ? 'Medium' : 'मध्यम', color: colors.warning },
    { value: 'high', label: language === 'en' ? 'High' : 'उच्च', color: colors.error },
    { value: 'urgent', label: language === 'en' ? 'Urgent' : 'तुरंत', color: colors.error },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera roll access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setComplaint({ ...complaint, photo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setComplaint({ ...complaint, photo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSubmit = async () => {
    if (!complaint.category) {
      Alert.alert('Error', language === 'en' ? 'Please select a category' : 'कृपया श्रेणी चुनें');
      return;
    }
    if (!complaint.description) {
      Alert.alert('Error', language === 'en' ? 'Please enter description' : 'कृपया विवरण दर्ज करें');
      return;
    }

    setLoading(true);
    try {
      const response = await complaintsAPI.create(complaint);
      Alert.alert(
        language === 'en' ? 'Success' : 'सफलता',
        `${language === 'en' ? 'Complaint filed successfully!' : 'शिकायत सफलतापूर्वक दर्ज की गई!'}
\n${t('complaintNumber', language)}: ${response.data.complaint_number}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to file complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('fileComplaint', language)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectCategory', language)} *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryCard,
                  complaint.category === cat.value && { borderColor: cat.color, borderWidth: 2 },
                ]}
                onPress={() => setComplaint({ ...complaint, category: cat.value })}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('description', language)} *</Text>
          <TextInput
            style={styles.textArea}
            placeholder={language === 'en' ? 'Describe your complaint in detail...' : 'अपनी शिकायत का विस्तार से वर्णन करें...'}
            multiline
            numberOfLines={5}
            value={complaint.description}
            onChangeText={(text) => setComplaint({ ...complaint, description: text })}
            placeholderTextColor={colors.grayLight}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('location', language)}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'en' ? 'Enter location/address' : 'स्थान/पता दर्ज करें'}
            value={complaint.location}
            onChangeText={(text) => setComplaint({ ...complaint, location: text })}
            placeholderTextColor={colors.grayLight}
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Priority' : 'प्राथमिकता'}
          </Text>
          <View style={styles.priorityContainer}>
            {priorities.map((pri) => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.priorityChip,
                  complaint.priority === pri.value && { backgroundColor: pri.color },
                ]}
                onPress={() => setComplaint({ ...complaint, priority: pri.value })}
              >
                <Text
                  style={[
                    styles.priorityText,
                    complaint.priority === pri.value && { color: colors.white },
                  ]}
                >
                  {pri.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('attachPhoto', language)}</Text>
          <View style={styles.photoContainer}>
            {complaint.photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: complaint.photo }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setComplaint({ ...complaint, photo: '' })}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color={colors.primary} />
                  <Text style={styles.photoButtonText}>
                    {language === 'en' ? 'Camera' : 'कैमरा'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="images" size={32} color={colors.primary} />
                  <Text style={styles.photoButtonText}>
                    {language === 'en' ? 'Gallery' : 'गैलरी'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>{t('submit', language)}</Text>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '31%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.grayLighter,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    color: colors.black,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.black,
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    height: 120,
    textAlignVertical: 'top',
    color: colors.black,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.grayLighter,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.gray,
  },
  photoContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  photoButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  photoPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.sm,
  },
  removePhoto: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.grayLight,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
