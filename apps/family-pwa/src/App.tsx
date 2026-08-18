import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, Baby, BookOpen, CalendarBlank, CalendarCheck, CaretLeft, CaretRight, ChatCircleText,
  CheckCircle, ClipboardText, Clock, ClockCountdown, FileText, GameController, Heartbeat, House,
  Key, MapPin, Minus, NotePencil, PaperPlaneTilt, Path, Phone, Play, ShieldCheck, SignOut, Star,
  Translate, TrendDown, TrendUp, User, UserCircle, UsersThree, WarningCircle,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage, type Lang, type StringKey } from './i18n';
import { familyApi, type BarrierReportPayload, type BarrierType, type CareStage, type CurrentCase, type FamilyAssistantReply, type FamilyData, type FamilyNote, type FamilyNotePayload, type FamilyNoteSummary, type NoteProgress, type NoteSetting, type Session } from './api';
import { Tinku, TinkuyEmblem } from './tinku';
import { siteUrl } from './site';
import { DevelopmentGame } from './game';

const DEMO_CREDENTIALS = import.meta.env.DEV || import.meta.env.VITE_DEMO_CREDENTIALS === 'true';
type FamilyScreen = 'home' | 'route' | 'agenda' | 'notebook' | 'documents' | 'team' | 'assistant' | 'profile' | 'game' | 'report';

// El orden es el del recorrido clínico y lo define la API con `care_stage`. Antes esta lista
// se recorría con una heurística local, así que la etapa mostrada no era un dato del caso.
const routeStages = [
  { id: 'detection', labelKey: 'stageDetection', shortKey: 'stageShortDetection', tone: 'blue' },
  { id: 'referral', labelKey: 'stageReferral', shortKey: 'stageShortReferral', tone: 'blue' },
  { id: 'assessment', labelKey: 'stageAssessment', shortKey: 'stageShortAssessment', tone: 'purple' },
  { id: 'intervention', labelKey: 'stageIntervention', shortKey: 'stageShortIntervention', tone: 'yellow' },
  { id: 'followup', labelKey: 'stageFollowup', shortKey: 'stageShortFollowup', tone: 'orange' },
  { id: 'discharge', labelKey: 'stageDischarge', shortKey: 'stageShortDischarge', tone: 'neutral' },
] as const satisfies ReadonlyArray<{ id: string; labelKey: StringKey; shortKey: StringKey; tone: string }>;

type Translate2 = (key: StringKey) => string;

const settingOptions: ReadonlyArray<readonly [NoteSetting, string]> = [
  ['casa', 'En casa'],
  ['colegio', 'En el colegio'],
  ['terapia', 'En terapia'],
  ['comunidad', 'En la comunidad'],
  ['otro', 'Otro momento'],
];

const progressOptions: ReadonlyArray<readonly [NoteProgress, string, string]> = [
  ['avance', 'Un avance', 'Algo que no hacía antes o que le costaba menos.'],
  ['sin_cambios', 'Sin cambios', 'Un día parecido a los anteriores.'],
  ['retroceso', 'Un retroceso', 'Algo que empeoró o que dejó de hacer.'],
];

function stageIndex(stage: CareStage) {
  const index = routeStages.findIndex((item) => item.id === stage);
  return index === -1 ? 0 : index;
}

function progressMeta(progress: NoteProgress) {
  if (progress === 'avance') return { label: 'Avance', tone: 'green', Icon: TrendUp } as const;
  if (progress === 'retroceso') return { label: 'Retroceso', tone: 'orange', Icon: TrendDown } as const;
  return { label: 'Sin cambios', tone: 'neutral', Icon: Minus } as const;
}

function formatDay(value: string) {
  // `occurred_on` viaja como AAAA-MM-DD. Construir la fecha con `new Date(value)` la
  // interpretaría como UTC y en Lima mostraría el día anterior.
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
}

const barrierOptions: ReadonlyArray<readonly [string, string, string, BarrierType]> = [
  ['transport', 'Transporte', 'No puedo llegar al establecimiento.', 'transport'],
  ['cost', 'Costo', 'El traslado o la atención genera un costo difícil de cubrir.', 'administrative'],
  ['schedule', 'Horario', 'El horario disponible no es compatible.', 'availability'],
  ['availability', 'Falta de cupos', 'No encuentro un cupo compatible.', 'availability'],
  ['documents', 'Documentos', 'Me falta un documento o no sé cuál presentar.', 'administrative'],
  ['connectivity', 'Conectividad', 'No pude comunicarme o conectarme.', 'administrative'],
  ['other', 'Otra dificultad', 'Necesito explicar otra situación al equipo.', 'other'],
];

