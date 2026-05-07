# 🧉 Maté Club

<div align="center">

<img src="static/icon-512x512.png" alt="Maté Club Logo" width="200">

![Status](https://img.shields.io/badge/Status-Beta-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.32.12-blue?style=for-the-badge)

</div>

✨ **Ce projet est une expérimentation de *vibe coding* de Guillaume Vendé, créateur du podcast [Tech Café](https://techcafe.fr)** ✨

🤝 **Soutenez-moi sur [patreon.com/techcafe](https://patreon.com/techcafe) : le premier niveau d'abonnement est gratuit !**

---

> ⚠️ **En cours de développement**
>
> Maté Club est actuellement en **phase beta**. L'application est utilisée en production par un petit groupe de testeurs mais est encore en développement actif.
>
> - Des bugs peuvent survenir
> - Des fonctionnalités peuvent changer
> - La structure de la base de données peut évoluer
>
> **Ce projet est partagé pour transparence et inspiration.** L'utilisation en production nécessite une configuration attentive.

## Description

Maté Club est une application web PWA permettant à un groupe d'amis d'enregistrer et partager des capsules audio quotidiennes. Chaque membre peut enregistrer des messages vocaux jusqu'à 3 minutes, avec possibilité d'ajouter une miniature image et un lien URL.

## Versioning

Ce projet suit [Semantic Versioning](https://semver.org/lang/fr/).

⚠️ **Changement majeur de versioning (2026-04-02)** : Nous sommes passés du système arbitraire 2.x à un versioning SemVer 0.x pour mieux refléter le statut beta du projet.

- **Versions 2.x** (précédentes) : Numérotation historique avant adoption de SemVer (mars-avril 2026)
- **Versions 0.x** (actuelles et futures) : Phase beta, API non stabilisée

## Branches & Contribution

### Structure

- **`main`** : Version stable actuelle (production) - Toujours déployable
- **`develop`** : Branche de développement, intégration des futures fonctionnalités

### Comment contribuer

⚠️ **IMPORTANT : Les Pull Requests doivent toujours cibler la branche `develop`, jamais `main` !**

**Workflow de contribution :**

1. **Fork** le repository (si contributeur externe) ou créer une branche depuis `develop`
2. **Développez** vos modifications sur votre branche
3. **Testez** localement (`npm run dev`, `npm run check`)
4. **Ouvrez une PR** vers la branche **`develop`**
   - Utilisez le template de PR fourni
   - Décrivez clairement vos changements
   - Cochez la case "Ma PR cible la branche `develop`"
5. **Attendez la review** et intégrez les retours si nécessaire
6. **Merge** une fois approuvée

**Pourquoi `develop` ?**
- La branche `main` est protégée et réservée aux releases stables
- Toutes les fonctionnalités sont intégrées et testées sur `develop` d'abord
- La branche `main` ne reçoit que des merges depuis `develop` (pas de commits directs)

**Exceptions** : Les hotfixes critiques de sécurité peuvent avoir une procédure spécifique.

## Fonctionnalités

### Audio & Lecture
- **Enregistrement audio** - Durée max 3 minutes avec compression WebM
- **Pause / reprise** - Une capsule peut être mise en pause puis reprise avant validation finale
- **Brouillons locaux** - Chaque capsule terminée est conservée localement pour pouvoir en enregistrer plusieurs avant l’envoi
- **Rail de brouillons** - Les capsules prêtes à envoyer sont pilotées depuis un rail horizontal compact avec une capsule active détaillée
- **Envoi groupé** - Une ou plusieurs capsules peuvent être envoyées d’un coup avec photo et URL propres à chacune
- **Progression d’upload** - Une barre indique l’avancement de l’envoi en cours, capsule par capsule
- **Alertes de fin d’enregistrement** - Un son et un retour haptique préviennent à 15, 10 et 5 secondes de la fin
- **Visualiseur rééquilibré** - Waveform d'enregistrement plus doux, plus bas et mieux réparti sur la voix
- **Compatibilité Safari renforcée** - Les capsules Android WebM/OGG sont converties côté serveur en AAC/M4A si nécessaire pour rester lisibles dans Safari
- **Streaming audio HTTP Range** - Les capsules répondent aux requêtes partielles `206 Partial Content` pour fiabiliser Safari/iOS et les longues lectures
- **Screen Wake Lock** - Anti-veille pendant l'enregistrement et l'écoute des capsules (empêche le smartphone de se verrouiller)
- **Player séquentiel** - Lecture automatique d'une capsule à la suivante
- **File "À écouter"** - Toutes les capsules non lues disponibles peuvent s'enchaîner dans une seule session de lecture
- **Jingle d'intro** - Jingle musical au début de la première capsule du jour (activable via admin)
- **Lecture arrière-plan** - Fonctionne smartphone verrouillé via technique "audio guardian"
- **Transitions non bloquantes** - L'enchaînement arrière-plan continue même si le navigateur suspend un événement de fin de `ding`
- **MediaSession API** - Contrôles lockscreen (play/pause/next/prev) avec reprise fiabilisée depuis le player de l'OS
- **Haptique** - Vibration au démarrage de la lecture
- **Déduplication SHA-256** - Détection des doublons basée sur le hash audio (seuil 30s)

### Médias
- **Miniatures** - Ajout d'images aux enregistrements (45x45px avec bordure)
- **Photo ajoutable après coup** - Une capsule des 24 dernières heures peut recevoir une image après publication si elle a été envoyée sans photo
- **Compression automatique** - Images compressées avant upload (~100KB)
- **Support HEIC/HEIF** - Conversion automatique des photos Apple (HEIC→JPEG)
- **Visionneuse plein écran** - Affichage des images en grand
- **Liens URL** - Possibilité d'ajouter un lien externe (https://)
- **Validation URL** - Vérification du format avec messages d'erreur contextuels

### Interface & UX
- **Authentification** - Login par pseudo/mot de passe (pas d'email requis)
- **PWA installable** - Installation sur mobile via manifest
- **Tuto PWA désactivable** - Chaque utilisateur peut masquer les popups d’installation PWA depuis ses réglages
- **Mise à jour rapide** - Un membre peut marquer en une fois toutes les publications existantes des autres utilisateurs comme lues
- **Pull-to-refresh** - Rechargement de la page d'accueil (désactivé sur modales)
- **Scroll lock** - Empêche le scroll arrière-plan quand une modale est ouverte
- **Navigation tactile** - Swipe horizontal pour changer de capsule
- **Calendrier interactif** - Navigation par date avec code couleur cohérent, y compris après `Charger plus`
- **Pastille "À écouter"** - Le résumé des capsules non lues ouvre une modale dédiée et lance immédiatement la lecture continue des capsules non lues
- **Cartouches plus lisibles** - Avatar, pseudo, horaire, durée et badge `nouveau` sont réorganisés pour mieux distinguer lu / non lu
- **Confirmation de suppression** - Modal avec countdown avant suppression
- **Brouillons restaurés** - Les capsules locales réapparaissent automatiquement si l’envoi a échoué ou a été interrompu
- **Fermetures uniformisées** - Les boutons de fermeture ronds utilisent désormais le même composant visuel
- **Durées plus naturelles** - Le mini-player et la pastille des non lus affichent des libellés `N secondes` / `N minutes et S secondes` / `N heures et M minutes`
- **Logs de debug** - Envoi automatique des erreurs côté client vers le serveur

### Système de seuils
- **Système de seuils** - Chaque utilisateur définit son heure de publication quotidienne
- **Super pouvoirs** - Rôle admin avec lecture anticipée (voir toutes les capsules sans attendre)
- **Timezone** - Fuseau horaire configurable par utilisateur

### Gestion des fuseaux horaires
L'application gère automatiquement les conversions de fuseaux horaires pour garantir une expérience cohérente pour tous les utilisateurs, quelle que soit leur localisation géographique.

**Architecture** :
- **Stockage** : Tous les timestamps sont enregistrés en **UTC** (Universal Coordinated Time)
- **Affichage** : Conversion automatique vers le fuseau horaire configuré par l'utilisateur
- **Seuil de déblocage** : Calculé selon l'heure locale de l'utilisateur qui consulte
- **Groupement par jour** : Les capsules sont regroupées par "jour logique" basé sur :
  1. L'heure locale de l'utilisateur qui consulte
  2. Le seuil horaire configuré (ex: 7h00)
  3. L'heure d'enregistrement convertie dans le fuseau de l'utilisateur

**Exemple** :
- Alice à Paris (UTC+2) publie à 8h30
- Bob à New York (UTC-4) consulte à 14h00 locales
- Alice voit sa capsule dans le groupe "aujourd'hui" à 8h30
- Bob voit la même capsule dans le groupe "aujourd'hui" à 2h30 (heure NY)
- Si Bob change son seuil à 11h, la capsule passe dans le groupe "hier" (car 2h30 < 11h)

### Panel Admin
- **Gestion des utilisateurs** - Liste, création, suppression des non-admins
- **Modification des seuils** - Heure de mise à disposition par utilisateur
- **Super pouvoirs** - Attribution de privileges de lecture anticipée
- **Promotion admin** - Un membre existant peut être promu administrateur
- **Retrait contrôlé du statut admin** - Un administrateur secondaire peut être repassé membre, mais l’admin le plus ancien reste protégé
- **Marquage non lu** - L'admin peut repasser les 5 dernières capsules d'autres utilisateurs en non lues pour ses propres tests
- **Nettoyage admin** - Une page dédiée permet de lister, écouter et supprimer les capsules de moins de 10 secondes avec filtres par auteur et date
- **Logs de debug** - Activation des logs audio / micro pour diagnostic, y compris pour un autre utilisateur
- **Jingle d'intro** - Activation/désactivation du jingle musical
- **Validation mobile clarifiée** - Les inscriptions en attente sont plus lisibles sur smartphone avec actions `Valider` / `Refuser` et la case `Admin` est respectée

### Sécurité & Technique
- **Headers de sécurité** - CSP, HSTS, X-Content-Type-Options, COOP, CORP
- **Validation des fichiers** - Vérification des magic numbers pour audio et images (évite les faux fichiers)
- **Transcodage serveur ciblé** - Conversion automatique des formats audio Android incompatibles Safari via `ffmpeg`
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

### Tests
- **Framework** : Vitest avec 68+ tests
- **Couverture** : Auth, DB, validation fichiers, path traversal
- **Commande** : `npm test` pour exécuter tous les tests

### Architecture
- **Composants extraits** : RecordingCard, ImageUpload, TeamList, Calendar (architecture modulaire < 300 lignes par fichier)
- **Streaming** : Téléchargement des fichiers audio/images via streams (pas de chargement mémoire complet)
- **Détection format audio** : Le serveur détecte le vrai format des capsules (WebM, MP4/M4A, OGG, MP3) avant stockage et lecture

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | SvelteKit 2.x |
| Base de données | SQLite (better-sqlite3) |
| Auth | Session cookie HTTPOnly |
| UI | Svelte 5 + CSS personnalisé |
| Build | Vite 7.x |
| Runtime | Node.js |
| Tests | Vitest 4.x |

## Architecture des composants

Le projet suit une architecture modulaire avec des composants Svelte de moins de 300 lignes pour faciliter la maintenance.

### Règles de développement RecordingCard

**IMPORTANT** : Pour assurer le bon fonctionnement du CSS des vignettes (notamment l'effet blur sur les vignettes verrouillées), les cartes d'enregistrement **doivent** utiliser le composant `RecordingCard.svelte` et non du code inline.

#### Pourquoi ?

Le composant `RecordingCard` utilise :
1. Une **variable CSS** (`--bg-image`) pour l'image de fond
2. Le pseudo-élément `::before` avec `background: inherit` pour flouter l'image
3. La classe `.with-bg` combinée à la variable CSS

Le CSS de floutage **ne fonctionne pas** avec les styles inline `style="background-image: url(...)"`.

#### Utilisation correcte

```svelte
<RecordingCard
  {recording}
  {index}
  available={day.available}
  {cardSwiped}
  {player}
  threshold={data.threshold}
  {isRecordingListened}
  {isCurrentPlaying}
  {isCurrentRecording}
  onplay={(i) => playFromRecording(day, i)}
  ontouchstart={handleCardTouchStart}
  ontouchend={(e) => handleCardTouchEnd(e, day, index)}
  onimageclick={(url) => selectedImageUrl = url}
  {formatTime}
  {formatDuration}
  {formatTimeSeconds}
/>
```

#### Ne PAS faire

```svelte
<!-- ❌ NE PAS faire : code inline avec style inline -->
<div 
  class="recording-card"
  class:locked={!day.available}
  style="background-image: url(/uploads/{image})"
>
  ...
</div>
```

Cela cassera l'effet de flou sur les vignettes verrouillées.

### Composants extraits

### Composants extraits

| Composant | Lignes | Description | Utilisé dans |
|-----------|--------|-------------|--------------|
| `RecordingCard.svelte` | 321 | Carte d'enregistrement (315×420px) avec styles encapsulés et blur | Page d'accueil (3 contexts) |
| `ImageUpload.svelte` | 232 | Upload image avec compression HEIC/JPEG et drag & drop | Page enregistrer |
| `TeamList.svelte` | 110 | Modal "La team" avec liste des utilisateurs | Page d'accueil |
| `Calendar.svelte` | 220 | Calendrier interactif avec navigation mensuelle | Page d'accueil |

### Bénéfices du refactoring

- **Maintenabilité** : Aucun fichier > 1300 lignes
- **Testabilité** : Composants isolés testables individuellement
- **Réutilisabilité** : RecordingCard utilisé dans 2 contextes différents
- **Aucune régression** : Styles 100% conservés

## Tests

Le projet utilise **Vitest** comme framework de test.

### Exécuter les tests

```bash
npm test        # Exécuter tous les tests
npm run test:watch  # Mode watch (re-exécute sur changements)
```

### Couverture actuelle

- **63 tests** passent en ~2 secondes
- **5 fichiers de test** couvrant :
  - Authentification (sessions, rate limiting)
  - Validation des entrées (fichiers, URL, durée)
  - Protection path traversal
  - Logique métier DB (utilisateurs, enregistrements)

### Fichiers de test

```
src/
├── lib/server/
│   ├── db.test.ts              # Rate limiting
│   ├── db.auth.test.ts         # Auth et sessions  
│   ├── db.business.test.ts     # Logique métier
│   ├── db.security.test.ts     # Validation sécurité
│   └── api.validation.test.ts # Validation API
└── routes/uploads/
    └── uploads.test.ts         # Path traversal
```

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

**Prérequis :** Docker et Docker Compose installés sur votre serveur.

#### Première installation

1. **Cloner le dépôt public :**
   ```bash
   git clone https://github.com/guillaumevende/mateclub.git
   cd mateclub
   ```

(modifier ORIGIN bien sur par le vrai domaine une fois en production)

2. **Créer le fichier `.env` :**
   ```bash
   echo "PORT=3001" > .env
   echo "BODY_SIZE_LIMIT=20M" >> .env
   echo "ORIGIN=http://localhost:3001" >> .env

   ```

3. **Créer les dossiers de données :**
   ```bash
   mkdir -p data uploads
   ```

4. **Lancer avec Docker Compose :**
   ```bash
   docker compose up -d
   ```

**Au premier lancement :**
1. Allez sur http://localhost:3001
2. Vous serez redirigé vers `/setup`
3. Créez votre compte administrateur
4. Après création, utilisez `/login` pour vous connecter

#### Mise à jour

Pour mettre à jour l'application avec la dernière version :

```bash
cd mateclub
git pull origin main
docker compose up -d --build
```

**Note :** Le flag `--build` force la reconstruction de l'image Docker si des changements de code sont détectés. Sans ce flag, Docker utiliserait l'ancienne image en cache.

#### Remise à zéro

Pour réinitialiser complètement une instance (supprimer toutes les données, utilisateurs, enregistrements) :

**Docker :**
```bash
docker compose down

rm -rf data/ uploads/

mkdir -p data uploads

docker compose up -d
```

**Manuel :**
```bash
rm -rf data/ uploads/

mkdir -p data uploads

npm run build && npm run start
```

**Attention :** Cette opération supprime définitivement :
- La base de données SQLite (`data/mateclub.db`)
- Tous les fichiers audio et images (`uploads/`)

Après reset, l'application affichera `/setup` pour créer un nouvel administrateur.

#### Configuration avancée

Variables d'environnement disponibles dans `.env`:
- `PORT` - Port serveur (défaut: 3001)
- `DATABASE_PATH` - Chemin de la BDD (défaut: ./data/mateclub.db)

### Manuel

**⚠️ Important :** Pour les installations sans Docker, vous devez définir `BODY_SIZE_LIMIT=20M` pour permettre l'upload des fichiers audio (3 min max) et images. Sans cela, les uploads > 1 Mo échoueront.

```bash
# Définir la variable d'environnement (obligatoire)
export BODY_SIZE_LIMIT=20M

# Build et lancement
npm run build
npm run start
```

Ou créer un fichier `.env` :
```bash
echo "BODY_SIZE_LIMIT=20M" > .env
echo "PORT=3001" >> .env
echo "ORIGIN=http://localhost:3001" >> .env
```

Aller sur http://localhost:3001

### Reverse Proxy (Caddy)

Pour déployer derrière Caddy avec HTTPS :

**Caddyfile avec headers de sécurité recommandés :**
```caddyfile
VOTRE_DOMAINE {
    reverse_proxy localhost:3001

    # Headers de sécurité
    header {
        # HSTS - 1 an, sous-domaines
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Protection clickjacking
        X-Frame-Options "DENY"
        
        # Anti-MIME sniffing
        X-Content-Type-Options "nosniff"
        
        # Referrer Policy
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Permissions
        Permissions-Policy "interest-cohort=()"
        
        # CSP (optionnel - déjà géré par l'app)
        # Content-Security-Policy "default-src 'self'; ..."
    }
}
```

**Note importante** : Si Caddy est déjà installé dans un conteneur Docker séparé (pas dans le même docker-compose que Maté Club), utilisez l'IP de l'hôte au lieu de `localhost` :

```caddyfile
VOTRE_DOMAINE {
    reverse_proxy 10.0.0.74:3001  # Remplacez par l'IP de votre serveur

    # Headers de sécurité
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "interest-cohort=()"
    }
}
```

Pour trouver l'IP de votre serveur sur le réseau local :
```bash
ip route | grep default | awk '{print $3}'
```

**Avec Docker Compose et Caddy :**
```yaml
version: '3.8'

services:
  mateclub:
    build: .
    ports:
      - "3001:3001"
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
- `PORT` - Port serveur (défaut: 3001, changeable si déjà utilisé)
- `DATABASE_PATH` - Chemin de la BDD (défaut: ./data/mateclub.db)
- `BODY_SIZE_LIMIT` - Taille max des requêtes HTTP en bytes (défaut: 512KB, recommandé: 20M pour audio 3min + image)

### BODY_SIZE_LIMIT (important)

Pour allow sending audio recordings up to 3 minutes with images, vous devez configurer cette variable:

```yaml
# docker-compose.yml
environment:
  - BODY_SIZE_LIMIT=20M
```

Formats supportés:
- Bytes: `BODY_SIZE_LIMIT=20971520`
- Suffixes: `BODY_SIZE_LIMIT=20M` (20 megabytes), `BODY_SIZE_LIMIT=1G`

Sans cette configuration, les enregistrements de plus de ~60 secondes seront rejetés avec l'erreur "Payload Too Large".

**Note** : Aucun compte administrateur à configurer - le premier admin est créé via `/setup` au premier lancement de l'application.

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
- Promotion d'un utilisateur existant en admin
- Retrait du statut admin pour un administrateur secondaire, avec protection de l'admin le plus ancien
- Attribution des super_powers
- Marquage des 5 dernières capsules d'autres utilisateurs comme non lues pour l'admin connecté
- Nettoyage des capsules de moins de 10 secondes avec lecture, suppression et filtres auteur/date
- Activation des logs de debug audio / micro, y compris pour un autre utilisateur
- Activation du jingle d'intro

## Librairies externes

- **svelte** (^5.53.x) - Framework UI réactif
- **@sveltejs/kit** (^2.53.x) - Framework full-stack
- **@sveltejs/adapter-node** (^5.5.x) - Adapter Node.js pour production
- **better-sqlite3** (^12.6.x) - Base SQLite
- **bcrypt** (^6.0.x) - Hachage mots de passe
- **browser-image-compression** (^2.0.x) - Compression images
- **sharp** (^0.34.x) - Conversion d'images (HEIC→JPEG)
- **web-haptics** (^0.0.6) - Retour haptique mobile
- **@khmyznikov/pwa-install** (^0.6.x) - Dialog d'installation PWA
- **vite** (^8.x) - Build tool
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

### Debug
- `POST /api/debug` - Logging automatique des erreurs côté client

## Journal des modifications

### v2.7.1 (2026-04-02)

#### ✨ Nouvelles fonctionnalités
- **Sons de fin de capsule** : Ding.mp3 (après chaque capsule) et Doudoudou.mp3 (dernière capsule du jour)
- **Installation PWA facilitée** : Composant @khmyznikov/pwa-install avec dialog d'installation
- **Visualiseur audio** : 8 barres verticales animées pendant l'enregistrement
- **Navigation améliorée** : Clic sur date dans FloatingPlayer pour scroller vers le jour

#### 🐛 Corrections de bugs
- **Stabilité enregistrement** : Timeout 5s pour appareils lents, indicateur "Finalisation..."
- **Accessibilité (A11y)** : Tous les composants avec attributs ARIA, navigation clavier complète
- **API** : Renommage endpoint `/listen` → `/listened`

#### 🔧 Migrations
- Migration fuseau horaire (CRITIQUE) : Conversion CEST → UTC
- Ajout colonne last_login

### v2.7.0 (2026-04-01)

#### ✨ Fonctionnalités
- Sons de fin de capsule (Ding/Doudoudou)
- Installation PWA facilitée
- Visualiseur audio

#### 🐛 Corrections
- Stabilité enregistrement
- Accessibilité complète
- API endpoint renommé

### v2.6.1 (2026-03-31)

#### 🐛 Corrections de bugs critiques
- **Gestion des fuseaux horaires** : Migration timestamps CEST → UTC, résolution décalage 2h

### v2.6.0 (2026-03-29)

#### 🎨 Nouvelle identité visuelle
- Régénération de tous les assets (logo, favicons, icônes PWA)
- Nettoyage fichiers obsolètes

### v2.5.0-beta (2026-03-27)

#### ✨ Système d'inscription Beta
- Page d'inscription publique avec formulaire sécurisé
- Toggle inscriptions dans le panel admin
- Liste et validation des demandes d'inscription

#### 🐛 Corrections
- Fix noms de mois dans le calendrier
- Fix bouton "Charger plus"

### v2.4.7 (2026-03-23)

#### 🐛 Corrections
- Fix preview HEIC sur page enregistrement
- Fix vignettes "Aujourd'hui" avec RecordingCard

### v2.4.6 (2026-03-23)

#### ✨ Améliorations
- Affichage version dans Settings et Login (synchronisé depuis package.json)
- Fix calendrier page 2+
- Fix chemins fichiers uploads

### v2.4.5 (2026-03-23)

#### 🐛 Corrections vignettes
- Fix rendu vignettes verrouillées (CSS blur)
- Fix dimensions et effet blur

### v2.4.4 (2026-03-23)

#### 🔧 Infrastructure
- Fix BODY_SIZE_LIMIT à 20M dans docker-compose.yml
- Documentation installation manuelle

### v2.4.3 (2026-03-22) - Corrections de sécurité et refactoring

#### 🔒 Sécurité (issues #9-#13)
- **#9** : Suppression mot de passe admin par défaut (devient obligatoire)
- **#10** : Validation mot de passe 12+ caractères sur API admin
- **#11** : Masquage erreurs techniques dans réponses API
- **#12** : Renforcement CSP (suppression `https://*` et `unsafe-eval`)
- **#13** : Correction réinitialisation avatar en base après suppression

#### ♻️ Refactoring (#19)
- Extraction 4 composants Svelte : RecordingCard, ImageUpload, TeamList, Calendar
- Réduction -707 lignes (+page.svelte : 1848→1277, record/+page.svelte : 1408→1272)

#### 🧪 Tests (#17)
- Ajout 60 tests (total 63) : auth, validation, path traversal

#### 🧹 Hygiène (#16, #18, #20)
- Suppression fichiers backup trackés
- Debug utility pour logs conditionnels (0 log en prod)
- Correction Docker : port uniformisé à 3001

### v2.3.1 (2026-03-18)
- 🔧 **Fix iOS Safari : timeout 60s avec AbortController** sur les requêtes fetch
- 🔧 **Fix iOS Safari : messages d'erreur distincts** (timeout réseau vs erreur serveur)
- 🔧 **Fix : reset() efface maintenant l'état d'erreur**
- ✨ **UX : demande proactive du microphone** avec message explicatif avant le prompt iOS
- ✨ **UX : message spécifique si microphone refusé**

### v2.3.0 (2026-03-18)
- 🔧 **Fix pagination : correction offset dans "Mes enregistrements"** (incrémenté de 10 au lieu de 5)
- 🐛 **Fix déduplication : hash SHA-256 au lieu de durée** (évite les faux positifs sur audio court)
- ✨ **Support HEIC/HEIF : conversion automatique via sharp** (photos Apple supportées)
- ✅ **Validation images : vérification MIME type + magic numbers côté client et serveur**
- ✅ **Validation URL : messages d'erreur contextuels** (aide l'utilisateur à corriger)
- ✅ **États d'erreur séparés : urlError ( bloque) vs imageWarning (avertit)**
- ✅ **UI de succès : boutons "Enregistrer un autre" et "Aller à l'accueil"** (plus de redirect automatique)
- 🔒 **Debug endpoint : /api/debug** (logging automatique des erreurs côté client)
- 📦 **Nouvelle dépendance : sharp** (conversion HEIC→JPEG côté serveur)

### v2.2.2 (2026-03-17)
- 🔒 **Security : ajout headers de sécurité**
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Content-Type-Options
  - Cross-Origin-Opener-Policy (protection Spectre)
  - Cross-Origin-Resource-Policy (protection Spectre)
- 🔒 **Security : handler favicon avec Content-Type explicite**

### v2.2.1 (2026-03-17)
- 🔧 **Fix player audio : correction débordement curseur sur fichiers courts**
  - Plafonnement de la progression à 100% maximum
  - Ajout de `overflow: hidden` sur la barre de progression
  - Calcul ajusté de la position du curseur pour rester dans les limites

### v2.2.0 (2026-03-17)
- 📱 Fix iOS : accès à la bibliothèque photos (suppression attribut capture)
- 🔧 Fix logout : correction suppression cookie avec bonnes options
- 🔧 Fix logout : gestion d'erreurs pour éviter erreur 500
- 🔧 Fix envoi : désactivation web workers compression image en PWA
- 📜 **Changement de licence : MIT → AGPL-3.0**
- ✅ **Admin : validation mot de passe 12+ caractères avec messages d'erreur contextuels**
- ✅ **Admin : affichage des erreurs sous les champs correspondants (pseudo/password)**
- ✅ **Admin : confirmation "Utilisateur créé avec succès" après création**
- 🔧 **Fix avatars : correction décalage visuel sur les avatars chevauchés**
- 🔧 **Avatar : suppression double bordure (composant + conteneur)**
- 🔧 **UX : margin-left ajusté de -15px à -17px pour compenser les bordures**

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

## Accessibilité (A11y)

### Bonnes pratiques implémentées

Tous les composants interactifs suivent les standards d'accessibilité WCAG :

#### Éléments cliquables
- **Attributs ARIA** : `role="button"` pour les divs interactives
- **Navigation clavier** : `tabindex="0"` pour la tabulation
- **Gestionnaires d'événements** : `onkeydown` pour Enter et Espace
- **Labels** : `aria-label` descriptif pour les lecteurs d'écran

#### Modales et overlays
- **Overlay** : `role="button"`, `tabindex="0"`, fermeture avec Échap
- **Modale** : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pour le titre
- **Fermeture clavier** : Échap ferme la modale

#### Grilles interactives
- **Grid** : `role="grid"`, `tabindex="0"` pour la navigation
- **Cellules** : `role="gridcell"` ou `role="button"` selon l'interactivité
- **Focus** : `tabindex` conditionnel (0 si interactif, undefined sinon)

### Composants corrigés

| Composant | Corrections |
|-----------|-------------|
| `FloatingPlayer.svelte` | Date cliquable avec role, tabindex, onkeydown, aria-label ; progress-track avec navigation flèches ; z-index augmenté à 100 |
| `TeamList.svelte` | Overlay et modale avec gestionnaires clavier, attributs ARIA, tabindex="-1" sur dialog |
| `ImageViewer.svelte` | Overlay avec onkeydown, alt text vide (éviter redondance) |
| `Calendar.svelte` | Grid avec onkeydown, cellules séparées interactives/non-interactives avec {#if} |
| `+page.svelte` | Container avec role="application", modales avec attributs ARIA complets, cardSwiped réactive |

### Vérification

Les warnings Svelte a11y sont surveillés lors du développement. En cas d'apparition de nouveaux warnings :

1. Ajouter `role` approprié aux éléments interactifs
2. Ajouter `tabindex="0"` pour la navigation au clavier
3. Implémenter `onkeydown` pour Enter/Espace
4. Ajouter `aria-label` descriptif
5. Utiliser `aria-labelledby` pour lier les titres aux modales
