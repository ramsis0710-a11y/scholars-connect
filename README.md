# Scholars Connect

Plateforme de connexion entre les utilisateurs musulmans et des scholars islamiques qualifiés pour des questions religieuses.

## Aperçu

Scholars Connect est une plateforme qui permet de:

- Poser des questions sur divers sujets islamiques (fiqh, aqida, hadith, etc.)
- Être mis en relation avec des scholars qualifiés et vérifiés
- Communiquer via chat texte en temps réel
- Organiser des appels vidéo
- Évaluer les réponses reçues
- Support multilingue (arabe, français, anglais, etc.)

## Structure du Projet

```
scholars-connect/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── config/         # Configuration (DB, auth, etc.)
│   │   ├── controllers/    # Logique métier
│   │   ├── middleware/     # Middlewares Express
│   │   ├── models/         # Modèles Sequelize
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services métier
│   │   ├── socket/         # Gestion WebSocket
│   │   └── utils/          # Utilitaires
│   ├── tests/              # Tests automatisés
│   └── package.json
├── frontend/                # Application React Native
│   └── src/
│       ├── api/            # Client API
│       ├── components/     # Composants
│       ├── screens/        # Écrans
│       ├── navigation/     # Navigation
│       ├── hooks/          # Hooks React
│       └── theme/          # Thème
├── docker-compose.yml
├── nginx.conf
└── .github/workflows/       # CI/CD
```

## Prérequis

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optionnel)
- Docker (pour le déploiement)

## Installation

### 1. Configuration du backend

```bash
cd backend
cp .env.example .env
# Modifiez .env avec vos valeurs de configuration

npm install
npm run dev
```

### 2. Configuration du frontend

```bash
cd frontend
npm install
npm start
```

## Scripts Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le serveur en mode développement |
| `npm start` | Lance le serveur en production |
| `npm test` | Exécute les tests |
| `npm run lint` | Vérifie le style de code |
| `npm run migrate` | Exécute les migrations |
| `npm run seed` | Remplit la base de données |

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/refresh-token` - Rafraîchir le token
- `POST /api/auth/forgot-password` - Mot de passe oublié
- `POST /api/auth/reset-password` - Réinitialiser le mot de passe

### Utilisateurs
- `GET /api/users/me` - Profil utilisateur
- `PUT /api/users/me` - Mettre à jour le profil
- `DELETE /api/users/me` - Supprimer le compte
- `POST /api/users/me/change-password` - Changer le mot de passe

### Scholars
- `GET /api/scholars` - Liste des scholars
- `GET /api/scholars/:id` - Détail d'un scholar
- `POST /api/scholars` - Créer un profil scholar
- `PUT /api/scholars/me` - Mettre à jour le profil scholar

### Questions
- `POST /api/questions` - Créer une question
- `GET /api/questions/mine` - Mes questions
- `GET /api/questions/:id` - Détail d'une question
- `POST /api/questions/:id/responses` - Ajouter une réponse

### Chat
- `GET /api/chat/questions/:questionId/messages` - Messages d'une conversation
- `POST /api/chat/questions/:questionId/messages` - Envoyer un message

## Déploiement

### Docker Compose

```bash
docker-compose up -d
```

### CI/CD

Le pipeline GitHub Actions déploie automatiquement sur AWS ECS.
Configurez les secrets suivants dans votre repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `DB_PASS`
- `JWT_SECRET`

## Sécurité

- Mots de passe hachés avec bcrypt
- JWT avec expiration
- Validation d'entrée
- Protection contre les attaques (helmet, CORS)
- Rate limiting
- Upload de fichiers vérifié

## Licence

MIT
