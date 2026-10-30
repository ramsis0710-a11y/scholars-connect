// ============================================================
// VOICE-ENHANCER.JS - v3.0 (Fix Arabe + Continuité garantie)
// ============================================================
(function() {
    console.log('[voice-enhancer] v3.0 chargé. Support natif multilingue + continuité.');

    // 1. INJECTION DU SÉLECTEUR DE LANGUE DE DICTÉE
    function injectLanguageSelector() {
        if (document.getElementById('dictationLangSelect')) return;
        const micBtn = document.getElementById('micBtn');
        if (!micBtn) return;

        const select = document.createElement('select');
        select.id = 'dictationLangSelect';
        select.style.cssText = 'margin-left: 8px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; background: white; cursor: pointer;';
        select.innerHTML = `
            <option value="auto">🌐 Auto (Système)</option>
            <option value="ar-SA">🇸🇦 Arabe</option>
            <option value="fr-FR">🇫🇷 Français</option>
            <option value="en-US">🇬🇧 Anglais</option>
            <option value="zh-CN">🇨🇳 Chinois</option>
            <option value="ru-RU">🇷🇺 Russe</option>
            <option value="es-ES">🇪🇸 Espagnol</option>
        `;
        micBtn.parentNode.insertBefore(select, micBtn.nextSibling);
    }
    setInterval(injectLanguageSelector, 1000);

    // 2. DICTÉE VOCALE MULTILINGUE
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true; 

        let isRecording = false;
        let finalTranscript = '';
        let silenceTimer = null;

        const getInput = () => document.getElementById('chatInput');
        const getSendBtn = () => document.getElementById('btnSend');
        const getMicBtn = () => document.getElementById('micBtn');
        const getLangSelect = () => document.getElementById('dictationLangSelect');

        recognition.onstart = () => {
            isRecording = true;
            const mb = getMicBtn();
            if (mb) { mb.style.background = '#16a34a'; mb.innerHTML = '⏹'; }
        };

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            const inp = getInput();
            if (inp) {
                inp.value = finalTranscript + interim;
                
                // Détection automatique : si le texte contient de l'arabe et que le mode est "auto"
                if (getLangSelect() && getLangSelect().value === 'auto') {
                    if (/[\u0600-\u06FF]/.test(inp.value)) {
                        recognition.lang = 'ar-SA';
                        getLangSelect().value = 'ar-SA'; // Mise à jour visuelle
                    }
                }
            }

            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (isRecording) recognition.stop();
            }, 5000); // Temps mort de 5s
        };

        recognition.onend = () => {
            isRecording = false;
            const mb = getMicBtn();
            if (mb) { mb.style.background = '#dc2626'; mb.innerHTML = '🎤'; }
            
            const text = getInput() ? getInput().value.trim() : '';
            if (text.length > 0) {
                // Confirmation avant envoi (l'IA ne clôture pas, c'est l'utilisateur qui choisit)
                const confirmSend = confirm("📝 Dictée terminée :\n\n\"" + text + "\"\n\nVoulez-vous envoyer cette question ?");
                if (confirmSend && getSendBtn()) {
                    getSendBtn().click();
                }
            }
        };

        setInterval(() => {
            const mb = getMicBtn();
            if (mb && !mb.dataset.enhanced) {
                mb.dataset.enhanced = 'true';
                mb.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isRecording) {
                        recognition.stop();
                    } else {
                        finalTranscript = '';
                        const sel = getLangSelect();
                        if (sel && sel.value !== 'auto') {
                            recognition.lang = sel.value;
                        } else {
                            const userLang = (navigator.language || 'en-US').split('-')[0];
                            const langMap = { 'ar':'ar-SA', 'zh':'zh-CN', 'en':'en-US', 'fr':'fr-FR', 'ru':'ru-RU', 'es':'es-ES' };
                            recognition.lang = langMap[userLang] || 'en-US';
                        }
                        try { recognition.start(); } catch(err) {}
                    }
                });
            }
        }, 1000);
    }

    // 3. LECTURE VOCALE ET CONTINUITÉ
    function speakWithNativeVoice(text) {
        if (!('speechSynthesis' in window)) return;
        const isArabic = /[\u0600-\u06FF]/.test(text);
        const targetLang = isArabic ? 'ar-SA' : 'fr-FR';

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang;
        const voices = speechSynthesis.getVoices();
        const nativeVoice = voices.find(v => v.lang === targetLang);
        if (nativeVoice) utterance.voice = nativeVoice;
        speechSynthesis.speak(utterance);
    }

    // Lecture vocale auto à l'arrivée des messages
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer && !chatContainer.dataset.voiceObserver) {
        chatContainer.dataset.voiceObserver = 'true';
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('msg') && node.classList.contains('bot')) {
                        const voiceAutoCheck = document.getElementById('voiceAuto');
                        if (voiceAutoCheck && voiceAutoCheck.checked) {
                            speakWithNativeVoice(node.innerText || node.textContent);
                        }
                    }
                });
            });
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
    }

    // 4. TRADUCTION & PARTAGE
    function addActionButtons(msgElement) {
        if (msgElement.querySelector('.enhanced-actions')) return;
        const actions = document.createElement('div');
        actions.className = 'enhanced-actions';
        actions.style.cssText = 'margin-top:8px; display:flex; gap:8px; font-size:12px;';
        const text = msgElement.innerText || msgElement.textContent;

        const translateBtn = document.createElement('button');
        translateBtn.innerHTML = '🌐 Traduire';
        translateBtn.style.cssText = 'background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:4px 8px; cursor:pointer;';
        translateBtn.onclick = async () => {
            const lang = prompt("Traduire en quelle langue ? (ex: fr, en, ar, es, ru, zh)", "en");
            if (!lang) return;
            translateBtn.innerHTML = '⏳...';
            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`);
                const json = await res.json();
                const translated = json[0].map(item => item[0]).join('');
                const transDiv = document.createElement('div');
                transDiv.style.cssText = 'margin-top:6px; padding:8px; background:#e0f2fe; border-radius:4px; border-left:3px solid #1e5aa8;';
                transDiv.innerHTML = `<strong>🌐 [${lang.toUpperCase()}] :</strong> ${translated}`;
                msgElement.appendChild(transDiv);
                translateBtn.innerHTML = '🌐 Traduire';
            } catch (e) { alert("Erreur de traduction."); translateBtn.innerHTML = '🌐 Traduire'; }
        };

        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '📤 Partager';
        shareBtn.style.cssText = 'background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:4px 8px; cursor:pointer;';
        shareBtn.onclick = async () => {
            if (navigator.share) {
                try { await navigator.share({ title: 'Scholars Connect', text: text }); } catch (e) {}
            } else {
                navigator.clipboard.writeText(text);
                alert("Texte copié !");
            }
        };

        actions.appendChild(translateBtn);
        actions.appendChild(shareBtn);
        msgElement.appendChild(actions);
    }

    setInterval(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) chatContainer.querySelectorAll('.msg').forEach(addActionButtons);
    }, 2000);

    // 5. GARANTIE DE CONTINUITÉ (l'IA ne ferme jamais le chat)
    // On supprime toute tentative de fermeture automatique ou de redirection
    window.addEventListener('beforeunload', (e) => {
        // On empêche la fermeture si c'est l'IA qui tente de le faire (via un flag)
        if (window._aiClosingChat) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

})();