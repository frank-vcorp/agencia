/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, context/CATALOGO_ACTIVOS_V1.md, context/MATRIZ_COMBINACIONES_ACTIVOS_P0.md
 */
export type RoleKey = "operador" | "disenador" | "cliente";
export type ModuleKey = "briefs" | "cotizaciones" | "activos" | "crm" | "contexto-agentes";

type RolePage = {
  key: RoleKey;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

type ModulePage = {
  key: ModuleKey;
  href: string;
  label: string;
  description: string;
  metric: string;
};

type RoleView = {
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  priority: {
    title: string;
    detail: string;
  };
  metrics: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  focus: Array<{
    title: string;
    detail: string;
  }>;
  queue: Array<{
    title: string;
    state: string;
    detail: string;
  }>;
  modules: ModuleKey[];
  handoffs: Array<{
    title: string;
    target: string;
    detail: string;
  }>;
};

export const rolePages: RolePage[] = [
  {
    key: "operador",
    href: "/operador",
    label: "Operador",
    shortLabel: "Ops",
    description: "Cabina de control para briefs, cotizaciones, aprobaciones y seguimiento general."
  },
  {
    key: "disenador",
    href: "/disenador",
    label: "Disenador",
    shortLabel: "Creativo",
    description: "Estacion clara para revisar briefs, prompts, referencias y versiones creativas."
  },
  {
    key: "cliente",
    href: "/cliente",
    label: "Cliente",
    shortLabel: "Portal",
    description: "Vista simple para responder, aprobar, revisar contexto y observar avance."
  }
];

export const modulePages: ModulePage[] = [
  {
    key: "briefs",
    href: "/briefs",
    label: "Briefs",
    description: "Estructura conversaciones en decisiones y campos reutilizables.",
    metric: "4 activos"
  },
  {
    key: "cotizaciones",
    href: "/cotizaciones",
    label: "Cotizaciones",
    description: "Versiones comerciales visibles para operador y cliente con siguiente accion clara.",
    metric: "2 vigentes"
  },
  {
    key: "activos",
    href: "/activos",
    label: "Activos",
    description: "Catalogo tipificado y flujo de piezas conectadas al piloto P0.",
    metric: "16 combos"
  },
  {
    key: "crm",
    href: "/crm",
    label: "CRM",
    description: "Seguimiento ligero de leads, origen y proximas respuestas.",
    metric: "Sin leads"
  },
  {
    key: "contexto-agentes",
    href: "/contexto-agentes",
    label: "Contexto para agentes",
    description: "Resumen derivado, frescura y puntos de handoff para VS Code y agentes remotos.",
    metric: "5 snapshots"
  }
];

export const shellMeta = {
  roles: rolePages,
  modules: modulePages
};

export const strategicSignals = [
  {
    label: "Roles base",
    value: "3",
    detail: "Operador, disenador y cliente trabajan sobre el mismo contexto con prioridades distintas."
  },
  {
    label: "Objetos P0",
    value: "5",
    detail: "Briefs, cotizaciones, activos, CRM y contexto para agentes quedan visibles desde el shell."
  },
  {
    label: "Preparacion de datos",
    value: "Supabase ready",
    detail: "Variables, tenant y punto de montaje listos sin bloquear la demo por credenciales."
  }
];

export const p0Combinations = [
  {
    id: "p0_whatsapp_status_video",
    app: "WhatsApp",
    piece: "video",
    placement: "status",
    format: "vertical 9:16",
    family: "visual"
  },
  {
    id: "p0_whatsapp_dm_image",
    app: "WhatsApp",
    piece: "image",
    placement: "direct_message",
    format: "square 1:1",
    family: "visual"
  },
  {
    id: "p0_whatsapp_dm_copy",
    app: "WhatsApp",
    piece: "copy",
    placement: "direct_message",
    format: "short text",
    family: "textual"
  },
  {
    id: "p0_instagram_feed_square",
    app: "Instagram",
    piece: "image",
    placement: "feed",
    format: "square 1:1",
    family: "visual"
  },
  {
    id: "p0_instagram_feed_vertical",
    app: "Instagram",
    piece: "image",
    placement: "feed",
    format: "vertical 4:5",
    family: "visual"
  },
  {
    id: "p0_instagram_reel",
    app: "Instagram",
    piece: "reel",
    placement: "reel",
    format: "vertical 9:16",
    family: "visual"
  },
  {
    id: "p0_instagram_story",
    app: "Instagram",
    piece: "story",
    placement: "story",
    format: "vertical 9:16",
    family: "visual"
  },
  {
    id: "p0_facebook_feed_image",
    app: "Facebook",
    piece: "image",
    placement: "feed",
    format: "square 1:1",
    family: "visual"
  },
  {
    id: "p0_facebook_story_video",
    app: "Facebook",
    piece: "video",
    placement: "story",
    format: "vertical 9:16",
    family: "visual"
  },
  {
    id: "p0_facebook_ad_copy",
    app: "Facebook",
    piece: "copy",
    placement: "conversion",
    format: "short text",
    family: "textual"
  },
  {
    id: "p0_tiktok_infeed_video",
    app: "TikTok",
    piece: "video",
    placement: "in_feed",
    format: "vertical 9:16",
    family: "visual"
  },
  {
    id: "p0_google_search_text",
    app: "Google",
    piece: "text_ad",
    placement: "search",
    format: "short text",
    family: "textual"
  },
  {
    id: "p0_google_display_banner",
    app: "Google",
    piece: "banner",
    placement: "display",
    format: "horizontal 16:9",
    family: "visual"
  },
  {
    id: "p0_google_display_square",
    app: "Google",
    piece: "image",
    placement: "display",
    format: "square 1:1",
    family: "visual"
  },
  {
    id: "p0_landing_hero",
    app: "Landing Page",
    piece: "landing_section",
    placement: "hero",
    format: "long text",
    family: "estructural"
  },
  {
    id: "p0_landing_benefits",
    app: "Landing Page",
    piece: "landing_section",
    placement: "conversion",
    format: "long text",
    family: "estructural"
  }
];

export const roleViews: Record<RoleKey, RoleView> = {
  operador: {
    label: "Operador",
    eyebrow: "Cabina de control",
    title: "Prioriza decisiones, valida contexto y empuja el flujo completo",
    summary:
      "La vista del operador concentra el estado del piloto, los bloqueos comerciales y las aprobaciones que conectan VS Code con el resto del sistema.",
    priority: {
      title: "Alinear brief y cotizacion",
      detail: "La operacion inicia cuando el brief consolidado y la version vigente de la cotizacion cuentan la misma historia."
    },
    metrics: [
      {
        label: "Briefs activos",
        value: "4",
        detail: "Dos en consolidacion y dos listos para respuesta del cliente."
      },
      {
        label: "Aprobaciones pendientes",
        value: "3",
        detail: "Una de contexto, una de activo y una comercial."
      },
      {
        label: "Cotizacion vigente",
        value: "v2",
        detail: "Version preparada para revision del cliente piloto."
      }
    ],
    focus: [
      {
        title: "Unificar datos fuente y contexto derivado",
        detail: "El operador decide cuando el resumen es suficiente y cuando conviene abrir la entidad primaria."
      },
      {
        title: "Activar handoffs limpios",
        detail: "Cada aprobacion debe dejar trazabilidad clara para disenador, cliente y agente remoto."
      },
      {
        title: "Contener complejidad",
        detail: "La V1 muestra solo objetos P0 para evitar que el piloto se fragmente en pantallas de mas."
      }
    ],
    queue: [
      {
        title: "Consolidar brief de lanzamiento comercial",
        state: "en revision",
        detail: "Cruza respuesta del cliente con decisiones de alcance y campos estructurados para agentes."
      },
      {
        title: "Marcar cotizacion vigente del piloto",
        state: "hoy",
        detail: "Deja visible el diferencial entre version actual y propuesta anterior."
      },
      {
        title: "Confirmar combinacion de activo para WhatsApp status",
        state: "listo para pasar",
        detail: "Usa el contrato P0 para enviar una solicitud limpia a diseno."
      }
    ],
    modules: ["briefs", "cotizaciones", "activos", "crm", "contexto-agentes"],
    handoffs: [
      {
        title: "Brief consolidado y taxonomia de activo",
        target: "Disenador",
        detail: "Entrega contexto preciso, referencias y restricciones antes de producir versiones creativas."
      },
      {
        title: "Cotizacion visible con siguiente accion",
        target: "Cliente",
        detail: "Reduce ambiguedad comercial y deja claro que debe aprobar o comentar."
      },
      {
        title: "Snapshot de contexto derivado",
        target: "Agente remoto",
        detail: "Permite operar desde VS Code sin releer todo el historial humano."
      }
    ]
  },
  disenador: {
    label: "Disenador",
    eyebrow: "Estacion creativa",
    title: "Revisa contexto, transforma prompts y ordena versiones del activo",
    summary:
      "La superficie creativa baja el ruido y deja visible solo el brief, la combinacion de activo, las referencias y la version actual para producir sin ambiguedad.",
    priority: {
      title: "Convertir contexto en piezas operables",
      detail: "La meta no es mostrar una galeria, sino una mesa de trabajo que haga evidente que sigue y que ya fue aprobado."
    },
    metrics: [
      {
        label: "Solicitudes listas",
        value: "5",
        detail: "Activos con formato y placement ya definidos por catalogo."
      },
      {
        label: "Referencias visibles",
        value: "12",
        detail: "Moodboards, notas del cliente y restricciones tecnicas a mano."
      },
      {
        label: "Versiones candidatas",
        value: "3",
        detail: "Dos para revision interna y una preparada para operador."
      }
    ],
    focus: [
      {
        title: "Cero ambiguedad en el prompt",
        detail: "Cada pieza nace desde una combinacion P0 y campos guiados, no desde texto libre suelto."
      },
      {
        title: "Versionado legible",
        detail: "El historial distingue evidencia intermedia, version candidata y archivo final aprobado."
      },
      {
        title: "Comentarios con decision",
        detail: "La cabina creativa privilegia observaciones utiles para el siguiente actor, no chatter residual."
      }
    ],
    queue: [
      {
        title: "Preparar story vertical para Instagram",
        state: "nuevo",
        detail: "Incluye CTA, mensaje principal y referencia visual del cliente."
      },
      {
        title: "Comparar dos hooks para TikTok in-feed",
        state: "en curso",
        detail: "La decision de apertura impacta la pieza y el copy asociado."
      },
      {
        title: "Marcar version aprobada por diseno",
        state: "esperando operador",
        detail: "La pieza ya tiene formato correcto y comentarios de calidad resueltos."
      }
    ],
    modules: ["briefs", "activos", "contexto-agentes"],
    handoffs: [
      {
        title: "Version candidata comentada",
        target: "Operador",
        detail: "El operador recibe una pieza con decision visual explicita y trazabilidad de cambios."
      },
      {
        title: "Prompts reutilizables por familia",
        target: "Agente remoto",
        detail: "Sirven para prellenar solicitudes futuras sin perder control humano."
      },
      {
        title: "Visual listo para aprobacion visible",
        target: "Cliente",
        detail: "Cuando aplique, el cliente ve una version limpia, no el proceso entero."
      }
    ]
  },
  cliente: {
    label: "Cliente",
    eyebrow: "Portal visible",
    title: "Responde, revisa y entiende el avance sin tener que descifrar la operacion interna",
    summary:
      "La vista de cliente simplifica el sistema: muestra contexto relevante, documentos vigentes, avances y proximas aprobaciones de forma clara y confiable.",
    priority: {
      title: "Claridad antes que profundidad",
      detail: "El cliente ve menos modulos, pero con mucho mas sentido de progreso y proximos pasos."
    },
    metrics: [
      {
        label: "Pendientes del cliente",
        value: "2",
        detail: "Una respuesta de brief y una aprobacion comercial."
      },
      {
        label: "Activos visibles",
        value: "3",
        detail: "Se muestran solo entregables listos para observacion o aprobacion."
      },
      {
        label: "Leads observables",
        value: "12",
        detail: "El mini CRM expone senales simples segun el servicio contratado."
      }
    ],
    focus: [
      {
        title: "Lectura simple del estado",
        detail: "Cada documento explica si esta en borrador, vigente, aprobado o en espera."
      },
      {
        title: "Carga de contexto sin friccion",
        detail: "La experiencia prioriza archivos, comentarios y decisiones que aceleran al equipo."
      },
      {
        title: "Confianza en lo visible",
        detail: "El portal elimina sensacion de caos y muestra una ruta de avance madura."
      }
    ],
    queue: [
      {
        title: "Responder campo pendiente del brief",
        state: "ahora",
        detail: "La pieza solicita solo la informacion faltante para no reabrir todo el proceso."
      },
      {
        title: "Revisar cotizacion vigente",
        state: "esta semana",
        detail: "La version actual resalta alcance, siguientes pasos y observaciones abiertas."
      },
      {
        title: "Validar activo visible",
        state: "cuando aplique",
        detail: "Se revisa la pieza final sin exponer versiones intermedias innecesarias."
      }
    ],
    modules: ["briefs", "cotizaciones", "crm"],
    handoffs: [
      {
        title: "Respuesta estructurada del brief",
        target: "Operador",
        detail: "Permite consolidar contexto y destrabar decisiones sin volver al chat disperso."
      },
      {
        title: "Comentario sobre alcance o propuesta",
        target: "Comercial",
        detail: "Aclara si la cotizacion puede pasar a aceptacion administrativa."
      },
      {
        title: "Nueva referencia o evidencia",
        target: "Disenador",
        detail: "La informacion llega asociada al activo o pieza correcta."
      }
    ]
  }
};

export const moduleDetails: Record<
  ModuleKey,
  {
    roles: RoleKey[];
    status: string;
    metrics: Array<{ label: string; value: string; detail: string }>;
    flow: Array<{ stage: string; title: string; detail: string }>;
    readiness: Array<{ title: string; detail: string }>;
  }
> = {
  briefs: {
    roles: ["operador", "disenador", "cliente"],
    status: "Base lista para convertir conversaciones en campos estructurados.",
    metrics: [
      { label: "Conversaciones", value: "4", detail: "Cada brief queda tratado como entidad compartida, no solo como chat." },
      { label: "Campos guiados", value: "11", detail: "Objetivo, oferta, publico, CTA y restricciones quedan visibles." },
      { label: "Respuestas del cliente", value: "2", detail: "Pendientes en superficie simple y trazable." }
    ],
    flow: [
      { stage: "1", title: "Captura conversacional", detail: "La interfaz deja un placeholder listo para integrar Claude sin rediseñar el modulo." },
      { stage: "2", title: "Consolidacion operativa", detail: "El operador revisa consistencia y convierte la conversacion en brief vigente." },
      { stage: "3", title: "Consumo creativo y comercial", detail: "Diseno y cliente reciben una lectura distinta del mismo brief." }
    ],
    readiness: [
      { title: "Schema futuro", detail: "El modulo ya delimita estados base: borrador, consolidado, respuesta pendiente y cerrado." },
      { title: "Conector IA", detail: "Puede enchufarse un endpoint para estructurar respuestas sin tocar el shell visual." },
      { title: "Tenant-aware", detail: "El tenant activo ya vive en entorno y puede pasar a layouts o providers luego." },
      { title: "Aprobaciones", detail: "Hay espacio para distinguir consolidacion del operador y respuesta del cliente." }
    ]
  },
  cotizaciones: {
    roles: ["operador", "cliente"],
    status: "Vista madura para versiones comerciales y siguiente accion.",
    metrics: [
      { label: "Versiones", value: "3", detail: "Una vigente, una historica y una en revision." },
      { label: "Observaciones", value: "5", detail: "Resumen rapido de cambios y comentarios abiertos." },
      { label: "Proxima accion", value: "aceptar", detail: "La CTA principal se reserva para el cliente cuando aplique." }
    ],
    flow: [
      { stage: "1", title: "Borrador generado", detail: "El operador o un agente puede prellenar la propuesta desde contexto derivado." },
      { stage: "2", title: "Version vigente", detail: "La vista distingue la propuesta actual del historial sin saturar al cliente." },
      { stage: "3", title: "Aceptacion visible", detail: "Queda espacio claro para aprobacion comercial y cierre administrativo." }
    ],
    readiness: [
      { title: "Versionado", detail: "El layout asume cotizaciones versionadas desde el inicio, como define la arquitectura." },
      { title: "Comparativa", detail: "Se puede extender con diff entre propuestas sin cambiar la shell principal." },
      { title: "RLS futura", detail: "El modulo esta acotado para proteger visibilidad por tenant y cliente." },
      { title: "Aprobaciones", detail: "Se puede incorporar aceptacion comercial sin reconstruir la UI base." }
    ]
  },
  activos: {
    roles: ["operador", "disenador"],
    status: "Contrato visual inicial conectado al catalogo y a la matriz P0.",
    metrics: [
      { label: "Combinaciones P0", value: "16", detail: "El shell ya muestra el contrato minimo aprobado para el piloto." },
      { label: "Familias", value: "3", detail: "Visual, textual y estructural conviven sin inventar nuevas piezas." },
      { label: "Solicitudes activas", value: "5", detail: "Las piezas usan taxonomia controlada en lugar de texto libre." }
    ],
    flow: [
      { stage: "1", title: "Seleccion tipificada", detail: "Se parte desde aplicativo, tipo de pieza, placement y formato." },
      { stage: "2", title: "Produccion con versionado", detail: "El disenador trabaja con evidencia intermedia y version candidata bien diferenciadas." },
      { stage: "3", title: "Aprobacion y entrega", detail: "Operador y cliente reciben solo la vista necesaria segun el estado del activo." }
    ],
    readiness: [
      { title: "Catalogo ejecutable", detail: "La UI ya puede consumir enums o registros reales desde Supabase cuando existan." },
      { title: "Firefly despues", detail: "La produccion externa puede conectarse como referencia sin romper el modelo base." },
      { title: "Archivos y evidencias", detail: "El modulo anticipa estados de version sin implementar storage todavia." },
      { title: "Campos guiados", detail: "El siguiente paso natural es enlazar presets y validaciones por familia." }
    ]
  },
  crm: {
    roles: ["operador", "cliente"],
    status: "CRM ligero para visibilidad y seguimiento sin convertir la V1 en suite pesada.",
    metrics: [
      { label: "Leads", value: "12", detail: "Origen, prioridad y estado resumidos en lenguaje simple." },
      { label: "Siguientes respuestas", value: "4", detail: "El operador ve acciones inmediatas y el cliente solo el avance relevante." },
      { label: "Canales", value: "3", detail: "WhatsApp, formularios y referidos listos para tipificar despues." }
    ],
    flow: [
      { stage: "1", title: "Captura ligera", detail: "El CRM se entiende como apoyo operativo, no como producto separado del piloto." },
      { stage: "2", title: "Seguimiento visible", detail: "Se muestran estados utiles y proximas acciones en una sola superficie." },
      { stage: "3", title: "Lectura para el cliente", detail: "El portal deja ver solo lo contratado y relevante para evitar ruido." }
    ],
    readiness: [
      { title: "Modelo minimo", detail: "El shell permite conectar una tabla de leads simple cuando exista el schema base." },
      { title: "Estadisticas luego", detail: "El modulo no depende de dashboards complejos para ser util desde ya." },
      { title: "Scope controlado", detail: "Se mantiene como CRM mini, en linea con la arquitectura y el dictamen tecnico." },
      { title: "Tenant por defecto", detail: "La configuracion futura puede filtrar por tenant sin rehacer navegacion ni cards." }
    ]
  },
  "contexto-agentes": {
    roles: ["operador", "disenador"],
    status: "Punto de handoff visible para resumen derivado y operacion remota.",
    metrics: [
      { label: "Snapshots", value: "5", detail: "Cada resumen derivado debe indicar frescura y origen antes de ejecutar acciones." },
      { label: "Fuentes", value: "4", detail: "Brief, cotizacion, activos y CRM alimentan el contexto util para agentes." },
      { label: "Uso sensible", value: "manual", detail: "Las acciones visibles siguen requiriendo validacion humana." }
    ],
    flow: [
      { stage: "1", title: "Generacion derivada", detail: "La vista deja claro que el contexto resumido no reemplaza a la entidad fuente." },
      { stage: "2", title: "Consulta remota", detail: "VS Code y futuros agentes pueden consumir un snapshot compacto y trazable." },
      { stage: "3", title: "Validacion humana", detail: "Si el resumen cambia decisiones visibles, el operador conserva el control." }
    ],
    readiness: [
      { title: "Env listo", detail: "El entorno ya contempla tenant y variables publicas para servicios futuros." },
      { title: "Boundary claro", detail: "El modulo existe como objeto separado para no mezclar contexto con datos fuente." },
      { title: "Integracion remota", detail: "El siguiente paso es exponer contratos seguros por internet, no acoplamientos locales." },
      { title: "Politica de frescura", detail: "La UI ya reserva lenguaje para version de origen y momento de regeneracion." }
    ]
  }
};
