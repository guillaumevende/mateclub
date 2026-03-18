# CHANGELOG - MateClub

---

## [CURRENT] v2.3.0 - Améliorations UX et Fiabilité
**Date**: 2026-03-18

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
