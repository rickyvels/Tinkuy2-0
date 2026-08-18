import { demoAssistantReply, demoCurrentCase, demoFamily, demoNotebook, demoSession, demoWriteNote } from './demo';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
export type Session = { access_token: string; user: { full_name: string; role: string } };
export type RegistrationRequest = { dni: string; password: string; companion_name: string; patient_name: string; relationship: string; phone: string; district: string; consent_confirmed: true };

// --- Modo demostración sin servidor -------------------------------------------------------
//
// Solo se activa cuando `fetch` falla a nivel de red (backend apagado, sin conexión). Un error
// HTTP significa que el servidor sí respondió, y ese se propaga sin tocarlo.
//
// El encuadre de demostración lo da la pantalla de acceso, que anuncia los datos sintéticos
// antes de entrar; por eso aquí no se emite ningún aviso a la interfaz.

class NetworkDown extends Error {}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  } catch {
    throw new NetworkDown('Sin conexión con el servidor.');
  }
  if (!response.ok) throw new Error((await response.json().catch(() => ({ detail: 'No se pudo conectar.' }))).detail || 'No se pudo completar la solicitud.');
  return response.json() as Promise<T>;
}

/** Ejecuta la llamada real y, solo si la red falló, devuelve el equivalente sintético. */
async function withDemo<T>(run: () => Promise<T>, fallback: () => T): Promise<T> {
  try { return await run(); }
  catch (reason) { if (reason instanceof NetworkDown) return fallback(); throw reason; }
}

export type FamilyData = { user: { full_name: string }; family_profile: { relationship: string; patient_name: string; district: string }; active_case: CaseSummary };
export type CareStage = 'detection' | 'referral' | 'assessment' | 'intervention' | 'followup' | 'discharge';
export type CaseSummary = { id: number; case_code: string; route_status: string; care_stage: CareStage; early_detection?: boolean | null; approval_status: string; barrier_reported: boolean; family_message: string; updated_at: string };
export type NoteSetting = 'casa' | 'colegio' | 'terapia' | 'comunidad' | 'otro';
export type NoteProgress = 'avance' | 'sin_cambios' | 'retroceso';
export type FamilyNote = { id: number; setting: NoteSetting; observation: string; progress: NoteProgress; occurred_on: string; author_name: string; professional_comment?: string | null; reviewed_at?: string | null; created_at: string };
export type FamilyNoteSummary = { total: number; advances: number; steady: number; setbacks: number; pending_review: number };
export type FamilyNotebook = { notes: FamilyNote[]; summary: FamilyNoteSummary };
export type FamilyNotePayload = { setting: NoteSetting; observation: string; progress: NoteProgress; occurred_on: string };
export type CurrentCase = { case: CaseSummary; tasks: Array<{ id: number; title: string; owner: string; status: string; authorized_proposal?: string }>; latest_barrier_report?: { title: string; description: string; availability_note?: string }; pending_approval?: unknown };
export type FamilyAssistantReply = { answer: string; provider: 'ollama' | 'deterministic'; model: string; disclaimer: string };
export type BarrierType = 'availability' | 'transport' | 'administrative' | 'other';
export type BarrierReportPayload = { barrier_type: BarrierType; title: string; description: string; availability_note: string };

export const familyApi = {
  login: (dni: string, password: string) => withDemo(
    () => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ dni, password }) }),
    () => demoSession,
  ),
  register: (body: RegistrationRequest) => withDemo(
    () => request<Session>('/auth/family-registration', { method: 'POST', body: JSON.stringify(body) }),
    () => ({ ...demoSession, user: { full_name: body.companion_name, role: 'family' } }),
  ),
  me: (token: string) => withDemo(() => request<FamilyData>('/family/me', {}, token), () => demoFamily),
  currentCase: (token: string) => withDemo(() => request<CurrentCase>('/family/cases/current', {}, token), () => demoCurrentCase),
  assistant: (token: string, message: string) => withDemo(
    () => request<FamilyAssistantReply>('/family/cases/current/assistant', { method: 'POST', body: JSON.stringify({ message }) }, token),
    () => demoAssistantReply,
  ),
  report: (token: string, caseId: number, body: BarrierReportPayload) => withDemo(
    () => request<{ case: CaseSummary }>(`/family/cases/${caseId}/barrier-reports`, { method: 'POST', body: JSON.stringify(body) }, token),
    () => ({ case: { ...demoCurrentCase.case, barrier_reported: true, route_status: 'barrier_reported', approval_status: 'not_requested' } }),
  ),
  notebook: (token: string) => withDemo(() => request<FamilyNotebook>('/family/cases/current/notes', {}, token), demoNotebook),
  writeNote: (token: string, caseId: number, body: FamilyNotePayload) => withDemo(
    () => request<{ note: FamilyNote; summary: FamilyNoteSummary }>(`/family/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify(body) }, token),
    () => demoWriteNote(body),
  ),
};
