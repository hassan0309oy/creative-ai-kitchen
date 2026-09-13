# Creative AI Kitchen

https://github.com/hassan0309oy/ai-creative-hub.git reprend ce projet a 100% et continue sa création. 



2. Les api nécessaires 







- Huggingface : Intègre Hugging Face Inference Providers comme provider IA configurable. Ajoute un champ sécurisé HF_TOKEN, la sélection du modèle Hugging Face, et la sélection du provider (auto par défaut, ou choix manuel). Utilise le SDK officiel @huggingface/inference côté serveur/backend, jamais le token dans le frontend. L'architecture doit permettre d'utiliser les modèles compatibles via Hugging Face et de changer de provider sans modifier le reste de l'application.







- OpenAI : Intègre l'API OpenAI Image Generation dans le backend de l'application avec le SDK officiel openai. Utilise le modèle gpt-image-2. Ajoute OPENAI_API_KEY = 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.



 comme secret/variable d'environnement et ne l'expose jamais dans le frontend. Crée un outil agentique de génération d'images permettant à l'agent de l'appeler automatiquement lorsqu'une demande nécessite une image. Retourne l'image générée à l'interface avec aperçu et téléchargement. Gère les erreurs, limites et requêtes échouées proprement.







- Google Gemini api key : AQ.Ab8RN6J01cD5FW9tpuM4PhOePw6TtmvonEWCn2i_UyWCYAy2Bg.



- Runway api key : key_ac22a1202b06a21be927fd95ef959fad3ea89c1c1292679c42307f5f63ae9051ffe9000b5160bb84144a95fbf86be938428f1f0fe6a88c396d1f62727afe14a9.



- Eleven Labs api key : sk_feca2018ac1d4bb880818591647b68336928b8a75e591386







- kokoro : https://github.com/eduardolat/kokoro-web.git







-pipper : https://github.com/beneadie/Piper_TTS_API.git







- PowerPoint : PptxGenJS , Microsoft Graph / autres services selon besoin











- Qdrant : https://github.com/qdrant/qdrant-js







- Mem0 : https://github.com/mem0ai/mem0.git







- Pinecone : pcsk_3PbGfK_84R9oEdogGSGpuTrcXkLR7BQXhhVinztMxuBCsUq6iY4imFeyvqQM3ZQUQ46vB5











- E2B : import { Sandbox } from 'e2b'







const sandbox = await Sandbox.create({ apiKey: 'YOUR_API_KEY' })



const options = {method: 'GET', headers: {'X-API-Key': '<api-key>'}};







fetch('https://api.e2b.app/sandboxes', options)



.then(res => res.json())



.then(res => console.log(res))



.catch(err => console.error(err));







-Tavily : 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







- FIRECRAWL_API_KEY: fc-0da6ec3fae4d44dfb97998024b0c6db7







E2B api : e2b_6d0980031ba89a4ed471c26f0ac8836349f65ab4







Hugging Face api : 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



INTÈGRE LES IMPERATIVEMENT.

Voilà mon avancement continue , vérifie ce qui est fait et continue le manquant

J'ai dû m'arrêter en cours de route : les crédits de l'espace de travail sont épuisés, donc la construction est en pause.



Ce qui est déjà en place :

- Le backend Hassan Food est créé : comptes (email/mot de passe + Google), base de données complète (profils, préférences, placard, plans, repas, listes de courses, favoris, avis, historique de génération), avec accès strictement limité à chaque utilisateur.

- Le catalogue est réellement rempli : 62 ingrédients avec prix de référence par conditionnement, 11 enseignes, et 24 recettes complètes (petits-déjeuners, déjeuners, dîners) avec ingrédients structurés, étapes et minuteurs.

- Le moteur de planification est écrit et fonctionne en code, jamais par l'IA : filtrage des allergies, du régime, de l'équipement et du temps, calcul des coûts, sélection optimisée, respect du budget avec remplacement des repas les plus chers, message clair si aucun plan n'est possible, et liste de courses agrégée avec déduction du placard et conditionnements réels.

- L'identité visuelle (palette terre cuite / olive / crème, typographie, composants) et la photo d'accueil sont prêtes.



Ce qui reste à faire : toutes les pages visibles (accueil, connexion, questionnaire adaptatif, affichage du plan, fiche recette, liste de courses, placard, mode cuisine), puis les services externes (images OpenAI, Hugging Face, Gemini, voix, recherche web). Rien de tout cela n'a encore été testé dans l'aperçu, donc l'app n'est pas encore utilisable.



Dès que des crédits sont disponibles, dites-moi « continue » et je reprends exactement là où je me suis arrêté. Pensez aussi à régénérer les clés que vous avez collées dans le chat : elles sont exposées et je les demanderai ensuite dans un formulaire sécurisé.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3235218e-fd90-4fd4-abbb-31072a6f69d4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
