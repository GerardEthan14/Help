# 🌸 Mon espace

Un site personnel tout-en-un pour t'aider au quotidien : démarchage, to-do, réseaux, boutique, idées et finances.

Tout fonctionne **dans le navigateur**, sans compte ni connexion : tes données sont enregistrées automatiquement sur ton appareil, et tu peux les **exporter / importer** en un clic pour les sauvegarder ou les transférer.

## Les 6 espaces

| Espace | À quoi ça sert |
|--------|----------------|
| 📮 **Démarchage** | Suivre tes prises de contact (éditions, jeux, marques) : nom, type, pays, contact, date d'envoi, relance, statut, notes. Les relances à faire sont surlignées. Recherche et filtres inclus. |
| ✅ **To-do** | Liste de tâches avec cases à cocher, **barre de progression**, marquage **urgent 🚨**, échéances et **vue calendrier** par mois. |
| ⏱️ **Temps** | **Chrono** (Start/Stop, continue même en changeant de page) et ajout manuel d'heures, statistiques, graphique par jour, et un **système de niveaux** (titres à débloquer selon les heures travaillées). |
| 📱 **Réseaux** | Abonnés par réseau (Instagram / TikTok / Threads) chaque mois, **évolution en %**, **courbe de croissance** et un **espace notes** dédié aux idées de contenu (vidéos / posts). |
| 🛍️ **Boutique** | Tes produits classés par **catégories** (onglets), avec photo, **aperçu vitrine**, glisser-déposer, et un mode **Préparation** (checklist de lancement + idées de futurs produits). |
| 💡 **Idées** | Un **grand tableau blanc** navigable : notes déplaçables, redimensionnables (avec **police adaptative**), images (coller / uploader) et dessin à la main. |
| 💰 **Finances** | **Jauge d'objectif du mois** (modifiable), **rentrées d'argent** détaillées (client, montant, date, catégorie), **graphique d'évolution du CA** et détail par catégorie. |
| 🏆 **Succès** | Des **succès à débloquer type jeu vidéo** (démarchage, organisation, réseaux, boutique, finances, créativité…) avec progression et phrases de motivation. |

## Utilisation

1. Ouvre le site (voir « Mise en ligne » ci-dessous), ou ouvre simplement `index.html` dans ton navigateur.
2. Clique dans les cases pour écrire — tout s'enregistre tout seul.
3. De temps en temps, clique sur **⬇️ Exporter** (en bas à gauche) pour télécharger une sauvegarde. Pour la restaurer sur un autre appareil, clique sur **⬆️ Importer**.

> ⚠️ Les données vivent dans le navigateur de l'appareil utilisé. Si tu changes d'ordinateur, vides l'historique du navigateur, ou veux passer du PC au téléphone, utilise **Exporter / Importer** pour ne rien perdre.

## Mise en ligne (GitHub Pages)

Le dépôt contient déjà tout le nécessaire. Pour mettre le site en ligne à une adresse `https://<utilisateur>.github.io/<dépôt>/` :

1. Sur GitHub, va dans **Settings → Pages**.
2. Dans **Source**, choisis **GitHub Actions**.
3. C'est tout : à chaque envoi de code, le site se redéploie automatiquement (voir `.github/workflows/deploy-pages.yml`).

*Alternative sans Actions :* dans **Settings → Pages**, choisis **Deploy from a branch**, puis la branche du projet et le dossier `/ (root)`.

## Détails techniques

- 100 % statique : HTML + CSS + JavaScript, **aucune dépendance externe**, fonctionne hors-ligne.
- Graphiques dessinés maison en SVG.
- Stockage via `localStorage` du navigateur.
- Interface responsive (ordinateur, tablette, mobile).

```
index.html
assets/
  css/styles.css
  js/store.js      → données + sauvegarde locale + export/import
  js/charts.js     → graphiques SVG
  js/ui.js         → composants (tables éditables, modales, photos)
  js/sections.js   → les 6 espaces
  js/app.js        → navigation
```
