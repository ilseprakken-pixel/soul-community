import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LidView from './pages/LidView';
import RicardoView from './pages/RicardoView';
import NotFound from './pages/NotFound';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Lid krijgt persoonlijke link: /lid/TOKEN */}
        <Route path="/lid/:token" element={<LidView />} />
        {/* Ricardo heeft eigen beveiligde pagina */}
        <Route path="/beheer" element={<RicardoView />} />
        {/* Root → uitleg */}
        <Route path="/" element={<Navigate to="/404" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
