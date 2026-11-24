# Fiches de publication — Chrome Web Store, Microsoft Edge & Firefox (AMO)

## 1. Informations communes aux 3 stores
- **Nom** : CareBreak (localisé via `_locales/*/messages.json`)
- **Version** : `1.2.2`
- **Catégorie** :
  - Chrome Web Store : *Productivité* (Productivity) ou *Bien-être*
  - Microsoft Edge Add-ons : *Productivité* (Productivity)
  - Firefox Add-ons (AMO) : *Autre* ou *Apparence / Productivité*
- **Langues supportées** : Français (`fr`), Anglais (`en`), Allemand (`de`), Espagnol (`es`)
- **Licence** : GNU General Public License v3.0 (`GNU GPL v3`)
- **Dépôt Open Source & Support** : `https://github.com/xylo2/CareBreakAI`
- **Politique de confidentialité** : `https://raw.githubusercontent.com/xylo2/CareBreakAI/main/PRIVACY.md`

---

## 2. Textes de présentation (FR & EN)

### Résumé court (≤ 132 caractères — Chrome & Edge)
- **FR** : `Rappels bien-être intelligents : règle visuelle 20-20-20, posture, mouvement, hydratation, repas et alertes de coucher.`
- **EN** : `Smart wellness reminders: 20-20-20 eye rule, posture, movement, hydration, meal breaks and bedtime alerts.`

### Résumé court AMO (≤ 250 caractères — Firefox Add-ons)
- **FR** : `Préservez votre santé devant l'écran : pause visuelle 20-20-20 avec minuteur, posture, mouvement, hydratation, rappels de repas et alertes de coucher. 100 % local et sans collecte de données.`
- **EN** : `Protect your health at the screen: 20-20-20 eye break timer, posture, movement, hydration, meal reminders and bedtime alerts. 100% local with zero data collection.`

### Description détaillée — Français
Prenez soin de votre santé devant l'écran sans casser votre concentration. **CareBreak** affiche des rappels visuels discrets et personnalisables par-dessus vos onglets, synchronisés en temps réel et pilotés par votre activité réelle.

#### Fonctionnalités principales
- **Pause visuelle (Règle 20-20-20)** : toutes les 20 minutes, un rappel avec minuteur intégré de 20 secondes vous invite à reposer vos yeux en regardant au loin.
- **Posture & relâchement** : alerte régulière pour redresser le dos, relâcher les épaules et décroiser les jambes.
- **Mouvement & Hydratation** : rappels configurables pour vous lever et boire de l'eau, avec remise à zéro automatique dès qu'une pause d'inactivité est détectée.
- **Repas (Déjeuner & Dîner)** : pastille flottante discrète sur vos créneaux horaires, évoluant vers une bannière si le repas n'est pas validé.
- **Fin de journée & Coucher** : notification douce de déconnexion en soirée, puis alertes nocturnes progressives pour éviter de veiller trop tard.
- **Mode Réunion / Ne pas déranger** : suspendez toutes les alertes pendant 1 h ou 2 h en un clic.
- **100 % personnalisable** : activez/désactivez chaque alerte individuellement, ajustez chaque durée et déplacez librement les cartes à la souris.

#### Respect total de la vie privée & Open Source
Aucune donnée personnelle collectée, aucun compte requis et zéro requête réseau externe : tous vos réglages restent stockés localement dans votre navigateur. Code source publié sous licence libre **GNU GPL v3** sur `https://github.com/xylo2/CareBreakAI`.

### Detailed Description — English
Take care of your health while working at your screen without losing focus. **CareBreak** displays clean, customizable visual overlays across your tabs, synchronized in real time and driven by your actual activity.

