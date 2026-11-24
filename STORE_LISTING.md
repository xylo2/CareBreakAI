# Fiche Chrome Web Store — CareBreak

> **Note** : La fiche unifiée complète pour **Chrome Web Store, Microsoft Edge et Firefox (AMO)** est maintenue dans `STORE_LISTINGS_ALL.md`.

## Informations générales
- **Catégorie recommandée** : Productivité (Productivity) ou Bien-être / Santé
- **Langues** : Français, Anglais (défaut), Allemand, Espagnol
- **Modèle économique** : Gratuit & Open Source (GNU GPL v3)
- **URL de politique de confidentialité** : `https://raw.githubusercontent.com/xylo2/CareBreakAI/main/PRIVACY.md`

---

## Description courte (132 caractères max)
- **FR** : `Rappels bien-être intelligents : règle visuelle 20-20-20, posture, mouvement, hydratation, repas et alertes de coucher.`
- **EN** : `Smart wellness reminders: 20-20-20 eye rule, posture, movement, hydration, meal breaks and bedtime alerts.`

---

## Description détaillée — Français
Prenez soin de votre santé devant l'écran sans casser votre concentration. **CareBreak** affiche des rappels visuels discrets et personnalisables par-dessus vos onglets, synchronisés en temps réel et basés sur votre activité réelle.

### Fonctionnalités principales
- **👀 Pause visuelle (Règle 20-20-20)** : toutes les 20 minutes, un rappel avec minuteur intégré de 20 secondes vous invite à reposer vos yeux en regardant au loin.
- **🪑 Posture & relâchement** : alerte régulière pour redresser le dos, relâcher les épaules et décroiser les jambes.
- **🚶 Mouvement & 💧 Hydratation** : rappels configurables pour vous lever et boire de l'eau, avec remise à zéro automatique dès qu'une vraie pause d'inactivité est détectée.
- **🍽️ Repas (Déjeuner & Dîner)** : pastille flottante discrète sur vos créneaux repas, suivie d'une bannière si le repas n'est pas validé.
- **🌇 Fin de journée & 🌙 Coucher** : notification douce de déconnexion en soirée, puis alertes nocturnes progressives pour éviter de veiller trop tard.
- **🔕 Mode Réunion / Ne pas déranger** : suspendez toutes les alertes pendant 1 h ou 2 h en un clic.
- **🎛️ 100 % personnalisable** : activez/désactivez chaque alerte individuellement, ajustez chaque durée et déplacez librement les cartes à la souris.

### Respect total de la vie privée & Open Source
Aucune donnée personnelle collectée, aucun compte requis et zéro requête réseau externe : tous vos réglages restent stockés localement dans votre navigateur. Code source publié sous licence libre **GNU GPL v3**.

---

## Detailed Description — English
Take care of your health while working at your screen without losing focus. **CareBreak** displays clean, customizable visual overlays across your tabs, synchronized in real time and driven by your actual activity.

### Key Features
- **👀 20-20-20 Eye Break**: every 20 minutes, a reminder with a built-in 20-second countdown helps prevent digital eye strain.
- **🪑 Posture Check**: periodic reminders to straighten your back, relax your shoulders, and uncross your legs.
- **🚶 Movement & 💧 Hydration**: customizable reminders to stand up and drink water, automatically resetting when genuine idle breaks are detected.
- **🍽️ Meal Reminders (Lunch & Dinner)**: subtle floating pill during your meal windows, escalating to a banner if not acknowledged.
- **🌇 Evening Wind-Down & 🌙 Bedtime Alerts**: gentle end-of-day wrap-up reminder followed by progressive late-night bedtime alerts.
- **🔕 Meeting / Do Not Disturb Mode**: pause all reminders for 1 or 2 hours with a single click.
- **🎛️ Fully Customizable**: toggle each reminder individually, fine-tune intervals and schedules, and drag cards anywhere on screen.

### 100% Privacy-First & Open Source
No personal data collected, no account required, and zero external network requests: all settings stay locally in your browser. Licensed under **GNU GPL v3**.

---

## Justifications des permissions (onglet Confidentialité du Developer Dashboard)

### 1. Motif unique (Single Purpose)
> Aider l'utilisateur à préserver sa santé visuelle, posturale et son rythme de sommeil grâce à des rappels de pause visuels configurables pendant sa navigation.

### 2. Justification de `storage`
> Utilisée uniquement pour enregistrer localement sur l'appareil de l'utilisateur ses préférences d'horaires/délais (`careBreakSettings`), l'état des compteurs de pause (`careBreakState`) et la position personnalisée des cartes (`careBreakStackPos`, `careBreakLunchPos`).

### 3. Justification de `alarms`
> Utilisée en arrière-plan pour vérifier toutes les 30 secondes si la période « Ne pas déranger » (mode réunion) a expiré afin de réactiver automatiquement les rappels.

### 4. Justification des scripts de contenu (`<all_urls>`)
> Nécessaire pour afficher les cartes de rappel visuelles directement par-dessus n'importe quel site web consulté par l'utilisateur et pour détecter localement son activité (clics, clavier, défilement) afin de réinitialiser les compteurs après une pause d'inactivité. Aucun contenu de page ni historique n'est lu, stocké ou transmis.

### 5. Utilisation de code distant
> **Non** — L'extension n'exécute aucun code distant ; l'intégralité du JavaScript et des ressources SVG/CSS est embarquée dans le package `.zip`.

---

## Liste de contrôle avant création du `.zip`
1. Exécuter les tests unitaires : `python .\tools\run_tests_clip.py`
2. Vérifier la présence des icônes : `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
3. Générer les packages `.zip` et les visuels PNG 24 bits sans alpha :
   - `python .\tools\build_zip.py` (`dist/carebreak-chrome-v1.2.1.zip`, `dist/carebreak-firefox-v1.2.1.zip`)
   - `python .\tools\generate_store_assets.py` (`edge-logo-300x300.png`, `small-tile-440x280.png`, `store-screenshot-1280x800.png`)
