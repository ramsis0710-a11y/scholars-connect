'use strict';
// CONTINUITY.JS - domaine automatique, coupe-RAG hors domaine technique, injection du script client dans /chat
var fs = require('fs');
var path = require('path');
var jwt = null;
try { jwt = require('jsonwebtoken'); } catch (e) { jwt = null; }

var TECH = { 'Petrole & Gaz': 1, 'Plan Qualite': 1, 'Technique': 1 };

var DOMAINS = [
  { name: 'Petrole & Gaz', kw: ['petrole','gaz','forage','drilling','wellhead','tete de puits','tubing','casing','tubage','filetage','thread','coupling','manchon','premium','vam','tenaris','hydril','jfe','nace','h2s','api=','api 5','api 6','api 7','api 11','api 14','14l','psl=','mtc=','oilfield','pipeline','upstream','downstream'] },
  { name: 'Plan Qualite', kw: ['plan qualite','plan de qualite','quality plan','quality control plan','qp standard','plan de controle','control plan'] },
  { name: 'Technique', kw: ['soudure','welding','usinage','ndt=','controle non destructif','tolerance','metrologie','acier','steel','traitement thermique','durete','hardness','fabrication','iso 9001'] },
  { name: 'Geographie', kw: ['capitale','pays','population','habitant','superficie','frontiere','continent','ile','iles=','ville','fleuve','montagne','drapeau','geographie','densite','archipel','ocean','mer=','region'] },
  { name: 'Economie', kw: ['economie','pib=','inflation','chomage','croissance','commerce exterieur','monnaie','dette publique','offre et demande','balance commerciale','budget'] },
  { name: 'Finance', kw: ['bourse','actions boursieres','obligation','investissement','banque','credit','taux d interet','comptabilite','bilan','tresorerie','rentabilite','fiscal','impot'] },
  { name: 'Sante', kw: ['sante','medecin','maladie','symptome','traitement medical','diagnostic','medicament','vaccin','hopital','cancer','diabete','douleur','infection','nutrition'] },
  { name: 'Droit', kw: ['droit','loi=','lois=','code civil','contrat','tribunal','juridique','avocat','jurisprudence','constitution','legislation','article de loi'] },
  { name: 'Religion', kw: ['islam','coran','hadith','priere','ramadan','bible','eglise','mosquee','prophete','fiqh','tafsir','allah','dieu','theologie','charia','hajj'] },
  { name: 'Histoire', kw: ['histoire','guerre mondiale','revolution','empire','antiquite','moyen age','colonisation','dynastie','independance','siecle','bataille','civilisation'] },
  { name: 'Geopolitique', kw: ['geopolitique','sanction','otan=','onu=','conflit','diplomatie','traite de'] },
  { name: 'Litterature', kw: ['roman','poeme','poesie','auteur','litterature','ecrivain','theatre','figure de style','analyse litteraire'] },
  { name: 'Philosophie', kw: ['philosophie','philosophe','kant','platon','aristote','ethique','metaphysique','existentialisme'] },
  { name: 'Langues', kw: ['traduire','traduction','grammaire','conjugaison','vocabulaire','orthographe','anglais','arabe','espagnol','allemand','synonyme','comment dit'] },
  { name: 'Mathematiques', kw: ['calcul','equation','derivee','integrale','probabilite','statistique','matrice','geometrie','theoreme','algebre','fraction','pourcentage','racine carree','resoudre'] },
  { name: 'Informatique', kw: ['code=','programmation','javascript','python','html','css=','sql=','base de donnees','algorithme','serveur','api rest','logiciel','application','reseau informatique','cybersecurite','linux','windows','node','mongodb','bug=','intelligence artificielle','ia=','machine learning'] },
  { name: 'Sciences', kw: ['physique','chimie','biologie','atome','molecule','cellule','gravite','vitesse','astronomie','planete','evolution','adn=','photosynthese'] },
  { name: 'Energie', kw: ['energie','solaire','eolien','nucleaire','electricite','renouvelable','hydrogene','carburant','batterie'] },
  { name: 'Climat', kw: ['climat','rechauffement','co2=','carbone','gaz a effet de serre','pollution','biodiversite','deforestation'] },
  { name: 'Education', kw: ['etudiant','ecole','universite','cours de','examen','bac=','licence','master=','pedagogie','devoir','exercice','enseign','diplome','bourse d etudes'] },
  { name: 'Marketing', kw: ['marketing','publicite','marque','client','vente','prospection','strategie commerciale','branding','reseaux sociaux','seo=','dropshipping','e commerce'] },
  { name: 'Gestion', kw: ['gestion','management','projet','planning','ressources humaines','leadership','organisation','kpi=','entreprise','business plan','swot','pmo=','erp='] },
  { name: 'Immigration', kw: ['immigration','visa','migrant','refugie','asile','titre de sejour','naturalisation'] }
];

function norm(s) {
  return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

function detectDomain(q) {
  var t = norm(q), best = '', bestScore = 0;
  DOMAINS.forEach(function (d) {
    var s = 0;
    d.kw.forEach(function (k) {
      var exact = k.slice(-1) === '=';
      var w = exact ? k.slice(0, -1) : k;
      var needle = ' ' + w + (exact ? ' ' : '');
      if (t.indexOf(needle) !== -1) s += (w.indexOf(' ') !== -1 ? 2 : 1);
    });
    if (s > bestScore) { bestScore = s; best = d.name; }
  });
  return best;
}

module.exports = function (app, mongoose) {

  function userIdOf(req) {
    try {
      var tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      var p = (jwt && tok) ? jwt.decode(tok) : null;
      return p && p.id ? p.id : null;
    } catch (e) { return null; }
  }

  async function lastDomain(req) {
    try {
      var uid = userIdOf(req);
      if (!uid) return '';
      var QA = mongoose.model('QA');
      var since = Date.now() - 3 * 3600 * 1000;
      var ts = parseInt(req.headers['x-thread-start'], 10);
      if (ts > 0) since = ts;
      var it = await QA.findOne({ userId: uid, createdAt: { $gte: new Date(since) } }).sort({ createdAt: -1 }).lean();
      return (it && it.domain && it.domain !== 'General') ? it.domain : '';
    } catch (e) { return ''; }
  }

  // Page /chat : injecte le script client (avant tous les autres scripts)
  app.get(['/chat', '/chat.html'], function (req, res, next) {
    fs.readFile(path.join(__dirname, 'public', 'chat.html'), 'utf8', function (err, html) {
      if (err) return next();
      if (html.indexOf('/continuity.js') === -1) {
        var tag = '<script src="/continuity.js?v=20261107"></script>';
        if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, function (m) { return m + tag; });
        else html = tag + html;
      }
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });
  });

  // Domaine automatique + coupe-RAG hors domaine technique (execute AVANT answer-enricher)
  app.use('/api/ask', function (req, res, next) {
    if (req.method !== 'POST' || !req.body || typeof req.body.question !== 'string') return next();
    var asked = String(req.body.domain || '');
    var auto = (asked === '' || asked === 'General' || asked === 'Auto');
    var q = req.body.question;
    var p = Promise.resolve();
    if (auto) {
      var d = detectDomain(q);
      if (d) { req.body.domain = d; }
      else if (q.length <= 90) {
        p = lastDomain(req).then(function (ld) { if (ld) req.body.domain = ld; });
      }
    }
    p.then(function () {
      if (!TECH[req.body.domain]) req._skipRag = true;
      next();
    });
  });

  console.log('[continuity] charge - domaine auto, historique, dictee 10 s');
};