# CHANGELOG - MateClub

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
