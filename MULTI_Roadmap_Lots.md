**MULTI**

Roadmap de developpement

Lots 01 - 20 \| 4 Phases \| 12 semaines

Version 1.0 · 31 mars 2026

**Confidentiel - equipe fondatrice uniquement**

**Sommaire executif**

Ce document decrit l\'ensemble des 20 lots de developpement du projet
MULTI, organises en 4 phases sur 12 semaines. Chaque lot est
independamment testable et s\'appuie sur les lots precedents selon des
dependances explicites.

**Vue d\'ensemble des 20 lots**

  --------- ------------------------------------------------ ------------ -------------------- -----------
  **Lot**   **Titre**                                        **Phase**    **Deadline**         **Owner**
  LOT 01    Infrastructure & Fondations                      MVP          J1 (31 mars)         Julien
  LOT 02    Wizard UI --- 12 questions                       MVP          J2-J3 (1-2 avril)    Julien
  LOT 03    Agent Sidebar + Persistance                      MVP          J3-J4 (2-3 avril)    Julien
  LOT 04    Generation BUSINESS.md + Ecran resultat          MVP          J4-J6 (4-7 avril)    Julien
  LOT 05    Auth Clerk + Dashboard squelette                 MVP          J6-J8 (8-11 avril)   Julien
  LOT 06    Paiements Stripe                                 Plateforme   Semaine 3            Julien
  LOT 07    Dashboard complet --- 3 colonnes                 Plateforme   Semaine 3-4          Julien
  LOT 08    BUSINESS.md Editeur                              Plateforme   Semaine 4            Julien
  LOT 09    Scorecard VALUE                                  Plateforme   Semaine 4            Julien
  LOT 10    Premier agent operationnel --- Agent Marketing   Agents       Semaine 5-6          Julien
  LOT 11    Cycle nocturne --- Nightly Cycle                 Agents       Semaine 6-7          Julien
  LOT 12    Quality Gate Agent                               Agents       Semaine 6            Julien
  LOT 13    VALUE Router                                     Agents       Semaine 7            Julien
  LOT 14    Mode Architecte --- Curseur d\'autonomie         Scaling      Semaine 9            Julien
  LOT 15    Vertical Packs --- Templates sectoriels          Scaling      Semaine 9-10         CAO
  LOT 16    Cross-Learning anonymise                         Scaling      Semaine 10-11        Julien
  LOT 17    Budget Intelligent --- Routage LLM               Scaling      Semaine 11           Julien
  LOT 18    GUARDRAILS.md operationnel                       Scaling      Semaine 11           Julien
  LOT 19    MULTI Academy --- Integration                    Scaling      Semaine 11-12        CAO
  LOT 20    MULTI Accelerator + Lancement public             Scaling      Semaine 12           CAO
  --------- ------------------------------------------------ ------------ -------------------- -----------

**Principes directeurs du developpement**

-   **Chaque lot livrable independamment : a la fin de chaque lot, un
    critere de succes objectif permet de valider avant de passer au
    suivant.**

```{=html}
<!-- -->
```
-   Si un lot n\'est pas valide, on ne passe pas au suivant. Pas
    d\'exception.

```{=html}
<!-- -->
```
-   **Docker first : toute la stack tourne dans Docker des le Lot 01.
    Pas de \'ca marche sur ma machine\'.**

-   **OpenRouter comme unique client LLM : tout appel LLM passe par
    lib/llm/client.ts via OpenRouter. Le modele par defaut est
    anthropic/claude-sonnet-4-5.**

-   **TypeScript strict, zero any : tous les types sont definis dans
    lib/types.ts avant d\'etre utilises.**

-   **Zod sur toutes les entrees API : chaque route valide son body
    avant tout acces DB.**

-   **Mobile-first : CSS mobile par defaut, desktop avec les breakpoints
    md: et lg:.**

-   **Commits apres chaque composant : format feat(wizard): add
    SelectAnswer component.**

+----------------------------------------------------------------------+
| **Phase 1 --- MVP**                                                  |
|                                                                      |
| Semaines 1-2 · Lots 01 a 05                                          |
|                                                                      |
| *L\'objectif de cette phase est de livrer un produit fonctionnel de  |
| bout en bout : le wizard genere un BUSINESS.md reel, l\'utilisateur  |
| peut souscrire, et le dashboard de base est accessible. C\'est la    |
| preuve de concept qui permet d\'acquerir les premiers beta users.*   |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 01**                                                           |
|                                                                      |
| **Infrastructure & Fondations**                                      |
|                                                                      |
| **Phase :** Phase 1 --- MVP **· Deadline :** J1 (31 mars) **· Owner  |
| :** Julien                                                           |
+----------------------------------------------------------------------+
| *Mettre en place toute l\'infrastructure technique sur laquelle      |
| s\'appuient tous les lots suivants. A la fin de ce lot, le projet    |
| tourne dans Docker, la base de donnees est cree, l\'auth est         |
| configuree.*                                                         |
+----------------------------------------------------------------------+

**Taches**

-   create-next-app avec TypeScript, Tailwind, App Router

-   Configuration tailwind.config.ts avec le design system complet
    (couleurs, typos, animations)

-   Installation de toutes les dependances : Clerk, Drizzle, Neon,
    Stripe, Postmark, PostHog, Zod, Geist

-   Redaction du fichier .env.local avec toutes les variables (vraies ou
    placeholder)

-   Ecriture du schema Drizzle complet : users, wizard\_sessions,
    business\_docs, ars, leads, analytics\_events

-   Configuration Drizzle (drizzle.config.ts) + scripts npm db:push /
    db:generate / db:migrate / db:studio

-   Client DB Neon (lib/db/index.ts)

-   Middleware Clerk (middleware.ts) protegant les routes
    /dashboard/\*\*

-   Layout racine avec ClerkProvider + PostHogProvider + fonts Geist

-   Ecriture de lib/types.ts avec tous les types partages

-   Creation du Dockerfile (Next.js) + docker-compose.yml (app +
    migration runner)

-   Verification : docker compose up sans erreur, tables visibles dans
    Drizzle Studio

+---------------------------------------------------------+
| **Critere de succes**                                   |
|                                                         |
| ✓ docker compose up demarre sans erreur                 |
|                                                         |
| ✓ npm run db:studio montre les 6 tables creees sur Neon |
|                                                         |
| ✓ La page localhost:3000 s\'affiche (meme blanche)      |
|                                                         |
| ✓ Aucune erreur TypeScript sur npm run build            |
+---------------------------------------------------------+

