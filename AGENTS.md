# Guide pour les Agents - Maté Club

## Règles absolues de fonctionnement

### 1. Structure Git (2 branches uniquement)
- **`main`** : Production stable
  - Uniquement des merges depuis `develop` via PR
  - Jamais de commit direct
  - Toujours déployable
  
- **`develop`** : Branche de développement unique
  - Toutes les modifications se font ici
  - Commits directs autorisés (pas de branches feature)
  - Chaque feature doit être **documentée précisément** dans les commits

### 2. Gestion automatique des versions (par l'agent)

**L'agent DOIT automatiquement :**
- Gérer les versions dans `package.json`
- Créer les tags GitHub correspondants
- Mettre à jour le CHANGELOG.md
- Actualiser le README.md si nécessaire
- Repasser sur tous les descriptifs globaux de l'app

**Convention de versioning (SemVer) :**
- Format : `0.MAJEUR.MINEUR`
- Actuel : `0.27.0`
- Incrémentation :
  - `0.27.0` → `0.28.0` : Nouvelle feature majeure
  - `0.27.0` → `0.27.1` : Correction bug

### 3. Workflow de développement

```bash
# 1. Toujours partir de develop
git checkout develop
git pull origin develop

# 2. Faire les modifications
code...

# 3. Mettre à jour la version (automatique par l'agent)
# - package.json
# - CHANGELOG.md (nouvelle entrée avec date du jour)
# - README.md (si nécessaire)

# 4. Commiter avec message détaillé
git add .
git commit -m "feat: description détaillée de la feature

- Point 1 de la modification
- Point 2 de la modification
- Impact sur l'application

Refs: description du contexte"

# 5. Pousser sur develop
git push origin develop

# 6. Créer le tag si nouvelle version
git tag -a v0.28.0 -m "Version 0.28.0 - Description"
git push origin v0.28.0

# 7. Créer PR develop → main (quand prêt pour prod)
```

### 4. Documentation obligatoire

**À chaque modification, l'agent DOIT :**

1. **Mettre à jour CHANGELOG.md**
   - Ajouter une entrée en haut du fichier
   - Date du jour au format ISO (YYYY-MM-DD)
   - Lister tous les changements (features, fixes, docs)
   - Exemple :
   ```markdown
   ## v0.28.0 (2026-04-03)
   
   ### ✨ Nouvelles fonctionnalités
   - Feature X : description détaillée
   - Feature Y : description détaillée
   
   ### 🐛 Corrections
   - Fix Z : description du bug corrigé
   
   ### 📚 Documentation
   - Mise à jour section X du README
   ```

2. **Vérifier README.md**
   - Version badge à jour
   - Fonctionnalités listées correctement
   - Stack technique à jour
   - Instructions d'installation toujours valides

3. **Vérifier descriptifs globaux**
   - Description du projet toujours d'actualité
   - Liens fonctionnels
   - Captures d'écran (si applicable)

### 5. Checklist pré-commit (à respecter rigoureusement)

- [ ] Je suis sur la branche `develop`
- [ ] J'ai mis à jour `package.json` version
- [ ] J'ai créé une entrée dans `CHANGELOG.md`
- [ ] J'ai vérifié `README.md` (version, fonctionnalités, stack)
- [ ] J'ai vérifié que tous les descriptifs sont à jour
- [ ] Le message de commit est détaillé et explicite
- [ ] J'ai créé le tag GitHub correspondant

### 6. Messages de commit

**Format :**
```
type: description courte

Description détaillée :
- Point 1
- Point 2
- Impact sur l'application

Documentation mise à jour :
- CHANGELOG.md
- README.md (section X)
```

**Types :**
- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation uniquement
- `chore:` : Maintenance, outils, etc.
- `refactor:` : Refactoring sans changement fonctionnel

### 7. Exemple complet

```bash
# Développement d'une nouvelle feature
git checkout develop
git pull origin develop

# Modifications du code...

# Mise à jour automatique de la version et documentation
# package.json: 0.27.0 → 0.28.0
# CHANGELOG.md: nouvelle entrée v0.28.0
# README.md: vérification et mise à jour

git add .
git commit -m "feat: ajout système de notifications push

Implémentation complète du système de notifications :
- Service Worker pour les notifications
- Endpoint API /api/notifications/subscribe
- Interface utilisateur dans les paramètres
- Support iOS et Android

Impact :
- Nouvelle permission navigateur demandée
- Stockage des tokens dans la base de données
- Migration de base de données nécessaire

Documentation mise à jour :
- CHANGELOG.md (entrée v0.28.0)
- README.md (section Fonctionnalités et API Routes)

git push origin develop
git tag -a v0.28.0 -m "Version 0.28.0 - Système de notifications push"
git push origin v0.28.0
```

## Rappel important

**L'agent doit être rigoureux sur la documentation.** Chaque feature doit être documentée précisément dans develop. C'est une règle essentielle du fonctionnement.

En cas de doute sur une version ou une documentation, l'agent doit :
1. Vérifier CHANGELOG.md
2. Vérifier README.md
3. Vérifier les tags existants
4. Documenter systématiquement
