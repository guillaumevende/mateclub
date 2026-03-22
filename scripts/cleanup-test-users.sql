-- Nettoyage des utilisateurs de test laissés par les tests unitaires
-- À exécuter sur la base de données SQLite

-- Supprimer les utilisateurs tests (ceux créés par les tests avec pattern test_*)
DELETE FROM users WHERE pseudo LIKE 'test_recording_%';
DELETE FROM users WHERE pseudo LIKE 'test_super_%';
DELETE FROM users WHERE pseudo LIKE 'test_user_%';
DELETE FROM users WHERE pseudo LIKE 'test_admin_%';
DELETE FROM users WHERE pseudo LIKE 'test_pwd_%';
DELETE FROM users WHERE pseudo LIKE 'test_hash_%';
DELETE FROM users WHERE pseudo LIKE 'test_excluded_%';
DELETE FROM users WHERE pseudo LIKE 'test_taken_%';
DELETE FROM users WHERE pseudo LIKE 'available_%';
DELETE FROM users WHERE pseudo LIKE 'delete_%';

-- Nettoyer les enregistrements orphelins (sans utilisateur existant)
DELETE FROM recordings WHERE user_id NOT IN (SELECT id FROM users);

-- Nettoyer l'historique d'écoute orphelin
DELETE FROM listening_history WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM listening_history WHERE recording_id NOT IN (SELECT id FROM recordings);

-- Nettoyer les sessions orphelines
DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users);

-- Nettoyer les tokens CSRF orphelins
DELETE FROM csrf_tokens WHERE session_id NOT NULL AND session_id NOT IN (SELECT id FROM sessions);

-- VACUUM pour récupérer l'espace disque
VACUUM;

-- Afficher le nombre d'utilisateurs restants
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_recordings FROM recordings;
