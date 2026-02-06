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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { serviceRequestsAPI } from '@/src/services/api';
import { t, getServiceIcon } from '@/src/utils/helpers';

export default function ServiceRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState({
    service_type: params.type as string || 'electricity',
    request_type: '',
    description: '',
    documents: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const serviceTypes = [
    { value: 'electricity', label: t('electricity', language), icon: 'flash', color: colors.electricity },
    { value: 'gas', label: t('gas', language), icon: 'flame', color: colors.gas },
    { value: 'water', label: t('water', language), icon: 'water', color: colors.water },
    { value: 'sanitation', label: t('sanitation', language), icon: 'leaf', color: colors.sanitation },
  ];

  const requestTypes = [
    { value: 'new_connection', label: t('newConnection', language), icon: 'add-circle' },
    { value: 'meter_reading', label: t('meterReading', language), icon: 'speedometer' },
    { value: 'address_change', label: t('addressChange', language), icon: 'location' },
    { value: 'disconnection', label: t('disconnection', language), icon: 'close-circle' },
    { value: 'reconnection', label: t('reconnection', language), icon: 'refresh-circle' },
  ];

  const handleSubmit = async () => {
    if (!request.request_type) {
      Alert.alert('Error', language === 'en' ? 'Please select request type' : 'कृपया अनुरोध प्रकार चुनें');
      return;
    }

    setLoading(true);
    try {
      const response = await serviceRequestsAPI.create(request);
      setResult(response.data);
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>
            {language === 'en' ? 'Request Submitted' : 'अनुरोध जमा'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>
            {language === 'en' ? 'Request Submitted Successfully!' : 'अनुरोध सफलतापूर्वक जमा!'}
          </Text>
          
          <View style={styles.ackCard}>
            <Text style={styles.ackLabel}>
              {language === 'en' ? 'Acknowledgment Number' : 'पावती संख्या'}
            </Text>
            <Text style={styles.ackNumber}>{result.acknowledgment_number}</Text>
            <Text style={styles.ackNote}>
              {language === 'en' 
                ? 'Please save this number for future reference'
                : 'कृपया भविष्य के संदर्भ के लिए इस नंबर को सहेजें'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/(tabs)')}
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
        <Text style={styles.headerTitle}>{t('serviceRequests', language)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Service Type' : 'सेवा प्रकार'}
          </Text>
          <View style={styles.serviceGrid}>
            {serviceTypes.map((service) => (
              <TouchableOpacity
                key={service.value}
                style={[
                  styles.serviceCard,
                  request.service_type === service.value && { borderColor: service.color, borderWidth: 2 },
                ]}
                onPress={() => setRequest({ ...request, service_type: service.value })}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.color + '20' }]}>
                  <Ionicons name={service.icon as any} size={24} color={service.color} />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Request Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Request Type' : 'अनुरोध प्रकार'} *
          </Text>
          {requestTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.requestTypeCard,
                request.request_type === type.value && styles.requestTypeCardSelected,
              ]}
              onPress={() => setRequest({ ...request, request_type: type.value })}
            >
              <View style={styles.requestTypeIcon}>
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={request.request_type === type.value ? colors.primary : colors.gray} 
                />
              </View>
              <Text style={[
                styles.requestTypeLabel,
                request.request_type === type.value && styles.requestTypeLabelSelected,
              ]}>
                {type.label}
              </Text>
              {request.request_type === type.value && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Additional Details' : 'अतिरिक्त विवरण'}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={language === 'en' 
              ? 'Enter any additional information...' 
              : 'अतिरिक्त जानकारी दर्ज करें...'}
            multiline
            numberOfLines={4}
            value={request.description}
            onChangeText={(text) => setRequest({ ...request, description: text })}
            placeholderTextColor={colors.grayLight}
          />
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
              <Text style={styles.submitButtonText}>{t('submitRequest', language)}</Text>
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
  serviceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '23%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grayLighter,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  serviceLabel: {
    fontSize: fontSize.xs,
    color: colors.black,
    textAlign: 'center',
  },
  requestTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  requestTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  requestTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.grayLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTypeLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.gray,
    marginLeft: spacing.md,
  },
  requestTypeLabelSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    height: 100,
    textAlignVertical: 'top',
    color: colors.black,
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
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  ackCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ackLabel: {
    fontSize: fontSize.sm,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  ackNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  ackNote: {
    fontSize: fontSize.sm,
    color: colors.gray,
    textAlign: 'center',
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
