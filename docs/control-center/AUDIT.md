# Control Center — audit ciblé avant push

Date : 2026-11-16. Portée : revue du code du nouvel espace interne et réexécution
des contrôles locaux. Ce document n'est ni un pentest indépendant ni une certification.

## Résultats exécutés

- Suite Node : 30 tests réussis, 0 échec, 0 ignoré.
- TypeScript application et tests : réussis.
- Build Vite/SSR/prérendu : réussi (avertissements tiers Zod persistants).
- npm audit : 0 vulnérabilité signalée au moment du contrôle.
- git diff --check : réussi.

Revue : middleware d'identité/permissions, sessions et révocations, sélection de colonnes
des annuaires, requêtes paramétrées, exports et protection CSV, mutations/audit,
confirmation/CAS, migration/checksum/verrou et bootstrap explicite.

Tests supplémentaires ajoutés dans le test d'intégration existant : refus d'un jeton
signé dont iat est trop futur, date impossible, plage inversée, filtre de statut et
recherche contenant une tentative d'injection SQL traitée comme texte littéral.

## Correction issue de la revue

Un JWT correctement signé avec un iat futur n'était pas refusé explicitement par le
contrôle de durée du Control Center. Ajout du refus au-delà de 30 secondes de tolérance.
La signature demeure obligatoire ; ce défaut ne permettait pas de forger un jeton,
mais rendait la durée administrative incohérente en cas d'anomalie de l'émetteur.
La nouvelle assertion HTTP vérifie le refus 401.

## Points positifs constatés / limites de preuve

- Aucun privilège interne déduit d'un e-mail dans les chemins d'autorisation actuels.
- Permissions vérifiées côté serveur ; tests de refus des rôles et exports restreints.
- Colonnes sensibles invité/réservation exclues des nouveaux annuaires.
- Mutations principales et audit partagent la transaction ; rollback injecté testé.
- Audit protégé contre UPDATE/DELETE ; rôle propriétaire DB reste hors de cette garantie.
- Aucune migration du Control Center déclenchée par une requête.
- Revenus non sourcés laissés indisponibles ; aucun paiement fabriqué.

## Blocages avant activation production

1. **Élevé — fournisseur non validé** : contrat Neon réel, auth_time, MFA, refresh et
   révocation fournisseur non exécutés. Les actions sensibles refusent un auth_time
   absent ou ancien ; ne pas supprimer ce contrôle pour contourner le blocage.
2. **Élevé — migration et attribution** : 005 testée uniquement en PostgreSQL embarqué ;
   sauvegarde/restauration, cible staging et attribution initiale explicite à valider.
   L'ancien accès fondateur sera refusé sans cette attribution.
3. **Élevé — portée fonctionnelle** : mandat complet non terminé. Paiements, télémétrie
   événementielle, investigations de sécurité, dossiers complets et plusieurs workflows
   support restent à implémenter ; voir DELIVERY.md. Aucun label enterprise-ready justifié.
4. **Moyen — sessions** : limite par jeton, pas garantie de durée absolue de connexion
   face au refresh du fournisseur ; vérifier le contrat avant activation.
5. **Moyen — concurrence** : tests multi-connexion PostgreSQL indépendants et course
   quota/propriété non exécutés ; les tests PGlite ne remplacent pas ces preuves.
6. **Moyen — navigateur** : aucune validation aux sept résolutions, console, clavier ou
   E2E. Chromium ne démarre pas (libnspr4.so absente).
7. **Moyen — reprise** : couverture d'idempotence limitée ; brouillons et notes n'ont
   pas encore la clé de reprise présente sur la création des tickets.
8. **Hérité** : DDL/seed à la requête restent sur les autres API ; politique d'accès
   voyageurs et readiness fiables restent des chantiers séparés non résolus ici.

Verdict : **push de la branche de travail possible ; activation production non validée**.
Aucun secret, accès production, migration distante, nouveau privilège réel ni déploiement
manuel n'a été utilisé pour cet audit. Un push peut déclencher l'intégration Vercel de
la branche ; il ne constitue pas une validation de production.
