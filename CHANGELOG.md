# CHANGELOG - MateClub

---

## v2.4.7 (2026-03-23)

### Corrections et améliorations

#### Interface - Enregistrement
- [x] **Fix preview HEIC** : Correction de l'affichage des images HEIC sur la page "Enregistrer" (Chrome/Edge : pas de preview + message, Safari/iOS : preview fonctionnelle)

#### Vignettes d'enregistrements
- [x] **Fix vignettes aujourd'hui** : Remplacement du code inline par le composant `RecordingCard` pour la section "Aujourd'hui" (assure la cohérence du CSS blur pour les vignettes verrouillées)
- [x] **Documentation RecordingCard** : Ajout de règles de développement dans le README pour éviter la régression

#### Dépendances
- [x] **Mises à jour Dependabot** : sharp 0.34.5, vite 8.0.1, @sveltejs/vite-plugin-svelte 7.0.0

---

## v2.4.6 (2026-03-23)

### Corrections et améliorations

#### Interface - Paramètres
- [x] **Affichage version** : Numéro de version de l'application affiché en bas de la page "Réglages" (texte discret blanc)
- [x] **Affichage version login** : Numéro de version également visible sur la page d'identification
- [x] **Automatisation** : Version synchronisée automatiquement depuis `package.json` sans intervention manuelle
- [x] **Espacement réduit** : Moins d'espace entre le bouton Déconnexion et la version

#### Interface - Calendrier
- [x] **Fix calendrier page 2+** : Chargement automatique des données du calendrier quand on accède directement à une page >= 2
- [x] **Fix affichage calendrier** : Les cellules du calendrier s'affichent correctement avec les jours et les capsules

#### Correction chemins de fichiers
- [x] **Fix répertoire uploads** : Déplacement des fichiers audio de `uploads/recordings/` vers `uploads/` (correspondance avec les chemins en base)
- [x] **Fix images 404** : Correction du chemin des images de test

#### Données de test
- [x] **Ajout capsules de test** : 3 capsules fonctionnelles pour les dates historiques :
  - **28 janvier 2026** : Audio 8 secondes (bip) + image bleue
  - **1er février 2026** : Audio 12 secondes (bip) + image verte  
  - **27 février 2026** : Audio 15 secondes (bip) + image orange

---

## v2.4.5 (2026-03-23)

### Corrections d'interface

#### Vignettes verrouillées
- [x] **Fix rendu vignettes verrouillées** : Correction du CSS pour l'affichage des capsules avant l'heure de déblocage
- [x] **Fix effet blur** : L'image de fond est maintenant correctement floutée grâce à l'utilisation d'une variable CSS (--bg-image) au lieu du style inline
- [x] **Fix dimensions** : La carte respecte à nouveau sa taille définie (315px × 420px minimum)
- [x] **Refactoring CSS** : Déplacement du background-image dans une classe `.with-bg` pour une meilleure maintenabilité

---

## v2.4.4 (2026-03-23)

### Infrastructure
- [x] **Fix BODY_SIZE_LIMIT** : Retour de la limite à 20M dans `docker-compose.yml` pour les uploads audio/images
- [x] **Documentation installation manuelle** : Ajout de la mention `BODY_SIZE_LIMIT=20M` obligatoire pour les installations sans Docker

---

## v2.4.3 (2026-03-23)

### Corrections de bugs

#### Avatar & Upload HEIC
- [x] **Fix upload HEIC** : Conversion automatique HEIC→JPEG via Sharp avec libvips
- [x] **Preview HEIC adaptative** : Preview visible sur Safari/iOS, masquée sur Chrome/Edge (image cassée)
- [x] **Message confirmation** : "✓ Image sélectionnée - Sauvegardez pour valider" quand pas de preview
- [x] **Bouton annuler** : Permet d'annuler la sélection d'image avant sauvegarde
- [x] **Rechargement page** : Scroll en haut + reload après sauvegarde réussie pour voir le nouvel avatar

