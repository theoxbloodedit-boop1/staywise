# STAYWISE — audit ciblé du workspace courant

## Verdict : HOLD pour utilisation avec de vrais voyageurs

L’application possède des contrôles réels, mais la confidentialité du portail et
la fiabilité des informations publiées ne sont pas suffisantes. 50 tests réussis
ne constituent pas une autorisation de mise en production.

### Périmètre et méthode

Revue des sources actuelles : portail et recherche invités, génération des guides,
invitations et inscription collaborateur, média privé, migrations et diagnostic.
Lecture des captures staging fournies par l’utilisateur, sans accès à sa session.
Exécution `npm ci --no-audit --no-fund`, puis `npm run verify` : succès.
Deux sondes locales : vraie route Express `/guest/:slug` et fonction de recherche,
avec couche DB remplacée par des fixtures entièrement fictives. Aucune connexion
Neon distante, aucun secret réel ni donnée client utilisés.

**Traçabilité :** au début de cet audit, HEAD local est e4efc43 et le workspace
contient les corrections cumulées non enregistrées, dont l’inscription staff.
C’est cet état de fichiers qui a été audité, pas une garantie de correspondance
avec un commit actuellement déployé. Ne pas réinitialiser ces changements.

Aucun changement applicatif, migration distante, suppression de données, commit,
push ou déploiement demandé par cet audit. Seul ce rapport est un livrable ajouté.
Le build a régénéré le shell ; cet artefact incident est restauré ensuite.

## Constats prioritaires

### A01 — P1 : adresse exacte renvoyée avant vérification du séjour

**Confirmé par sonde HTTP locale et cohérent avec captures 87–90.**
`server/routes/guest.ts:99–120` masque certains secrets, mais renvoie les autres
champs des sections tels quels. `:127` masque seulement `property.address_line`.
`server/seed-data.ts:77–79,226` duplique l’adresse dans fullAddress, mapLink,
directions et taxiRideshare. Masquer le rendu ne suffit donc pas.

Résultat avec requête sans code : HTTP 200, isVerified=false,
topLevelAddressRedacted=true, checkinFullAddressExposed=true,
addressInSerializedSections=true, pinRedacted=true.

**Impact :** un visiteur connaissant le slug peut lire l’adresse que le bandeau
annonce comme protégée. Ce n’est pas une preuve de fuite de PIN ni de données
inter-organisations.
**Correction attendue :** projection serveur des champs autorisés par état de
vérification, politique explicite pour les textes libres et cartes ; aucune
substitution globale fragile de chaînes ne suffit à garantir cette politique.
**Test d’acceptation :** inspecter le JSON complet sans code, code invalide et
séjour expiré ; aucune adresse, lien cartographique ou direction privée ne doit
sortir. Vérifier aussi la recherche et les exports publics.

### A02 — P1 : la recherche ignore la visibilité des sections

**Confirmé par sonde locale de fonction.** `server/domain.ts:463–474` sélectionne
is_visible mais ne filtre pas les lignes. Les branches métier utilisent ensuite
ce contenu, notamment :668–670 pour les transports.

Sonde : section getting_around avec is_visible=0, texte marqueur fictif ; question
« taxi », isVerifiedGuest=false : marqueur retourné, confidence="Verified".

**Impact :** masquer une section dans le guide ne la retire pas de la recherche.
Il s’agit d’une fuite de contenu de section cachée, pas d’une preuve d’accès aux
notes internes du modèle property ni d’une traversée de tenant.
**Correction attendue :** une projection publique commune au guide et au moteur
de recherche ; visibilité et vérification appliquées AVANT déchiffrement/usage.
**Test :** section cachée absente de toutes les réponses et de leurs sources,
avec et sans code. Ajouter ensuite une preuve HTTP sur `/guest/:slug/ai`.

### A03 — P1 : informations de sécurité inventées publiées comme réelles

**Confirmé par source et captures.** `server/routes/properties.ts:147–160` utilise
buildDefaultSections pour chaque vraie création. `server/seed-data.ts:62,210–216`
affirme inspection, hôpital, position d’extincteur, coupure d’eau et détecteurs
testés sans observation réelle. Les recommandations locales/équipements sont
aussi générés à partir d’exemples. La recherche peut les qualifier de Verified.

**Impact :** mauvaises indications en situation d’urgence, confiance trompeuse,
contenu incohérent avec Not Ready. La gravité est opérationnelle ; pas une
vulnérabilité réseau démontrée.
**Correction :** guide brouillon non publié par défaut, champs inconnus vides,
validation explicite du gestionnaire avant publication ; ne jamais présenter un
modèle comme une inspection accomplie. Corriger aussi les guides existants après
inventaire, sans supprimer aveuglément le contenu saisi par un client.
**Test :** nouvelle propriété sans faits confirmés ne publie ni équipement,
hôpital, contact 24/7 ni attestation d’inspection inventés.

### A04 — P2 : politique de cache insuffisante pour le portail invité

**Confirmé par sonde HTTP locale :** Cache-Control absent sur `/guest/:slug`.
La route peut aussi répondre à un séjour vérifié avec des secrets et son code
(`server/routes/guest.ts:145–165`). Contrairement au média privé, le routeur invité
n’impose pas `private, no-store`. L’application ne l’ajoute pas globalement.

**Impact :** stockage navigateur/intermédiaire non explicitement interdit ;
aucune fuite effective via cache partagé n’a été démontrée. Un CDN peut avoir
ses propres protections, qui ne remplacent pas la politique de la réponse.
**Correction/test :** private,no-store sur les réponses privées, y compris erreurs ;
réduire aussi la présence de codes dans les URL et vérifier historique/journaux.

### A05 — P2 : compteurs anti-essais non centralisés entre routes invitées

