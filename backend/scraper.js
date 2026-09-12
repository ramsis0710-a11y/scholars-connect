const { chromium } = require('playwright');

// ============================================================
// SCRAPER POUR PROFILS SCHOLARS
// Adaptez les selecteurs selon la structure de votre site
// ============================================================
async function scrapeScholarProfile(scholarUrl, selectors = {}) {
    const defaultSelectors = {
        name: '.scholar-name, .profile-name, h1',
        specialty: '.scholar-specialty, .profile-specialty, .field',
        publications: '.publication-item, .paper, article',
        pubTitle: '.pub-title, .paper-title, h3',
        pubYear: '.pub-year, .year, .date'
    };
    
    const s = { ...defaultSelectors, ...selectors };
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto(scholarUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        const data = await page.evaluate((sel) => {
            const nameEl = document.querySelector(sel.name);
            const specialtyEl = document.querySelector(sel.specialty);
            
            const publications = Array.from(document.querySelectorAll(sel.publications))
                .map(p => ({
                    title: p.querySelector(sel.pubTitle)?.textContent?.trim() || '',
                    year: p.querySelector(sel.pubYear)?.textContent?.trim() || ''
                }))
                .filter(p => p.title);
            
            return {
                name: nameEl?.textContent?.trim() || 'Inconnu',
                specialty: specialtyEl?.textContent?.trim() || 'General',
                publications: publications
            };
        }, s);
        
        await browser.close();
        return data;
    } catch (error) {
        await browser.close();
        console.error('Erreur scraping ' + scholarUrl + ':', error.message);
        return null;
    }
}

async function scrapeMultipleScholars(scholarUrls) {
    const results = [];
    for (const url of scholarUrls) {
        const data = await scrapeScholarProfile(url);
        if (data) {
            data.url = url;
            results.push(data);
            console.log('OK - Scrape: ' + data.name);
        }
    }
    return results;
}

module.exports = {
    scrapeScholarProfile,
    scrapeMultipleScholars
};