#### Formulaires
- [x] **Fix champ pseudo** : Binding corrigé, le pseudo ne se vide plus quand on sélectionne une image
- [x] **Fix bouton création admin** : Désactivation pendant le traitement + style visuel + texte "Création..."

#### Sécurité & UX
- [x] **Fix CSRF token** : Les tokens ne sont plus consommés après une erreur, permettant de corriger et resoumettre
- [x] **Validation magic numbers HEIC** : Ajout des signatures HEIC/HEIF dans `fileValidation.ts`
>>>>>>> origin/main

### 🔒 Corrections de sécurité majeures

#### [CRITIQUE] Mot de passe admin par défaut (#9)
- **Problème** : Le script `init-admin.mjs` utilisait un mot de passe par défaut `admin123` si `ADMIN_PASSWORD` non définie
- **Impact** : Toute instance sans variable d'environnement exposée avec le même mot de passe
- **Correction** : 
  - `ADMIN_PASSWORD` devient obligatoire (pas de fallback)
  - Validation longueur minimale (12 caractères)
  - Suppression du log du mot de passe en clair
- **Commit** : `9cf4dac`

#### [HAUTE] Validation mot de passe API admin (#10)
- **Problème** : L'API `POST /api/admin/users` ne validait pas la longueur du mot de passe (contrairement à la form action)
- **Correction** : Ajout validation `password.length >= 12` avec message d'erreur explicite
- **Commit** : `228626b`

#### [HAUTE] CSP trop permissive (#12)
- **Problème** : `connect-src 'self' https://*` permettait exfiltration de données vers n'importe quel domaine HTTPS
- **Problème** : `unsafe-eval` dans `script-src` autorisait `eval()` et `Function()`
- **Correction** :
  - `connect-src 'self'` uniquement (connexions same-origin)
  - Suppression de `unsafe-eval`
- **Commit** : `08a6d79`

#### [MOYENNE] Fuite d'information dans les réponses d'erreur (#11)
- **Problème** : Les endpoints API exposaient `error.message` dans les réponses JSON (chemins, stack trace)
- **Fichiers concernés** : `recordings/+server.ts`, `recordings/dates/+server.ts`
- **Correction** : Messages génériques côté client (`"Erreur interne"`), détails loggés côté serveur
- **Commit** : `4c2a75a`

#### [MOYENNE] Avatar DELETE ne réinitialise pas la DB (#13)
- **Problème** : Suppression du fichier image mais pas mise à jour de la base de données
- **Impact** : Pointeur vers fichier inexistant (404 sur les avatars supprimés)
- **Correction** : Appel `updateUserAvatarImage(userId, '☕')` après suppression du fichier
- **Commit** : `9b7856e`

### 🐛 Corrections de bugs

#### [MOYENNE] Pagination - Bouton "Charger plus" manquant (#15 bis)
- **Problème** : La logique `hasMore` vérifiait le nombre de jours groupés, pas le nombre d'enregistrements
- **Correction** : `hasMore = results.length >= (limit + 1) * 3`
- **Commit** : `083545c`

### ♻️ Refactoring - God Components (#19)

#### Extraction de composants Svelte
Réduction de la taille des fichiers `+page.svelte` (1848 → 1277 lignes) et `record/+page.svelte` (1408 → 1272 lignes)

| Composant | Lignes | Description | Utilisé dans |
|-----------|--------|-------------|--------------|
| `RecordingCard.svelte` | 345 | Carte d'enregistrement avec styles encapsulés | `+page.svelte` (×2) |
| `ImageUpload.svelte` | 232 | Upload image avec compression HEIC/JPEG | `record/+page.svelte` |
| `TeamList.svelte` | 110 | Modal "La team" avec liste utilisateurs | `+page.svelte` |
| `Calendar.svelte` | 220 | Calendrier interactif mensuel | `+page.svelte` |

**Bénéfices** :
- Meilleure maintenabilité (< 300 lignes par composant)
- Réutilisabilité (RecordingCard utilisé dans 2 contextes)
- Testabilité améliorée
- Aucune régression visuelle (styles 100% conservés)