// Las monedas son el enganche del juego, así que sobreviven al cierre de sesión igual que
// sobrevive el progreso de un juego cualquiera. No son un dato clínico y no viajan al backend.
// La cuenta arranca en cero y se gana jugando: un saldo de regalo al abrir la aplicación no
// premia nada. La clave lleva sufijo para que quien ya tenía el saldo de demostración anterior
// no se lo quede.
const COINS_KEY = 'tinkuy-coins-v2';
function readCoins() {
  try { return Number(window.localStorage.getItem(COINS_KEY) ?? '0') || 0; } catch { return 0; }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [caseData, setCaseData] = useState<CurrentCase | null>(null);
  const [screen, setScreen] = useState<FamilyScreen>('home');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(readCoins);
  const reduceMotion = useReducedMotion();
  const { lang, setLang, t, tr } = useLanguage();

  useEffect(() => { try { window.localStorage.setItem(COINS_KEY, String(coins)); } catch { /* sin persistencia */ } }, [coins]);

  const refresh = useCallback(async (token = session?.access_token) => {
    if (!token) return;
    setLoading(true);
    try {
      const [me, activeCase] = await Promise.all([familyApi.me(token), familyApi.currentCase(token)]);
      setFamily(me);
      setCaseData(activeCase);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar tu ruta.');
    } finally { setLoading(false); }
  }, [session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    // Durante el juego y el reporte no se refresca: ambos son formularios largos y un
    // re-render a media respuesta se lleva por delante lo que la persona estaba escribiendo.
    if (!session || screen === 'report' || screen === 'game') return;
    const interval = window.setInterval(() => void refresh(), 15000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [session, screen, refresh]);

  if (!session) return <FamilyLogin onSession={setSession} />;
  if (!family || !caseData) return <main className="family-loading tinkuy-app">{error ? <section className="family-recovery" role="alert"><WarningCircle weight="fill" /><h1>No pudimos abrir tu ruta.</h1><p>{error}</p><button onClick={() => void refresh()}>Reintentar</button><button className="recovery-secondary" onClick={() => setSession(null)}>Volver a ingresar</button></section> : <div className="route-loader"><Heartbeat weight="fill" /> Preparando tu ruta…</div>}</main>;

  const isPending = caseData.case.approval_status === 'pending';
  const isApproved = caseData.case.approval_status === 'approved';
  const isReported = caseData.case.route_status === 'barrier_reported' && caseData.case.approval_status === 'not_requested';
  const isInReview = isPending || isReported;

  const report = async (data: BarrierReportPayload) => {
    setLoading(true); setError('');
    try { await familyApi.report(session.access_token, caseData.case.id, data); await refresh(); setScreen('home'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo enviar el aviso.'); }
    finally { setLoading(false); }
  };
  const navigate = (next: FamilyScreen) => { setScreen(next); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); };

  if (screen === 'game') return <main className="family-app tinkuy-app">
    <DevelopmentGame
      token={session.access_token} caseId={caseData.case.id} patientName={family.family_profile.patient_name}
      coins={coins} onEarn={(amount) => setCoins((current) => current + amount)}
      onClose={() => navigate('home')} onSaved={() => void refresh()}
    />
  </main>;

  const titles: Partial<Record<FamilyScreen, string>> = {
    route: 'Mi ruta', agenda: 'Citas', notebook: 'Mi hijo', documents: 'Recursos',
    team: 'Familia y equipo', assistant: 'Ayuda', profile: 'Perfil',
  };

  return <main className="family-app tinkuy-app">
    <a className="family-skip" href="#family-content">{t('skipToContent')}</a>

    {screen === 'home'
      ? <TinkuyHero family={family} coins={coins} lang={lang} onLang={setLang} t={t} onGo={navigate} />
      : screen !== 'report' && <SubBar title={titles[screen] ?? ''} coins={coins} onBack={() => navigate('home')} />}

    {screen === 'report'
      ? <ReportScreen onBack={() => navigate('home')} onSubmit={report} loading={loading} error={error} />
      : <section id="family-content" className="family-workspace" tabIndex={-1}>
        <motion.div key={screen} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, ease: [0.23, 1, .32, 1] }}>
          {screen === 'home' && <HomeScreen caseData={caseData} isInReview={isInReview} isApproved={isApproved} loading={loading} error={error} tr={tr} onGo={navigate} />}
          {screen === 'route' && <RouteScreen family={family} caseData={caseData} isApproved={isApproved} isPending={isPending} isReported={isReported} isInReview={isInReview} loading={loading} error={error} t={t} tr={tr} onReport={() => navigate('report')} onAgenda={() => navigate('agenda')} />}
          {screen === 'agenda' && <AgendaScreen caseData={caseData} isApproved={isApproved} isInReview={isInReview} onReport={() => navigate('report')} />}
          {screen === 'notebook' && <NotebookScreen token={session.access_token} caseId={caseData.case.id} patientName={family.family_profile.patient_name} />}
          {screen === 'documents' && <DocumentsScreen isInReview={isInReview} />}
          {screen === 'team' && <TeamScreen isApproved={isApproved} isInReview={isInReview} />}
          {screen === 'assistant' && <AssistantScreen token={session.access_token} />}
          {screen === 'profile' && <ProfileScreen family={family} coins={coins} lang={lang} onLang={setLang} onGo={navigate} onSignOut={() => setSession(null)} />}
        </motion.div>
        <TinkuyNav current={screen} onChange={navigate} />
      </section>}
  </main>;
}

/* ------------------------------------------------------------------------ Inicio -------- */

function TinkuyHero({ family, coins, lang, onLang, t, onGo }: {
  family: FamilyData; coins: number; lang: Lang; onLang: (next: Lang) => void;
  t: Translate2; onGo: (screen: FamilyScreen) => void;
}) {
  const quick = [
    { id: 'notebook', label: 'Mi hijo', Icon: Baby },
    { id: 'route', label: 'Mi Ruta', Icon: Path },
    { id: 'documents', label: 'Recursos', Icon: BookOpen },
    { id: 'team', label: 'Familia', Icon: UsersThree },
  ] as const;

  return <header className="tk-hero">
    {/* El héroe ya no lleva degradado ni capas de contraste: el fondo es el crema del propio
        logotipo y el texto va en el azul de la marca, así que no hace falta velar nada. */}
    <div className="tk-hero-bar">
      <span className="tk-brand-name">Tinkuy</span>
      <span className="tk-spacer" />
      <span className="tk-coin-pill"><span className="tk-coin" />{coins.toLocaleString('es-PE')}</span>
      <button className="tk-icon-btn" onClick={() => onLang(lang === 'es' ? 'qu' : 'es')} aria-label={`${t('languageLabel')}: ${lang === 'es' ? 'Runasimi' : 'Español'}`}>
        <Translate weight="bold" />
      </button>
    </div>

    <div className="tk-hero-art"><TinkuyLogo /></div>

    <div className="tk-hero-greeting">
      <p className="tk-hero-greet">Bienvenido</p>
      <h1 className="tk-hero-name">{family.user.full_name}</h1>
    </div>

    <nav className="tk-quick" aria-label="Accesos rápidos">
      {quick.map(({ id, label, Icon }) => <button key={id} onClick={() => onGo(id)}>
        <i><Icon weight="fill" /></i><span>{label}</span>
      </button>)}
    </nav>
  </header>;
}

/**
 * Logotipo del héroe.
 *
 * Usa `public/tinkuy-logo.png` en cuanto exista. Mientras no esté, cae al emblema vectorial
 * —la misma escena— en vez de dejar el hueco de una imagen rota. Soltar el PNG en `public/`
 * basta para que aparezca: no hay nada más que tocar.
 */
function TinkuyLogo() {
  const [missing, setMissing] = useState(false);
  if (missing) return <TinkuyEmblem className="tk-hero-emblem" />;
  return <img className="tk-hero-logo" src="/tinkuy-logo.png" alt="Tinkuy · Crecer juntos, detectar a tiempo" onError={() => setMissing(true)} />;
}

function SubBar({ title, coins, onBack }: { title: string; coins: number; onBack: () => void }) {
  return <header className="tk-subbar">
    <button onClick={onBack} aria-label="Volver al inicio"><CaretLeft weight="bold" /></button>
    <h1>{title}</h1>
    <span className="tk-coin-pill"><span className="tk-coin" />{coins.toLocaleString('es-PE')}</span>
  </header>;
}

function HomeScreen({ caseData, isInReview, isApproved, loading, error, tr, onGo }: {
  caseData: CurrentCase; isInReview: boolean; isApproved: boolean; loading: boolean; error: string;
  tr: (text: string | null | undefined) => string; onGo: (screen: FamilyScreen) => void;
}) {
  const stage = stageIndex(caseData.case.care_stage);
  const task = caseData.tasks[0];

  return <div className="tk-body">
    <button className="tk-game-card" onClick={() => onGo('game')}>
      <span className="tk-game-thumb"><Tinku size={62} animation="none" shadow={false} /></span>
      <span className="tk-game-copy">
        <span className="tk-game-card-eyebrow">JUEGO DEL DESARROLLO <Star weight="fill" /></span>
        <h3>Revisa el desarrollo de tu hijo jugando</h3>
        <p>5 min · preguntas de la Libreta CRED</p>
      </span>
      <span className="tk-play-col">
        <span className="tk-play"><Play weight="fill" /></span>
        <span>Jugar</span>
      </span>
    </button>

    <section className="tk-dark-card" aria-labelledby="tk-next-title">
      <i><CalendarCheck weight="fill" /></i>
      <div className="tk-dark-body">
        <div className="tk-dark-title">
          <h2 id="tk-next-title">Próxima atención</h2>
          {/* El diseño trae «EN 2 DÍAS» como dato de ejemplo. Aquí no se inventa una cuenta
              atrás: mientras el equipo no confirme fecha, la etiqueta dice lo que hay. */}
          <span className="tk-badge">{task ? 'POR CONFIRMAR' : 'SIN FECHA'}</span>
        </div>
        {(() => {
          // La propuesta autorizada suele venir con la sede incluida. Repetirla debajo hacía
          // que la tarjeta dijera dos veces lo mismo.
          const when = task ? tr(task.authorized_proposal) || 'Fecha y hora por confirmar' : 'El equipo confirmará fecha y hora contigo';
          const where = task ? tr(task.owner) : 'Sede por definir';
          return <p className="tk-dark-detail">{when}{where && !when.includes(where) && <><br />{where}</>}</p>;
        })()}
        <div className="tk-dark-actions">
          <button className="tk-solid" onClick={() => onGo('agenda')}>Ver detalles</button>
          <button onClick={() => onGo('report')} disabled={loading || isInReview}>{isInReview ? 'En revisión' : 'Coordinar'}</button>
        </div>
      </div>
    </section>

    <div>
      <div className="tk-section-head">
        <h2>Último proceso</h2>
        <button onClick={() => onGo('route')}>Ver todo</button>
      </div>
      <button className="tk-process" onClick={() => onGo('route')}>
        <span className="tk-process-head">
          <i><ClipboardText weight="fill" /></i>
          <div>
            <strong>{task ? tr(task.title) : 'Coordinación de la ruta'}</strong>
            {/* Seis etapas, no cinco: el total lo define `care_stage` de la API. */}
            <small>Paso {stage + 1} de 6 · {isInReview ? 'en revisión del equipo' : isApproved ? 'autorizado' : 'en curso'}</small>
          </div>
        </span>
        <span className="tk-process-bar"><i style={{ width: `${((stage + 1) / 6) * 100}%` }} /></span>
      </button>
    </div>

    <button className="tk-help-card" onClick={() => onGo('assistant')}>
      <i><ChatCircleText weight="fill" /></i>
      <div><strong>¿Tienes una duda?</strong><small>Pregunta por tu ruta, tus documentos o cómo avisar una dificultad.</small></div>
      <CaretRight weight="bold" />
    </button>

    {error && <p className="family-error" role="alert">{error}</p>}
    <p className="family-safety"><ShieldCheck weight="fill" /> Tinkuy organiza el seguimiento. El equipo de salud conserva todas las decisiones de atención.</p>
  </div>;
}

function ProfileScreen({ family, coins, lang, onLang, onGo, onSignOut }: {
  family: FamilyData; coins: number; lang: Lang; onLang: (next: Lang) => void;
  onGo: (screen: FamilyScreen) => void; onSignOut: () => void;
}) {
  const initials = family.user.full_name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <div className="tk-body">
    <section className="tk-profile-card">
      <i>{initials}</i>
      <div>
        <strong>{family.user.full_name}</strong>
        <small>{family.family_profile.relationship} de {family.family_profile.patient_name}</small>
      </div>
    </section>

    <div className="tk-profile-rows">
      <div><i><User weight="fill" /></i><span>Distrito</span><small>{family.family_profile.district}</small></div>
      <div><i><span className="tk-coin" /></i><span>Monedas</span><small>{coins.toLocaleString('es-PE')}</small></div>
      <button onClick={() => onLang(lang === 'es' ? 'qu' : 'es')}><i><Translate weight="fill" /></i><span>Idioma</span><small>{lang === 'es' ? 'Español' : 'Runasimi'}</small></button>
      <button onClick={() => onGo('team')}><i><UsersThree weight="fill" /></i><span>Mi equipo de salud</span><CaretRight weight="bold" /></button>
      <button onClick={() => onGo('documents')}><i><FileText weight="fill" /></i><span>Mis documentos</span><CaretRight weight="bold" /></button>
      <button onClick={() => onGo('assistant')}><i><ChatCircleText weight="fill" /></i><span>Ayuda</span><CaretRight weight="bold" /></button>
      <a href={siteUrl}><i><House weight="fill" /></i><span>Sitio de Tinkuy</span><CaretRight weight="bold" /></a>
    </div>

    <button className="tk-ghost" onClick={onSignOut}><SignOut weight="bold" /> Cerrar sesión</button>
    <p className="family-safety"><ShieldCheck weight="fill" /> Tus datos se usan para coordinar la atención de {family.family_profile.patient_name.split(' ')[0]} con el equipo de salud.</p>
  </div>;
}

function TinkuyNav({ current, onChange }: { current: FamilyScreen; onChange: (screen: FamilyScreen) => void }) {
  // El diseño rotula la primera pestaña «Home». Se traduce a «Inicio»: es la única palabra en
  // inglés de una aplicación en español y quechua, dirigida a familias que en muchos casos no
  // leen inglés. Todo lo demás del rótulo se respeta tal cual.
  const left = [{ id: 'home', label: 'Inicio', Icon: House }, { id: 'documents', label: 'Recursos', Icon: BookOpen }] as const;
  const right = [{ id: 'agenda', label: 'Citas', Icon: CalendarBlank }, { id: 'profile', label: 'Perfil', Icon: User }] as const;
  return <nav className="tk-nav" aria-label="Secciones principales">
    {left.map(({ id, label, Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)} aria-current={current === id ? 'page' : undefined}>
      <Icon weight={current === id ? 'fill' : 'regular'} /><span>{label}</span>
    </button>)}
    <div className="tk-nav-play-cell">
      <div>
        <button className="tk-nav-play" onClick={() => onChange('game')} aria-label="Abrir el juego del desarrollo"><GameController weight="fill" /></button>
        <span>Jugar</span>
      </div>
    </div>
    {right.map(({ id, label, Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)} aria-current={current === id ? 'page' : undefined}>
      <Icon weight={current === id ? 'fill' : 'regular'} /><span>{label}</span>
    </button>)}
  </nav>;
}

/* ------------------------------------------------------------- Pantallas existentes ----- */

function RouteScreen({ family, caseData, isApproved, isPending, isReported, isInReview, loading, error, t, tr, onReport, onAgenda }: { family: FamilyData; caseData: CurrentCase; isApproved: boolean; isPending: boolean; isReported: boolean; isInReview: boolean; loading: boolean; error: string; t: Translate2; tr: (text: string | null | undefined) => string; onReport: () => void; onAgenda: () => void }) {
  const stage = stageIndex(caseData.case.care_stage); const firstName = family.user.full_name.split(' ')[0]; const task = caseData.tasks[0];
  return <div className="health-home">
    <section className="family-welcome"><div><p className="family-kicker">{t('greeting')}, {firstName.toUpperCase()}</p><h1>{family.family_profile.patient_name} · {t(routeStages[stage].labelKey)}</h1><p>{tr(caseData.case.family_message)}</p></div><span className="demo-chip">{t('demoChip')}</span></section>
    <section className="stage-summary tone-purple" aria-labelledby="stage-title"><div className="stage-summary-icon"><Heartbeat weight="fill" /></div><div><span>{t('stageOf')} {stage + 1} / 6</span><h2 id="stage-title">{t(routeStages[stage].labelKey)}</h2><p>{isPending ? 'El equipo revisa la propuesta antes de continuar.' : isReported ? 'Tu aviso llegó al equipo y se está organizando la información.' : isApproved ? 'El siguiente paso fue autorizado y está en coordinación.' : 'El equipo mantiene visible el siguiente paso de la ruta.'}</p></div><strong>{isInReview ? 'En revisión' : isApproved ? 'Autorizada' : 'En curso'}</strong></section>
    <section className="route-overview" aria-labelledby="route-title"><div className="section-heading"><div><span>{t('myRoute')}</span><h2 id="route-title">{t('routeHeading')}</h2></div><small>{stage + 1} {t('of')} 6</small></div><ol className="route-stage-list">{routeStages.map((item, index) => <li key={item.id} className={`${item.tone} ${index < stage ? 'complete' : ''} ${index === stage ? 'current' : ''}`}><i>{index < stage ? <CheckCircle weight="fill" /> : index + 1}</i><span>{t(item.shortKey)}</span><small>{index < stage ? t('stepComplete') : index === stage ? t('stepCurrent') : t('stepPending')}</small></li>)}</ol></section>
    <section className="next-appointment tone-yellow"><div className="date-block date-pending"><CalendarBlank weight="fill" /><span>POR CONFIRMAR</span></div><div><span>LO SIGUIENTE</span><h2>{task?.title || 'Próxima coordinación del equipo'}</h2><p><Clock weight="fill" /> {task?.authorized_proposal || 'El equipo confirmará fecha, hora y sede contigo.'}</p><small>{task ? 'Acción registrada; horario aún no informado' : 'Todavía no existe una cita confirmada'}</small></div><button onClick={onAgenda}>Ver detalles <ArrowRight /></button></section>
    {task ? <section className="family-task tone-green"><CheckCircle weight="fill" /><div><span>TAREA CONFIRMADA</span><h2>{tr(task.title)}</h2><p>{tr(task.authorized_proposal)}</p></div></section> : <section className="family-task tone-yellow"><ClockCountdown weight="fill" /><div><span>ACCIÓN PENDIENTE</span><h2>{isInReview ? 'Espera la revisión del equipo' : 'Mantén tu disponibilidad actualizada'}</h2><p>{isInReview ? 'No necesitas enviar otro aviso. Te mostraremos aquí cualquier cambio.' : 'Si aparece una dificultad, avisa al equipo desde esta aplicación.'}</p></div></section>}
    {error && <p className="family-error" role="alert">{error}</p>}<button className="report-button" onClick={onReport} disabled={loading || isInReview}><WarningCircle weight="fill" />{isInReview ? t('reportInReview') : t('reportBarrier')}<ArrowRight weight="bold" /></button><p className="family-safety"><ShieldCheck weight="fill" /> {t('safetyNote')}</p>
  </div>;
}

function AgendaScreen({ caseData, isApproved, isInReview, onReport }: { caseData: CurrentCase; isApproved: boolean; isInReview: boolean; onReport: () => void }) {
  const task = caseData.tasks[0];
  return <div className="family-panel health-panel"><p className="family-kicker">AGENDA</p><h1>Próximas coordinaciones</h1><p className="family-message">Revisa qué está confirmado y qué sigue pendiente.</p><section className="appointment-feature tone-yellow"><div className="date-block date-pending"><CalendarBlank weight="fill" /><span>POR CONFIRMAR</span></div><div><span>PRÓXIMA COORDINACIÓN</span><h2>{task?.title || 'Horario pendiente del equipo'}</h2><p><Clock /> {task?.authorized_proposal || 'Fecha y hora aún no informadas'}</p><p><MapPin /> Sede por confirmar contigo</p></div><strong className="status-pill">{task || isApproved ? 'En coordinación' : 'Por confirmar'}</strong></section><section className="agenda-timeline"><h2>Estado de la coordinación</h2><TimelineItem tone="green" title="Solicitud recibida" detail="El equipo tiene la información de la ruta." /><TimelineItem tone="purple" title="Revisión profesional" detail={isInReview ? 'En curso. Te avisaremos cuando termine.' : 'Información revisada por el equipo.'} current={isInReview} /><TimelineItem tone="yellow" title="Confirmación contigo" detail={task ? task.authorized_proposal || 'El equipo coordina el horario.' : 'Aún no se ha confirmado un cambio.'} current={!isInReview && !task} /></section><button className="secondary-action" onClick={onReport} disabled={isInReview}><WarningCircle weight="fill" /><span><strong>{isInReview ? 'Tu aviso ya está en revisión' : 'Actualizar mi disponibilidad'}</strong><small>{isInReview ? 'Espera la respuesta antes de enviar otro aviso.' : 'Informa un cambio de horario o una dificultad.'}</small></span><ArrowRight /></button><p className="family-safety"><ShieldCheck weight="fill" /> La aplicación no asigna ni cambia citas por sí sola.</p></div>;
}

function NotebookScreen({ token, caseId, patientName }: { token: string; caseId: number; patientName: string }) {
  // `en-CA` da AAAA-MM-DD en hora local. `toISOString()` daría la fecha en UTC y en Lima
  // permitiría elegir el día siguiente durante la noche.
  const today = new Date().toLocaleDateString('en-CA');
  const emptyDraft: FamilyNotePayload = { setting: 'casa', progress: 'avance', observation: '', occurred_on: today };
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [summary, setSummary] = useState<FamilyNoteSummary | null>(null);
  const [draft, setDraft] = useState<FamilyNotePayload>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { const data = await familyApi.notebook(token); setNotes(data.notes); setSummary(data.summary); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir la libreta.'); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await familyApi.writeNote(token, caseId, { ...draft, observation: draft.observation.trim() });
      setDraft({ ...emptyDraft });
      setNotice('Tu nota quedó guardada. El equipo la verá cuando revise el caso.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la nota.'); }
    finally { setSaving(false); }
  };

  return <div className="family-panel health-panel">
    <p className="family-kicker">LIBRETA</p>
    <h1>El día a día de {patientName.split(' ')[0]}</h1>
    <p className="family-message">Lo que ves en casa, el colegio o la terapia es información que el equipo no tiene. Escríbelo aquí y quedará en su historia.</p>

    {summary && summary.total > 0 && <section className="notebook-summary" aria-label="Resumen de tus notas">
      <div className="notebook-count"><strong>{summary.total}</strong><span>notas escritas</span></div>
      <ul className="notebook-tally">
        <li className="green"><TrendUp weight="fill" /> {summary.advances} avances</li>
        <li className="neutral"><Minus weight="bold" /> {summary.steady} sin cambios</li>
        <li className="orange"><TrendDown weight="fill" /> {summary.setbacks} retrocesos</li>
      </ul>
      <small>{summary.pending_review === 0 ? 'El equipo revisó todas tus notas.' : `${summary.pending_review} pendiente${summary.pending_review === 1 ? '' : 's'} de revisión`}</small>
    </section>}

    <form className="notebook-form" onSubmit={submit}>
      <h2>Escribir una nota</h2>

      <fieldset>
        <legend>¿Dónde ocurrió?</legend>
        <div className="notebook-chips">{settingOptions.map(([value, label]) => <button key={value} type="button" className={draft.setting === value ? 'active' : ''} aria-pressed={draft.setting === value} onClick={() => setDraft((current) => ({ ...current, setting: value }))}>{label}</button>)}</div>
      </fieldset>

      <fieldset>
        <legend>¿Cómo lo viste?</legend>
        <div className="notebook-progress">{progressOptions.map(([value, label, hint]) => {
          const { Icon, tone } = progressMeta(value);
          return <label key={value} className={`${tone} ${draft.progress === value ? 'active' : ''}`}>
            <input type="radio" name="progress" value={value} checked={draft.progress === value} onChange={() => setDraft((current) => ({ ...current, progress: value }))} />
            <Icon weight="fill" /><strong>{label}</strong><small>{hint}</small>
          </label>;
        })}</div>
      </fieldset>

      <label className="notebook-field" htmlFor="note-date">¿Qué día fue?
        <input id="note-date" type="date" max={today} value={draft.occurred_on} onChange={(event) => setDraft((current) => ({ ...current, occurred_on: event.target.value }))} required />
      </label>

      <label className="notebook-field" htmlFor="note-observation">¿Qué pasó?
        <textarea id="note-observation" rows={4} minLength={10} maxLength={2000} required placeholder="Por ejemplo: hoy en el colegio esperó su turno sin ayuda, algo que antes le costaba." value={draft.observation} onChange={(event) => setDraft((current) => ({ ...current, observation: event.target.value }))} />
        <small>{draft.observation.trim().length < 10 ? 'Escribe al menos una frase completa.' : `${draft.observation.length} de 2000 caracteres`}</small>
      </label>

      {error && <p className="family-error" role="alert">{error}</p>}
      {notice && <p className="notebook-notice" role="status">{notice}</p>}
      <button type="submit" className="report-button" disabled={saving || draft.observation.trim().length < 10}><NotePencil weight="fill" />{saving ? 'Guardando…' : 'Guardar en la libreta'}<ArrowRight weight="bold" /></button>
    </form>

    <section className="notebook-timeline" aria-label="Tus notas anteriores">
      <h2>Lo que has registrado</h2>
      {notes.length === 0 ? <p className="notebook-empty">Todavía no hay notas. La primera puede ser algo pequeño de hoy.</p> : <ol>{notes.map((note) => {
        const { label, tone, Icon } = progressMeta(note.progress);
        return <li key={note.id} className={tone}>
          <div className="notebook-entry-head">
            <span className="notebook-badge"><Icon weight="fill" /> {label}</span>
            <time dateTime={note.occurred_on}>{formatDay(note.occurred_on)}</time>
            <small>{settingOptions.find(([value]) => value === note.setting)?.[1]}</small>
          </div>
          <p>{note.observation}</p>
          {note.professional_comment
            ? <p className="notebook-reply"><ShieldCheck weight="fill" /> <span><strong>Respuesta del equipo:</strong> {note.professional_comment}</span></p>
            : <p className="notebook-pending"><ClockCountdown /> Pendiente de revisión del equipo</p>}
        </li>;
      })}</ol>}
    </section>

    <p className="family-safety"><ShieldCheck weight="fill" /> Tus notas se guardan en el caso y las lee el equipo. Escribirlas no cambia una cita ni reemplaza una consulta.</p>
  </div>;
}

