import type { ChatMessage } from '../api/client';
import { createContext, useContext } from 'react';
import type { Step } from '../types';

export interface ProjectState {
  prompt: string;
  steps: Step[];
  messages: ChatMessage[];
  title: string;
  loading: boolean;
  followUpLoading: boolean;
  error: string | null;
  initialized: boolean;
}

export const initialProjectState: ProjectState = {
  prompt: '',
  steps: [],
  messages: [],
  title: 'New Project',
  loading: false,
  followUpLoading: false,
  error: null,
  initialized: false,
};

export const ProjectContext = createContext<{
  state: ProjectState;
  setState: React.Dispatch<React.SetStateAction<ProjectState>>;
} | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
