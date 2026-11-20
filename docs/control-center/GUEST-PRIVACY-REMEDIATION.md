# Correction des blocages invités — bilan local

## Périmètre

Corrections dans le workspace de la branche actuelle. Aucune modification de la
clé de chiffrement, aucune migration ni lecture de base distante, aucune
suppression de données, aucun déploiement ou push effectué dans cette étape.
Les modifications antérieures du workspace sont conservées.

## Changements

### Confidentialité du portail et de la recherche

- Frontière serveur commune `server/lib/guest-content.ts`.
- Avant vérification du séjour : AUCUN contenu libre de section n’est renvoyé,
  même si un ancien champ `accessRestricted`/`restrictWifiUntilVerified` est faux.
  Les anciens guides peuvent contenir l’adresse ou un secret dans n’importe quel
  texte libre : une simple liste de quelques champs masqués serait insuffisante.
- La page avant vérification utilise un titre neutre, sans photo/description,
  marque personnalisée, code postal ou liste d’équipements. Ville/région restent
  visibles. Il s’agit d’un changement volontaire de politique : les sections
  auparavant publiques nécessitent désormais un code de séjour valide.
- Après vérification : seules les sections explicitement visibles sont projetées
  et déchiffrées. Les sections cachées sont exclues avant parsing/déchiffrement.
- La recherche utilise cette même frontière et ne lit aucun texte du guide pour
  un visiteur non vérifié. La requête SQL filtre aussi `is_visible=1`.
- Les résultats ne portent plus la qualification absolue « Verified » : ils
  proviennent du guide de l’hôte, sans certification indépendante.
- Le code de réservation n’est plus renvoyé dans le JSON du guide/verify ni
  interpolé dans les nouveaux audits de vérification. L’historique existant des
  audits n’a PAS été réécrit. L’interface n’affiche plus le code à côté du nom.

### Données préremplies

- La création réelle d’une propriété n’appelle plus le générateur d’exemples.
- Huit sections structurées sont créées comme brouillons masqués.
- Pas d’hôpital, inspection accomplie, détecteurs testés, emplacement de vanne ou
  extincteur, recommandation locale ni équipement inventés.
- Pas de réseau Wi-Fi fictif, mot de passe partagé ou PIN de serrure généré sans
  intégration matérielle. Ces champs restent non configurés.
- Pas de photo d’un autre logement ni d’équipements déduits automatiquement.
- Avant de rendre une section masquée visible, l’interface demande confirmation
  de l’exactitude des faits ; le serveur exige `publication_confirmed=true`.
  Une confirmation opérateur n’est pas une certification ni une inspection.
- Les exemples de démonstration restent uniquement dans le seed explicitement
  gardé, pour une base locale jetable.

### Cache et essais de codes

- Routeur invité : `private, no-store`, referrer-policy no-referrer, noindex.
  Réponses d’erreur incluses. Le routeur média conservait déjà no-store.
- Toutes les routes invitées et la résolution des médias utilisent désormais
  `verifyGuestRequest`, pas une vérification de code dépourvue de compteur.
- Clé commune IP + propriété, indépendante du chemin HTTP. Check, lookup de
  réservation et mise à jour du compteur s’exécutent sur le même client dans une
  transaction avec verrou consultatif transactionnel PostgreSQL.
- Après huit échecs, les autres chemins respectent aussi le verrou, y compris
  avec un code correct pendant la période de blocage ; 429 + Retry-After.
- Cette conception vise les appels concurrents, mais les performances et la
  concurrence multi-connexions sur Neon réel restent NON mesurées. La chaîne
  proxy/IP de l’hébergement doit aussi être validée.

## Preuves exécutées

`npm run verify` : succès.

- **60 tests et sous-tests réussis, 0 échec, 0 ignoré** (53 tests racines).
- TypeScript application, tests et outils : succès.
- Build client + SSR/prérendu : succès.
- npm audit : 0 vulnérabilité signalée.
- `git diff --check` : succès.

Nouveaux scénarios : vraies routes Express sur HTTP local, PostgreSQL embarqué
PGlite et JWT signés par un JWKS local pour les actions propriétaire. Pas de
base ou compte réel utilisés.

1. Guide sans code, mauvais code et code expiré : aucune section libre, aucun
   marqueur d’adresse/secret/note interne ; no-store.
2. Guide vérifié : adresse et PIN visibles dans la section autorisée, section
   cachée et note interne absentes, code de réservation non répété.
3. Verify : réponse `{ok:true}`, audit sans code de réservation.
4. Recherche : aucune donnée privée sans vérification ; contenu caché absent
   même avec un code valide.
5. Échecs alternés entre guide et recherche : blocage commun ensuite sur guide,
   verify, recherche et route média. Le média utilise dans le test le même helper
   que le resolver applicatif, via une injection de principal de fixture.
6. Création propriétaire authentifiée : capacité soumise 1/1/2 conservée côté
   serveur, 8 sections masquées, aucun Wi-Fi/PIN/photo/équipement inventé.
7. Publication refusée sans confirmation, acceptée avec confirmation explicite.
8. Erreurs de propriété inconnue no-store ; contenus cachés/cas non vérifiés
   exclus avant même le parsing d’un JSON volontairement invalide.

## Limites et suite obligatoire

- Les anciens guides de staging/production n’ont PAS été nettoyés. Leurs textes
  dangereux restent lisibles APRÈS vérification s’ils étaient déjà visibles.
  Il faut les revoir et les masquer/corriger explicitement avant usage réel,
  sans écraser les données légitimes d’un client.
- Le nouveau mode brouillon ne signifie pas que tout ancien guide est maintenant
  un brouillon. La projection privée protège le visiteur non vérifié ; elle ne
  certifie pas la véracité des données historiques.
- Pas de test navigateur de la confirmation, du verrouillage de session ni du
  parcours mobile après ce changement. Les screenshots précédents décrivent
  l’ancienne version, pas une validation du nouveau rendu.
- Pas de validation de concurrence PostgreSQL distante, restauration/sauvegarde,
  historique 005, readiness ou contrat réel auth_time.
- Le parcours collaborateur (inscription, OTP, acceptation, permissions) et les
  photos restent à terminer en staging.
- Les codes peuvent encore transiter en query string pour les lectures héritées.
  no-store/no-referrer ne supprime pas l’historique d’URL/journaux existants ; une
  évolution de ce transport doit être traitée séparément.
- Paiement, e-mails et SMS ne sont pas activés par ce travail.

**Verdict : protections locales nettement renforcées, pas d’autorisation de mise
en production. Préparer ensuite une revue/diff et un déploiement staging explicite,
puis vérifier les réponses réseau et les parcours réels.**
