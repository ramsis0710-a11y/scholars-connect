// ============================================================
// VOICE-ENHANCER.JS - Module Frontend Autonome (v2)
// Support natif des 6 langues officielles de l'ONU
// ============================================================
(function() {
    console.log('[voice-enhancer] Module chargé (Support ONU : ar, zh, en, fr, ru, es).');

    // Codes BCP-47 officiels pour les 6 langues de l'ONU
    const UN_LANGUAGES = {
        'ar': 'ar-SA', // Arabe
        'zh': 'zh-CN', // Chinois (Mandarin)
        'en': 'en-US', // Anglais
        'fr': 'fr-FR', // Français
        'ru': 'ru-RU', // Russe
        'es': 'es-ES'  // Espagnol
    };

    // ========================================================
    // 1. DICTÉE VOCALE MULTILINGUE AMÉLIORÉE
    // ========================================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true; 

        // Détection automatique de la langue de l'OS au démarrage
        const userLang = (navigator.language || 'en-US').split('-')[0];
        recognition.lang = UN_LANGUAGES[userLang] || 'en-US';

        let isRecording = false;
        let finalTranscript = '';
        let silenceTimer = null;

        const getInput = () => document.getElementById('chatInput');
        const getSendBtn = () => document.getElementById('btnSend');
        const getMicBtn = () => document.getElementById('micBtn');

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
            if (inp) inp.value = finalTranscript + interim;

            // Temps mort de 5 secondes avant arrêt
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (isRecording) recognition.stop();
            }, 5000);
        };

        recognition.onend = () => {
            isRecording = false;
            const mb = getMicBtn();
            if (mb) { mb.style.background = '#dc2626'; mb.innerHTML = '🎤'; }
            
            // Préavis de confirmation
            const text = getInput() ? getInput().value.trim() : '';
            if (text.length > 0) {
                const confirmSend = confirm("📝 Dictée terminée :\n\n\"" + text + "\"\n\nVoulez-vous envoyer cette question ?\n(Cliquez sur 'Annuler' pour modifier le texte)");
                if (confirmSend && getSendBtn()) {
                    getSendBtn().click();
                }
            }
        };

        // Gestion du bouton micro
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
                        // Forcer la langue de l'OS pour la reconnaissance
                        const currentLang = (navigator.language || 'en-US').split('-')[0];
                        recognition.lang = UN_LANGUAGES[currentLang] || 'en-US';
                        try { recognition.start(); } catch(err) {}
                    }
                });
            }
        }, 1000);
    }

    // ========================================================
    // 2. LECTURE VOCALE (SYNTHÈSE) AVEC VOIX NATIVE ONU
    // ========================================================
    function speakWithNativeVoice(text) {
        if (!('speechSynthesis' in window)) return;
        
        // Détecte la langue du texte pour choisir la voix
        const langCode = (navigator.language || 'en-US').split('-')[0];
        const targetLang = UN_LANGUAGES[langCode] || 'en-US';

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang;

        // Chercher une voix correspondant exactement à la langue
        const voices = speechSynthesis.getVoices();
        const nativeVoice = voices.find(v => v.lang === targetLang) || 
                            voices.find(v => v.lang.startsWith(langCode));
        
        if (nativeVoice) {
            utterance.voice = nativeVoice;
        }

        speechSynthesis.speak(utterance);
    }

    // Hook sur le bouton d'envoi pour lire la réponse si la case "Lecture vocale auto" est cochée
    setInterval(() => {
        const sendBtn = document.getElementById('btnSend');
        if (sendBtn && !sendBtn.dataset.voiceHooked) {
            sendBtn.dataset.voiceHooked = 'true';
            sendBtn.addEventListener('click', () => {
                // On attend que la réponse arrive dans le DOM (via MutationObserver)
            });
        }
    }, 1000);

    // Observer pour lire les nouvelles réponses
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

    // ========================================================
    // 3. TRADUCTION & PARTAGE (INCHANGÉ)
    // ========================================================
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

    function enhanceMessages() {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;
        chatContainer.querySelectorAll('.msg').forEach(addActionButtons);
    }
    setInterval(enhanceMessages, 2000);

})();