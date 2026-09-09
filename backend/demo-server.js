const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api', (req, res) => {
    res.json({
        message: 'Scholars Connect API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            questions: '/api/questions'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
    console.log('==========================================');
    console.log('  Scholars Connect');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  /admin - Interface Admin');
    console.log('==========================================');
});

module.exports = { app, server };
