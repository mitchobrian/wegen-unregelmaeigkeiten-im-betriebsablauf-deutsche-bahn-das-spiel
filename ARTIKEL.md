# „Wegen Unregelmäßigkeiten im Betriebsablauf": Wie ich mit einem einzigen Prompt ein Bahn-Satire-Jump'n'Run bauen ließ – inklusive Kostenrechnung

*Ein Werkstattbericht über Vibe-Coding, Markenrecht, DSGVO und die Frage, was so ein Spiel eigentlich an Tokens und Euro kostet. Offenlegung vorweg: Diesen Artikel hat die KI geschrieben – ich erzähle ihn hier in meiner eigenen Ich-Perspektive, so wie es wirklich ablief.*

---

Manche Projekte beginnen mit einem Lastenheft, einem Kickoff-Meeting und drei Wochen Konzeptphase. Meines begann mit einem einzigen Absatz, den ich in ein Chatfenster getippt habe:

> „Wir programmieren ein Spiel im Super-Mario-Stil, welches die Deutsche Bahn auf die Schippe nimmt. Das Spiel soll die Probleme der Bahn thematisieren (zu spät, zu voll, defekte Klimatisierung etc.). [...] Es soll direkt auf GitHub als Open-Source-Projekt gehostet werden (GitHub Pages). Das Spiel soll 3 Level haben und den Fortschritt im Browser speichern. Man soll vorab einen Spielernamen (für eine Bestenliste) eingeben (Blacklist für unangebrachte Namen implementieren). [...] Schreibe zudem einen ansprechenden Artikel über die einfache Erstellung der gesamten Applikation."

Heraus kam **„Wegen Unregelmäßigkeiten im Betriebsablauf – Das Spiel"**: ein lauffähiges Browser-Jump'n'Run mit drei Leveln, Online-Bestenliste, Namensfilter, DB-Parodie-Look – und automatischem Deployment per CI/CD. Plus dieser Artikel. Vom ersten Prompt bis zum fertigen, ausgerollten Spiel: **rund eine Stunde** – und ich musste dabei **fast** nichts selbst anfassen. Fast. Genau diese „fast" ist der spannende Teil, also schauen wir hinter die Kulissen.

## Erst denken, dann tippen

Was mich am meisten überrascht hat, war nicht *dass* die KI loslegte, sondern *wie*. Statt sofort Code rauszuhauen, hat sie erst geplant: das (leere) Repository angeschaut und mir vier gezielte Rückfragen gestellt, bevor sie eine Zeile schrieb. Die Fragen saßen:

1. **Technologie-Stack?** Vorschlag und Wahl: pures HTML5-Canvas mit Vanilla JavaScript – keine Frameworks, kein Build-Tool. Begründung der KI: GitHub Pages ist statisch, und „null Dependencies" passt am besten zur Geschichte einer einfachen Erstellung. Leuchtete mir sofort ein.
2. **Bestenliste lokal oder geteilt?** Hier wurde es interessant: Eine *echte*, geräteübergreifende Rangliste braucht ein Backend – das gibt es auf reinen statischen Seiten nicht. Die KI schlug **Supabase** vor (Postgres + REST, öffentlicher anon-Key, abgesichert per Row-Level-Security) und baute zugleich einen **localStorage-Fallback** ein, damit das Spiel auch ohne Backend sofort spielbar ist.
3. **Kostenangaben im Artikel?** Ich entschied mich für transparente Schätzwerte statt erfundener Präzision (dazu unten mehr).
4. **GitHub-Deployment?** Mein Repo war schon da, also durfte die KI selbst committen und pushen.

Das ist für mich der eigentliche Trick beim „Vibe Coding" mit aktuellen Modellen: Die Qualität entsteht nicht im ersten Token, sondern in der Bereitschaft, vor dem Schreiben die richtigen Entscheidungen zu treffen – und mich bei Unklarheiten zu fragen, statt zu raten.

## Woran die KI gedacht hat (und ich erst auf den zweiten Blick)

Spannend ist, was alles *nicht* in meinem Prompt stand, aber trotzdem bedacht wurde:

**Markenrecht statt Ärger.** Die Deutsche Bahn ist eine eingetragene Marke, ihr Logo geschützt. Die KI hat mich aktiv darauf hingewiesen und statt des Originals ein parodistisches Wortzeichen gebaut – die **„Deutsche Verspätungsbahn"** mit einem DB-ähnlichen, aber klar abgewandelten **„DV"-Logo** – in DB-typischen Farben (Verkehrsrot `#EC0016`, Weiß, Verkehrsgrau), ohne Original-Logo und ohne die proprietäre Hausschrift „DB Sans". Auf Startbildschirm *und* in der Fußzeile steht ein deutlich sichtbarer Hinweis: **satirisches Fanprojekt, keine offizielle DB-Anwendung, keine Verbindung zur Deutschen Bahn AG.**

