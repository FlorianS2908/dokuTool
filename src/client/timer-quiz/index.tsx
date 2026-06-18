import React from 'react';
import { createRoot } from 'react-dom/client';
import { TimerQuizApp } from './TimerQuizApp';

const rootElement = document.querySelector('#timerQuizRoot');

if (rootElement) {
  const initialArea = rootElement.getAttribute('data-timer-quiz-area') || 'software';
  createRoot(rootElement).render(<TimerQuizApp initialArea={initialArea as 'software' | 'sql' | 'python'} />);
}
