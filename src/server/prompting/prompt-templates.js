export const PROMPT_TEMPLATES = [
  {
    taskType: 'check_chapter',
    label: 'Kapitel pruefen',
    description: 'Prueft ein Kapitel gegen die ausgewaehlten IHK-Regeln.'
  },
  {
    taskType: 'find_missing_content',
    label: 'Fehlende Inhalte finden',
    description: 'Findet, was im Kapitel wahrscheinlich noch fehlt.'
  },
  {
    taskType: 'improve_structure',
    label: 'Struktur verbessern',
    description: 'Gibt Hinweise fuer eine bessere Kapitelstruktur.'
  },
  {
    taskType: 'create_todo_list',
    label: 'To-do-Liste erstellen',
    description: 'Erstellt konkrete Nacharbeits-To-dos.'
  },
  {
    taskType: 'check_ihk_risk',
    label: 'IHK-Risiko bewerten',
    description: 'Bewertet Abgaberisiken aus Sicht einer Vorpruefung.'
  },
  {
    taskType: 'check_application_alignment',
    label: 'Antrag-Doku-Abgleich',
    description: 'Prueft, ob Dokumentation und Projektantrag zusammenpassen.'
  },
  {
    taskType: 'check_uml',
    label: 'UML pruefen',
    description: 'Prueft UML-Bezug, Notation und fachliche Passung.'
  },
  {
    taskType: 'check_quality_management',
    label: 'QS/Test pruefen',
    description: 'Prueft Testkonzept, Testfaelle und Qualitaetssicherung.'
  },
  {
    taskType: 'check_data_model',
    label: 'Datenmodell pruefen',
    description: 'Prueft Datenmodell, Schluessel, Beziehungen und Projektbezug.'
  },
  {
    taskType: 'custom',
    label: 'Freier Prompt mit Ruleset-Kontext',
    description: 'Nutzt eigene Anweisung, aber bleibt an Regeln und Kapitel gebunden.'
  }
];

export function getPromptTemplate(taskType = 'check_chapter') {
  return PROMPT_TEMPLATES.find((template) => template.taskType === taskType) || PROMPT_TEMPLATES[0];
}