+--------------------------+------------------------------------------+
| **Dependances**          | **Risque principal**                     |
|                          |                                          |
| Aucune --- lot fondateur | Neon PostgreSQL peut avoir une latence   |
|                          | de cold start --- utiliser le pooler en  |
|                          | mode HTTP pour Drizzle, pas le mode      |
|                          | WebSocket.                               |
+--------------------------+------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 02**                                                           |
|                                                                      |
| **Wizard UI --- 12 questions**                                       |
|                                                                      |
| **Phase :** Phase 1 --- MVP **· Deadline :** J2-J3 (1-2 avril) **·   |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Construire l\'interface du wizard : les 12 questions avec leurs 4   |
| types de reponse, la navigation, la barre de progression, et les     |
| raccourcis clavier. C\'est le coeur du produit.*                     |
+----------------------------------------------------------------------+

**Taches**

-   Composants UI de base : Button, Input, Textarea, ProgressBar
    (lib/components/ui/)

-   lib/questions.ts : les 12 questions avec phases, types, options,
    placeholders

-   hooks/useWizard.ts : state machine complete (currentIndex, answers,
    step)

-   SelectAnswer.tsx : options empilees, auto-advance 400ms apres
    selection, champ \"Autre\" si applicable

-   TextAnswer.tsx : input pleine largeur, focus violet

-   TextareaAnswer.tsx : 3 lignes visibles, redimensionnable

-   TagsAnswer.tsx : pills flex-wrap, toggle on/off, couleurs vertes
    selectionnees

-   WizardQuestion.tsx : label de phase + titre + sous-texte + zone
    reponse

-   WizardNavigation.tsx : bouton Retour (texte simple) + Suivant
    (violet, desactive si pas de reponse)

-   Wizard.tsx : orchestrateur, transitions slide 200ms entre questions

-   Header.tsx : logo MULTI + H1 + sous-titre + preuve sociale + lien Se
    connecter

-   app/page.tsx : assemblage header + wizard + sidebar placeholder

-   Raccourcis clavier : Enter = Suivant, Escape = Retour, 1-8 =
    selection rapide

+--------------------------------------------------------+
| **Critere de succes**                                  |
|                                                        |
| ✓ Navigation Q1 vers Q12 sans erreur                   |
|                                                        |
| ✓ Auto-advance sur les questions select (400ms)        |
|                                                        |
| ✓ Bouton Suivant desactive si aucune reponse           |
|                                                        |
| ✓ Raccourcis clavier operationnels                     |
|                                                        |
| ✓ Responsive mobile : wizard pleine largeur sous 768px |
+--------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 01          | L\'animation de transition entre questions doit   |
|                 | etre imperceptiblement rapide (200ms) --- trop    |
|                 | lent = impression de bug.                         |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 03**                                                           |
|                                                                      |
| **Agent Sidebar + Persistance**                                      |
|                                                                      |
| **Phase :** Phase 1 --- MVP **· Deadline :** J3-J4 (2-3 avril) **·   |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Ajouter la sidebar agent avec ses messages contextuels et le        |
| preview BUSINESS.md en temps reel. Connecter la persistance des      |
| reponses en base de donnees.*                                        |
+----------------------------------------------------------------------+

**Taches**

-   Route POST /api/wizard/session : cree une session en DB, retourne
    session\_id

-   Route POST /api/wizard/answer : merge la reponse dans answers JSON
    de la session

-   Integration dans useWizard : initSession() au montage, setAnswer()
    persiste en background (fire and forget)

-   lib/agentMessages.ts : INITIAL\_MESSAGE, SECTOR\_MESSAGES (8
    verticales), getLocationMessage() (8 villes), getDelegateMessage()

-   hooks/useAgentMessages.ts : gere la liste des messages, le typing
    indicator (1-2s), les triggers par question

-   AgentMessage.tsx : 3 types de bulles (standard, contextuel, insight)
    avec styles distincts

-   AgentSidebar.tsx : header fixe (avatar M, statut En ligne), zone
    messages scrollable, position sticky desktop

-   BusinessMdPreview.tsx : preview code-style des donnees du wizard,
    apparait apres Q4, se met a jour en temps reel

-   Layout mobile : sidebar en panneau retractable bas (48px replie, 60%
    ecran deplie, swipe gesture)

-   Badge notification violet sur la barre mobile quand nouveau message

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Wizard session creee en DB a l\'arrivee sur la page                |
|                                                                      |
| ✓ Chaque reponse sauvegardee en DB (verifiable via Drizzle Studio)   |
|                                                                      |
| ✓ 3 messages agent declenches : apres Q1 (secteur), Q3               |
| (localisation), Q8 (delegation)                                      |
|                                                                      |
| ✓ Preview BUSINESS.md apparait dans la sidebar apres Q4              |
|                                                                      |
| ✓ Sidebar mobile repliable sans bug de layout                        |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 01, Lot 02  | La persistance des reponses est fire-and-forget   |
|                 | --- si la requete echoue silencieusement, les     |
|                 | donnees sont perdues. Ajouter un retry simple ou  |
|                 | un log d\'erreur visible.                         |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 04**                                                           |
|                                                                      |
| **Generation BUSINESS.md + Ecran resultat**                          |
|                                                                      |
| **Phase :** Phase 1 --- MVP **· Deadline :** J4-J6 (4-7 avril) **·   |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Integrer l\'appel OpenRouter/Claude pour generer le BUSINESS.md,    |
| afficher l\'ecran d\'animation, montrer le document genere, et       |
| proposer les plans tarifaires + capture email.*                      |
+----------------------------------------------------------------------+

**Taches**

-   lib/llm/client.ts : wrapper fetch natif sur OpenRouter
    (Authorization, HTTP-Referer, X-Title)

-   lib/llm/generateBusinessMd.ts : buildPrompt() avec les 12 reponses,
    appel callLLM() avec claude-sonnet-4-5

-   Route POST /api/wizard/complete : validation Zod, generation,
    marquage session completee, sauvegarde businessDoc si connecte

-   GenerationScreen.tsx : barre de progression, 5 messages defilants,
    duree minimum 3.5s

-   Logique de timing dans useWizard.generate() : attendre MIN\_MS -
    elapsed avant d\'afficher le resultat

-   BusinessMdDisplay.tsx : rendu markdown (parser maison ou remark),
    sections repliables (details/summary), bouton Telecharger .md

-   ResultScreen.tsx : layout 60%/40% (document + sidebar CTA)

-   lib/stripe/plans.ts : definition des 3 plans (Starter 79e, Pro 199e,
    Business 499e)

-   PricingCards.tsx : 3 cartes avec plan PRO mis en avant (border
    violet, badge Recommande)

-   EmailCapture.tsx : champ email + bouton Recevoir + route POST
    /api/wizard/save-email

-   Route POST /api/wizard/save-email : insertion leads en DB, mise a
    jour session

-   FAQ.tsx : 6 questions accordeon sous le wizard

