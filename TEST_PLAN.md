# Plan de Test - Maté Club

## Vue d'ensemble

Ce document couvre les plans de test pour :
1. **Tests fonctionnels iOS Safari** (envoi audio)
2. **Tests de sécurité** (vulnérabilités corrigées)
3. **Tests des composants** (nouveau refactoring)
4. **Diagnostic microphone iOS/PWA** (admin uniquement)

---

## 1. Tests de sécurité

### Vulnérabilités critiques

#### [#9] Mot de passe admin obligatoire
```
Test : Lancer init-admin sans ADMIN_PASSWORD
Attendu : Message d'erreur explicite, exit code 1
Vérifier : Pas de création avec mot de passe par défaut
```

#### [#10] Validation API admin
```
Test : POST /api/admin/users avec mot de passe < 12 caractères
Attendu : 400 Bad Request, message "12 caractères minimum"
```

#### [#11] Fuite d'information API
```
Test : Provoquer une erreur serveur sur /api/recordings
Attendu : Réponse {"error": "Erreur interne"} (pas de stack trace)
Vérifier : Les détails sont loggés côté serveur uniquement
```

#### [#12] CSP renforcée
```
Test : Vérifier headers sur réponse HTTP
Attendu : connect-src 'self' uniquement (pas de https://*)
Attendu : Pas de unsafe-eval dans script-src
```

#### [#13] Réinitialisation avatar
```
Test : Supprimer avatar via API
Attendu : Fichier supprimé du disque
Attendu : Base de données mise à jour (retour à ☕)
Vérifier : Pas de 404 sur prochaine requête avatar
```

---

## 2. Tests des composants

### Composants extraits (Issue #19)

#### RecordingCard.svelte
```
Tests visuels :
- ✅ Dimensions exactes : 315px × 420px min
- ✅ Overlay sombre avec opacité correcte
- ✅ Pastille URL bien visible (bleu, fond semi-transparent)
- ✅ Bordure blanche pour non-écouté / verte pour lecture en cours
- ✅ Affichage durée en grand (2rem)
- ✅ Miniature image 45×45px avec bordure

Tests fonctionnels :
- ✅ Click lance la lecture
- ✅ Swipe horizontal change de capsule
- ✅ Image cliquable ouvre visionneuse
- ✅ Lien URL cliquable (nouvel onglet)
```

#### ImageUpload.svelte
```
Tests fonctionnels :
- ✅ Drag & drop fonctionnel
- ✅ Compression automatique JPEG/PNG (< 1Mo)
- ✅ Support HEIC/HEIF (conversion serveur)
- ✅ Barre de progression de compression
- ✅ Bouton suppression réinitialise l'upload

Tests erreurs :
- ✅ Format invalide affiche warning
- ✅ Erreur compression affiche message
```

#### TeamList.svelte
```
Tests UI :
- ✅ Bouton 👥 en haut à droite du header
- ✅ Modal s'affiche au click
- ✅ Liste défilable si > 10 utilisateurs
- ✅ Croix fermeture fonctionnelle
- ✅ Click overlay ferme la modal

Tests données :
- ✅ Affichage pseudo + compteur capsules
- ✅ Avatar affiché correctement
```

#### Calendar.svelte
```
Tests affichage :
- ✅ Grille 7 jours (Lu-Di)
- ✅ Jours sans recordings grisés
- ✅ Jours avec recordings cliquables
- ✅ Jour courant avec bordure rouge
- ✅ Jours non lus en rouge

Tests navigation :
- ✅ Click sur jour avec recordings charge les capsules
- ✅ Défilement horizontal entre mois
- ✅ Affichage nom mois + année
```

---

## 3. Tests fonctionnels iOS Safari (Envoi Audio)

### Objectif
Identifier la cause des erreurs d'envoi "Erreur lors de l'envoi" intermittentes sur iOS Safari.

### Scénarios de Test

### Groupe A : Tests sans image

