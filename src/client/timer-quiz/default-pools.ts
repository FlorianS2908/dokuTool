// Generated from QuizTool_Timer.html. Do not edit question text manually here.
import type { QuizPool } from './types';

export const defaultTimerQuizPools: QuizPool[] = [
  {
    "id": "software_daten_grundlagentest_25",
    "area": "software",
    "name": "Software und Daten · Grundlagentest · 25 Fragen",
    "description": "25 prüfungsnahe Fragen zu Datenanalyse, Datenqualität, Datenobjekten, Attributen, Importprüfung, Softwarelebenszyklus, Prozessphasen, Projektmanagement, PDCA, Vorgehensmodellen, Programmiersprachen, Frameworks und Werkzeugen. Zeitlimit: 25 Minuten.",
    "durationMinutes": 25,
    "timeLimitMinutes": 25,
    "questions": [
      {
        "id": 1,
        "topic": "001",
        "difficulty": "leicht",
        "text": "Was ist das Hauptziel einer fachlichen Datenanalyse zu Beginn eines Softwareprojekts?",
        "options": [
          "Datenquellen verstehen, Auffälligkeiten erkennen und Datenbereiche grob strukturieren.",
          "Sofort produktiven SQL-Code schreiben, ohne Datenprüfung.",
          "Nur das spätere Design der Oberfläche festlegen.",
          "Alle Rohdaten ohne Bewertung löschen."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 2,
        "topic": "001",
        "difficulty": "mittel",
        "text": "Welche Arbeitsschritte gehören zu einer fachlichen Datenanalyse? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Datenquellen sichten und inventarisieren",
          "Felder, Datentypen und auffällige Werte beschreiben",
          "Dubletten, fehlende Werte und Formatprobleme prüfen",
          "Daten ungeprüft in ein Produktivsystem übernehmen"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 3,
        "topic": "001",
        "difficulty": "mittel",
        "text": "Warum ist eine Datenquellen-Inventarisierung vor einer Migration sinnvoll?",
        "options": [
          "Sie macht sichtbar, welche Dateien, Tabellen oder Schnittstellen vorhanden sind und welche Datenbereiche sie enthalten.",
          "Sie ersetzt alle späteren Tests vollständig.",
          "Sie sorgt automatisch dafür, dass alle Daten korrekt sind.",
          "Sie ist nur für Bilddateien relevant."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 4,
        "topic": "002",
        "difficulty": "leicht",
        "text": "Welches Beispiel ist ein typisches Datenqualitätsproblem?",
        "options": [
          "Ein Name kommt mehrfach mit unterschiedlicher Schreibweise vor.",
          "Jeder Datensatz besitzt eine eindeutige ID.",
          "Alle Pflichtfelder sind vollständig befüllt.",
          "Alle Datumswerte haben dasselbe Format."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 5,
        "topic": "002",
        "difficulty": "mittel",
        "text": "Welche Prüfungen sind nach einem Datenimport sinnvoll? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Anzahl der Datensätze vergleichen",
          "Umlaute und Sonderzeichen prüfen",
          "Pflichtfelder auf fehlende Werte prüfen",
          "Importdatei löschen, bevor das Ergebnis kontrolliert wurde"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 6,
        "topic": "002",
        "difficulty": "schwer",
        "text": "Eine CSV-Datei enthält Datumswerte in den Formaten <code>2026-05-14</code>, <code>14.05.2026</code> und <code>05/14/26</code>. Welche Bewertung ist korrekt?",
        "options": [
          "Das ist ein Formatproblem und sollte vor weiterer Verarbeitung vereinheitlicht werden.",
          "Unterschiedliche Datumsformate sind immer unproblematisch.",
          "Die Daten sollten fachlich geprüft werden, bevor sie automatisch umgewandelt werden.",
          "Das Problem betrifft nur die optische Darstellung und nie die Verarbeitung."
        ],
        "correct": [
          0,
          2
        ]
      },
      {
        "id": 7,
        "topic": "003",
        "difficulty": "leicht",
        "text": "Was beschreibt der Begriff Attribut im Datenanalyse-Kontext am besten?",
        "options": [
          "Eine Eigenschaft eines Datenobjekts, zum Beispiel Name, Datum oder Status.",
          "Eine vollständige Anwendung mit Oberfläche.",
          "Eine beliebige Farbe im Layout.",
          "Eine Testart ohne Datenbezug."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 8,
        "topic": "003",
        "difficulty": "mittel",
        "text": "Welche Aussagen zu Datenobjekten und Attributen sind korrekt? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Datenobjekte können fachlich aus wiederkehrenden Informationsbereichen abgeleitet werden.",
          "Attribute beschreiben Eigenschaften eines Datenobjekts.",
          "Eine ID kann helfen, Datensätze eindeutig zuzuordnen.",
          "Attribute dürfen nie geprüft werden."
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 9,
        "topic": "003",
        "difficulty": "schwer",
        "text": "Warum sollten Datenobjekte vor dem eigentlichen Datenbankentwurf fachlich abgegrenzt werden?",
        "options": [
          "Damit klarer wird, welche Informationen zusammengehören und welche Beziehungen später geprüft werden müssen.",
          "Damit alle Daten in einer einzigen Spalte gespeichert werden können.",
          "Damit fachliche Regeln, Pflichtfelder und Verknüpfungen sichtbar werden.",
          "Damit die Implementierung ohne Anforderungen starten kann."
        ],
        "correct": [
          0,
          2
        ]
      },
      {
        "id": 10,
        "topic": "004",
        "difficulty": "leicht",
        "text": "Was beschreibt der Softwarelebenszyklus?",
        "options": [
          "Phasen eines Softwareprodukts von Idee und Analyse bis Betrieb, Wartung und Weiterentwicklung.",
          "Nur die Zeit, in der Code geschrieben wird.",
          "Nur die Installation eines Programms.",
          "Die Anzahl der Dateien in einem Projektordner."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 11,
        "topic": "004",
        "difficulty": "mittel",
        "text": "Welche Phasen gehören typischerweise zum Softwareentwicklungsprozess? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Anforderungsanalyse und Spezifikation",
          "Design beziehungsweise Entwurf",
          "Implementierung und Test",
          "Zufällige Nutzung ohne Planung"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 12,
        "topic": "004",
        "difficulty": "mittel",
        "text": "Welche Aufgabe hat die Analysephase?",
        "options": [
          "Ist-Zustand, Daten, Prozesse und Anforderungen erfassen.",
          "Nur die fertige Software verkaufen.",
          "Alle Tests dauerhaft vermeiden.",
          "Nur Farben und Icons auswählen."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 13,
        "topic": "004",
        "difficulty": "schwer",
        "text": "Eine Aussage lautet: <em>„Die Verwaltung soll einfacher werden.“</em> Warum ist das als Anforderung noch problematisch?",
        "options": [
          "Die Aussage ist zu ungenau und noch nicht gut prüfbar.",
          "Es fehlen konkrete Eingaben, Regeln, Ausgaben oder Akzeptanzkriterien.",
          "Die Aussage ist bereits eine vollständige technische Spezifikation.",
          "Sie sollte in messbare oder überprüfbare Anforderungen übersetzt werden."
        ],
        "correct": [
          0,
          1,
          3
        ]
      },
      {
        "id": 14,
        "topic": "005",
        "difficulty": "leicht",
        "text": "Was passiert in der Designphase einer Softwareentwicklung?",
        "options": [
          "Die spätere Lösung wird fachlich und technisch entworfen.",
          "Alle Anforderungen werden ignoriert.",
          "Die Software wird ohne Planung produktiv geschaltet.",
          "Nur Daten werden gelöscht."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 15,
        "topic": "005",
        "difficulty": "mittel",
        "text": "Welche Ergebnisse können in einer Designphase entstehen? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Ablaufmodell",
          "Datenmodell oder Datenobjektübersicht",
          "Schnittstellenbeschreibung",
          "Ungeprüfte Produktivdaten ohne Struktur"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 16,
        "topic": "005",
        "difficulty": "schwer",
        "text": "Warum sollte ein Ablaufmodell vor der Implementierung erstellt werden?",
        "options": [
          "Es macht Eingaben, Verarbeitungsschritte und Ausgaben nachvollziehbar.",
          "Es hilft, Fehler und Lücken vor dem Programmieren zu erkennen.",
          "Es ersetzt jede spätere Testdurchführung vollständig.",
          "Es kann als Brücke zwischen fachlicher Beschreibung und Code dienen."
        ],
        "correct": [
          0,
          1,
          3
        ]
      },
      {
        "id": 17,
        "topic": "006",
        "difficulty": "leicht",
        "text": "Welche Aufgabe hat Projektmanagement in einem Softwareprojekt?",
        "options": [
          "Planen, organisieren, überwachen, steuern und führen.",
          "Nur Quellcode farbig markieren.",
          "Alle Anforderungen ungeprüft übernehmen.",
          "Nur die fertige Rechnung drucken."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 18,
        "topic": "006",
        "difficulty": "mittel",
        "text": "Welche Faktoren stehen in Projekten häufig in einem Spannungsverhältnis?",
        "options": [
          "Umfang, Zeit, Kosten und Qualität",
          "Nur Schriftart und Symbolgröße",
          "Nur Dateiname und Bildschirmhelligkeit",
          "Ausschließlich Monitorgröße und Tastaturlayout"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 19,
        "topic": "006",
        "difficulty": "schwer",
        "text": "Welche Aussagen zu Projektrisiken sind korrekt? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Schlechte Kommunikation kann ein Projektrisiko sein.",
          "Unklare Anforderungen können Zeit- und Kostenprobleme verursachen.",
          "Risikomanagement ist nur bei fertiger Software sinnvoll.",
          "Änderungen am Umfang sollten bewertet und dokumentiert werden."
        ],
        "correct": [
          0,
          1,
          3
        ]
      },
      {
        "id": 20,
        "topic": "007",
        "difficulty": "leicht",
        "text": "Wofür steht PDCA im Deming-Zyklus?",
        "options": [
          "Plan · Do · Check · Act",
          "Program · Delete · Copy · Archive",
          "Prepare · Deploy · Cancel · Accept",
          "Print · Draw · Calculate · Add"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 21,
        "topic": "007",
        "difficulty": "mittel",
        "text": "Wie kann PDCA in einem Softwareprozess genutzt werden?",
        "options": [
          "Verbesserung planen, umsetzen, prüfen und daraus Anpassungen ableiten.",
          "Software ohne Rückmeldung einführen und nie wieder prüfen.",
          "Daten löschen, bevor sie analysiert wurden.",
          "Tests grundsätzlich vermeiden."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 22,
        "topic": "008",
        "difficulty": "mittel",
        "text": "Welche Aussagen zu klassischen und agilen Vorgehensmodellen sind korrekt? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Klassische Modelle planen stärker im Voraus.",
          "Agile Ansätze können flexibler auf Änderungen reagieren.",
          "Scrum ist ein agiler Ansatz.",
          "Vorgehensmodelle haben keinen Einfluss auf Zusammenarbeit und Planung."
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 23,
        "topic": "008",
        "difficulty": "schwer",
        "text": "Wann passt ein Wasserfallmodell eher gut?",
        "options": [
          "Wenn Anforderungen stabil, gut beschreibbar und Änderungen eher selten sind.",
          "Wenn Anforderungen täglich stark wechseln und kaum planbar sind.",
          "Wenn keine Dokumentation erwünscht ist.",
          "Wenn Tests grundsätzlich erst Jahre nach dem Betrieb stattfinden sollen."
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 24,
        "topic": "009",
        "difficulty": "mittel",
        "text": "Welche Werkzeuge unterstützen Softwareentwicklung sinnvoll? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "IDE oder Editor mit Syntaxhervorhebung",
          "Debugger zur Fehlersuche",
          "Versionsverwaltung zur Nachverfolgung von Änderungen",
          "Zufälliges Umbenennen aller Dateien ohne Dokumentation"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 25,
        "topic": "009",
        "difficulty": "schwer",
        "text": "Welche Aussage zu Programmiersprachen, Frameworks und Werkzeugen ist korrekt?",
        "options": [
          "Eine Programmiersprache liefert Syntax und Semantik; Frameworks und Werkzeuge unterstützen Struktur, Entwicklung und Wartung.",
          "Frameworks ersetzen immer jede Programmiersprache vollständig.",
          "Entwicklungswerkzeuge haben keinen Einfluss auf Testbarkeit und Wartbarkeit.",
          "Versionsverwaltung ist nur für Grafikdateien sinnvoll."
        ],
        "correct": [
          0
        ]
      }
    ],
    "topicLabels": {
      "001": "Datenanalyse und Inventarisierung",
      "002": "Datenqualität, Importprüfung und Migration",
      "003": "Datenobjekte, Attribute und Beziehungen",
      "004": "Softwarelebenszyklus und Prozessphasen",
      "005": "Designphase und Modellierung",
      "006": "Projektmanagement, Risiken und Steuerung",
      "007": "PDCA / kontinuierliche Verbesserung",
      "008": "Vorgehensmodelle: klassisch und agil",
      "009": "Programmiersprachen, Frameworks und Werkzeuge"
    },
    "difficultyLabels": {
      "leicht": "Grundbegriffe und direkte Wiedererkennung",
      "mittel": "Anwendung, Zuordnung und Transfer",
      "schwer": "Begründung, Fehleranalyse und typische Stolperstellen"
    }
  },
  {
    "id": "software_daten_kurztest_15",
    "area": "software",
    "name": "Software und Daten · Kurztest · 15 Fragen",
    "description": "15 Fragen zur Wiederholung von Softwareprozess, Datenanalyse, Design, Test, Projektmanagement, Vorgehensmodellen, Programmiersprachen und Werkzeugen. Zeitlimit: 20 Minuten.",
    "durationMinutes": 20,
    "timeLimitMinutes": 20,
    "questions": [
      {
        "id": 1,
        "topic": "K01",
        "difficulty": "leicht",
        "text": "Welches Ergebnis passt zu einer ersten Analysephase in einem Softwareprojekt?",
        "options": [
          "Eine fertige Produktivdatenbank",
          "Eine fachliche Übersicht über Daten, Prozesse, Ziele und offene Fragen",
          "Ein vollständiges Python-Programm",
          "Eine fertige Benutzeroberfläche"
        ],
        "correct": [
          1
        ]
      },
      {
        "id": 2,
        "topic": "K02",
        "difficulty": "leicht",
        "text": "Was beschreibt der Softwarelebenszyklus?",
        "options": [
          "Nur die Kostenplanung eines Projekts",
          "Die Phasen eines Softwareprodukts von Idee bis Betrieb und Wartung",
          "Nur die Programmiersprache",
          "Nur die Installation der Software"
        ],
        "correct": [
          1
        ]
      },
      {
        "id": 3,
        "topic": "K03",
        "difficulty": "mittel",
        "text": "Welche Tätigkeiten gehören typischerweise zur Analysephase? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Ist-Zustand erfassen",
          "Anforderungen beschreiben",
          "Daten und Geschäftsprozesse betrachten",
          "Produktivsystem ohne Prüfung ausrollen"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 4,
        "topic": "K04",
        "difficulty": "mittel",
        "text": "Warum werden in der Designphase Modelle genutzt?",
        "options": [
          "Um Quellcode vollständig zu ersetzen",
          "Um Daten, Abläufe, Schnittstellen und Tests verständlicher zu planen",
          "Um Projektmanagement unnötig zu machen",
          "Um Anforderungen nicht mehr prüfen zu müssen"
        ],
        "correct": [
          1
        ]
      },
      {
        "id": 5,
        "topic": "K05",
        "difficulty": "leicht",
        "text": "Welche drei Bereiche hängen nach Analyse und Design besonders eng zusammen?",
        "options": [
          "Implementierung, Test und Dokumentation",
          "Marketing, Einkauf und Vertrieb",
          "Installation, Werbung und Verkauf",
          "Zufall, Design und Archivierung"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 6,
        "topic": "K06",
        "difficulty": "mittel",
        "text": "Welche Aussage zu Auslieferung, Wartung und Support ist richtig?",
        "options": [
          "Software endet mit der ersten fertigen Version",
          "Nach der Auslieferung können Fehlerbehebung, Anpassungen und Unterstützung nötig sein",
          "Support gehört nie zum Softwareprozess",
          "Wartung bedeutet ausschließlich Hardwaretausch"
        ],
        "correct": [
          1
        ]
      },
      {
        "id": 7,
        "topic": "K07",
        "difficulty": "mittel",
        "text": "Welche Größen bilden im Projektmanagement häufig ein Spannungsfeld? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Umfang",
          "Zeit",
          "Kosten",
          "Dateiendung"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 8,
        "topic": "K08",
        "difficulty": "leicht",
        "text": "Wofür steht PDCA im Deming-Zyklus?",
        "options": [
          "Plan, Do, Check, Act",
          "Program, Design, Code, Archive",
          "Prepare, Delete, Copy, Add",
          "Plan, Develop, Compile, Analyze"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 9,
        "topic": "K09",
        "difficulty": "mittel",
        "text": "Welche Faktoren können Softwareprojekte gefährden? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Schlechte Kommunikation",
          "Unklare Ziele",
          "Mangelnde Überwachung",
          "Sinnvolle Risikoplanung"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 10,
        "topic": "K10",
        "difficulty": "mittel",
        "text": "Welche Aussage unterscheidet klassische und agile Vorgehensmodelle sinnvoll?",
        "options": [
          "Klassische Modelle planen tendenziell stärker im Voraus, agile Modelle reagieren flexibler auf Veränderungen",
          "Agile Modelle haben nie Kommunikation",
          "Klassische Modelle verbieten Dokumentation",
          "Alle Modelle sind immer gleich geeignet"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 11,
        "topic": "K11",
        "difficulty": "mittel",
        "text": "Was ist typisch für das Wasserfallmodell? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Lineare Phasenfolge",
          "Dokumentgetriebenes Vorgehen",
          "Sehr flexible Änderung in jedem Moment ohne Zusatzaufwand",
          "Phasenergebnisse dienen als Vorgabe für spätere Phasen"
        ],
        "correct": [
          0,
          1,
          3
        ]
      },
      {
        "id": 12,
        "topic": "K12",
        "difficulty": "schwer",
        "text": "Welche Aussage beschreibt das Spiralmodell am besten?",
        "options": [
          "Es wiederholt Zyklen und betrachtet Risiken systematisch",
          "Es besteht nur aus einem einzigen Schritt",
          "Es eignet sich nur für reine Textverarbeitung",
          "Es verbietet Reviews"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 13,
        "topic": "K13",
        "difficulty": "mittel",
        "text": "Was ist der Grundgedanke des V-Modells?",
        "options": [
          "Entwicklungs- und Spezifikationsschritte werden passenden Teststufen gegenübergestellt",
          "Es ersetzt alle Anforderungen durch Zufallstests",
          "Es ist ausschließlich ein Grafikformat",
          "Es beschreibt nur Marketingphasen"
        ],
        "correct": [
          0
        ]
      },
      {
        "id": 14,
        "topic": "K14",
        "difficulty": "mittel",
        "text": "Welche Rollen gehören zu Scrum? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Product Owner",
          "Scrum Master",
          "Entwicklungsteam",
          "Lenkungsausschuss als zwingende Scrum-Rolle"
        ],
        "correct": [
          0,
          1,
          2
        ]
      },
      {
        "id": 15,
        "topic": "K15",
        "difficulty": "schwer",
        "text": "Welche Aussagen zu Programmiersprachen und Werkzeugen sind richtig? <br><small>Mehrere Antworten möglich.</small>",
        "options": [
          "Eine IDE kann Editor, Debugger und Projektverwaltung bündeln",
          "Ein Compiler übersetzt Quelltext in ausführbare Form, ohne ihn direkt zeilenweise auszuführen",
          "Ein Debugger unterstützt die Fehlersuche",
          "Ein Framework ist immer eine fertige Endanwendung ohne Anpassungsmöglichkeit"
        ],
        "correct": [
          0,
          1,
          2
        ]
      }
    ],
    "topicLabels": {
      "K01": "Analyseergebnisse und fachliche Orientierung",
      "K02": "Softwarelebenszyklus und Prozessphasen",
      "K03": "Analysephase und Spezifikation",
      "K04": "Designphase und Modellierung",
      "K05": "Implementierung, Test und Dokumentation",
      "K06": "Auslieferung, Wartung und Support",
      "K07": "Projektmanagement im Softwareprojekt",
      "K08": "PDCA / Deming-Zyklus im Softwareprozess",
      "K09": "Erfolgs- und Risikofaktoren",
      "K10": "Vorgehensmodelle im Überblick",
      "K11": "Wasserfallmodell",
      "K12": "Spiralmodell",
      "K13": "V-Modell",
      "K14": "Scrum als agiler Ansatz",
      "K15": "Programmiersprachen, Frameworks und Werkzeuge"
    },
    "difficultyLabels": {
      "leicht": "Grundlagen und direkte Wiedererkennung",
      "mittel": "Einordnung und Transfer",
      "schwer": "Kombination, Abgrenzung und typische Prüfungsfallen"
    }
  },
  {
    "id": "lf05v2_sql_select_dragdrop_fitoffice_kontext",
    "area": "sql",
    "name": "LF05V2 SQL SELECT Drag & Drop · FitOffice mit Kontext",
    "description": "30 Drag-&-Drop-Aufgaben nur zu SELECT-Abfragen. Jede Aufgabe enthält einen kurzen FitOffice-Kontext und eine klare Gesucht-Beschreibung. Schwierigkeit: sehr leicht bis mittel.",
    "durationMinutes": 45,
    "timeLimitMinutes": 45,
    "topicLabels": {
      "select_basis": "SELECT · einfache Ausgabe und Zählen",
      "select_filter_sort": "SELECT · WHERE, ORDER BY, LIMIT",
      "select_joins": "SELECT · JOIN und LEFT JOIN"
    },
    "difficultyLabels": {
      "sehr leicht": "Sehr leicht",
      "leicht": "Leicht",
      "mittel": "Mittel"
    },
    "database": {
      "name": "fitoffice_lf05",
      "tables": [
        "mitglied",
        "trainer",
        "raum",
        "kategorie",
        "kurs",
        "kurstermin",
        "buchung",
        "zahlung"
      ],
      "note": "Passender Import: fitoffice_relationales_datenmodell_mysql_import.sql"
    },
    "questions": [
      {
        "id": "SQL-SELECT-01",
        "type": "sql-order",
        "topic": "select_basis",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Die Kursverwaltung möchte einen kurzen Überblick, welche Kursbereiche FitOffice anbietet.<br><strong>Gesucht:</strong> Gib aus der Tabelle <code>kategorie</code> nur <code>name</code> und <code>beschreibung</code> aus. Es gibt keine Begrenzung der Anzahl.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-01-X01",
            "text": "WHERE aktiv = TRUE"
          },
          {
            "id": "SQL-SELECT-01-R01",
            "text": "SELECT name, beschreibung"
          },
          {
            "id": "SQL-SELECT-01-R02",
            "text": "FROM kategorie"
          },
          {
            "id": "SQL-SELECT-01-X02",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-01-X03",
            "text": "LIMIT 5"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-01-R01",
          "SQL-SELECT-01-R02"
        ],
        "solutionSql": "SELECT name, beschreibung\nFROM kategorie;"
      },
      {
        "id": "SQL-SELECT-02",
        "type": "sql-order",
        "topic": "select_basis",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Für eine Preisliste sollen alle vorhandenen Kurse als einfache Tabelle angezeigt werden.<br><strong>Gesucht:</strong> Zeige <code>kurs_nr</code>, <code>titel</code>, <code>preis</code> und <code>dauer_minuten</code> aus <code>kurs</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-02-X02",
            "text": "JOIN trainer t ON k.trainer_id = t.trainer_id"
          },
          {
            "id": "SQL-SELECT-02-R01",
            "text": "SELECT kurs_nr, titel, preis, dauer_minuten"
          },
          {
            "id": "SQL-SELECT-02-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-02-X01",
            "text": "WHERE status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-02-X03",
            "text": "LIMIT 10"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-02-R01",
          "SQL-SELECT-02-R02"
        ],
        "solutionSql": "SELECT kurs_nr, titel, preis, dauer_minuten\nFROM kurs;"
      },
      {
        "id": "SQL-SELECT-03",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Der Empfang braucht eine Liste aller Mitglieder, die aktuell aktiv sind.<br><strong>Gesucht:</strong> Zeige <code>kunden_nr</code>, <code>vorname</code>, <code>nachname</code> und <code>ort</code> aus <code>mitglied</code>, aber nur mit <code>status = 'aktiv'</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-03-R01",
            "text": "SELECT kunden_nr, vorname, nachname, ort"
          },
          {
            "id": "SQL-SELECT-03-R03",
            "text": "WHERE status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-03-X01",
            "text": "WHERE aktiv = TRUE"
          },
          {
            "id": "SQL-SELECT-03-R02",
            "text": "FROM mitglied"
          },
          {
            "id": "SQL-SELECT-03-X02",
            "text": "ORDER BY startzeit DESC"
          },
          {
            "id": "SQL-SELECT-03-X03",
            "text": "LIMIT 5"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-03-R01",
          "SQL-SELECT-03-R02",
          "SQL-SELECT-03-R03"
        ],
        "solutionSql": "SELECT kunden_nr, vorname, nachname, ort\nFROM mitglied\nWHERE status = 'aktiv';"
      },
      {
        "id": "SQL-SELECT-04",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Für die Raumplanung sollen die größten Räume zuerst sichtbar sein.<br><strong>Gesucht:</strong> Zeige <code>bezeichnung</code>, <code>standort</code> und <code>kapazitaet</code> aus <code>raum</code>, absteigend nach Kapazität sortiert.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-04-R01",
            "text": "SELECT bezeichnung, standort, kapazitaet"
          },
          {
            "id": "SQL-SELECT-04-R03",
            "text": "ORDER BY kapazitaet DESC"
          },
          {
            "id": "SQL-SELECT-04-X02",
            "text": "ORDER BY kapazitaet ASC"
          },
          {
            "id": "SQL-SELECT-04-X01",
            "text": "WHERE status = 'geplant'"
          },
          {
            "id": "SQL-SELECT-04-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-04-R02",
            "text": "FROM raum"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-04-R01",
          "SQL-SELECT-04-R02",
          "SQL-SELECT-04-R03"
        ],
        "solutionSql": "SELECT bezeichnung, standort, kapazitaet\nFROM raum\nORDER BY kapazitaet DESC;"
      },
      {
        "id": "SQL-SELECT-05",
        "type": "sql-order",
        "topic": "select_basis",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Die Verwaltung möchte nur wissen, wie viele Mitglieder aktuell in der Tabelle gespeichert sind.<br><strong>Gesucht:</strong> Zähle alle Datensätze in <code>mitglied</code> und nenne die Ergebnisspalte <code>anzahl_mitglieder</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-05-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-05-X02",
            "text": "WHERE status = 'offen'"
          },
          {
            "id": "SQL-SELECT-05-X01",
            "text": "SELECT DISTINCT ort"
          },
          {
            "id": "SQL-SELECT-05-R01",
            "text": "SELECT COUNT(*) AS anzahl_mitglieder"
          },
          {
            "id": "SQL-SELECT-05-R02",
            "text": "FROM mitglied"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-05-R01",
          "SQL-SELECT-05-R02"
        ],
        "solutionSql": "SELECT COUNT(*) AS anzahl_mitglieder\nFROM mitglied;"
      },
      {
        "id": "SQL-SELECT-06",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Für eine regionale Auswertung werden nur die verschiedenen Wohnorte benötigt.<br><strong>Gesucht:</strong> Zeige jeden Ort aus <code>mitglied</code> nur einmal und sortiere alphabetisch nach <code>ort</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-06-R03",
            "text": "ORDER BY ort"
          },
          {
            "id": "SQL-SELECT-06-X02",
            "text": "WHERE status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-06-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-06-R02",
            "text": "FROM mitglied"
          },
          {
            "id": "SQL-SELECT-06-X01",
            "text": "SELECT ort"
          },
          {
            "id": "SQL-SELECT-06-R01",
            "text": "SELECT DISTINCT ort"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-06-R01",
          "SQL-SELECT-06-R02",
          "SQL-SELECT-06-R03"
        ],
        "solutionSql": "SELECT DISTINCT ort\nFROM mitglied\nORDER BY ort;"
      },
      {
        "id": "SQL-SELECT-07",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "sehr leicht",
        "text": "<strong>Kontext:</strong> Für die Dozentenplanung werden nur aktive Trainerinnen und Trainer benötigt.<br><strong>Gesucht:</strong> Zeige <code>vorname</code>, <code>nachname</code> und <code>fachgebiet</code> aus <code>trainer</code>, nur wenn <code>aktiv = TRUE</code>, sortiert nach Nachname.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-07-X02",
            "text": "ORDER BY startzeit"
          },
          {
            "id": "SQL-SELECT-07-R01",
            "text": "SELECT vorname, nachname, fachgebiet"
          },
          {
            "id": "SQL-SELECT-07-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-07-R02",
            "text": "FROM trainer"
          },
          {
            "id": "SQL-SELECT-07-R03",
            "text": "WHERE aktiv = TRUE"
          },
          {
            "id": "SQL-SELECT-07-R04",
            "text": "ORDER BY nachname"
          },
          {
            "id": "SQL-SELECT-07-X01",
            "text": "WHERE status = 'aktiv'"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-07-R01",
          "SQL-SELECT-07-R02",
          "SQL-SELECT-07-R03",
          "SQL-SELECT-07-R04"
        ],
        "solutionSql": "SELECT vorname, nachname, fachgebiet\nFROM trainer\nWHERE aktiv = TRUE\nORDER BY nachname;"
      },
      {
        "id": "SQL-SELECT-08",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Eine Teilnehmerin fragt nach Kursen, die ausdrücklich etwas mit Büroarbeit zu tun haben.<br><strong>Gesucht:</strong> Suche in <code>kurs</code> alle Kurse, deren <code>titel</code> das Wort <code>Büro</code> enthält.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-08-R01",
            "text": "SELECT kurs_nr, titel"
          },
          {
            "id": "SQL-SELECT-08-X02",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-08-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-08-R03",
            "text": "WHERE titel LIKE '%Büro%'"
          },
          {
            "id": "SQL-SELECT-08-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-08-X01",
            "text": "WHERE titel = 'Büro'"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-08-R01",
          "SQL-SELECT-08-R02",
          "SQL-SELECT-08-R03"
        ],
        "solutionSql": "SELECT kurs_nr, titel\nFROM kurs\nWHERE titel LIKE '%Büro%';"
      },
      {
        "id": "SQL-SELECT-09",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für eine günstige Einstiegsliste sollen preiswerte Kurse gefunden werden.<br><strong>Gesucht:</strong> Zeige <code>kurs_nr</code>, <code>titel</code> und <code>preis</code> aus <code>kurs</code>, wenn der Preis unter 80 Euro liegt; günstigster Kurs zuerst.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-09-R01",
            "text": "SELECT kurs_nr, titel, preis"
          },
          {
            "id": "SQL-SELECT-09-R04",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-09-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-09-R03",
            "text": "WHERE preis < 80.00"
          },
          {
            "id": "SQL-SELECT-09-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-09-X01",
            "text": "WHERE preis > 80.00"
          },
          {
            "id": "SQL-SELECT-09-X02",
            "text": "ORDER BY preis DESC"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-09-R01",
          "SQL-SELECT-09-R02",
          "SQL-SELECT-09-R03",
          "SQL-SELECT-09-R04"
        ],
        "solutionSql": "SELECT kurs_nr, titel, preis\nFROM kurs\nWHERE preis < 80.00\nORDER BY preis ASC;"
      },
      {
        "id": "SQL-SELECT-10",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Die Kursleitung sucht längere Formate, weil diese anders geplant werden müssen.<br><strong>Gesucht:</strong> Zeige alle Kurse aus <code>kurs</code>, die länger als 60 Minuten dauern.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-10-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-10-R03",
            "text": "WHERE dauer_minuten > 60"
          },
          {
            "id": "SQL-SELECT-10-X01",
            "text": "WHERE dauer_minuten < 60"
          },
          {
            "id": "SQL-SELECT-10-X02",
            "text": "ORDER BY kapazitaet DESC"
          },
          {
            "id": "SQL-SELECT-10-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-10-R01",
            "text": "SELECT kurs_nr, titel, dauer_minuten"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-10-R01",
          "SQL-SELECT-10-R02",
          "SQL-SELECT-10-R03"
        ],
        "solutionSql": "SELECT kurs_nr, titel, dauer_minuten\nFROM kurs\nWHERE dauer_minuten > 60;"
      },
      {
        "id": "SQL-SELECT-11",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für die Nachbearbeitung sollen problematische Buchungsfälle gesammelt werden.<br><strong>Gesucht:</strong> Zeige Buchungen aus <code>buchung</code>, deren Status entweder <code>warteliste</code> oder <code>storniert</code> ist.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-11-R03",
            "text": "WHERE status IN ('warteliste', 'storniert')"
          },
          {
            "id": "SQL-SELECT-11-R02",
            "text": "FROM buchung"
          },
          {
            "id": "SQL-SELECT-11-X01",
            "text": "WHERE status = 'gebucht'"
          },
          {
            "id": "SQL-SELECT-11-R01",
            "text": "SELECT buchung_id, mitglied_id, termin_id, status"
          },
          {
            "id": "SQL-SELECT-11-X02",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-11-X03",
            "text": "LIMIT 5"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-11-R01",
          "SQL-SELECT-11-R02",
          "SQL-SELECT-11-R03"
        ],
        "solutionSql": "SELECT buchung_id, mitglied_id, termin_id, status\nFROM buchung\nWHERE status IN ('warteliste', 'storniert');"
      },
      {
        "id": "SQL-SELECT-12",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Die Buchhaltung braucht eine Liste der noch nicht bezahlten Rechnungen.<br><strong>Gesucht:</strong> Zeige offene Zahlungen aus <code>zahlung</code> mit <code>zahlung_id</code>, <code>betrag</code>, <code>zahlungsart</code> und <code>referenz</code>; höchster Betrag zuerst.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-12-R02",
            "text": "FROM zahlung"
          },
          {
            "id": "SQL-SELECT-12-X01",
            "text": "WHERE status = 'bezahlt'"
          },
          {
            "id": "SQL-SELECT-12-R03",
            "text": "WHERE status = 'offen'"
          },
          {
            "id": "SQL-SELECT-12-X02",
            "text": "ORDER BY zahlungsdatum ASC"
          },
          {
            "id": "SQL-SELECT-12-R01",
            "text": "SELECT zahlung_id, betrag, zahlungsart, referenz"
          },
          {
            "id": "SQL-SELECT-12-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-12-R04",
            "text": "ORDER BY betrag DESC"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-12-R01",
          "SQL-SELECT-12-R02",
          "SQL-SELECT-12-R03",
          "SQL-SELECT-12-R04"
        ],
        "solutionSql": "SELECT zahlung_id, betrag, zahlungsart, referenz\nFROM zahlung\nWHERE status = 'offen'\nORDER BY betrag DESC;"
      },
      {
        "id": "SQL-SELECT-13",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Der Empfang möchte Mitglieder ohne hinterlegte Telefonnummer nachpflegen.<br><strong>Gesucht:</strong> Zeige Mitglieder aus <code>mitglied</code>, bei denen <code>telefon</code> leer beziehungsweise <code>NULL</code> ist.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-13-R01",
            "text": "SELECT kunden_nr, vorname, nachname, telefon"
          },
          {
            "id": "SQL-SELECT-13-R03",
            "text": "WHERE telefon IS NULL"
          },
          {
            "id": "SQL-SELECT-13-R02",
            "text": "FROM mitglied"
          },
          {
            "id": "SQL-SELECT-13-X02",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-13-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-13-X01",
            "text": "WHERE telefon = ''"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-13-R01",
          "SQL-SELECT-13-R02",
          "SQL-SELECT-13-R03"
        ],
        "solutionSql": "SELECT kunden_nr, vorname, nachname, telefon\nFROM mitglied\nWHERE telefon IS NULL;"
      },
      {
        "id": "SQL-SELECT-14",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für den Monatsplan Juni 2026 sollen alle Kurstermine chronologisch angezeigt werden.<br><strong>Gesucht:</strong> Zeige Kurstermine aus <code>kurstermin</code>, deren <code>startzeit</code> im Juni 2026 liegt, sortiert nach Startzeit.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-14-R03",
            "text": "WHERE startzeit >= '2026-06-01' AND startzeit < '2026-07-01'"
          },
          {
            "id": "SQL-SELECT-14-X02",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-14-R04",
            "text": "ORDER BY startzeit"
          },
          {
            "id": "SQL-SELECT-14-R01",
            "text": "SELECT termin_id, kurs_id, startzeit, endzeit, status"
          },
          {
            "id": "SQL-SELECT-14-R02",
            "text": "FROM kurstermin"
          },
          {
            "id": "SQL-SELECT-14-X01",
            "text": "WHERE startzeit = '2026-06-01'"
          },
          {
            "id": "SQL-SELECT-14-X03",
            "text": "LIMIT 5"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-14-R01",
          "SQL-SELECT-14-R02",
          "SQL-SELECT-14-R03",
          "SQL-SELECT-14-R04"
        ],
        "solutionSql": "SELECT termin_id, kurs_id, startzeit, endzeit, status\nFROM kurstermin\nWHERE startzeit >= '2026-06-01' AND startzeit < '2026-07-01'\nORDER BY startzeit;"
      },
      {
        "id": "SQL-SELECT-15",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für eine kleine Werbeaktion sollen genau die drei günstigsten aktiven Kurse genannt werden.<br><strong>Gesucht:</strong> Zeige die 3 günstigsten aktiven Kurse aus <code>kurs</code> mit <code>kurs_nr</code>, <code>titel</code> und <code>preis</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-15-X03",
            "text": "WHERE status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-15-X01",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-15-R04",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-15-X02",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-15-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-15-R03",
            "text": "WHERE aktiv = TRUE"
          },
          {
            "id": "SQL-SELECT-15-R05",
            "text": "LIMIT 3"
          },
          {
            "id": "SQL-SELECT-15-R01",
            "text": "SELECT kurs_nr, titel, preis"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-15-R01",
          "SQL-SELECT-15-R02",
          "SQL-SELECT-15-R03",
          "SQL-SELECT-15-R04",
          "SQL-SELECT-15-R05"
        ],
        "solutionSql": "SELECT kurs_nr, titel, preis\nFROM kurs\nWHERE aktiv = TRUE\nORDER BY preis ASC\nLIMIT 3;"
      },
      {
        "id": "SQL-SELECT-16",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Die Geschäftsführung möchte eine kompakte Übersicht der hochpreisigen Angebote sehen. Dafür reichen exakt fünf Einträge.<br><strong>Gesucht:</strong> Zeige die 5 teuersten aktiven Kurse aus <code>kurs</code> mit <code>kurs_nr</code>, <code>titel</code> und <code>preis</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-16-X01",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-16-R01",
            "text": "SELECT kurs_nr, titel, preis"
          },
          {
            "id": "SQL-SELECT-16-R03",
            "text": "WHERE aktiv = TRUE"
          },
          {
            "id": "SQL-SELECT-16-X03",
            "text": "WHERE status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-16-R05",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-16-R04",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-16-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-16-X02",
            "text": "LIMIT 10"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-16-R01",
          "SQL-SELECT-16-R02",
          "SQL-SELECT-16-R03",
          "SQL-SELECT-16-R04",
          "SQL-SELECT-16-R05"
        ],
        "solutionSql": "SELECT kurs_nr, titel, preis\nFROM kurs\nWHERE aktiv = TRUE\nORDER BY preis DESC\nLIMIT 5;"
      },
      {
        "id": "SQL-SELECT-17",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Im Kurskatalog soll nicht nur die Kategorie-ID stehen, sondern der verständliche Kategoriename.<br><strong>Gesucht:</strong> Zeige Kursnummer, Kurstitel und Kategoriename aller Kurse. Nutze <code>kurs</code> und <code>kategorie</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-17-R03",
            "text": "JOIN kategorie ka ON k.kategorie_id = ka.kategorie_id"
          },
          {
            "id": "SQL-SELECT-17-R02",
            "text": "FROM kurs k"
          },
          {
            "id": "SQL-SELECT-17-X02",
            "text": "WHERE z.status = 'offen'"
          },
          {
            "id": "SQL-SELECT-17-R01",
            "text": "SELECT k.kurs_nr, k.titel, ka.name AS kategorie"
          },
          {
            "id": "SQL-SELECT-17-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-17-X01",
            "text": "JOIN trainer t ON k.trainer_id = t.trainer_id"
          },
          {
            "id": "SQL-SELECT-17-R04",
            "text": "ORDER BY ka.name, k.titel"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-17-R01",
          "SQL-SELECT-17-R02",
          "SQL-SELECT-17-R03",
          "SQL-SELECT-17-R04"
        ],
        "solutionSql": "SELECT k.kurs_nr, k.titel, ka.name AS kategorie\nFROM kurs k\nJOIN kategorie ka ON k.kategorie_id = ka.kategorie_id\nORDER BY ka.name, k.titel;"
      },
      {
        "id": "SQL-SELECT-18",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Kurskoordination möchte für jeden Termin direkt sehen, welcher Kurs, welcher Trainer und welcher Raum betroffen ist.<br><strong>Gesucht:</strong> Zeige Termin-ID, Kurstitel, Trainername, Raum und Startzeit. Nutze <code>kurstermin</code>, <code>kurs</code>, <code>trainer</code> und <code>raum</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-18-R03",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-18-R06",
            "text": "ORDER BY kt.startzeit"
          },
          {
            "id": "SQL-SELECT-18-X02",
            "text": "WHERE m.status = 'aktiv'"
          },
          {
            "id": "SQL-SELECT-18-R04",
            "text": "JOIN trainer t ON kt.trainer_id = t.trainer_id"
          },
          {
            "id": "SQL-SELECT-18-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-18-R05",
            "text": "JOIN raum r ON kt.raum_id = r.raum_id"
          },
          {
            "id": "SQL-SELECT-18-X01",
            "text": "LEFT JOIN zahlung z ON z.mitglied_id = kt.termin_id"
          },
          {
            "id": "SQL-SELECT-18-R02",
            "text": "FROM kurstermin kt"
          },
          {
            "id": "SQL-SELECT-18-R01",
            "text": "SELECT kt.termin_id, k.titel AS kurs, CONCAT(t.vorname, ' ', t.nachname) AS trainer, r.bezeichnung AS raum, kt.startzeit"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-18-R01",
          "SQL-SELECT-18-R02",
          "SQL-SELECT-18-R03",
          "SQL-SELECT-18-R04",
          "SQL-SELECT-18-R05",
          "SQL-SELECT-18-R06"
        ],
        "solutionSql": "SELECT kt.termin_id, k.titel AS kurs, CONCAT(t.vorname, ' ', t.nachname) AS trainer, r.bezeichnung AS raum, kt.startzeit\nFROM kurstermin kt\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nJOIN trainer t ON kt.trainer_id = t.trainer_id\nJOIN raum r ON kt.raum_id = r.raum_id\nORDER BY kt.startzeit;"
      },
      {
        "id": "SQL-SELECT-19",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Der Empfang möchte Buchungen zusammen mit dem Namen des Mitglieds sehen, statt nur IDs.<br><strong>Gesucht:</strong> Zeige <code>buchung_id</code>, <code>kunden_nr</code>, Mitgliedsname und Buchungsstatus. Nutze <code>buchung</code> und <code>mitglied</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-19-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-19-X02",
            "text": "WHERE z.status = 'offen'"
          },
          {
            "id": "SQL-SELECT-19-R03",
            "text": "JOIN mitglied m ON b.mitglied_id = m.mitglied_id"
          },
          {
            "id": "SQL-SELECT-19-R04",
            "text": "ORDER BY b.buchung_id"
          },
          {
            "id": "SQL-SELECT-19-R02",
            "text": "FROM buchung b"
          },
          {
            "id": "SQL-SELECT-19-X01",
            "text": "JOIN kurs k ON b.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-19-R01",
            "text": "SELECT b.buchung_id, m.kunden_nr, CONCAT(m.vorname, ' ', m.nachname) AS mitglied, b.status"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-19-R01",
          "SQL-SELECT-19-R02",
          "SQL-SELECT-19-R03",
          "SQL-SELECT-19-R04"
        ],
        "solutionSql": "SELECT b.buchung_id, m.kunden_nr, CONCAT(m.vorname, ' ', m.nachname) AS mitglied, b.status\nFROM buchung b\nJOIN mitglied m ON b.mitglied_id = m.mitglied_id\nORDER BY b.buchung_id;"
      },
      {
        "id": "SQL-SELECT-20",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Für Rückfragen zu Buchungen muss erkennbar sein, zu welchem Kurs und Termin eine Buchung gehört.<br><strong>Gesucht:</strong> Zeige Buchungs-ID, Kurstitel, Startzeit und Buchungsstatus. Nutze <code>buchung</code>, <code>kurstermin</code> und <code>kurs</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-20-R01",
            "text": "SELECT b.buchung_id, k.titel AS kurs, kt.startzeit, b.status"
          },
          {
            "id": "SQL-SELECT-20-R03",
            "text": "JOIN kurstermin kt ON b.termin_id = kt.termin_id"
          },
          {
            "id": "SQL-SELECT-20-R02",
            "text": "FROM buchung b"
          },
          {
            "id": "SQL-SELECT-20-X01",
            "text": "JOIN zahlung z ON b.mitglied_id = z.mitglied_id"
          },
          {
            "id": "SQL-SELECT-20-X02",
            "text": "WHERE m.ort = 'Köln'"
          },
          {
            "id": "SQL-SELECT-20-R04",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-20-R05",
            "text": "ORDER BY kt.startzeit, b.buchung_id"
          },
          {
            "id": "SQL-SELECT-20-X03",
            "text": "LIMIT 10"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-20-R01",
          "SQL-SELECT-20-R02",
          "SQL-SELECT-20-R03",
          "SQL-SELECT-20-R04",
          "SQL-SELECT-20-R05"
        ],
        "solutionSql": "SELECT b.buchung_id, k.titel AS kurs, kt.startzeit, b.status\nFROM buchung b\nJOIN kurstermin kt ON b.termin_id = kt.termin_id\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nORDER BY kt.startzeit, b.buchung_id;"
      },
      {
        "id": "SQL-SELECT-21",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Verwaltung prüft Buchungen und möchte sehen, ob zu jeder Buchung Zahlungsinformationen vorhanden sind.<br><strong>Gesucht:</strong> Zeige Buchungs-ID, Buchungsstatus, Zahlungsstatus und Betrag. Buchungen ohne Zahlung sollen trotzdem erscheinen.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-21-R01",
            "text": "SELECT b.buchung_id, b.status AS buchungsstatus, z.status AS zahlungsstatus, z.betrag"
          },
          {
            "id": "SQL-SELECT-21-R04",
            "text": "ORDER BY b.buchung_id"
          },
          {
            "id": "SQL-SELECT-21-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-21-R03",
            "text": "LEFT JOIN zahlung z ON b.buchung_id = z.buchung_id"
          },
          {
            "id": "SQL-SELECT-21-X01",
            "text": "JOIN zahlung z ON z.mitglied_id = b.mitglied_id"
          },
          {
            "id": "SQL-SELECT-21-X02",
            "text": "WHERE z.status = 'bezahlt'"
          },
          {
            "id": "SQL-SELECT-21-R02",
            "text": "FROM buchung b"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-21-R01",
          "SQL-SELECT-21-R02",
          "SQL-SELECT-21-R03",
          "SQL-SELECT-21-R04"
        ],
        "solutionSql": "SELECT b.buchung_id, b.status AS buchungsstatus, z.status AS zahlungsstatus, z.betrag\nFROM buchung b\nLEFT JOIN zahlung z ON b.buchung_id = z.buchung_id\nORDER BY b.buchung_id;"
      },
      {
        "id": "SQL-SELECT-22",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Buchhaltung will gezielt nur offene oder teilbezahlte Fälle mit Mitglied und Kurs sehen.<br><strong>Gesucht:</strong> Zeige Mitgliedsname, Kurstitel, Zahlungsstatus und Betrag für Zahlungen mit <code>offen</code> oder <code>teilbezahlt</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-22-R03",
            "text": "JOIN buchung b ON z.buchung_id = b.buchung_id"
          },
          {
            "id": "SQL-SELECT-22-R04",
            "text": "JOIN mitglied m ON b.mitglied_id = m.mitglied_id"
          },
          {
            "id": "SQL-SELECT-22-X02",
            "text": "LEFT JOIN raum r ON r.raum_id = m.mitglied_id"
          },
          {
            "id": "SQL-SELECT-22-R06",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-22-X01",
            "text": "WHERE b.status = 'storniert'"
          },
          {
            "id": "SQL-SELECT-22-R01",
            "text": "SELECT CONCAT(m.vorname, ' ', m.nachname) AS mitglied, k.titel AS kurs, z.status AS zahlungsstatus, z.betrag"
          },
          {
            "id": "SQL-SELECT-22-R02",
            "text": "FROM zahlung z"
          },
          {
            "id": "SQL-SELECT-22-R05",
            "text": "JOIN kurstermin kt ON b.termin_id = kt.termin_id"
          },
          {
            "id": "SQL-SELECT-22-R08",
            "text": "ORDER BY mitglied"
          },
          {
            "id": "SQL-SELECT-22-X03",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-22-R07",
            "text": "WHERE z.status IN ('offen', 'teilbezahlt')"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-22-R01",
          "SQL-SELECT-22-R02",
          "SQL-SELECT-22-R03",
          "SQL-SELECT-22-R04",
          "SQL-SELECT-22-R05",
          "SQL-SELECT-22-R06",
          "SQL-SELECT-22-R07",
          "SQL-SELECT-22-R08"
        ],
        "solutionSql": "SELECT CONCAT(m.vorname, ' ', m.nachname) AS mitglied, k.titel AS kurs, z.status AS zahlungsstatus, z.betrag\nFROM zahlung z\nJOIN buchung b ON z.buchung_id = b.buchung_id\nJOIN mitglied m ON b.mitglied_id = m.mitglied_id\nJOIN kurstermin kt ON b.termin_id = kt.termin_id\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nWHERE z.status IN ('offen', 'teilbezahlt')\nORDER BY mitglied;"
      },
      {
        "id": "SQL-SELECT-23",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Für den Aushang sollen nur geplante Termine mit gut lesbaren Kurs-, Kategorie-, Trainer- und Raumangaben erscheinen.<br><strong>Gesucht:</strong> Zeige geplante Kurstermine mit Kurs, Kategorie, Trainer, Raum und Startzeit.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-23-R06",
            "text": "JOIN raum r ON kt.raum_id = r.raum_id"
          },
          {
            "id": "SQL-SELECT-23-R03",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-23-R01",
            "text": "SELECT k.titel AS kurs, ka.name AS kategorie, CONCAT(t.vorname, ' ', t.nachname) AS trainer, r.bezeichnung AS raum, kt.startzeit"
          },
          {
            "id": "SQL-SELECT-23-X03",
            "text": "ORDER BY k.preis DESC"
          },
          {
            "id": "SQL-SELECT-23-R04",
            "text": "JOIN kategorie ka ON k.kategorie_id = ka.kategorie_id"
          },
          {
            "id": "SQL-SELECT-23-R07",
            "text": "WHERE kt.status = 'geplant'"
          },
          {
            "id": "SQL-SELECT-23-X02",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-23-R02",
            "text": "FROM kurstermin kt"
          },
          {
            "id": "SQL-SELECT-23-R08",
            "text": "ORDER BY kt.startzeit"
          },
          {
            "id": "SQL-SELECT-23-X01",
            "text": "WHERE b.status = 'gebucht'"
          },
          {
            "id": "SQL-SELECT-23-R05",
            "text": "JOIN trainer t ON kt.trainer_id = t.trainer_id"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-23-R01",
          "SQL-SELECT-23-R02",
          "SQL-SELECT-23-R03",
          "SQL-SELECT-23-R04",
          "SQL-SELECT-23-R05",
          "SQL-SELECT-23-R06",
          "SQL-SELECT-23-R07",
          "SQL-SELECT-23-R08"
        ],
        "solutionSql": "SELECT k.titel AS kurs, ka.name AS kategorie, CONCAT(t.vorname, ' ', t.nachname) AS trainer, r.bezeichnung AS raum, kt.startzeit\nFROM kurstermin kt\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nJOIN kategorie ka ON k.kategorie_id = ka.kategorie_id\nJOIN trainer t ON kt.trainer_id = t.trainer_id\nJOIN raum r ON kt.raum_id = r.raum_id\nWHERE kt.status = 'geplant'\nORDER BY kt.startzeit;"
      },
      {
        "id": "SQL-SELECT-24",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Standortleitung möchte alle Räume prüfen, auch wenn für einen Raum noch kein Termin eingetragen wurde.<br><strong>Gesucht:</strong> Zeige alle Räume und, falls vorhanden, deren Termine. Räume ohne Termin sollen ebenfalls im Ergebnis stehen.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-24-X01",
            "text": "JOIN kurstermin kt ON r.raum_id = kt.raum_id"
          },
          {
            "id": "SQL-SELECT-24-X02",
            "text": "WHERE kt.status = 'abgesagt'"
          },
          {
            "id": "SQL-SELECT-24-R01",
            "text": "SELECT r.bezeichnung, r.standort, kt.termin_id, kt.startzeit"
          },
          {
            "id": "SQL-SELECT-24-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-24-R02",
            "text": "FROM raum r"
          },
          {
            "id": "SQL-SELECT-24-R04",
            "text": "ORDER BY r.bezeichnung, kt.startzeit"
          },
          {
            "id": "SQL-SELECT-24-R03",
            "text": "LEFT JOIN kurstermin kt ON r.raum_id = kt.raum_id"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-24-R01",
          "SQL-SELECT-24-R02",
          "SQL-SELECT-24-R03",
          "SQL-SELECT-24-R04"
        ],
        "solutionSql": "SELECT r.bezeichnung, r.standort, kt.termin_id, kt.startzeit\nFROM raum r\nLEFT JOIN kurstermin kt ON r.raum_id = kt.raum_id\nORDER BY r.bezeichnung, kt.startzeit;"
      },
      {
        "id": "SQL-SELECT-25",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Eine Kundin fragt nach allen geplanten Terminen für den Kurs Yoga Basics.<br><strong>Gesucht:</strong> Zeige Termin-ID, Kurstitel, Startzeit und Raum für geplante Termine von <code>Yoga Basics</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-25-R01",
            "text": "SELECT kt.termin_id, k.titel AS kurs, kt.startzeit, r.bezeichnung AS raum"
          },
          {
            "id": "SQL-SELECT-25-R02",
            "text": "FROM kurstermin kt"
          },
          {
            "id": "SQL-SELECT-25-X03",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-25-X01",
            "text": "WHERE k.titel LIKE '%Büro%'"
          },
          {
            "id": "SQL-SELECT-25-R03",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-25-R06",
            "text": "ORDER BY kt.startzeit"
          },
          {
            "id": "SQL-SELECT-25-R05",
            "text": "WHERE k.titel = 'Yoga Basics' AND kt.status = 'geplant'"
          },
          {
            "id": "SQL-SELECT-25-X02",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-25-R04",
            "text": "JOIN raum r ON kt.raum_id = r.raum_id"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-25-R01",
          "SQL-SELECT-25-R02",
          "SQL-SELECT-25-R03",
          "SQL-SELECT-25-R04",
          "SQL-SELECT-25-R05",
          "SQL-SELECT-25-R06"
        ],
        "solutionSql": "SELECT kt.termin_id, k.titel AS kurs, kt.startzeit, r.bezeichnung AS raum\nFROM kurstermin kt\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nJOIN raum r ON kt.raum_id = r.raum_id\nWHERE k.titel = 'Yoga Basics' AND kt.status = 'geplant'\nORDER BY kt.startzeit;"
      },
      {
        "id": "SQL-SELECT-26",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für einen kurzen Telefonlauf sollen nur die ersten fünf aktiven Mitglieder aus Köln ausgegeben werden, alphabetisch nach Nachname.<br><strong>Gesucht:</strong> Zeige genau 5 aktive Kölner Mitglieder mit <code>kunden_nr</code>, <code>vorname</code>, <code>nachname</code> und <code>ort</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-26-R01",
            "text": "SELECT kunden_nr, vorname, nachname, ort"
          },
          {
            "id": "SQL-SELECT-26-R03",
            "text": "WHERE status = 'aktiv' AND ort = 'Köln'"
          },
          {
            "id": "SQL-SELECT-26-R04",
            "text": "ORDER BY nachname, vorname"
          },
          {
            "id": "SQL-SELECT-26-X02",
            "text": "ORDER BY preis DESC"
          },
          {
            "id": "SQL-SELECT-26-X01",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-26-R02",
            "text": "FROM mitglied"
          },
          {
            "id": "SQL-SELECT-26-R05",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-26-X03",
            "text": "WHERE ort = 'Bonn'"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-26-R01",
          "SQL-SELECT-26-R02",
          "SQL-SELECT-26-R03",
          "SQL-SELECT-26-R04",
          "SQL-SELECT-26-R05"
        ],
        "solutionSql": "SELECT kunden_nr, vorname, nachname, ort\nFROM mitglied\nWHERE status = 'aktiv' AND ort = 'Köln'\nORDER BY nachname, vorname\nLIMIT 5;"
      },
      {
        "id": "SQL-SELECT-27",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Die Kursleitung möchte abgesagte Termine schnell finden.<br><strong>Gesucht:</strong> Zeige alle Kurstermine mit <code>status = 'abgesagt'</code> und sortiere nach Startzeit.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-27-X01",
            "text": "WHERE status = 'geplant'"
          },
          {
            "id": "SQL-SELECT-27-R02",
            "text": "FROM kurstermin"
          },
          {
            "id": "SQL-SELECT-27-R03",
            "text": "WHERE status = 'abgesagt'"
          },
          {
            "id": "SQL-SELECT-27-R04",
            "text": "ORDER BY startzeit"
          },
          {
            "id": "SQL-SELECT-27-R01",
            "text": "SELECT termin_id, kurs_id, startzeit, endzeit, status"
          },
          {
            "id": "SQL-SELECT-27-X03",
            "text": "ORDER BY preis ASC"
          },
          {
            "id": "SQL-SELECT-27-X02",
            "text": "LIMIT 5"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-27-R01",
          "SQL-SELECT-27-R02",
          "SQL-SELECT-27-R03",
          "SQL-SELECT-27-R04"
        ],
        "solutionSql": "SELECT termin_id, kurs_id, startzeit, endzeit, status\nFROM kurstermin\nWHERE status = 'abgesagt'\nORDER BY startzeit;"
      },
      {
        "id": "SQL-SELECT-28",
        "type": "sql-order",
        "topic": "select_filter_sort",
        "difficulty": "leicht",
        "text": "<strong>Kontext:</strong> Für Einsteiger sollen nur Kurse mit dem Level Anfänger angezeigt werden.<br><strong>Gesucht:</strong> Zeige Kursnummer, Titel und Level aus <code>kurs</code>, wenn <code>level = 'Anfänger'</code>, sortiert nach Titel.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-28-R03",
            "text": "WHERE level = 'Anfänger'"
          },
          {
            "id": "SQL-SELECT-28-R04",
            "text": "ORDER BY titel"
          },
          {
            "id": "SQL-SELECT-28-R02",
            "text": "FROM kurs"
          },
          {
            "id": "SQL-SELECT-28-R01",
            "text": "SELECT kurs_nr, titel, level"
          },
          {
            "id": "SQL-SELECT-28-X03",
            "text": "ORDER BY startzeit DESC"
          },
          {
            "id": "SQL-SELECT-28-X02",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-28-X01",
            "text": "WHERE level = 'Fortgeschritten'"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-28-R01",
          "SQL-SELECT-28-R02",
          "SQL-SELECT-28-R03",
          "SQL-SELECT-28-R04"
        ],
        "solutionSql": "SELECT kurs_nr, titel, level\nFROM kurs\nWHERE level = 'Anfänger'\nORDER BY titel;"
      },
      {
        "id": "SQL-SELECT-29",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Buchhaltung möchte offene Rechnungen mit zugehöriger Kundennummer prüfen.<br><strong>Gesucht:</strong> Zeige Kundennummer, Mitgliedsname, Betrag und Referenz für offene Zahlungen per Rechnung.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-29-X01",
            "text": "JOIN kurs k ON z.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-29-R05",
            "text": "WHERE z.status = 'offen' AND z.zahlungsart = 'Rechnung'"
          },
          {
            "id": "SQL-SELECT-29-R02",
            "text": "FROM zahlung z"
          },
          {
            "id": "SQL-SELECT-29-X03",
            "text": "LIMIT 5"
          },
          {
            "id": "SQL-SELECT-29-R03",
            "text": "JOIN buchung b ON z.buchung_id = b.buchung_id"
          },
          {
            "id": "SQL-SELECT-29-R04",
            "text": "JOIN mitglied m ON b.mitglied_id = m.mitglied_id"
          },
          {
            "id": "SQL-SELECT-29-R06",
            "text": "ORDER BY m.kunden_nr"
          },
          {
            "id": "SQL-SELECT-29-R01",
            "text": "SELECT m.kunden_nr, CONCAT(m.vorname, ' ', m.nachname) AS mitglied, z.betrag, z.referenz"
          },
          {
            "id": "SQL-SELECT-29-X02",
            "text": "WHERE b.status = 'gebucht'"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-29-R01",
          "SQL-SELECT-29-R02",
          "SQL-SELECT-29-R03",
          "SQL-SELECT-29-R04",
          "SQL-SELECT-29-R05",
          "SQL-SELECT-29-R06"
        ],
        "solutionSql": "SELECT m.kunden_nr, CONCAT(m.vorname, ' ', m.nachname) AS mitglied, z.betrag, z.referenz\nFROM zahlung z\nJOIN buchung b ON z.buchung_id = b.buchung_id\nJOIN mitglied m ON b.mitglied_id = m.mitglied_id\nWHERE z.status = 'offen' AND z.zahlungsart = 'Rechnung'\nORDER BY m.kunden_nr;"
      },
      {
        "id": "SQL-SELECT-30",
        "type": "sql-order",
        "topic": "select_joins",
        "difficulty": "mittel",
        "text": "<strong>Kontext:</strong> Die Raumplanung möchte alle Termine im Studio B sehen.<br><strong>Gesucht:</strong> Zeige Termin-ID, Kurstitel, Startzeit und Raum für Termine im Raum <code>Studio B</code>.<br><small>Ziehe nur die benötigten <strong>SELECT-Bausteine</strong> in die richtige Reihenfolge. Überflüssige Bausteine bleiben links liegen.</small>",
        "blocks": [
          {
            "id": "SQL-SELECT-30-R01",
            "text": "SELECT kt.termin_id, k.titel AS kurs, kt.startzeit, r.bezeichnung AS raum"
          },
          {
            "id": "SQL-SELECT-30-X01",
            "text": "WHERE r.standort = 'Online'"
          },
          {
            "id": "SQL-SELECT-30-R04",
            "text": "JOIN raum r ON kt.raum_id = r.raum_id"
          },
          {
            "id": "SQL-SELECT-30-R03",
            "text": "JOIN kurs k ON kt.kurs_id = k.kurs_id"
          },
          {
            "id": "SQL-SELECT-30-R02",
            "text": "FROM kurstermin kt"
          },
          {
            "id": "SQL-SELECT-30-X02",
            "text": "LIMIT 10"
          },
          {
            "id": "SQL-SELECT-30-R05",
            "text": "WHERE r.bezeichnung = 'Studio B'"
          },
          {
            "id": "SQL-SELECT-30-R06",
            "text": "ORDER BY kt.startzeit"
          },
          {
            "id": "SQL-SELECT-30-X03",
            "text": "ORDER BY preis DESC"
          }
        ],
        "correctOrder": [
          "SQL-SELECT-30-R01",
          "SQL-SELECT-30-R02",
          "SQL-SELECT-30-R03",
          "SQL-SELECT-30-R04",
          "SQL-SELECT-30-R05",
          "SQL-SELECT-30-R06"
        ],
        "solutionSql": "SELECT kt.termin_id, k.titel AS kurs, kt.startzeit, r.bezeichnung AS raum\nFROM kurstermin kt\nJOIN kurs k ON kt.kurs_id = k.kurs_id\nJOIN raum r ON kt.raum_id = r.raum_id\nWHERE r.bezeichnung = 'Studio B'\nORDER BY kt.startzeit;"
      }
    ]
  }
];
