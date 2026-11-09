# Fitness Tracker Vin

Donkere, monochrome workout tracker (puur zwart, krijtwit, Archivo extra breed).
Werkt volledig in de browser (localStorage) met optionele sync naar een
Google Sheet ("Fitness_Tracker_Vin").

Online: https://vdelitta-cyber.github.io/fitness-tracker/

## Gebruik

- **Trainingsdag kiezen**: op het Vandaag-scherm staat een dropdown met Push, Pull,
  Legs (Quad), Upper en Lower (Glute/Hamstring). Er is geen vast weekschema.
  Zonder keuze volgt de app de rotatie push → pull → legs → upper → lower na je
  laatst gelogde sessie. Wat je kiest wordt per datum bewaard.
- **Set loggen**: zoek een oefening, vul gewicht en reps in, kies Warmup of Working
  en tik op "Set loggen".
- **Zwaarste werkset**: de zwaarste werkset van vandaag wordt getekend als geladen
  stang, dumbbell of kabelstapel. Zonder sets vandaag zie je je zwaarste record.
- **Weekdoel**: 5 trainingsdagen per week. De streak telt aaneengesloten
  trainingsdagen, met maximaal 2 rustdagen ertussen.
- **Intensiteit**: het working volume van vandaag t.o.v. het gemiddelde van je
  laatste 4 sessies van hetzelfde dagtype, op een schaal van 1 tot 10.
- **Tabs**: Vandaag, Analyse (progressie per oefening, weekvolume, consistency van
  de laatste 5 weken), Records en Sync.

## Starten

Er is geen Node/Python nodig — er zit een kleine PowerShell-webserver bij.

```powershell
powershell -ExecutionPolicy Bypass -File fitness-tracker\serve.ps1
```

Open daarna http://localhost:5500 in je browser.

(De app werkt ook door `index.html` direct te openen, maar dan werkt de
Google Sheets sync niet — Google OAuth vereist een `http(s)://` origin.)

## Google Sheets sync instellen (optioneel)

1. Ga naar console.cloud.google.com en maak (of kies) een project.
2. Enable de **Google Sheets API** en **Google Drive API**.
3. "OAuth consent screen" → External → vul een naam in → voeg je eigen
   e-mailadres toe als test user.
4. "Credentials" → "Create Credentials" → "OAuth client ID" → **Web application**.
5. Bij "Authorized JavaScript origins" voeg je de origin toe, zonder pad:
   `http://localhost:5500` en/of `https://vdelitta-cyber.github.io`.
6. Bij "Authorized redirect URIs" voeg je de exacte URL van de pagina toe. Die wordt
   per pagina bepaald, dus registreer ze allemaal die je gebruikt, bijvoorbeeld
   `http://localhost:5500/`, `https://vdelitta-cyber.github.io/fitness-tracker/` en
   `https://vdelitta-cyber.github.io/fitness-tracker/index.html`. Op het Sync-tabblad
   staat onder "Hoe stel ik dit in?" de waarde die bij jouw pagina hoort. Klopt de
   URI niet exact, dan geeft Google `redirect_uri_mismatch` (o.a. zichtbaar op iPhone).
7. Kopieer de Client ID naar het "Sync" tabblad in de app, klik Opslaan,
   dan "Verbind met Google".

De app maakt daarna automatisch een sheet genaamd `Fitness_Tracker_Vin` aan
(of hergebruikt een bestaande met die naam), met een tabblad `Sets` en kolommen:
Datum, Dag, Oefening, Gewicht, Reps, Set Type, Notes.
Elke gelogde set komt eerst in een wachtrij en wordt bijgeschreven zodra je
verbonden bent.

De sync werkt maar één kant op: de app schrijft sets naar de sheet en leest er niet
uit terug. De sheet is dus een back-up en export, geen bron voor een ander apparaat.

Zonder Client ID werkt alles gewoon lokaal — sync is puur een extra laag.

## Data

- Alle sets staan in de browser van het apparaat waarop je logt (localStorage).
  Een andere browser of een ander apparaat begint dus leeg.
- 125 ingebouwde oefeningen (25 per spiergroep: chest, back, legs, shoulders,
  arms) — geen handmatig toevoegen nodig.
- Zoekresultaten zijn gefilterd op de spiergroepen van de geselecteerde
  trainingsdag en gesorteerd op gebruiksfrequentie (alfabetisch bij gelijke
  score / eerste gebruik).
- Startgewichten zijn eenmalig geseed: Bench 100kg, Squat 100kg, Deadlift 160kg.
- Warmup sets tellen niet mee voor PR's, progressiegrafieken of wekelijks volume.

## Online zetten

De site draait op GitHub Pages vanaf de `main`-branch. Na elke commit bouwt GitHub
Pages automatisch opnieuw (tabblad Actions, "pages build and deployment"); dat duurt
meestal binnen een paar minuten. Zie je daarna nog de oude versie, sluit Safari dan
helemaal af en open de app opnieuw.
