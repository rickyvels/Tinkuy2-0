// Preguntas del juego del desarrollo.
//
// Los enunciados siguen la lógica de los hitos que la Libreta CRED del MINSA revisa en cada
// control: se preguntan conductas observables en casa, no signos clínicos. Quien responde es
// la familia, así que cada pregunta describe algo que se ve, no algo que se interpreta.
//
// Esto NO es un tamizaje diagnóstico. El resultado ordena lo que la familia observa para que
// el equipo de salud lo lea; nunca clasifica al niño ni sustituye un control.

export type Domain = 'motor' | 'lenguaje' | 'social' | 'cognitivo' | 'autonomia';
export type Answer = 'si' | 'aveces' | 'todavia';

export type Milestone = { id: string; domain: Domain; question: string; hint: string };
export type AgeBand = { id: string; label: string; range: string; milestones: Milestone[] };

export const domainLabels: Record<Domain, string> = {
  motor: 'Movimiento',
  lenguaje: 'Lenguaje',
  social: 'Relación con otros',
  cognitivo: 'Aprendizaje',
  autonomia: 'Autonomía',
};

export const answerLabels: ReadonlyArray<readonly [Answer, string, string]> = [
  ['si', 'Sí, lo hace', 'Lo hace casi siempre.'],
  ['aveces', 'A veces', 'Lo hace algunas veces o con ayuda.'],
  ['todavia', 'Todavía no', 'No lo he visto hacerlo.'],
];

export const ageBands: AgeBand[] = [
  {
    id: '0-6m',
    label: 'Recién nacido a 6 meses',
    range: '0 – 6 meses',
    milestones: [
      { id: 'a1', domain: 'motor', question: '¿Sostiene la cabeza cuando está boca abajo?', hint: 'Levanta y mantiene la cabeza unos segundos apoyado en los brazos.' },
      { id: 'a2', domain: 'social', question: '¿Sonríe cuando le hablas o le sonríes?', hint: 'Una sonrisa que responde a ti, no mientras duerme.' },
      { id: 'a3', domain: 'cognitivo', question: '¿Sigue con la mirada tu cara o un objeto que se mueve despacio?', hint: 'Los ojos acompañan el movimiento de un lado a otro.' },
      { id: 'a4', domain: 'lenguaje', question: '¿Hace sonidos como «ajó», «agú» o gorjeos?', hint: 'Sonidos de garganta, distintos del llanto.' },
      { id: 'a5', domain: 'motor', question: '¿Se lleva las manos a la boca o junta las dos manos?', hint: 'Descubre sus manos y juega con ellas.' },
      { id: 'a6', domain: 'social', question: '¿Se calma cuando lo cargas o le hablas?', hint: 'Tu voz o tus brazos lo tranquilizan.' },
    ],
  },
  {
    id: '6-12m',
    label: '6 meses a 1 año',
    range: '6 – 12 meses',
    milestones: [
      { id: 'b1', domain: 'motor', question: '¿Se sienta sin apoyo?', hint: 'Se mantiene sentado sin que lo sostengas ni se apoye en cojines.' },
      { id: 'b2', domain: 'lenguaje', question: '¿Voltea cuando escucha su nombre?', hint: 'Gira la cabeza al oírte, sin que lo toques.' },
      { id: 'b3', domain: 'motor', question: '¿Pasa un objeto de una mano a la otra?', hint: 'Cambia un juguete de mano sin dejarlo caer.' },
      { id: 'b4', domain: 'lenguaje', question: '¿Balbucea sílabas como «ba-ba», «ma-ma» o «da-da»?', hint: 'Repite sílabas seguidas, aunque no signifiquen algo aún.' },
      { id: 'b5', domain: 'cognitivo', question: '¿Busca un juguete que se le cayó o que escondiste?', hint: 'Entiende que la cosa sigue existiendo aunque no la vea.' },
      { id: 'b6', domain: 'social', question: '¿Reacciona distinto con personas conocidas y desconocidas?', hint: 'Se pega a ti o se pone serio con alguien que no conoce.' },
    ],
  },
  {
    id: '1-2a',
    label: '1 a 2 años',
    range: '12 – 24 meses',
    milestones: [
      { id: 'c1', domain: 'motor', question: '¿Camina solo, sin apoyarse?', hint: 'Da varios pasos seguidos sin agarrarse de nada.' },
      { id: 'c2', domain: 'lenguaje', question: '¿Dice al menos tres palabras además de «mamá» y «papá»?', hint: 'Palabras que usa con intención, aunque no se pronuncien perfecto.' },
      { id: 'c3', domain: 'social', question: '¿Señala con el dedo lo que quiere o lo que le llama la atención?', hint: 'Señala y te mira, para compartir contigo lo que ve.' },
      { id: 'c4', domain: 'lenguaje', question: '¿Entiende órdenes simples como «dame la pelota»?', hint: 'Responde sin que se lo muestres con gestos.' },
      { id: 'c5', domain: 'cognitivo', question: '¿Imita lo que haces, como aplaudir, barrer o hablar por teléfono?', hint: 'Copia acciones cotidianas que te ve hacer.' },
      { id: 'c6', domain: 'motor', question: '¿Apila dos o tres objetos, como cubos o tapas?', hint: 'Los coloca uno encima de otro sin que se caigan de inmediato.' },
    ],
  },
  {
    id: '2-3a',
    label: '2 a 3 años',
    range: '24 – 36 meses',
    milestones: [
      { id: 'd1', domain: 'lenguaje', question: '¿Junta dos palabras para pedir algo, como «quiero agua»?', hint: 'Frases cortas de dos palabras, no palabras sueltas.' },
      { id: 'd2', domain: 'motor', question: '¿Corre y sube escalones apoyándose?', hint: 'Se mueve con seguridad, aunque todavía se agarre del pasamanos.' },
      { id: 'd3', domain: 'cognitivo', question: '¿Juega a «hacer como si», por ejemplo dar de comer a un muñeco?', hint: 'Juego de imaginación, no solo mover el objeto.' },
      { id: 'd4', domain: 'social', question: '¿Te mira a los ojos cuando le hablas o cuando juegan juntos?', hint: 'Busca tu mirada para compartir el momento.' },
      { id: 'd5', domain: 'social', question: '¿Se interesa por otros niños o juega cerca de ellos?', hint: 'Los observa, se acerca o los imita, aunque aún no comparta.' },
      { id: 'd6', domain: 'autonomia', question: '¿Come solo con cuchara o intenta vestirse?', hint: 'Lo intenta por su cuenta, aunque se ensucie o necesite ayuda.' },
    ],
  },
  {
    id: '3-5a',
    label: '3 a 5 años',
    range: '3 – 5 años',
    milestones: [
      { id: 'e1', domain: 'lenguaje', question: '¿Cuenta algo que le pasó de forma que se entiende?', hint: 'Relata un hecho simple del día con orden.' },
      { id: 'e2', domain: 'lenguaje', question: '¿Se le entiende cuando habla, incluso para alguien de fuera de casa?', hint: 'No hace falta que tú traduzcas lo que dice.' },
      { id: 'e3', domain: 'motor', question: '¿Salta con los dos pies juntos?', hint: 'Despega los dos pies del suelo a la vez.' },
      { id: 'e4', domain: 'social', question: '¿Juega con otros niños compartiendo o esperando su turno?', hint: 'Juego en conjunto, con reglas simples.' },
      { id: 'e5', domain: 'motor', question: '¿Dibuja figuras simples o copia una línea o un círculo?', hint: 'Sostiene el lápiz e intenta reproducir la forma.' },
      { id: 'e6', domain: 'cognitivo', question: '¿Sigue instrucciones de dos pasos, como «recoge el juguete y ponlo en la caja»?', hint: 'Cumple las dos partes sin que se lo repitas.' },
    ],
  },
];