**Commits** : `3eac8f6`, `34a8be6`

### 🧪 Tests - Framework et couverture (#17)

#### Installation du framework de test
- **Framework** : Vitest (déjà présent mais non configuré)
- **Commande** : `npm test` (exécute 63 tests)

#### Nouveaux tests ajoutés
- `db.security.test.ts` (15 tests) : Validation mot de passe, pseudo, fonctions utilisateur
- `api.validation.test.ts` (25 tests) : Validation buffer audio/image, URL, durée, mot de passe
- `uploads.test.ts` (9 tests) : Protection path traversal
- `db.auth.test.ts` (6 tests) : Sessions et rate limiting
- `db.business.test.ts` (5 tests) : Logique métier recordings

**Couverture totale** : 63 tests passent en ~2s

**Commit** : `da9b192`

### 🔧 Qualité - Console logs de debug (#18)

#### Problème
71 `console.log`/`console.error`/`console.warn` dans le code source, dont :
- Logs verbeux de debug en production
- Exposition potentielle de chemins internes

#### Solution
- Création de `src/lib/debug.ts` avec flag `isDev = process.env.NODE_ENV !== 'production'`
- Remplacement des `console.log` par `debug.*` (silencieux en prod)
- Conservation des `console.error` légitimes pour les vraies erreurs

**Réduction** : 71 → 0 logs de debug en production

**Commit** : `dda83e1`

### 🧹 Hygiène - Fichiers de backup (#16)

#### Suppression des fichiers de backup trackés
- `src/routes/+page.svelte.pre-refactor` (957 lignes)

#### Mise à jour .gitignore
- Ajout `*.backup` et `*.pre-refactor`

**Commit** : `1c66f96`

### 🐳 Docker - Cohérence configuration (#20)

#### Problèmes corrigés
1. **Port incohérent** : Dockerfile exposait 3000, docker-compose mappait sur 3001
2. **Version obsolète** : `version: '3.8'` ignoré depuis Docker Compose v2
3. **Script dupliqué** : `scripts/init-admin.ts` (code mort, alias `$lib` non résolvable)

#### Corrections
- **Dockerfile** : Port uniformisé à 3001
- **docker-compose.yml** : Suppression champ `version`
- **Scripts** : Suppression `init-admin.ts`

**Commit** : `118caca`

### 📊 Statistiques du refactoring

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| `+page.svelte` | 1848 lignes | 1277 lignes | -571 lignes |
| `record/+page.svelte` | 1408 lignes | 1272 lignes | -136 lignes |
| **Total lignes** | 3256 | 2549 | **-707 lignes** |
| Tests | 3 | 63 | +60 tests |
| Composants extraits | 0 | 4 | +4 composants |
>>>>>>> origin/main

---

## v2.4.2 (2026-03-20)

### Corrections de sécurité

#### Vulnérabilités critiques corrigées
- [x] **C1 - Path Traversal avatars** : Ajout vérification auth + validation path sur `/uploads/avatars/[[path]]`
- [x] **C2 - Path Traversal uploads** : Ajout validation `normalize()` + `startsWith()` sur `/uploads/[...file]`
- [x] **C3 - Bug localDate undefined** : Correction typo → `effectiveDate` (le calendrier était cassé)

#### Vulnérabilités hautes corrigées
- [x] **H2 - Form actions admin** : Ajout vérification `is_admin` sur actions `delete` et `updateHour`
- [x] **H3 - Connexion DB dupliquée** : Utilisation de l'instance DB centralisée

#### Améliorations sécurité
- [x] **M3 - Fuite d'information** : Messages d'erreur génériques (pas de stack trace)
- [x] **M7 - .gitignore** : Exclusion des fichiers `*.db`, `data.db`, `src/data/`

---

## v2.4.1 (2026-03-20)

### Corrections de bugs

- [x] **Fermeture auto du player** : Le player modal se ferme automatiquement au démarrage de l'enregistrement
- [x] **Fix timer 3 minutes** : Correction de l'arrêt automatique à 3 minutes avec flag anti-récursion

---

