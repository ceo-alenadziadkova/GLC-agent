/**
 * Demo seed data — Hospital Universitari Son Espases, Palma de Mallorca
 *
 * ⚠️  SIMULATED EVALUATION — This is demonstration data, not a live audit result.
 *     Issues marked [estimated] are based on patterns typical of public hospital sites,
 *     not a complete programmatic crawl.
 *
 * Industry:     Healthcare
 * URL:          https://www.hospitalsonespases.es
 * Overall:      2.2 / 5  (healthcare-weighted)
 */

import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Shared IDs (fixed so the seed is idempotent / re-runnable)
// ---------------------------------------------------------------------------
export const DEMO_AUDIT_ID = 'b1a2c3d4-e5f6-7890-abcd-ef1234567890';
export const DEMO_RECON_ID = 'a0b1c2d3-e4f5-6789-abcd-ef0987654321';
export const DEMO_STRATEGY_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789abc';

// Pipeline event base timestamps (spaced 2 minutes apart)
const BASE_TIME = new Date('2026-03-16T09:00:00.000Z');
const t = (minutesOffset: number) =>
  new Date(BASE_TIME.getTime() + minutesOffset * 60000).toISOString();

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function buildSonEspasesData(auditId: string, userId: string) {
  return {
    audit: buildAudit(auditId, userId),
    recon: buildRecon(auditId),
    domains: buildDomains(auditId),
    strategy: buildStrategy(auditId),
    reviews: buildReviews(auditId),
    events: buildEvents(auditId),
  };
}

// ---------------------------------------------------------------------------
// 1. Audit master record
// ---------------------------------------------------------------------------
function buildAudit(auditId: string, userId: string) {
  return {
    id: auditId,
    user_id: userId,
    company_url: 'https://www.hospitalsonespases.es',
    company_name: 'Hospital Universitari Son Espases',
    industry: 'healthcare',
    status: 'completed',
    current_phase: 7,
    overall_score: 2.2,
    token_budget: 200000,
    tokens_used: 142800,
    created_at: t(0),
    updated_at: t(95),
  };
}

// ---------------------------------------------------------------------------
// 2. Recon (Phase 0)
// ---------------------------------------------------------------------------
function buildRecon(auditId: string) {
  return {
    id: DEMO_RECON_ID,
    audit_id: auditId,
    status: 'completed',
    company_name: 'Hospital Universitari Son Espases',
    industry: 'healthcare',
    location: 'Palma de Mallorca, Illes Balears, España',
    languages: ['es', 'ca'],
    tech_stack: {
      cms: ['WordPress'],
      analytics: ['Google Analytics 4'],
      hosting_cdn: ['Apache'],
      frameworks: [],
      chat_support: [],
      ecommerce: [],
      email_marketing: [],
      booking: ['Cita Sanitaria (IBSALUT)'],
    },
    social_profiles: {
      twitter: 'https://twitter.com/SonEspases',
      youtube: 'https://www.youtube.com/@sonespases',
    },
    contact_info: {
      phones: ['+34 871 205 000'],
      emails: [
        'huse.atencionusuario@ssib.es',
        'huse.sauislas@ssib.es',
        'huse.sauasociaciones@ssib.es',
      ],
      addresses: ['Carretera de Valldemossa, 79, 07120 Palma, Illes Balears'],
    },
    pages_crawled: [
      {
        url: 'https://www.hospitalsonespases.es/',
        title: 'Hospital Universitari Son Espases',
        status: 200,
        meta_description: null,
        h1: ['Hospital Universitari Son Espases'],
        structured_data: [],
        images: { total_images: 28, with_alt_text: 16, missing_alt: 12, lazy_loaded: 4 },
        content_length: 48200,
        load_time_ms: 3800,
      },
      {
        url: 'https://www.hospitalsonespases.es/cita-previa',
        title: 'Cita Previa | Hospital Son Espases',
        status: 200,
        meta_description: null,
        h1: ['Cita Previa'],
        structured_data: [],
        images: { total_images: 5, with_alt_text: 2, missing_alt: 3, lazy_loaded: 0 },
        content_length: 12400,
        load_time_ms: 2200,
      },
      {
        url: 'https://www.hospitalsonespases.es/servicios',
        title: 'Servicios | Hospital Son Espases',
        status: 200,
        meta_description: null,
        h1: ['Nuestros Servicios'],
        structured_data: [],
        images: { total_images: 12, with_alt_text: 5, missing_alt: 7, lazy_loaded: 2 },
        content_length: 34700,
        load_time_ms: 4100,
      },
    ],
    brief:
      'Hospital Universitari Son Espases es el hospital de referencia de las Illes Balears, con más de mil camas, centro público de alta complejidad asistencial, docente e investigadora, y núcleo del Institut d\'Investigació Sanitària Illes Balears (IdISBa). Gestiona la atención especializada de alta complejidad para una población de más de 330.000 habitantes. El sitio web actúa principalmente como directorio informativo estático, con el sistema de cita previa externalizado al portal IBSALUT.',
    interview_answers: null,
  };
}

