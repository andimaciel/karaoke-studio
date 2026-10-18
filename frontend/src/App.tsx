import React, { useState } from 'react';
import { Header } from './components/Header';
import { UnifiedStudio } from './components/UnifiedStudio';
import { SettingsModal } from './components/SettingsModal';
import { ProjectsModal } from './components/ProjectsModal';
import { Project } from './types';

export function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const handleNewProject = () => {
    setCurrentProject(null);
  };

  const handleSelectSavedProject = (proj: Project) => {
    setCurrentProject(proj);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* Sleek App Header */}
      <Header
        onNewProject={handleNewProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        currentProjectId={currentProject?.id}
      />

      {/* Main Single-Screen Unified Studio (All Steps Visible) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-4">
        <UnifiedStudio
          key={currentProject?.id || 'new'}
          initialProject={currentProject}
          onProjectSaved={setCurrentProject}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProjects={() => setIsProjectsOpen(true)}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        onSelectProject={handleSelectSavedProject}
      />
    </div>
  );
}

export default App;
