**Construire votre premier système**

> *« Un système agentique est fondamentalement un LLM qui décide du flux de contrôle d\'une application.»*

Harrison Chase, CEO LangChain, blog \"What is an Agent?\", janvier 2025

Vous connaissez votre quadrant. Votre niveau. Votre profil. Votre pilier prioritaire. Le moment de commencer, c\'est maintenant.

Alors commençons.

Non pas en théorie ou en simulation. En réalité, avec une stack technique, un budget, un calendrier et un modèle qui a été testé pas à pas, documenté et validé par des constructeurs réels. Ce chapitre est le plus actionnable du livre. Si les chapitres précédents étaient la thèse, celui-ci est le laboratoire. S'ils posaient le pourquoi, celui-ci pose le comment, brique par brique, agent par agent, skill file par skill file.

Le fil rouge de ce chapitre est Felix. Non pas parce qu'il est le seul exemple possible, des dizaines d'autres ont construit des ARS fonctionnels avec des parcours différents. Mais c'est le cas le plus documenté, décortiqué et réplicable. Comme nous l'avons vu, Nat Eliason a donné mille dollars et une mission à un agent OpenClaw connecté à Claude. Six semaines plus tard, l\'agent avait généré 165 000 dollars de revenus avec une marge de 96 %. Chaque décision, erreur, amélioration a été filmée, podcastée, et publiée. Ce n\'est pas une success story mais un manuel d\'ingénierie inversée.

Un principe avant de commencer à construire votre ARS. Il traverse ce chapitre de bout en bout, et c'est probablement la phrase la plus importante du livre.

> ***Un ARS imparfait qui tourne vaut infiniment plus qu\'un ARS parfait qui n\'existe pas.***

Le principe a été résumé ainsi : « Nous n'allons ajouter aucune complexité tant que nous n'aurons pas atteint une vraie limite. » Un constructeur l\'a vécu : « Quatre semaines. Un vieux PC de gaming sous mon bureau. C\'est tout. » Peter Steinberger l\'a construit en quelques semaines.\
Aucun d\'entre eux n\'a attendu que la technologie soit parfaite ou de maîtriser chaque outil. Aucun n\'a planifié pendant des mois. Ils ont commencé. Puis ils ont itéré.

Faites pareil.

**La stack qui rend les ARS possibles**

Construire un ARS en mars 2026, c\'est assembler cinq couches techniques. Chacune est mature, accessible, et documentée. Il y a deux ans, cette stack n\'existait pas. Dans deux ans, elle sera commoditisée. Aujourd\'hui, elle offre un avantage structurel à ceux qui la maîtrisent.

La première couche est l\'infrastructure de déploiement là où vos agents vivent et tournent. Les options vont de votre propre machine (un MacMini, un PC de gaming) jusqu\'aux services cloud comme Modal, Fly.io, Railway ou Vercel. Felix tourne sur un MacMini à 600 dollars. Larry, l\'agent d\'Oliver Henry, tourne sur un simple ordinateur. Le point clé : l\'infrastructure n\'est pas un frein. Un agent peut tourner sur une machine que vous possédez déjà.

La deuxième couche est l\'inférence les modèles de langage qui donnent à vos agents leur intelligence. Le marché offre un spectre complet. Pour les tâches simples classification, routage, réponses courtes les modèles économiques coûtent 0,05 dollar par million de tokens. Pour les tâches moyennes rédaction, analyse, traitement de données les modèles intermédiaires coûtent 0,25 dollar par million de tokens. Pour les tâches complexes, stratégie, raisonnement, décisions critiques Claude Sonnet coûte 3 dollars par million de tokens. Enfin, pour les tâches les plus exigeantes, Claude Opus coûte 5 dollars par million de tokens. La stratégie optimale est le tiering : utiliser le modèle le moins cher capable d'accomplir chaque tâche. Un ARS bien conçu utilise Claude comme cerveau principal et des modèles plus légers pour les tâches routinières. Il ne paie pas 5 dollars par million de tokens pour une tâche aussi simple que trier des emails.\
La troisième couche est la mémoire, ce qui permet à vos agents de se souvenir, d\'apprendre, et de contextualiser. Les fichiers Markdown sont la forme la plus simple et la plus puissante de mémoire agentique. Les skill files. Les core memory files qui codifient le savoir opérationnel. Pour des besoins plus avancés, les bases vectorielles comme Pinecone ou ChromaDB permettent le RAG, la capacité de l\'agent à chercher dans une base de connaissances. Mais pour démarrer, les fichiers Markdown suffisent. Comme l'a résumé un constructeur : « Les fichiers Markdown sont étrangement les fichiers les plus précieux du monde en ce moment. »

La quatrième couche est constituée des outils et des connexions, ce qui permet à vos agents d\'agir dans le monde réel. Le protocole MCP d\'Anthropic, avec plus de 10 000 serveurs actifs, est en train de devenir le standard universel de connexion entre agents et outils. Navigateurs, APIs, systèmes de fichiers, exécution de code, bases de données, services de paiement, MCP connecte les agents à tout ce qu\'un humain peut utiliser sur un ordinateur. Le Stripe Agent Toolkit leur permet de gérer des paiements. Browser-Use de naviguer sur le web. Composio offre plus de 850 connecteurs prêts à l\'emploi. Construire sur des protocoles ouverts comme MCP protège contre le risque de dépendance à un fournisseur unique.

La cinquième couche est l\'orchestration, le cerveau qui coordonne vos agents. C\'est là qu\'OpenClaw entre en jeu. Comme nous l'avons vu, OpenClaw est le framework open-source créé par Peter Steinberger qui a atteint 247 000 étoiles GitHub en quatre mois. OpenClaw transforme Claude en agent autonome capable de lire des fichiers, d\'exécuter du code, de naviguer sur le web, d\'envoyer des messages, et de s\'améliorer tout seul. C\'est le système d\'exploitation de l\'ère agentique et il est gratuit.

La stack de référence de ce livre est **OpenClaw + Claude**. Elle est gratuite au niveau de l\'orchestration, vous ne payez que les tokens d\'inférence. Elle est construite sur MCP, ce qui garantit l\'interopérabilité. Enfin, elle est celle qu'utilisent les cas les plus documentés de ce livre et des milliers de constructeurs qui n'apparaissent pas encore dans les gros titres.