| # | Durée audio | Source micro | Description |
|---|------------|--------------|-------------|
| A1 | Courte (< 5s) | Direct | Enregistrer 3s, envoyer immédiatement |
| A2 | Moyenne (10-20s) | Direct | Enregistrer 15s, envoyer |
| A3 | Longue (60-90s) | Direct | Enregistrer 1min, envoyer |
| A4 | Multiple rapide | Direct | Envoyer A1, puis A2 rapidement (5s d'intervalle) |
| A5 | Multi 2e envoi | Direct | A1 → succès → A2 immédiatement |

### Groupe B : Tests avec image (bibliothèque iOS)

| # | Durée audio | Source image | Description |
|---|------------|--------------|-------------|
| B1 | Courte | Bibliothèque > Photos récentes | Photo JPEG recente |
| B2 | Courte | Bibliothèque > Ancienne | Photo JPEG ancienne |
| B3 | Moyenne | Bibliothèque > Photos récentes | 15s audio + photo |
| B4 | Multiple rapide | Bibliothèque > Photos récentes | B1 → succès → B2 immédiatement |

### Groupe C : Tests avec image (caméra)

| # | Durée audio | Source image | Description |
|---|------------|--------------|-------------|
| C1 | Courte | Caméra (photo) | Prendre photo et envoyer avec |
| C2 | Moyenne | Caméra (photo) | 15s audio + photo caméra |
| C3 | Multiple | Caméra (photo) | C1 → succès → C2 immédiatement |

### Groupe D : Tests avec image HEIC (Photos iPhone)

| # | Durée audio | Source image | Description |
|---|------------|--------------|-------------|
| D1 | Courte | Bibliothèque > Photo HEIC | Photo iPhone native (HEIC) |
| D2 | Moyenne | Bibliothèque > Photo HEIC | 15s audio + HEIC |
| D3 | Multiple | Bibliothèque > Photo HEIC | D1 → succès → D2 |

### Groupe E : Tests avec fichiers (autres dossiers)

| # | Durée audio | Source image | Description |
|---|------------|--------------|-------------|
| E1 | Courte | Fichiers > Documents | Image depuisDocuments |
| E2 | Courte | Fichiers > Downloads | Image depuisDownloads |

---

## 4. Diagnostic microphone iOS / PWA (admin uniquement)

### Objectif
Déterminer si la redemande d'autorisation micro vient du réglage Safari/iPhone, du mode PWA standalone, ou d'un changement de contexte navigateur.

### Pré-requis

- Utiliser un compte admin
- Ouvrir la page `/admin/microphone`
- Tester uniquement via une origine HTTPS sur iPhone

### Vérifications initiales

```
Test : Ouvrir /admin/microphone avant tout enregistrement
Attendu : Affichage du contexte courant (iOS, Safari, standalone, secure context)
Attendu : État de permissions.query si disponible
Attendu : Journal vide ou contenant uniquement les événements de contexte/check
```

### Protocole Safari iPhone

| # | Réglage Safari | Fermeture | Attendu côté admin |
|---|---------------|-----------|--------------------|
| M1 | Ask | Aucune | `permissions-query-result: prompt` puis `getusermedia-requested` |
| M2 | Ask | Fermer Safari puis relancer | Comparer état et voir si iOS reprompt |
| M3 | Ask | Kill Safari puis relancer | Vérifier si l'état change ou si iOS reprompt |
| M4 | Allow | Fermer Safari puis relancer | Vérifier si `Allow` est conservé ou si iOS reprompt malgré tout |
| M5 | Deny | Aucune | `getusermedia-error` ou état `denied`, sans démarrage d'enregistrement |

### Protocole PWA installée

| # | Réglage Safari | Fermeture | Attendu côté admin |
|---|---------------|-----------|--------------------|
| P1 | Ask | Aucune | Comparer le comportement avec Safari |
| P2 | Ask | Fermer la PWA puis relancer | Vérifier si le prompt revient |
| P3 | Ask | Kill la PWA puis relancer | Vérifier si le prompt revient |
| P4 | Allow | Fermer/relancer | Vérifier si l'autorisation est réutilisée |

### Critères de validation du code

```
Test : Déclencher un enregistrement avec le pré-prompt affiché
Attendu : Le pré-prompt n'ouvre pas le micro
Attendu : Un seul événement getusermedia-requested par enregistrement
Attendu : Aucun double appel fonctionnel au micro avant la capture réelle
```

---

## Commandes de test

### Lancer tous les tests
```bash
npm test
```

### Mode watch (développement)
```bash
npm run test:watch
```

### Tests spécifiques
```bash
# Tests de sécurité uniquement
npx vitest run src/lib/server/db.security.test.ts

# Tests API validation
npx vitest run src/lib/server/api.validation.test.ts

# Tests path traversal
npx vitest run src/routes/uploads/uploads.test.ts
```

---

## Couverture des tests

| Catégorie | Fichier | Nombre de tests |
|-----------|---------|-----------------|
| Sécurité - Auth | `db.auth.test.ts` | 6 |
| Sécurité - Validation | `db.security.test.ts` | 15 |
| Sécurité - Uploads | `uploads.test.ts` | 9 |
| API - Validation | `api.validation.test.ts` | 25 |
| Métier - DB | `db.business.test.ts` | 5 |
| **Total** | | **63** |

---

## Checklist avant release

- [ ] Tous les tests passent (`npm test`)
- [ ] Tests de sécurité exécutés (9 + 15 tests)
- [ ] Tests composants visuels validés (4 composants)
- [ ] Tests iOS Safari complétés (si modifications audio)

---

## Format de rapport de test

Pour chaque test, noter :

```
=== TEST [A1-B1-C1-D1-E1] ===
Date/Heure: 
iOS Version: 
Safari Version: 
Résultat: SUCCÈS / ÉCHEC
Logs serveur observés:
  - [RECORDINGS] POST reçu
  - [RECORDINGS] audio:
  - [RECORDINGS] image:
  - [RECORDINGS] isValidAudioBuffer:
  - [RECORDINGS] Succès / ERROR:
Notes:
```

---

## Checklist avant测试

- [ ] Nettoyer les cookies Safari (Settings > Safari > Clear History)
- [ ] Redémarrer la PWA (la supprimer du multitâche)
- [ ] Noter la version iOS
- [ ] Noter si c'est WiFi ou 4G
- [ ] Noter la force du signal réseau

---

## Commandes pour récupérer les logs

```bash
# Voir les logs en temps réel
docker logs -f --timestamps <container_name>

# Filtrer uniquement les logs recordings
docker logs --since "2026-03-18T17:00:00" <container_name> 2>&1 | grep -i recordings

# Exporter vers fichier
docker logs <container_name> > logs.txt 2>&1
```

---

## Points clés à surveiller dans les logs

1. **`[RECORDINGS] POST request received`** - Requête reçue
2. **`[RECORDINGS] audio: XXX bytes`** - Audio extrait (si absent = problème formData)
3. **`[RECORDINGS] image: XXX bytes`** - Image extraite
4. **`[RECORDINGS] isValidAudioBuffer: true/false`** - Validation audio
5. **`[RECORDINGS] HEIC converted`** - Si image HEIC convertie
6. **`[RECORDINGS] Recording saved successfully`** - Succès
7. **`[RECORDINGS] ERROR`** - Erreur avec détails

---

## Hypothèses à tester

1. **HEIC** → sharp échoue sur certaines images
2. **Taille image** → image trop volumineuse
3. **Format image** → magic numbers non reconnus
4. **Timing** → 2e envoi trop rapide après le 1er
5. **Session** → cookie expiré entre 2 envois
6. **Mémoire** → iOS libère le blob audio trop tôt

---

## Actions si erreur détectée

1. Copier les logs complets de l'erreur
2. Noter EXACTEMENT les conditions (test#, durée, image, timing)
3. Vérifier si l'erreur est déterministe (même test = même erreur)