**Confirmé par lecture, attaque concurrente non exécutée.** La route GET du guide
appelle checkGuestBruteForceLock/recordGuestCodeAttempt, mais la recherche
(`server/routes/guest.ts:334`) et la résolution de média (`server/app.ts:150+`)
appellent directement resolveGuestVerification, qui ne consulte pas ce verrou.
Les limiteurs généraux subsistent, donc ce n’est PAS une absence de toute limite.

**Impact :** la règle annoncée de 8 échecs/15 minutes n’est pas commune à tous les
chemins vérifiant un code. Ce n’est pas un contournement de validité du code.
**Correction/test :** service de vérification partagé, compteur atomique commun,
verrou respecté entre endpoints et instances. Tester concurrence sur PostgreSQL
réel : les tests mémoire ne la démontrent pas.

### A06 — P2 : secrets et équipements d’accès créés sans configuration réelle

**Source :** `server/routes/properties.ts:157–159` invente un réseau Wi-Fi, utilise
un mot de passe constant si absent et un PIN généré via Math.random.
**Impact :** ces valeurs ne configurent ni le routeur ni une serrure ; l’interface
peut faire croire qu’elles fonctionnent. Un secret partagé n’est pas approprié
s’il est ensuite réellement réutilisé par un opérateur.
**Correction :** valeurs non configurées par défaut, saisie vérifiée ou intégration
matérielle réelle. Si génération nécessaire, utiliser crypto, mais remplacer
Math.random seul ne règle pas l’absence de provisioning de la serrure.

### A07 — P2 : endpoint de santé = liveness, pas readiness

**Source :** `server/app.ts:121–126` renvoie toujours status=ok ;
`server/db.ts:403–414` ne contrôle que SELECT 1, mémorisé après succès.
**Impact :** un contrôle de déploiement peut être vert avec schéma incomplet ou
configuration d’authentification inutilisable.
**Correction :** distinguer liveness publique et readiness opérateur à sortie
minimale ; vérifier version du schéma, configuration et dépendances requises.
Ne pas ajouter de DDL automatique ni révéler les valeurs d’environnement.

### A08 — P2 : migrations fiables sur base vierge, upgrade existant non certifié

Les tests prouvent installation locale vierge base+001–005, rollback et checksums.
Le moteur applicatif enregistre après exécution de CREATE IF NOT EXISTS : cela
ne prouve pas l’équivalence d’une table préexistante. Base et 001–004 sont dans
une transaction commune ; 005 est une autre commande et utilise un autre verrou.

**Risques :** verrous prolongés sur base existante ; installation intermédiaire
sans 005 ; adoption de structures divergentes non détectée par le seul registre.
Le schéma de base étant lui-même checksumé, ses futures modifications doivent
passer par une évolution explicite, pas une réécriture silencieuse.
**Correction/test :** préflight de schéma, staging cloné revu, orchestration explicite
et test upgrade/rollback/restauration ; ne pas rejouer 005 pour réparer un registre
sans rapprochement préalable. Aucun de ces tests distants n’a été exécuté ici.

## Contrôles utiles présents — sans certification exhaustive

- Invitations : jeton aléatoire 32 octets, hash seul conservé, expiration 48h,
  email vérifié correspondant, verrou de ligne et transaction, rôle/affectations
  validés, révocation et audit. Création/révocation et affichage du jeton observés
  par l’utilisateur ; acceptation réelle avec le second compte reste à faire.
- Inscription staff : retour avant création d’organisation ; tests de rendu et
  garde source, pas de test navigateur/provider complet.
- Autorisation propriété : organisation + périmètre vérifiés côté serveur ; les
  tests existants couvrent des refus multi-tenant et références étrangères.
- Média privé : autorisation serveur, vérification complète de l’image,
  réencodage JPEG/effacement métadonnées, no-store ; anciens fichiers refusés.
- Chiffrement : pas de clé de secours process ; tests existants au vert. Pas
  d’audit externe de rotation, sauvegardes, inventaire des clés ou ACL Neon.
- Plus de seed automatique au premier appel ; notifications marquées internes,
  pas de nouvelle pseudo-facture à 0. Ne garantit pas le nettoyage de l’historique.

## Résultats exécutés et limites

`npm run verify` : **50 réussis, 0 échec, 0 ignoré**. TypeScript application,
tests et scripts : succès. Build client + SSR : succès. npm audit : 0 vulnérabilité
signalée. Deux sondes supplémentaires locales ont confirmé A01 et A02 ; elles
ne sont pas des tests de non-régression réussis ni un audit de la base distante.

Aucun navigateur authentifié automatisé, pentest complet, test de restauration,
charge PostgreSQL réelle, inspection réseau du navigateur utilisateur ni audit
des autorisations hébergeur. Les captures seules ne prouvent pas l’absence de
secrets dans les payloads ; la sonde A01 démontre précisément cette distinction.
La divergence de capacité saisie/affichée reste NON attribuée : les captures ne
prouvent pas les valeurs réellement soumises. Ne pas annoncer une corruption.

## Ordre recommandé

1. Bloquer toute utilisation réelle des guides de test ; conserver l’évidence.
2. Corriger projection publique + recherche cachée (A01/A02), avec tests HTTP.
3. Retirer les faits inventés et instaurer une validation de publication (A03/A06).
4. Harmoniser cache et anti-essais (A04/A05), puis readiness/upgrade (A07/A08).
5. Reprendre le parcours staff et les photos mobiles sur staging ; recontrôler
   ensuite le portail non vérifié en inspectant réellement les réponses réseau.

**Décision : ne pas annoncer STAYWISE prêt pour de vrais voyageurs sur la seule
base du build, des tests locaux ou du succès de connexion au tableau de bord.**
