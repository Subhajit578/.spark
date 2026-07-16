import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  initialProjectState,
  ProjectContext,
} from './context/ProjectContext';
import { BuilderPage } from './pages/BuilderPage';
import { LandingPage } from './pages/LandingPage';

export default function App() {
  const [state, setState] = useState(initialProjectState);

  return (
    <ProjectContext.Provider value={{ state, setState }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/build" element={<BuilderPage />} />
        </Routes>
      </BrowserRouter>
    </ProjectContext.Provider>
  );
}
