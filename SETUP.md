# Configuration de CandidChat

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration de l'API Anthropic Claude

#### Étape 1: Obtenir votre clé API
1. Rendez-vous sur [console.anthropic.com](https://console.anthropic.com)
2. Créez un compte ou connectez-vous
3. Allez dans la section "API Keys"
4. Cliquez sur "Create Key"
5. Copiez votre clé API (elle commence par `sk-ant-`)

#### Étape 2: Configuration des variables d'environnement
1. Copiez le fichier d'exemple :
```bash
cp .env.example .env
```

2. Éditez le fichier `.env` et remplacez `your_anthropic_api_key_here` par votre vraie clé API :
```env
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
PORT=3001
```

⚠️ **IMPORTANT**: Ne commitez JAMAIS votre fichier `.env` avec la vraie clé API !

### 3. Structure du projet

```
candid-hire-chat/
├── backend/
│   ├── server.js              # Serveur Express
│   └── profileAnalyzer.js     # Logique d'analyse avec Claude
├── profiles/                  # Dossier pour les PDFs (créé automatiquement)
├── src/
│   └── components/
│       └── ProfileAnalyzer.tsx # Interface React
└── .env                       # Variables d'environnement (à créer)
```

### 4. Démarrage de l'application

#### Terminal 1 - Backend :
```bash
npm run dev:backend
```
Le backend démarre sur http://localhost:3001

#### Terminal 2 - Frontend :
```bash
npm run dev
```
Le frontend démarre sur http://localhost:5173

### 5. Utilisation

1. **Décrivez le poste** : Dans l'interface, décrivez le profil que vous recherchez
2. **Ajoutez des profils** : Uploadez des CVs PDF via l'interface ou manuellement dans le dossier `profiles/`
3. **Lancez l'analyse** : Cliquez sur "Analyser les profils"
4. **Consultez les résultats** : Visualisez les 3 meilleurs candidats avec scores détaillés

## 📊 Système de Scoring

L'application évalue chaque candidat sur 5 critères :

- **Compétences techniques** (0-100) : Langages, frameworks, outils
- **Expérience** (0-100) : Années d'expérience, projets pertinents
- **Formation** (0-100) : Diplômes, certifications
- **Soft skills** (0-100) : Communication, leadership, travail en équipe
- **Adéquation culturelle** (0-100) : Compatibilité avec l'entreprise

Le **score global** est une moyenne pondérée de ces critères.

## 🛠 Scripts disponibles

- `npm run dev` : Lance le frontend en mode développement
- `npm run dev:backend` : Lance le backend avec auto-reload
- `npm run backend` : Lance le backend en mode production
- `npm run build` : Build le frontend pour la production
- `npm run lint` : Vérification du code

## 🔧 Dépannage

### Erreur "ANTHROPIC_API_KEY not set"
- Vérifiez que le fichier `.env` existe et contient votre clé API
- Redémarrez le backend après avoir modifié `.env`

### Erreur lors de l'upload de PDF
- Vérifiez que le dossier `profiles/` existe
- Assurez-vous que les fichiers sont bien des PDFs valides
- Limite de taille : 10MB par fichier

### Erreur de connexion backend
- Vérifiez que le backend tourne sur le port 3001
- Vérifiez que CORS est bien configuré

## 💡 Fonctionnalités futures

- Intégration API LinkedIn officielle
- Export des résultats en PDF
- Historique des analyses
- Gestion multi-utilisateurs
- Notifications par email

## 🔒 Sécurité

- Les clés API ne sont jamais exposées côté client
- Les PDFs uploadés sont stockés localement (non versionnés)
- Validation des types de fichiers
- Limite de taille des uploads