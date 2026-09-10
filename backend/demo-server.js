const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/scholars', (req, res) => {
    res.json([
        // Scholars avec littérature
        { id: 1, name: 'Dr. Ahmed Al-Faqih', domain: 'Islam', expertise: 'Fiqh (Jurisprudence)', languages: ['ar', 'fr', 'en'], rating: 4.9,
          literature: ['Fiqh al-Islami', 'Usul al-Fiqh', 'Al-Risala', 'Bidayat al-Mujtahid'] },
        { id: 2, name: 'Dr. Fatima Al-Aqida', domain: 'Islam', expertise: 'Aqida (Croyance)', languages: ['ar', 'fr', 'en'], rating: 4.8,
          literature: ['Aqida Tahawiyya', 'Kitab al-Tawhid', 'Al-Ibana'] },
        { id: 3, name: 'Dr. Omar Al-Hadith', domain: 'Islam', expertise: 'Hadith (Prophétique)', languages: ['ar', 'en', 'fr'], rating: 4.9,
          literature: ['Sahih Bukhari', 'Sahih Muslim', 'Sunan Abi Dawud'] },
        { id: 4, name: 'Dr. Layla Tafsir', domain: 'Islam', expertise: 'Tafsir (Exégèse)', languages: ['ar', 'fr', 'en'], rating: 4.7,
          literature: ['Tafsir Ibn Kathir', 'Tafsir al-Tabari', 'Tafsir al-Qurtubi'] },
        { id: 5, name: 'Dr. Youssef Sira', domain: 'Islam', expertise: 'Sira (Biographie)', languages: ['ar', 'en', 'fr'], rating: 4.6,
          literature: ['Sira Ibn Hisham', 'Al-Rahiq al-Makhtum'] },
        { id: 6, name: 'Dr. Khadija Soufisme', domain: 'Islam', expertise: 'Soufisme (Spiritualité)', languages: ['ar', 'fr', 'en'], rating: 4.5,
          literature: ['Ihya Ulum al-Din', 'Al-Risala al-Qushayriyya'] },
        // Scholars SANS littérature spécifique (test)
        { id: 7, name: 'Dr. Marie Dupont', domain: 'Médecine', expertise: 'Cardiologie', languages: ['fr', 'en', 'ar'], rating: 4.9,
          literature: ['Harrison Cardiology', 'Braunwald Heart Disease'] },
        { id: 8, name: 'Dr. Ahmed Benali', domain: 'Médecine', expertise: 'Neurologie', languages: ['fr', 'ar', 'en'], rating: 4.8,
          literature: ['Adams Neurology', 'Bradley Neurology'] },
        { id: 9, name: 'Dr. Sophie Martin', domain: 'Médecine', expertise: 'Pédiatrie', languages: ['fr', 'en'], rating: 4.9,
          literature: ['Nelson Pediatrics'] },
        { id: 10, name: 'Dr. Karim Haddad', domain: 'Médecine', expertise: 'Chirurgie orthopédique', languages: ['fr', 'ar', 'en'], rating: 4.7,
          literature: [] },
        { id: 11, name: 'Dr. Leila Mansouri', domain: 'Médecine', expertise: 'Oncologie', languages: ['fr', 'ar', 'en'], rating: 4.8,
          literature: ['Devita Oncology'] },
        { id: 12, name: 'Dr. Isabelle Rousseau', domain: 'Pharmacie', expertise: 'Pharmacologie clinique', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Goodman & Gilman'] },
        { id: 13, name: 'Dr. Mohamed Trabelsi', domain: 'Pharmacie', expertise: 'Pharmacie galénique', languages: ['fr', 'ar', 'en'], rating: 4.7,
          literature: [] },
        { id: 14, name: 'Dr. Claire Petit', domain: 'Pharmacie', expertise: 'Pharmacovigilance', languages: ['fr', 'en'], rating: 4.9,
          literature: ['Meyler Pharmacovigilance'] },
        { id: 15, name: 'Dr. Pierre Laurent', domain: 'Chimie', expertise: 'Chimie organique', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Clayden Organic Chemistry'] },
        { id: 16, name: 'Dr. Nadia Bouazizi', domain: 'Chimie', expertise: 'Chimie analytique', languages: ['fr', 'ar', 'en'], rating: 4.7,
          literature: ['Skoog Analytical Chemistry'] },
        { id: 17, name: 'Dr. Hassan Rifai', domain: 'Chimie', expertise: 'Chimie industrielle', languages: ['fr', 'ar', 'en'], rating: 4.8,
          literature: [] },
        { id: 18, name: 'Dr. Yann LeCun Jr.', domain: 'IA', expertise: 'Deep Learning', languages: ['fr', 'en'], rating: 5.0,
          literature: ['Deep Learning (Goodfellow)', 'Neural Networks (Bishop)'] },
        { id: 19, name: 'Dr. Amina Khalil', domain: 'IA', expertise: 'NLP & Traitement du langage', languages: ['fr', 'ar', 'en'], rating: 4.9,
          literature: ['Speech and Language Processing (Jurafsky)'] },
        { id: 20, name: 'Dr. Thomas Bernard', domain: 'IA', expertise: 'Computer Vision', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Computer Vision (Szeliski)'] },
        { id: 21, name: 'Dr. Sara El Amrani', domain: 'IA', expertise: 'Reinforcement Learning', languages: ['fr', 'ar', 'en'], rating: 4.7,
          literature: ['Reinforcement Learning (Sutton & Barto)'] },
        { id: 22, name: 'Dr. Julien Moreau', domain: 'IoT', expertise: 'Architecture IoT', languages: ['fr', 'en'], rating: 4.8,
          literature: ['IoT Architecture (Borgia)'] },
        { id: 23, name: 'Dr. Rania Hamdi', domain: 'IoT', expertise: 'Sécurité IoT', languages: ['fr', 'ar', 'en'], rating: 4.7,
          literature: ['IoT Security (Russell)'] },
        { id: 24, name: 'Dr. Marc Lefebvre', domain: 'IoT', expertise: 'Protocoles MQTT/CoAP', languages: ['fr', 'en'], rating: 4.6,
          literature: ['MQTT Essentials'] },
        { id: 25, name: 'Dr. Olivier Dubois', domain: 'GMAO', expertise: 'GMAO (Maintenance Assistée)', languages: ['fr', 'en'], rating: 4.9,
          literature: ['Maintenance Industrielle (AFNOR)'] },
        { id: 26, name: 'Dr. Karim Bouzid', domain: 'GMAO', expertise: 'GPAO (Production Assistée)', languages: ['fr', 'ar', 'en'], rating: 4.8,
          literature: ['GPAO - Gestion de Production'] },
        { id: 27, name: 'Dr. Hélène Girard', domain: 'GMAO', expertise: 'Planification industrielle', languages: ['fr', 'en'], rating: 4.7,
          literature: [] },
        { id: 28, name: 'Dr. Jean-Pierre Durand', domain: 'Mécanique Pétrole', expertise: 'Usinage CNC haute précision', languages: ['fr', 'en'], rating: 5.0,
          literature: ['CNC Programming Handbook', 'Machining Fundamentals'] },
        { id: 29, name: 'Dr. Abdelkader Ziani', domain: 'Mécanique Pétrole', expertise: 'Vannes et équipements pétroliers', languages: ['fr', 'ar', 'en'], rating: 4.9,
          literature: ['Valve Handbook (Skousen)', 'API 6D Standard'] },
        { id: 30, name: 'Dr. Sarah Cohen', domain: 'Mécanique Pétrole', expertise: 'Turbines et compresseurs', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Gas Turbine Theory (Saravanamuttoo)'] },
        { id: 31, name: 'Dr. Rachid Benmoussa', domain: 'Mécanique Pétrole', expertise: 'Forage et complétion', languages: ['fr', 'ar', 'en'], rating: 4.9,
          literature: ['Drilling Engineering (Bourgoyne)'] },
        { id: 32, name: 'Dr. Philippe Roux', domain: 'Mécanique Pétrole', expertise: 'Contrôle qualité et métrologie', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Metrology Handbook'] },
        { id: 33, name: 'Dr. Amira Math', domain: 'Général', expertise: 'Mathématiques', languages: ['fr', 'en', 'ar'], rating: 4.9,
          literature: ['Calculus (Stewart)', 'Linear Algebra (Strang)'] },
        { id: 34, name: 'Dr. Sophie Physique', domain: 'Général', expertise: 'Physique', languages: ['fr', 'en'], rating: 4.8,
          literature: ['Feynman Lectures'] },
        { id: 35, name: 'Dr. Karim Info', domain: 'Général', expertise: 'Informatique', languages: ['fr', 'en', 'es'], rating: 4.7,
          literature: ['Clean Code', 'Introduction to Algorithms'] },
        { id: 36, name: 'Dr. Fatima Histoire', domain: 'Général', expertise: 'Histoire', languages: ['fr', 'en', 'ar'], rating: 4.9,
          literature: ['Histoire Universelle'] }
    ]);
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
});
