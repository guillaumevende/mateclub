# CHANGELOG - Maté Club

---

## v0.32.7 (2026-05-03) - Pastille non lue stabilisée

### 🐛 Corrections

#### Accueil
- **Pastille des capsules non lues stabilisée** : la pastille ne revient plus au total serveur pendant les recalculs internes de la playlist à écouter
- **Durée restante cohérente** : les capsules de la playlist non lue déjà marquées comme écoutées localement sont maintenant prises en compte dans le calcul du compteur et du temps restant
- **Synchronisation anti-oscillation** : la reconstruction de la playlist non lue est désormais ignorée si les données utiles n'ont pas réellement changé, même si le player met à jour sa progression en continu

#### Administration
- **Marquage non lu** : ajout d'une action admin permettant de repasser les 5 dernières capsules audio d'autres utilisateurs en non lues pour l'admin connecté

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.32.7`

---

## v0.32.6 (2026-05-01) - Préchargement silencieux des sons d'enregistrement

### 🐛 Corrections

#### Enregistrement
- **Avertissement sonore au démarrage supprimé** : les sons `achievement1/2/3.mp3` ne sont plus joués, même en muet, lors du lancement d'un enregistrement
- **Préchargement conservé** : les sons d'avertissement restent chargés à l'avance, mais ne doivent se déclencher qu'aux seuils de fin d'enregistrement

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.32.6`

---

## v0.32.5 (2026-05-01) - Redémarrage d'enregistrement fiabilisé

### 🐛 Corrections

#### Enregistrement
- **Nouvel enregistrement après `Terminer`** : les gestionnaires `MediaRecorder` sont maintenant attachés avant le démarrage effectif de l'enregistrement
- **Nettoyage complet du recorder** : le stream micro, le timeout de secours et l'instance `MediaRecorder` sont remis à zéro après l'arrêt
- **Erreur rouge évitée au second enregistrement** : le cas où aucun chunk n'était encore collecté ne laisse plus le micro ou le recorder dans un état intermédiaire

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.32.5`

---

## v0.32.4 (2026-05-01) - Son de démarrage d'enregistrement

### 🎵 Audio
- **Son `start.mp3` remplacé** : mise à jour de l'asset joué au démarrage réel d'un enregistrement

### 📚 Documentation
- README.md : version mise à jour en `0.32.4`

---

## v0.32.3 (2026-05-01) - Anti-veille pendant l'écoute

### ✨ Améliorations

#### Lecture audio
- **Screen Wake Lock pendant l'écoute** : l'application demande désormais le maintien éveillé de l'écran pendant la lecture des capsules, comme elle le faisait déjà pendant l'enregistrement
- **Réacquisition au retour au premier plan** : si le système libère le Wake Lock lors d'un changement de visibilité, l'app tente de le récupérer quand elle redevient visible et qu'une capsule est toujours en lecture
- **Libération propre** : le Wake Lock est relâché à la pause utilisateur, à la fermeture du player, à l'échec de reprise et à la fin de playlist

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.32.3`
- README.md : précision du support Screen Wake Lock pendant l'écoute

---

## v0.32.2 (2026-05-01) - Hotfix streaming audio Safari

### 🐛 Corrections

#### Lecture audio
- **Support HTTP Range pour les capsules** : `/api/recordings/:id` répond désormais correctement aux requêtes `Range` avec `206 Partial Content` et `Content-Range`
- **Fin prématurée iOS/Safari corrigée** : les fichiers audio longs ne devraient plus être considérés comme terminés après un court fragment, ce qui évite le jingle de fin lancé trop tôt
- **Curseur du player plus réactif** : le premier geste de glissement sur la barre de progression agit immédiatement grâce aux pointer events

### 🧪 Tests
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : version mise à jour en `0.32.2`
- README.md : mention du support HTTP Range audio

---

## v0.32.1 (2026-04-27) - Pastille d’accueil plus compacte

### 🐛 Corrections

#### Accueil
- **Durée raccourcie dans la pastille non lus** : les durées de la capsule d’accueil utilisent maintenant un format compact (`20 min 28 s`, `1 h 05 min`) pour éviter les retours à la ligne trop longs
- **Pastille limitée à deux lignes** : le résumé `capsules + durée` reste visuellement plus stable et n’étire plus la pastille sur trois lignes avec les longues durées
- **Navigation stabilisée pendant le pull-to-refresh iOS** : la barre fixe du bas ne remonte plus verticalement pendant le geste d’actualisation
- **Modales d’écoute au-dessus du player** : les modales de lecture recouvrent maintenant toute la page et ne sont plus masquées par le player ou la navigation basse

