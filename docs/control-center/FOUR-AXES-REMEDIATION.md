# STAYWISE — correction des quatre axes

## Périmètre exécuté

Modifications locales sur la branche de travail uniquement. Aucune publication,
aucune migration distante, aucune suppression de données ni révocation de clé.
Les corrections antérieures du workspace sont conservées.

### 1. Sécurité et intégrité

- `ensureDbReady` vérifie uniquement la connexion : plus de DDL ni de seed au
  premier appel de l’API.
- `db:seed` exige une autorisation explicite, un hôte local et refuse production
  et Vercel. Les erreurs ne journalisent pas les paramètres de connexion.
- Une installation locale vierge est testée avec zéro organisation, propriété,
  réservation, invitation ou photo créée.
- Les portails invités publics restent une fonctionnalité voulue. Les contrôles
  existants de séjour et d’accès aux preuves privées ne sont pas contournés.

**Limite :** des données de démonstration déjà présentes à distance ne sont PAS
supprimées. Il faut inventorier leur origine et les dépendances avant nettoyage.
Aucune nouvelle certification exhaustive du cloisonnement n’est revendiquée.

### 2. Installation fiable

- `db:migrate` couvre base + 001–004 dans une transaction, avec verrou consultatif
  et registre de sommes SHA-256 ; un rejeu identique est sans effet et un fichier
  modifié après enregistrement est refusé.
- La migration 005 conserve son outil séparé, désormais exposé dans package.json.
  README précise que les DEUX commandes sont requises pour cette version.
- Les actions DB explicites sont gardées par des confirmations d’environnement.
- `.env.example` expose audience obligatoire et issuer signé exact.
- `/api/auth/context` répond 503 + noms des variables manquantes si la configuration
  est incomplète, plutôt que de faire passer cela pour une session utilisateur invalide.

**Limite :** aucun registre ne prouve à lui seul l’équivalence d’un ancien schéma.
Ne pas adopter aveuglément des objets 005 existants sans registre ; le runbook
staging et ses blocages restent applicables. Sauvegarde et revue avant migration.

### 3. Fiabilité opérationnelle

- La persistance centrale des notifications écrit exclusivement `In-App` et
  `Available In-App`, même si un appelant historique demande email/SMS.
- Nouvelle règle d’alerte et interface : notification interne seulement, sans
  promesse de livraison externe. L’API indique explicitement email=false/sms=false.
- Photos : décodage/redimensionnement navigateur JPEG 1920px qualité 0,8 ; contrôle
  de la taille UTF-8 du JSON complet avant fetch (< 3,8 Mo) ; limite Express 4 Mo.
- Une réponse d’hébergement non JSON ne provoque plus une erreur de parsing brute ;
  le 413 affiche une indication de réduction de photo.

**Limite :** aucun fournisseur email/SMS connecté, aucun SLA de paging critique.
Supervision active du tableau de bord nécessaire. HEIC non pris en charge :
conversion utilisateur requise. Le canvas et les appareils mobiles réels restent
à tester : les tests de taille ne constituent pas une validation navigateur.

### 4. Honnêteté fonctionnelle

- Onboarding et changement de plan ne créent plus de factures/paiements fictifs à 0.
- Accès gratuit explicite, paiement désactivé ; les anciens enregistrements
  `Early Access ($0)` sont conservés mais non exposés comme factures dans l’API.
- Aucun numéro de téléphone fictif injecté dans un nouveau compte.
- Libellés principaux portail/console/navigation/marketing/SEO : recherche dans
  le guide, avec limite explicite « pas d’IA générative ». Contrats et noms des
  routes historiques conservés pour compatibilité.
- La réponse de recherche indique son mode keyword-guide-search. À quota dépassé,
  elle ne prétend plus qu’une question a été transmise alors que rien ne l’a été.

**Limite :** pas d’intégration paiement, pas de comptabilité/facturation légale
complète, pas de fournisseur IA générative ajouté.

## Vérifications exécutées

`npm run verify` : succès.

- TypeScript application, tests et scripts : succès.
- **47 tests : 47 réussis, 0 échec, 0 ignoré.**
- Installation vierge base + 001–005, rejeu, dérive de checksum, rollback DDL et
  registre : vérifiés dans PostgreSQL embarqué PGlite, sans accès distant.
- Régression notification interne, diagnostic HTTP de configuration manquante,
  limite de requête photo et refus des outils sans confirmation : vérifiés.
- Build client + SSR/prerender : succès.
- Audit npm : 0 vulnérabilité signalée.
- `git diff --check` : succès.

Pas de validation de production, d’installation distante, de navigateur authentifié
ou de restauration réelle. Les quatre portes de validation staging restent HOLD.
