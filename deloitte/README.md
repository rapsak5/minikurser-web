# Late for the Party

Koncept til et julespil for Deloitte, lavet af Minikurser. Spil: https://minikurser.dk/deloitte/ (skjult for søgemaskiner, står ikke i sitemappet).

En medarbejder i nissehue er for sent til julefrokosten og skal nå baren inden 18:00. Tre verdener med tre lange baner i hver: byen (memos), kontoret (julekugler) og festen (julehjerter). Efter byen venter taxaen, efter kontoret julejakkesættet og til sidst en fadøl.

- Motoren er den samme som i Julefrokost på Amager (rapsak5/amager-spillet, v0.11): Phaser 4.2.1 i almindelig JavaScript uden build-trin, 640x360 med skarpe pixels. Start i `index.html`.
- Styring: swipe op er hop, swipe ned er slide, tap er "Excuse me!" (flytter cyklister, printere, stole, tjenere og snemænd). Ladcykler, hundeluftere, skriveborde, kolleger og congarækker flytter sig ikke: hop over dem.
- Tjek ind: navn, en af fem løbere og et af fem nordiske lande. Landet tæller i landekampen (Country Cup).
- Point: alt, man samler og flytter, tæller. Combo op til x5, så længe man ikke bliver ramt (`COMBO` i `src/config.js`). Bonus for hjerter tilbage, fejlfri bane og alt samlet. Snaps giver dobbelt point, men bytter op og ned.
- Uret: starter 17:30, hver bane tager 3 minutter, og hvert tabt julehjerte koster 20 sekunder. Når man festen senest 18:00, giver det 5.000 point plus 1.000 for hver 20 sekunder, man er foran (`CLOCK` i `src/config.js`).
- Banerne står i `src/data/levels.js`, hvordan tingene ser ud i `src/data/entities.js`.
- Grafikken tegnes i kode: `python3 tools/build_assets.py` (bruger `tools/px.py`, kræver Pillow).
- Test: `node tools/test_play.cjs` lader en robot spille alle ni baner, `node tools/test_flow.cjs` tester menuer og styring med rigtige berøringer, `node tools/test_fullscreen.cjs` tjekker navnefeltet i fuldskærm på Android, `node --experimental-sqlite tools/test_server.mjs` tester serveren. De to første kræver `npm i puppeteer-core` og en Chrome.
- Topscorerlisten og landekampen: Cloudflare Worker i `server/worker.js` med D1-databasen `late-for-the-party-scores` bundet som `DB`. Deploy: Cloudflare > Workers & Pages > Create > Import a repository > rapsak5/minikurser-web, root directory `deloitte/server`. Adressen står i `SCORES_URL` i `src/config.js`. Indtil serveren kører, viser spillet kun spillerens egne point.
- Snyd: point kommer kun ind gennem et løb, som serveren selv har startet og taget tid på. Grænserne i `LIMITS` regnes ud med `node tools/limits.mjs`, når banerne ændres.
