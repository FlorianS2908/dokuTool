import React from 'react';
import { createRoot } from 'react-dom/client';
import { TimerQuizApp } from './TimerQuizApp';

const rootElement = document.querySelector('#timerQuizRoot');

if (rootElement) {
  createRoot(rootElement).render(<TimerQuizApp />);
}