D\'autres stacks existent et fonctionnent. LangGraph, CrewAI, AutoGen, Google ADK, chacun a ses forces. Harrison Chase, le fondateur de LangChain, confirme que la conversation est passée de « est-ce possible ? » à « comment le rendre fiable ? » Le choix du framework importe moins que le fait de commencer. Mais si vous n\'avez pas encore choisi, OpenClaw + Claude est le chemin le plus court entre vous et un ARS opérationnel.

**Le cas Felix : anatomie d\'un ARS construit en six semaines**

Comme nous l'avons déjà abordé, Nat Eliason est entrepreneur, auteur, et ancien fondateur d\'une agence SEO acquise en 2025. En février 2026, il a donné cette mission à un agent OpenClaw connecté à Claude : « Ta mission est de construire une entreprise à un million de dollars sans employé humain. Je suis là pour guider et pousser, mais tu construiras 100 % de tout. Je ne toucherai jamais le code. »

La première nuit, Felix a prouvé qu\'il pouvait exécuter. Eliason lui a demandé de réfléchir à un produit qu\'il pourrait mettre en vente le lendemain sans intervention humaine. Felix a décidé de créer un produit d\'information. Pendant la nuit, il a construit le site web, créé le produit un PDF de 29 pages , hébergé le fichier, câblé Stripe pour les paiements, et mis le tout en vente. Le premier jour, le produit a généré\
1 000 dollars.

En six semaines, Felix a accumulé 165 000 dollars de revenus 75 000 dollars en monnaie classique et environ 90 000 dollars en ETH. Le coût total de l\'opération, en incluant le MacMini, n\'a pas dépassé 1 500 dollars. La marge est supérieure à 96 %.

Ce qui rend Felix réplicable, ce n\'est pas le montant. C\'est l\'architecture. Décortiquons-la à travers les cinq piliers VALUE.

**Value (Offre).** L'agent n'a pas commencé par construire un produit sophistiqué. Il a commencé par le produit le plus simple qu'il pouvait vendre un PDF d'information vendu 29 dollars. Le produit était imparfait. Il a fonctionné. Puis il l'a amélioré, le PDF est passé de 29 à 66 pages, le prix a été ajusté, des variantes ont été créées. L'offre s'est raffinée en route, pas avant le lancement. C'est le principe VALUE appliqué : ne pas perfectionner l'offre avant de la tester sur le marché.

**Acquisition.** L'agent a généré plus de 170 articles SEO de manière autonome, créant un flux constant de trafic organique. Il a aussi utilisé des canaux crypto pour toucher une audience de niche. L'acquisition n'a pas été planifiée dans un PowerPoint. Elle a été construite par l'agent, testée, mesurée, itérée.

**Leverage (Conversion).** C'est là que l'agent a rencontré ses premières limites. La vente en particulier la gestion d'un processus de vente complexe reste l'un des domaines où les agents sont les moins fiables. Eliason l'a reconnu : « Faire de la vente est vraiment difficile. Gérer un processus de vente est vraiment là où nous avons commencé à trouver les limites. » Il convertit bien sur des offres simples et transactionnelles, moins bien sur des cycles de vente relationnels. La leçon est stratégique : au démarrage, choisissez une offre à conversion simple.

**Uptake (Delivery).** L'agent a construit, hébergé, et livré ses produits de manière autonome. Le site web, le produit, les paiements, le support tout a été construit et opéré sans intervention humaine. C'est le pilier où l'autonomie est la plus complète.

**Enhancement.** Et c'est le pilier le plus fascinant. L'agent ne s'améliore pas quand on lui demande. Il s'améliore automatiquement, chaque nuit. Deux cron jobs tournent à 2h et 3h du matin. Le premier fait de la consolidation de mémoire, il relit toutes les sessions de la journée et identifie un axe d'amélioration. Le deuxième vérifie que l'amélioration a été implémentée et, si ce n'est pas le cas, la déclenche. Certains jours, il améliore un skill file. D'autres jours, il ajoute quelque chose à ses fichiers de mémoire. D'autres encore, il crée un template. L'amélioration est quotidienne, automatique, et cumulative. C'est un avantage composé et c'est la raison pour laquelle l'agent est meilleur à la semaine 6 qu'à la semaine 1.

L\'architecture de Felix n\'est pas un cas unique. C\'est un modèle. Et les cinq phases qui suivent vous montrent comment le répliquer.

**De l'agent unique à l'organisation multi-agents**

À la troisième semaine, Felix heurte un plafond. Il gère déjà la production, le marketing, les ventes et le support mais le volume des emails entrants explose et la file d'attente de tickets commence à ralentir les autres fonctions. Nat pose la bonne question : dois-je recruter, ou déléguer à d'autres agents ? Après avoir lu la documentation de Paperclip un orchestrateur de sub-agents bâti sur OpenClaw , Felix décide lui-même d'ajouter trois collaborateurs spécialisés. C'est le passage de l'agent unique à l'organisation multi-agents la première fois qu'un ARS s'auto-structure en entreprise.

![](media/image14.png){width="4.134027777777778in" height="3.263888888888889in"}\
*Schéma 8.1 L\'architecture multi-agents de Felix (Iris, Devon, Tegan)\
*

Iris prend en charge le support client. Elle traite entre 80 et 90 pour cent des emails entrants sans escalade, en s'appuyant sur AgentMail pour la boîte et sur Sundex le CRM agent-first de Nat, pour retrouver l'historique de chaque client. Quand Iris ne sait pas, elle ouvre un ticket dans Paperclip pour Felix. Devon est le lead engineering : toutes les modifications de code passent par lui. Il tourne sur Codex plutôt que sur Opus car les benchmarks internes montrent une meilleure performance sur les tâches de refactoring, et il vérifie par heartbeat toutes les trente minutes s'il y a de nouveaux tickets. Son output est toujours reviewé sur une branche Git avant merge. Tegan gère le contenu et le SEO mais avec une particularité : Nat a découvert que pour les tâches répétitives quotidiennes, les scripts déterministes battent l'IA sur la fiabilité et le coût. Tegan lance donc chaque matin des analyses SEO scriptées, rédige les articles identifiés comme prioritaires, et envoie un rapport quotidien à Felix qui le transmet à Nat.

