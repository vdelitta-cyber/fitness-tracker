# Fitness Tracker Vin

Dark mode workout tracker: PPL (ma/di/wo) + Upper/Lower (vr/za), rust op do/zo.
Werkt volledig lokaal (localStorage) met optionele automatische sync naar een
Google Sheet ("Fitness_Tracker_Vin").

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
5. Bij "Authorized JavaScript origins": `http://localhost:5500`.
6. Kopieer de Client ID naar het "Sync" tabblad in de app, klik Opslaan,
   dan "Verbind met Google".

De app maakt daarna automatisch een sheet genaamd `Fitness_Tracker_Vin` aan
(of hergebruikt een bestaande met die naam) met kolommen:
Datum, Dag, Oefening, Gewicht, Reps, Set Type, Notes.
Elke gelogde set wordt automatisch bijgeschreven.

Zonder Client ID werkt alles gewoon lokaal — sync is puur een extra laag.

## Data

- 125 ingebouwde oefeningen (25 per spiergroep: chest, back, legs, shoulders,
  arms) — geen handmatig toevoegen nodig.
- Zoekresultaten zijn gefilterd op de spiergroepen van de geselecteerde
  trainingsdag en gesorteerd op gebruiksfrequentie (alfabetisch bij gelijke
  score / eerste gebruik).
- Startgewichten zijn eenmalig geseed: Bench 100kg, Squat 100kg, Deadlift 160kg.
- Warmup sets tellen niet mee voor PR's, progressiegrafieken of wekelijks volume.
