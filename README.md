# CareBreak

[![CI & Release Packages](https://github.com/xylo2/CareBreakAI/actions/workflows/ci.yml/badge.svg)](https://github.com/xylo2/CareBreakAI/actions/workflows/ci.yml)

*English version below — Version anglaise ci-dessous*

Extension navigateur (Manifest V3 — Chrome, Edge & Firefox) affichant des rappels bien-être visuels et configurables par-dessus vos onglets, synchronisés en temps réel et pilotés par votre activité réelle.

- **Dépôt officiel** : `https://github.com/xylo2/CareBreakAI`

## Fonctionnalités

- **Pause visuelle (Règle 20-20-20)** : rappel périodique avec minuteur intégré de 20 secondes pour reposer les yeux.
- **Posture, Mouvement & Hydratation** : alertes configurables pour redresser le dos, se lever et boire de l'eau, avec remise à zéro automatique après une pause d'inactivité détectée.
- **Repas (Déjeuner & Dîner)** : pastille flottante discrète sur vos créneaux horaires, évoluant vers une bannière si le repas n'est pas validé.
- **Fin de journée & Coucher** : notification douce de déconnexion en soirée, suivie d'alertes nocturnes progressives.
- **Mode Réunion / Ne pas déranger** : suspension de toutes les alertes pendant 1 h ou 2 h en un clic.
- **Personnalisation & Multilingue** : activation/désactivation par alerte, horaires ajustables, cartes déplaçables à la souris et support i18n (`fr`, `en`, `de`, `es`).

## Confidentialité

- **100 % local** : aucune donnée personnelle collectée, aucun traceur et zéro requête réseau externe (`chrome.storage.local` uniquement). Détails complets dans `PRIVACY.md`.

## Installation en mode développeur

```bash
git clone https://github.com/xylo2/CareBreakAI.git
cd CareBreakAI
```

### Chrome / Edge
1. Ouvrir `chrome://extensions` (ou `edge://extensions`) dans le navigateur.
2. Activer le **Mode développeur** en haut à droite.
3. Cliquer sur **Charger l'extension non empaquetée** et sélectionner la racine du dépôt (`CareBreakAI/`).

### Firefox
1. Générer les packages via `python .\tools\build_zip.py` (crée `dist/carebreak-firefox-v1.2.1.zip` avec l'identifiant `carebreak@iclore.fr`).
2. Ouvrir `about:debugging#/runtime/this-firefox` dans Firefox.
3. Cliquer sur **Charger un module complémentaire temporaire…** et sélectionner `dist/carebreak-firefox-v1.2.1.zip`.

## Tests unitaires & Packaging pour les stores

L'environnement virtuel Python est optionnel et **sert uniquement à exécuter les tests unitaires, générer les visuels et créer les packages `.zip`** (via `nodeenv` pour disposer de Node.js en local sans installation système). L'extension navigateur elle-même fonctionne exclusivement en JavaScript pur sans aucune dépendance Python.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
nodeenv -p --prebuilt
python .\tools\run_tests_clip.py
python .\tools\build_zip.py
python .\tools\generate_store_assets.py
```

### Publication sur les boutiques (Chrome, Edge & Firefox)

- **Chrome Web Store & Microsoft Edge Add-ons** : téléverser `dist/carebreak-chrome-v1.2.1.zip` (Manifest V3 standard avec `service_worker`).
- **Firefox Add-ons (AMO)** : téléverser `dist/carebreak-firefox-v1.2.1.zip` (Manifest V3 adapté automatiquement avec `background.scripts` et `browser_specific_settings.gecko.id = "carebreak@iclore.fr"`).
- **Visuels générés en PNG 24 bits sans alpha** (`python .\tools\generate_store_assets.py`) :
  - `dist/store_assets/edge-logo-300x300.png` (logo store `300×300 px` requis par Microsoft Edge Add-ons).
  - `dist/store_assets/small-tile-440x280.png` (vignette promotionnelle `440×280 px` pour Chrome Web Store & Edge).
  - `dist/store_assets/store-screenshot-1280x800.png` (aperçu promotionnel `1280×800 px` compatible Chrome, Edge et Firefox).

Les fiches descriptives complètes, justifications des permissions et listes de contrôle pour chaque boutique sont disponibles dans `STORE_LISTINGS_ALL.md` (et `PRIVACY.md` pour l'URL de confidentialité).

## Structure & Licence

- Racine du dépôt (`manifest.json`, `background.js`, `care_break_ui.js`, `care_break.js`, `content.js`, `popup.html`, `popup.js`, `styles.css`, `_locales/`) : code source de l'extension.
- `tests/` : suite de tests unitaires modulaires (`background.test.js`, `care_break.test.js`, `content.test.js`, `popup.test.js`, `test_build_zip.py`).
- `tools/` : outillage Python (`run_tests_clip.py`, `build_zip.py`, `generate_store_assets.py`).
- `.github/workflows/ci.yml` : intégration continue et publication automatique des releases sur GitHub.
- `STORE_LISTINGS_ALL.md` & `PRIVACY.md` : modèles de fiches de publication et politique de confidentialité.
- Licence libre **GNU GPL v3** (`LICENSE`).

---

# CareBreak (English)

Browser extension (Manifest V3 — Chrome, Edge & Firefox) displaying customizable visual wellness reminders over your tabs, synchronized in real time and driven by your actual activity.

- **Official Repository**: `https://github.com/xylo2/CareBreakAI`

## Features

- **20-20-20 Eye Break**: periodic reminder with a built-in 20-second countdown timer to rest your eyes.
- **Posture, Movement & Hydration**: customizable reminders to straighten your back, stand up, and drink water, automatically resetting after a detected idle break.
- **Meals (Lunch & Dinner)**: subtle floating pill during your meal windows, escalating to a banner if not acknowledged.
- **Evening Wind-Down & Bedtime**: gentle end-of-day wrap-up reminder followed by progressive late-night bedtime alerts.
- **Meeting / Do Not Disturb Mode**: pause all alerts for 1 or 2 hours with a single click.
- **Customizable & Multilingual**: individual alert toggles, adjustable schedules, draggable cards, and i18n support (`fr`, `en`, `de`, `es`).

## Privacy

- **100% Local**: no personal data collected, no trackers, and zero external network requests (`chrome.storage.local` only). Full details in `PRIVACY.md`.

## Developer Mode Installation

```bash
git clone https://github.com/xylo2/CareBreakAI.git
cd CareBreakAI
```

### Chrome / Edge
1. Open `chrome://extensions` (or `edge://extensions`) in your browser.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the repository root folder (`CareBreakAI/`).

### Firefox
1. Build the release archives with `python .\tools\build_zip.py` (creates `dist/carebreak-firefox-v1.2.1.zip` with ID `carebreak@iclore.fr`).
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `dist/carebreak-firefox-v1.2.1.zip`.

## Unit Tests & Store Packaging

The Python virtual environment is optional and **is used solely to run the unit tests, generate store visuals, and build release `.zip` packages** (via `nodeenv` to provision Node.js locally without a system-wide installation). The browser extension itself runs purely in vanilla JavaScript with zero Python runtime dependencies.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
nodeenv -p --prebuilt
python .\tools\run_tests_clip.py
python .\tools\build_zip.py
python .\tools\generate_store_assets.py
```

### Store Submission (Chrome, Edge & Firefox)

- **Chrome Web Store & Microsoft Edge Add-ons**: upload `dist/carebreak-chrome-v1.2.1.zip` (standard Manifest V3 with `service_worker`).
- **Firefox Add-ons (AMO)**: upload `dist/carebreak-firefox-v1.2.1.zip` (Manifest V3 automatically adapted with `background.scripts` and `browser_specific_settings.gecko.id = "carebreak@iclore.fr"`).
- **Generated 24-bit Alpha-Free PNG Store Assets** (`python .\tools\generate_store_assets.py`):
  - `dist/store_assets/edge-logo-300x300.png` (`300×300 px` store logo required by Microsoft Edge Add-ons).
  - `dist/store_assets/small-tile-440x280.png` (`440×280 px` small promotional tile for Chrome Web Store & Edge).
  - `dist/store_assets/store-screenshot-1280x800.png` (`1280×800 px` promotional preview compatible with Chrome, Edge, and Firefox).

Full store descriptions, permission justifications, and submission checklists for each store are available in `STORE_LISTINGS_ALL.md` (along with `PRIVACY.md` for the privacy policy URL).

## Project Structure & License

- Repository root (`manifest.json`, `background.js`, `care_break_ui.js`, `care_break.js`, `content.js`, `popup.html`, `popup.js`, `styles.css`, `_locales/`): extension source code.
- `tests/`: modular unit test suite (`background.test.js`, `care_break.test.js`, `content.test.js`, `popup.test.js`, `test_build_zip.py`).
- `tools/`: Python tooling (`run_tests_clip.py`, `build_zip.py`, `generate_store_assets.py`).
- `.github/workflows/ci.yml`: continuous integration and automated GitHub release workflow.
- `STORE_LISTINGS_ALL.md` & `PRIVACY.md`: store listing templates and privacy policy.
- Licensed under **GNU GPL v3** (`LICENSE`).
