-- ============================================================================
-- Migration v2.6.1 : Conversion des timestamps CEST (UTC+2) vers UTC
-- ============================================================================
-- 
-- ATTENTION : Ce script doit être exécuté UNE SEULE FOIS sur la base de données
-- Exécution : sqlite3 data/mateclub.db < scripts/migrate-timezone.sql
--
-- Contexte :
-- - Les anciens enregistrements étaient stockés avec datetime('now', 'localtime')
--   en CEST (UTC+2) sur le serveur
-- - Cette migration convertit ces timestamps vers UTC en soustrayant 2h
-- - Les nouveaux enregistrements utilisent déjà datetime('now') (UTC)
--
-- Vérification avant migration :
--   SELECT COUNT(*) FROM recordings WHERE recorded_at IS NOT NULL;
--   SELECT MIN(recorded_at), MAX(recorded_at) FROM recordings;
--
-- ============================================================================

-- Journal de début de migration
.print 'Démarrage migration v2.6.1 - Conversion CEST vers UTC';

-- ============================================================================
-- ÉTAPE 1 : Sauvegarde des compteurs avant migration
-- ============================================================================
.print 'Étape 1/4 - Compteurs avant migration :';

SELECT 
    'recordings' as table_name, 
    COUNT(*) as count, 
    MIN(recorded_at) as min_date, 
    MAX(recorded_at) as max_date 
FROM recordings 
WHERE recorded_at IS NOT NULL;

SELECT 
    'users' as table_name, 
    COUNT(*) as count, 
    MIN(created_at) as min_date, 
    MAX(created_at) as max_date 
FROM users 
WHERE created_at IS NOT NULL;

SELECT 
    'listening_history' as table_name, 
    COUNT(*) as count, 
    MIN(listened_at) as min_date, 
    MAX(listened_at) as max_date 
FROM listening_history 
WHERE listened_at IS NOT NULL;

SELECT 
    'pending_registrations' as table_name, 
    COUNT(*) as count, 
    MIN(requested_at) as min_date, 
    MAX(requested_at) as max_date 
FROM pending_registrations 
WHERE requested_at IS NOT NULL;

-- ============================================================================
-- ÉTAPE 2 : Conversion des timestamps recordings (recorded_at)
-- ============================================================================
.print 'Étape 2/4 - Conversion recordings.recorded_at...';

UPDATE recordings 
SET recorded_at = datetime(recorded_at, '-2 hours')
WHERE recorded_at IS NOT NULL 
  AND recorded_at NOT LIKE '%Z'  -- Éviter de reconvertir si déjà au format ISO avec Z
  AND recorded_at < '2026-03-31'; -- Ne convertir que les anciens enregistrements (avant la migration)

.print '  -> recordings.recorded_at converti';

-- ============================================================================
-- ÉTAPE 3 : Conversion des timestamps users (created_at)
-- ============================================================================
.print 'Étape 3/4 - Conversion users.created_at...';

UPDATE users 
SET created_at = datetime(created_at, '-2 hours')
WHERE created_at IS NOT NULL 
  AND created_at NOT LIKE '%Z'
  AND created_at < '2026-03-31';

.print '  -> users.created_at converti';

-- ============================================================================
-- ÉTAPE 4 : Conversion des timestamps listening_history (listened_at)
-- ============================================================================
.print 'Étape 4/4 - Conversion listening_history.listened_at...';

UPDATE listening_history 
SET listened_at = datetime(listened_at, '-2 hours')
WHERE listened_at IS NOT NULL 
  AND listened_at NOT LIKE '%Z'
  AND listened_at < '2026-03-31';

.print '  -> listening_history.listened_at converti';

-- ============================================================================
-- ÉTAPE 5 : Conversion des timestamps pending_registrations (requested_at)
-- ============================================================================
.print 'Étape 5/5 - Conversion pending_registrations.requested_at...';

UPDATE pending_registrations 
SET requested_at = datetime(requested_at, '-2 hours')
WHERE requested_at IS NOT NULL 
  AND requested_at NOT LIKE '%Z'
  AND requested_at < '2026-03-31';

.print '  -> pending_registrations.requested_at converti';

-- ============================================================================
-- Vérification après migration
-- ============================================================================
.print 'Vérification après migration :';

SELECT 
    'recordings' as table_name, 
    COUNT(*) as count, 
    MIN(recorded_at) as min_date, 
    MAX(recorded_at) as max_date 
FROM recordings 
WHERE recorded_at IS NOT NULL;

SELECT 
    'users' as table_name, 
    COUNT(*) as count, 
    MIN(created_at) as min_date, 
    MAX(created_at) as max_date 
FROM users 
WHERE created_at IS NOT NULL;

-- ============================================================================
-- Journal de migration
-- ============================================================================
.print 'Migration v2.6.1 terminée avec succès';
.print 'Les timestamps sont désormais en UTC';
.print '';
.print 'IMPORTANT : Redémarrer l application pour appliquer les changements de schéma';
