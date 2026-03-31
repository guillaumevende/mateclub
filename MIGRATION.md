# Guide de Migration - v2.6.1

## ⚠️ IMPORTANT - Action requise avant déploiement

Cette mise à jour (v2.6.1) contient une **migration de base de données obligatoire** qui doit être exécutée AVANT le déploiement de l'application.

## Qu'est-ce qui change ?

### Problème corrigé : Décalage horaire de 2h
Les anciennes versions stockaient les timestamps en **CEST** (UTC+2, heure de Paris en été). Depuis le changement d'heure du 30 mars 2026, cela causait un décalage de 2h dans l'affichage des heures.

### Solution
- **Nouveaux enregistrements** : Stockés en UTC (universel)
- **Enregistrements existants** : Convertis de CEST vers UTC (-2 heures)

## Procédure de migration

### 1. Backup de la base de données (OBLIGATOIRE)

```bash
# Se connecter au serveur
ssh votre-serveur

# Aller dans le répertoire de l'application
cd /chemin/vers/mateclub

# Arrêter l'application
docker-compose down

# Créer une sauvegarde avec la date
cp data/mateclub.db backups/mateclub-backup-$(date +%Y%m%d-%H%M%S).db

# Vérifier que le backup existe
ls -lh backups/
```

### 2. Exécuter la migration SQL

```bash
# Exécuter le script de migration
sqlite3 data/mateclub.db < scripts/migrate-timezone.sql

# Vérifier la conversion (les dates doivent être décalées de -2h)
sqlite3 data/mateclub.db "SELECT recorded_at FROM recordings ORDER BY recorded_at DESC LIMIT 5;"
```

**Exemple de sortie attendue :**
```
2026-03-31 08:30:00  ← Avant : 2026-03-31 10:30:00 (CEST)
2026-03-30 18:00:00  ← Avant : 2026-03-30 20:00:00 (CEST)
```

### 3. Déployer l'application

```bash
# Récupérer la branche beta-fix
git fetch origin
git checkout beta-fix
git pull origin beta-fix

# Vérifier qu'on est bien sur beta-fix
git branch

# Déployer avec Docker
docker-compose down
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f mateclub
```

### 4. Tests en production

Vérifiez les points suivants :
- [ ] Les anciennes capsules affichent la bonne heure (plus de décalage de 2h)
- [ ] Les nouvelles capsules créées affichent l'heure correcte
- [ ] L'enregistrement fonctionne au premier essai
- [ ] L'indicateur "Finalisation..." apparaît brièvement après clic sur "Arrêter"
- [ ] Vos propres capsules n'ont pas de filet blanc gras

## Rollback (si problème)

Si vous rencontrez des problèmes après la migration :

```bash
# Arrêter l'application
docker-compose down

# Restaurer la base de données depuis le backup
cp backups/mateclub-backup-XXXXXX.db data/mateclub.db

# Revenir sur la version précédente (main)
git checkout main

# Redémarrer
docker-compose up -d --build
```

## Notes techniques

### Tables modifiées
- `recordings.recorded_at`
- `users.created_at`
- `listening_history.listened_at`
- `pending_registrations.requested_at`

### Format après migration
Tous les timestamps sont désormais en UTC et seront convertis à l'affichage selon le fuseau horaire de chaque utilisateur ( configuré dans les paramètres, défaut : Europe/Paris).

## Support

En cas de problème avec la migration :
1. Vérifiez le backup dans `backups/`
2. Consultez les logs : `docker-compose logs mateclub`
3. Restaurez la DB si nécessaire (voir section Rollback)

## Historique des versions

- **v2.6.1** (2026-03-31) : Migration timezone CEST → UTC + corrections enregistrement
- **v2.6.0** (2026-03-29) : Nouvelle identité visuelle
