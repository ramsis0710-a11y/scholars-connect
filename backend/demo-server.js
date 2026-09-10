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
        { id: 1, name: 'Dr. Ahmed Al-Faqih', domain: 'Islam', expertise: 'Fiqh (Jurisprudence)', languages: ['ar', 'fr', 'en'], rating: 4.9 },
        { id: 2, name: 'Dr. Fatima Al-Aqida', domain: 'Islam', expertise: 'Aqida (Croyance)', languages: ['ar', 'fr', 'en'], rating: 4.8 },
        { id: 3, name: 'Dr. Omar Al-Hadith', domain: 'Islam', expertise: 'Hadith (Prophétique)', languages: ['ar', 'en', 'fr'], rating: 4.9 },
        { id: 4, name: 'Dr. Layla Tafsir', domain: 'Islam', expertise: 'Tafsir (Exégèse)', languages: ['ar', 'fr', 'en'], rating: 4.7 },
        { id: 5, name: 'Dr. Youssef Sira', domain: 'Islam', expertise: 'Sira (Biographie)', languages: ['ar', 'en', 'fr'], rating: 4.6 },
        { id: 6, name: 'Dr. Khadija Soufisme', domain: 'Islam', expertise: 'Soufisme (Spiritualité)', languages: ['ar', 'fr', 'en'], rating: 4.5 },
        { id: 7, name: 'Dr. Marie Dupont', domain: 'Médecine', expertise: 'Cardiologie', languages: ['fr', 'en', 'ar'], rating: 4.9 },
        { id: 8, name: 'Dr. Ahmed Benali', domain: 'Médecine', expertise: 'Neurologie', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 9, name: 'Dr. Sophie Martin', domain: 'Médecine', expertise: 'Pédiatrie', languages: ['fr', 'en'], rating: 4.9 },
        { id: 10, name: 'Dr. Karim Haddad', domain: 'Médecine', expertise: 'Chirurgie orthopédique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 11, name: 'Dr. Leila Mansouri', domain: 'Médecine', expertise: 'Oncologie', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 12, name: 'Dr. Isabelle Rousseau', domain: 'Pharmacie', expertise: 'Pharmacologie clinique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 13, name: 'Dr. Mohamed Trabelsi', domain: 'Pharmacie', expertise: 'Pharmacie galénique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 14, name: 'Dr. Claire Petit', domain: 'Pharmacie', expertise: 'Pharmacovigilance', languages: ['fr', 'en'], rating: 4.9 },
        { id: 15, name: 'Dr. Pierre Laurent', domain: 'Chimie', expertise: 'Chimie organique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 16, name: 'Dr. Nadia Bouazizi', domain: 'Chimie', expertise: 'Chimie analytique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 17, name: 'Dr. Hassan Rifai', domain: 'Chimie', expertise: 'Chimie industrielle', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 18, name: 'Dr. Yann LeCun Jr.', domain: 'IA', expertise: 'Deep Learning', languages: ['fr', 'en'], rating: 5.0 },
        { id: 19, name: 'Dr. Amina Khalil', domain: 'IA', expertise: 'NLP & Traitement du langage', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 20, name: 'Dr. Thomas Bernard', domain: 'IA', expertise: 'Computer Vision', languages: ['fr', 'en'], rating: 4.8 },
        { id: 21, name: 'Dr. Sara El Amrani', domain: 'IA', expertise: 'Reinforcement Learning', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 22, name: 'Dr. Julien Moreau', domain: 'IoT', expertise: 'Architecture IoT', languages: ['fr', 'en'], rating: 4.8 },
        { id: 23, name: 'Dr. Rania Hamdi', domain: 'IoT', expertise: 'Sécurité IoT', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 24, name: 'Dr. Marc Lefebvre', domain: 'IoT', expertise: 'Protocoles MQTT/CoAP', languages: ['fr', 'en'], rating: 4.6 },
        { id: 25, name: 'Dr. Olivier Dubois', domain: 'GMAO', expertise: 'GMAO (Maintenance Assistée)', languages: ['fr', 'en'], rating: 4.9 },
        { id: 26, name: 'Dr. Karim Bouzid', domain: 'GMAO', expertise: 'GPAO (Production Assistée)', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 27, name: 'Dr. Hélène Girard', domain: 'GMAO', expertise: 'Planification industrielle', languages: ['fr', 'en'], rating: 4.7 },
        { id: 28, name: 'Dr. Jean-Pierre Durand', domain: 'Mécanique Pétrole', expertise: 'Usinage CNC haute précision', languages: ['fr', 'en'], rating: 5.0 },
        { id: 29, name: 'Dr. Abdelkader Ziani', domain: 'Mécanique Pétrole', expertise: 'Vannes et équipements pétroliers', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 30, name: 'Dr. Sarah Cohen', domain: 'Mécanique Pétrole', expertise: 'Turbines et compresseurs', languages: ['fr', 'en'], rating: 4.8 },
        { id: 31, name: 'Dr. Rachid Benmoussa', domain: 'Mécanique Pétrole', expertise: 'Forage et complétion', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 32, name: 'Dr. Philippe Roux', domain: 'Mécanique Pétrole', expertise: 'Contrôle qualité et métrologie', languages: ['fr', 'en'], rating: 4.8 },
        { id: 33, name: 'Dr. Amira Math', domain: 'Général', expertise: 'Mathématiques', languages: ['fr', 'en', 'ar'], rating: 4.9 },
        { id: 34, name: 'Dr. Sophie Physique', domain: 'Général', expertise: 'Physique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 35, name: 'Dr. Karim Info', domain: 'Général', expertise: 'Informatique', languages: ['fr', 'en', 'es'], rating: 4.7 },
        { id: 36, name: 'Dr. Fatima Histoire', domain: 'Général', expertise: 'Histoire', languages: ['fr', 'en', 'ar'], rating: 4.9 }
    ]);
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
});