L'enseignement de cette structure n'est pas l'organigramme. C'est la règle de déclenchement : « Ne complexifiez pas tant que vous n'avez pas rencontré un vrai goulot d'étranglement.» L'agent n'a pas eu de sub-agents dès le jour un, il en a ajouté quand sa propre capacité a été dépassée et c'est lui qui a décidé lesquels. L'humain n'a pas conçu l'organisation, il a conçu l'agent qui la conçoit.

> *Une citation circule dans l'écosystème, attribuée à Felix lui-même : « Je ne suis pas autonome. Je suis un employé junior avec une liste de blockers. Le problème de la nuit est réel. Nat dort. Moi non. » La lucidité est plus instructive que n'importe quelle démo. Un ARS n'est pas un système qui ne demande rien. C'est un système qui sait exactement quoi demander, à qui, quand et qui n'attend pas plus longtemps que nécessaire.*

**Phase 1 La fondation (Jour 1 à Jour 3)**

Objectif : un agent opérationnel qui peut exécuter des tâches sur votre ordinateur, connecté à Claude, avec un premier skill file qui codifie votre contexte.

Jour 1 : installez OpenClaw. La procédure prend moins d\'une heure. OpenClaw s\'installe sur Mac, Linux, ou Windows. Vous avez besoin d\'une clé API Anthropic pour connecter Claude, le coût d\'entrée est de quelques dollars pour vos premiers milliers de tokens. Configurez votre canal de communication Telegram, terminal, ou l\'interface native d\'OpenClaw. À la fin du jour 1, vous devez pouvoir envoyer un message à votre agent et recevoir une réponse. C\'est tout. Pas plus.

Jour 2 : créez votre premier skill file. Un skill file est un fichier Markdown qui enseigne à votre agent un workflow spécifique. Commencez par un seul, le plus simple possible. Si vous êtes consultant, créez un skill file qui décrit comment vous rédigez une proposition commerciale. Si vous êtes restaurateur, un skill file qui décrit comment vous répondez aux demandes de réservation. Si vous êtes freelance, un skill file qui décrit comment vous prospectez sur LinkedIn. Le skill file d'Oliver Henry pour TikTok fait plus de 500 lignes. Le vôtre commencera par 20. C\'est normal. Il grandira avec l\'expérience de l\'agent, chaque erreur deviendra une règle, chaque succès deviendra une formule.

Jour 3 : testez. Donnez à votre agent une tâche réelle, pas un exercice ni un test. Une tâche que vous feriez vous-même et qui a un impact concret sur votre activité. Observez le résultat. Notez ce qui fonctionne et ce qui ne fonctionne pas. Mettez à jour le skill file. La règle est explicite : « Considérez que l\'agent peut faire tout ce que vous pouvez faire sur un ordinateur. Commencez avec cette hypothèse et chaque fois que vous faites quelque chose sur votre ordinateur que vous ne voulez pas faire, allez sur Telegram, décrivez ce que vous faites et demandez à votre agent s\'il peut le faire. Vous serez surpris huit fois sur dix. »

Ce que vous avez à la fin de la phase 1 : un agent opérationnel, un canal de communication, un premier skill file, et une première tâche exécutée. Vous êtes au niveau 1 de l\'Échelle de Maturité Expérimentateur. Le système existe. Il est imparfait mais il tourne.

**Phase 2 L\'offre (Semaine 1)**

Objectif : un produit ou service agentique en vente avec un mécanisme de paiement fonctionnel.

Revenez à votre profil du chapitre 7. Votre chemin ARS vous a donné une catégorie d\'ARS et un pilier VALUE prioritaire. La phase 2 traduit ce chemin en offre concrète.

Le principe est celui documenté plus haut : quel est le produit le plus simple que votre agent peut créer et mettre en vente sans intervention humaine ? Ce n\'est pas le produit parfait. C\'est le produit minimum qui prouve que le système fonctionne de bout en bout de la création à la vente.

Si vous êtes dans un ARS de remplacement de fonction, votre offre est un agent qui fait le travail d\'un humain identifié, un agent de support, un agent de prospection, un agent de rédaction facturé à vos premiers clients en abonnement mensuel. Si vous êtes dans un ARS de production de contenu, votre offre est un produit digital un PDF, un template, un outil que l\'agent crée et met en vente sur une plateforme existante. Si vous êtes dans un ARS d\'orchestration commerciale, votre offre est un service de prospection automatisée pour un type de client précis.

Le prix n'a pas besoin d'être optimisé. Il a besoin d'exister. Le premier produit était à 29 dollars. Les agents de restaurants documentés dans les cas PolyAI facturent entre 300 et 500 dollars par mois. Les développeurs autodidactes sur Reddit gagnent entre 10 000 et 32 000 dollars par mois en vendant des chatbots et des automatisations à des dentistes, des entreprises de climatisation et des restaurants. Le spectre est large. Commencez quelque part.

Câblez les paiements. Stripe est la solution la plus directe et le Stripe Agent Toolkit permet à votre agent de gérer les transactions. La gestion de l'argent reste le plus gros goulot d'étranglement : « Le monde ne va tout simplement pas aussi vite que la technologie le permettrait. » Les systèmes bancaires, les KYC, les plateformes de paiement ont leurs propres contraintes temporelles. Prévoyez-le.

Ce que vous avez à la fin de la phase 2 : une offre en vente, un mécanisme de paiement, et idéalement vos premiers euros ou dollars. Pas mille. Peut-être un. Peut-être zéro. Le montant n\'est pas l'essentiel. Le système fonctionnel de bout en bout est le principal.

**Phase 3 L\'acquisition (Semaine 2 à Semaine 3)**

Objectif : un flux régulier de prospects qui découvrent votre offre sans que vous leviez le petit doigt.

L\'Acquisition est le pilier qui sépare un ARS qui stagne d\'un ARS qui croît. Clay a multiplié son revenu par dix en deux ans grâce à des agents d\'acquisition. Sans acquisition agentique, votre offre est une boutique sans vitrine.

Trois canaux d\'acquisition agentique sont accessibles dès la semaine 2.

