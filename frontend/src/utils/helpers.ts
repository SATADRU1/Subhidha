import { translations, Language, TranslationKey } from '../constants/translations';

export const t = (key: TranslationKey, lang: Language = 'en'): string => {
  return translations[lang][key] || translations.en[key] || key;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'resolved':
    case 'completed':
    case 'approved':
    case 'success':
      return '#22C55E';
    case 'pending':
    case 'submitted':
    case 'under_review':
      return '#F59E0B';
    case 'overdue':
    case 'rejected':
    case 'failed':
      return '#EF4444';
    case 'in_progress':
      return '#3B82F6';
    default:
      return '#666666';
  }
};

export const getServiceIcon = (serviceType: string): string => {
  switch (serviceType.toLowerCase()) {
    case 'electricity':
      return 'flash';
    case 'gas':
      return 'flame';
    case 'water':
      return 'water';
    case 'sanitation':
      return 'leaf';
    case 'municipal':
      return 'business';
    default:
      return 'ellipse';
  }
};
