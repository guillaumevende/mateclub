-- Migration : Ajout du champ last_login à la table users
-- Date : 2026-03-31
-- Description : Ajoute la colonne last_login pour tracker la dernière connexion des utilisateurs

-- Vérifier si la colonne n'existe pas déjà
ALTER TABLE users ADD COLUMN last_login DATETIME;

-- Mettre à jour les utilisateurs existants : last_login = created_at (fallback)
UPDATE users SET last_login = created_at WHERE last_login IS NULL;

-- Vérification
SELECT id, pseudo, created_at, last_login FROM users LIMIT 5;
