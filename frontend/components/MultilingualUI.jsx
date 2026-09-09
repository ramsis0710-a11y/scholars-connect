// frontend/components/MultilingualUI.jsx
import React, { useState, useEffect } from 'react';

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
];

// SÉLECTEUR DE LANGUE
export const LanguageSelector = () => {
  const [lang, setLang] = useState(localStorage.getItem('pref-lang') || 'fr');
  
  const handleChange = (e) => {
    const val = e.target.value;
    setLang(val);
    localStorage.setItem('pref-lang', val);
    window.location.reload();
  };
  
  return (
    <div style={styles.selector}>
      <span style={styles.label}>🌐</span>
      <select value={lang} onChange={handleChange} style={styles.select}>
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
        ))}
      </select>
    </div>
  );
};

// BOUTON DE TRADUCTION
export const TranslateButton = ({ text, onTranslate }) => {
  const [targetLang, setTargetLang] = useState('en');
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState(null);

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const result = await onTranslate(text, targetLang);
      setTranslated(result);
    } catch (e) {
      console.error('Erreur traduction:', e);
    }
    setTranslating(false);
  };

  return (
    <div style={styles.translateContainer}>
      <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={styles.smallSelect}>
        {LANGUAGES.filter(l => l.code !== 'fr').map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
        ))}
      </select>
      <button onClick={handleTranslate} style={styles.translateBtn} disabled={translating}>
        {translating ? '⏳ Traduction...' : '📝 Traduire'}
      </button>
      {translated && (
        <div style={styles.translatedBox}>
          <strong>🌐 Traduction :</strong>
          <p>{translated}</p>
        </div>
      )}
    </div>
  );
};

// BADGE AI JUDGE
export const AIGradeBadge = ({ grade, score, message }) => {
  const colors = { A: '#22c55e', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const labels = { A: '⭐ Excellent', B: '✅ Très bon', C: '📊 Bon', D: '📝 Moyen', F: '🔄 À améliorer' };
  
  return (
    <div style={styles.aiBadge}>
      <span style={{...styles.grade, color: colors[grade] || '#888'}}>
        {grade || '?'}
      </span>
      <span style={styles.score}>{score || 0}/100</span>
      <span style={styles.label}>{labels[grade] || 'Vérifié'}</span>
      {message && <span style={styles.message}>{message}</span>}
    </div>
  );
};

// BANNIÈRE AI JUDGE
export const AIJudgeBanner = () => {
  return (
    <div style={styles.banner}>
      <span style={styles.bannerIcon}>🤖</span>
      <div>
        <strong style={styles.bannerTitle}>Vérifié par AI Judge Claude</strong>
        <p style={styles.bannerText}>
          Toutes les réponses sont automatiquement vérifiées et corrigées par 
          l'intelligence artificielle Claude pour garantir qualité et pertinence.
        </p>
      </div>
    </div>
  );
};

// MESSAGE DE CONFIRMATION
export const ConfirmationMessage = ({ message, type = 'success' }) => {
  const colors = {
    success: '#22c55e',
    info: '#3b82f6',
    warning: '#eab308',
    error: '#ef4444'
  };
  
  return (
    <div style={{...styles.confirmation, borderColor: colors[type] || colors.info}}>
      <span style={{...styles.confirmIcon, color: colors[type]}}>✅</span>
      <span>{message}</span>
    </div>
  );
};

// STYLES
const styles = {
  selector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  label: { fontSize: '18px' },
  select: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    padding: '4px 8px',
    cursor: 'pointer',
    outline: 'none'
  },
  translateContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px'
  },
  smallSelect: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  translateBtn: {
    background: '#667eea',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    transition: '0.3s'
  },
  translatedBox: {
    width: '100%',
    marginTop: '8px',
    padding: '10px 14px',
    background: 'rgba(102,126,234,0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    borderLeft: '3px solid #667eea'
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '2px solid #667eea',
    background: 'rgba(255,255,255,0.05)',
    fontSize: '13px',
    flexWrap: 'wrap'
  },
  grade: { fontWeight: '800', fontSize: '18px' },
  score: { fontWeight: '600', opacity: '0.8' },
  label: { opacity: '0.7', fontSize: '11px' },
  message: { fontSize: '11px', opacity: '0.9', color: '#4ade80' },
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))',
    borderRadius: '12px',
    border: '1px solid rgba(102,126,234,0.2)',
    margin: '10px 0'
  },
  bannerIcon: { fontSize: '28px' },
  bannerTitle: { color: '#667eea', fontSize: '15px', display: 'block' },
  bannerText: { fontSize: '13px', opacity: '0.8', margin: '4px 0 0 0' },
  confirmation: {
    padding: '12px 18px',
    borderRadius: '10px',
    borderLeft: '4px solid',
    background: 'rgba(255,255,255,0.03)',
    margin: '8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  confirmIcon: { fontSize: '18px' }
};

// EXPORT DU COMPOSANT PRINCIPAL
const MultilingualUI = {
  LanguageSelector,
  TranslateButton,
  AIGradeBadge,
  AIJudgeBanner,
  ConfirmationMessage
};

export default MultilingualUI;