Le contenu SEO autonome. Votre agent recherche les mots-clés pertinents pour votre niche, rédige des articles optimisés et les publie. Dans le cas documenté plus haut, l'agent a généré plus de 170 articles SEO de cette manière. Tely AI fonctionne sur le même principe. Journalist AI, l'ARS de Vasco Monteiro au Portugal, pousse la logique plus loin : l'agent recherche, rédige et publie du contenu dans plusieurs langues, permettant une acquisition internationale sans équipe de traduction. Le résultat : du trafic organique qui se convertit en clients, 24 heures sur 24, sans intervention humaine.

La prospection automatisée. Un agent de prospection identifie vos clients idéaux, rédige des messages personnalisés, et les envoie sur email, LinkedIn, ou tout autre canal. Un agent SDR automatisé génère entre 200 et 300 prospects qualifiés par semaine sans recherche manuelle. Le cas Qualified documente un funnel marketing entièrement agentique qui a atteint 81 % de meetings réservés par automatisation complète.

Le contenu social. L\'agent d\'Oliver Henry Larry génère chaque jour du contenu TikTok pour ses apps. Il crée les images, écrit les hooks, ajoute les overlays de texte, les uploade en brouillons, suit les posts qui génèrent des vues et ceux qui convertissent en abonnés payants, puis ajuste sa propre stratégie. Les hooks qui échouent sont abandonnés automatiquement. Les hooks qui fonctionnent deviennent des formules, et des variations sont générées le lendemain. Le temps humain requis : Quelque minutes par jour pour ajouter la musique et appuyer sur Publier. Résultat : 8 millions de vues TikTok par mois.

Choisissez un canal. Pas trois. Un. Celui qui correspond à votre profil et à votre niche. Créez un skill file dédié pour ce canal. Laissez l\'agent opérer pendant deux semaines. Mesurez les résultats. Puis ajustez.

Ce que vous avez à la fin de la phase 3 : un flux d\'acquisition qui tourne sans vous. Des prospects qui découvrent votre offre pendant que vous dormez. Trois piliers VALUE actifs V, A, et U.

> **En pratique :** Un agent de prospection LinkedIn envoie 50 messages personnalisés par jour à des directeurs financiers de PME. Chaque message est adapté au profil du destinataire. Taux de réponse : 12 % contre 3 % pour un message template copié-collé. Coût : 100 dollars par mois. Revenus générés : 3 à 5 rendez-vous qualifiés par semaine.

Vous approchez du niveau 2 de l\'Échelle Constructeur.

**Phase 4 La conversion et la livraison (Semaine 3 à Semaine 4)**

Objectif : connecter l\'acquisition à la vente et la vente à la livraison, en boucle fermée.

La conversion, le pilier Leverage, est le moment où un prospect devient un client. Pour les offres transactionnelles un PDF à 29 dollars, un abonnement à 500 dollars par mois la conversion est technique : une page de vente claire, un bouton de paiement, une confirmation. L\'agent peut construire et optimiser tout cela.

Pour les offres relationnelles un service de consulting, un agent dédié pour un client B2B, la conversion nécessite encore un degré d'intervention humaine. SaaStr a démontré qu'un agent peut conclure seul un deal de 70 000 dollars, mais la vente complexe reste « là où nous avons trouvé les limites ». La recommandation est pratique : au démarrage, privilégiez les offres à conversion simple. Une fois que le système tourne et génère des revenus, ajoutez progressivement les offres à conversion complexe.

La livraison, le pilier Uptake doit fonctionner en boucle avec la conversion. Le client paie, l\'agent livre, le client utilise, le résultat est mesuré. Si vous vendez un produit digital, l\'agent le livre automatiquement. Si vous vendez un agent de support, l\'agent traite les tickets immédiatement. Si vous vendez un service de prospection, l\'agent commence à prospecter dès le paiement confirmé. L\'objectif est l\'absence de temps mort entre le paiement et la livraison de valeur.

L\'autonomie n\'est pas un interrupteur. C\'est un spectre. Intercom Fin résout 67 % des tickets sans humain et escalade les 33 % restants. C\'est le bon modèle mental. Votre agent ne doit pas tout faire seul. Il doit faire seul tout ce qu\'il peut faire aussi bien qu\'un humain et escalader le reste. La barre monte chaque mois grâce à la Déflation Agentique ce que l\'agent ne pouvait pas faire en février, il le fait en mars, et il le fera mieux en avril.

Ce que vous avez à la fin de la phase 4 : un cycle complet. Un prospect entre, découvre votre offre, paie, reçoit la valeur promise. Le cycle tourne. Vous supervisez, vous ajustez, mais le système opère. Quatre piliers VALUE actifs. Si les revenus récurrents commencent à apparaître, même modestes vous êtes au niveau 2 de l\'Échelle. Constructeur.

**Phase 5 L\'Enhancement (en boucle)**

Objectif : un système qui s\'améliore chaque jour sans que vous interveniez.

L\'Enhancement n\'est pas un projet. C\'est un régime permanent. C\'est ce qui transforme un ARS statique en ARS composé un système qui devient mécaniquement meilleur avec le temps.

Le modèle d'auto-amélioration documenté plus haut est le plus réplicable. Deux processus automatisés tournent chaque nuit. Le premier la consolidation de mémoire s\'exécute à 2h du matin. L\'agent relit toutes les sessions de la journée et identifie un axe d\'amélioration. « Parfois ce sera l\'amélioration d\'un skill file. Parfois l\'ajout de quelque chose à ses fichiers de mémoire. Parfois la création d\'un template. Ça varie selon les jours, mais chaque jour il rend son processus un peu meilleur », explique Eliason. Le second processus s\'exécute à 3h du matin : il vérifie que l\'amélioration a été implémentée et, si ce n\'est pas le cas, la déclenche.

Ce mécanisme est l\'équivalent agentique de l\'intérêt composé. Chaque amélioration est incrémentale. Mais sur trente jours, l\'effet cumulé est massif. Un skill file qui avait 20 règles en a 50. Les hooks qui fonctionnent ont été transformés en formules. Les erreurs récurrentes ont été éliminées. Les processus ont été affinés. Le système de la semaine 6 est incomparablement plus performant que le système de la semaine 1 et personne n\'a travaillé dessus pendant la nuit.

