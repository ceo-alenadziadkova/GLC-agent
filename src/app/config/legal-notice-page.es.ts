/**
 * Aviso Legal (LSSI, España) — statutory website legal notice.
 * Source: counsel-approved text supplied for publication on glctech.es.
 */

export type LegalNoticeSection = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
};

export const LEGAL_NOTICE_PAGE_ES = {
  htmlLang: 'es',
  documentTitle: 'Aviso Legal / Legal Notice',
  titlePrimary: 'Aviso Legal',
  titleSecondary: 'Legal Notice',
  backToHome: 'Volver al inicio',
  sections: [
    {
      id: 'identificacion',
      title: '1. Identificación del titular',
      paragraphs: [
        'De conformidad con lo dispuesto en la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de los siguientes datos:',
        'Titular del sitio web: Alena Dziadkova (en adelante, "GLC")\nNIF: Z3331966F\nDomicilio: C/ Francesc Suau 13, 2º 2B, 07010, Palma de Mallorca, Illes Balears, España\nCorreo electrónico de contacto: alena.dziadkova@glctech.es\nActividad: Servicios de consultoría, auditoría y análisis de negocios y productos digitales.',
      ],
    },
    {
      id: 'objeto',
      title: '2. Objeto del sitio web',
      paragraphs: [
        'El presente sitio web tiene por objeto ofrecer información sobre los servicios de consultoría y auditoría proporcionados por GLC, así como permitir el contacto y, en su caso, la contratación de dichos servicios.',
        'El acceso y/o uso de este sitio web atribuye la condición de usuario e implica la aceptación de este Aviso Legal.',
      ],
    },
    {
      id: 'condiciones',
      title: '3. Condiciones de uso',
      paragraphs: [
        'El usuario se compromete a utilizar el sitio web, sus contenidos y servicios de conformidad con la ley, el presente Aviso Legal, las condiciones específicas que, en su caso, se establezcan, así como con la moral y el orden público.',
        'Queda prohibido cualquier uso del sitio web con fines ilícitos o lesivos de derechos o intereses de GLC o de terceros.',
      ],
    },
    {
      id: 'propiedad-intelectual',
      title: '4. Propiedad intelectual e industrial',
      paragraphs: [
        'Todos los contenidos del sitio web (textos, imágenes, logotipos, marcas, código fuente, diseño, etc.) son titularidad de GLC o de terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial.',
        'Queda prohibida cualquier forma de reproducción, distribución, comunicación pública, transformación o puesta a disposición, salvo autorización expresa y por escrito de GLC o del titular de los derechos correspondientes.',
      ],
    },
    {
      id: 'enlaces',
      title: '5. Enlaces',
      paragraphs: [
        'El sitio web puede contener enlaces a sitios web de terceros. GLC no asume responsabilidad alguna por los contenidos, informaciones o servicios que pudieran aparecer en dichos sitios, que tendrán exclusivamente carácter informativo.',
        'La inclusión de estos enlaces no implica relación, recomendación, patrocinio o aprobación por parte de GLC.',
      ],
    },
    {
      id: 'exclusion',
      title: '6. Exclusión de responsabilidad',
      paragraphs: [
        'GLC no garantiza la disponibilidad y continuidad del funcionamiento del sitio web, ni que esté libre de errores o virus. El usuario navega por su cuenta y riesgo.',
        'En ningún caso GLC será responsable de los daños y perjuicios de cualquier naturaleza que puedan derivarse del acceso o uso del sitio web, incluidos, sin carácter limitativo, los errores u omisiones en los contenidos o la falta de disponibilidad del portal.',
      ],
    },
    {
      id: 'proteccion-datos',
      title: '7. Protección de datos personales',
      paragraphs: [
        'El tratamiento de los datos personales recabados a través del sitio web se regirá por la Política de Privacidad y la Política de Cookies, que el usuario puede consultar en los enlaces correspondientes.',
      ],
    },
    {
      id: 'legislacion',
      title: '8. Legislación aplicable y jurisdicción',
      paragraphs: [
        'El presente Aviso Legal se rige por la legislación española.',
        'Para la resolución de cualquier conflicto derivado del acceso o uso del sitio web, las partes se someten, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a los Juzgados y Tribunales de Palma de Mallorca, salvo que la normativa imperativa determine otro fuero distinto.',
      ],
    },
  ] as const satisfies readonly LegalNoticeSection[],
} as const;
