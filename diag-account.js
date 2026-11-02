'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI absente'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('[diag] MongoDB connecte\n');
  
  const User = mongoose.model('User', new mongoose.Schema({}), 'users');
  const QA = mongoose.model('QA', new mongoose.Schema({}), 'qas');
  
  const mba = await User.findOne({ email: 'mba@mba-consult.tn' }).lean();
  console.log('[diag] Compte mba@mba-consult.tn :');
  if (mba) {
    console.log('  [OK] existe');
    console.log('  id     : ' + mba._id);
    console.log('  name   : ' + (mba.name || 'n/a'));
    console.log('  role   : ' + (mba.role || 'n/a'));
    console.log('  hash   : ' + (mba.password ? mba.password.slice(0, 20) + '...' : 'VIDE'));
    const count = await QA.countDocuments({ userId: mba._id });
    console.log('  Q/R    : ' + count + ' historique(s)');
    const samples = await QA.find({ userId: mba._id }).sort({ createdAt: -1 }).limit(3).lean();
    samples.forEach(function(s, i) {
      console.log('    Q' + (i+1) + ': ' + String(s.question || '').slice(0, 60));
    });
  } else {
    console.log('  [KO] N\'EXISTE PAS');
  }
  
  console.log('\n[diag] Autres comptes recents :');
  const others = await User.find().sort({ _id: -1 }).limit(5).lean();
  others.forEach(function(u) {
    console.log('  - ' + u.email + ' (id=' + u._id + ')');
  });
  
  console.log('\n[diag] Total Q/R dans MongoDB :');
  const total = await QA.countDocuments({});
  console.log('  ' + total + ' document(s)');
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(function(e) { console.error('[diag] ERREUR :', e.message); process.exit(1); });