// ---------------------------------------------------------------------------
// 3. Domain results (Phases 1–6)
// ---------------------------------------------------------------------------
function buildDomains(auditId: string) {
  return [
    // Phase 1 — Tech Infrastructure (score: 2)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'tech_infrastructure',
      phase_number: 1,
      status: 'completed',
      score: 2,
      label: 'Needs Work',
      version: 1,
      summary:
        'La infraestructura técnica presenta carencias significativas: ausencia de CDN, WordPress no actualizado y sin señales de HTTP/2. La experiencia de carga es subóptima, especialmente en móvil.',
      strengths: [
        'WordPress es una base de contenidos conocida y con amplio soporte de la comunidad',
        'Google Analytics 4 está correctamente implementado para seguimiento básico',
        'El servidor responde con códigos HTTP correctos y sin errores 5xx observados',
      ],
      weaknesses: [
        'Ausencia de CDN detectada — recursos estáticos servidos desde un único origen Apache',
        'Sin señales de HTTP/2 en las cabeceras de respuesta observadas',
        'Versión de WordPress aparentemente desactualizada según patrones de assets [estimated]',
        'Tiempo de carga estimado >3–4s en móvil por volumen de assets [estimated]',
        'Sin compresión Brotli detectada, sólo gzip',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'No CDN configurado',
          description:
            'Los assets estáticos (imágenes, CSS, JS) parecen servirse desde el servidor Apache de origen sin distribución geográfica. Para un hospital con tráfico pico durante horarios de consulta, esto puede generar latencia.',
          impact: 'Alto — afecta la velocidad de carga en todas las páginas, especialmente imágenes médicas e iconografía',
        },
        {
          id: randomUUID(),
          severity: 'high',
          title: 'HTTP/2 no detectado',
          description:
            'Las cabeceras de respuesta no muestran indicadores de HTTP/2 o HTTP/3. HTTP/2 permite multiplexación de requests, reduciendo significativamente los tiempos de carga.',
          impact: 'Alto — mayor tiempo de carga especialmente en conexiones móviles',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'WordPress desactualizado [estimated]',
          description:
            'Basado en patrones de rutas de assets, la versión de WordPress parece ser anterior a las últimas releases estables. Las versiones desactualizadas acumulan vulnerabilidades de seguridad.',
          impact: 'Medio — riesgo de seguridad + pérdida de mejoras de rendimiento de versiones recientes',
        },
        {
          id: randomUUID(),
          severity: 'low',
          title: 'Sin lazy loading sistemático en imágenes',
          description:
            'La mayoría de imágenes no tienen atributo loading="lazy". En páginas con muchas imágenes esto penaliza el tiempo hasta primer contenido interactivo.',
          impact: 'Bajo-Medio — afecta métricas Core Web Vitals (LCP)',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Activar Cloudflare Free tier',
          description:
            'Configurar Cloudflare como proxy gratuito aporta CDN, HTTP/2, Brotli y protección DDoS básica sin coste y sin cambiar el servidor de origen.',
          effort: 'low',
          timeframe: '2–4 horas',
        },
        {
          id: randomUUID(),
          title: 'Añadir atributo loading="lazy" a imágenes',
          description: 'Añadir loading="lazy" a todas las <img> fuera del viewport inicial reduce el peso de carga inicial.',
          effort: 'low',
          timeframe: '1 día',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Migrar a hosting WordPress gestionado con HTTP/2',
          description:
            'Plataformas como Kinsta, WP Engine o similar incluyen HTTP/2, CDN integrado, actualizaciones automáticas de WordPress y copias de seguridad. Reduce carga operativa del equipo TI del hospital.',
          priority: 'high',
          estimated_cost: '€150–300/mes',
          estimated_time: '4–6 semanas',
          impact: 'Alto — mejora rendimiento, seguridad y reducción de mantenimiento',
        },
        {
          id: randomUUID(),
          title: 'Actualizar WordPress a la última versión estable',
          description:
            'Planificar ventana de mantenimiento para actualizar core, plugins y tema. Incluir pruebas de regresión en entorno de staging antes de producción.',
          priority: 'high',
          estimated_cost: '€500–1.000 (horas de TI)',
          estimated_time: '2–3 semanas',
          impact: 'Alto — seguridad + rendimiento',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },

    // Phase 2 — Security & Compliance (score: 3)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'security_compliance',
      phase_number: 2,
      status: 'completed',
      score: 3,
      label: 'Moderate',
      version: 1,
      summary:
        'La base de seguridad es sólida: SSL válido y HSTS activo. Sin embargo, faltan cabeceras críticas como CSP y X-Frame-Options, y el manejo de cookies presenta inconsistencias respecto a la normativa RGPD.',
      strengths: [
        'Certificado SSL válido con TLS 1.3 activo',
        'Cabecera Strict-Transport-Security (HSTS) presente',
        'Sin exposición de información de versiones en cabeceras de servidor observada',
        'No se detectaron redirecciones HTTP → HTTPS inseguras',
      ],
      weaknesses: [
        'Content-Security-Policy (CSP) no configurado — riesgo de XSS',
        'X-Frame-Options no establecido — vulnerabilidad a clickjacking',
        'Banner de cookies presente pero se establecen cookies antes de recibir consentimiento',
        'Permissions-Policy header no detectado',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Content-Security-Policy (CSP) ausente',
          description:
            'La cabecera CSP no está configurada. Esto permite la inyección de scripts externos (XSS), especialmente relevante para un sitio de salud que puede manejar datos de contacto de pacientes.',
          impact: 'Alto — riesgo de inyección de scripts maliciosos, especialmente grave en contexto sanitario',
        },
        {
          id: randomUUID(),
          severity: 'high',
          title: 'X-Frame-Options no configurado',
          description:
            'Sin esta cabecera, el sitio puede ser embebido en iframes de terceros, facilitando ataques de clickjacking donde el usuario cree estar interactuando con el hospital pero lo hace sobre una capa maliciosa.',
          impact: 'Alto — clickjacking en formularios de contacto o cita previa',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Cookies establecidas antes del consentimiento RGPD',
          description:
            'Aunque existe banner de cookies, se observan cookies de analítica (GA4) siendo establecidas antes de que el usuario acepte. Esto incumple el RGPD y la LSSI española.',
          impact: 'Medio — riesgo legal/regulatorio para institución pública',
        },
        {
          id: randomUUID(),
          severity: 'low',
          title: 'Permissions-Policy no configurado',
          description:
            'Esta cabecera permite restringir el acceso a APIs del navegador (cámara, micrófono, geolocalización). Su ausencia no es crítica pero es buena práctica.',
          impact: 'Bajo — superficie de ataque ligeramente mayor',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Añadir X-Frame-Options y cabeceras básicas vía .htaccess',
          description:
            'X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff y Referrer-Policy pueden añadirse en minutos vía .htaccess de Apache sin cambios en la aplicación.',
          effort: 'low',
          timeframe: '1–2 horas',
        },
        {
          id: randomUUID(),
          title: 'Corregir consentimiento de cookies (RGPD)',
          description:
            'Configurar el plugin de consentimiento para bloquear GA4 hasta obtener consentimiento explícito. Compatible con plugins como Complianz o CookieYes.',
          effort: 'low',
          timeframe: '2–4 horas',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Implementar Content-Security-Policy',
          description:
            'Desarrollar y desplegar una CSP apropiada para el site. Requiere inventario de todos los scripts/estilos externos usados (GA4, fuentes, etc.) y pruebas exhaustivas para evitar bloquear funcionalidad legítima.',
          priority: 'high',
          estimated_cost: '€800–1.500 (consultoría técnica)',
          estimated_time: '2–4 semanas',
          impact: 'Alto — elimina principal vector de XSS',
        },
        {
          id: randomUUID(),
          title: 'Auditoría de privacidad y RGPD completa',
          description:
            'Contratar auditoría de cumplimiento RGPD/LOPDGDD que cubra cookies, formularios, almacenamiento de datos de contacto y política de privacidad actualizada.',
          priority: 'medium',
          estimated_cost: '€1.500–3.000',
          estimated_time: '4–6 semanas',
          impact: 'Medio-Alto — reduce riesgo legal como institución pública',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },

    // Phase 3 — SEO & Digital (score: 2)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'seo_digital',
      phase_number: 3,
      status: 'completed',
      score: 2,
      label: 'Needs Work',
      version: 1,
      summary:
        'La presencia SEO es débil para un hospital de referencia: ausencia de datos estructurados, meta descripciones escasas y sin hreflang para el contenido bilingüe es/ca.',
      strengths: [
        'El dominio hospitalsonespases.es tiene autoridad de dominio consolidada',
        'Presencia en redes sociales con perfiles verificados en Twitter/X y YouTube',
        'URLs amigables y estructura de directorio coherente',
      ],
      weaknesses: [
        'Meta descripciones ausentes o incompletas en la mayoría de páginas rastreadas [estimated]',
        'Sin datos estructurados JSON-LD (Hospital, MedicalOrganization, Physician)',
        'Sin etiquetas hreflang para alternancia es/ca',
        'Estructura de enlazado interno plana con escasa interconexión entre servicios',
        'Sin confirmación de sitemap.xml enlazado correctamente en robots.txt',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Ausencia de datos estructurados (JSON-LD)',
          description:
            'Google Health y Google Search utilizan el schema de tipo Hospital y MedicalOrganization para mostrar fichas enriquecidas (horarios, especialidades, teléfono directo). Su ausencia hace invisible al hospital en búsquedas de salud locales.',
          impact: 'Alto — pérdida de visibilidad en búsquedas de tipo "hospital palma urgencias", "cita médico mallorca"',
        },
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Meta descripciones ausentes en páginas principales [estimated]',
          description:
            'La mayoría de páginas de servicios y departamentos carecen de meta description. Google genera snippets automáticos de baja calidad que no invitan al clic.',
          impact: 'Alto — bajo CTR en SERPs para búsquedas informativas de servicios médicos',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Sin etiquetas hreflang (es/ca)',
          description:
            'El site tiene contenido en castellano y catalán/valenciano pero no implementa hreflang. Google puede indexar versiones duplicadas y penalizar o ignorar una de ellas.',
          impact: 'Medio — pérdida de visibilidad en búsquedas en catalán',
        },
        {
          id: randomUUID(),
          severity: 'low',
          title: 'Robots.txt y sitemap sin verificar',
          description:
            'No se ha confirmado que sitemap.xml esté declarado en robots.txt ni que esté enviado a Google Search Console. Esto no impide la indexación pero sí la ralentiza.',
          impact: 'Bajo — puede retrasar la indexación de páginas nuevas',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Añadir JSON-LD Hospital + MedicalOrganization a homepage',
          description:
            'Insertar bloque de datos estructurados en el <head> de la homepage con nombre, dirección, teléfono, horario de urgencias y especialidades principales. Tiempo estimado: 2 horas.',
          effort: 'low',
          timeframe: '1 día',
        },
        {
          id: randomUUID(),
          title: 'Redactar meta descriptions para las 10 páginas más visitadas',
          description:
            'Priorizar homepage, cita previa, urgencias, servicios más buscados. Textos de 150–160 caracteres con keyword principal + CTA suave.',
          effort: 'low',
          timeframe: '2–3 días',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Implementar hreflang para contenido bilingüe es/ca',
          description:
            'Añadir etiquetas hreflang="es" y hreflang="ca" en todas las páginas con versión en ambos idiomas. Requiere mapa de URLs equivalentes por idioma.',
          priority: 'high',
          estimated_cost: '€500–1.000',
          estimated_time: '2 semanas',
          impact: 'Alto — mejora visibilidad en búsquedas en catalán y evita penalización por contenido duplicado',
        },
        {
          id: randomUUID(),
          title: 'Auditoría SEO técnica completa + Google Search Console',
          description:
            'Enviar sitemap, verificar errores de rastreo, identificar páginas huérfanas y construir estructura de enlazado interno por especialidades médicas.',
          priority: 'medium',
          estimated_cost: '€800–1.500',
          estimated_time: '3–4 semanas',
          impact: 'Medio — mejora orgánica sostenida a largo plazo',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },

    // Phase 4 — UX & Conversion (score: 2)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'ux_conversion',
      phase_number: 4,
      status: 'completed',
      score: 2,
      label: 'Needs Work',
      version: 1,
      summary:
        'La experiencia de usuario refleja un diseño de directorio informativo, no de plataforma de captación. El flujo de cita previa añade fricción innecesaria al derivar al portal externo IBSALUT.',
      strengths: [
        'Estructura de navegación principal coherente con categorías reconocibles',
        'El número de teléfono principal es visible en el encabezado',
        'Versión móvil del sitio existe y es funcional a nivel básico',
      ],
      weaknesses: [
        'CTA de cita previa no visible en posición prominente por encima del fold en homepage [estimated]',
        'El sistema de cita redirige al portal externo IBSALUT con nueva autenticación (fricción)',
        'Navegación móvil es compleja con múltiples niveles anidados [estimated]',
        'Sin chat de soporte ni widget de contacto rápido',
        'Proporción significativa de imágenes sin texto alternativo [estimated]',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'CTA de cita previa no prominente en homepage',
          description:
            'La acción principal del usuario — solicitar cita — no aparece de forma destacada por encima del fold. El usuario debe desplazarse o navegar para encontrarla.',
          impact: 'Alto — principal conversión del sitio (solicitud de cita) penalizada por visibilidad',
        },
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Fricción en flujo de cita — redirección a IBSALUT',
          description:
            'Al solicitar cita, el usuario es redirigido al portal IBSALUT donde debe autenticarse nuevamente. Este salto de dominio y re-login crea abandono, especialmente en usuarios mayores.',
          impact: 'Alto — alta tasa de abandono estimada en flujo de conversión principal',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Accesibilidad: imágenes sin texto alternativo [estimated]',
          description:
            'Una parte significativa de las imágenes del site parecen carecer de atributo alt o tenerlo vacío. Esto afecta a usuarios con discapacidad visual y es un requisito legal (Real Decreto 1112/2018 para entidades públicas españolas).',
          impact: 'Medio — incumplimiento legal WCAG 2.1 AA para organismos públicos españoles',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Navegación móvil compleja [estimated]',
          description:
            'La estructura de menú en dispositivos móviles parece requerir varios niveles de navegación para acceder a servicios específicos. En móvil, las áreas táctiles pueden ser insuficientes.',
          impact: 'Medio — experiencia degradada para usuarios móviles (~60% del tráfico estimado)',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Añadir botón "Solicitar Cita" prominente en hero de homepage',
          description:
            'Insertar CTA con contraste alto y tamaño grande en la parte visible al cargar la página, enlazando directamente a la página de cita previa.',
          effort: 'low',
          timeframe: '2–4 horas',
        },
        {
          id: randomUUID(),
          title: 'Añadir texto alternativo a todas las imágenes',
          description:
            'Auditar y completar atributos alt en todo el contenido del CMS. Herramientas como AccessMonitor pueden automatizar la detección.',
          effort: 'medium',
          timeframe: '1 semana',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Integrar widget de cita previa en el propio sitio',
          description:
            'Desarrollar una capa de integración que permita iniciar o consultar citas directamente en el sitio del hospital, usando la API de IBSALUT como backend, sin cambiar de dominio.',
          priority: 'high',
          estimated_cost: '€3.000–6.000',
          estimated_time: '2–3 meses',
          impact: 'Alto — reduce fricción en conversión principal y mejora experiencia de paciente',
        },
        {
          id: randomUUID(),
          title: 'Auditoría de accesibilidad WCAG 2.1 AA',
          description:
            'Como entidad pública, el hospital tiene obligación legal de cumplir WCAG 2.1 AA (RD 1112/2018). Contratar auditoría formal que cubra alt text, contraste, teclado y ARIA.',
          priority: 'high',
          estimated_cost: '€1.500–2.500',
          estimated_time: '4–6 semanas',
          impact: 'Alto — cumplimiento legal + mejora para todos los usuarios',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },

    // Phase 5 — Marketing & Positioning (score: 2)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'marketing_utp',
      phase_number: 5,
      status: 'completed',
      score: 2,
      label: 'Needs Work',
      version: 1,
      summary:
        'A pesar de ser el hospital de mayor complejidad de Baleares, el sitio no comunica de forma diferenciada sus capacidades de excelencia clínica ni su actividad investigadora (IdISBa). La comunicación es burocrática e institucional, sin orientación al paciente.',
      strengths: [
        'Marca reconocida y posición consolidada como hospital de referencia en la región',
        'Presencia en redes sociales activa (Twitter/X, YouTube)',
        'Cobertura informativa de noticias y eventos del hospital',
      ],
      weaknesses: [
        'Sin propuesta de valor diferenciada visible en homepage',
        'Comunicación de excelencia clínica e investigadora ausente en páginas de servicios',
        'Sin testimonios de pacientes ni métricas de resultados clínicos publicadas',
        'Feeds de redes sociales no integrados en el sitio web',
        'Tono burocrático-institucional vs. orientado al paciente',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Sin propuesta de valor en homepage',
          description:
            'La homepage no comunica por qué Son Espases es diferente o mejor que alternativas privadas o la red pública general. Para un paciente con elección, no hay razón diferenciadora visible.',
          impact: 'Alto — oportunidad perdida de retención de pacientes que valoran la excelencia clínica pública',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Actividad investigadora (IdISBa) no visible',
          description:
            'Son Espases alberga el IdISBa, un instituto de investigación sanitaria de referencia, pero esta fortaleza no es visible en las páginas de servicios clínicos ni en la homepage.',
          impact: 'Medio — pérdida de posicionamiento premium frente a centros privados',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Sin métricas de resultados clínicos ni satisfacción',
          description:
            'Hospitales de referencia internacional publican tasas de éxito quirúrgico, tiempos de espera o puntuaciones de satisfacción. Son Espases no tiene este tipo de contenido visible.',
          impact: 'Medio — reduce credibilidad y confianza del paciente en proceso de decisión',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Añadir bloque "Por qué Son Espases" en homepage',
          description:
            '3–4 puntos diferenciadores en formato visual: hospital universitario de alta complejidad, centro de referencia regional, vínculo con IdISBa, tecnología punta.',
          effort: 'low',
          timeframe: '2–3 días',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Desarrollar microsite de excelencia clínica e investigación',
          description:
            'Crear sección dedicada que comunique indicadores de calidad, actividad investigadora IdISBa, ensayos clínicos activos y reconocimientos internacionales. Orientado a pacientes con patologías complejas y médicos derivadores.',
          priority: 'medium',
          estimated_cost: '€4.000–8.000',
          estimated_time: '3–4 meses',
          impact: 'Medio-Alto — diferenciación de centros privados y atracción de médicos derivadores',
        },
        {
          id: randomUUID(),
          title: 'Publicar métricas de calidad y satisfacción de pacientes',
          description:
            'Diseñar dashboard público con indicadores de calidad asistencial (ya disponibles internamente según normativa). Mejora confianza del paciente y transparencia institucional.',
          priority: 'medium',
          estimated_cost: '€2.000–4.000',
          estimated_time: '2–3 meses',
          impact: 'Medio — construcción de confianza y posicionamiento de calidad',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },

    // Phase 6 — Automation & Processes (score: 2)
    {
      id: randomUUID(),
      audit_id: auditId,
      domain_key: 'automation_processes',
      phase_number: 6,
      status: 'completed',
      score: 2,
      label: 'Needs Work',
      version: 1,
      summary:
        'La presencia digital no refleja automatización de procesos de cara al paciente: los formularios son PDFs descargables, no hay portal de paciente visible y el sistema de cita está externalizado sin integración.',
      strengths: [
        'Sistema de cita IBSALUT disponible como solución regional compartida',
        'Registro de noticias y comunicados actualizado regularmente (WordPress CMS)',
        'Presencia verificada en Twitter y YouTube con actividad regular',
      ],
      weaknesses: [
        'Formularios de solicitud disponibles como PDFs — no son digitales',
        'Sin portal de paciente visible en el sitio web público',
        'Sin chatbot ni asistente de FAQ automatizado',
        'Sin visualización de tiempos de espera en urgencias',
        'Integración de redes sociales no presente en el site',
      ],
      issues: [
        {
          id: randomUUID(),
          severity: 'high',
          title: 'Formularios en formato PDF (no digitales)',
          description:
            'Varios procesos de solicitud (permisos, información clínica, UPPE) requieren descargar, imprimir y enviar PDFs. Esto genera fricción máxima y es inaccesible en móvil.',
          impact: 'Alto — máxima fricción en procesos administrativos del paciente',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Sin portal de paciente integrado',
          description:
            'No se detecta enlace a área personal de paciente en el sitio del hospital. Aunque pueda existir en IBSALUT, la desconexión del site genera confusión al usuario.',
          impact: 'Medio — baja retención digital del paciente, todo acceso auto-gestión se pierde',
        },
        {
          id: randomUUID(),
          severity: 'medium',
          title: 'Sin información de tiempos de espera en urgencias',
          description:
            'Muchos hospitales de referencia en Europa publican tiempos de espera de urgencias en tiempo real. Son Espases no lo hace, lo que genera llamadas evitables y dificulta la toma de decisión del paciente.',
          impact: 'Medio — volumen de llamadas al 871 205 000 innecesariamente alto',
        },
        {
          id: randomUUID(),
          severity: 'low',
          title: 'Sin chatbot ni FAQ automatizado',
          description:
            'Las consultas frecuentes (horarios, cómo llegar, cita previa) podrían responderse automáticamente. Sin esto, el personal telefónico absorbe consultas de bajo valor.',
          impact: 'Bajo-Medio — carga operativa en atención al usuario evitable',
        },
      ],
      quick_wins: [
        {
          id: randomUUID(),
          title: 'Digitalizar el formulario de solicitud de información más común',
          description:
            'Convertir el formulario más descargado a formulario web nativo (WordPress Gravity Forms o similar). Sin backend adicional, con envío por email al departamento correspondiente.',
          effort: 'low',
          timeframe: '1 semana',
        },
      ],
      recommendations: [
        {
          id: randomUUID(),
          title: 'Implementar tiempo de espera de urgencias en tiempo real',
          description:
            'Conectar sistema interno de triaje (si existe API o exportación) con un widget en homepage que muestre tiempo estimado de espera en urgencias. Reduce carga de call center.',
          priority: 'medium',
          estimated_cost: '€2.000–5.000',
          estimated_time: '2–3 meses',
          impact: 'Medio — reducción de llamadas + mejora percepción de transparencia',
        },
        {
          id: randomUUID(),
          title: 'Desplegar chatbot de preguntas frecuentes',
          description:
            'Chatbot de árbol de decisión (no IA) que responda preguntas frecuentes: cómo solicitar cita, horarios de visitas, cómo llegar, quién es mi médico de referencia. Integrable con WordPress en <1 semana técnica.',
          priority: 'low',
          estimated_cost: '€500–1.500/año (SaaS)',
          estimated_time: '2–4 semanas',
          impact: 'Bajo-Medio — reducción de carga operativa atención telefónica',
        },
      ],
      raw_data: { collected_by: 'demo_seed', version: 'simulated_evaluation' },
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. Strategy (Phase 7)
// ---------------------------------------------------------------------------
function buildStrategy(auditId: string) {
  return {
    id: DEMO_STRATEGY_ID,
    audit_id: auditId,
    status: 'completed',
    executive_summary: `Hospital Universitari Son Espases es la institución sanitaria pública de mayor complejidad de las Illes Balears, con una reputación clínica sólida y una actividad investigadora relevante a través del IdISBa. Sin embargo, su presencia digital refleja la brecha habitual en hospitales públicos: una infraestructura técnica conservadora, visibilidad SEO infradesarrollada y una experiencia de usuario concebida como directorio informativo, no como plataforma de captación y fidelización del paciente.

⚠️ EVALUACIÓN SIMULADA: Este informe es una demostración basada en revisión superficial del sitio público. Los datos marcados como [estimated] son estimaciones típicas para hospitales públicos de la región, no resultado de un crawl exhaustivo.

La puntuación global de 2.2/5 (Necesita Mejora) no refleja la calidad asistencial —que es alta— sino la madurez digital, que tiene un recorrido de mejora significativo. Tres vectores de máximo impacto a corto plazo: (1) datos estructurados JSON-LD para visibilidad en búsquedas sanitarias, (2) cabeceras de seguridad CSP y X-Frame-Options para cumplimiento regulatorio, y (3) rediseño del flujo de cita previa para reducir la fricción del portal externo IBSALUT.`,
    overall_score: 2.2,
    quick_wins: [
      {
        id: randomUUID(),
        title: 'JSON-LD Hospital schema en homepage',
        description:
          'Insertar datos estructurados MedicalOrganization + Hospital en el <head>. Impacto inmediato en Google Health y búsquedas locales de salud.',
        impact: 'high',
        effort: 'low',
      },
      {
        id: randomUUID(),
        title: 'Cabeceras de seguridad HTTP básicas (.htaccess)',
        description:
          'X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, CSP de primer nivel. 2 horas de trabajo técnico.',
        impact: 'high',
        effort: 'low',
      },
      {
        id: randomUUID(),
        title: 'CTA "Solicitar Cita" en posición hero',
        description:
          'Botón de alta visibilidad sobre el fold en homepage. La principal conversión del sitio actualmente no es encontrable al primer vistazo.',
        impact: 'high',
        effort: 'low',
      },
      {
        id: randomUUID(),
        title: 'Meta descripciones en 10 páginas clave',
        description: 'Homepage, urgencias, cita previa, y top 7 especialidades más buscadas.',
        impact: 'medium',
        effort: 'low',
      },
      {
        id: randomUUID(),
        title: 'Cloudflare Free como CDN y HTTP/2',
        description: 'Activar Cloudflare en DNS: CDN gratuito, HTTP/2, Brotli y protección DDoS básica.',
        impact: 'medium',
        effort: 'low',
      },
    ],
    medium_term: [
      {
        id: randomUUID(),
        title: 'Hreflang para contenido bilingüe es/ca',
        description:
          'Implementar etiquetas hreflang en todo el site. Necesario para posicionamiento en búsquedas en catalán y evitar penalización por contenido duplicado.',
        impact: 'high',
        effort: 'medium',
        dependencies: [],
      },
      {
        id: randomUUID(),
        title: 'Auditoría y corrección WCAG 2.1 AA',
        description:
          'Obligación legal como entidad pública (RD 1112/2018). Alt text en imágenes, contraste de color, navegabilidad por teclado, ARIA landmarks.',
        impact: 'high',
        effort: 'medium',
        dependencies: [],
      },
      {
        id: randomUUID(),
        title: 'Corrección RGPD — consentimiento previo de cookies',
        description:
          'Bloquear GA4 hasta consentimiento explícito. Configuración del CMP (Consent Management Platform) existente.',
        impact: 'medium',
        effort: 'low',
        dependencies: [],
      },
      {
        id: randomUUID(),
        title: 'Digitalización de formularios administrativos prioritarios',
        description:
          'Convertir los 3–5 formularios PDF más descargados a formularios web con envío a bandeja de email del departamento.',
        impact: 'medium',
        effort: 'medium',
        dependencies: [],
      },
    ],
    strategic: [
      {
        id: randomUUID(),
        title: 'Widget de cita previa integrado en el site del hospital',
        description:
          'Desarrollar capa de integración con API IBSALUT que permita iniciar cita sin salir del dominio hospitalsonespases.es. Máxima reducción de fricción en conversión principal.',
        impact: 'high',
        effort: 'high',
        dependencies: [],
      },
      {
        id: randomUUID(),
        title: 'Microsite de excelencia clínica e investigación (IdISBa)',
        description:
          'Sección dedicada con indicadores de calidad, ensayos clínicos activos, publicaciones y reconocimientos. Diferencia Son Espases de centros privados y posiciona la marca académica.',
        impact: 'high',
        effort: 'high',
        dependencies: [],
      },
      {
        id: randomUUID(),
        title: 'Migración a infraestructura con CDN gestionado + HTTP/2',
        description:
          'Hosting WordPress gestionado (Kinsta/WP Engine) con CDN integrado, actualizaciones automáticas y entorno de staging. Elimina deuda técnica de infraestructura de raíz.',
        impact: 'medium',
        effort: 'high',
        dependencies: [],
      },
    ],
    scorecard: [
      { domain_key: 'tech_infrastructure', label: 'Tech Infrastructure', score: 2, weight: 1.2, weighted_score: 2.4 },
      { domain_key: 'security_compliance', label: 'Security & Compliance', score: 3, weight: 1.6, weighted_score: 4.8 },
      { domain_key: 'seo_digital', label: 'SEO & Digital', score: 2, weight: 1.0, weighted_score: 2.0 },
      { domain_key: 'ux_conversion', label: 'UX & Conversion', score: 2, weight: 1.3, weighted_score: 2.6 },
      { domain_key: 'marketing_utp', label: 'Marketing & Positioning', score: 2, weight: 1.0, weighted_score: 2.0 },
      { domain_key: 'automation_processes', label: 'Automation & Processes', score: 2, weight: 1.1, weighted_score: 2.2 },
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. Review points (3 gates)
// ---------------------------------------------------------------------------
function buildReviews(auditId: string) {
  return [
    {
      id: randomUUID(),
      audit_id: auditId,
      after_phase: 0,
      status: 'approved',
      consultant_notes:
        'La cita previa está gestionada íntegramente por el sistema IBSALUT de la Conselleria de Salut. El hospital no tiene autonomía técnica para modificar ese portal. Cualquier mejora del flujo de cita debe plantearse como integración o capa sobre IBSALUT, no como sustitución.',
      interview_notes: null,
      approved_at: t(12),
    },
    {
      id: randomUUID(),
      audit_id: auditId,
      after_phase: 4,
      status: 'approved',
      consultant_notes:
        'La dirección confirma que el presupuesto TI para el sitio web es limitado y aprobado anualmente por la Conselleria. Las mejoras de gran envergadura (portal de paciente, rediseño completo) requieren aprobación presupuestaria bianual.',
      interview_notes:
        'El director de comunicación señala que están abiertos a mejoras incrementales que no requieran licitación pública (umbral: <€15.000 por proyecto). Las mejoras técnicas de seguridad y SEO pueden ejecutarse con el proveedor actual.',
      approved_at: t(55),
    },
    {
      id: randomUUID(),
      audit_id: auditId,
      after_phase: 6,
      status: 'approved',
      consultant_notes: null,
      interview_notes: null,
      approved_at: t(88),
    },
  ];
}

// ---------------------------------------------------------------------------
// 6. Pipeline events (phase log)
// ---------------------------------------------------------------------------
function buildEvents(auditId: string) {
  const events = [];
  let id = 1;

  const push = (phase: number, event_type: string, message: string | null, data: Record<string, unknown>, minutesOffset: number) => {
    events.push({ id: id++, audit_id: auditId, phase, event_type, message, data, created_at: t(minutesOffset) });
  };

  // Phase 0 — Recon
  push(0, 'collecting', 'Crawling hospitalsonespases.es…', { collector: 'crawler' }, 1);
  push(0, 'collecting', 'Extracting tech stack and social profiles…', { collector: 'recon' }, 2);
  push(0, 'assembling_context', null, {}, 3);
  push(0, 'analyzing', 'Calling Claude — Recon phase…', {}, 4);
  push(0, 'token_usage', null, { input_tokens: 8400, output_tokens: 1200, model: 'claude-sonnet-4-20250514', cost_usd: 0.034 }, 6);
  push(0, 'completed', 'Recon complete — Healthcare / Palma de Mallorca', { score: null }, 7);
  push(0, 'review_needed', 'Review Gate 1 — please add consultant notes before continuing', { after_phase: 0 }, 7);

  // Phase 1 — Tech
  push(1, 'collecting', 'Checking HTTP headers and performance signals…', { collector: 'performance' }, 14);
  push(1, 'assembling_context', null, {}, 15);
  push(1, 'analyzing', 'Calling Claude — Tech Infrastructure…', {}, 16);
  push(1, 'fact_check', 'No CDN header detected — score cap applied', { corrections: [{ field: 'cdn_present', expected: false, found: false }] }, 18);
  push(1, 'token_usage', null, { input_tokens: 12200, output_tokens: 1800, model: 'claude-sonnet-4-20250514', cost_usd: 0.051 }, 19);
  push(1, 'completed', 'Tech Infrastructure — Score: 2 / Needs Work', { score: 2 }, 19);

  // Phase 2 — Security
  push(2, 'collecting', 'Checking SSL, security headers, cookies…', { collector: 'security_headers' }, 20);
  push(2, 'assembling_context', null, {}, 21);
  push(2, 'analyzing', 'Calling Claude — Security & Compliance…', {}, 22);
  push(2, 'token_usage', null, { input_tokens: 11800, output_tokens: 1600, model: 'claude-sonnet-4-20250514', cost_usd: 0.047 }, 24);
  push(2, 'completed', 'Security & Compliance — Score: 3 / Moderate', { score: 3 }, 24);

  // Phase 3 — SEO
  push(3, 'collecting', 'Checking meta tags, sitemap, structured data…', { collector: 'seo_meta' }, 25);
  push(3, 'assembling_context', null, {}, 26);
  push(3, 'analyzing', 'Calling Claude — SEO & Digital…', {}, 27);
  push(3, 'fact_check', 'No JSON-LD detected — confirmed by collector', { corrections: [] }, 29);
  push(3, 'token_usage', null, { input_tokens: 13400, output_tokens: 1900, model: 'claude-sonnet-4-20250514', cost_usd: 0.056 }, 29);
  push(3, 'completed', 'SEO & Digital — Score: 2 / Needs Work', { score: 2 }, 29);

  // Phase 4 — UX
  push(4, 'collecting', 'Analysing page structure, navigation, CTAs, accessibility…', { collector: 'accessibility' }, 30);
  push(4, 'assembling_context', null, {}, 31);
  push(4, 'analyzing', 'Calling Claude — UX & Conversion…', {}, 32);
  push(4, 'token_usage', null, { input_tokens: 14100, output_tokens: 2100, model: 'claude-sonnet-4-20250514', cost_usd: 0.061 }, 34);
  push(4, 'completed', 'UX & Conversion — Score: 2 / Needs Work', { score: 2 }, 34);
  push(4, 'review_needed', 'Review Gate 2 — add notes before Analytic Wing', { after_phase: 4 }, 34);

  // Phase 5 — Marketing
  push(5, 'assembling_context', 'Including consultant + interview notes from Gate 2…', {}, 57);
  push(5, 'analyzing', 'Calling Claude — Marketing & Positioning…', {}, 58);
  push(5, 'token_usage', null, { input_tokens: 16800, output_tokens: 2400, model: 'claude-sonnet-4-20250514', cost_usd: 0.071 }, 60);
  push(5, 'completed', 'Marketing & Positioning — Score: 2 / Needs Work', { score: 2 }, 60);

  // Phase 6 — Automation
  push(6, 'assembling_context', null, {}, 61);
  push(6, 'analyzing', 'Calling Claude — Automation & Processes…', {}, 62);
  push(6, 'token_usage', null, { input_tokens: 15200, output_tokens: 2200, model: 'claude-sonnet-4-20250514', cost_usd: 0.063 }, 64);
  push(6, 'completed', 'Automation & Processes — Score: 2 / Needs Work', { score: 2 }, 64);
  push(6, 'review_needed', 'Review Gate 3 — final approval before Strategy synthesis', { after_phase: 6 }, 64);

  // Phase 7 — Strategy
  push(7, 'assembling_context', 'Synthesising all 6 domains + all review notes…', {}, 90);
  push(7, 'analyzing', 'Calling Claude — Strategy synthesis…', {}, 91);
  push(7, 'token_usage', null, { input_tokens: 24600, output_tokens: 3800, model: 'claude-sonnet-4-20250514', cost_usd: 0.110 }, 94);
  push(7, 'completed', 'Strategy complete — Overall score: 2.2', { score: 2.2 }, 95);

  return events;
}
