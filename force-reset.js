'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const MONGODB_URI = process.env.MONGODB_URI;
const API_BASE = 'https://scholars-connect-app.onrender.com';
const NEW_PASSWORD = 'MbaConsult2026!';
const EMAIL = 'mba@mba-consult.tn';

async function main() {
  console.log('=== FORCE RESET PASSWORD (via collection.updateOne) ===\n');
  
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('[1] MongoDB connecte : ' + mongoose.connection.db.databaseName + '\n');
  
  const db = mongoose.connection.db;
  const usersColl = db.collection('users');
  
  // 1. Verifier le compte
  const mba = await usersColl.findOne({ email: EMAIL });
  if (!mba) {
    console.error('[2] Compte introuvable : ' + EMAIL);
    process.exit(1);
  }
  console.log('[2] Compte trouve : ' + mba._id);
  console.log('    Ancien hash : ' + (mba.password || 'VIDE').slice(0, 30) + '...\n');
  
  // 2. Generer le nouveau hash
  const newHash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log('[3] Nouveau hash : ' + newHash);
  console.log('    Length : ' + newHash.length + '\n');
  
  // 3. FORCER l'update via collection.updateOne (contourne Mongoose)
  const updateResult = await usersColl.updateOne(
    { email: EMAIL },
    { $set: { password: newHash } }
  );
  console.log('[4] updateOne result :');
  console.log('    matchedCount : ' + updateResult.matchedCount);
  console.log('    modifiedCount : ' + updateResult.modifiedCount + '\n');
  
  if (updateResult.modifiedCount !== 1) {
    console.error('[ERREUR] Aucune modification appliquee');
    process.exit(1);
  }
  
  // 4. Re-lire depuis MongoDB pour confirmer
  const verify = await usersColl.findOne({ email: EMAIL });
  console.log('[5] Hash apres update : ' + (verify.password || '').slice(0, 30) + '...');
  console.log('    Identique au nouveau : ' + (verify.password === newHash) + '\n');
  
  // 5. Tester bcrypt.compare localement
  const localOK = await bcrypt.compare(NEW_PASSWORD, verify.password);
  console.log('[6] bcrypt.compare local : ' + (localOK ? 'MATCH !' : 'ECHEC'));
  
  // 6. Tester l'API Render (peut prendre 5-10 sec apres deploy)
  console.log('\n[7] Test API Render /api/auth/login :');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: NEW_PASSWORD })
      });
      console.log('    Tentative ' + attempt + ' : HTTP ' + r.status);
      if (r.ok) {
        const data = await r.json();
        console.log('    [MATCH API] Token JWT recu !');
        break;
      }
      if (attempt < 3) {
        console.log('    Attente 3s (Render peut cacher)...');
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch(e) {
      console.log('    Erreur : ' + e.message);
    }
  }
  
  // 7. Compter les Q/R
  const qasColl = db.collection('qas');
  const count = await qasColl.countDocuments({ userId: mba._id });
  console.log('\n[8] Q/R pour ce compte : ' + count);
  
  // 8. Nettoyer les prefixes dans les Q/R
  console.log('\n[9] Nettoyage des prefixes...');
  const allQas = await qasColl.find({ userId: mba._id }).toArray();
  let cleaned = 0;
  
  for (const qa of allQas) {
    let newQ = String(qa.question || '');
    let newA = String(qa.answer || '');
    let modified = false;
    
    if (/^Answer\s+the\s+following\s+question[^:]*:\s*/i.test(newQ)) {
      newQ = newQ.replace(/^Answer\s+the\s+following\s+question[^:]*:\s*/i, '').trim();
      modified = true;
    }
    if (/^Nouvelle question\s*:\s*/i.test(newQ)) {
      newQ = newQ.replace(/^Nouvelle question\s*:\s*/i, '').trim();
      modified = true;
    }
    const histMatch = newQ.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
    if (histMatch) {
      newQ = histMatch[1].trim();
      modified = true;
    }
    if (/^Reponse detaillee\s*/i.test(newA)) {
      newA = newA.replace(/^Reponse detaillee\s*/i, '').trim();
      modified = true;
    }
    
    if (modified) {
      await qasColl.updateOne({ _id: qa._id }, { $set: { question: newQ, answer: newA } });
      cleaned++;
    }
  }
  console.log('    ' + cleaned + ' Q/R nettoyees sur ' + allQas.length);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(function(e) {
  console.error('[force] ERREUR :', e.message);
  console.error(e.stack);
  process.exit(1);
});