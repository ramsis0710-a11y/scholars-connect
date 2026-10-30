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
9. answer-enricher.js INTACT (hash D6D35CF46FC3057A6C2A2560E52C008EE099A64CC12FB060714B628DAFC71C01)
10. fix-final.js DESACTIVE dans server.js

## Fichiers proteges - NE PAS TOUCHER

- answer-enricher.js : hash SHA256 D6D35CF46FC3057A6C2A2560E52C008EE099A64CC12FB060714B628DAFC71C01
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