**DSGVO mitgedacht.** Eine Online-Bestenliste mit Namen ist datenschutzrechtlich kein Nullum. Gespeichert werden nur ein selbstgewählter Spitzname plus Punktzahl – keine IP, kein Tracking, keine Klarnamen. Ein expliziter Hinweis empfiehlt nicht-identifizierende Namen, und das empfohlene Supabase-Projekt liegt in der EU-Region.

**Missbrauchsschutz.** Die von mir geforderte Blacklist filtert nicht naiv per Stichwortliste, sondern **normalisiert** Eingaben zuerst (Kleinschreibung, Leetspeak `N3ger` → `neger`, entfernte Sonder- und Leerzeichen `f u c k`), um gängige Umgehungstricks zu erschweren. Doppelte Namen werden automatisch eindeutig gemacht.

**Keine Secrets im Repo.** Der Supabase-Schlüssel ist zwar designgemäß öffentlich, wird aber trotzdem nicht naiv eingecheckt – die Pipeline zieht die Konfiguration aus Build-Variablen, und der geheime Service-Key bleibt komplett außen vor.

## Wie das Spiel die Bahn auf die Schippe nimmt

Die DB-Plagen wurden zu Spielmechaniken übersetzt:

- **Temperatur** – und zwar ausdrücklich in beide Richtungen: In Level 1 („Sommerchaos im Regionalexpress") ist die Klimaanlage defekt, ein **Hitze-Meter** steigt; Eis und Ventilatoren kühlen. In Level 2 („Winterfahrt ohne Heizung") ist die Heizung ausgefallen, ein **Kälte-Meter** klettert; Kaffee und Glühwein wärmen. Läuft der Balken voll, kostet das ein Leben.
- **Verspätung** – ein stetig wachsender Counter („+12 Min") drückt auf den Score.
- **Überfüllung** – Menschenmengen als bewegliche Hindernisse bremsen die Spielfigur.
- **Signalstörung, Baustelle, Schienenersatzverkehr** – das große Finale in Level 3 („Hauptbahnhof-Endspurt") wirft alles zusammen, inklusive herrenlosem Koffer und gefürchtetem SEV-Bus.

Technisch steckt darunter eine kompakte, selbstgebaute 2D-Engine: feste Physik-Schrittweite für stabile Sprünge, achsenweise Kollisionsauflösung, Kamera-Scrolling, „Coyote Time" für faire Sprünge an Kanten – alles in wenigen hundert Zeilen Vanilla-JavaScript, ohne eine einzige externe Bibliothek.

## Getestet, nicht nur gehofft

Was mich beeindruckt hat: Die KI hat ihren Code nicht nur geschrieben, sondern auch selbst **verifiziert**. Sie startete einen lokalen Webserver, lud das Spiel in einen headless laufenden Chrome und prüfte per Skript die Physik – Laufweg, Sprunghöhe, Gegner-Kollision mit Lebensverlust, Ziel-Erkennung, Temperatur-Anstieg und Überfüllungs-Bremse. Erst als Engine und Spiellogik nachweislich funktionierten, ging es weiter. Ein Screenshot bestätigte zusätzlich, dass die Grafik wirklich rendert. Ich musste also nicht blind vertrauen.

## Und die CI/CD?

Bei jedem Commit auf `main` läuft ein GitHub-Actions-Workflow: Konfiguration erzeugen → JS-Syntax prüfen → statische Seite bündeln → auf GitHub Pages deployen. Push genügt – Sekunden später ist die neue Version live.

## Nicht ganz auf Autopilot – wo ich ran musste

So beeindruckend der „One-Prompt"-Eindruck ist: Ganz ohne meine Hände am Steuer ging es nicht – und das gehört zur ehrlichen Geschichte dazu. Zwei Dinge musste ich übernehmen:

1. **Die Datenbank scharf schalten.** Eine geteilte Bestenliste braucht ein echtes Backend, und das kann mir keine KI anlegen. Ich habe das **Supabase-Projekt selbst erstellt**, das Tabellen-Schema samt Row-Level-Security eingespielt und die Zugangsdaten (Projekt-URL + öffentlicher Key) als **Variablen in die CI/CD-Pipeline** übernommen. Erst danach lief die Online-Rangliste – bis dahin trug das eingebaute localStorage-Fallback das Spiel.
2. **Die Welt nachschärfen.** Der erste Wurf sah mir noch zu sehr nach Stadtkulisse aus. Ich gab den Hinweis: „Man läuft hier durch eine Stadt, nicht durch einen Zug." Daraufhin baute die KI die Umgebung um – ein durchgehender Zug am Nachbargleis, je Level als **Regionalbahn, S-Bahn und ICE**, plus ein klar erkennbarer Ziel-Zug mit Zugzielanzeiger. Auch Sprunghöhe, Hinweise und den Schnee-Effekt habe ich nach kurzem Feedback nachjustieren lassen.

Mit anderen Worten: Der erste Prompt brachte rund 90 Prozent in einem Rutsch; die letzten 10 Prozent entstanden im Dialog – ein paar präzise Rückmeldungen von mir, die die KI jeweils sauber umsetzte. **In Summe: vom Start-Prompt bis zum fertigen, ausgerollten Spiel inklusive diesem Artikel etwa eine Stunde Arbeit.**

## Die Gretchenfrage: Was hat mich das gekostet?

Hier wird oft geschwiegen oder geraten. Also rechne ich offen – mit dem ausdrücklichen Hinweis: **Es sind Schätzungen in der richtigen Größenordnung, keine centgenaue Abrechnung.** Grundlage sind die aktuellen Preise für das verwendete Modell **Claude Opus 4.8**:

| Posten | Preis pro 1 Mio. Tokens |
| --- | --- |
| Eingabe (Input) | 5,00 $ |
| Ausgabe (Output) | 25,00 $ |
| Cache-Lesen (Prompt Caching) | ~0,50 $ (0,1×) |
| Cache-Schreiben | ~6,25 $ (1,25×) |

Der Clou: In einer langen Coding-Session wird der wachsende Kontext bei *jeder* Anfrage erneut mitgeschickt. Ohne Prompt Caching würde das richtig teuer. Mit Caching werden die immer gleichen Anteile (System-Prompt, bereits geschriebene Dateien) zum Bruchteil des Preises erneut gelesen.

Grobe Abschätzung für mein Projekt:

| Posten | Menge (geschätzt) | Kosten |
| --- | --- | --- |
| Eingabe – frisch | ~0,5 Mio. Tokens | ~2,50 $ |
| Eingabe – Cache-Lesen | ~2,0 Mio. Tokens | ~1,00 $ |
| Ausgabe (Code + Artikel + Reasoning) | ~0,12 Mio. Tokens | ~3,00 $ |
| **Summe** | **~2,6 Mio. Tokens** | **≈ 6,50 $ (rund 6 €)** |

In Worten: **Ein komplettes, getestetes Open-Source-Spiel inklusive Backend-Anbindung, CI/CD und diesem Artikel – für ungefähr den Preis eines belegten Brötchens und eines Kaffees am Bahnhofskiosk.** (Der Kaffee ist im Spiel übrigens ein Power-up gegen Kälte.) Je nach Anzahl der Iterationen und Caching-Trefferquote bewege ich mich realistisch im Bereich **5 bis 8 Euro** – plus die eine Stunde meiner Zeit.

## Was ich mitnehme

Drei Beobachtungen:

1. **Der Prompt war simpel, das Ergebnis nicht – aber auch nicht zu 100 Prozent autonom.** Die eigentliche Arbeit – Stack-Wahl, Markenrecht, DSGVO, Missbrauchsschutz, Fallback-Strategie, Tests – hat die KI weitgehend selbst strukturiert. Den letzten Schliff brachte der Dialog: Ich musste das Backend manuell scharf schalten und ein paar gezielte Rückmeldungen geben (Zug-Optik, Sprunghöhe, Schnee). Gute Ergebnisse entstehen, wenn ich dem Modell erlaube, zu *planen* und Rückfragen zu stellen – und wenn ich bereit bin, an den richtigen Stellen nachzusteuern.
2. **„Statisch" ist kein Hindernis, sondern eine Designentscheidung.** Die Spannung zwischen „GitHub Pages, kein Server" und „geteilte Bestenliste" wurde nicht ignoriert, sondern sauber gelöst – mit einem externen Dienst plus Fallback.
3. **Aufwand und Kosten sind erstaunlich niedrig** – rund eine Stunde Arbeit und ein einstelliger Eurobetrag, vorausgesetzt, die Werkzeuge nutzen Prompt Caching konsequent.

Wer es selbst ausprobieren will: Das Projekt liegt vollständig quelloffen auf GitHub. Pünktlichkeit nicht garantiert – das Ergebnis dafür ziemlich **fan-tastisch** (ja, als Wortspiel zum Fanprojekt). 🚆

---

*Disclaimer: Dieses Spiel ist ein satirisches Fanprojekt und steht in keiner Verbindung zur Deutschen Bahn AG. Es ist keine offizielle DB-Anwendung. Alle Marken gehören ihren jeweiligen Eigentümern. Die Kostenangaben sind transparente Schätzungen auf Basis der genannten Modellpreise und keine verbindliche Abrechnung.*