function DocumentsScreen({ isInReview }: { isInReview: boolean }) { return <div className="family-panel health-panel"><p className="family-kicker">DOCUMENTOS</p><h1>Lo necesario para continuar</h1><p className="family-message">Identifica qué documento ya está disponible y cuál falta.</p><section className="document-list"><DocumentItem tone="green" title="Referencia de primer nivel" status="Recibida" detail="Disponible para el equipo responsable." /><DocumentItem tone="yellow" title="Observaciones de la familia" status={isInReview ? 'En revisión' : 'Pendiente'} detail="Puedes completarlas si el equipo solicita más contexto." /><DocumentItem tone="neutral" title="Informe de evaluación" status="Aún no disponible" detail="Aparecerá después de la evaluación y validación profesional." /></section><section className="info-card tone-blue"><FileText weight="fill" /><div><h2>Antes de tu atención</h2><p>Lleva tu documento de identidad y cualquier informe previo que el establecimiento te haya solicitado.</p></div></section><p className="family-safety"><ShieldCheck weight="fill" /> Los estados mostrados pertenecen al caso sintético del MVP.</p></div>; }

function TeamScreen({ isApproved, isInReview }: { isApproved: boolean; isInReview: boolean }) { return <div className="family-panel health-panel"><p className="family-kicker">MI EQUIPO</p><h1>Quién acompaña la ruta</h1><p className="family-message">Cada tarjeta muestra qué función cumple y su estado actual.</p><section className="team-list"><TeamMember initials="CR" tone="green" role="CRED / primer nivel" action="Referencia registrada" /><TeamMember initials="PS" tone="purple" role="Psicología" action={isInReview ? 'Revisando información' : 'Evaluación especializada'} /><TeamMember initials="CO" tone="yellow" role="Coordinación de atención" action={isApproved ? 'Coordinando el siguiente paso' : 'A la espera de validación'} /></section><section className="info-card tone-blue"><Phone weight="fill" /><div><h2>¿Necesitas comunicarte?</h2><p>Usa “Ayuda” para entender tu ruta o reporta una dificultad para que el equipo la revise.</p></div></section></div>; }

