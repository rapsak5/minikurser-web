# Julefrokost på Amager (offentlig udgave)

Spil: https://minikurser.dk/julefrokost/

Lille 16-bit pixelspil fra ai-workshop.dk. Skriv dit navn, vælg en fisker, kom på topscorerlisten, og klar alle tretten baner for at få en personlig rabatkode til en workshop fra ai-workshop. Halvvejs tilbydes nyhedsbrevet Tre ting om AI.

- Spillet ligger her fra 26/11 2026. Før lå det på https://rapsak5.github.io/amager-spillet/, som nu sender videre hertil.
- Ret spillet her (mappen `julefrokost`). Et push til main opdaterer minikurser.dk.
- Serveren (topscorerliste, rabatkoder, nyhedsbrev) er stadig Cloudflare Workeren `amager-spil-scores` med D1-databasen af samme navn. Koden ligger i repoet rapsak5/amager-spillet, mappen `server`, og bygges derfra. `ALLOWED_ORIGIN` skal indeholde `https://minikurser.dk`, ellers afviser serveren point, koder og tilmeldinger.
- Admin: https://minikurser.dk/julefrokost/admin.html (kræver ADMIN_TOKEN).
- Gemt fremskridt ligger i browseren pr. domæne, så spillere fra den gamle adresse starter forfra her. Topscorerlisten er den samme.
