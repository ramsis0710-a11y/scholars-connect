'use strict';
var https = require('https');
var SITE = String(process.env.SEO_URL || 'https://scholars-connect-app.onrender.com').replace(/\/+$/, '');
var TITLE = 'MBA-CONSULT | Intelligence Commerciale & IA';
var DESC = "Cabinet d'expertise en intelligence commerciale, KMS et transformation digitale. Scholars Connect : assistant acad\u00e9mique et technique propuls\u00e9 par MBA-CONSULT AI CORE.";
var PRIVATE = ['/chat', '/admin', '/upload-qp', '/qp-admin', '/qp-pdf', '/api', '/uploads', '/login', '/register'];
var STARTED = new Date().toISOString().slice(0, 10);
var JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": SITE + "/#org", name: "MBA-CONSULT", url: SITE + "/", logo: SITE + "/logo-mba.png",
      description: "Cabinet d'expertise en intelligence commerciale, KMS et transformation digitale.",
      email: "contact@mba.consult.tn", telephone: "+216 29 205 260",
      address: { "@type": "PostalAddress", addressLocality: "Sfax", addressCountry: "TN" },
      founder: { "@type": "Person", name: "Mohamed Ben Abdallah" } },
    { "@type": "WebSite", "@id": SITE + "/#site", url: SITE + "/", name: "MBA-CONSULT - Scholars Connect",
      publisher: { "@id": SITE + "/#org" }, inLanguage: ["fr", "en", "ar"] }
  ]
}).replace(/</g, "\\u003c");

function isPrivate(p) {
  p = String(p || '/').toLowerCase().replace(/\.html$/, '');
  for (var i = 0; i < PRIVATE.length; i++) {
    if (p === PRIVATE[i] || p.indexOf(PRIVATE[i] + '/') === 0) return true;
  }
  return false;
}

function transform(html, reqPath) {
  var p = String(reqPath || '/').split('?')[0];
  var isHome = (p === '/' || p === '/index.html');
  var h = String(html).replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/ig, '');
  var add = '';
  if (!isHome) {
    add += '<meta name="robots" content="noindex,nofollow">';
  } else {
    add += '<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">';
    if (!/<title[\s>]/i.test(h)) add += '<title>' + TITLE + '</title>';
    if (!/name=["']description["']/i.test(h)) add += '<meta name="description" content="' + DESC + '">';
    if (!/rel=["']canonical["']/i.test(h)) add += '<link rel="canonical" href="' + SITE + '/">';
    if (!/application\/ld\+json/i.test(h)) add += '<script type="application/ld+json">' + JSON_LD + '</script>';
  }
  if (/<\/head>/i.test(h)) return h.replace(/<\/head>/i, function () { return add + '</head>'; });
  return add + h;
}

function install(app) {
  app.use(function (req, res, next) {
    if (isPrivate(req.path)) res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.get('/robots.txt', function (req, res) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('text/plain').send(['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /uploads/', 'Disallow: /qp-pdf/', '', 'Sitemap: ' + SITE + '/sitemap.xml', ''].join('\n'));
  });
  app.get('/sitemap.xml', function (req, res) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + SITE + '/</loc><lastmod>' + STARTED + '</lastmod></url>\n</urlset>\n');
  });
  if (process.env.RENDER && process.env.KEEP_AWAKE !== '0') {
    setInterval(function () {
      try { https.get(SITE + '/api/health', function (r) { r.resume(); }).on('error', function () {}); } catch (e) {}
    }, 10 * 60 * 1000);
  }
}

module.exports = install;
module.exports.transform = transform;