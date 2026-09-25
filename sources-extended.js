// SOURCES-EXTENDED.JS
// 30 sources supplementaires pour le scraping automatique
module.exports = {
    arxiv: [
        { url: 'https://arxiv.org/list/cs.LG/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/cs.NE/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/cs.CV/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/cs.RO/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/cs.DB/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/cs.SE/recent',     domain: 'IA & KMS' },
        { url: 'https://arxiv.org/list/math.ST/recent',   domain: 'Sciences'  },
        { url: 'https://arxiv.org/list/physics.gen-ph/recent', domain: 'Sciences' }
    ],
    pubmed: [
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=artificial+intelligence+diagnosis', domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=precision+medicine',                domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=genomic+therapy',                   domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=machine+learning+oncology',         domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=telemedicine+2025',                 domain: 'Sante' },
        { url: 'https://pubmed.ncbi.nlm.nih.gov/?term=nanomedicine',                      domain: 'Sante' }
    ],
    googleScholar: [
        { url: 'https://scholar.google.com/scholar?q=semantic+vector+kms&as_ylo=2024',   domain: 'IA & KMS' },
        { url: 'https://scholar.google.com/scholar?q=quantum+finance+risk&as_ylo=2024',  domain: 'Finance' },
        { url: 'https://scholar.google.com/scholar?q=energy+transition+ai&as_ylo=2024',  domain: 'Energie' },
        { url: 'https://scholar.google.com/scholar?q=edtech+adaptive+learning',          domain: 'Education' }
    ],
    linkedin: [
        { url: 'https://www.linkedin.com/pulse/mba-consult-propulse-le-protocole-titanium-v390-dafxf/', domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/feed/update/urn:li:activity:7474851474146168833/',                domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/feed/update/urn:li:activity:7467144998363480064/',                domain: 'IA & KMS' },
        { url: 'https://www.linkedin.com/pulse/epistemologie-transformation-digitale-maturite-ndqdf/',     domain: 'Education' },
        { url: 'https://www.linkedin.com/pulse/intelligence-artificielle-medecine-vers-une-disparition-metamorphose/', domain: 'Sante' }
    ],
    youtube: [
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbmNph6atAoGfqLoCL_duAg', domain: 'IA & KMS' },
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWX3g0Pf_i-NaGtFf_6kQkg', domain: 'IA & KMS' },
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA', domain: 'Sciences' },
        { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQqrs8EL7J-8sXx7QY6iHKg', domain: 'Finance' }
    ],
    organizations: [
        { url: 'https://www.imf.org/en/News',              domain: 'Finance' },
        { url: 'https://www.worldbank.org/en/news',        domain: 'Finance' },
        { url: 'https://www.weforum.org/agenda/archive/',  domain: 'Commerce' }
    ],
    techNews: [
        { url: 'https://news.ycombinator.com/',            domain: 'IA & KMS' },
        { url: 'https://techcrunch.com/',                  domain: 'IA & KMS' }
    ]
};