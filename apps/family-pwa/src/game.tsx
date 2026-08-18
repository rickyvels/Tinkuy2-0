// Juego del desarrollo.
//
// Es el mismo cuestionario de hitos que un control CRED recorre, pero conducido por Tinku y
// respondido en casa. El objetivo no es puntuar al niño: es que la familia observe con
// intención y que esa observación llegue al equipo por la libreta, que ya existe.
//
// Por eso el resultado siempre termina en dos salidas —guardar en la libreta o cerrar— y
// nunca en una etiqueta clínica.

import { useMemo, useState } from 'react';
import { ArrowRight, CaretLeft, CheckCircle, NotePencil, ShieldCheck, X } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Tinku } from './tinku';
import { familyApi } from './api';
import { COINS_PER_ANSWER, ageBands, answerLabels, domainLabels, evaluate, outcomeAsNote, type AgeBand, type Answer } from './milestones';

type Stage = 'intro' | 'age' | 'play' | 'result';

export function DevelopmentGame({ token, caseId, patientName, coins, onEarn, onClose, onSaved }: {
  token: string; caseId: number; patientName: string;
  coins: number; onEarn: (amount: number) => void;
  onClose: () => void; onSaved: () => void;
}) {
  const [stage, setStage] = useState<Stage>('intro');
  const [band, setBand] = useState<AgeBand | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const reduceMotion = useReducedMotion();

  const firstName = patientName.split(' ')[0];
  const outcome = useMemo(() => (band ? evaluate(band, answers) : null), [band, answers]);

  const answer = (value: Answer) => {
    if (!band) return;
    const milestone = band.milestones[index];
    setAnswers((current) => ({ ...current, [milestone.id]: value }));
    onEarn(COINS_PER_ANSWER);
    if (index + 1 < band.milestones.length) setIndex(index + 1);
    else setStage('result');
  };

  const save = async () => {
    if (!band || !outcome) return;
    setSaving(true); setError('');
    try {
      await familyApi.writeNote(token, caseId, {
        setting: 'casa',
        // Un resultado de juego es una observación de la familia, no una conclusión. Se marca
        // según lo que predominó, y el texto completo queda en la nota para que el equipo lea.
        progress: outcome.tone === 'consult' ? 'retroceso' : outcome.tone === 'watch' ? 'sin_cambios' : 'avance',
        observation: outcomeAsNote(band, answers, outcome),
        occurred_on: new Date().toLocaleDateString('en-CA'),
      });
      setSaved(true);
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar en la libreta.'); }
    finally { setSaving(false); }
  };

  const restart = () => { setStage('intro'); setBand(null); setIndex(0); setAnswers({}); setSaved(false); setError(''); };

  const total = band?.milestones.length ?? 0;
  const progress = total ? (stage === 'result' ? 1 : index / total) : 0;

  return <section className="tk-game" aria-labelledby="tk-game-title">
    <header className="tk-game-bar">
      <button onClick={stage === 'play' && index > 0 ? () => setIndex(index - 1) : onClose} aria-label={stage === 'play' && index > 0 ? 'Pregunta anterior' : 'Cerrar el juego'}>
        {stage === 'play' && index > 0 ? <CaretLeft weight="bold" /> : <X weight="bold" />}
      </button>
      <h1 id="tk-game-title">Juego del desarrollo</h1>
      <span className="tk-coin-pill"><span className="tk-coin" />{coins.toLocaleString('es-PE')}</span>
    </header>

    {stage === 'play' && band && <div className="tk-game-progress">
      <div className="tk-progress-track"><motion.i style={{ width: `${progress * 100}%` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: reduceMotion ? 0 : .35 }} /></div>
      <small>{index + 1} de {total} · {band.range}</small>
    </div>}

    <div className="tk-game-body">
      {stage === 'intro' && <motion.div className="tk-game-intro" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Tinku size={320} message="¡Hola! Soy Tinku" animation={reduceMotion ? 'none' : 'idle'} />
        <p className="tk-game-lead">Vamos a revisar juntos cómo va el desarrollo de {firstName}, con las mismas preguntas de la Libreta CRED del MINSA.</p>
        <p className="tk-game-note"><ShieldCheck weight="fill" /> Son preguntas sobre lo que ves en casa. No es un diagnóstico ni reemplaza el control de salud.</p>
        <button className="tk-primary" onClick={() => setStage('age')}>Empezar a jugar <ArrowRight weight="bold" /></button>
      </motion.div>}

      {stage === 'age' && <motion.div className="tk-game-step" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="tk-eyebrow">PRIMERO</p>
        <h2>¿Qué edad tiene {firstName}?</h2>
        <p className="tk-game-lead">Las preguntas cambian según la edad, igual que en la libreta.</p>
        <div className="tk-age-grid">{ageBands.map((option) => <button key={option.id} onClick={() => { setBand(option); setIndex(0); setAnswers({}); setStage('play'); }}>
          <strong>{option.label}</strong><small>{option.range}</small><ArrowRight weight="bold" />
        </button>)}</div>
      </motion.div>}

      {stage === 'play' && band && (() => {
        const milestone = band.milestones[index];
        const chosen = answers[milestone.id];
        return <motion.div key={milestone.id} className="tk-game-step" initial={reduceMotion ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .25 }}>
          <p className="tk-eyebrow">{domainLabels[milestone.domain].toUpperCase()}</p>
          <h2>{milestone.question}</h2>
          <p className="tk-game-hint"><Tinku className="tk-mascot-mini" size={38} animation="none" shadow={false} /><span>{milestone.hint}</span></p>
          <div className="tk-answers">{answerLabels.map(([value, label, detail]) => <button key={value} className={`tk-answer tk-answer-${value} ${chosen === value ? 'chosen' : ''}`} onClick={() => answer(value)}>
            <strong>{label}</strong><small>{detail}</small>
          </button>)}</div>
        </motion.div>;
      })()}

      {stage === 'result' && band && outcome && <motion.div className="tk-game-step" initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
        <div className={`tk-result tk-result-${outcome.tone}`}>
          <Tinku className="tk-mascot-result" size={132} animation={reduceMotion ? 'none' : 'idle'} />
          <p className="tk-eyebrow">RESULTADO DEL JUEGO</p>
          <h2>{outcome.headline}</h2>
          <div className="tk-score"><strong>{outcome.score}</strong><span>de {outcome.max} puntos</span></div>
          <p>{outcome.message}</p>
        </div>

        <div className="tk-earned"><span className="tk-coin" /> Ganaste {outcome.coins.toLocaleString('es-PE')} monedas con {firstName}</div>

        {outcome.pending.length > 0 && <section className="tk-pending">
          <h3>Lo que marcaste como «todavía no»</h3>
          <ul>{outcome.pending.map((item) => <li key={item.id}><span>{domainLabels[item.domain]}</span>{item.question}</li>)}</ul>
          <small>Cuéntaselo al equipo en el próximo control. Son las preguntas que más ayudan a orientar la evaluación.</small>
        </section>}

        {error && <p className="family-error" role="alert">{error}</p>}
        {saved
          ? <p className="tk-saved" role="status"><CheckCircle weight="fill" /> Guardado en la libreta. El equipo lo verá cuando revise el caso.</p>
          : <button className="tk-primary" onClick={() => void save()} disabled={saving}><NotePencil weight="fill" />{saving ? 'Guardando…' : 'Guardar en la libreta'}<ArrowRight weight="bold" /></button>}
        <button className="tk-ghost" onClick={restart}>Jugar otra vez</button>
        <button className="tk-ghost" onClick={onClose}>Volver al inicio</button>
        <p className="family-safety"><ShieldCheck weight="fill" /> Este juego ordena lo que observas en casa. No diagnostica ni reemplaza el control CRED ni una consulta con tu equipo de salud.</p>
      </motion.div>}
    </div>
  </section>;
}
