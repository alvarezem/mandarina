export const DEFAULT_LANG = 'es'
export const LANGS = ['es', 'en']
export const LANG_KEY = 'mandarina:lang'

export const translations = {
  es: {
    'landing.hero.title': 'A tu plata, sacale todo el jugo',
    'landing.hero.subtitle':
      'Mandarina analiza los resúmenes de tus tarjetas de crédito y te muestra tus gastos categorizados, tus ingresos y la evolución de tu consumo. Después te ayuda a planificar inversiones con cotizaciones en vivo.',
    'landing.features': [
      {
        title: 'Analizá tu consumo',
        text: 'Subís tus resúmenes (CSV, XLSX o PDF) y Mandarina clasifica tus gastos por categoría y comercio, detecta tus ingresos recurrentes y te muestra la evolución mes a mes.',
      },
      {
        title: 'Planificá tus inversiones',
        text: 'Armá tu plan de inversión con metas porcentuales, seguí cotizaciones en vivo de BYMA (acciones, CEDEARs y bonos) con histórico de precios y registrá tus operaciones para ver cuánto ganaste.',
      },
      {
        title: 'Gratis y con tus datos privados',
        text: 'Sin publicidad y sin letra chica: cada cuenta solo ve sus propios datos y podés borrarlos cuando quieras.',
      },
    ],
    'landing.how.title': 'Cómo funciona',
    'landing.step': 'Paso',
    'landing.steps': [
      {
        title: 'Subí tu resumen',
        text: 'Cargás el resumen de tu tarjeta de crédito en formato CSV, XLSX o PDF.',
      },
      {
        title: 'Mirá tu análisis',
        text: 'Mandarina clasifica cada movimiento por categoría y comercio, y te muestra totales, ingresos recurrentes y la evolución del consumo.',
      },
      {
        title: 'Planificá e invertí',
        text: 'Definís tu plan de inversión, seguís cotizaciones en vivo de BYMA y registrás tus operaciones para ver tu rentabilidad.',
      },
    ],
    'landing.when.title': '¿Cuándo conviene Mandarina?',
    'landing.when.items': [
      'Dejar de cargar tus gastos a mano en una planilla de Excel.',
      'Ver tus gastos e ingresos categorizados automáticamente, en español.',
      'Armar un plan de inversión con metas porcentuales y seguirlo con cotizaciones en vivo.',
      'Llevar un registro de tus compras y ventas (costo promedio y rentabilidad).',
    ],
    'landing.who.title': 'Quién la usa',
    'landing.testimonial.quote':
      'Empecé Mandarina por necesidad: estaba cansado de cargar todos mis gastos a mano en una planilla de Excel. Cuando arranqué con las inversiones, decidí sumar esa sección para tener todas mis finanzas en un mismo lugar de confianza. Hoy subo mi resumen, veo los gastos categorizados y sigo mi plan sin volver a la planilla.',
    'landing.testimonial.author': 'Usuario y creador de Mandarina',
    'landing.faq.title': 'Preguntas frecuentes',
    'landing.faq.items': [
      {
        question: '¿Qué es Mandarina y para quién es?',
        answer:
          'Mandarina es una app gratuita que analiza los resúmenes de tus tarjetas de crédito. Subís tus archivos y obtenés un dashboard con gastos categorizados, vista de ingresos, plan de inversión con metas y cotizaciones en vivo. Está pensada para cualquier persona que quiera entender a dónde va su plata y tomar decisiones con datos, sin ser experta en finanzas.',
      },
      {
        question: '¿Por qué elegir Mandarina?',
        answer:
          'Porque te ahorra cargar y clasificar gastos a mano, es gratis, sin publicidad y con tus datos protegidos. Suma un plan de inversión con metas porcentuales, cotizaciones en vivo, historial de precios, y un registro de operaciones (ledger) para saber cuánto ganaste o perdiste con cada posición.',
      },
      {
        question: '¿Qué puedo esperar al usarla?',
        answer:
          'Subís un resumen y Mandarina lo procesa: totales, gastos por categoría y comercio, ingresos recurrentes (por ejemplo tu sueldo) y la evolución del consumo en el tiempo. Después podés armar tu plan de inversión, seguir cotizaciones en vivo y registrar compras y ventas para ver tu rentabilidad.',
      },
    ],
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'tu@email.com',
    'auth.password': 'Contraseña',
    'auth.confirm': 'Confirmar contraseña',
    'auth.invalidEmail': 'Ingresá un email válido',
    'auth.passwordRequired': 'Ingresá tu contraseña',
    'auth.passwordsMismatch': 'Las contraseñas no coinciden',
    'auth.forgot': '¿Olvidaste tu contraseña?',
    'auth.google': 'Continuar con Google',
    'auth.or': 'o',
    'auth.submit.login': 'Iniciar sesión',
    'auth.submit.signup': 'Crear cuenta',
    'auth.submit.creating': 'Creando cuenta…',
    'auth.submit.signingIn': 'Ingresando…',
    'auth.toggle.signup': 'Crear cuenta',
    'auth.toggle.login': 'Ya tengo cuenta',
    'auth.showPassword': 'Mostrar contraseña',
    'auth.hidePassword': 'Ocultar contraseña',
    'auth.connectionError': 'No se pudo conectar con el servidor. Intentá de nuevo.',
    'auth.googleError': 'No se pudo conectar con Google. Intentá de nuevo.',
    'auth.emailSendError': 'No se pudo enviar el email. Intentá de nuevo.',
    'auth.almostDone': 'Casi listo',
    'auth.confirmEmail':
      'Te enviamos un email a {email} para confirmar tu cuenta. Revisá tu bandeja de entrada.',
    'auth.accountExists.title': 'Ya existe una cuenta',
    'auth.accountExists.text':
      'Ya existe una cuenta con el email {email}. Si es tuya, podés iniciar sesión o recuperar tu contraseña.',
    'auth.forgot.title': 'Recuperar contraseña',
    'auth.forgot.text': 'Ingresá tu email y te enviamos un link para crear una nueva contraseña.',
    'auth.sendReset': 'Enviar link de recuperación',
    'auth.recoverButton': 'Recuperar contraseña',
    'auth.sending': 'Enviando…',
    'auth.back': 'Volver',
    'auth.backToLogin': 'Volver a iniciar sesión',
    'auth.resetSent':
      'Te enviamos un link de recuperación a {email}. Revisá tu bandeja de entrada.',
    'auth.resetSentShort': 'Te enviamos un link a {email}. Revisá tu bandeja de entrada.',
    'auth.strength': ['', 'Débil', 'Media', 'Buena', 'Fuerte'],
    'auth.passwordError.short': 'La contraseña debe tener al menos 8 caracteres',
    'auth.passwordError.chars': 'La contraseña debe incluir letras y números',
  },
  en: {
    'landing.hero.title': 'Get the most juice out of your money',
    'landing.hero.subtitle':
      'Mandarina analyzes your credit card statements and shows you your categorized spending, your income and how your consumption evolves. Then it helps you plan investments with live quotes.',
    'landing.features': [
      {
        title: 'Analyze your spending',
        text: 'Upload your statements (CSV, XLSX or PDF) and Mandarina categorizes your expenses by category and merchant, detects your recurring income and shows your month-to-month evolution.',
      },
      {
        title: 'Plan your investments',
        text: 'Build your investment plan with percentage targets, follow live BYMA quotes (stocks, CEDEARs and bonds) with price history, and track your trades to see how much you made.',
      },
      {
        title: 'Free and private',
        text: 'No ads and no fine print: each account only sees its own data and you can delete it whenever you want.',
      },
    ],
    'landing.how.title': 'How it works',
    'landing.step': 'Step',
    'landing.steps': [
      {
        title: 'Upload your statement',
        text: 'Upload your credit card statement in CSV, XLSX or PDF format.',
      },
      {
        title: 'See your analysis',
        text: 'Mandarina classifies every movement by category and merchant, and shows you totals, recurring income and how your spending evolves.',
      },
      {
        title: 'Plan and invest',
        text: 'Set your investment plan, follow live BYMA quotes and track your trades to see your returns.',
      },
    ],
    'landing.when.title': 'When does Mandarina make sense?',
    'landing.when.items': [
      'Stop entering your expenses by hand into an Excel spreadsheet.',
      'See your expenses and income automatically categorized, in English.',
      'Build an investment plan with percentage targets and follow it with live quotes.',
      'Keep a record of your buys and sells (average cost and profitability).',
    ],
    'landing.who.title': 'Who uses it',
    'landing.testimonial.quote':
      'I started Mandarina out of necessity: I was tired of entering all my expenses by hand into an Excel spreadsheet. When I started investing, I decided to add that section to have all my finances in one trusted place. Today I upload my statement, see my categorized expenses and follow my plan without going back to the spreadsheet.',
    'landing.testimonial.author': 'Mandarina user and creator',
    'landing.faq.title': 'Frequently asked questions',
    'landing.faq.items': [
      {
        question: 'What is Mandarina and who is it for?',
        answer:
          'Mandarina is a free app that analyzes your credit card statements. Upload your files and get a dashboard with categorized spending, an income view, an investment plan with targets and live quotes. It is built for anyone who wants to understand where their money goes and make data-driven decisions, without being a finance expert.',
      },
      {
        question: 'Why choose Mandarina?',
        answer:
          'Because it saves you from entering and categorizing expenses by hand, it is free, ad-free and your data stays protected. It adds an investment plan with percentage targets, live quotes, price history, and a trades ledger (operations) so you know how much you gained or lost on each position.',
      },
      {
        question: 'What can I expect when using it?',
        answer:
          'Upload a statement and Mandarina processes it: totals, expenses by category and merchant, recurring income (like your salary) and how your spending evolves over time. Then you can build your investment plan, follow live quotes and track your buys and sells to see your returns.',
      },
    ],
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'you@email.com',
    'auth.password': 'Password',
    'auth.confirm': 'Confirm password',
    'auth.invalidEmail': 'Enter a valid email',
    'auth.passwordRequired': 'Enter your password',
    'auth.passwordsMismatch': 'Passwords do not match',
    'auth.forgot': 'Forgot your password?',
    'auth.google': 'Continue with Google',
    'auth.or': 'or',
    'auth.submit.login': 'Sign in',
    'auth.submit.signup': 'Create account',
    'auth.submit.creating': 'Creating account…',
    'auth.submit.signingIn': 'Signing in…',
    'auth.toggle.signup': 'Create account',
    'auth.toggle.login': 'I already have an account',
    'auth.showPassword': 'Show password',
    'auth.hidePassword': 'Hide password',
    'auth.connectionError': 'Could not connect to the server. Try again.',
    'auth.googleError': 'Could not connect to Google. Try again.',
    'auth.emailSendError': 'Could not send the email. Try again.',
    'auth.almostDone': 'Almost done',
    'auth.confirmEmail': 'We sent an email to {email} to confirm your account. Check your inbox.',
    'auth.accountExists.title': 'An account already exists',
    'auth.accountExists.text':
      'An account already exists for {email}. If it is yours, you can sign in or recover your password.',
    'auth.forgot.title': 'Recover password',
    'auth.forgot.text': 'Enter your email and we will send you a link to create a new password.',
    'auth.sendReset': 'Send recovery link',
    'auth.recoverButton': 'Recover password',
    'auth.sending': 'Sending…',
    'auth.back': 'Back',
    'auth.backToLogin': 'Back to sign in',
    'auth.resetSent': 'We sent a recovery link to {email}. Check your inbox.',
    'auth.resetSentShort': 'We sent a link to {email}. Check your inbox.',
    'auth.strength': ['', 'Weak', 'Fair', 'Good', 'Strong'],
    'auth.passwordError.short': 'Password must be at least 8 characters',
    'auth.passwordError.chars': 'Password must include letters and numbers',
  },
}

export function t(lang, key, vars) {
  const dict = translations[lang] || translations[DEFAULT_LANG]
  let value = dict[key]
  if (value === undefined) value = translations[DEFAULT_LANG][key]
  if (value === undefined) return key
  if (vars === undefined || typeof value !== 'string') return value
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), value)
}

export function detectLang() {
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return nav.toLowerCase().startsWith('en') ? 'en' : 'es'
}

export function readLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (LANGS.includes(stored)) return stored
  } catch {
    // localStorage no disponible (SSR/tests): fallback a detección
  }
  return detectLang()
}

export function writeLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // noop
  }
}

export function applyLangToHtml(lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
