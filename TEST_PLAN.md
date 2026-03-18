# Plan de Test - Envoi Audio sur iOS Safari

## Objectif
Identifier la cause des erreurs d'envoi "Erreur lors de l'envoi" intermittentes sur iOS Safari.

---

## Scénarios de Test

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

## Format de rapport

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
