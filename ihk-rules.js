export const GENERAL_IHK_RULES = [
  {
    label: 'Aenderungen gegenueber dem genehmigten Projektantrag erlaeutert',
    patterns: [/abweichungen?\s+(zum|vom)\s+projektantrag/i, /aenderungen?\s+(gegenueber|zum|vom)\s+projektantrag/i, /änderungen?\s+(gegenüber|zum|vom)\s+projektantrag/i],
    recommendation: 'Falls es Abweichungen gab: Umfang, Grund und Auswirkungen gegenueber dem genehmigten Antrag erlaeutern.'
  },
  {
    label: 'Wirtschaftlichkeit oder Kosten-/Nutzenbetrachtung vorhanden',
    patterns: [/wirtschaftlichkeit/i, /kosten[-\s]?nutzen/i, /amortisation/i, /kostenplanung/i, /budget/i, /ressourcenplanung/i],
    recommendation: 'Wirtschaftliche Betrachtung, Aufwand, Nutzen und ggf. Alternativen nachvollziehbar darstellen.'
  },
  {
    label: 'Fremdinhalte, Quellen, Bilder und Codeanteile gekennzeichnet',
    patterns: [/quellenverzeichnis/i, /literaturverzeichnis/i, /bildnachweis/i, /fremd(?:inhalt|leistung|quelle)/i, /quelle\s*:/i, /https?:\/\//i],
    recommendation: 'Alle fremden Inhalte, Bilder, Tabellen, Codeanteile, Internetquellen und KI-Anteile eindeutig markieren.'
  },
  {
    label: 'Anlagen werden aus dem Fliesstext referenziert',
    patterns: [/siehe\s+(anhang|anlage)/i, /vgl\.\s+(anhang|anlage)/i, /\b(anlage|anhang)\s+[a-z0-9]/i],
    recommendation: 'Jede Anlage sollte im Fliesstext einen klaren Verweis und einen Zweck haben.',
    onlyWhen: /anhang\b|anlagen\b/i
  },
  {
    label: 'FIAE-Prozessstruktur fachlich abgedeckt',
    patterns: [/ist[-\s]?analyse/i, /soll[-\s]?konzept/i, /planung/i, /entwurf|konzeption|architektur/i, /implementierung|realisierung/i, /test|qualitaetssicherung|qualitätssicherung/i, /soll[-\s]?ist[-\s]?vergleich/i],
    minMatches: 5,
    recommendation: 'Analyse, Soll-Konzept, Planung, Entwurf, Implementierung, Test/QS und Abschluss/Soll-Ist-Vergleich als Prozess darstellen.'
  }
];

const documentationRequiredAi = 'KI maximal als Assistenz: Inhalte markieren, Tool mit Name/URL nennen, Prompts und Antworten dokumentieren.';
const noSpecificAi = 'Keine separate KI-Sonderregel hinterlegt: mindestens Eigenstaendigkeit, Quellenpflicht, Datenschutz und Urheberrecht beachten.';

export const IHK_RULE_PROFILES = [
  {
    key: 'allgemein',
    label: 'Allgemein / Sicherheitsvariante',
    summary: 'Robuste Standardpruefung, wenn die zustaendige IHK unklar ist.',
    page: { min: 10, max: 15, scope: 'reine Projektdokumentation' },
    layout: 'Arial 11 pt oder gut lesbare Standardschrift 11-12 pt, 1,5 Zeilen, gut lesbare Raender.',
    aiPolicy: { level: 'standard', label: 'Allgemeine KI-Compliance', rule: 'KI-Nutzung dokumentieren, markieren, Prompts/Antworten in den Anhang und Tool/URL ins Quellenverzeichnis aufnehmen.' },
    requirements: []
  },
  {
    key: 'nordwestfalen',
    label: 'IHK Nord Westfalen',
    summary: '15 Seiten Doku ohne Deckblatt/Inhaltsverzeichnis/Anlagen; Anlagen max. 30 Seiten; PDF max. 8 MB.',
    page: { max: 15, appendixMax: 30, scope: 'Dokumentation ohne Deckblatt, Inhaltsverzeichnis, Anlagen' },
    pdfMaxMb: 8,
    layout: 'DIN A4, Text 10-12 pt, Seiten eindeutig zuordenbar und durchnummeriert.',
    aiPolicy: { level: 'documentation_required', label: 'KI als Assistenz mit Nachweispflicht', rule: documentationRequiredAi },
    requirements: [
      { label: 'Qualitaetssicherung dargestellt', patterns: [/qualitaetssicherung|qualitätssicherung|testphase|testfall/i], recommendation: 'QS und Tests konkret darstellen.' },
      { label: 'Wirtschaftlichkeit dargestellt', patterns: [/wirtschaftlichkeit|kosten[-\s]?nutzen|amortisation|kostenplanung/i], recommendation: 'Wirtschaftlichkeit sichtbar ergaenzen.' }
    ]
  },
  {
    key: 'koeln',
    label: 'IHK Koeln',
    summary: 'Projektbericht max. 20 Seiten; gesamte Doku inkl. Anlagen max. 60 Seiten.',
    page: { max: 20, totalMax: 60, scope: 'Projektbericht max. 20 Seiten; Gesamtumfang max. 60 Seiten' },
    layout: 'Gut lesbare uebliche Schrift, Referenz Times New Roman 12, keine Condensed/Narrow, 1,5 Zeilen, Raender links/oben 2,5 cm, unten 2 cm, rechts 1,5 cm.',
    aiPolicy: { level: 'koeln_restrictive', label: 'Generative KI nicht zulaessig', rule: 'Generative KI ist nicht zulaessig; erlaubt sind Recherche sowie Rechtschreib-/Grammatikpruefung mit Quellenhinweis.' },
    requirements: [
      { label: 'Formale Vorgaben kritisch relevant', patterns: [/formale vorgaben|projektdokumentation|projektbericht|onlineportal/i], recommendation: 'Bei Koeln koennen formale Verstoesse kritisch sein; aktuelle Vorgabe manuell gegenpruefen.', soft: true }
    ]
  },
  {
    key: 'stuttgart',
    label: 'IHK Region Stuttgart',
    summary: 'Ca. 10-15 Seiten Doku; Anlagen nur wenn noetig; PDF max. 18 MB.',
    page: { min: 10, max: 15, appendixMax: 15, scope: 'Dokumentation; Anlagen nur wenn noetig' },
    pdfMaxMb: 18,
    layout: 'Form, Struktur und Sprache werden bewertet; konkrete Formatwerte frei waehlbar.',
    aiPolicy: { level: 'stuttgart_restrictive', label: 'KI nicht fuer Struktur/Formulierung', rule: 'KI darf nicht zur Strukturierung oder Formulierung verwendet werden und ist keine zulaessige Quelle.' },
    requirements: [
      { label: 'Kundendokumentation beruecksichtigt', patterns: [/kundendokumentation|anwenderdokumentation|benutzerdokumentation|uebergabe|übergabe/i], recommendation: 'Kundendokumentation als bewertungsrelevanten Bestandteil aufnehmen.' },
      { label: 'Vorgehen und Entscheidungen nachvollziehbar', patterns: [/entscheidung|alternative|begruendung|begründung|vorgehen/i], recommendation: 'Nicht nur Ergebnis, sondern Vorgehen, Alternativen und Entscheidungen beschreiben.' }
    ]
  },
  {
    key: 'hanau',
    label: 'IHK Hanau-Gelnhausen-Schluechtern',
    summary: 'Max. 15 DIN-A4-Seiten; Anlagen max. 20 Seiten; PDF max. 4 MB.',
    page: { max: 15, appendixMax: 20, scope: 'Dokumentation' },
    pdfMaxMb: 4,
    layout: 'Arial oder Tahoma 11 pt, Zeilenabstand 1,3, Seitenraender nach DIN 5008.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Persoenliche Erklaerung vorhanden', patterns: [/persoenliche erklaerung|persönliche erklärung|eigenstaendigkeitserklaerung|eigenständigkeitserklärung/i], recommendation: 'Persoenliche Erklaerung beifuegen.' },
      { label: 'Projektprotokoll vorhanden', patterns: [/projektprotokoll|protokoll/i], recommendation: 'Projektprotokoll beifuegen oder als Anlage referenzieren.' }
    ]
  },
  {
    key: 'lippe',
    label: 'IHK Lippe zu Detmold',
    summary: '15 Seiten ohne Deckblatt/Inhaltsverzeichnis/Anlagen; Anlagen max. 30 Seiten.',
    page: { max: 15, appendixMax: 30, scope: 'ohne Deckblatt, Inhaltsverzeichnis, Anlagen' },
    layout: 'DIN A4, 10-12 pt, gaengige Schriftarten, durchgaengige Nummerierung.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Quellcode/Skripte nur als relevante Auszuege', patterns: [/quellcode|skript|listing|auszug/i], recommendation: 'Nur relevante Codeauszuege aufnehmen und im Text erklaeren.', soft: true }
    ]
  },
  {
    key: 'halle',
    label: 'IHK Halle-Dessau',
    summary: '8 bis max. 10 Seiten reine Doku; durchsuchbare verbundene PDF.',
    page: { min: 8, max: 10, scope: 'ausgenommen Deckblatt, Verzeichnisse, Bilder, Tabellen, Anlagen' },
    layout: 'Arial 11, 1,5 Zeilen, Blocksatz, DIN 5008, Raender oben/links 3,0 cm, unten/rechts 2,5 cm.',
    aiPolicy: { level: 'documentation_required', label: 'KI-Nutzung markieren', rule: 'KI-Tool, Prompt und Markierung im Text soweit moeglich nachweisen.' },
    requirements: [
      { label: 'Eidesstattliche Erklaerung / IHK-Deckblatt', patterns: [/eidesstattliche erklaerung|eidesstattliche erklärung|ihk[-\s]?deckblatt/i], recommendation: 'IHK-Deckblatt inklusive eidesstattlicher Erklaerung verwenden.' }
    ]
  },
  {
    key: 'rhein-neckar',
    label: 'IHK Rhein-Neckar',
    summary: '12-15 Seiten; Kundendokumentation und Anlagen zaehlen nicht zu den 15 Seiten.',
    page: { min: 12, max: 15, scope: 'Projektbericht ohne Verzeichnisse, Kundendoku und Anlagen' },
    layout: 'Uebliche Schrift, z. B. Arial 10-12; Zeilenabstand 1,0 bis max. 1,5.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Kundendokumentation als Anlage vorhanden', patterns: [/kundendokumentation|anwenderdokumentation|benutzerdokumentation/i], recommendation: 'Kundendokumentation als Anlage aufnehmen, auch bei internen Projekten.' },
      { label: 'FIAE-Quellcode als Anhang', patterns: [/quellcode|sourcecode|listing/i], recommendation: 'Relevanten Quellcode als Anhang nachweisen und im Text referenzieren.', soft: true }
    ]
  },
  {
    key: 'rheinhessen',
    label: 'IHK Rheinhessen',
    summary: 'Reine Dokumentation 10-12 Seiten plus Inhaltsverzeichnis, Quellenverzeichnis und Anlagen.',
    page: { min: 10, max: 12, scope: 'reine Dokumentation' },
    layout: 'Arial 11 oder aehnlich, Blocksatz, 1,5 Zeilen, Raender links/oben 3,5 cm, rechts/unten 2,5 cm.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Eidesstattliche Erklaerung vorhanden', patterns: [/eidesstattliche erklaerung|eidesstattliche erklärung|eigenstaendigkeit/i], recommendation: 'Eidesstattliche Erklaerung beifuegen.' },
      { label: 'Vollstaendige URLs in Quellen', patterns: [/https?:\/\//i], recommendation: 'Quellen mit vollstaendigen URLs angeben.' }
    ]
  },
  {
    key: 'oldenburg',
    label: 'Oldenburgische IHK',
    summary: 'Formale/sprachliche Gestaltung und Betriebs-/Kundendokumentation relevant.',
    layout: 'Angemessene Betriebs- und Kundendokumentation, formale und sprachliche Gestaltung werden bewertet.',
    aiPolicy: { level: 'documentation_required', label: 'KI als Hilfsmittel mit Nachweispflicht', rule: documentationRequiredAi },
    requirements: [
      { label: 'Alternativen und Entscheidungen nachvollziehbar', patterns: [/alternative|entscheidung|begruendung|begründung/i], recommendation: 'Entscheidungen und Alternativen fachlich begruenden.' },
      { label: 'Betriebs-/Kundendokumentation vorhanden', patterns: [/betriebsdokumentation|kundendokumentation|anwenderdokumentation/i], recommendation: 'Betriebs- oder Kundendokumentation aufnehmen.' }
    ]
  },
  {
    key: 'potsdam',
    label: 'IHK Potsdam',
    summary: 'Regionale Handreichung und Zeitmitschreibung beachten.',
    layout: 'Regionale Handreichung massgeblich; digitale Nachweise beachten.',
    aiPolicy: { level: 'documentation_required', label: 'KI-Assistenz mit strenger Nachweispflicht', rule: `${documentationRequiredAi} Fehlende Kennzeichnung kann zur Note 6 fuehren.` },
    requirements: [
      { label: 'Zeitmitschreibung / Zeitplanung nachvollziehbar', patterns: [/zeitmitschreibung|zeitplanung|stunden|projektphasen/i], recommendation: 'Zeitmitschreibung oder Zeitplanung nachvollziehbar darstellen.' }
    ]
  },
  {
    key: 'darmstadt',
    label: 'IHK Darmstadt',
    summary: 'FIAE 80 Stunden; Prozessschritte muessen sauber dokumentiert sein.',
    layout: 'Regionale Bewertungsmatrix beachten; fehlende Prozessschritte koennen nicht kompensiert werden.',
    aiPolicy: { level: 'documentation_required', label: 'KI nach Richtlinie mit Nachweis', rule: 'KI darf genutzt werden, wenn eigene Leistung erkennbar bleibt und KI-Inhalte gekennzeichnet/nachvollziehbar dokumentiert werden.' },
    requirements: [
      { label: 'Sachmittel-, Termin- und Kostenplanung vorhanden', patterns: [/sachmittel|terminplanung|kostenplanung|ressourcenplanung/i], recommendation: 'Sachmittel-, Termin- und Kostenplanung ergaenzen.' }
    ]
  },
  {
    key: 'schwaben',
    label: 'IHK Schwaben',
    summary: 'FIAE 10-15 Seiten; Anlagen ohne Seitenbegrenzung; ohne Deckblatt und Gliederung.',
    page: { min: 10, max: 15, scope: 'ohne Deckblatt und Gliederung/Inhaltsverzeichnis' },
    layout: '11-12 pt, einheitliche gut lesbare Schrift z. B. Arial/Calibri, Zeilenabstand 1,15-1,5, Seitennummerierung.',
    aiPolicy: { level: 'documentation_required', label: 'KI und Bildherkunft kennzeichnen', rule: 'KI-Tools und Bildherkunft kenntlich machen.' },
    requirements: [
      { label: 'IHK-Vorlagen fuer Deckblatt/Erklaerung beachtet', patterns: [/deckblatt|persoenliche erklaerung|persönliche erklärung|ihk[-\s]?vorlage/i], recommendation: 'IHK-Vorlagen fuer Deckblatt und persoenliche Erklaerung verwenden.' }
    ]
  },
  {
    key: 'muenchen',
    label: 'IHK Muenchen und Oberbayern',
    summary: 'Max. 20 Seiten inkl. Anlagen, ohne Deckblatt und Gliederung; PDF max. 4 MB.',
    page: { totalMax: 20, scope: 'inkl. Anlagen, ohne Deckblatt und Gliederung' },
    pdfMaxMb: 4,
    layout: 'Empfohlen 11-12 pt, einheitliche Schrift z. B. Arial/Calibri, Zeilenabstand 1,15-1,5, Seitennummerierung.',
    aiPolicy: { level: 'no_specific', label: 'Keine detaillierte KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Inhalt mit Projektbetreuer abgestimmt', patterns: [/projektbetreuer|abstimmung|freigabe|abnahme/i], recommendation: 'Abstimmung/Freigabe mit Projektbetreuer nachvollziehbar machen.', soft: true }
    ]
  },
  {
    key: 'nuernberg',
    label: 'IHK Nuernberg fuer Mittelfranken',
    summary: 'Dokumentation inkl. Anhang 15-25 Seiten; Deckblatt/Inhaltsverzeichnis ausgenommen.',
    page: { min: 15, max: 25, scope: 'Dokumentation inkl. Anhang, ohne Deckblatt und Inhaltsverzeichnis' },
    layout: '10-12 pt, gut lesbar, Hochformat, Zeilenabstand 1,0 bis max. 1,5, linker Rand ca. 2-2,5 cm, rechter Rand ca. 1,5 cm.',
    aiPolicy: { level: 'standard', label: 'Merkblatt mit KI-Hinweis', rule: 'Quellennachweise/Zitierregeln strikt beachten und KI-Hinweise pruefen.' },
    requirements: [
      { label: 'Mindestkriterien Quellennachweise, Wirtschaftlichkeit und Fazit', patterns: [/quellen|wirtschaftlichkeit|fazit/i], minMatches: 2, recommendation: 'Quellennachweise, wirtschaftliche Betrachtung und Fazit als Mindestkriterien sicherstellen.' }
    ]
  },
  {
    key: 'niederbayern',
    label: 'IHK Niederbayern',
    summary: 'Doku ca. 12-15 Seiten plus Anlagen; PDF max. 15 MB.',
    page: { min: 12, max: 15, scope: 'Dokumentation plus ggf. Anlagen' },
    pdfMaxMb: 15,
    layout: 'Praxisbezogene Unterlagen und Nachvollziehbarkeit; regionale Formatvorgaben beachten.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Projektbeschreibung vorab genehmigt / Projektantrag', patterns: [/projektantrag|projektbeschreibung|genehmigung|genehmigt/i], recommendation: 'Projektbeschreibung/Genehmigung oder Antrag-Bezug dokumentieren.', soft: true }
    ]
  },
  {
    key: 'wuerzburg',
    label: 'IHK Wuerzburg-Schweinfurt',
    summary: 'Empfohlen ca. 15, max. 18 Seiten ohne Anlagen/Tabellen usw.',
    page: { max: 18, scope: 'ohne Anlagen, Tabellen usw.' },
    layout: 'Arial 11, 1,5 Zeilen, links 2,5 cm Heftrand, rechts 2,5 cm Korrekturrand.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Zeituebersicht, Glossar und Quellen Bestandteil', patterns: [/zeituebersicht|zeitübersicht|glossar|quellenverzeichnis/i], minMatches: 2, recommendation: 'Zeituebersicht, Glossar und Quellenangaben aufnehmen.' }
    ]
  },
  {
    key: 'bonn',
    label: 'IHK Bonn/Rhein-Sieg',
    summary: 'IHK-eigene Handreichung verwenden; keine fremde IHK-Handreichung.',
    layout: 'IHK-eigene Handreichung und regionale Termine beachten.',
    aiPolicy: { level: 'standard', label: 'Regionale KI-Hinweise pruefen', rule: 'Downloadbereich fuehrt KI-Hinweise; verbindliche regionale Dokumente pruefen.' },
    requirements: [
      { label: 'Deckblatt und persoenliche Erklaerung', patterns: [/deckblatt|persoenliche erklaerung|persönliche erklärung/i], recommendation: 'Deckblatt und persoenliche Erklaerung der IHK verwenden.' }
    ]
  },
  {
    key: 'saarland',
    label: 'IHK Saarland',
    summary: '10 bis max. 15 Seiten Projektdokumentation; Anhaenge zaehlen gesondert.',
    page: { min: 10, max: 15, scope: 'Projektdokumentation ohne Deckblatt, Erklaerung, Inhaltsverzeichnis, Anhaenge' },
    layout: 'Projektdokumentation mit Seite 1 beginnend nummerieren; Anhaenge separat nummerieren.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Projektbezogenes Glossar/Quellen/Anhaenge bei Bedarf', patterns: [/glossar|quellenverzeichnis|anhang|anlage/i], recommendation: 'Glossar, Quellen und Anhaenge projektbezogen nutzen.', soft: true }
    ]
  },
  {
    key: 'aschaffenburg',
    label: 'IHK Aschaffenburg',
    summary: 'Merkblatt/Downloads maßgeblich; Projektkonzept und Zeitplanung vorher genehmigen lassen.',
    layout: 'Merkblatt/Downloads der IHK Aschaffenburg massgeblich.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Projektkonzept und Zeitplanung vor Durchfuehrung', patterns: [/projektkonzept|zeitplanung|genehmigt|projektantrag/i], recommendation: 'Genehmigtes Projektkonzept und Zeitplanung nachvollziehbar darstellen.' }
    ]
  },
  {
    key: 'frankfurt',
    label: 'IHK Frankfurt am Main',
    summary: 'FIAE 80 Stunden; Projektantrag mit Ist/Soll, Ziel, Schnittstellen, Wirtschaftlichkeit usw.',
    layout: 'Merkblatt zur betrieblichen Projektarbeit beachten.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Ist/Soll, Ziel, Schnittstellen, Wirtschaftlichkeit, Sicherheit/Nachhaltigkeit', patterns: [/ist[-\s]?analyse|soll[-\s]?konzept|ziel|schnittstelle|wirtschaftlichkeit|sicherheit|nachhaltigkeit/i], minMatches: 4, recommendation: 'Ist/Soll, Ziel, Schnittstellen, Wirtschaftlichkeit, Sicherheit/Nachhaltigkeit und Qualitaetsmerkmale aufnehmen.' }
    ]
  },
  {
    key: 'nordschwarzwald',
    label: 'IHK Nordschwarzwald',
    summary: 'Dokumentation als eine PDF max. 5 MB; Fristen strikt beachten.',
    pdfMaxMb: 5,
    layout: 'Dokumentationsmerkblatt IT-Berufe VO 2020 beachten; Anlagen und Quellcode nur projektbezogen.',
    aiPolicy: { level: 'no_specific', label: 'Keine separate KI-Sonderregel hinterlegt', rule: noSpecificAi },
    requirements: [
      { label: 'Projektbezogene Anlagen/Quellcode', patterns: [/anhang|anlage|quellcode|listing/i], recommendation: 'Anlagen und Quellcode nur projektbezogen und referenziert aufnehmen.', soft: true }
    ]
  },
  {
    key: 'erfurt',
    label: 'IHK Erfurt',
    summary: '10-15 DIN-A4-Seiten zuzüglich Anlagen.',
    page: { min: 10, max: 15, scope: 'zuzueglich Anlagen' },
    layout: 'DIN 5008, Arial 11, 1,5 Zeilen, fortlaufende Seitenzahlen, Seitenrand links/rechts 2,5 cm.',
    aiPolicy: { level: 'standard', label: 'Selbststaendige Erstellung betont', rule: 'Selbststaendige Erstellung nachweisen; KI-Regelung der zustaendigen IHK pruefen.' },
    requirements: [
      { label: 'Selbststaendige Erstellung und Nachvollziehbarkeit', patterns: [/selbststaendig|selbstständig|eigenstaendig|eigenständig|nachvollziehbar/i], recommendation: 'Selbststaendige Erstellung und Nachvollziehbarkeit sichtbar machen.' }
    ]
  }
];

export function getIhkRuleProfile(key = 'allgemein') {
  return IHK_RULE_PROFILES.find((profile) => profile.key === key) || IHK_RULE_PROFILES[0];
}

export function ihkProfilesForClient() {
  return IHK_RULE_PROFILES.map(({ key, label, summary, aiPolicy }) => ({
    key,
    label,
    summary,
    aiPolicy: aiPolicy?.label || ''
  }));
}
