# MateClub

Votre podcast quotidien entre amis.

## Description

MateClub est une application web PWA permettant à un groupe d'amis d'enregistrer et partager des capsules audio quotidiennes. Chaque membre peut enregistrer des messages vocaux jusqu'à 3 minutes, avec possibilité d'ajouter une miniature image et un lien URL.

## Fonctionnalités

### Audio & Lecture
- **Enregistrement audio** - Durée max 3 minutes avec compression WebM
- **Player séquentiel** - Lecture automatique d'une capsule à la suivante
- **Jingle d'intro** - Jingle musical au début de la première capsule du jour (activable via admin)
- **Lecture arrière-plan** - Fonctionne smartphone verrouillé via technique "audio guardian"
- **MediaSession API** - Contrôles lockscreen (play/pause/next/prev)
- **Haptique** - Vibration au démarrage de la lecture

### Médias
- **Miniatures** - Ajout d'images aux enregistrements (45x45px avec bordure)
- **Compression automatique** - Images compressées avant upload (~100KB)
- **Visionneuse plein écran** - Affichage des images en grand
- **Liens URL** - Possibilité d'ajouter un lien externe (https://)

### Interface & UX
- **Authentification** - Login par pseudo/mot de passe (pas d'email requis)
- **PWA installable** - Installation sur mobile via manifest
- **Pull-to-refresh** - Rechargement de la page d'accueil (désactivé sur modales)
- **Scroll lock** - Empêche le scroll arrière-plan quand une modale est ouverte
- **Navigation tactile** - Swipe horizontal pour changer de capsule
- **Calendrier interactif** - Navigation par date avec code couleur
- **Confirmation de suppression** - Modal avec countdown avant suppression

### Système de seuils
- **Système de seuils** - Chaque utilisateur définit son heure de publication quotidienne
- **Super pouvoirs** - Rôle admin avec lecture anticipée (voir toutes les capsules sans attendre)
- **Timezone** - Fuseau horaire configurable par utilisateur

### Panel Admin
- **Gestion des utilisateurs** - Liste, création, suppression
- **Modification des seuils** - Heure de mise à disposition par utilisateur
- **Super pouvoirs** - Attribution de privileges de lecture anticipée
- **Logs de debug** - Activation des logs audio pour diagnostic
- **Jingle d'intro** - Activation/désactivation du jingle musical

### Sécurité & Technique
- **Validation des fichiers** - Vérification des magic numbers pour audio et images (évite les faux fichiers)
- **Protection path traversal** - Validation stricte des chemins de fichiers
- **Rate limiting** - 5 tentatives max par IP sur 15 minutes (protection brute-force)
- **Cookies sécurisés** - Détection automatique HTTPS via proxy (Caddy/Nginx)
- **CSRF tokens** - Protection contre les attaques cross-site sur tous les formulaires
- **Sessions glissantes** - Expiration de session réinitialisée à chaque requête (max 30 jours)
- **Mot de passe** - Minimum 12 caractères
- **Limites de taille** - Audio max 20MB, images max 10MB
- **Pages d'erreur personnalisées** - Masque les détails techniques en production
- **Source maps désactivées** - Pas de chemins de fichiers exposés
- **Service Worker** - Cache intelligent pour images et audio (3 mois)
- **Anti-cache** - Headers pour éviter le cache sur pages et API

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | SvelteKit 2.x |
| Base de données | SQLite (better-sqlite3) |
| Auth | Session cookie HTTPOnly |
| UI | Svelte 5 + CSS personnalisé |
| Build | Vite 7.x |
| Runtime | Node.js |

## Installation

### Développement local

```bash
cd mateclub
npm install
npm run dev
```

Aller sur http://localhost:5173

### Premier lancement (First-Run)

Au premier lancement, si aucun administrateur n'existe, vous êtes redirigé vers `/setup` pour créer le premier compte admin.

---

## Production

### Docker (recommandé)

**Variables d'environnement requises :**

Créez un fichier `.env` à la racine :

```bash
# .env
ADMIN_PSEUDO=votre_pseudo
ADMIN_PASSWORD=votre_mot_de_passe_securise
DATABASE_PATH=/app/data/mateclub.db
PORT=3000
```

Puis lancez :

```bash
docker-compose up -d
```

**Au premier lancement :**
1. Allez sur http://localhost:3000
2. Vous serez redirigé vers `/setup`
3. Créez votre compte administrateur
4. Après création, utilisez `/login` pour vous connecter

### Manuel

```bash
npm run build
npm run start
```

Aller sur http://localhost:3000

### Reverse Proxy (Caddy)

Pour déployer derrière Caddy avec HTTPS :

**Caddyfile :**
```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

**Avec Docker Compose et Caddy :**
```yaml
version: '3.8'

services:
  mateclub:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    env_file:
      - .env
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - mateclub

volumes:
  caddy_data:
  caddy_config:
```

## Configuration

Variables d'environnement:
- `ADMIN_PSEUDO` - Pseudo de l'admin (requis, pas de défaut)
- `ADMIN_PASSWORD` - Mot de passe admin (requis, pas de défaut) 
- `DATABASE_PATH` - Chemin de la BDD (défaut: ./data/mateclub.db)
- `PORT` - Port serveur (défaut: 3000, changeable si déjà utilisé)

## Règles d'accès

Chaque utilisateur peut configurer une **heure de mise à disposition** dans ses paramètres (défaut: 7h).

### Comportement des capsules

- **Capsules enregistrées AVANT l'heure de mise à dispo** → disponibles immédiatement (groupées dans "hier")
- **Capsules enregistrées APRÈS l'heure de mise à dispo** → verrouillées jusqu'au lendemain (groupées dans "aujourd'hui")

### Exemple (seuil = 7h)

| Enregistrée | Groupe | Disponible ? |
|-------------|--------|--------------|
| 6h30 | Hier | ✅ Oui |
| 7h00+ | Aujourd'hui | 🔒 Non (jusqu'à demain 7h) |

### Exception

- Les utilisateurs avec **super pouvoirs** (admin) voient toutes les capsules sans verrouillage

### Calendrier

- Le calendrier n'affiche que les jours avec au moins une capsule **disponible**
- Les jours verrouillés n'apparaissent pas dans le calendrier

## Interface

### Page d'accueil

- Liste des capsules par jour avec défilement horizontal
- Vignettes affichant : auteur, durée, indicateur de lecture
- Miniatures d'images cliquables (ouvre visionneuse plein écran)
- Liens URL en pastille bleue au-dessus des miniatures
- Indicateur "En cours" (vert) sous la durée
- Bordure blanche (non écouté) / transparente (écouté)
- Navigation tactile : swipe pour changer de capsule

### Page enregistrer

- Bouton d'enregistrement microphone
- Durée maximale : 3 minutes
- Zone pour ajouter une image
- Champ pour ajouter une URL (doit commencer par https://)
- Liste des enregistrements personnels avec :
  - Date, durée
  - Boutons : 🔗 (lien), ▶️ (lecture), 🗑️ (suppression)

### Page Settings

- Modification du pseudo
- Choix de l'avatar (emoji ou image)
- Configuration du fuseau horaire
- Réglage de l'heure de mise à disposition

### Panel Admin

- Liste des utilisateurs avec compteurs
- Création de nouveaux utilisateurs
- Modification de l'heure de seuil quotidien
- Attribution des super_powers
- Activation des logs de debug audio
- Activation du jingle d'intro

## Librairies externes

- **svelte** (^5.53.x) - Framework UI réactif
- **@sveltejs/kit** (^2.53.x) - Framework full-stack
- **@sveltejs/adapter-node** (^5.5.x) - Adapter Node.js pour production
- **better-sqlite3** (^12.6.x) - Base SQLite
- **bcrypt** (^6.0.x) - Hachage mots de passe
- **browser-image-compression** (^2.0.x) - Compression images
- **web-haptics** (^0.0.6) - Retour haptique mobile
- **vite** (^7.3.x) - Build tool
- **typescript** (^5.9.x) - Typage

## API Routes

### Auth
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Infos utilisateur

### Admin
- `POST /api/admin/users` - Créer utilisateur (admin)
- `DELETE /api/admin/users/:id` - Supprimer utilisateur (admin)
- `PATCH /api/admin/users/:id` - Modifier utilisateur (super_powers, logs, jingles, threshold)

### Enregistrements
- `GET /api/recordings` - Liste paginée des enregistrements
- `POST /api/recordings` - Uploader (audio + durée + option: image + url)
- `GET /api/recordings/:id` - Télécharger audio
- `DELETE /api/recordings/:id` - Supprimer un enregistrement
- `POST /api/recordings/:id/listened` - Marquer écouté
- `GET /api/recordings/mine` - Liste des enregistrements personnels
- `GET /api/recordings/dates` - Dates avec capsules (calendrier)
- `GET /api/recordings/by-date?date=YYYY-MM-DD` - Capsules d'un jour

## Journal des modifications

### v2.1.0 (2026-03-16)
- 🎵 Ajout jingle d'intro (activation via admin)
- 🔧 Amélioration lecture arrière-plan (technique audio guardian)
- 🔒 Pages d'erreur personnalisées (sécurité)
- 🚫 Désactivation source maps en production (sécurité)
- 🐛 Correction bug iOS Safari : cache partial response (206) non supporté
- 🐛 Correction logs générés même si désactivés (optimisation)

### v2.0.0 (2026-03-16)
- 🎉 Refonte majeure du player : lecture séquentielle
- ✨ Système de seuils par utilisateur
- ✨ Miniatures d'images sur les capsules
- ✨ Liens URL sur les enregistrements
- ✨ Compression automatique des images
- ✨ Pull-to-refresh avec désactivation sur modales
- ✨ Scroll lock sur les modales
- ✨ Haptique (vibration) au démarrage lecture
- ✨ Navigation tactile (swipe horizontal)
- ✨ Calendrier avec codes couleur
- ✨ Confirmation de suppression
- ✨ Format de dates localisé (sans année)
- ✨ Liste "Mes enregistrements" avec gestion
- 🐛 Correction : seuil quotidien stocké en minutes (420) vs heures (7)
- 🐛 Correction : comptage des non lus (propres vs autres)
- 🐛 Correction : durée Opus (utilisation duration_seconds DB)

### v1.1.0 (2026-03-13)
- ✨ Gestion des seuils de publication par utilisateur
- ✨ Page "Enregistrer" avec liste des enregistrements personnels
- ✨ Suppression de capsules personnelles avec confirmation
- ✨ Pull to refresh sur la page d'accueil
- ✨ Amélioration de l'UI admin (super pouvoirs)
- ✨ Zones de touch agrandies pour la navigation mobile

### v1.0.0 (2026-03-12)
- 🎉 Version initiale
