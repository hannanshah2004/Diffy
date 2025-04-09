import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PublicChangelog } from './pages/PublicChangelog';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/changelog" element={<PublicChangelog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;