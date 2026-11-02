'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const MONGODB_URI = process.env.MONGODB_URI;
const API_BASE = 'https://scholars-connect-app.onrender.com';

async function main() {
  console.log('=== DIAGNOSTIC COMPLET ===\n');
  
  // 1. Verifier l'URI et le nom de la base
  console.log('[1] MONGODB_URI :');
  console.log('    ' + MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  const dbNameMatch = MONGODB_URI.match(/\/([^\/?]+)(\?|$)/);
  const dbName = dbNameMatch ? dbNameMatch[1] : '(non specifie -> test par defaut)';
  console.log('    Nom de base : ' + dbName);
  
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('    [OK] Connecte\n');
  
  // 2. Verifier le schema User dans server.js
  console.log('[2] Schema User dans server.js :');
  const fs = require('fs');
  const serverContent = fs.readFileSync('server.js', 'utf8');
  const userSchemaMatch = serverContent.match(/userSchema\s*=\s*new\s+mongoose\.Schema\(\{[\s\S]*?\}\);/);
  if (userSchemaMatch) {
    const s = userSchemaMatch[0];
    console.log('    ' + s.replace(/\n/g, '\n    ').slice(0, 600));
    console.log('    lowercase: ' + (s.includes('lowercase') ? 'OUI (PROBLEME !)' : 'non'));
    console.log('    select:false: ' + (s.includes('select') ? 'OUI' : 'non'));
    console.log('    type:Buffer: ' + (s.includes('Buffer') ? 'OUI (PROBLEME !)' : 'non'));
  }
  console.log('');
  
  // 3. Verifier le compte mba
  console.log('[3] Compte mba@mba-consult.tn :');
  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const mba = await usersCollection.findOne({ email: 'mba@mba-consult.tn' });
  
  if (!mba) {
    console.log('    [KO] N\'EXISTE PAS dans ' + db.databaseName);
    process.exit(1);
  }
  
  console.log('    [OK] existe');
  console.log('    id     : ' + mba._id);
  console.log('    hash   : ' + (mba.password ? mba.password.slice(0, 30) + '...' : 'VIDE'));
  console.log('    type   : ' + typeof mba.password);
  console.log('    length : ' + (mba.password ? mba.password.length : 0));
  
  // 4. Tester bcrypt.compare avec plusieurs variantes
  console.log('\n[4] Test bcrypt.compare :');
  const variants = [
    'MbaConsult2026!',
    'mbaconsult2026!',
    'MBACONSULT2026!',
    'Test123!'
  ];
  
  for (const v of variants) {
    try {
      const ok = await bcrypt.compare(v, String(mba.password));
      console.log('    "' + v + '" -> ' + (ok ? 'MATCH !' : 'non'));
    } catch(e) {
      console.log('    "' + v + '" -> ERREUR : ' + e.message);
    }
  }
  
  // 5. Tester l'API Render directement
  console.log('\n[5] Test API Render /api/auth/login :');
  for (const v of variants) {
    try {
      const r = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mba@mba-consult.tn', password: v })
      });
      console.log('    "' + v + '" -> HTTP ' + r.status);
      if (r.ok) {
        const data = await r.json();
        console.log('    [MATCH API] token recu !');
      }
    } catch(e) {
      console.log('    "' + v + '" -> ERREUR : ' + e.message);
    }
  }
  
  // 6. Verifier les autres bases
  console.log('\n[6] Bases de donnees disponibles :');
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  dbs.databases.forEach(function(d) {
    console.log('    - ' + d.name + ' (' + Math.round(d.sizeOnDisk/1024) + ' Ko)');
  });
  
  // 7. Compter les Q/R
  const qaCollection = db.collection('qas');
  const total = await qaCollection.countDocuments({});
  console.log('\n[7] Total Q/R dans ' + db.databaseName + ' : ' + total);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(function(e) {
  console.error('[diag] ERREUR :', e.message);
  process.exit(1);
});