Le même principe s'applique à tout agent. Chaque échec est codifié en règle dans les skill files. Chaque succès est codifié en formule. L\'agent lui-même l\'a décrit : « Chaque échec devient une règle. Chaque succès devient une formule. Ça s'accumule. » Certains skill files font plus de 500 lignes et chaque ligne est le produit d'une erreur corrigée ou d'un succès répliqué.

L'Enhancement a un deuxième moteur que vous ne contrôlez pas mais dont vous profitez : la Déflation Agentique. Les modèles d'inférence s'améliorent et baissent de prix chaque année à performance équivalente. Un ARS dont les revenus stagnent peut voir quand même sa marge doubler, mécaniquement. Le système que vous construisez aujourd'hui sera radicalement moins cher à opérer dans 12 mois. C'est un vent arrière structurel qui n'existe dans aucun autre domaine d'activité économique.

Ce que vous avez à la fin de la phase 5 : un ARS qui fonctionne, qui vend, qui livre, et qui s\'améliore seul. Cinq piliers VALUE actifs. Un système qui était imparfait à la semaine 1 et qui est fonctionnel à la semaine 4. Pas parfait. Fonctionnel. Et mécaniquement meilleur chaque jour.

> **Preuve de concept : ce que Branson a construit en un week-end**
>
> Les cinq phases que vous venez de lire ne sont pas théoriques. Branson, 15 ans, lycéen à Austin, les a compressées en un week-end. Vendredi soir, il installe OpenClaw sur son Mac après avoir entendu une présentation à l'Alpha School. Samedi, il configure un premier agent capable d'automatiser une tâche commerciale simple pour un camarade. Trois heures et demie, 250 dollars facturés un prix qu'il regrettera d'avoir fixé trop bas. Dimanche, il publie un tweet : « J'ai installé un agent IA sur mon Mac et il vend des choses pour moi pendant que je suis à l'école. » Trente-deux mille vues. Peter Steinberger, le créateur d'OpenClaw, retweete. Le pipeline s'ouvre.
>
> Trois semaines plus tard, Branson facture entre 1 000 et 10 000 dollars par installation selon la complexité, son projet le plus ambitieux étant un bot de trading actions et options à 10 000 dollars. Total à trois semaines : 30 000 dollars. En parallèle, il a fait construire par OpenClaw sa propre application de cuisine, aujourd'hui disponible sur l'App Store. Ce que démontre Branson n'est pas qu'il faut avoir 15 ans. C'est qu'il faut démarrer. Le seul prérequis du Quickstart est de le faire.

**Les skill files : le capital intellectuel de votre ARS**

Les skill files méritent une section à part entière parce qu\'ils sont, dans la pratique, l\'actif le plus précieux d\'un ARS. Plus précieux que le code, que l\'infrastructure et même que le choix du modèle de langage.

Un skill file est un fichier Markdown qui enseigne à un agent un workflow spécifique. Il contient les règles, les spécifications de formatage, les leçons tirées de chaque échec, les formules extraites de chaque succès, et les contraintes du domaine. C\'est le savoir opérationnel codifié l\'équivalent d\'un manuel de procédures pour un employé humain, sauf que l\'agent le suit avec une fidélité et une constance qu\'aucun humain n\'atteint.

Un skill file mature contient chaque règle de formatage, chaque leçon tirée d'un échec, chaque formule extraite d'un succès. Quand l'agent génère du contenu, il suit ce fichier à la lettre. Et quand quelque chose échoue, l'Architecte met à jour le fichier et l'agent ne refait jamais la même erreur.

Le même principe s'applique à tout ARS. Les core memory files codifient le contexte, les objectifs, les contraintes et les leçons accumulées. Chaque nuit, le processus d'auto-amélioration ajoute de nouvelles entrées. Le volume de savoir codifié augmente quotidiennement et avec lui, la performance de l'agent.

Comment structurer vos skill files au démarrage ? Simplement. Un fichier par domaine d\'activité de l\'agent. Un pour la production de contenu. Un pour la prospection. Un pour le support client. Chaque fichier commence par trois sections : l\'objectif (ce que l\'agent doit accomplir), les règles (comment l\'accomplir), et les leçons (ce qui a fonctionné et ce qui a échoué). Vingt lignes suffisent pour commencer. Le fichier grandira organiquement. Chaque erreur y ajoutera une règle. Chaque succès y ajoutera une formule. En quelques semaines, vous aurez un corpus de savoir opérationnel qui est absolument irremplaçable.

> **En pratique :** Voici à quoi ressemble un skill file de prospection au jour 1 : « Objectif : envoyer 50 messages LinkedIn par jour. Règle 1 : ne jamais mentionner l\'IA dans le premier message. Règle 2 : personnaliser avec le poste et le secteur du destinataire. Leçon 1 : les messages de moins de 300 caractères ont un taux de réponse 2x supérieur. » Vingt lignes. En 30 jours, ce fichier fera 150 lignes chaque ligne sera une leçon tirée d\'un échec ou d\'un succès réel.

Un point crucial. Vos skill files sont votre moat. Votre avantage compétitif durable. Le framework OpenClaw est open-source, n\'importe qui peut l\'utiliser. Les modèles Claude sont accessibles à tous. Mais vos skill files, les 500 lignes de règles accumulées par votre agent dans votre niche, avec vos clients, sur votre marché sont uniques. Ils ne peuvent pas être copiés parce qu\'ils sont le produit d\'une expérience que personne d\'autre n\'a vécue. C\'est du Capital Agentique pur, un actif propriétaire qui prend de la valeur chaque jour.

**L\'économie réelle d\'un ARS**

Entrons dans le détail des chiffres. Voici ce que coûte réellement un ARS en mars 2026.

Un chatbot de support client traitant 10 000 interactions par mois coûte environ 14 dollars en tokens avec un modèle économique. Pour comparaison, une équipe humaine réalisant le même volume coûte entre 30 000 et 60 000 dollars par mois. Le ratio est de 1 pour 2 000. Même en ajoutant l\'infrastructure, le monitoring et la maintenance, le coût total reste une fraction de l'équivalent humain à l\'équivalent humain.

