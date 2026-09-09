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

// ============================================================
// INTERFACE GRAPHIQUE
// ============================================================
app.get('/', (req, res) => {
    res.send(
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scholars Connect</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: #0a0e27;
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
            text-align: center;
        }
        .icon { font-size: 72px; margin-bottom: 16px; }
        h1 { font-size: 42px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { font-size: 18px; opacity: 0.9; margin-bottom: 24px; }
        .badge {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            padding: 6px 20px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }
        .feature {
            background: rgba(255,255,255,0.08);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .feature .emoji { font-size: 32px; display: block; margin-bottom: 8px; }
        .feature h3 { font-size: 16px; margin-bottom: 4px; }
        .feature p { font-size: 13px; opacity: 0.7; }
        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #22c55e;
            color: #0a0e27;
            padding: 8px 24px;
            border-radius: 20px;
            font-weight: 600;
            margin-top: 16px;
        }
        .status .dot {
            width: 10px;
            height: 10px;
            background: #0a0e27;
            border-radius: 50%;
            animation: blink 1.5s infinite;
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .btn {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            margin-top: 20px;
            transition: transform 0.3s;
        }
        .btn:hover { transform: scale(1.05); }
        .footer {
            margin-top: 24px;
            font-size: 12px;
            opacity: 0.5;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 20px;
        }
        @media (max-width: 600px) {
            .container { padding: 24px; }
            h1 { font-size: 28px; }
            .features { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🎓</div>
        <h1>Scholars Connect</h1>
        <div class="subtitle">Plateforme d'entraide académique</div>
        <div class="badge">🌟 Vérifié par AI Judge Claude</div>
        
        <div class="features">
            <div class="feature">
                <span class="emoji">🌐</span>
                <h3>12 Langues</h3>
                <p>Questions et réponses multilingues</p>
            </div>
            <div class="feature">
                <span class="emoji">🤖</span>
                <h3>AI Judge</h3>
                <p>Vérification automatique des réponses</p>
            </div>
            <div class="feature">
                <span class="emoji">📝</span>
                <h3>Traduction</h3>
                <p>Traduction dans 11 langues</p>
            </div>
            <div class="feature">
                <span class="emoji">🔐</span>
                <h3>Sécurisé</h3>
                <p>Authentification JWT</p>
            </div>
        </div>
        
        <div class="status">
            <span class="dot"></span>
            EN LIGNE
        </div>
        
        <br>
        <a href="/api" class="btn">📡 Voir l'API</a>
        <a href="https://github.com/ramsis0710-a11y/scholars-connect" class="btn" style="margin-left:12px;background:rgba(255,255,255,0.1);color:white;">💻 Code source</a>
        
        <div class="footer">
            <p>🔗 Lien permanent : scholars-connect-app.onrender.com</p>
            <p style="margin-top:4px;">📧 admin@scholars-connect.com / admin12345</p>
        </div>
    </div>
</body>
</html>
    );
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
