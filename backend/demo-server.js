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

app.get('/api/questions', (req, res) => {
    res.json([]);
});

app.post('/api/questions', (req, res) => {
    res.json({ success: true });
});

app.get('/api/scholars', (req, res) => {
    res.json([
        // ============================================
        // 🕌 ISLAM
        // ============================================
        { id: 1, name: 'د. أحمد الفقيه', nameFr: 'Dr. Ahmed Al-Faqih', domain: 'Islam', expertise: 'Fiqh (الفقه)', languages: ['ar', 'fr', 'en'], rating: 4.9 },
        { id: 2, name: 'د. فاطمة العقيدة', nameFr: 'Dr. Fatima Al-Aqida', domain: 'Islam', expertise: 'Aqida (العقيدة)', languages: ['ar', 'fr', 'en'], rating: 4.8 },
        { id: 3, name: 'د. عمر الحديث', nameFr: 'Dr. Omar Al-Hadith', domain: 'Islam', expertise: 'Hadith (الحديث)', languages: ['ar', 'en', 'fr'], rating: 4.9 },
        { id: 4, name: 'د. ليلى التفسير', nameFr: 'Dr. Layla Tafsir', domain: 'Islam', expertise: 'Tafsir (التفسير)', languages: ['ar', 'fr', 'en'], rating: 4.7 },
        { id: 5, name: 'د. يوسف السيرة', nameFr: 'Dr. Youssef Sira', domain: 'Islam', expertise: 'Sira (السيرة)', languages: ['ar', 'en', 'fr'], rating: 4.6 },
        { id: 6, name: 'د. خديجة التصوف', nameFr: 'Dr. Khadija Soufisme', domain: 'Islam', expertise: 'Soufisme (التصوف)', languages: ['ar', 'fr', 'en'], rating: 4.5 },

        // ============================================
        // 🏥 MÉDECINE
        // ============================================
        { id: 7, name: 'Dr. Marie Dupont', nameAr: 'د. ماري دوبون', domain: 'Médecine', expertise: 'Cardiologie', languages: ['fr', 'en', 'ar'], rating: 4.9 },
        { id: 8, name: 'Dr. Ahmed Benali', nameAr: 'د. أحمد بن علي', domain: 'Médecine', expertise: 'Neurologie', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 9, name: 'Dr. Sophie Martin', nameAr: 'د. صوفي مارتان', domain: 'Médecine', expertise: 'Pédiatrie', languages: ['fr', 'en'], rating: 4.9 },
        { id: 10, name: 'Dr. Karim Haddad', nameAr: 'د. كريم حداد', domain: 'Médecine', expertise: 'Chirurgie orthopédique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 11, name: 'Dr. Leila Mansouri', nameAr: 'د. ليلى منصوري', domain: 'Médecine', expertise: 'Oncologie', languages: ['fr', 'ar', 'en'], rating: 4.8 },

        // ============================================
        // 💊 PHARMACIE
        // ============================================
        { id: 12, name: 'Dr. Isabelle Rousseau', nameAr: 'د. إيزابيل روسو', domain: 'Pharmacie', expertise: 'Pharmacologie clinique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 13, name: 'Dr. Mohamed Trabelsi', nameAr: 'د. محمد الطرابلسي', domain: 'Pharmacie', expertise: 'Pharmacie galénique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 14, name: 'Dr. Claire Petit', nameAr: 'د. كلير بوتي', domain: 'Pharmacie', expertise: 'Pharmacovigilance', languages: ['fr', 'en'], rating: 4.9 },

        // ============================================
        // ⚗️ CHIMIE
        // ============================================
        { id: 15, name: 'Dr. Pierre Laurent', nameAr: 'د. بيير لوران', domain: 'Chimie', expertise: 'Chimie organique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 16, name: 'Dr. Nadia Bouazizi', nameAr: 'د. نادية بوعزيزي', domain: 'Chimie', expertise: 'Chimie analytique', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 17, name: 'Dr. Hassan Rifai', nameAr: 'د. حسن الرفاعي', domain: 'Chimie', expertise: 'Chimie industrielle', languages: ['fr', 'ar', 'en'], rating: 4.8 },

        // ============================================
        // 🤖 INTELLIGENCE ARTIFICIELLE
        // ============================================
        { id: 18, name: 'Dr. Yann LeCun Jr.', nameAr: 'د. يان لوكوان', domain: 'IA', expertise: 'Deep Learning', languages: ['fr', 'en'], rating: 5.0 },
        { id: 19, name: 'Dr. Amina Khalil', nameAr: 'د. أمينة خليل', domain: 'IA', expertise: 'NLP & Traitement du langage', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 20, name: 'Dr. Thomas Bernard', nameAr: 'د. توماس برنارد', domain: 'IA', expertise: 'Computer Vision', languages: ['fr', 'en'], rating: 4.8 },
        { id: 21, name: 'Dr. Sara El Amrani', nameAr: 'د. سارة العمراني', domain: 'IA', expertise: 'Reinforcement Learning', languages: ['fr', 'ar', 'en'], rating: 4.7 },

        // ============================================
        // 🌐 INFORMATIQUE DES OBJETS (IoT)
        // ============================================
        { id: 22, name: 'Dr. Julien Moreau', nameAr: 'د. جوليان مورو', domain: 'IoT', expertise: 'Architecture IoT', languages: ['fr', 'en'], rating: 4.8 },
        { id: 23, name: 'Dr. Rania Hamdi', nameAr: 'د. رانيا حمدي', domain: 'IoT', expertise: 'Sécurité IoT', languages: ['fr', 'ar', 'en'], rating: 4.7 },
        { id: 24, name: 'Dr. Marc Lefebvre', nameAr: 'د. مارك لوفيفر', domain: 'IoT', expertise: 'Protocoles MQTT/CoAP', languages: ['fr', 'en'], rating: 4.6 },

        // ============================================
        // 🏭 GMAO / GPAO
        // ============================================
        { id: 25, name: 'Dr. Olivier Dubois', nameAr: 'د. أوليفييه دوبوا', domain: 'GMAO', expertise: 'GMAO (Maintenance Assistée)', languages: ['fr', 'en'], rating: 4.9 },
        { id: 26, name: 'Dr. Karim Bouzid', nameAr: 'د. كريم بوزيد', domain: 'GMAO', expertise: 'GPAO (Production Assistée)', languages: ['fr', 'ar', 'en'], rating: 4.8 },
        { id: 27, name: 'Dr. Hélène Girard', nameAr: 'د. إلين جيرار', domain: 'GMAO', expertise: 'Planification industrielle', languages: ['fr', 'en'], rating: 4.7 },

        // ============================================
        // ⚙️ FABRICATION MÉCANIQUE DE PRÉCISION - PÉTROLE
        // ============================================
        { id: 28, name: 'Dr. Jean-Pierre Durand', nameAr: 'د. جان بيير دوران', domain: 'Mécanique Pétrole', expertise: 'Usinage CNC haute précision', languages: ['fr', 'en'], rating: 5.0 },
        { id: 29, name: 'Dr. Abdelkader Ziani', nameAr: 'د. عبد القادر زياني', domain: 'Mécanique Pétrole', expertise: 'Vannes et équipements pétroliers', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 30, name: 'Dr. Sarah Cohen', nameAr: 'د. سارة كوهين', domain: 'Mécanique Pétrole', expertise: 'Turbines et compresseurs', languages: ['fr', 'en'], rating: 4.8 },
        { id: 31, name: 'Dr. Rachid Benmoussa', nameAr: 'د. رشيد بن موسى', domain: 'Mécanique Pétrole', expertise: 'Forage et complétion', languages: ['fr', 'ar', 'en'], rating: 4.9 },
        { id: 32, name: 'Dr. Philippe Roux', nameAr: 'د. فيليب رو', domain: 'Mécanique Pétrole', expertise: 'Contrôle qualité et métrologie', languages: ['fr', 'en'], rating: 4.8 },

        // ============================================
        // 📚 SCIENCES GÉNÉRALES
        // ============================================
        { id: 33, name: 'Dr. Amira Math', nameAr: 'د. أميرة الرياضيات', domain: 'Général', expertise: 'Mathématiques', languages: ['fr', 'en', 'ar'], rating: 4.9 },
        { id: 34, name: 'Dr. Sophie Physique', nameAr: 'د. صوفي الفيزياء', domain: 'Général', expertise: 'Physique', languages: ['fr', 'en'], rating: 4.8 },
        { id: 35, name: 'Dr. Karim Info', nameAr: 'د. كريم المعلوماتية', domain: 'Général', expertise: 'Informatique', languages: ['fr', 'en', 'es'], rating: 4.7 },
        { id: 36, name: 'Dr. Fatima Histoire', nameAr: 'د. فاطمة التاريخ', domain: 'Général', expertise: 'Histoire', languages: ['fr', 'en', 'ar'], rating: 4.9 }
    ]);
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
    console.log('   📚 36 Scholars dans 8 domaines');
});
