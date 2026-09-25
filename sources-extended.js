// SOURCES-EXTENDED.JS - 30 sources supplementaires
// Inclut : ArXiv, PubMed, Google Scholar, LinkedIn, YouTube

module.exports = {

    // ============================================================
    // ARXIV - Categories scientifiques (8 sources)
    // ============================================================
    arxiv: [
        { url: 'https://arxiv.org/list/cs.LG/recent',     domain: 'IA & KMS' },  // Machine Learning
        { url: 'https://arxiv.org/list/cs.NE/recent',     domain: 'IA & KMS' },  // Neural Networks
        { url: 'https://arxiv.org/list/cs.CV/recent',     domain: 'IA & KMS' },  // Computer Vision
        { url: 'https://arxiv.org/list/cs.RO/recent',     domain: 'IA & KMS' },  // Robotics
        { url: 'https://arxiv.org/list/cs.DB/recent',     domain: 'IA & KMS' },  // Databases
        { url: 'https://arxiv.org/list/cs.SE/recent',     domain: 'IA & KMS' },  // Software Engineering
        { url: 'https://arxiv.org/list/math.ST/recent',   domain: 'Sciences'  },  // Statistiques
        { url: 'https://arxiv.org/list/physics.gen-ph/recent', domain: 'Sciences' } // Physique
    ],

    // ============================================================
    // PUBMED - Recherches medicales (6 sources)
    // ============================================================
    pubmed: [
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=artificial+intelligence+diagnosis', domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=precision+medicine',                domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=genomic+therapy',                   domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=machine+learning+oncology',         domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=telemedicine+2025',                 domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=nanomedicine',                      domain: 'Sante' }
    ],

    // ============================================================
    // GOOGLE SCHOLAR - Articles academiques (4 sources)
    // ============================================================
    googleScholar: [
        { url: 'https://scholar.google.com/scholar?q=semantic+vector+kms&as_ylo=2024',   domain: 'IA & KMS' },
        { url: 'https://scholar.google.com/scholar?q=quantum+finance+risk&as_ylo=2024',  domain: 'Finance' },
        { url: 'https://scholar.google.com/scholar?q=energy+transition+ai&as_ylo=2024',  domain: 'Energie' },
        { url: 'https://scholar.google.com/scholar?q=edtech+adaptive+learning',          domain: 'Education' }
    ],

    // ============================================================
    // LINKEDIN - Articles Pulse MBA-CONSULT (5 sources)
    // ============================================================
    linkedin: [
        { url: 'https://www.linkedin.com/pulse/mba-consult-propulse-le-protocole-titanium-v390-dafxf/', domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/feed/update/urn:li:activity:7474851474146168833/',                domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/feed/update/urn:li:activity:7467144998363480064/',                domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/pulse/epistemologie-transformation-digitale-maturite-ndqdf/',     domain: 'Education' },
        { url: 'https://www.linkedin.com/pulse/intelligence-artificielle-medecine-vers-une-disparition-metamorphose/', domain: 'Sante' }
    ],

    // ============================================================
    // YOUTUBE - Transcriptions videos (4 sources via RSS)
    // ============================================================
    youtube: [
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbmNph6atAoGfqLoCL_duAg', domain: 'IA & KMS' }, // TED
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWX3g0Pf_i-NaGtFf_6kQkg', domain: 'IA & KMS' }, // MIT
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA', domain: 'Sciences' }, // Veritasium
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQqrs8EL7J-8sXx7QY6iHKg', domain: 'Finance' }   // Finance
    ],

    // ============================================================
    // ORGANISATIONS INTERNATIONALES (3 sources)
    // ============================================================
    organizations: [
        { url: 'https://www.imf.org/en/News',                     domain: 'Finance' },
        { url: 'https://www.worldbank.org/en/news',               domain: 'Finance' },
        { url: 'https://www.weforum.org/agenda/archive/',         domain: 'Commerce' }
    ],

    // ============================================================
    // AGREGATEURS DE NEWS TECH (2 sources)
    // ============================================================
    techNews: [
        { url: 'https://news.ycombinator.com/',                   domain: 'IA & KMS' },
        { url: 'https://techcrunch.com/',                         domain: 'IA & KMS' }
    ]
};