+---------------------------------------------------------------+
| **Critere de succes**                                         |
|                                                               |
| ✓ BUSINESS.md genere en moins de 15 secondes via OpenRouter   |
|                                                               |
| ✓ Animation de generation visible minimum 3.5 secondes        |
|                                                               |
| ✓ Document affiche en markdown rendu avec sections repliables |
|                                                               |
| ✓ Bouton Telecharger .md genere un fichier valide             |
|                                                               |
| ✓ 3 plans tarifaires affiches avec PRO mis en avant           |
|                                                               |
| ✓ Email capture sauvegarde en DB (table leads)                |
+---------------------------------------------------------------+

+------------------------+--------------------------------------------+
| **Dependances**        | **Risque principal**                       |
|                        |                                            |
| Lot 01, Lot 02, Lot 03 | Si OpenRouter est lent (\>15s),            |
|                        | l\'utilisateur abandonne. Implementer un   |
|                        | timeout de 20s avec message d\'erreur et   |
|                        | bouton Reessayer.                          |
+------------------------+--------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 05**                                                           |
|                                                                      |
| **Auth Clerk + Dashboard squelette**                                 |
|                                                                      |
| **Phase :** Phase 1 --- MVP **· Deadline :** J6-J8 (8-11 avril) **·  |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Ajouter l\'authentification Clerk, creer l\'utilisateur en DB a la  |
| premiere connexion, et poser le squelette du dashboard (layout 3     |
| colonnes) que tous les lots suivants vont remplir.*                  |
+----------------------------------------------------------------------+

**Taches**

-   Pages Clerk : app/(auth)/sign-in/\[\[\...sign-in\]\]/page.tsx +
    sign-up

-   Webhook Clerk (api/webhooks/clerk) : creer l\'utilisateur en DB a
    user.created, mettre a jour a user.updated

-   Dashboard layout 3 colonnes : NavSidebar gauche (menu, ARS actif,
    plan) + espace central + AgentSidebar droite

-   NavSidebar.tsx : PILOTER (Dashboard, Scorecard, BUSINESS.md) +
    AGENTS (CEO, Marketing, Engineering, Support) + OUTILS

-   app/(dashboard)/dashboard/page.tsx : version minimale avec message
    de bienvenue + indicateur ARS actif

-   Route GET /api/user/me : retourne l\'utilisateur courant avec son
    plan et ses ARS

-   Redirection post-wizard : si l\'utilisateur souscrit, le rediriger
    vers /dashboard apres le paiement

-   Protection des routes dashboard via middleware.ts Clerk

-   Sync utilisateur : si session wizard completee + connexion, lier la
    session a l\'userId

+--------------------------------------------------+
| **Critere de succes**                            |
|                                                  |
| ✓ Inscription Google ou email fonctionnelle      |
|                                                  |
| ✓ Utilisateur cree en DB a la premiere connexion |
|                                                  |
| ✓ Routes /dashboard/\* inaccessibles sans auth   |
|                                                  |
| ✓ Layout 3 colonnes affiche sans erreur          |
|                                                  |
| ✓ NavSidebar presente avec tous les items        |
+--------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 01, Lot 04  | Le webhook Clerk doit etre configure avec la      |
|                 | bonne URL en production (Vercel). En dev,         |
|                 | utiliser Clerk CLI ou ngrok pour exposer le       |
|                 | webhook local.                                    |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **Phase 2 --- Plateforme**                                           |
|                                                                      |
| Semaines 3-4 · Lots 06 a 09                                          |
|                                                                      |
| *Cette phase transforme le MVP en vraie plateforme : les paiements   |
| sont reels, le dashboard est complet, le BUSINESS.md est editable,   |
| et la Scorecard VALUE donne une vision claire de l\'avancement de    |
| l\'ARS.*                                                             |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 06**                                                           |
|                                                                      |
| **Paiements Stripe**                                                 |
|                                                                      |
| **Phase :** Phase 2 --- Plateforme **· Deadline :** Semaine 3 **·    |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Integrer le tunnel de paiement Stripe complet : checkout, webhook,  |
| gestion des etats d\'abonnement, et synchronisation du plan          |
| utilisateur en DB.*                                                  |
+----------------------------------------------------------------------+

**Taches**

-   Creer les 3 produits et plans dans le dashboard Stripe (Starter 79e,
    Pro 199e, Business 499e)

-   lib/stripe/client.ts : instance Stripe avec version API fixee

-   Route POST /api/stripe/checkout : creer session checkout Stripe avec
    le bon priceId, retourner l\'URL

-   Boutons \"Activer\" dans PricingCards.tsx : appel
    /api/stripe/checkout puis redirect vers Stripe

-   Route POST /api/stripe/webhook : handler complet pour
    customer.subscription.created/.updated/.deleted

-   Sync plan en DB : mettre a jour users.plan,
    users.subscriptionStatus, users.subscriptionCurrentPeriodEnd

-   Page /dashboard : afficher le plan actuel (badge
    Starter/Pro/Business) + date de renouvellement

-   Route POST /api/stripe/portal : creer une session Stripe Customer
    Portal pour la gestion de l\'abonnement

-   Lien \"Gerer mon abonnement\" dans NavSidebar -\> Stripe Customer
    Portal

-   Tests en mode test Stripe (cartes 4242\...)

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Clic sur Activer -\> redirect Stripe Checkout -\> paiement test    |
| -\> retour dashboard                                                 |
|                                                                      |
| ✓ Plan mis a jour en DB apres webhook Stripe                         |
|                                                                      |
| ✓ Annulation via Customer Portal -\> statut canceled en DB           |
|                                                                      |
| ✓ Plan affiche correctement dans le dashboard                        |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 05          | Le webhook Stripe doit verifier la signature      |
|                 | (stripe.webhooks.constructEvent) --- sans cette   |
|                 | verification, l\'endpoint est exploitable.        |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 07**                                                           |
|                                                                      |
| **Dashboard complet --- 3 colonnes**                                 |
|                                                                      |
| **Phase :** Phase 2 --- Plateforme **· Deadline :** Semaine 3-4 **·  |
| Owner :** Julien + CAO                                               |
+----------------------------------------------------------------------+
| *Construire le dashboard quotidien complet avec les metriques VALUE, |
| le briefing nocturne, et les actions a valider. C\'est l\'ecran que  |
| l\'Architecte voit chaque matin.*                                    |
+----------------------------------------------------------------------+

**Taches**

-   MetricCard.tsx : carte metrique avec valeur, variation (+18%),
    tendance, sparkline simple

-   Vue Dashboard principal : 4 metric cards VALUE en haut (Revenu,
    Commandes, Satisfaction, Trafic)

-   Section \"Actions de cette nuit\" : liste timestampee avec statut
    (coche fait, triangle a valider)

-   Bouton \[OUI\] / \[MODIFIER\] / \[REFUSER\] sur les actions en
    attente --- geste principal de l\'Architecte

-   AgentBriefing.tsx : la colonne droite affiche le briefing nocturne
    de l\'agent CEO

-   Selecteur de periode : Aujourd\'hui / 7 jours / 30 jours

-   Indicateur \"ARS actif\" en haut a droite (point vert pulse + nom du
    plan)

