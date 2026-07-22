import axios from 'axios'
import { BASE_BACKEND_URL, WORKER_URL } from '@/config'
import { getToken } from './auth'

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
  signup: (email: string, password: string) =>
    axios.post(`${BASE_BACKEND_URL}/v1/signup`, { email, password }),

  signin: (email: string, password: string) =>
    axios.post(`${BASE_BACKEND_URL}/v1/signin`, { email, password }),

  createProject: (prompt: string) =>
    axios.post(`${BASE_BACKEND_URL}/v1/projects`, { prompt }, { headers: authHeaders() }),

  getProjects: () =>
    axios.get(`${BASE_BACKEND_URL}/v1/projects`, { headers: authHeaders() }),

  getPrompts: (projectId: string) =>
    axios.get(`${BASE_BACKEND_URL}/v1/projects/${projectId}`, { headers: authHeaders() }),

  getActions: (projectId: string) =>
    axios.get(`${BASE_BACKEND_URL}/v1/actions/${projectId}`, { headers: authHeaders() }),

  sendPrompt: (projectId: string, prompt: string) =>
    axios.post(`${WORKER_URL}/v1/prompt`, { projectId, prompt }),

  sendPromptToMachine: (projectId: string, prompt: string, machineIp: string) =>
    axios.post(`https://api-${machineIp.replace(/\./g, '-')}.spark.subhajitdev.site/v1/prompt`, { projectId, prompt }),

  getFiles: (projectId: string) =>
    axios.get(`${WORKER_URL}/v1/files/${projectId}`),

  getFileContent: (projectId: string, filePath: string) =>
    axios.get(`${WORKER_URL}/v1/files/${projectId}/content`, { params: { path: filePath } }),
}
