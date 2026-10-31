# VERROUILLAGE VERSION STABLE

Date : 2026-10-30 17:10:31
Commit : 099a76335439ccde4c355429093d929bfaf7725c
Tag : v1.0-STABLE-20261030-171023
Branche : stable-20261030-171023

## Fonctionnalites verrouillees

1. Chat multilingue (arabe, francais, anglais)
2. Micro avec selecteur de langue (langSelect)
3. Historique persistant (localStorage scholars_hist_v3)
4. TTS avec boutons play/pause/stop
5. TTS-CLEAN : lecture sans fiche technique
6. Reponses en arabe quand question en arabe
7. Bouton PDF optionnel
8. 18 domaines
9. answer-enricher.js INTACT (hash 52303327654E5B60D560C854401874B6C50570CEEB72802F35554E47B1FD0A66)
10. fix-final.js DESACTIVE dans server.js

## Fichiers proteges - NE PAS TOUCHER

- answer-enricher.js : hash SHA256 52303327654E5B60D560C854401874B6C50570CEEB72802F35554E47B1FD0A66
- server.js : fix-final desactive
- ultimate-bridge.js : 18 domaines actifs
- public/chat.html : modules [unified] et [tts-clean-v2]

## Restauration en cas de probleme

Ouvrir PowerShell et executer :

    cd C:\Users\PC\Desktop\scholars-connect-clean
    git fetch --tags
    git checkout v1.0-STABLE-20261030-171023
    git push origin main --force

Puis sur Render : Manual Deploy -> Clear build cache and deploy

## Tests de validation apres restauration

- Poser 'bonjour' : reponse francaise correcte
- Poser une question en arabe : reponse en arabe
- Choisir Langue=Arabe puis cliquer micro : dictee en arabe
- F5 apres 2 questions : historique persistant
- Boutons play/pause/stop a cote de Lecture vocale auto
- Coche Lecture vocale + question : la voix ne lit pas la Fiche technique
- Bouton PDF sous chaque reponse

## Regles de verrouillage

1. NE PAS modifier answer-enricher.js
2. NE PAS reactiver fix-final.js
3. NE PAS toucher aux modules [unified] et [tts-clean-v2]
4. TOUJOURS verifier node --check server.js avant commit
5. TOUJOURS verifier hash answer-enricher.js avant commit

Document genere par le script de verrouillage.

## Verrouillage v1.3 - 2026-10-31 14:01:57

- answer-enricher.js : 52303327654E5B60D560C854401874B6C50570CEEB72802F35554E47B1FD0A66
- CORRECTION 1 : ragPreprocessAsk ne fait du RAG QUE pour les domaines techniques
- CORRECTION 2 : enrichAnswer extrait la vraie question + respecte req.body.domain
- CORRECTION 3 : RAG seuil releve a 0.30 + technique uniquement dans enrichAnswer
- Effet : "capitale Tunisie" -> Domaine General + pas de RAG
- Effet : "API 5CT" -> Domaine Petrole & Gaz + RAG cible