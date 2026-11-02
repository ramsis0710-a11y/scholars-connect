'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI absente'); process.exit(1); }

const NEW_PASSWORD = 'MbaConsult2026!';

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('[reset] MongoDB connecte\n');
  
  const User = mongoose.model('User', new mongoose.Schema({}), 'users');
  const QA = mongoose.model('QA', new mongoose.Schema({}), 'qas');
  
  // 1. Reset password
  const mba = await User.findOne({ email: 'mba@mba-consult.tn' }).lean();
  if (!mba) {
    console.error('[reset] Compte mba@mba-consult.tn introuvable !');
    process.exit(1);
  }
  
  const newHash = await bcrypt.hash(NEW_PASSWORD, 10);
  await User.updateOne({ _id: mba._id }, { $set: { password: newHash } });
  console.log('[reset] Mot de passe reinitialise pour mba@mba-consult.tn');
  console.log('        Nouveau mot de passe : ' + NEW_PASSWORD);
  console.log('        ID : ' + mba._id);
  
  // 2. Nettoyer les prefixes dans QA
  console.log('\n[reset] Nettoyage des prefixes dans les 276 Q/R...');
  const allQA = await QA.find({ userId: mba._id }).lean();
  let cleaned = 0;
  
  for (const qa of allQA) {
    let newQuestion = qa.question || '';
    let newAnswer = qa.answer || '';
    let modified = false;
    
    // Pattern 1 : "Answer the following question in French (Francais) only:\n\n"
    const prefixRegex = /^Answer\s+the\s+following\s+question[^:]*:\s*/i;
    if (prefixRegex.test(newQuestion)) {
      newQuestion = newQuestion.replace(prefixRegex, '').trim();
      modified = true;
    }
    
    // Pattern 2 : "Nouvelle question : "
    const nqRegex = /^Nouvelle question\s*:\s*/i;
    if (nqRegex.test(newQuestion)) {
      newQuestion = newQuestion.replace(nqRegex, '').trim();
      modified = true;
    }
    
    // Pattern 3 : contient "=== HISTORIQUE" - extraire la derniere question
    const histMatch = newQuestion.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
    if (histMatch) {
      newQuestion = histMatch[1].trim();
      modified = true;
    }
    
    // Pattern 4 : "Reponse detaillee" dans answer
    if (newAnswer.indexOf('Reponse detaillee') === 0) {
      newAnswer = newAnswer.replace(/^Reponse detaillee\s*/i, '').trim();
      modified = true;
    }
    
    if (modified) {
      await QA.updateOne({ _id: qa._id }, { $set: { question: newQuestion, answer: newAnswer } });
      cleaned++;
    }
  }
  
  console.log('[reset] ' + cleaned + ' Q/R nettoyees sur ' + allQA.length);
  
  // 3. Verification
  const verify = await User.findOne({ email: 'mba@mba-consult.tn' }).lean();
  const verifyOK = await bcrypt.compare(NEW_PASSWORD, verify.password);
  console.log('\n[reset] Verification du mot de passe : ' + (verifyOK ? 'OK' : 'ECHEC'));
  
  const count = await QA.countDocuments({ userId: mba._id });
  console.log('[reset] Q/R finales : ' + count);
  
  // 4. Exemples apres nettoyage
  const samples = await QA.find({ userId: mba._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\n[reset] 5 dernieres Q/R :');
  samples.forEach(function(s, i) {
    console.log('  Q' + (i+1) + ': ' + String(s.question || '').slice(0, 70));
  });
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(function(e) { console.error('[reset] ERREUR :', e.message); process.exit(1); });