type ChatMessage = { role: 'assistant' | 'family'; text: string; meta?: string };
function assistantSourceLabel(reply: FamilyAssistantReply) {
  return reply.provider === 'ollama'
    ? `Modelo local · ${reply.model}`
    : reply.model === 'safety-rules-v1'
      ? 'Respuesta de seguridad · sin modelo'
      : reply.model === 'rate-limit-v1'
        ? 'Espera breve · protección contra consultas repetidas'
        : reply.model === 'demo-offline-v1'
          ? 'Demostración sin conexión con el servidor'
          : 'Respuesta de respaldo · Qwen no estuvo disponible';
}
function AssistantScreen({ token }: { token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hola. Puedo explicarte tu ruta y cómo coordinar una dificultad. No reemplazo al equipo de salud.' }]); const [draft, setDraft] = useState(''); const [loading, setLoading] = useState(false);
  const ask = async (question: string) => { const trimmed = question.trim(); if (trimmed.length < 2 || loading) return; setMessages((current) => [...current, { role: 'family', text: trimmed }]); setDraft(''); setLoading(true); try { const reply: FamilyAssistantReply = await familyApi.assistant(token, trimmed); setMessages((current) => [...current, { role: 'assistant', text: reply.answer, meta: assistantSourceLabel(reply) }]); } catch { setMessages((current) => [...current, { role: 'assistant', text: 'No pude responder ahora. Revisa tu ruta o avisa al equipo si tienes una dificultad.', meta: 'Sin conexión con Qwen ni respuesta de respaldo' }]); } finally { setLoading(false); } };
  return <div className="family-panel assistant-panel health-panel"><p className="family-kicker">AYUDA</p><h1>¿Qué necesitas entender?</h1><p className="family-message">Pregunta por los pasos y estados confirmados de tu ruta. Las preguntas abiertas se responden con el modelo local cuando está disponible.</p><div className="quick-questions"><button onClick={() => void ask('¿Qué sigue en mi ruta?')}>¿Qué sigue?</button><button onClick={() => void ask('¿Cómo reporto una dificultad?')}>Reportar dificultad</button><button onClick={() => void ask('¿Qué documentos necesito?')}>Mis documentos</button></div><div className="chat-log" aria-live="polite">{messages.map((message, index) => <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}><p>{message.text}</p>{message.meta && <small>{message.meta}</small>}</article>)}{loading && <article className="chat-message assistant"><p>Consultando al modelo local con la información confirmada…</p><small>La respuesta se valida antes de mostrarla</small></article>}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); void ask(draft); }}><label htmlFor="family-chat">Escribe una pregunta sobre tu ruta</label><div><input id="family-chat" value={draft} maxLength={800} onChange={(event) => setDraft(event.target.value)} placeholder="Por ejemplo: ¿qué debo hacer ahora?" /><button aria-label="Enviar pregunta" disabled={loading || draft.trim().length < 2}><PaperPlaneTilt weight="fill" /></button></div></form><p className="family-safety"><ShieldCheck weight="fill" /> El modelo local no diagnostica ni indica tratamientos. En una urgencia, contacta al servicio de emergencia o a tu equipo de salud.</p></div>;
}

