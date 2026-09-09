export const API_URL = 'http://localhost:3000/api';
export const SOCKET_URL = 'http://localhost:3000';

export const CATEGORIES = [
  { value: 'fiqh', label: 'الفقه الإسلامي', labelFr: 'Fiqh Islamique' },
  { value: 'aqida', label: 'العقيدة', labelFr: 'Croyance (Aqida)' },
  { value: 'hadith', label: 'الحديث الشريف', labelFr: 'Hadith' },
  { value: 'seerah', label: 'السيرة النبوية', labelFr: 'Biographie du Prophète' },
  { value: 'tajwid', label: 'تجويد القرآن', labelFr: 'Tajwid (Récitation)' },
  { value: 'tarikh', label: 'التاريخ الإسلامي', labelFr: 'Histoire Islamique' },
  { value: 'lugha', label: 'اللغة العربية', labelFr: 'Langue Arabe' }
];

export const LANGUAGES = [
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' }
];

export const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal', labelFr: 'Normal' },
  { value: 'priority', label: 'Prioritaire', labelFr: 'Prioritaire' }
];

export const QUESTION_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const STORAGE_KEYS = {
  TOKEN: '@scholars_connect/token',
  REFRESH_TOKEN: '@scholars_connect/refresh_token',
  USER: '@scholars_connect/user',
  THEME: '@scholars_connect/theme',
  LANGUAGE: '@scholars_connect/language'
};