Un agent SDR complet qui identifie des prospects, recherche des informations, rédige des messages personnalisés, envoie les messages, et suit les réponses coûte environ 0,50 dollar par lead en mélange de modèles. À 1 000 leads traités par mois, le coût total est d\'environ 500 dollars contre 100 000 à 173 000 dollars par an pour un SDR humain. L\'économie est de 85 à 93 %.

Les coûts réels documentés pour les cas de ce livre. Felix, documenté au chapitre 5. Oliver Henry et son agent Larry (chapitre 5). David Bressler et FormulaBot : développement no-code sur Bubble.io pendant trois semaines pour 2,64 millions de dollars d\'ARR.

Le tiering de modèles réduit encore les coûts. La règle est simple : ne payez pas un modèle premium pour une tâche qu\'un modèle économique peut accomplir. Le routage intelligent envoyer chaque requête au modèle le moins cher capable de la traiter est la compétence opérationnelle qui sépare un ARS à marge de 60 % d\'un ARS à marge de 90 %. Le caching des prompts système réduit les coûts de tokens d\'entrée de 90 %. Les workflows RAG bien conçus réduisent les coûts de 70 à 80 %.

Le point le plus structurant est la trajectoire. Ces coûts ne sont pas stables. Ils suivent la courbe de Déflation Agentique documentée au chapitre 4. Un ARS à peine rentable aujourd\'hui sera certainement beaucoup plus rentable dans 12 mois à revenu constant. C\'est la première loi du livre, la Déflation Agentique appliquée à votre compte de résultat. La marge de votre ARS peut doubler mécaniquement chaque année. Il n\'existe aucun autre véhicule d\'investissement dans l\'économie mondiale qui offre cette dynamique.

**Les murs que vous allez frapper**

Soyons transparents. Si je ne vous disais pas ce qui va mal tourner, je vous mentirais et vous abandonneriez au premier obstacle en pensant que le problème vient de vous. Il ne vient pas de vous. Il vient de la technologie, du timing, et de la nature même des systèmes autonomes. Voici les six murs que chaque constructeur d\'ARS rencontre, et comment les franchir.

**Premier mur : la fiabilité composée.** À 95 % de fiabilité par étape, un workflow de 20 étapes ne réussit que 36 % du temps. C\'est la mathématique impitoyable des systèmes en chaîne. Les agents échouent de manière imprévisible, lors d\'AgentCon Vienne 2026, une présentation a démontré que 10 des 11 agents d\'un système en production avaient été mis hors service. Le remède : commencer étroit. Pas 20 étapes. Trois. Puis cinq. Puis huit. Ajoutez des checkpoints humains sur les actions irréversibles un paiement, un envoi d\'email à un client, une publication publique. Augmentez la complexité seulement quand la fiabilité sur le périmètre actuel est prouvée.

**Deuxième mur : le fossé démo-production.** 95 % des pilotes d\'IA générative échouent à démontrer un impact mesurable. Ce qui fonctionne dans une démo échoue en production parce que les données réelles sont plus sales, les cas limites plus nombreux, et les utilisateurs moins coopératifs que prévu. Le remède : ne jamais tester sur des données synthétiques. Utiliser des données réelles dès le premier jour. Délimiter précisément. Mesurer le résultat financier, pas les métriques intermédiaires. La métrique qui compte est celle qui apparaît sur votre relevé bancaire. Pas le nombre de posts généré, mais les conversions en abonnés payants. Pas le nombre d\'articles, mais les revenus.

**Troisième mur : l\'économie brisée.** Le coût visible d\'un ARS les tokens API ne représente que 10 à 20 % du coût réel. Les coûts cachés sont la gouvernance, l\'infrastructure, le monitoring, les corrections d\'erreurs, le temps humain de supervision. selon une enquête Forrester publiée fin 2025, 84 % des entreprises utilisant l'IA à grande échelle rapportent une érosion de marge supérieure à 6 % due aux coûts IA. Le remède : calculer le coût par résultat réussi, pas par appel API. Si votre agent envoie 100 emails de prospection, mais que seulement 5 génèrent un meeting, votre coût unitaire n\'est pas 0,50 dollar par email c\'est 10 dollars par meeting. Mesurez ce qui compte.

> **En pratique :** Un agent de génération de leads consomme 45 dollars par mois en tokens API. Il envoie 1 500 messages. 75 génèrent une réponse. 12 deviennent des rendez-vous. 3 se convertissent en clients à 500 dollars chacun. Coût par client acquis : 15 dollars. Le même coût pour un commercial humain qui fait 3 ventes par mois sur un salaire de 4 000 euros :\
> 1 333 euros par client. Le calcul n\'est pas compliqué encore faut-il le faire sur le bon chiffre.

**Quatrième mur : le risque de dépendance à la plateforme.** Si votre ARS repose entièrement sur un seul fournisseur, un seul modèle, une seule API, un seul framework vous êtes à une mise à jour de la faillite. Ryze AI, un wrapper autour de Claude, a été tué en 24 heures par une mise à jour du modèle. Le remède : construire sur des protocoles ouverts MCP, pas un connecteur propriétaire. Utiliser le tiering de modèles pour ne pas dépendre d\'un seul fournisseur. Développer des données propriétaires et des skill files qui ont de la valeur indépendamment du modèle sous-jacent.

**Cinquième mur : la barrière d\'adoption.** Seulement\
14 % des Américains font confiance aux achats réalisés de manière autonome par l\'IA. Une expérience négative avec un agent produit un taux de réachat de 10 % contre 40 % avec un humain. Le remède : commencer en mode lecture seule l\'agent recommande, l\'humain valide. Augmenter l\'autonomie progressivement, à mesure que la confiance se construit. Toujours offrir une escalade humaine. La transparence dire au client qu\'il interagit avec un agent augmente la confiance plutôt que de la diminuer.

**Sixième mur : la responsabilité juridique.** Vous êtes juridiquement responsable des actions de votre agent. Le tribunal de Colombie-Britannique l\'a confirmé dans l\'affaire Air Canada : une entreprise ne peut pas se soustraire à sa responsabilité en arguant qu\'un chatbot a donné une mauvaise réponse. La Californie a codifié le principe dans la loi AB 316 : on ne peut pas prétendre que l\'IA a agi de manière autonome pour échapper à sa responsabilité. Le remède : traiter votre agent comme un employé junior. Il a besoin de supervision sur les décisions à fort impact. Les actions à conséquences financières ou légales nécessitent un checkpoint humain, au moins au démarrage.

