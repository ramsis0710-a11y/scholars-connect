// frontend/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import MultilingualUI, { LanguageSelector, TranslateButton, AIGradeBadge, AIJudgeBanner, ConfirmationMessage } from '../components/MultilingualUI';

const Home = () => {
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [selectedLang, setSelectedLang] = useState('en');
  const [sampleText, setSampleText] = useState('Bienvenue sur Scholars Connect');
  
  useEffect(() => {
    // Afficher le message de confirmation après 2 secondes
    const timer = setTimeout(() => {
      setShowConfirmation(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTranslate = async (text, targetLang) => {
    // Simulation de traduction
    const translations = {
      'en': 'Welcome to Scholars Connect',
      'ar': 'مرحبا بكم في Scholars Connect',
      'es': 'Bienvenido a Scholars Connect',
      'de': 'Willkommen bei Scholars Connect',
      'it': 'Benvenuto su Scholars Connect',
      'pt': 'Bem-vindo ao Scholars Connect',
      'ru': 'Добро пожаловать в Scholars Connect',
      'zh': '欢迎来到 Scholars Connect',
      'ja': 'Scholars Connect へようこそ',
      'ko': 'Scholars Connect에 오신 것을 환영합니다',
      'hi': 'Scholars Connect में आपका स्वागत है'
    };
    return translations[targetLang] || text;
  };

  return (
    <div style={styles.container}>
      {/* BANNIÈRE DE CONFIRMATION AI JUDGE */}
      {showConfirmation && (
        <ConfirmationMessage 
          message="✅ Toutes les questions et réponses sont contrôlées par AI Judge Claude pour garantir leur qualité et pertinence."
          type="success"
        />
      )}

      {/* SÉLECTEUR DE LANGUE */}
      <div style={styles.topBar}>
        <LanguageSelector />
        <AIGradeBadge grade="A" score="95" message="✔️ Vérifié par AI Judge" />
      </div>

      {/* BANNIÈRE AI JUDGE */}
      <AIJudgeBanner />

      <div style={styles.main}>
        <h1 style={styles.title}>🎓 Scholars Connect</h1>
        <h2 style={styles.subtitle}>Plateforme d'entraide académique multilingue</h2>
        
        <div style={styles.features}>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>🌐</span>
            <h3>12 Langues</h3>
            <p>Questions et réponses dans votre langue</p>
          </div>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>🤖</span>
            <h3>AI Judge Claude</h3>
            <p>Vérification et correction automatique</p>
          </div>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>📝</span>
            <h3>Traduction Instantanée</h3>
            <p>Traduisez dans toute langue</p>
          </div>
        </div>

        {/* EXEMPLE DE TRADUCTION */}
        <div style={styles.demoSection}>
          <h3 style={styles.demoTitle}>📝 Essayez la traduction :</h3>
          <div style={styles.translateDemo}>
            <p style={styles.demoText}>{sampleText}</p>
            <TranslateButton 
              text={sampleText} 
              onTranslate={handleTranslate}
            />
          </div>
        </div>

        {/* BOUTONS D'ACTION */}
        <div style={styles.actionButtons}>
          <button style={styles.primaryBtn} onClick={() => window.location.href = '/login'}>
            🔐 Se connecter
          </button>
          <button style={styles.secondaryBtn} onClick={() => window.location.href = '/register'}>
            📝 S'inscrire
          </button>
        </div>

        {/* MESSAGE DE STATUT */}
        <div style={styles.statusBar}>
          <span style={styles.statusDot}>🟢</span>
          <span>Service actif - Vérification AI en temps réel</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    background: '#0a0e27',
    color: '#ffffff'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '40px'
  },
  title: {
    fontSize: '48px',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '20px',
    opacity: '0.8',
    marginBottom: '30px'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '30px'
  },
  featureCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  featureIcon: {
    fontSize: '36px',
    display: 'block',
    marginBottom: '10px'
  },
  demoSection: {
    width: '100%',
    maxWidth: '600px',
    margin: '20px 0',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  demoTitle: {
    marginBottom: '10px',
    color: '#667eea'
  },
  translateDemo: {
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px'
  },
  demoText: {
    fontSize: '16px',
    marginBottom: '10px'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: '0.3s'
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    padding: '14px 32px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: '0.3s'
  },
  statusBar: {
    marginTop: '30px',
    padding: '10px 20px',
    background: 'rgba(34,197,94,0.1)',
    borderRadius: '20px',
    border: '1px solid rgba(34,197,94,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  statusDot: {
    fontSize: '16px'
  }
};

export default Home;