function LanguageToggle({ lang, onChange, label }: { lang: Lang; onChange: (next: Lang) => void; label: string }) {
  // Los códigos se muestran tal cual porque cada idioma se nombra a sí mismo: quien busca
  // quechua reconoce «QU» aunque la interfaz esté en español, y al revés.
  const options: ReadonlyArray<readonly [Lang, string, string]> = [['es', 'ES', 'Español'], ['qu', 'QU', 'Runasimi']];
  return <div className="lang-toggle" role="group" aria-label={label}>
    {options.map(([value, short, full]) => <button key={value} type="button" lang={value} title={full} aria-pressed={lang === value} className={lang === value ? 'active' : ''} onClick={() => onChange(value)}>{short}</button>)}
  </div>;
}

function FamilyLogin({ onSession }: { onSession: (session: Session) => void }) {
  // El selector también vive aquí: quien necesita quechua lo necesita antes de poder entrar.
  const { lang, setLang, t } = useLanguage();
  // Los campos arrancan vacíos aunque sea una demostración: prellenarlos escondía el estado
  // real del formulario y hacía que nadie leyera lo que estaba enviando. Las credenciales de
  // prueba se muestran bajo el botón.
  const [mode, setMode] = useState<'login' | 'register'>('login'); const [dni, setDni] = useState(''); const [password, setPassword] = useState(''); const [registration, setRegistration] = useState({ dni: '', password: '', password_confirm: '', companion_name: '', patient_name: '', relationship: '', phone: '', district: '', consent_confirmed: false }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 16); const updateRegistration = (field: keyof typeof registration, value: string | boolean) => setRegistration((current) => ({ ...current, [field]: value }));
  const submitLogin = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { const nextSession = await familyApi.login(dni, password); if (nextSession.user.role !== 'family') throw new Error('Este acceso es para el acompañante familiar.'); onSession(nextSession); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos verificar tus datos.'); } finally { setLoading(false); } };
  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (registration.password !== registration.password_confirm) { setError('Las dos contraseñas no coinciden.'); return; }
    setLoading(true); setError('');
    try {
      // El registro devuelve una sesión, así que la familia entra directamente en vez de
      // quedarse esperando una habilitación que no tenía dónde ocurrir.
      const session = await familyApi.register({
        dni: onlyDigits(registration.dni), password: registration.password,
        companion_name: registration.companion_name, patient_name: registration.patient_name,
        relationship: registration.relationship, phone: registration.phone,
        district: registration.district, consent_confirmed: true,
      });
      onSession(session);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos crear tu acceso.'); }
    finally { setLoading(false); }
  };
  return <main className="family-login tinkuy-login tinkuy-app">
    <section>
      <div className="family-login-brand">
        <strong>Tinkuy<small className="tk-login-tagline">Crecer juntos, detectar a tiempo</small></strong>
        <LanguageToggle lang={lang} onChange={setLang} label={t('languageLabel')} />
      </div>

      <p>{mode === 'login' ? t('loginAccess') : 'CREAR MI ACCESO'}</p>
      <h1>{mode === 'login' ? t('loginTitle') : 'Empecemos con tus datos.'}</h1>
      <span>{mode === 'login' ? t('loginSubtitle') : 'Son cuatro datos tuyos y dos del niño o niña. Eliges una contraseña y entras de inmediato; el equipo verifica después.'}</span>

      <div className="access-tabs" role="tablist" aria-label="Acceso familiar">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>{t('tabLogin')}</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>{t('tabRegister')}</button>
      </div>

      {mode === 'login' ? <form onSubmit={submitLogin}>
        <label>DNI<input inputMode="numeric" maxLength={16} autoComplete="username" value={dni} onChange={(event) => setDni(onlyDigits(event.target.value))} /></label>
        <label>{t('password')}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="family-error" role="alert">{error}</div>}
        <button disabled={loading}><Key weight="fill" />{loading ? t('checking') : t('enterRoute')}</button>
        {DEMO_CREDENTIALS && <p className="tk-demo-hint">Demostración con datos sintéticos. Entra con el DNI <b>12345678</b> y la contraseña <b>familia123</b>.</p>}
        {/* Quien llega aquí por la dirección de la PWA no tiene forma de alcanzar la portada
            del proyecto, que vive en otro origen. Este es el reverso del enlace que la
            portada usa para abrir la aplicación. */}
        <a className="tk-site-link" href={siteUrl}><CaretLeft weight="bold" /> Conocer el proyecto Tinkuy</a>
      </form> : <form onSubmit={submitRegistration} className="registration-form">
        {/* Antes eran nueve campos seguidos en una sola columna. Agrupados en tres bloques,
            quien registra sabe cuánto le falta y de quién está hablando en cada momento. */}
        <fieldset>
          <legend>Sobre ti</legend>
          <label>Tu nombre completo<input required autoComplete="name" value={registration.companion_name} onChange={(event) => updateRegistration('companion_name', event.target.value)} /></label>
          <label>DNI<input required inputMode="numeric" maxLength={16} autoComplete="username" value={registration.dni} onChange={(event) => updateRegistration('dni', onlyDigits(event.target.value))} /><small>Solo números. Será tu usuario para entrar.</small></label>
          <label>Teléfono de contacto<input required inputMode="tel" autoComplete="tel" value={registration.phone} onChange={(event) => updateRegistration('phone', event.target.value)} /></label>
          <label>Distrito<input required value={registration.district} onChange={(event) => updateRegistration('district', event.target.value)} /></label>
        </fieldset>

        <fieldset>
          <legend>Sobre el niño o la niña</legend>
          <label>Su nombre<input required value={registration.patient_name} onChange={(event) => updateRegistration('patient_name', event.target.value)} /></label>
          <label>Tu vínculo con él o ella<input required placeholder="Madre, padre, tutor/a…" value={registration.relationship} onChange={(event) => updateRegistration('relationship', event.target.value)} /></label>
        </fieldset>

        <fieldset>
          <legend>Tu contraseña</legend>
          <label>Crea tu contraseña<input required type="password" minLength={8} autoComplete="new-password" value={registration.password} onChange={(event) => updateRegistration('password', event.target.value)} /><small>Mínimo 8 caracteres.</small></label>
          <label>Repítela<input required type="password" minLength={8} autoComplete="new-password" value={registration.password_confirm} onChange={(event) => updateRegistration('password_confirm', event.target.value)} /></label>
        </fieldset>

        <label className="consent-check">
          <input required type="checkbox" checked={registration.consent_confirmed} onChange={(event) => updateRegistration('consent_confirmed', event.target.checked)} />
          <span>Confirmo que estos datos se usarán para revisar mi solicitud y coordinar una ruta.</span>
        </label>
        {error && <div className="family-error" role="alert">{error}</div>}
        <button disabled={loading}><ShieldCheck weight="fill" />{loading ? 'Creando tu acceso…' : 'Crear mi acceso y entrar'}</button>
      </form>}
    </section>
  </main>;
}

