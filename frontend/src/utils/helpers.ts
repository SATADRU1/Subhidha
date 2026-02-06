import { translations, Language, TranslationKey } from '../constants/translations';

export const t = (key: TranslationKey, lang: Language = 'en'): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getGreeting = (lang: Language = 'en'): string => {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning', lang);
  if (hour < 17) return t('goodAfternoon', lang);
  return t('goodEvening', lang);
};

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    paid: '#10b981',
    resolved: '#10b981',
    completed: '#10b981',
    approved: '#10b981',
    success: '#10b981',
    pending: '#f59e0b',
    submitted: '#f59e0b',
    under_review: '#f59e0b',
    overdue: '#ef4444',
    rejected: '#ef4444',
    failed: '#ef4444',
    in_progress: '#3b82f6',
  };
  return statusMap[status?.toLowerCase()] || '#6b7280';
};

export const getStatusLabel = (status: string, lang: Language = 'en'): string => {
  const labels: Record<string, Record<Language, string>> = {
    pending: { en: 'Pending', hi: 'लंबित' },
    paid: { en: 'Paid', hi: 'भुगतान किया' },
    overdue: { en: 'Overdue', hi: 'अतिदेय' },
    submitted: { en: 'Submitted', hi: 'जमा किया' },
    in_progress: { en: 'In Progress', hi: 'प्रगति में' },
    resolved: { en: 'Resolved', hi: 'हल किया' },
    rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  };
  return labels[status?.toLowerCase()]?.[lang] || status;
};

export const getServiceIcon = (serviceType: string): string => {
  const icons: Record<string, string> = {
    electricity: 'flash',
    gas: 'flame',
    water: 'water',
    sanitation: 'leaf',
    municipal: 'business',
  };
  return icons[serviceType?.toLowerCase()] || 'ellipse';
};

export const getServiceColor = (serviceType: string): string => {
  const colors: Record<string, string> = {
    electricity: '#ff9500',
    gas: '#007aff',
    water: '#00c7be',
    sanitation: '#34c759',
    municipal: '#af52de',
  };
  return colors[serviceType?.toLowerCase()] || '#6b7280';
};