## v2.4.0 (2026-03-20)

### Nouvelles fonctionnalités

#### Screen Wake Lock API
- [x] **Anti-veille pendant l'enregistrement** : Empêche le smartphone de se verrouiller
- [x] Badge orange "Laissez cet écran actif durant l'enregistrement"
- [x] Support iOS Safari 16.4+ et navigateurs modernes
- [x] Gestion gracieuse si l'API échoue (batterie faible, préférences utilisateur)
- [x] Réacquisition automatique du lock après changement de visibilité

### Notes techniques
- API Wake Lock disponible uniquement en contexte sécurisé (HTTPS)
- Fallback silencieux si non supporté (pas d'erreur pour l'utilisateur)

---

## v2.3.1 (2026-03-18)
**Date**: 2026-03-18

### Corrections de bugs iOS Safari

- [x] **Timeout fetch** : Ajout d'un AbortController avec timeout de 60 secondes
  - Évite les requêtes infiniment bloquantes sur mobile
  - Annulation propre via `controller.abort()`

- [x] **Messages d'erreur améliorés** : Distinction entre erreur réseau et erreur serveur
  - Timeout → "La connexion a mis trop de temps. Vérifiez votre réseau et réessayez."
  - Erreur serveur → Message original du serveur

- [x] **Fix reset()** : La fonction réinitialise maintenant l'état `error`
  - Le message d'erreur ne persiste plus après "Recommencer"

### Améliorations UX microphone

- [x] **Demande proactive** : Message explicatif AVANT le prompt natif iOS
  - "Pour enregistrer un message vocal, j'ai besoin d'accéder à votre microphone."
  - Bouton "Autoriser le micro"

- [x] **État denied** : Message d'aide si permission refusée
  - Explique comment activer le micro dans les paramètres

---

## v2.3.0 (2026-03-18)

### Corrections de bugs

- [x] **Pagination "Mes enregistrements"** : correction de l'offset (10→5 éléments par chargement)
- [x] **Déduplication audio** : passage de la détection par durée à SHA-256 hash
  - Évite les faux positifs sur les audios courts (< 5s)
  - Seuil de 30 secondes pour la similarité temporelle
  - Stockage du hash en base de données

### Nouvelles fonctionnalités

#### Support HEIC/HEIF
- [x] Conversion automatique côté serveur via sharp
- [x] Photos Apple (iPhone) maintenant supportées
- [x] Fallback sur compression côté client si sharp échoue

#### Validation
- [x] Validation des images côté client (MIME type + magic numbers)
- [x] Validation des images côté serveur (magic numbers)
- [x] Validation URL avec messages d'erreur contextuels
- [x] États d'erreur séparés : `urlError` ( bloque l'envoi) vs `imageWarning` (avertit sans bloquer)

#### Interface
- [x] **UI de succès repensée** : plus de redirect automatique
- [x] Deux boutons : "Enregistrer un autre" et "Aller à l'accueil"
- [x] Animation fadeIn pour le conteneur de succès
- [x] Option `stayOnPage()` pour réinitialiser le formulaire

#### Debug & Diagnostic
- [x] Endpoint `/api/debug` pour le logging automatique des erreurs
- [x] Capture côté client : type d'erreur, message, contexte
- [x] Stockage serveur pour analyse post-mortem

### Librairies ajoutées
- sharp (^0.33.x) - Conversion d'images HEIC→JPEG

---

## v1.1.0 (2026-03-13)
- ✨ Gestion des seuils de publication par utilisateur
- ✨ Page "Enregistrer" avec liste des enregistrements personnels
- ✨ Suppression de capsules personnelles avec confirmation
- ✨ Pull to refresh sur la page d'accueil
- ✨ Amélioration de l'UI admin (super pouvoirs)
- ✨ Zones de touch agrandies pour la navigation mobile

---

## v1.0.0 (2026-03-12)
- 🎉 Version initiale

---

## Déploiement

```bash
cd mateclub
npm run build
npm run start
```

ou via Docker:
```bash
docker-compose up -d
```