export const COINS_PER_ANSWER = 50;
export const COINS_COMPLETION_BONUS = 100;

const answerScore: Record<Answer, number> = { si: 2, aveces: 1, todavia: 0 };

export type GameOutcome = {
  score: number;
  max: number;
  ratio: number;
  tone: 'strong' | 'watch' | 'consult';
  headline: string;
  message: string;
  /** Hitos respondidos «todavía no», que son los que conviene mirar con el equipo. */
  pending: Milestone[];
  coins: number;
};

export function evaluate(band: AgeBand, answers: Record<string, Answer>): GameOutcome {
  const items = band.milestones;
  const score = items.reduce((total, item) => total + answerScore[answers[item.id] ?? 'todavia'], 0);
  const max = items.length * 2;
  const ratio = max === 0 ? 0 : score / max;
  const pending = items.filter((item) => answers[item.id] === 'todavia');
  const coins = items.length * COINS_PER_ANSWER + COINS_COMPLETION_BONUS;

  // Los cortes ordenan la conversación, no clasifican al niño. Incluso el tramo más alto
  // termina invitando al control regular: un juego en casa no cierra un seguimiento.
  if (ratio >= 0.84) {
    return {
      score, max, ratio, pending, coins, tone: 'strong',
      headline: '¡Va muy bien!',
      message: `Respondiste que ${patientVerb(items.length - pending.length, items.length)} ya forman parte de su día a día. Sigue jugando y conversando con él, y mantén sus controles CRED al día.`,
    };
  }
  if (ratio >= 0.5) {
    return {
      score, max, ratio, pending, coins, tone: 'watch',
      headline: 'Hay cosas por reforzar',
      message: 'Varios logros ya aparecen y otros están en camino. Guarda este resultado en la libreta para que el equipo lo vea en el próximo control.',
    };
  }
  return {
    score, max, ratio, pending, coins, tone: 'consult',
    headline: 'Conviene conversarlo pronto',
    message: 'Marcaste varios logros como «todavía no». Eso no significa un diagnóstico, pero sí que vale la pena contarlo al equipo de salud sin esperar al próximo control.',
  };
}

function patientVerb(done: number, total: number) {
  return done === total ? 'todos los logros' : `${done} de ${total} logros`;
}

/** Texto que se guarda en la libreta familiar cuando la familia decide compartirlo. */
export function outcomeAsNote(band: AgeBand, answers: Record<string, Answer>, outcome: GameOutcome) {
  const lines = band.milestones.map((item) => {
    const label = answerLabels.find(([value]) => value === (answers[item.id] ?? 'todavia'))?.[1] ?? '';
    return `• ${item.question} — ${label}`;
  });
  return [
    `Juego del desarrollo (${band.range}) — ${outcome.score} de ${outcome.max}.`,
    ...lines,
    outcome.pending.length ? `Pendientes: ${outcome.pending.length} de ${band.milestones.length}.` : 'Sin logros marcados como pendientes.',
    'Respondido en casa por la familia. No es un diagnóstico.',
  ].join('\n');
}
