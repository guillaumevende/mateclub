# Guide de Migration - Version 2.7.0

## ⚠️ IMPORTANT - À LIRE AVANT DÉPLOIEMENT

Cette version contient des **migrations de base de données critiques** qui doivent être exécutées avant le démarrage de l'application.

## 📋 Checklist pré-déploiement

### 1. Sauvegarde (OBLIGATOIRE)

```bash
# Créer une backup de la base de données
cp data/mateclub.db data/mateclub.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Migrations SQL (OBLIGATOIRE)

#### Migration 1 : Fuseau horaire (CRITIQUE)

**Fichier** : `scripts/migrate-timezone.sql`

**Description** : Convertit tous les timestamps de CEST (UTC+2) vers UTC

**Commande** :
```bash
sqlite3 data/mateclub.db < scripts/migrate-timezone.sql
```

**Vérification** :
```sql
-- Vérifier que les dates ont bien été converties
SELECT recorded_at FROM recordings ORDER BY recorded_at DESC LIMIT 5;
-- Les heures devraient être en UTC (2h de moins qu'avant)
```

#### Migration 2 : Ajout last_login

**Fichier** : `scripts/migrate-last-login.sql`

**Description** : Ajoute la colonne last_login à la table users

**Commande** :
```bash
sqlite3 data/mateclub.db < scripts/migrate-last-login.sql
```

### 3. Vérification des fichiers statiques

S'assurer que ces fichiers sont présents dans `static/` :
- [ ] `ding.mp3` (son de fin de capsule)
- [ ] `doudoudou.mp3` (son de fin de journée)
- [ ] `lib/browser-image-compression.js` (copié depuis node_modules)

### 4. Installation des dépendances

```bash
npm install
```

### 5. Build de production

```bash
npm run build
```

## 🚀 Déploiement Docker

```bash
# 1. Builder l'image
docker build -t mateclub:2.7.0 .

# 2. Exécuter les migrations dans le conteneur temporaire
docker run --rm -v $(pwd)/data:/app/data mateclub:2.7.0 sh -c "
  sqlite3 data/mateclub.db < scripts/migrate-timezone.sql &&
  sqlite3 data/mateclub.db < scripts/migrate-last-login.sql
"

# 3. Démarrer le conteneur
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name mateclub mateclub:2.7.0
```

## ⚡ En cas de problème

### Rollback

Si vous devez revenir en arrière :

```bash
# Arrêter l'application
npm stop  # ou docker stop mateclub

# Restaurer la backup
cp data/mateclub.db.backup.XXXXXXXX data/mateclub.db

# Redémarrer l'ancienne version
git checkout v2.6.1
npm run build
npm start
```

### Vérification post-déploiement

1. **Connexion** : Vérifier que vous pouvez vous connecter
2. **Enregistrement** : Créer une capsule et vérifier l'heure affichée
3. **Lecture** : Jouer une capsule et vérifier que le "ding" se joue à la fin
4. **Installation PWA** : Sur mobile, vérifier que le dialog d'installation s'affiche

## 📞 Support

En cas de problème avec les migrations :
1. Consulter les logs : `npm run dev` ou `docker logs mateclub`
2. Vérifier la structure de la DB : `sqlite3 data/mateclub.db .schema`
3. Restaurer la backup si nécessaire

---

**Date de création** : 2026-04-01
**Version cible** : 2.7.0
**Branche** : hotfix/timezone-display
