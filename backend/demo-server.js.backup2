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

// Servir le fichier HTML directement depuis un fichier séparé
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api', (req, res) => {
    res.json({
        message: 'Scholars Connect API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            api: '/api',
            questions: '/api/questions',
            auth: '/api/auth'
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

// Démarrer le serveur
const server = app.listen(PORT, () => {
    console.log('==========================================');
    console.log('  Scholars Connect DEMO en cours');
    console.log('  URL: http://localhost:' + PORT);
    console.log('------------------------------------------');
    console.log('  Démo (compte admin):');
    console.log('    email: admin@scholars-connect.com');
    console.log('    mot de passe: admin12345');
    console.log('==========================================');
});

// Gestion des erreurs
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

module.exports = { app, server };