function ReportScreen({ onBack, onSubmit, loading, error }: { onBack: () => void; onSubmit: (data: BarrierReportPayload) => Promise<void>; loading: boolean; error: string }) {
  const [selected, setSelected] = useState<(typeof barrierOptions)[number][0]>('availability');
  const option = barrierOptions.find(([id]) => id === selected)!;
  const [description, setDescription] = useState<string>(option[2]);
  const [availability, setAvailability] = useState('Puedo asistir martes y jueves después de las 4 p. m.');
  const choose = (id: (typeof barrierOptions)[number][0]) => { const next = barrierOptions.find(([value]) => value === id)!; setSelected(id); setDescription(next[2]); };
  return <section id="family-content" className="report-screen healthcare-report"><button className="back-button" onClick={onBack}><CaretLeft weight="bold" /> Volver</button><p className="family-kicker">AVISO PARA EL EQUIPO</p><h1>¿Qué dificultad apareció?</h1><p>Elige una opción y agrega el contexto que ayude al equipo a coordinar contigo.</p><form onSubmit={(event) => { event.preventDefault(); void onSubmit({ barrier_type: option[3], title: option[1], description, availability_note: availability }); }}><fieldset><legend>Selecciona una dificultad</legend><div className="barrier-grid">{barrierOptions.map(([id, label]) => <button type="button" key={id} className={selected === id ? 'selected' : ''} aria-pressed={selected === id} onClick={() => choose(id)}><WarningCircle weight={selected === id ? 'fill' : 'regular'} />{label}</button>)}</div></fieldset><label>Cuéntanos un poco más<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>¿Cuándo podrías asistir?<textarea value={availability} onChange={(event) => setAvailability(event.target.value)} /></label>{error && <div className="family-error">{error}</div>}<button className="send-report" disabled={loading}>{loading ? 'Enviando aviso…' : 'Enviar aviso al equipo'}<ArrowRight weight="bold" /></button></form><p className="family-safety"><ShieldCheck weight="fill" /> El equipo recibe el texto original y revisa cualquier síntesis antes de actuar.</p></section>;
}

function TimelineItem({ tone, title, detail, current }: { tone: string; title: string; detail: string; current?: boolean }) { return <article className={`timeline-item ${tone} ${current ? 'current' : ''}`}><i>{tone === 'green' ? <CheckCircle weight="fill" /> : <ClockCountdown weight="fill" />}</i><div><strong>{title}</strong><p>{detail}</p></div>{current && <span>Ahora</span>}</article>; }
function DocumentItem({ tone, title, status, detail }: { tone: string; title: string; status: string; detail: string }) { return <article className={`document-item ${tone}`}><i><FileText weight="fill" /></i><div><h2>{title}</h2><p>{detail}</p></div><strong>{status}</strong></article>; }
function TeamMember({ initials, tone, role, action }: { initials: string; tone: string; role: string; action: string }) { return <article className={`team-member ${tone}`}><i>{initials}</i><div><h2>{role}</h2><p>{action}</p></div><span><UserCircle weight="fill" /> Equipo responsable</span></article>; }
