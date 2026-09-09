const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Route pour l'interface graphique
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes API
app.get('/api', (req, res) => {
    res.json({
        message: 'Scholars Connect API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            api: '/api',
            questions: '/api/questions',
            auth: '/api/auth',
            users: '/api/users',
            scholars: '/api/scholars'
        }
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Routes de démo
app.get('/api/questions', (req, res) => {
    res.json({
        questions: [
            {
                id: 1,
                title: "Comment fonctionne le système JWT ?",
                content: "J'aimerais comprendre comment fonctionne l'authentification JWT...",
                status: "answered",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "Qu'est-ce que la 12ème langue supportée ?",
                content: "Quelle est la 12ème langue disponible sur la plateforme ?",
                status: "pending",
                createdAt: new Date().toISOString()
            }
        ]
    });
});

app.get('/api/users/me', (req, res) => {
    res.json({
        user: {
            id: 1,
            email: "admin@scholars-connect.com",
            username: "admin",
            role: "admin",
            createdAt: new Date().toISOString()
        }
    });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
    console.log('==========================================');
    console.log('  Scholars Connect DEMO en cours');
    console.log('  URL: http://localhost:' + PORT);
    console.log('------------------------------------------');
    console.log('  Démo (compte admin):');
    console.log('    email: admin@scholars-connect.com');
    console.log('    mot de passe: admin12345');
    console.log('  Endpoints disponibles:');
    console.log('    GET / -> Interface HTML');
    console.log('    GET /api -> API Info');
    console.log('    GET /health -> Health Check');
    console.log('    GET /api/questions -> Questions');
    console.log('    GET /api/users/me -> Profil admin');
    console.log('==========================================');
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

module.exports = { app, server };
