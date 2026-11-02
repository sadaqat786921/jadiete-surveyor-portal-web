import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import Today from './pages/Today';
import { Login, Welcome } from './pages/Auth';
import { Surveys, Inspections } from './pages/Visits';
import SurveyJob from './pages/SurveyJob';
import InspectionJob from './pages/InspectionJob';
import Calendar from './pages/Calendar';
import Messages from './pages/Messages';
import Settings from './pages/Settings';

// Surveyor portal: the visits the office books for one surveyor — final surveys and inspections.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/welcome/:step" element={<Welcome />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Today />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/surveys/:id" element={<SurveyJob />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/inspections/:id" element={<InspectionJob />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
