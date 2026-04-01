// Script de diagnostic pour l'authentification
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const password = 'test12345678';

// Générer un nouveau hash valide
console.log('=== Génération hash ===');
const newHash = bcrypt.hashSync(password, 10);
console.log('Nouveau hash:', newHash);
console.log('Vérification immédiate:', bcrypt.compareSync(password, newHash));

// Vérifier l'ancien hash
const oldHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrYpQGgHhCGaOrLySP/MVBKX0VgKpy';
console.log('\n=== Test ancien hash ===');
console.log('Ancien hash:', oldHash);
console.log('Vérification:', bcrypt.compareSync(password, oldHash));

// Vérifier dans la base de données
try {
    const db = new Database('data/mateclub.db');
    console.log('\n=== Vérification DB ===');
    
    const user = db.prepare('SELECT id, pseudo, password_hash FROM users WHERE pseudo = ?').get('Guillaume');
    if (user) {
        console.log('Utilisateur trouvé:', user.pseudo);
        console.log('Hash stocké:', user.password_hash);
        console.log('Vérification avec hash stocké:', bcrypt.compareSync(password, user.password_hash));
        
        // Mettre à jour avec le nouveau hash valide
        console.log('\n=== Mise à jour ===');
        db.prepare('UPDATE users SET password_hash = ? WHERE pseudo = ?').run(newHash, 'Guillaume');
        console.log('Mot de passe mis à jour avec le nouveau hash');
        
        // Vérifier la mise à jour
        const updated = db.prepare('SELECT password_hash FROM users WHERE pseudo = ?').get('Guillaume');
        console.log('Nouveau hash en DB:', updated.password_hash);
        console.log('Vérification finale:', bcrypt.compareSync(password, updated.password_hash));
    } else {
        console.log('ERREUR: Utilisateur Guillaume non trouvé!');
    }
    
    db.close();
} catch (err) {
    console.error('ERREUR DB:', err.message);
}
