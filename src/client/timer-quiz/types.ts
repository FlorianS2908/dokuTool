export type QuestionId = string | number;

export type SqlBlock = {
  id: string;
  text: string;
};

export type BaseQuestion = {
  id?: QuestionId;
  topic?: string;
  difficulty?: string;
  text?: string;
  question?: string;
  frage?: string;
  title?: string;
  explanation?: string;
};

export type ChoiceQuestion = BaseQuestion & {
  type?: string;
  options: string[];
  correct: number[];
};

export type SqlOrderQuestion = BaseQuestion & {
  type: 'sql-order';
  blocks: SqlBlock[];
  correctOrder: string[];
  solutionSql?: string;
};

export type QuizQuestion = ChoiceQuestion | SqlOrderQuestion;

export type QuizPool = {
  id?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  timeLimitMinutes?: number;
  questions: QuizQuestion[];
  topicLabels?: Record<string, string>;
  difficultyLabels?: Record<string, string>;
  database?: {
    name?: string;
    tables?: string[];
    note?: string;
  };
};

export type AnswerValue = number[] | string[];

export type TopicResult = {
  key: string;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  correctPct: number;
  wrongPct: number;
};