#### Key Features
- **20-20-20 Eye Break**: every 20 minutes, a reminder with a built-in 20-second countdown helps prevent digital eye strain.
- **Posture Check**: periodic reminders to straighten your back, relax your shoulders, and uncross your legs.
- **Movement & Hydration**: customizable reminders to stand up and drink water, automatically resetting when genuine idle breaks are detected.
- **Meal Reminders (Lunch & Dinner)**: subtle floating pill during your meal windows, escalating to a banner if not acknowledged.
- **Evening Wind-Down & Bedtime Alerts**: gentle end-of-day wrap-up reminder followed by progressive late-night bedtime alerts.
- **Meeting / Do Not Disturb Mode**: pause all reminders for 1 or 2 hours with a single click.
- **Fully Customizable**: toggle each reminder individually, fine-tune intervals and schedules, and drag cards anywhere on screen.

#### 100% Privacy-First & Open Source
No personal data collected, no account required, and zero external network requests: all settings stay locally in your browser. Licensed under **GNU GPL v3** at `https://github.com/xylo2/CareBreakAI`.

---

## 3. Spécificités par boutique

### A. Chrome Web Store (Google)
- **Archive à téléverser** : `dist/carebreak-chrome-v1.2.2.zip`
- **Visuels requis (PNG 24 bits sans alpha générés via `python .\tools\generate_store_assets.py`)** :
  - Icône store : `128×128 px` (`icons/icon128.png`)
  - Petite vignette promotionnelle : `440×280 px` (`dist/store_assets/small-tile-440x280.png`)
  - Captures d'écran : 1 à 5 images en `1280×800 px` (`dist/store_assets/store-screenshot-1280x800.png`)
- **Onglet Confidentialité** :
  - *Motif unique* : Aider l'utilisateur à préserver sa santé visuelle, posturale et son rythme de sommeil grâce à des rappels de pause visuels configurables pendant sa navigation.
  - *Justification `storage`* : Enregistrer localement les préférences d'horaires (`careBreakSettings`), l'état des compteurs (`careBreakState`) et les coordonnées des cartes (`careBreakStackPos`, `careBreakLunchPos`).
  - *Justification `alarms`* : Vérifier toutes les 30 secondes en arrière-plan l'expiration du mode « Ne pas déranger ».
  - *Justification `<all_urls>`* : Afficher les cartes de rappel par-dessus la page active et détecter localement l'activité utilisateur (clics, clavier, défilement) sans lire ni transmettre le contenu des pages.
  - *Code distant* : **Non**.
  - *Collecte de données* : Cocher que l'extension **ne collecte ni ne transmet aucune donnée utilisateur**.

### B. Microsoft Edge Add-ons (Partner Center)
- **Archive à téléverser** : `dist/carebreak-chrome-v1.2.2.zip` (identique à Chrome)
- **Visuels requis** :
  - Logo store : `300×300 px` (`dist/store_assets/edge-logo-300x300.png`)
  - Vignette promotionnelle : `440×280 px` (`dist/store_assets/small-tile-440x280.png`)
  - Captures d'écran : `1280×800 px` (`dist/store_assets/store-screenshot-1280x800.png`)
- **Notes de certification (Certification notes)** :
  > CareBreak works 100% offline using chrome.storage.local and requires no account or credentials. To test immediately, click the toolbar icon, adjust any interval to 1 minute (or trigger a meal window matching the current local hour), and interact with any webpage.

### C. Firefox Add-ons — AMO (`addons.mozilla.org`)
- **Archive à téléverser** : `dist/carebreak-firefox-v1.2.2.zip` (embarque `browser_specific_settings.gecko.id = "carebreak@iclore.fr"` et `background.scripts`)
- **Visuel promotionnel** : `dist/store_assets/store-screenshot-1280x800.png` (`1280×800 px`)
- **Code source** : AMO n'exige pas d'archive de sources séparée car le JavaScript n'est ni minifié ni transpilé.
- **Déclaration de collecte de données (AMO Data Collection)** :
  - Sélectionner **« No, this extension does not collect or transmit any user data »**.
- **Notes aux réviseurs (Notes for Reviewers)** :
  > CareBreak is written in plain unminified vanilla JavaScript (GPL-3.0-or-later, source at https://github.com/xylo2/CareBreakAI) with zero external network requests. All settings and timers are stored strictly in browser.storage.local.
