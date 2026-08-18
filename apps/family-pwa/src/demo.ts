// Respaldo de demostración.
//
// La aplicación habla con la API de FastAPI. Cuando esa API no responde a nivel de red —el
// backend no está levantado, o la demo corre en un equipo sin Python— `fetch` lanza antes de
// llegar a tener un código HTTP, y la pantalla se quedaba sin nada que mostrar.
//
// En ese caso concreto servimos este caso sintético y la interfaz lo anuncia con un aviso
// visible: nunca se hace pasar por datos reales. Un error HTTP (credenciales inválidas, 500)
// sí se propaga tal cual, porque ahí el servidor sí contestó y ocultarlo sería mentir.

import type { CurrentCase, FamilyData, FamilyNote, FamilyNotebook, FamilyNotePayload, Session } from './api';

export const demoSession: Session = {
  access_token: 'demo-offline-token',
  user: { full_name: 'Jesús Alzamora', role: 'family' },
};

export const demoFamily: FamilyData = {
  user: { full_name: 'Jesús Alzamora' },
  family_profile: { relationship: 'Padre', patient_name: 'Mateo Alzamora', district: 'San Borja' },
  active_case: demoCase(),
};

function demoCase() {
  return {
    id: 1,
    case_code: 'DEMO-0001',
    route_status: 'in_progress',
    care_stage: 'assessment' as const,
    early_detection: true,
    approval_status: 'approved',
    barrier_reported: false,
    family_message: 'El equipo revisó la referencia y programó la evaluación especializada.',
    updated_at: new Date().toISOString(),
  };
}

export const demoCurrentCase: CurrentCase = {
  case: demoCase(),
  tasks: [{
    id: 1,
    title: 'Evaluación de terapia física',
    owner: 'INSN San Borja',
    status: 'in_progress',
    authorized_proposal: 'Jueves 18 de agosto · 09:30 a. m. · INSN San Borja',
  }],
};

let notes: FamilyNote[] = [{
  id: 1,
  setting: 'casa',
  observation: 'Hoy caminó desde el sofá hasta la puerta sin agarrarse de nada. Se cayó una vez pero se levantó solo.',
  progress: 'avance',
  occurred_on: new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA'),
  author_name: 'Jesús Alzamora',
  professional_comment: 'Gracias por registrarlo. Lo revisamos en la evaluación del jueves.',
  reviewed_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
}];

function summarize(list: FamilyNote[]) {
  return {
    total: list.length,
    advances: list.filter((note) => note.progress === 'avance').length,
    steady: list.filter((note) => note.progress === 'sin_cambios').length,
    setbacks: list.filter((note) => note.progress === 'retroceso').length,
    pending_review: list.filter((note) => !note.professional_comment).length,
  };
}

export function demoNotebook(): FamilyNotebook {
  return { notes: [...notes], summary: summarize(notes) };
}

export function demoWriteNote(body: FamilyNotePayload) {
  const note: FamilyNote = {
    id: Math.max(0, ...notes.map((item) => item.id)) + 1,
    ...body,
    author_name: 'Jesús Alzamora',
    professional_comment: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };
  notes = [note, ...notes];
  return { note, summary: summarize(notes) };
}

export const demoAssistantReply = {
  answer: 'Ahora estás en la etapa de evaluación especializada. El equipo ya autorizó la evaluación de terapia física en el INSN San Borja y te confirmará el horario. Si aparece una dificultad para asistir, avísales desde «Reportar una dificultad».',
  provider: 'deterministic' as const,
  model: 'demo-offline-v1',
  disclaimer: 'Respuesta de demostración sin conexión al servidor.',
};
