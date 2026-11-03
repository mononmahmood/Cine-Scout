import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// A refresh always starts the story from the top: the intro plays first, and
// scrolling down lands on the taste page. No restored scroll positions.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

createRoot(document.getElementById('root')).render(<App />);
