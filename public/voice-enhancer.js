// ============================================================
// VOICE-ENHANCER.JS - Module Frontend Autonome
// Améliore la dictée, ajoute la traduction, le partage et la 
// confirmation avant envoi. NE TOUCHE PAS au backend.
// ============================================================
(function() {
    console.log('[voice-enhancer] Module chargé.');

    // ========================================================
    // 1. AMELIORATION DE LA DICTEE VOCALE
    // ========================================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Ne s'arrête pas aux pauses
        recognition.interimResults = true; // Affiche le texte en direct
        // Détection automatique de la langue de l'OS
        recognition.lang = navigator.language || 'fr-FR'; 

        let isRecording = false;
        let finalTranscript = '';
        let silenceTimer = null;

        const getInput = () => document.getElementById('chatInput');
        const getSendBtn = () => document.getElementById('btnSend');
        const getMicBtn = () => document.getElementById('micBtn');

        recognition.onstart = () => {
            isRecording = true;
            const mb = getMicBtn();
            if (mb) {
                mb.style.background = '#16a34a'; // Vert = écoute
                mb.innerHTML = '⏹';
            }
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

            // Temps mort accordé : 5 secondes sans parole avant de s'arrêter
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (isRecording) recognition.stop();
            }, 5000);
        };

        recognition.onend = () => {
            isRecording = false;
            const mb = getMicBtn();
            if (mb) {
                mb.style.background = '#dc2626'; // Rouge = arrêt
                mb.innerHTML = '🎤';
            }
            
            // Préavis de confirmation avant de clôturer
            const text = getInput() ? getInput().value.trim() : '';
            if (text.length > 0) {
                const confirmSend = confirm("📝 Dictée terminée :\n\n\"" + text + "\"\n\nVoulez-vous envoyer cette question ?\n(Cliquez sur 'Annuler' pour modifier le texte)");
                if (confirmSend && getSendBtn()) {
                    getSendBtn().click();
                }
            }
        };

        // Remplacement du bouton micro
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
                        try { recognition.start(); } catch(err) {}
                    }
                });
            }
        }, 1000);
    }

    // ========================================================
    // 2. TRADUCTION & PARTAGE SUR CHAQUE MESSAGE
    // ========================================================
    function addActionButtons(msgElement) {
        if (msgElement.querySelector('.enhanced-actions')) return;
        
        const actions = document.createElement('div');
        actions.className = 'enhanced-actions';
        actions.style.marginTop = '8px';
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.fontSize = '12px';

        const text = msgElement.innerText || msgElement.textContent;

        // Bouton Traduire
        const translateBtn = document.createElement('button');
        translateBtn.innerHTML = '🌐 Traduire';
        translateBtn.style.cssText = 'background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:4px 8px; cursor:pointer;';
        translateBtn.onclick = async () => {
            const lang = prompt("Traduire en quelle langue ? (ex: fr, en, ar, es, de, zh, etc.)", "en");
            if (!lang) return;
            translateBtn.innerHTML = '⏳...';
            try {
                // sl=auto détecte automatiquement la langue source
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`);
                const json = await res.json();
                const translated = json[0].map(item => item[0]).join('');
                
                const transDiv = document.createElement('div');
                transDiv.style.cssText = 'margin-top:6px; padding:8px; background:#e0f2fe; border-radius:4px; border-left:3px solid #1e5aa8;';
                transDiv.innerHTML = `<strong>🌐 [${lang.toUpperCase()}] :</strong> ${translated}`;
                msgElement.appendChild(transDiv);
                translateBtn.innerHTML = '🌐 Traduire';
            } catch (e) {
                alert("Erreur de traduction.");
                translateBtn.innerHTML = '🌐 Traduire';
            }
        };

        // Bouton Partager
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '📤 Partager';
        shareBtn.style.cssText = 'background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:4px 8px; cursor:pointer;';
        shareBtn.onclick = async () => {
            const shareData = {
                title: 'Scholars Connect - IA',
                text: text
            };
            if (navigator.share) {
                try { await navigator.share(shareData); } catch (e) {}
            } else {
                navigator.clipboard.writeText(text);
                alert("Texte copié dans le presse-papiers !");
            }
        };

        actions.appendChild(translateBtn);
        actions.appendChild(shareBtn);
        msgElement.appendChild(actions);
    }

    // Application aux messages existants et nouveaux
    function enhanceMessages() {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;
        
        chatContainer.querySelectorAll('.msg').forEach(addActionButtons);

        if (!chatContainer.dataset.observerSet) {
            chatContainer.dataset.observerSet = 'true';
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList.contains('msg')) {
                            addActionButtons(node);
                        }
                    });
                });
            });
            observer.observe(chatContainer, { childList: true, subtree: true });
        }
    }

    setInterval(enhanceMessages, 2000);

})();