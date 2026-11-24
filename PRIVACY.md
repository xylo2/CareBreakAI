# Politique de confidentialité — CareBreak

*Dernière mise à jour : 24 novembre 2026*

## 1. Aucune collecte de données personnelles
**CareBreak** ne collecte, ne stocke sur un serveur externe, ne vend et ne partage **aucune donnée personnelle**, aucun historique de navigation et aucun contenu de page web.

## 2. Stockage strictement local
L'extension utilise uniquement l'API `chrome.storage.local` de votre navigateur afin de mémoriser sur votre appareil :
- Vos préférences d'horaires, de délais et d'activation des rappels (`careBreakSettings`).
- Les horodatages internes des compteurs de pause et du mode « Ne pas déranger » (`careBreakState`).
- La position personnalisée des cartes d'alerte sur votre écran (`careBreakStackPos`, `careBreakLunchPos`).

Ces données restent exclusivement sur votre ordinateur et sont automatiquement supprimées si vous désinstallez l'extension.

## 3. Permissions utilisées
- **`storage`** : sauvegarde locale de vos paramètres et de l'état des rappels entre vos onglets.
- **`alarms`** : vérification périodique en arrière-plan de l'expiration du mode « Ne pas déranger ».
- **Scripts de contenu (`<all_urls>`)** : affichage des cartes de rappel visuelles par-dessus la page active et détection locale de votre activité (clics, clavier, défilement) sans jamais lire ni transmettre le contenu des pages visitées.

## 4. Absence de traceurs tiers
CareBreak n'intègre aucun outil d'analyse (analytics), aucun cookie publicitaire et n'effectue **aucune requête réseau externe**.

---

# Privacy Policy — CareBreak (English)

*Last updated: November 24, 2026*

## 1. No Personal Data Collection
**CareBreak** does **not** collect, transmit to any external server, sell, or share any personal data, browsing history, or webpage content.

## 2. Local-Only Storage
The extension exclusively uses the browser's `chrome.storage.local` API to store on your device:
- Your custom reminder schedules, intervals, and toggle preferences (`careBreakSettings`).
- Internal timestamps for break timers and Do Not Disturb mode (`careBreakState`).
- Custom screen coordinates for draggable reminder cards (`careBreakStackPos`, `careBreakLunchPos`).

All data remains strictly on your local machine and is automatically deleted upon uninstalling the extension.

## 3. Permissions Justification
- **`storage`**: saves your settings and timer state locally across tabs.
- **`alarms`**: periodically checks in the background when Do Not Disturb mode expires.
- **Content scripts (`<all_urls>`)**: renders visual break reminder overlays on the active tab and detects local user activity (clicks, keystrokes, scrolling) without ever reading or transmitting page contents.

## 4. No Third-Party Trackers
CareBreak contains no analytics, no advertising SDKs, and makes **zero external network requests**.
