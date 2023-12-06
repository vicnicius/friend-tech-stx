import React from 'react';
import App from './App';
import Chat from './Chat';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { createRoot } from 'react-dom/client';

import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/chat/:address" element={<Chat />} />
    </Routes>
  </BrowserRouter>
);