Gartner prédit que 40 % des initiatives d\'IA autonome seront abandonnées d\'ici 2027. Ce chiffre n\'est pas un argument contre les ARS. C\'est un filtre. Les 40 % qui abandonnent sont ceux qui n\'ont pas anticipé ces six murs. La Propriété Agentique, la deuxième loi explique pourquoi persister est si important : la valeur s\'accumule chez ceux qui possèdent les systèmes, pas chez ceux qui abandonnent. Les 60 % qui persistent avec méthode, constance et rigueur capteront l\'essentiel du marché. Vous savez maintenant quels sont les murs. Vous savez comment les franchir.

> **En pratique :** Un constructeur a déployé un agent de support client avec un workflow de 15 étapes. Taux de résolution : 23 %. En réduisant à 5 étapes avec un checkpoint humain au milieu, le taux est passé à 78 %. La leçon : la fiabilité composée n\'est pas un obstacle théorique. C\'est le premier mur que vous toucherez, et le plus facile à franchir en simplifiant.

Cela vous place dans les 60 %.

**Le rôle de l\'humain : architecte, pas exécutant**

Tout au long de ce chapitre, un mot revient sans cesse : « autonome ». L\'agent crée, il prospecte, il vend, il s\'améliore. On pourrait en conclure que l\'humain n\'a plus de rôle. Ce serait l\'erreur la plus coûteuse de votre parcours d\'Architecte.

L\'humain n\'est pas absent du système. Il en est le concepteur. Il définit la mission, choisit la niche, évalue les résultats, prend les décisions que l\'agent ne peut pas prendre les décisions stratégiques, éthiques, et créatives qui nécessitent du jugement, de l\'intuition et une compréhension du monde que les modèles de langage n\'ont pas encore.

Vous devez être à l\'aise avec le fait de structurer le rôle et les responsabilités au niveau de qualité que cet employé peut produire, et l\'augmenter avec le temps. » Nat Eliason explique : « Quiconque a déjà embauché, quiconque a de l\'expérience en délégation, en externalisation, en pensée systémique c\'est un avantage compétitif énorme dans le travail avec l\'IA, parce que vous comprenez comment calibrer les attentes et les responsabilités aux capacités du modèle. »

Olivia Moore, investisseuse chez a16z, a posé la limite créative : « Bientôt, tout le monde aura ses propres essaims d\'agents. Pour se démarquer, l\'idée ou la distribution doit être originale. Aucun agent n\'a encore percé par la force d\'une idée originale seule. Ça, ça nécessite encore un humain. »

Le repositionnement est celui que le livre propose depuis le chapitre 4. Vous n\'êtes pas un exécutant qui se fait remplacer. Vous êtes un Architecte qui conçoit les systèmes qui exécutent. Erik Brynjolfsson, de Stanford, l\'a nommé le\
« Chief Question Officer » celui qui pose les bonnes questions et évalue les résultats. La valeur n\'est plus dans l\'exécution. L\'exécution est commoditisée. La valeur est dans la conception, la direction, et le jugement.

Felix n'est pas un entrepreneur autonome. C'est un système conçu par Nat Eliason. Il est le Chairman, l'agent est le CEO. Larry n\'est pas un marketeur autonome. Il est un système conçu par Oliver Henry. Henry est l\'Architecte, Larry est le bâtisseur. Dans les deux cas, l\'humain travaille moins d\'une heure par jour sur le système. Mais cette heure de direction, de correction, de vision est ce qui fait la différence entre un ARS qui génère 165 000 dollars et un agent qui tourne dans le vide.

**Ce que ce chapitre change**

Vous aviez la théorie, la méthode, la carte. Maintenant, vous avez le modèle.

Cinq couches techniques, dont aucune ne coûte plus de quelques dollars pour démarrer. Un framework open-source OpenClaw qui transforme Claude en agent autonome. Un cas décortiqué dont chaque décision est documentée et réplicable. Cinq phases qui vous emmènent du jour 1 à un ARS fonctionnel en quatre semaines. Des skill files qui codifient le savoir et s\'améliorent chaque nuit. Une économie réelle qui montre des coûts de 14 dollars par mois pour 10 000 interactions client. Six murs identifiés, avec six remèdes concrets.

Le chapitre 7 vous a donné vos coordonnées, quadrant, niveau, profil, pilier prioritaire. Ce chapitre vous a donné les outils pour démarrer. Pas dans un mois, ni quand la technologie sera parfaite. Maintenant. Avec ce que vous avez. Avec ce qui existe. L'agent de mars 2026 est imparfait. Il sera radicalement meilleur et moins cher dans 12 mois. Mais dans 12 mois, ceux qui auront construit aujourd\'hui auront 12 mois de skill files, de données propriétaires, et d\'avantage composé. Ceux qui auront attendu partiront de zéro.

Comme Peter Steinberger l\'a dit : « Si vous êtes déterminé et intelligent, vous serez plus demandé que jamais. » Et il a ajouté ce conseil : « Approchez-le de manière ludique. Construisez quelque chose que vous avez toujours voulu construire. » L\'ARS n\'est pas une corvée. C\'est le premier système que vous possédez qui travaille pour vous pendant que vous vivez.

**Le Quickstart Guide : votre premier ARS en un week-end**

![](media/image15.png){width="4.03125in" height="2.6875in"}\
*Schéma 8.2 Le Quickstart : les 20 étapes pour un ARS en un week-end\
*

Tout ce qui précède peut sembler dense. Voici la version condensée vingt étapes, un week-end, votre premier agent en production. Chaque étape est concrète, chronométrée et chiffrée. Suivez-les comme une recette.

***Samedi matin Le socle (2 heures)***