#### Enregistrement
- **Sons de test iOS/PWA inclus dans la release** : `start.mp3` est joué au démarrage réel d’un enregistrement et les alertes de fin utilisent désormais `achievement1.mp3`, `achievement2.mp3` puis `achievement3.mp3`

### 🧪 Tests
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : version mise à jour en `0.32.1`

---

## v0.32.0 (2026-04-27) - Réglages PWA, rail de brouillons et diagnostics iOS

### ✨ Nouvelles fonctionnalités

#### Réglages & PWA
- **Tuto PWA désactivable** : chaque utilisateur peut désormais masquer individuellement les popups d’installation PWA depuis `Réglages`, puis les réactiver plus tard si besoin

#### Enregistrement
- **Rail latéral de brouillons** : l’interface d’enregistrement multi-capsules adopte un rail horizontal compact avec une capsule active détaillée
- **Ajout direct** : la vignette `Ajouter` lance immédiatement un nouvel enregistrement sans scroll parasite
- **Brouillons plus discrets** : les messages transitoires de restauration et d’ajout local ont été retirés pour alléger l’écran
- **Avertissements de fin** : un son d’alerte est maintenant joué à 15, 10 et 5 secondes de la fin d’enregistrement
- **Retours haptiques synchronisés** : ces mêmes seuils déclenchent désormais des vibrations progressives et plus marquées

#### Admin & diagnostic
- **Logs micro/audio pilotables** : les logs de diagnostic peuvent être activés ou désactivés pour un utilisateur donné depuis le panel admin

### 🐛 Corrections

#### Enregistrement & médias
- **Prévisualisation image cohérente** : le visuel de la capsule active suit correctement la vignette sélectionnée
- **Photo Android clarifiée** : l’ajout d’image propose explicitement `Prendre une photo` ou `Choisir une photo` sur Android, sans afficher ce double choix sur desktop
- **Boutons harmonisés** : `Tout envoyer`, `Envoyer` et `Supprimer` utilisent maintenant un rendu plus cohérent avec le reste de l’app
- **Bouton `Tout envoyer` recentré** : l’icône et le libellé ont été réalignés pour un centrage optique plus propre

#### Accueil & lecture
- **Pastille non lus stabilisée** : le résumé d’accueil ne clignote plus entre plusieurs états contradictoires pendant la lecture continue
- **Dates seuil cohérentes** : un jour cliqué depuis l’accueil ou le calendrier retrouve maintenant correctement les capsules rattachées par seuil horaire

#### Navigation & iOS
- **Navigation basse stabilisée** : la barre d’onglets utilise désormais une répartition plus robuste
- **Recollage iOS après overlay système** : un ajustement `visualViewport` recale la nav en bas après certains retours PWA iOS, notamment après Temps d’écran

#### Réglages & setup
- **Libellé mot de passe corrigé** : l’interface de setup affiche bien la contrainte réelle de 12 caractères
- **Placement du réglage PWA** : l’option est maintenant intégrée dans le flux naturel des préférences, juste avant `Sauvegarder`

### 🧪 Tests
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : version mise à jour en `0.32.0`
- README.md : ajout du réglage individuel du tuto PWA, du rail de brouillons et des alertes d’enregistrement

---

## v0.31.0 (2026-04-16) - Brouillons locaux multi-capsules

### ✨ Nouvelles fonctionnalités

#### Enregistrement
- **Pause / reprise** : une capsule peut désormais être mise en pause puis reprise avant validation finale
- **Brouillons locaux multiples** : chaque capsule terminée est sauvegardée localement sur l’appareil pour permettre d’en enregistrer plusieurs avant l’envoi
- **Métadonnées par capsule** : chaque brouillon peut recevoir sa propre photo et sa propre URL avant publication
- **Envoi unitaire ou groupé** : il est possible d’envoyer une capsule seule ou toute la file de brouillons d’un coup
- **Restauration automatique** : les brouillons locaux sont restaurés à l’ouverture de la page d’enregistrement si un envoi précédent a échoué ou a été interrompu
- **Progression d’upload** : une barre de progression indique l’état de l’envoi pour chaque capsule et pour l’envoi groupé

### 🐛 Corrections