-   Route GET /api/dashboard/summary : agrege les donnees du jour depuis
    la DB

-   Persistance des decisions (OUI/REFUSER) dans une table
    action\_validations

-   Notification email matin (Postmark) : briefing quotidien a 7h avec
    resume des actions nocturnes

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Dashboard charge en moins de 2 secondes                            |
|                                                                      |
| ✓ Les 4 metric cards affichent des donnees (meme mockees pour        |
| l\'instant)                                                          |
|                                                                      |
| ✓ Actions avec boutons OUI/REFUSER fonctionnels et persistes en DB   |
|                                                                      |
| ✓ Briefing agent affiche dans la colonne droite                      |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 05, Lot 06  | Les metriques VALUE sont vides au debut (pas      |
|                 | encore d\'agents qui les alimentent). Afficher    |
|                 | des donnees mock realistes pour que l\'UI soit    |
|                 | comprehensible.                                   |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 08**                                                           |
|                                                                      |
| **BUSINESS.md Editeur**                                              |
|                                                                      |
| **Phase :** Phase 2 --- Plateforme **· Deadline :** Semaine 4 **·    |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Permettre a l\'Architecte de consulter et editer son BUSINESS.md    |
| directement dans l\'interface, avec versioning simple et sauvegarde  |
| automatique.*                                                        |
+----------------------------------------------------------------------+

**Taches**

-   Route GET /api/business-md : retourne le businessDoc de
    l\'utilisateur courant

-   Route PUT /api/business-md/\[id\] : met a jour le contenu,
    incremente la version

-   app/(dashboard)/business-md/page.tsx : vue editeur

-   BusinessMdEditor.tsx : textarea pleine hauteur en mode edit, rendu
    markdown en mode lecture

-   Toggle Edit / Preview dans l\'en-tete de la page

-   Sauvegarde automatique (debounce 2s) lors de la frappe en mode edit

-   Indicateur \"Sauvegarde\...\" / \"Sauvegarde\" dans l\'en-tete

-   Historique des versions : liste des versions precedentes avec date
    et nombre de lignes

-   Bouton \"Regenerer\" : relance la generation Claude avec les 12
    reponses originales

-   Bouton \"Telecharger .md\" disponible en permanence

-   La colonne agent droite passe en mode \"consultant strategique\" :
    l\'agent commente les sections du BUSINESS.md

+----------------------------------------------------------+
| **Critere de succes**                                    |
|                                                          |
| ✓ Lecture du BUSINESS.md en markdown rendu               |
|                                                          |
| ✓ Edition et sauvegarde automatique fonctionnelles       |
|                                                          |
| ✓ Versioning : au moins 3 versions distinctes conservees |
|                                                          |
| ✓ Regeneration via Claude API operationnelle             |
+----------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 04, Lot 05  | L\'editeur textarea raw markdown est fonctionnel  |
|                 | mais peu ergonomique. Priorite a la               |
|                 | fonctionnalite \-- l\'editeur WYSIWYG est pour la |
|                 | V2.                                               |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 09**                                                           |
|                                                                      |
| **Scorecard VALUE**                                                  |
|                                                                      |
| **Phase :** Phase 2 --- Plateforme **· Deadline :** Semaine 4 **·    |
| Owner :** Julien + CAO                                               |
+----------------------------------------------------------------------+
| *Construire la vue Scorecard VALUE : les 5 piliers avec leur score,  |
| leur action prioritaire, et l\'identification automatique du maillon |
| le plus faible.*                                                     |
+----------------------------------------------------------------------+

**Taches**

-   app/(dashboard)/scorecard/page.tsx

-   ScorecardView.tsx : 5 lignes (V, A, L, U, E) avec barre de
    progression, score en %, action prioritaire

-   Logique VALUE Router (frontend) : identifier le pilier avec le score
    le plus bas (le maillon faible)

-   Mise en evidence du maillon faible : bordure rouge, badge \"Priorite
    VALUE Router\"

-   Route GET /api/scorecard : retourne les donnees scorecardData de
    l\'ARS actif

-   Route PUT /api/scorecard : permet a l\'agent CEO de mettre a jour
    les scores (usage interne agents)

-   La colonne agent droite en mode Scorecard : l\'agent explique le
    score faible et ce qu\'il fait pour le remedier

-   Seeds de donnees de test : remplir la scorecard avec des donnees
    realistes pour que la vue soit testable

+--------------------------------------------------------------------+
| **Critere de succes**                                              |
|                                                                    |
| ✓ Les 5 piliers VALUE affiches avec barre de progression           |
|                                                                    |
| ✓ Le pilier le plus faible mis en evidence visuellement            |
|                                                                    |
| ✓ Donnees lues depuis la DB (pas mockees en dur dans le composant) |
|                                                                    |
| ✓ Agent droite contextualise le pilier faible                      |
+--------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 07          | Les scores VALUE ne sont alimentes que par les    |
|                 | agents (Lot 11+). Pour les lots 9-10, utiliser    |
|                 | des donnees de seed ou un calcul heuristique sur  |
|                 | les donnees disponibles.                          |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **Phase 3 --- Agents**                                               |
|                                                                      |
| Semaines 5-8 · Lots 10 a 13                                          |
|                                                                      |
| *Le coeur du produit : les agents IA deviennent operationnels. Le    |
| premier agent marketing genere du contenu reel. Le cycle nocturne    |
| tourne de maniere autonome. Le Quality Gate garantit la qualite. Le  |
| VALUE Router optimise les ressources.*                               |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 10**                                                           |
|                                                                      |
| **Premier agent operationnel --- Agent Marketing**                   |
|                                                                      |
| **Phase :** Phase 3 --- Agents **· Deadline :** Semaine 5-6 **·      |
| Owner :** Julien + CAO                                               |
+----------------------------------------------------------------------+
| *Deployer le premier agent IA operationnel : l\'Agent Marketing. Il  |
| peut rediger des posts Instagram, des emails de prospection, et des  |
| descriptions Google Business. Toutes ses productions passent par le  |
| Quality Gate avant publication.*                                     |
+----------------------------------------------------------------------+

**Taches**

-   Table agent\_tasks en DB : agent\_id, type, status
    (pending/running/done/failed/awaiting\_validation), input, output,
    created\_at

-   lib/agents/marketing/marketingAgent.ts : classe orchestrant les
    taches marketing

-   Tache 1 --- Post Instagram : genere un post adapte au secteur et au
    calendrier marketing du BUSINESS.md

-   Tache 2 --- Email de prospection B2B : genere un email personnalise
    pour une cible de la section CIBLES PRIORITAIRES

-   Tache 3 --- Description Google Business : genere / met a jour la
    description de la fiche GMB

-   Chaque tache utilise le BUSINESS.md comme contexte (prompt enrichi)

-   Chaque tache passe par le Quality Gate avant d\'etre soumise a
    validation

-   app/(dashboard)/agents/marketing/page.tsx : vue Agent Marketing

-   AgentView.tsx : statut agent (actif, N taches depuis le lancement),
    campagnes actives, actions planifiees, skill files

-   L\'utilisateur peut \"parler directement a l\'agent\" via le champ
    en colonne droite

-   Bouton \"Lancer une tache\" manuel depuis l\'interface

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ L\'agent genere un post Instagram coherent avec le BUSINESS.md     |
|                                                                      |
| ✓ L\'email de prospection cite une vraie cible de la section CIBLES  |
| PRIORITAIRES                                                         |
|                                                                      |
| ✓ Chaque output passe par le Quality Gate avant affichage            |
|                                                                      |
| ✓ Les taches sont loguees en DB avec statut                          |
+----------------------------------------------------------------------+

+----------------------------------+----------------------------------+
| **Dependances**                  | **Risque principal**             |
|                                  |                                  |
| Lot 07, Lot 08, Lot 09 (Quality  | Sans acces aux vraies APIs       |
| Gate = Lot 12)                   | (Instagram Graph API, Google     |
|                                  | Business API), les publications  |
|                                  | sont simulees. Implementer       |
|                                  | d\'abord la generation du        |
|                                  | contenu, l\'integration API en   |
|                                  | Phase 4.                         |
+----------------------------------+----------------------------------+

+----------------------------------------------------------------------+
| **LOT 11**                                                           |
|                                                                      |
| **Cycle nocturne --- Nightly Cycle**                                 |
|                                                                      |
| **Phase :** Phase 3 --- Agents **· Deadline :** Semaine 6-7 **·      |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Implementer le cycle autonome nocturne qui tourne chaque nuit a 2h. |
| Le VALUE Router identifie le pilier faible, les agents executent, le |
| Quality Gate valide, tout est logue dans CHANGELOG.md.*              |
+----------------------------------------------------------------------+

**Taches**

-   Cron job (Vercel Cron ou service Render dedie) : declenchement a
    2h00 CET

-   Route POST /api/cron/nightly : endpoint securise (CRON\_SECRET) qui
    orchestre le cycle

-   Etape 1 --- Collecte : lire SCORECARD.md (scorecardData en DB) et
    les metriques du jour

-   Etape 2 --- VALUE Router : identifier le pilier le plus faible,
    decider quelle action executer

-   Etape 3 --- Execution : declencher la tache de l\'agent
    correspondant (Marketing si Acquisition faible, etc.)

-   Etape 4 --- Quality Gate : scorer l\'output (voir Lot 12), retirer
    si sous le seuil

-   Etape 5 --- Logging : ecrire dans CHANGELOG.md (champ en DB), mettre
    a jour SCORECARD.md

-   Etape 6 --- Preparation briefing : rediger le resume pour
    l\'Architecte (lu le matin)

-   Notification email a 7h via Postmark : briefing du cycle nocturne

-   Table nightly\_cycles en DB : date, pilier\_cible,
    actions\_executees, actions\_validees, briefing

-   Gestion des timeouts : si une tache depasse 30s, la marquer failed
    et continuer

+--------------------------------------------------------------+
| **Critere de succes**                                        |
|                                                              |
| ✓ Le cron se declenche a 2h et complete sans erreur          |
|                                                              |
| ✓ Le VALUE Router identifie correctement le pilier faible    |
|                                                              |
| ✓ Au moins 1 tache executee et loguee en DB par cycle        |
|                                                              |
| ✓ Le briefing du matin est disponible dans le dashboard a 7h |
|                                                              |
| ✓ L\'email de notification est envoye via Postmark           |
+--------------------------------------------------------------+

+------------------------+--------------------------------------------+
| **Dependances**        | **Risque principal**                       |
|                        |                                            |
| Lot 09, Lot 10, Lot 12 | Vercel Cron est limite a 1 execution par   |
|                        | jour sur les plans gratuits. Pour les      |
|                        | plans Pro/Business, utiliser un service    |
|                        | Render dedie avec node-cron.               |
+------------------------+--------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 12**                                                           |
|                                                                      |
| **Quality Gate Agent**                                               |
|                                                                      |
| **Phase :** Phase 3 --- Agents **· Deadline :** Semaine 6 **· Owner  |
| :** Julien + CAO                                                     |
+----------------------------------------------------------------------+
| *Deployer l\'agent Quality Gate : un agent separe qui relit chaque   |
| output avant publication. Il score sur 3 axes et bloque les contenus |
| sous le seuil. C\'est la reponse directe a l\'AI slop de Polsia.*    |
+----------------------------------------------------------------------+

**Taches**

-   lib/agents/qualityGate/qualityGateAgent.ts

-   Scoring sur 3 axes (0-100 chacun) : Clarte du message, Pertinence
    pour la cible (via BUSINESS.md), Absence d\'erreurs / conformite
    GUARDRAILS

-   Score global = moyenne ponderee (40% clarte, 40% pertinence, 20%
    conformite)

-   Seuil de publication : score \>= 70 = publication automatique, 50-69
    = mise en attente validation humaine, \<50 = retravaille
    automatiquement (1 retry)

-   Prompt Quality Gate : envoie l\'output + le contexte BUSINESS.md +
    les GUARDRAILS a Claude

-   La reponse Claude contient : scores numeriques + explication
    courte + decision (publish / validate / rework)

-   Table quality\_gate\_results en DB : task\_id, scores, decision,
    explanation, created\_at

-   Integration dans le cycle de chaque agent (appele avant toute
    soumission a validation)

-   Vue Quality Gate dans le dashboard : historique des outputs scores,
    distribution des scores

-   Alerte si le score moyen sur 7 jours tombe sous 65 : notification
    Architecte

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Chaque output d\'agent passe par le Quality Gate avant d\'etre     |
| propose a validation                                                 |
|                                                                      |
| ✓ Un output de mauvaise qualite (test manuel) est bloque ou          |
| retravaille                                                          |
|                                                                      |
| ✓ Les scores sont loggues en DB                                      |
|                                                                      |
| ✓ La vue historique des scores est accessible dans le dashboard      |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 10          | Le Quality Gate lui-meme appelle Claude (cout LLM |
|                 | additionnel par tache). Sur le plan Starter (20   |
|                 | taches/jour), le cout total reste acceptable ---  |
|                 | surveiller via Langfuse.                          |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 13**                                                           |
|                                                                      |
| **VALUE Router**                                                     |
|                                                                      |
| **Phase :** Phase 3 --- Agents **· Deadline :** Semaine 7 **· Owner  |
| :** Julien + CAO                                                     |
+----------------------------------------------------------------------+
| *Implementer le VALUE Router comme meta-agent algorithmique : il     |
| analyse les 5 piliers, identifie le maillon le plus faible, et route |
| 100% des ressources nocturnes vers ce pilier.*                       |
+----------------------------------------------------------------------+

**Taches**

-   lib/agents/valueRouter/valueRouter.ts : class ValueRouter

-   Methode analyze(scorecardData) : retourne le pilier le plus faible
    avec un score de confiance

-   Methode route(weakPillar) : retourne la liste des taches
    prioritaires pour ce pilier

-   Table de routing : Value faible -\> taches (prix, offre, carte),
    Acquisition faible -\> taches (prospection, SEO, social), Leverage
    faible -\> taches (page commande, objections), Uptake faible -\>
    taches (support, satisfaction), Enhancement faible -\> taches (A/B
    tests, hypotheses)

-   Algorithme de scoring Value Router : pilier\_score \* (1 +
    jours\_depuis\_derniere\_action) - facteur\_saturation

-   Le facteur saturation empeche de cibler le meme pilier 3 nuits de
    suite si peu d\'amelioration

-   Integration dans le cycle nocturne (Lot 11) : le VALUE Router
    remplace le choix arbitraire d\'actions

-   Logging de la decision de routing dans
    nightly\_cycles.value\_router\_decision

-   Vue VALUE Router dans Scorecard : expliquer pourquoi ce pilier a ete
    choisi cette nuit

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Le VALUE Router identifie correctement le pilier faible sur des    |
| donnees de test                                                      |
|                                                                      |
| ✓ La decision de routing est expliquee et loguee                     |
|                                                                      |
| ✓ Le facteur saturation empeche un ciblage repetitif du meme pilier  |
|                                                                      |
| ✓ Integration complete dans le cycle nocturne                        |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 09, Lot 11  | Le VALUE Router est aussi bon que les donnees     |
|                 | qu\'il recoit. Si SCORECARD.md est mal alimente   |
|                 | (scores tous a 50%), le routing est arbitraire.   |
|                 | Documenter clairement comment chaque agent met a  |
|                 | jour les scores.                                  |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **Phase 4 --- Scaling**                                              |
|                                                                      |
| Semaines 9-12 · Lots 14 a 20                                         |
|                                                                      |
| *La phase de scaling : Mode Architecte, Vertical Packs sectoriels,   |
| Cross-Learning, Budget Intelligent, GUARDRAILS, Academy,             |
| Accelerator, et lancement public. MULTI devient le produit complet   |
| tel que defini dans le Strategic Product Briefing.*                  |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 14**                                                           |
|                                                                      |
| **Mode Architecte --- Curseur d\'autonomie**                         |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 9 **· Owner |
| :** Julien + CAO                                                     |
+----------------------------------------------------------------------+
| *Implementer le Mode Architecte : un curseur configurable            |
| d\'autonomie qui determine le volume de validations humaines. Il     |
| evolue dans le temps au fur et a mesure que l\'ARS gagne la          |
| confiance de l\'Architecte.*                                         |
+----------------------------------------------------------------------+

**Taches**

-   Champ autonomy\_level dans la table ars : prudent \| equilibre \|
    autonome \| full\_auto

-   Route PATCH /api/ars/\[id\]/autonomy : met a jour le niveau
    d\'autonomie

-   Curseur UI dans les parametres ARS : 4 positions avec description de
    chaque mode

-   Mode Prudent : chaque action soumise a validation avant execution

-   Mode Equilibre : les actions sans depense et sans contact client
    sont auto-approuvees

-   Mode Autonome : toutes les actions auto-approuvees sauf depenses \>
    seuil configurable

-   Mode Full Auto : zero validation, rapport matin uniquement

-   Le Quality Gate score minimum requis augmente avec l\'autonomie
    (Prudent: 60, Full Auto: 80)

-   Historique des changements de niveau : table autonomy\_changes avec
    raison et date

-   Suggestion intelligente : apres 30 jours, l\'agent suggere
    d\'augmenter le niveau si taux d\'approbation \> 90%

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Changement de niveau d\'autonomie sauvegarde et immediatemment     |
| effectif                                                             |
|                                                                      |
| ✓ En mode Prudent, toutes les actions passent par la validation      |
|                                                                      |
| ✓ En mode Full Auto, aucune validation requise (actions logues       |
| seulement)                                                           |
|                                                                      |
| ✓ Suggestion de niveau proposee apres 30 jours                       |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 11, Lot 12  | Le mode Full Auto est risque pour les nouveaux    |
|                 | utilisateurs. Ajouter un guardrail : Full Auto    |
|                 | non disponible avant 30 jours d\'utilisation ET   |
|                 | 100+ actions validees.                            |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 15**                                                           |
|                                                                      |
| **Vertical Packs --- Templates sectoriels**                          |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 9-10 **·    |
| Owner :** CAO                                                        |
+----------------------------------------------------------------------+
| *Creer les Vertical Packs : des bundles pre-configures de            |
| BUSINESS.md + skill files + SOUL.md + GUARDRAILS.md par verticale.   |
| Ce sont les templates sectoriels qui differencient MULTI de Polsia.* |
+----------------------------------------------------------------------+

**Taches**

-   Table vertical\_packs en DB : id, name, sector, soul\_md,
    guardrails\_md, skills (JSON), business\_md\_template

-   Route GET /api/vertical-packs : liste les packs disponibles

-   Route POST /api/vertical-packs/\[id\]/apply : applique un pack a
    l\'ARS actif

-   Pack Vertical 1 --- Restaurant / Food : prompt specifique, cibles
    B2B (entreprises locales), calendrier saisonnier, guardrails
    alimentaires

-   Pack Vertical 2 --- E-commerce : focus ROAS, sequences d\'abandon de
    panier, upsells automatiques

-   Pack Vertical 3 --- Consulting / Coaching : sequences LinkedIn,
    prospection decision-makers, propositions commerciales

-   Pack Vertical 4 --- Services locaux : SEO local, gestion avis
    Google, prospection de quartier

-   Pack Vertical 5 --- SaaS / Produit digital : acquisition self-serve,
    onboarding, retention, NPS

-   UI : page de selection du Vertical Pack lors de l\'activation de
    l\'ARS (apres le wizard)

-   Indicateur de pack actif dans NavSidebar

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ 5 Vertical Packs disponibles avec contenu complet                  |
|                                                                      |
| ✓ Application d\'un pack met a jour le BUSINESS.md et les skill      |
| files de l\'ARS                                                      |
|                                                                      |
| ✓ L\'agent utilise le bon pack dans ses generations (test manuel sur |
| 2 verticales)                                                        |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 08, Lot 10  | Les Vertical Packs sont des actifs cles de MULTI  |
|                 | --- leur qualite determine la qualite des outputs |
|                 | des agents. CAO doit valider chaque template      |
|                 | avant mise en production.                         |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 16**                                                           |
|                                                                      |
| **Cross-Learning anonymise**                                         |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 10-11 **·   |
| Owner :** Julien + CAO                                               |
+----------------------------------------------------------------------+
| *Implementer le Cross-Learning : les skill files les plus            |
| performants (meilleur taux d\'ouverture email, meilleur engagement)  |
| sont identifies, anonymises, et proposes aux autres ARS de la meme   |
| verticale. C\'est le moat long terme de MULTI.*                      |
+----------------------------------------------------------------------+

**Taches**

-   Table skill\_performance en DB : ars\_id, skill\_type, sector,
    metric\_name, metric\_value, period

-   Job hebdomadaire : calculer les top performers par sector +
    skill\_type

-   Algorithme d\'anonymisation : supprimer tous les identifiants
    business specifiques du skill file

-   Table shared\_skills en DB : skill\_type, sector,
    content\_anonymized, performance\_score, shared\_at

-   Route GET /api/shared-skills?sector= : retourne les meilleurs skills
    du secteur

-   Opt-in dans les parametres ARS : \"Participer au Cross-Learning (vos
    meilleurs skills sont partages anonymement)\"

-   Notification Architecte : \"Un nouveau skill haute performance est
    disponible pour votre secteur\"

-   Route POST /api/ars/\[id\]/apply-shared-skill : applique un shared
    skill a l\'ARS

-   Dashboard cross-learning : voir les skills partages disponibles +
    leurs scores de performance

+---------------------------------------------------------------------+
| **Critere de succes**                                               |
|                                                                     |
| ✓ Les skills sont scores et les top performers identifies           |
|                                                                     |
| ✓ Anonymisation complete (aucun identifiant business residuel)      |
|                                                                     |
| ✓ Un shared skill peut etre applique a un ARS different             |
|                                                                     |
| ✓ Notification envoyee quand un nouveau shared skill est disponible |
+---------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 10, Lot 15  | Le Cross-Learning ne fonctionne qu\'avec un       |
|                 | volume suffisant d\'ARS actifs (50+). Avant ce    |
|                 | seuil, le systeme tourne a vide. Prevoir une      |
|                 | periode de bootstrap avec des skills crees        |
|                 | manuellement par CAO.                             |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 17**                                                           |
|                                                                      |
| **Budget Intelligent --- Routage LLM**                               |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 11 **·      |
| Owner :** Julien                                                     |
+----------------------------------------------------------------------+
| *Implementer le Budget Intelligent : routage automatique via         |
| OpenRouter selon la complexite de la tache. Taches simples -\>       |
| modeles economiques. Taches complexes -\> modeles premium. Taches    |
| critiques -\> premium + Quality Gate.*                               |
+----------------------------------------------------------------------+

**Taches**

-   lib/llm/router.ts : selectModel(taskType, complexity) -\> model
    string

-   Classification des taches : LIGHT (posts courts, emails simples) -\>
    claude-haiku, MEDIUM (emails prospection, descriptions) -\>
    claude-sonnet, HEAVY (generation BUSINESS.md, Quality Gate) -\>
    claude-sonnet ou opus

-   Parametres configurables par plan : Starter (LIGHT uniquement), Pro
    (LIGHT + MEDIUM), Business (tous)

-   Logging des couts dans agent\_tasks : tokens\_input, tokens\_output,
    cost\_usd (via OpenRouter usage)

-   Dashboard des couts : cout total du mois, cout par tache type,
    projection fin de mois

-   Alerte budget : notification si le cout LLM depasse 80% du budget
    tokens du plan

-   Fallback automatique : si claude-opus indisponible (OpenRouter),
    switcher automatiquement sur claude-sonnet

+-----------------------------------------------------------------------+
| **Critere de succes**                                                 |
|                                                                       |
| ✓ Les taches legeres utilisent claude-haiku (verifiable via Langfuse) |
|                                                                       |
| ✓ Les taches lourdes utilisent claude-sonnet ou opus                  |
|                                                                       |
| ✓ Les couts sont logues en DB et visibles dans le dashboard           |
|                                                                       |
| ✓ Le fallback fonctionne si un modele est indisponible                |
+-----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 10, Lot 11  | OpenRouter facture au token meme pour les modeles |
|                 | economiques. Surveiller le cout reel vs projete   |
|                 | sur les 2 premieres semaines de production.       |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 18**                                                           |
|                                                                      |
| **GUARDRAILS.md operationnel**                                       |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 11 **·      |
| Owner :** Julien + CAO                                               |
+----------------------------------------------------------------------+
| *Rendre le systeme de GUARDRAILS.md pleinement operationnel : chaque |
| agent consulte ses guardrails avant d\'agir, les actions interdites  |
| sont bloquees, les escalades humaines sont declenchees               |
| automatiquement.*                                                    |
+----------------------------------------------------------------------+

**Taches**

-   Table guardrails en DB : ars\_id, rules (JSON array),
    escalation\_triggers (JSON), updated\_at

-   Route GET /api/ars/\[id\]/guardrails : retourne les guardrails de
    l\'ARS

-   Route PUT /api/ars/\[id\]/guardrails : met a jour les guardrails
    (Architecte uniquement)

-   Integration dans chaque agent : verifier les guardrails avant de
    generer un output

-   Regles de base pre-configurees : pas de promesse de livraison \<
    20min, pas de reduction \> 25%, pas de publication sans Quality
    Gate, pas de contact client \> 2x/semaine

-   Seuils d\'escalade automatique : commande \> 200e -\> notification
    Architecte, avis 1-2 etoiles -\> validation requise

-   Page Parametres GUARDRAILS : l\'Architecte peut voir, ajouter et
    supprimer des regles

-   Audit trail : chaque fois qu\'un guardrail bloque une action, c\'est
    logue dans guardrail\_violations

-   Rapport hebdomadaire : nombre de violations detectees et bloquees

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Un agent tente de depasser une regle guardrail -\> l\'action est   |
| bloquee et loguee                                                    |
|                                                                      |
| ✓ Les escalades obligatoires declenchent une notification Architecte |
|                                                                      |
| ✓ L\'Architecte peut modifier ses guardrails depuis l\'interface     |
|                                                                      |
| ✓ Audit trail complet des violations                                 |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 10, Lot 12  | Les guardrails sont verifies par le LLM (Quality  |
|                 | Gate inclut la conformite GUARDRAILS). Si le      |
|                 | Quality Gate est bypasse, les guardrails ne       |
|                 | s\'appliquent pas. S\'assurer que le Quality Gate |
|                 | est toujours dans la chaine.                      |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 19**                                                           |
|                                                                      |
| **MULTI Academy --- Integration**                                    |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 11-12 **·   |
| Owner :** CAO + Julien                                               |
+----------------------------------------------------------------------+
| *Integrer l\'Academy dans la plateforme : un espace dedie formation  |
| accessible depuis le menu gauche, avec 3 packages (USER 3K, BUILDER  |
| 5K, FOUNDER 10K), lien vers les exercices qui generent de vrais      |
| ARS.*                                                                |
+----------------------------------------------------------------------+

**Taches**

-   Table academy\_enrollments en DB : user\_id, package
    (user/builder/founder), enrolled\_at, stripe\_payment\_id

-   Route POST /api/academy/enroll : cree l\'inscription + declenche le
    paiement Stripe (one-shot)

-   app/(dashboard)/academy/page.tsx : page Academy avec les 3 packages
    et leur contenu

-   AcademyPackageCard.tsx : carte avec prix, liste des avantages,
    bouton Rejoindre

-   Integration abonnement MULTI : les packages BUILDER et FOUNDER
    incluent 1 an d\'abo (PRO ou Business) \-- creer l\'abonnement
    Stripe automatiquement a l\'enrolment

-   Espace de formation : modules de formation par semaine (8 semaines),
    progression trackee

-   Les exercices de formation creent de vrais ARS sur la plateforme
    (lien direct avec le wizard)

-   Referral system : codes de parrainage par package (1-5% pour USER,
    4-20% pour BUILDER, 8-40% pour FOUNDER)

-   Dashboard Academy pour CAO : liste des enrolles, progression par
    module, revenus generes

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ Les 3 packages affiches avec les bons prix et avantages            |
|                                                                      |
| ✓ Paiement one-shot Stripe fonctionnel pour l\'Academy               |
|                                                                      |
| ✓ Les packages BUILDER/FOUNDER creent automatiquement l\'abonnement  |
| MULTI                                                                |
|                                                                      |
| ✓ L\'espace de formation est accessible apres enrollment             |
+----------------------------------------------------------------------+

+-----------------+---------------------------------------------------+
| **Dependances** | **Risque principal**                              |
|                 |                                                   |
| Lot 06          | Le contenu de formation (modules, exercices) doit |
|                 | etre cree par CAO avant le lancement de           |
|                 | l\'Academy. La plateforme technique peut etre     |
|                 | prete avant le contenu \-- lancer avec le Lot 20  |
|                 | des que le contenu est disponible.                |
+-----------------+---------------------------------------------------+

+----------------------------------------------------------------------+
| **LOT 20**                                                           |
|                                                                      |
| **MULTI Accelerator + Lancement public**                             |
|                                                                      |
| **Phase :** Phase 4 --- Scaling **· Deadline :** Semaine 12 **·      |
| Owner :** CAO + Julien + Mathieu                                     |
+----------------------------------------------------------------------+
| *Deployer le programme Accelerator (2000e/mois, 10                   |
| fondateurs/cohorte, 12 mois) et lancer publiquement MULTI avec tous  |
| les lots en production.*                                             |
+----------------------------------------------------------------------+

**Taches**

-   Table accelerator\_cohorts en DB : id, name, start\_date,
    max\_participants (10)

-   Table accelerator\_enrollments en DB : user\_id, cohort\_id,
    enrolled\_at, stripe\_subscription\_id

-   Route POST /api/accelerator/enroll : inscription + abonnement Stripe
    2000e/mois

-   app/(dashboard)/accelerator/page.tsx : page Accelerator (pour les
    inscrits)

-   Dashboard CAO : acces aux metriques des fondateurs Accelerator (avec
    leur accord)

-   Checklist pre-lancement public : SSL, domaine multi.app, CGV,
    mentions legales, politique RGPD, DPA Anthropic

-   Load testing : simuler 100 utilisateurs simultanes sur le wizard

-   Monitoring production : Sentry (erreurs) + Langfuse (traces LLM) +
    PostHog (analytics)

-   Runbook d\'incidents : procedure en cas de panne Claude API / Stripe
    / Neon

-   Lancement : activation du domaine, communication LinkedIn par CAO +
    Mathieu, premiers 50 beta users invites

+----------------------------------------------------------------------+
| **Critere de succes**                                                |
|                                                                      |
| ✓ La plateforme complete tient la charge (100 users simultanes sans  |
| degradation)                                                         |
|                                                                      |
| ✓ Tous les monitoring en place et alertes configurees                |
|                                                                      |
| ✓ Premiere cohorte Accelerator completement inscrite (10 fondateurs) |
|                                                                      |
| ✓ Lancement public avec les premiers 50 beta users actifs            |
+----------------------------------------------------------------------+

+--------------------------+------------------------------------------+
| **Dependances**          | **Risque principal**                     |
|                          |                                          |
| Tous les lots precedents | Le lancement public expose la plateforme |
|                          | au monde. Les premiers utilisateurs sont |
|                          | les plus importants pour les reviews et  |
|                          | le bouche-a-oreille. Prevoir une         |
|                          | astreinte technique 24h les 3 premiers   |
|                          | jours.                                   |
+--------------------------+------------------------------------------+

**Synthese des dependances**

Le diagramme ci-dessous resume les dependances critiques entre lots. Un
lot ne peut demarrer que si tous ses predecesseurs sont valides.

  ----------------------------------------------------------- ------------------------------------------------
  **Lot**                                                     **Dependances requises**
  LOT 01 --- Infrastructure & Fondations                      Aucune --- lot fondateur
  LOT 02 --- Wizard UI --- 12 questions                       Lot 01
  LOT 03 --- Agent Sidebar + Persistance                      Lot 01, Lot 02
  LOT 04 --- Generation BUSINESS.md + Ecran resultat          Lot 01, Lot 02, Lot 03
  LOT 05 --- Auth Clerk + Dashboard squelette                 Lot 01, Lot 04
  LOT 06 --- Paiements Stripe                                 Lot 05
  LOT 07 --- Dashboard complet --- 3 colonnes                 Lot 05, Lot 06
  LOT 08 --- BUSINESS.md Editeur                              Lot 04, Lot 05
  LOT 09 --- Scorecard VALUE                                  Lot 07
  LOT 10 --- Premier agent operationnel --- Agent Marketing   Lot 07, Lot 08, Lot 09 (Quality Gate = Lot 12)
  LOT 11 --- Cycle nocturne --- Nightly Cycle                 Lot 09, Lot 10, Lot 12
  LOT 12 --- Quality Gate Agent                               Lot 10
  LOT 13 --- VALUE Router                                     Lot 09, Lot 11
  LOT 14 --- Mode Architecte --- Curseur d\'autonomie         Lot 11, Lot 12
  LOT 15 --- Vertical Packs --- Templates sectoriels          Lot 08, Lot 10
  LOT 16 --- Cross-Learning anonymise                         Lot 10, Lot 15
  LOT 17 --- Budget Intelligent --- Routage LLM               Lot 10, Lot 11
  LOT 18 --- GUARDRAILS.md operationnel                       Lot 10, Lot 12
  LOT 19 --- MULTI Academy --- Integration                    Lot 06
  LOT 20 --- MULTI Accelerator + Lancement public             Tous les lots precedents
  ----------------------------------------------------------- ------------------------------------------------

MULTI Platforms · Confidentiel · Version 1.0 · 31 mars 2026