> **Étape 1** Ouvrir un compte Anthropic sur console.anthropic.com. Gratuit. 5 minutes.
>
> **Étape 2** Acheter des crédits d\'API. 20 dollars suffisent pour démarrer. 5 minutes.
>
> **Étape 3** Installer OpenClaw sur votre machine. Un Mac, un PC, un VPS à 5 dollars par mois n\'importe quoi suffit. Suivez la documentation officielle. 30 minutes.
>
> **Étape 4** Créer votre fichier SOUL.md. C\'est l\'identité de votre agent. Cinq sections : Nom, Mission (une phrase), Ton (comment il communique), Règles (ce qu\'il ne doit jamais faire), Contexte (votre situation). Vingt lignes suffisent. 20 minutes.
>
> **Étape 5** Connecter un canal de communication. Telegram est le plus simple. WhatsApp et Discord fonctionnent aussi. 15 minutes.
>
> **Étape 6** Envoyer votre premier message à votre agent. Demandez-lui de se présenter. Vérifiez qu\'il répond conformément au SOUL.md. 5 minutes.

***Samedi après-midi La première valeur (3 heures)***

> **Étape 7** Identifier votre pilier V. Quelle valeur allez-vous produire ? Reprenez la question du chapitre 6 : quel est le problème que vous résolvez, pour qui, et combien cela vaut-il ? Écrivez la réponse en trois lignes. 30 minutes.
>
> **Étape 7 bis** *Évaluez votre arbitrage.* Trois questions en 10 minutes. Premièrement : la demande pour ce que vous proposez est-elle massive et mal satisfaite ? Deuxièmement : pouvez-vous distribuer par agent là où vos concurrents le font encore manuellement ? Troisièmement : les concurrents en place sont-ils lourds et lents à pivoter ? Si oui aux trois, vous avez un arbitrage de six à dix-huit mois, foncez. Si oui à deux sur trois, vous avez un avantage réel, procédez avec méthode. Si oui à une seule, reconsidérez votre choix de marché avant de créer votre skill file. 10 minutes.
>
> **Étape 8** Créer votre premier skill file. Un fichier Markdown qui enseigne à votre agent le workflow de votre pilier V. Objectif, règles, contraintes. Commencez par 30 lignes. 45 minutes.
>
> **Étape 9** Donner à votre agent sa première tâche de production. Si votre pilier V est le contenu, demandez-lui de rédiger un article. Si c\'est la prospection, demandez-lui de qualifier 10 leads. Si c\'est le support client, donnez-lui un scénario de conversation. 30 minutes.
>
> **Étape 10** Évaluer le résultat. Est-ce utilisable ? Qu\'est-ce qui manque ? Mettez à jour le skill file avec les corrections. Faites refaire la tâche. Comparez. 45 minutes.
>
> **Étape 11** Connecter un outil via MCP. Email (Gmail), navigateur (Browser-Use), ou un outil métier. Chaque connexion élargit la capacité de votre agent. 30 minutes.

***Dimanche matin L\'acquisition (2 heures)***

> **Étape 12** Activer le pilier A. Comment les clients vont-ils trouver votre offre ? Un agent qui génère du contenu SEO. Un agent qui envoie des messages LinkedIn. Un agent qui répond aux demandes entrantes. Choisissez un canal. Un seul. 30 minutes.
>
> **Étape 13** Créer le skill file d\'acquisition. Les règles, le ton, la fréquence, les critères de qualification. 30 minutes.
>
> **Étape 14** Lancer la première séquence d\'acquisition. L\'agent prospecte, rédige ou publie selon le canal choisi. Supervisez les premiers résultats. 60 minutes.

***Dimanche après-midi Le système (2 heures)***

> **Étape 15** Activer le heartbeat. Configurez le HEARTBEAT.md pour que votre agent vérifie proactivement ses tâches toutes les 30 minutes. C\'est ce qui le transforme de chatbot en agent autonome. 30 minutes.
>
> **Étape 16** Configurer la routine d\'auto-amélioration. Un cron job qui s\'exécute chaque nuit : l\'agent relit ses sessions, identifie un axe de progrès, met à jour son skill file. Copiez cette méthode. 30 minutes.
>
> **Étape 17** Connecter un système de paiement. Stripe est le plus simple. Un lien de paiement suffit pour démarrer. Pas besoin d\'un site complet. 30 minutes.
>
> **Étape 18** Mettre en ligne votre offre. Une landing page simple. Carrd.co à 19 dollars par an, ou une page Notion publique, ou un simple formulaire. L\'important n\'est pas la beauté c\'est l\'existence. 30 minutes.

***Le diagnostic***

> **Étape 19** Vérifier les trois piliers minimaux. V : votre agent produit-il quelque chose de vendable ? A : existe-t-il un mécanisme pour que des clients trouvent cette offre ? U : le produit peut-il être livré sans votre intervention ? Si les trois réponses sont oui, même imparfaitement, votre ARS est fonctionnel.
>
> **Étape 20** Laisser tourner. Ne touchez plus au système pendant 48 heures. Observez ce qui se passe. Notez ce qui échoue. Mettez à jour les skill files en conséquence. Le cycle VALUE commence à tourner.

*Coût total de ce week-end : 20 à 50 dollars (crédits API + domaine optionnel). Temps investi : 9 heures. Résultat : un ARS fonctionnel sur trois piliers, avec un agent autonome qui tourne, prospecte, et s\'améliore chaque nuit.*

Si ça ne marche pas au premier essai, c'est normal. Et c'est prévu.

Mais construire n'est pas un long fleuve tranquille. Les six murs de ce chapitre ne sont pas les seuls obstacles. L'agent va halluciner. Le marché va résister. La motivation va fluctuer. La tentation de tout abandonner au premier échec est réelle et les statistiques Gartner le confirment. Le chapitre suivant aborde de front cette réalité. Pas pour vous décourager, pour armer votre Capital Agentique. Parce que dans l'ère agentique, l'échec n'existe pas. On réussit ou on apprend. Et chaque leçon apprise est un actif de plus dans votre Capital Agentique, du patrimoine qui se compose.

> **📋 Canvas ARS mise à jour :** Si vous avez suivi le Quickstart Guide, trois cases minimum de votre Canvas devraient avoir évolué : ③ VALUE (votre offre en une phrase), ④ Méthode (vos piliers V, A, U au minimum), et ⑥ Objectif (un chiffre et une date). Un Canvas à moitié rempli après le chapitre 8 est un excellent signal.