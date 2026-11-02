'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI absente'); process.exit(1); }

const AutoFeedSchema = new mongoose.Schema({
  title: String, content: String, domain: String,
  source: String, url: String,
  vector: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'autofeeddocuments' });

const AutoFeedDocument = mongoose.models.AutoFeedDocument || mongoose.model('AutoFeedDocument', AutoFeedSchema);

const STANDARDS = [
  {
    title: 'API Spec 5CT - Casing and Tubing (11e Edition 2023 + Addendum 2025 + Errata 3 2026)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5ct',
    content: `API Spec 5CT / ISO 11960 - Specification for Casing and Tubing.

VERSIONS OFFICIELLES :
- 11e Edition : decembre 2023 (version de base)
- Addendum 1 : mai 2025 (mise a jour critique)
- Errata 1 : 2024
- Errata 2 : 2024
- Errata 3 : juin 2026

DERNIERE VERSION EN VIGUEUR : 11e Edition (Dec 2023) + Addendum 1 (Mai 2025) + Errata 1, 2, 3 (2024-2026).
La 10e edition (2021) est OBSOLETE.

DOMAINE D'APPLICATION : Tubages (casing), tubes de production (tubing), raccords (couplings), pup joints.

GRADES : H40, J55, K55, N80 (type 1 et Q), L80 (type 1, 9Cr, 13Cr), C90, T95, P110, Q125, C110, C125, M65.

EXIGENCES : Analyse chimique, essais de traction, durete, resilience (CVN), inspection dimensionnelle, NDE, marquage.

ADDENDUM 1 (Mai 2025) : Revision des tolerances dimensionnelles, mise a jour des exigences de durete, nouvelles dispositions pour essais de pression.`
  },
  {
    title: 'API Spec 5B - Threading, Gauging and Inspection (17e Edition 2026)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5b',
    content: `API Spec 5B - Threading, Gauging, and Inspection of Casing, Tubing, and Line Pipe Threads.

VERSIONS OFFICIELLES :
- 17e Edition : octobre 2026 (DERNIERE VERSION EN VIGUEUR)
- 16e Edition : decembre 2017 (OBSOLETE)

DERNIERE VERSION EN VIGUEUR : 17e Edition (Oct 2026).

NOUVEAUTES 17e EDITION : Nouvelles exigences pour technologies de mesure optique/laser, clarification sur le jaugeage mecanique traditionnel, mise a jour des tolerances pour jauges buttress, suppression des exigences obsoletes.`
  },
  {
    title: 'API Spec 5L - Line Pipe (47e Edition 2026)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5l',
    content: `API Spec 5L / ISO 3183 - Specification for Line Pipe.

VERSIONS OFFICIELLES :
- 47e Edition : juin 2026 (DERNIERE VERSION EN VIGUEUR)
- 46e Edition : 2018 (OBSOLETE)

DERNIERE VERSION EN VIGUEUR : 47e Edition (Juin 2026).

NOUVEAUTES 47e EDITION : Nouvelles exigences pour pipelines CO2, mise a jour des essais hydrostatiques, certification NDE, essais de pliage, exigences sour service.`
  },
  {
    title: 'API Spec 6A - Wellhead and Tree Equipment (22e Edition 2025)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec6a',
    content: `API Spec 6A / ISO 10423 - Wellhead and Christmas Tree Equipment.

VERSIONS OFFICIELLES :
- 22e Edition : 2025 (DERNIERE VERSION EN VIGUEUR)
- 21e Edition : 2018 (OBSOLETE)

DERNIERE VERSION EN VIGUEUR : 22e Edition (2025).

CLASSIFICATIONS PSL : PSL 1, PSL 2, PSL 3, PSL 3G (sour service), PSL 4.

NOUVEAUTES 22e EDITION : Exigences PSL 3G pour gaz acides, equipements sous-marins, alignement avec API 17D, essais de pression jusqu'a 20 000 psi.`
  },
  {
    title: 'API Spec 7-1 - Rotary Drill Stem Elements (2e Edition + Addendum 2025 + Errata 2025)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-1',
    content: `API Spec 7-1 / ISO 10424-1 - Rotary Drill Stem Elements.

VERSIONS OFFICIELLES :
- 2e Edition : (version de base)
- Addendum 1 : mars 2025
- Errata 1 : 2023
- Errata 2 : 2025

DERNIERE VERSION EN VIGUEUR : 2e Edition + Addendum 1 (Mars 2025) + Errata 1, 2.

DOMAINE : Tiges de forage, masses-tiges, HWDP, raccords de forage.

NOUVEAUTES ADDENDUM 2025 : Mise a jour des references, clarifications sur les essais.`
  },
  {
    title: 'API Spec 7-2 - Threading and Gauging of Rotary Connections (2e Edition 2017)',
    domain: 'Petrole & Gaz',
    source: 'api.org',
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-2',
    content: `API Spec 7-2 / ISO 10424-2 - Threading and Gauging of Rotary Shouldered Connections.

VERSIONS OFFICIELLES :
- 2e Edition : janvier 2017 (DERNIERE VERSION EN VIGUEUR)

DERNIERE VERSION EN VIGUEUR : 2e Edition (Jan 2017).

DOMAINE : Filetages des connexions rotary shouldered (NC, REG, FH, IF), jaugeage.`
  },
  {
    title: 'NACE MR0175 / ISO 15156 - Materials for H2S Service (2021 + ERR 2025)',
    domain: 'Petrole & Gaz',
    source: 'nace.org',
    url: 'https://www.ampp.org/technical-research/impact/corrosion-basics/mr0175-iso-15156',
    content: `NACE MR0175 / ISO 15156 - Materials for Use in H2S-Containing Environments.

VERSIONS OFFICIELLES :
- ANSI/NACE MR0175-2021 / ISO 15156:2020 + ERR:2025 (DERNIERE VERSION EN VIGUEUR)

DERNIERE VERSION EN VIGUEUR : 2021/2020 + Errata 2025 (fevrier 2025).

DOMAINE : Materiaux pour environnements H2S (sour service).`
  }
];

async function seed() {
  try {
    console.log('[seed] Connexion a MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('[seed] MongoDB connecte');
    
    let inserted = 0, updated = 0;
    for (const std of STANDARDS) {
      const existing = await AutoFeedDocument.findOne({ title: std.title });
      if (existing) {
        await AutoFeedDocument.updateOne({ _id: existing._id }, { $set: { ...std, createdAt: new Date() } });
        updated++; console.log('[seed] UPDATE : ' + std.title);
      } else {
        await AutoFeedDocument.create(std);
        inserted++; console.log('[seed] INSERT : ' + std.title);
      }
    }
    
    console.log('\n[seed] ================================');
    console.log('[seed] TERMINE - Insere: ' + inserted + ' | Mis a jour: ' + updated);
    const total = await AutoFeedDocument.countDocuments({});
    console.log('[seed] Total documents : ' + total);
    console.log('[seed] ================================');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[seed] ERREUR :', e.message);
    process.exit(1);
  }
}
seed();