#### Interface
- **Croix mutualisées** : les boutons de fermeture utilisent maintenant un composant partagé avec croix SVG et géométrie ronde stable
- **Aperçu image corrigé** : la fermeture de la photo associée à un enregistrement n’est plus déformée
- **Admin mobile clarifié** : les cartes d’inscriptions en attente ont été simplifiées sur mobile avec actions plus lisibles et libellé `Refuser`
- **Logs pilotables par admin** : un administrateur peut désormais activer les logs de diagnostic micro pour un autre utilisateur
- **Validation admin fidèle** : la case `Admin` des inscriptions en attente est maintenant réellement prise en compte lors de la validation
- **Promotion admin** : un membre existant peut être promu administrateur depuis le panel admin
- **Suppression d’admin bloquée** : le flux admin empêche désormais la suppression d’un administrateur

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.31.0`
- README.md : description du nouveau flux de brouillons locaux et de l’envoi groupé

---

## v0.30.5 (2026-04-15) - Pastille des non lus clarifiée

### 🐛 Corrections

#### Accueil
- **États verrouillés explicites** : quand toutes les capsules non lues sont verrouillées, la pastille affiche désormais `N capsule(s) pour [heure de mise à dispo]`
- **Picto cohérent** : le bouton play est remplacé par un cadenas SVG quand aucune capsule non lue n'est encore disponible
- **Cas mixte corrigé** : si certaines capsules non lues sont disponibles et d'autres encore verrouillées, la pastille n'affiche plus que le nombre et la durée des capsules réellement écoutables
- **Forme stabilisée** : la géométrie de la pastille reste identique avec ou sans icône à gauche

### 🧪 Tests
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : version mise à jour en `0.30.5`

---

## v0.30.4 (2026-04-15) - Rendu SSR de l'accueil corrigé

### 🐛 Corrections

#### Accueil
- **Initialisation SSR fiable** : la page d'accueil est maintenant initialisée directement à partir de `data.days` et `data.page` dès le rendu serveur
- **Fin de l'état vide fantôme** : la home ne rend plus `Pas encore de capsule à écouter` alors que des capsules et statistiques sont déjà présentes dans les données de la page
- **Rendu prod aligné sur le dev** : la pastille des non lus et les sections de jours s'affichent correctement dès le premier rendu en production

### 🧪 Tests
- `npm run check`
- `npm test`
- `npm run build`

### 📚 Documentation
- README.md : version mise à jour en `0.30.4`

---

## v0.30.3 (2026-04-15) - Pastille des non lus et lecture disponible

### 🐛 Corrections

#### Accueil
- **Synthèse fidèle** : la pastille des non lus continue d'afficher le total complet des capsules non lues, y compris lorsqu'une partie est encore verrouillée
- **Lecture disponible uniquement** : le clic sur la pastille ne lance désormais que les capsules non lues déjà déverrouillées et réellement écoutables
- **État passif clarifié** : si toutes les capsules non lues sont verrouillées, la pastille n'affiche plus le picto lecture et n'essaie plus de démarrer la lecture

### 🧪 Tests
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : version mise à jour en `0.30.3`

---

## v0.30.2 (2026-04-15) - File d'écoute continue et interface affinée

### ✨ Améliorations

#### Waveform d'enregistrement
- **Rendu plus doux** : le visualiseur de la page d'enregistrement est plus bas et visuellement moins agressif
- **Palette chaude simplifiée** : les couleurs chaudes apparaissent uniquement quand une barre dépasse réellement un seuil élevé
- **Spectre rééquilibré** : la répartition fréquentielle reflète mieux la voix sur toute la largeur au lieu d'animer surtout les barres de gauche
- **Impact** : l'animation reste crédible audio tout en étant plus élégante et plus lisible pendant l'enregistrement

#### Player mobile
- **Contrôles OS fiabilisés** : reprise de lecture alignée entre le bouton de l'interface et les contrôles MediaSession Android/iOS
- **Temps restant** : le mini-player affiche désormais la durée restante à droite au lieu de la durée totale
- **Libellé naturel** : les durées s'affichent de façon plus lisible (`N secondes`, `N minutes et S secondes`, `N heures et M minutes`)

#### Calendrier
- **Code couleur cohérent après `Charger plus`** : les jours déjà chargés recalculent leur état rose/blanc directement à partir des capsules visibles
- **Propres capsules exclues du rose** : l'API calendrier ne considère plus les capsules de l'utilisateur courant comme "non lues"

#### Accueil
- **Pastille "À écouter"** : le résumé des capsules non lues devient une pastille cliquable sous le message de bienvenue
- **File continue de non lus** : un clic ouvre une modale dédiée qui rassemble toutes les capsules non lues disponibles dans une seule écoute en continu
- **Lecture immédiate** : la première capsule démarre directement sans second clic
- **Session persistée** : la file d'écoute garde sa sélection quand on ferme puis rouvre la modale pendant une lecture en cours
- **Suivi horizontal** : les vignettes défilent automatiquement pendant l'écoute, avec séparateurs de dates intégrés

#### Cartouches de capsules
- **En-tête réorganisé** : avatar et pseudo passent à gauche, horaire à droite, et le badge `nouveau` se place au-dessus de la durée
- **Statut plus lisible** : seules les capsules non lues affichent un badge `nouveau`
- **Code couleur clarifié** : pseudo, horaire, durée et contour passent en rose pour les capsules non lues, en blanc pour les capsules déjà lues
- **Covers plus contrastées** : le voile sombre global sur les images de couverture est légèrement renforcé

### 🧪 Tests
- Vérification manuelle du rendu sur prototype local avec vrai micro navigateur
- `npm run check`
- `npm test`

### 📚 Documentation
- README.md : mise à jour de la version et mention du visualiseur rééquilibré

---

## v0.30.1 (2026-04-14) - Conversion Safari des capsules Android

### 🐛 Corrections

#### Compatibilité audio Android → Safari
- **Transcodage serveur ciblé** : les capsules WebM/OGG sont désormais converties en AAC/M4A avant stockage lorsque Safari risque de ne pas les lire
- **Compatibilité conservée** : les capsules déjà enregistrées en MP4/M4A ou MP3 ne sont pas retraitées
- **Déploiement Docker prêt** : l'image embarque maintenant `ffmpeg` pour garantir le transcodage sur l'instance auto-hébergée
- **Impact** : les nouvelles capsules Android restent lisibles dans Safari, y compris quand Chrome Android n'envoie que du WebM

### 🧪 Tests
- Ajout de tests unitaires sur la décision de transcodage et le mapping mime/extension
- Vérification maintenue de la détection du vrai format audio côté serveur

### 📚 Documentation
- README.md : précision sur la conversion Safari des formats Android incompatibles
- TEST_PLAN.md : protocole mis à jour pour valider le transcodage serveur

---

## v0.30.0 (2026-04-14) - Correction audio Android vers Safari

### 🐛 Corrections

#### Compatibilité audio Safari
- **Détection du format réel** : le serveur détecte désormais le vrai format audio via les magic numbers au lieu de supposer `.m4a`
- **Bonne extension au stockage** : les nouvelles capsules sont sauvegardées avec l'extension correcte (`.webm`, `.m4a`, `.ogg`, `.mp3`)
- **Bonne réponse HTTP à la lecture** : l'API de lecture renvoie maintenant le bon `Content-Type` même pour les anciens fichiers mal nommés
- **Impact** : base nécessaire pour diagnostiquer les capsules Android/Chrome réellement encodées en WebM

### 🧪 Tests
- Ajout de tests sur la détection du mime audio réel
- Ajout d'un protocole de validation Android → Safari dans `TEST_PLAN.md`

### 📚 Documentation
- README.md : mention explicite de la compatibilité Safari renforcée
- package.json : version mise à jour en `0.30.0`

---

## v0.29.0 (2026-04-02) - Corrections de sécurité et améliorations

### 🔒 Sécurité

#### Validation du fuseau horaire (PR #57)
- **Validation avant sauvegarde** : Vérification que le timezone est reconnu par JavaScript avant enregistrement en base
- **Protection** : Évite les erreurs `RangeError` sur `Intl.DateTimeFormat` qui pouvaient crasher l'application
- **Silent fail** : Si timezone invalide, la mise à jour est ignorée sans erreur utilisateur

#### Nettoyage périodique des données expirées (PR #58)
- **Nouvelles fonctions** : `cleanupExpiredSessions()`, `cleanupExpiredCsrfTokens()`, `cleanupExpiredLoginAttempts()`
- **Automatisation** : Nettoyage automatique des sessions, tokens CSRF et tentatives de login expirées
- **Hygiène** : Réduction de la taille de la base de données et amélioration des performances

#### Optimisation lecture fichiers (PR #59)
- **Lecture partielle** : Lecture des 4 premiers octets uniquement pour la détection magic number (au lieu du fichier complet)
- **Performance** : Réduction drastique de l'utilisation mémoire pour les gros fichiers (jusqu'à 20 Mo)
- **Impact** : Moins de blocage du thread Node.js lors de la validation des uploads

#### Invalidation des sessions au changement de mot de passe (PR #60)
- **Nouvelle fonction** : `deleteUserSessions(userId, exceptSessionId?)` pour invalider toutes les sessions d'un utilisateur
- **Sécurité renforcée** : Lors d'un changement de mot de passe, toutes les autres sessions sont automatiquement révoquées
- **UX préservée** : La session courante est conservée (l'utilisateur reste connecté)
- **Protection** : Empêche l'utilisation de sessions volées après un changement de mot de passe

### 🛠️ Corrections complémentaires
- Résolution de conflit de merge entre PR #57 et PR #60 sur `db.ts`

---

## v0.28.0 (2026-04-02) - Scroll initial sur première capsule non lue

### ✨ Nouvelles fonctionnalités

#### Positionnement scroll intelligent
- **Scroll initial sur première non-lue** : Au chargement de la page, chaque journée positionne son scroll horizontal sur la première capsule non lue
- **Comportement** : Les capsules lues restent à gauche, la première non-lue est visible par défaut
- **Sans animation** : Le positionnement est instantané (pas de défilement animé au chargement)
- **Fallback** : Si toutes les capsules d'une journée sont lues, le scroll reste sur la première

#### Cas pris en charge
- Page d'accueil (journée du jour + jours précédents)
- Modale calendrier (quand on clique sur une date spécifique)
- Lazy loading (quand on charge plus de jours avec "Charger plus")

### 🎵 Comportement du jingle inchangé
- Le jingle d'intro continue de se lancer uniquement si on commence la lecture par la première capsule de la journée
- Si on commence en milieu de journée (via le positionnement automatique), pas de jingle

---

## v0.27.0 (2026-04-02) - Migration Semantic Versioning

### 🔄 Changement majeur

#### Adoption de Semantic Versioning
- **Migration** : Passage du système de versioning arbitraire 2.x à SemVer 0.x
- **Raison** : Mieux refléter le statut beta du projet
- **Impact** : Pas de changement fonctionnel, uniquement sémantique

#### Nouvelle structure des versions
- **0.x.y** : Phase beta, API susceptible de changer
- Prochaines versions : 0.28.0, 0.29.0, puis 1.0.0 quand l'API sera stabilisée

#### Documentation
- Ajout section "Versioning" dans README.md
- Ajout section "Branches" documentant `main` et `develop`
- Mise à jour du badge de version (2.7.1 → 0.27.0)

### 📚 Notes

Les versions 2.x (de v2.0.0 à v2.7.1) représentent l'historique de développement avant l'adoption officielle de Semantic Versioning. Elles sont conservées dans ce changelog pour référence mais ne suivaient pas la logique SemVer.

---

## Historique des versions (pré-SemVer)

Les versions suivantes ont été développées selon une numérotation arbitraire avant l'adoption de Semantic Versioning le 2026-04-02.

### v2.7.1 (2026-04-02)

### ✨ Nouvelles fonctionnalités

#### Sons de fin de capsule
- **Ding.mp3** : Joué automatiquement après chaque capsule (volume 60%)
- **Doudoudou.mp3** : Joué après la dernière capsule du jour
- Fonctionne en arrière-plan, pas de contrôle utilisateur

#### Installation PWA facilitée
- Composant `@khmyznikov/pwa-install` pour dialog d'installation
- Affichage automatique après 5 secondes sur première visite
- Instructions natives iOS/Android/Desktop
- Couleur personnalisée (#e94560) et texte en français

#### Visualiseur audio
- 8 barres verticales animées pendant l'enregistrement
- Gradient vert → jaune → rouge

#### Navigation améliorée
- Clic sur date dans FloatingPlayer pour scroller vers le jour
- Suppression du scroll vertical automatique bloquant

### 🐛 Corrections de bugs

#### Stabilité enregistrement
- `isRecording = false` déplacé dans callback `onstop`
- Timeout 5s pour appareils lents
- Indicateur "Finalisation..." visuel

#### Accessibilité (A11y)
- Tous les composants interactifs avec attributs ARIA
- Navigation clavier complète (Enter, Espace, Échap)
- Labels pour lecteurs d'écran

#### API
- Renommage endpoint `/listen` → `/listened`

### 🔧 Migrations base de données

**À exécuter AVANT déploiement :**

```bash
# 1. Migration fuseau horaire (CRITIQUE)
sqlite3 data/mateclub.db < scripts/migrate-timezone.sql

