## Description
<!-- Décrivez brièvement vos changements -->

## Type de changement
- [ ] 🐛 Correction de bug (fix)
- [ ] ✨ Nouvelle fonctionnalité (feat)
- [ ] 📚 Documentation (docs)
- [ ] ⚡ Performance (perf)
- [ ] 🔒 Sécurité (security)
- [ ] ♻️ Refactoring (refactor)

## Checklist
- [ ] Ma PR cible la branche **`develop`** (et non `main`)
- [ ] J'ai testé mes changements localement
- [ ] Les tests passent (`npm test` si applicable)
- [ ] J'ai mis à jour la documentation si nécessaire
- [ ] J'ai suivi les conventions de commit du projet

## Tests effectués
<!-- Décrivez comment vous avez testé vos changements -->

## Breaking changes
<!-- Y a-t-il des changements cassants ? Si oui, décrivez-les -->

## Informations complémentaires
<!-- Toute information utile pour les reviewers -->

---

### ⚠️ **Important : Workflow Git**

**Les PRs doivent toujours cibler la branche `develop`.**

La branche `main` est réservée aux releases en production et ne reçoit que des merges depuis `develop`.

**Workflow correct :**
1. Créer votre branche depuis `develop`
2. Faire vos modifications
3. Ouvrir une PR vers `develop`
4. Une fois mergée, vos changements feront partie de la prochaine release

Pour plus de détails, consultez le fichier `AGENTS.md`.