# 2. Ajout colonne last_login
sqlite3 data/mateclub.db < scripts/migrate-last-login.sql
```

---

## v2.6.1 (2026-03-31)

### 🐛 Corrections de bugs critiques

#### Gestion des fuseaux horaires
- **Migration des timestamps** : Conversion de CEST (UTC+2) vers UTC pour tous les enregistrements historiques
- **Correction du stockage** : Les nouveaux enregistrements sont désormais stockés en UTC (`datetime('now')` au lieu de `datetime('now', 'localtime')`)
- **Affichage correct** : Conversion automatique UTC → heure locale de l'utilisateur via `Intl.DateTimeFormat`
- **Script de migration** : `scripts/migrate-timezone.sql` pour mise à jour des données existantes

#### Impact
- Résolution du décalage de 2h constaté depuis le changement d'heure (30 mars 2026)
- Uniformisation de la gestion des horaires sur toute l'application
- Les capsules créées à 8h30 CEST s'affichent désormais correctement à 8h30 (et non 6h30)

#### Fichiers modifiés
- `src/lib/server/db.ts` : Timestamps en UTC pour les nouvelles entrées
- `scripts/migrate-timezone.sql` : Script de migration des données existantes
- `package.json` : Mise à jour version 2.6.1
- `CHANGELOG.md` : Documentation des changements
- `README.md` : Section sur la gestion des horaires

---

## v2.6.0 (2026-03-29)

### 🎨 Nouvelle identité visuelle

#### Assets régénérés
- [x] **Logo principal** : Toutes les déclinaisons générées depuis `logoHD.png`
- [x] **icon-512x512.png** : Icône PWA principale (512x512)
- [x] **icon-192x192.png** : Icône PWA (192x192)
- [x] **apple-touch-icon.png** : Icône iOS (180x180)
- [x] **favicon-32x32.png** : Favicon navigateur (32x32)
- [x] **favicon-16x16.png** : Favicon navigateur petit (16x16)
- [x] **favicon.ico** : Favicon multi-résolution

#### Nettoyage
- [x] **Suppression logo512px.png** : Ancienne version obsolète remplacée
- [x] **Suppression backup** : Fichier `+page.svelte.backup-2026-03-12` obsolète

#### Code mis à jour
- [x] **Toutes les pages** : Références `/logo512px.png` → `/icon-512x512.png`
- [x] **Player metadata** : Mise à jour des artwork dans `player.ts`

---

## v2.5.0-beta (2026-03-27)

### Nouvelle fonctionnalité : Système d'inscription Beta

#### Inscription
- [x] **Page d'inscription** : Nouvelle page `/register` accessible publiquement
- [x] **Formulaire sécurisé** : CSRF, rate limiting, validation mot de passe 12+ caractères
- [x] **Confirmation** : Message "Tu es bien inscrit : attends qu'on valide ton accès"
- [x] **Page fermées** : Message instead d'erreur 403 si inscriptions fermées

#### Administration
- [x] **Toggle inscriptions** : L'admin peut activer/désactiver les inscriptions depuis le panel admin
- [x] **Liste en attente** : Visualisation des demandes d'inscription en attente
- [x] **Validation un par un** : Boutons "Valider" et "Rejeter" pour chaque demande
- [x] **Pastille notification** : Pastille rouge sur l'accueil admin avec nombre d'inscriptions en attente

#### Base de données
- [x] **Table pending_registrations** : Stockage des demandes d'inscription en attente
- [x] **Table app_config** : Configuration de l'application (allow_registration)
- [x] **Fonctions DB** : createPendingRegistration, approveRegistration, rejectRegistration, isRegistrationAllowed, etc.

### Corrections de bugs

#### Interface - Calendrier
- [x] **Fix noms de mois** : Correction du décalage dans getMonthName() (suppression du -1)
- [x] **Robustesse** : Les noms de mois utilisent maintenant directement l'index JavaScript (0-11)

#### Pagination et affichage
- [x] **Fix bouton "Charger plus"** : La logique vérifie maintenant s'il y a des jours supplémentaires au-delà de ceux affichés
- [x] **Filtre 3 mois** : La page d'accueil et le compteur de capsules non lues filtrent maintenant sur les 3 derniers mois
- [x] **Alignement compteur** : Le nombre de capsules non lues correspond à l'affichage

### Documentation
- [x] **Règles RecordingCard** : Documentation dans le README pour éviter la régression du CSS des capsules verrouillées

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
