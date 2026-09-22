// ─── R-13/13.5: Módulos de Prácticas Profesionales de Contabilidad ─
// Catálogo de módulos procedurales que guían al alumno paso a paso.
// Cada módulo: pasos de guía conceptual + workflow real + explicación
// del asiento contable + prueba de conocimiento + curso teórico con
// el NPC capacitador + tracker semanal con tareas repetidas (mecanización).
// Los números/validaciones SIEMPRE salen de los motores reales
// (workflowEngine / autoEntries / persistentData / taskPlanner).

import { generateMonthPlan } from './taskPlanner';

export interface PracticaPaso {
  id: string;
  titulo: string;
  tipo: 'guia' | 'tarea' | 'asiento';
  descripcion: string;
  taskType?: string;        // solo si tipo === 'tarea'
  datos?: string[];         // qué datos del documento/portal debe identificar
  // Para pasos 'asiento': resumen del asiento que verá en el diario
  asiento?: { cargo: string; abono: string; cuentas: string; concepto: string };
}

export interface PracticaPregunta {
  q: string;
  opciones: string[];
  correcta: number;         // índice de la opción correcta
  explicacion: string;      // por qué es correcta (feedback pedagógico)
}

export interface PracticaPrueba {
  titulo: string;
  aprobarMin: number;       // % mínimo de aciertos para aprobar (0-100)
  preguntas: PracticaPregunta[];
}

export interface PracticaCursoSeccion {
  titulo: string;
  texto: string;            // teoría explicada
  puntos?: string[];        // ideas clave
}

export interface PracticaCurso {
  id: string;               // id del módulo al que pertenece
  titulo: string;
  npc: string;              // id del NPC capacitador
  introduccion: string;     // mensaje de bienvenida del capacitador
  secciones: PracticaCursoSeccion[];
  cierre: string;           // mensaje de cierre del capacitador
}

export interface PracticaRepeticion {
  taskType: string;
  titulo: string;           // título de la tarea repetida
  veces: number;            // cuántas veces se repite en la semana (del plan real)
  explicacion: string;      // por qué se repite (mecanización del procedimiento)
}

export interface PracticaTrackerSemana {
  week: number;
  tema: string;             // título del módulo de la semana
  moduloId: string;         // módulo asociado
  objetivo: string;
  repeticiones: PracticaRepeticion[];
  prueba: PracticaPrueba;
}

export interface PracticaModulo {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  objetivo: string;
  semanas: string;          // rango de semanas del plan de prácticas
  plataforma: string;       // plataforma principal: 'contabilidad' | 'contalink' | (futuro: 'odoo'...)
  pasos: PracticaPaso[];
  skill: string;            // dimensión de habilidad (skillProfile)
  prueba: PracticaPrueba;   // prueba de conocimiento/comprensión del tema
  curso: PracticaCurso;     // curso básico teórico con el NPC capacitador
}

// Catálogo de plataformas principales: la especialidad `practicas` es un
// catálogo; cada módulo pertenece a una plataforma (hoy Contalink, mañana Odoo...).
export interface PlataformaModulo {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
}

export const PLATAFORMAS_MODULOS: PlataformaModulo[] = [
  { id: 'contabilidad', nombre: 'Contabilidad general', icono: '📒', descripcion: 'CFDI, gastos, cobranza, proveedores, nómina y cierre. Práctica contable base.' },
  { id: 'contalink', nombre: 'Contalink', icono: '🔗', descripcion: 'Flujos reales del sistema Contalink: conciliación, auditoría, nómina y DIOT (webinars).' },
];

export function getPlataformasModulos(): PlataformaModulo[] {
  return PLATAFORMAS_MODULOS;
}

// ─── Pruebas de conocimiento por módulo (contenido pedagógico) ──
// Las respuestas correctas son pedagógicas y estables (no IA). La
// validación de tareas reales NO se toca: esto es comprensión del tema.

const PRUEBA_CFDI: PracticaPrueba = {
  titulo: 'Prueba de CFDI 4.0 y facturación',
  aprobarMin: 80,
  preguntas: [
    {
      q: '¿Qué es un CFDI?',
      opciones: [
        'Un estado de cuenta bancario',
        'El comprobante fiscal digital que se timbra ante el SAT',
        'Un contrato de trabajo',
        'Una nota interna de almacén',
      ],
      correcta: 1,
      explicacion: 'El CFDI (Comprobante Fiscal Digital por Internet) es el documento que se timbra ante el SAT y permite al cliente deducir y a la empresa cumplir fiscalmente.',
    },
    {
      q: 'Si el RFC del cliente está mal, ¿qué pasa?',
      opciones: [
        'Nada, el SAT lo corrige solo',
        'Solo se retrasa el timbre unos minutos',
        'El CFDI se rechaza y el cliente no puede deducir',
        'Se cobra una multa automática del 10%',
      ],
      correcta: 2,
      explicacion: 'Un RFC incorrecto invalida el CFDI: el SAT lo rechaza, el cliente no deduce y la empresa arriesga multas.',
    },
    {
      q: '¿Cuál es la tasa de IVA aplicable a servicios de transporte en México?',
      opciones: ['8%', '10%', '16%', '21%'],
      correcta: 2,
      explicacion: 'El IVA general es del 16% (tasa 0.16). El 10% es una trampa común: la tasa fronteriza ya no aplica a todo el país desde 2014.',
    },
    {
      q: 'El "uso de CFDI" en el comprobante sirve para...',
      opciones: [
        'Definir el color del formato impreso',
        'Indicar el destino fiscal del comprobante (ej. G03, G01, P01)',
        'Guardar el nombre del cajero',
        'Nada, es opcional',
      ],
      correcta: 1,
      explicacion: 'El uso de CFDI indica el destino fiscal (G03 gastos en general, G01 adquisición de mercancías, P01 por definir, etc.) y es obligatorio en el CFDI 4.0.',
    },
  ],
};

const PRUEBA_GASTOS: PracticaPrueba = {
  titulo: 'Prueba de gastos y deducibilidad',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'De un ticket de restaurante, ¿cuál importe NO es deducible?',
      opciones: ['El subtotal de consumos', 'El IVA desglosado', 'La propina', 'El total'],
      correcta: 2,
      explicacion: 'La propina es un gasto NO deducible: no tiene comprobante fiscal propio y la ley no permite deducirla.',
    },
    {
      q: '¿Qué porcentaje de los consumos en restaurantes es deducible?',
      opciones: ['100%', '65%', '50%', '35%'],
      correcta: 1,
      explicacion: 'La LISR limita la deducción de consumo en restaurantes al 65% del subtotal.',
    },
    {
      q: 'El IVA del gasto de restaurante se registra como...',
      opciones: ['Gasto no deducible', 'IVA acreditable (reduces tu IVA a pagar)', 'Ingreso', 'Ninguna, se ignora'],
      correcta: 1,
      explicacion: 'El IVA de un gasto con CFDI es acreditable: reduces el IVA que tu empresa paga al SAT.',
    },
    {
      q: '¿Qué cuenta contable se carga por el gasto de comida empresarial?',
      opciones: ['1-02 Bancos', '2-01 Proveedores', '5-03 Gastos de administración', '4-01 Ventas'],
      correcta: 2,
      explicacion: 'El gasto de comida de trabajo se registra como gasto de administración (5-03) por el subtotal deducible.',
    },
  ],
};

const PRUEBA_COBRANZA: PracticaPrueba = {
  titulo: 'Prueba de cobranza y registro de pagos',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'Recibes un SPEI de Comercial del Norte por $50,000. ¿A qué lo aplicas?',
      opciones: [
        'A la factura de mayor monto de cualquier cliente',
        'A la factura de Comercial del Norte que está pendiente',
        'Como anticipo genérico sin factura',
        'Al pago del proveedor',
      ],
      correcta: 1,
      explicacion: 'El pago se aplica a la factura pendiente del cliente que pagó. Aplicarlo a otro cliente corrompe saldos (trampa #2).',
    },
    {
      q: 'El saldo pendiente de una factura de $50,000 tras recibir $30,000 es...',
      opciones: ['$50,000', '$80,000', '$20,000', '$30,000'],
      correcta: 2,
      explicacion: 'Saldo pendiente = total − monto recibido = 50,000 − 30,000 = 20,000. La factura queda como pago parcial.',
    },
    {
      q: '¿Qué se registra al recibir el pago de un cliente?',
      opciones: [
        'Cargo a bancos, abono a clientes',
        'Cargo a clientes, abono a ventas',
        'Cargo a ventas, abono a bancos',
        'Nada, el pago no se registra',
      ],
      correcta: 0,
      explicacion: 'El pago aumenta el banco (cargo 1-02) y reduce la cuenta por cobrar del cliente (abono 1-03).',
    },
  ],
};

const PRUEBA_PROVEEDORES: PracticaPrueba = {
  titulo: 'Prueba de proveedores y CFDI de gastos',
  aprobarMin: 80,
  preguntas: [
    {
      q: '¿Qué te permite un CFDI de proveedor?',
      opciones: [
        'Cobrar más a tus clientes',
        'Acreditar el IVA (reducir tu IVA a pagar) y deducir el gasto',
        'Emitir una factura',
        'Nada, solo es un documento',
      ],
      correcta: 1,
      explicacion: 'El CFDI de un gasto permite acreditar el IVA y deducir la compra en tu declaración.',
    },
    {
      q: 'La cuenta que se abona al registrar una factura de proveedor es...',
      opciones: ['1-02 Bancos', '1-03 Clientes', '2-01 Proveedores', '4-01 Ventas'],
      correcta: 2,
      explicacion: 'Al comprar a crédito se genera un pasivo: se abona a proveedores (2-01).',
    },
    {
      q: '¿Qué debes validar en el CFDI de un proveedor?',
      opciones: [
        'Que el RFC del proveedor sea válido y la tasa de IVA sea 16%',
        'Que el color del formato sea azul',
        'Que la fecha sea del año anterior',
        'Que el total sea en dólares',
      ],
      correcta: 0,
      explicacion: 'Un RFC inválido o una tasa de IVA incorrecta invalida la acreditación del IVA.',
    },
  ],
};

const PRUEBA_NOMINA: PracticaPrueba = {
  titulo: 'Prueba de nómina, ISR e IMSS',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'El ISR se calcula con...',
      opciones: [
        'Un porcentaje fijo del 15% siempre',
        'La tabla progresiva del SAT según el nivel de ingresos',
        'El salario mínimo',
        'Un cálculo libre de la empresa',
      ],
      correcta: 1,
      explicacion: 'El ISR usa la tarifa progresiva del SAT por rangos de ingreso. Un 15% fijo es la trampa #4.',
    },
    {
      q: 'El sueldo NETO se obtiene así:',
      opciones: [
        'Bruto + ISR + IMSS',
        'Bruto − ISR − IMSS − otras retenciones',
        'Bruto × 2',
        'Bruto ÷ 12',
      ],
      correcta: 1,
      explicacion: 'Neto = bruto − retenciones (ISR, IMSS, cuotas y otras deducciones).',
    },
    {
      q: '¿Qué significa PTU?',
      opciones: [
        'Pago Trimestral Único',
        'Participación de los Trabajadores en las Utilidades',
        'Plan de Trabajo Universitario',
        'Prestación Temporal de Uso',
      ],
      correcta: 1,
      explicacion: 'La PTU es la participación de los trabajadores en las utilidades de la empresa (obligación anual).',
    },
  ],
};

const PRUEBA_CIERRE: PracticaPrueba = {
  titulo: 'Prueba de conciliación y cierre',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'Una diferencia típica en conciliación bancaria es...',
      opciones: [
        'Un cheque emitido que aún no se cobra',
        'Una venta a crédito',
        'Un ajuste de depreciación',
        'Una nota de crédito',
      ],
      correcta: 0,
      explicacion: 'Los cheques en circulación (emitidos, no cobrados) son la causa más común de diferencia entre banco y libros.',
    },
    {
      q: '¿Para qué sirve la balanza de comprobación?',
      opciones: [
        'Para pagar impuestos',
        'Para verificar que débitos = créditos y preparar los estados financieros',
        'Para facturar',
        'Para hacer nómina',
      ],
      correcta: 1,
      explicacion: 'La balanza resume todas las cuentas y verifica el equilibrio contable; de ahí salen el balance general y el estado de resultados.',
    },
    {
      q: 'El cierre del mes sirve para...',
      opciones: [
        'Borrar todas las facturas',
        'Preparar la base de la declaración mensual y los estados financieros',
        'Aumentar el IVA',
        'Cancelar proveedores',
      ],
      correcta: 1,
      explicacion: 'Con el cierre cuadrado se prepara la declaración mensual y los estados financieros del período.',
    },
  ],
};

const PRUEBA_CONCILIACION: PracticaPrueba = {
  titulo: 'Prueba de conciliación bancaria (webinar)',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'Factura por 4419.60 y movimiento por 1219.60: ¿cuánto queda pendiente?',
      opciones: ['4419.60', '3200.00', '1219.60', '5639.20'],
      correcta: 1,
      explicacion: 'Resto = factura − movimiento = 4419.60 − 1219.60 = 3200.00. Es un pago parcial: el resto sigue pendiente de cobro.',
    },
    {
      q: 'Compra por 45 USD y el banco muestra 789. ¿Qué tipo de cambio usas?',
      opciones: [
        '17.53 (redondeado a 2 decimales)',
        '789/45 con todos los decimales (17.5333...)',
        'El del día que yo quiera',
        'Ninguno, los dólares no se concilian',
      ],
      correcta: 1,
      explicacion: 'El TC se calcula con todos los decimales (789/45). Redondearlo a 2 decimales es el error típico; el centavo de diferencia va a cuenta.',
    },
    {
      q: 'Para mover dinero entre dos bancos de la empresa debes...',
      opciones: [
        'Registrarlo directo al otro banco',
        'Pasarlo por la cuenta puente (Traspaso bancario 899 y 104)',
        'Esperar a fin de mes',
        'Pedir autorización al SAT',
      ],
      correcta: 1,
      explicacion: 'Los traspasos entre bancos propios pasan por la cuenta puente 899/104. Registrarlo directo a otro banco descuadra la conciliación.',
    },
  ],
};

const PRUEBA_AUDITORIA: PracticaPrueba = {
  titulo: 'Prueba de auditoría e impuestos (webinar)',
  aprobarMin: 80,
  preguntas: [
    {
      q: '¿Qué módulo bloquea la DIOT?',
      opciones: ['M1', 'M2', 'M3', 'Ninguno'],
      correcta: 0,
      explicacion: 'M1 bloquea la DIOT: sin M1 cerrado no hay declaración, aunque M2 y M3 estén listos.',
    },
    {
      q: 'IVA cobrado 1600 e IVA pagado 424.22: ¿cuál es el IVA a cargo del ejemplo?',
      opciones: ['2024.22', '1175.78', '194.67', '1600'],
      correcta: 2,
      explicacion: 'El IVA a cargo del caso es 194.67 (cobrado menos pagado y ajustes de deducibilidad y retenciones).',
    },
    {
      q: 'En la base DIOT al 16%, las operaciones al 0%...',
      opciones: [
        'Suman a la base igual que las demás',
        'Solo se informan, no suman base',
        'Se ignoran por completo',
        'Se reportan al 16%',
      ],
      correcta: 1,
      explicacion: 'La base DIOT 4606 es solo operaciones al 16%; las del 0% se informan pero no suman base.',
    },
  ],
};

const PRUEBA_NOMINA_WEB: PracticaPrueba = {
  titulo: 'Prueba de nómina semanal (webinar)',
  aprobarMin: 80,
  preguntas: [
    {
      q: '¿Cómo se calcula el ISR de un sueldo?',
      opciones: [
        'Con 15% fijo para todos',
        'Con la tarifa progresiva del SAT según el ingreso',
        'Con 10% fijo',
        'No se calcula, lo pone el banco',
      ],
      correcta: 1,
      explicacion: 'El ISR usa la tarifa progresiva (a mayor ingreso, mayor tasa). El 15% fijo es la trampa #4 y puede generar demandas laborales.',
    },
    {
      q: 'Una asimilada de 10000 lleva...',
      opciones: [
        'ISR + IMSS como asalariada',
        'Solo ISR (sin IMSS)',
        'Solo IMSS (sin ISR)',
        'Ninguna retención',
      ],
      correcta: 1,
      explicacion: 'La asimilada no es asalariada: solo lleva ISR (371 con tarifa tramo 2), sin IMSS. Neto = 9629.',
    },
    {
      q: 'La prima a 5 días...',
      opciones: [
        'Quedó totalmente exenta',
        'Excedió el exento y el excedente grava',
        'No se paga en este caso',
        'Se paga al doble',
      ],
      correcta: 1,
      explicacion: 'La prima de 5 días (1590.95) excedió el exento: el excedente grava ISR.',
    },
  ],
};

const PRUEBA_REPORTE: PracticaPrueba = {
  titulo: 'Prueba de DIOT online (video Diego Ramos)',
  aprobarMin: 80,
  preguntas: [
    {
      q: '¿Qué fecha manda para clasificar una operación en la DIOT?',
      opciones: [
        'La fecha de emisión de la factura',
        'La fecha de pago/conciliación',
        'La fecha que yo elija',
        'La del cierre anual',
      ],
      correcta: 1,
      explicacion: 'Manda el pago: Dic-emitida/Ene-pagada va a Ene; PPD + complemento de Ene va a Ene. Canceladas y pólizas manuales quedan fuera.',
    },
    {
      q: 'Nov-2025 ya tiene una Normal en el SAT. ¿Qué presentas desde Contalink?',
      opciones: ['Otra Normal', 'Complementaria', 'Nada, ya está', 'En ceros'],
      correcta: 1,
      explicacion: 'Si ya existe una Normal en el SAT, el envío debe ser Complementaria; una segunda Normal la rechaza el portal.',
    },
    {
      q: 'El SAT está caído a mitad de tu envío. ¿Qué haces?',
      opciones: [
        'Reenvías de inmediato hasta que pase',
        'Esperas 1-2h (máx 5 intentos/día) sin reenviar',
        'Cancelas todo y empiezas de cero',
        'Llamas al SAT por teléfono',
      ],
      correcta: 1,
      explicacion: 'Con SAT caído se espera 1-2h con reintentos programados (máx 5/día). Reenviar de inmediato está prohibido.',
    },
  ],
};

const PRUEBA_POLIZA: PracticaPrueba = {
  titulo: 'Prueba de pólizas y código agrupador (Anexo 24)',
  aprobarMin: 80,
  preguntas: [
    {
      q: 'Arrendamiento a persona física por 70,900 con ISR retenido de 7,090. ¿Cuál es el asiento correcto?',
      opciones: [
        'DEBE 601.45 70,900 / HABER 216.03 7,090 / HABER 102.01 63,810',
        'DEBE 601.45 63,810 / HABER 102.01 63,810',
        'DEBE 601.45 70,900 / HABER 102.01 70,900',
        'DEBE 216.03 7,090 / HABER 601.45 7,090',
      ],
      correcta: 0,
      explicacion: 'El gasto va completo al DEBE (70,900); la retención ISR 10% va al HABER en 216.03 y solo sale del banco el neto 63,810. 70,900 = 7,090 + 63,810.',
    },
    {
      q: 'Un CFDI PPD por 1,000 + IVA 160. ¿Cómo se provisiona?',
      opciones: [
        'DEBE 601.45 1,000 / DEBE 118.01 160 / HABER 102.01 1,160',
        'DEBE 601.45 1,000 / DEBE 119.01 160 / HABER 201.01 1,160',
        'DEBE 201.01 1,160 / HABER 102.01 1,160',
        'No se registra hasta que se pague',
      ],
      correcta: 1,
      explicacion: 'PPD = provisión: gasto + IVA pendiente (119.01, no 118.01 acreditable) contra proveedores 201.01. El banco se toca hasta el pago.',
    },
    {
      q: 'La póliza Contalink usa la cuenta 601-83 y tu Excel dice 601.45. ¿Qué significa?',
      opciones: [
        'Una de las dos está mal y hay que corregirla',
        '601-83 es la cuenta interna y 601.45 su código agrupador SAT: es la equivalencia del Anexo 24',
        'Son dos operaciones distintas',
        'El SAT cambió el código y nadie avisó',
      ],
      correcta: 1,
      explicacion: 'El Anexo 24 sección A exige asociar cada cuenta del contribuyente (601-83) a su código agrupador (601.45) por naturaleza y preponderancia. La balanza electrónica se envía por agrupador.',
    },
    {
      q: 'El arrendador es persona moral (RFC de 12 caracteres). ¿Qué cuenta usas y qué pasa con la retención?',
      opciones: [
        '601.45, igual que siempre',
        '601.46 arrendamiento a PM y sin retención del 10%',
        '601.83 no deducible',
        '102.01 bancos directo',
      ],
      correcta: 1,
      explicacion: 'PM = 601.46, y a una moral NO le retienes el 10% de ISR (Art. 116 LISR solo aplica a personas físicas). Si el CFDI trae retención, está mal timbrado.',
    },
    {
      q: 'Quieres registrar la renta deducible. ¿Qué escribes en la póliza?',
      opciones: [
        '601.83',
        '601-83 (que viaja como 601.45)',
        'Las dos son lo mismo',
        'Ninguna, la renta no se registra',
      ],
      correcta: 1,
      explicacion: '601.83 con punto = gasto NO deducible (sin requisitos fiscales). 601-83 con guion es tu cuenta interna que viaja como 601.45 deducible. Un carácter decide la deducción.',
    },
  ],
};

const PRUEBAS: Record<string, PracticaPrueba> = {
  'mod-cfdi': PRUEBA_CFDI,
  'mod-gastos': PRUEBA_GASTOS,
  'mod-cobranza': PRUEBA_COBRANZA,
  'mod-proveedores': PRUEBA_PROVEEDORES,
  'mod-nomina': PRUEBA_NOMINA,
  'mod-cierre': PRUEBA_CIERRE,
  'mod-conciliacion': PRUEBA_CONCILIACION,
  'mod-auditoria': PRUEBA_AUDITORIA,
  'mod-nomina-web': PRUEBA_NOMINA_WEB,
  'mod-reporte': PRUEBA_REPORTE,
  'mod-polizas': PRUEBA_POLIZA,
};

// ─── Cursos teóricos con el NPC capacitador ────────────────────
// Contenido pedagógico: el capacitador explica la teoría del tema
// en secciones con puntos clave. Coherente con cada módulo.

const CURSOS: Record<string, PracticaCurso> = {
  'mod-cfdi': {
    id: 'mod-cfdi',
    titulo: 'Curso básico: CFDI 4.0 y facturación',
    npc: 'capacitador',
    introduccion: 'Hola, te doy la bienvenida a tus prácticas profesionales. Hoy aprenderás la base de toda la contabilidad de Logística del Norte: la facturación electrónica. Te explicaré qué es un CFDI y por qué cada dato importa.',
    secciones: [
      {
        titulo: '¿Qué es el CFDI 4.0?',
        texto: 'El CFDI es el comprobante fiscal digital que se envía al SAT y se "timbra" para tener validez. Sin timbre, tu cliente no puede deducir el gasto y tu empresa arriesga una multa. Desde 2022 se usa la versión 4.0, que exige más datos que la anterior.',
        puntos: ['CFDI = Comprobante Fiscal Digital por Internet', 'Se timbra ante el SAT en línea', 'La versión actual es la 4.0'],
      },
      {
        titulo: 'Los datos que no pueden fallar',
        texto: 'El RFC del emisor y del receptor deben ser exactos. El uso de CFDI indica el destino fiscal del comprobante (G03, G01, P01...). El régimen fiscal y el método de pago (PUE, PPD) también son obligatorios. Un solo error y el SAT rechaza el timbre.',
        puntos: ['RFC exacto del emisor y receptor', 'Uso de CFDI obligatorio', 'Régimen fiscal y método de pago'],
      },
      {
        titulo: 'El IVA: por qué 16%',
        texto: 'El IVA general en México es del 16%. El 10% solo aplicó en zona fronteriza en el pasado y ya no es la regla. Al facturar servicios de transporte, multiplica el subtotal por 0.16 y suma el IVA al total.',
        puntos: ['IVA = subtotal × 16%', 'Total = subtotal + IVA', 'Cuidado con la trampa del 10%'],
      },
    ],
    cierre: 'Listo. Ahora abre tu correo y emite tu primera factura. Usa el botón 💡 Guía si necesitas recordar qué va en cada campo. Yo estaré aquí si te atoras.',
  },
  'mod-gastos': {
    id: 'mod-gastos',
    titulo: 'Curso básico: gastos internos y deducibilidad',
    npc: 'capacitador',
    introduccion: 'Los gastos de la empresa no se pagan y ya: hay que registrarlos bien para deducir y acreditar IVA. Hoy veremos el caso de una comida de trabajo.',
    secciones: [
      {
        titulo: 'Leer el ticket del restaurante',
        texto: 'Del ticket solo importan: el RFC del establecimiento, el subtotal de consumos, el IVA desglosado (16%) y el total. La propina aparece al final, pero no es deducible.',
        puntos: ['RFC del establecimiento', 'Subtotal', 'IVA 16%', 'Propina (no deducible)'],
      },
      {
        titulo: 'La deducibilidad del 65%',
        texto: 'La LISR limita la deducción de consumos en restaurantes al 65% del subtotal. Eso significa que solo esa parte se puede restar de tus ingresos para pagar menos ISR.',
        puntos: ['Gasto deducible = subtotal × 65%', 'La propina nunca es deducible'],
      },
      {
        titulo: 'El IVA acreditable',
        texto: 'El IVA de un gasto con CFDI es acreditable: reduces el IVA que tu empresa paga al SAT. Se registra en la cuenta 2-03 como IVA acreditable.',
        puntos: ['IVA acreditable = IVA del consumo', 'Se abona contra el IVA por pagar'],
      },
    ],
    cierre: 'Perfecto. Ahora abre el correo con el ticket de La Parrilla del Norte, calcula el gasto deducible y registra la comida empresarial. Si dudas, activa la 💡 Guía.',
  },
  'mod-cobranza': {
    id: 'mod-cobranza',
    titulo: 'Curso básico: cobranza y registro de pagos',
    npc: 'capacitador',
    introduccion: 'Cobrar no es solo recibir dinero: hay que aplicarlo a la factura correcta. Te explico cómo hacerlo sin romper los saldos.',
    secciones: [
      {
        titulo: 'Cruzar el pago con la factura',
        texto: 'Cuando llega un SPEI, revisa quién paga (el remitente) y busca su factura pendiente. El error más común en las empresas es aplicar el pago del cliente A a la factura de B. Eso corrompe los saldos de ambos.',
        puntos: ['Identifica al remitente del SPEI', 'Busca la factura pendiente de ESE cliente'],
      },
      {
        titulo: 'Saldo pendiente',
        texto: 'Si el cliente paga de menos, la factura queda como pago parcial y el saldo sigue siendo cobrable. Saldo pendiente = total − monto recibido.',
        puntos: ['Saldo pendiente = total − recibido', 'Pago parcial no cierra la factura'],
      },
      {
        titulo: 'El asiento del pago',
        texto: 'Al recibir el pago, el banco aumenta y la cuenta por cobrar del cliente disminuye: cargo a bancos (1-02) y abono a clientes (1-03).',
        puntos: ['Cargo 1-02 Bancos', 'Abono 1-03 Clientes'],
      },
    ],
    cierre: 'Vas bien. Ahora registra el pago de Comercial del Norte: identifica la factura, calcula el saldo y aplica la transferencia. Recuerda usar la 💡 Guía si lo necesitas.',
  },
  'mod-proveedores': {
    id: 'mod-proveedores',
    titulo: 'Curso básico: proveedores y CFDI de gastos',
    npc: 'capacitador',
    introduccion: 'Así como tus clientes te piden facturas, tú debes recibir y registrar las de tus proveedores. Aquí te explico qué validar para no perder la acreditación del IVA.',
    secciones: [
      {
        titulo: 'CFDI recibido vs emitido',
        texto: 'El CFDI que recibes de un proveedor te permite acreditar el IVA y deducir la compra. Debe traer un RFC válido del proveedor y una tasa de IVA del 16%.',
        puntos: ['RFC del proveedor válido', 'Tasa de IVA 16%', 'Total = subtotal + IVA'],
      },
      {
        titulo: 'El pasivo con el proveedor',
        texto: 'Cuando compras a crédito, no pagas de inmediato: queda un pasivo. La cuenta que se abona es proveedores (2-01) y se carga la cuenta de compras o gasto correspondiente.',
        puntos: ['Cargo a compras/gasto', 'Abono 2-01 Proveedores'],
      },
      {
        titulo: 'IVA acreditable',
        texto: 'El IVA del gasto se registra en la cuenta 2-03 como IVA acreditable, reduciendo el IVA que tu empresa pagará al SAT.',
        puntos: ['2-03 IVA por pagar (lado acreditable)', 'Reduce el IVA a enterar'],
      },
    ],
    cierre: 'Muy bien. Ahora registra la factura de Transportes Express, valida su RFC y calcula el IVA acreditable. La 💡 Guía te acompañará paso a paso.',
  },
  'mod-nomina': {
    id: 'mod-nomina',
    titulo: 'Curso básico: nómina, ISR e IMSS',
    npc: 'capacitador',
    introduccion: 'La nómina es uno de los temas donde más errores caros se cometen. Te explico lo esencial para calcularla bien.',
    secciones: [
      {
        titulo: 'Bruto vs neto',
        texto: 'El sueldo bruto es lo que se pacta; el neto es lo que el empleado recibe después de retenciones. La diferencia son el ISR, el IMSS y otras deducciones.',
        puntos: ['Bruto = lo pactado', 'Neto = bruto − retenciones'],
      },
      {
        titulo: 'El ISR con tabla progresiva',
        texto: 'El ISR se calcula con la tarifa del SAT: a mayor ingreso, mayor porcentaje. Nunca se usa un porcentaje fijo como 15% para todos: eso es un error laboral y fiscal grave.',
        puntos: ['Tarifa progresiva del SAT', 'Trampa: ISR fijo del 15%'],
      },
      {
        titulo: 'IMSS y PTU',
        texto: 'El IMSS cubre riesgos de trabajo, enfermedad y retiro, y se aporta entre empleado y empresa. La PTU es la participación de los trabajadores en las utilidades y se paga cada año.',
        puntos: ['IMSS: cuota obrero-patronal', 'PTU: participación en utilidades'],
      },
    ],
    cierre: 'Ya sabes lo básico. Ahora abre el correo de Recursos Humanos y calcula la nómina del mes. Asegúrate de que el ISR salga de la tabla, no de un 15% fijo. 💡 Guía disponible.',
  },
  'mod-cierre': {
    id: 'mod-cierre',
    titulo: 'Curso básico: conciliación bancaria y cierre',
    npc: 'capacitador',
    introduccion: 'Todo el mes de operaciones termina en un momento clave: conciliar el banco y cerrar el período. Aquí te explico el porqué de cada paso.',
    secciones: [
      {
        titulo: 'Por qué el banco no cuadra',
        texto: 'Tu registro interno y el estado de cuenta rara vez coinciden al instante. Las diferencias típicas son cheques emitidos que aún no se cobran, comisiones bancarias no registradas y depósitos en tránsito.',
        puntos: ['Cheques sin cobrar', 'Comisiones no registradas', 'Depósitos en tránsito'],
      },
      {
        titulo: 'Conciliar es cuadrar las dos versiones',
        texto: 'Conciliar significa explicar cada diferencia hasta que el saldo según banco y el saldo según libros sean coherentes. No se trata de "ajustar el número": se trata de entender qué pasó.',
        puntos: ['Explica cada diferencia', 'Saldo banco = saldo libros'],
      },
      {
        titulo: 'El cierre del mes',
        texto: 'Con todo cuadrado preparas la balanza de comprobación, el estado de resultados y el balance general. Eso es la base de tu declaración mensual.',
        puntos: ['Balanza de comprobación', 'Estado de resultados', 'Declaración mensual'],
      },
    ],
    cierre: 'Llegamos al final de tu capacitación. Ahora abre el estado de cuenta de julio, identifica las diferencias y concilia el banco. Yo te sigo acompañando con la 💡 Guía.',
  },
  'mod-conciliacion': {
    id: 'mod-conciliacion',
    titulo: 'Curso básico: conciliación bancaria real',
    npc: 'capacitador',
    introduccion: 'Vamos a conciliar un extracto de verdad, con los casos que salen en la vida real: pagos parciales, dólares y traspasos. Te explico cada uno antes de que abras la hoja.',
    secciones: [
      {
        titulo: 'Parciales y pagos agrupados',
        texto: 'Un pago parcial deja resto pendiente (factura menos movimiento). Y varios pagos pueden ir a una sola factura (1-vs-2) o varios cobros a una referencia (N-vs-1). Lo importante es sumar bien y atar cada monto a su folio.',
        puntos: ['Resto = factura − movimiento', '1-vs-2 y N-vs-1 se cuadran por suma'],
      },
      {
        titulo: 'Dólares con todos los decimales',
        texto: 'El tipo de cambio se calcula con todos los decimales (789/45). Si lo redondeas a 2 decimales, el centavo descuadra: ese centavo va a cuenta, nunca se ignora.',
        puntos: ['TC = 789/45 completo', 'Diferencia 0.01 a cuenta'],
      },
      {
        titulo: 'Traspasos por puente y cierre',
        texto: 'Mover dinero entre bancos propios pasa por la cuenta puente 899/104, jamás directo. Y cada póliza lleva la fecha de su movimiento; al cerrar se marca la revaluación.',
        puntos: ['Puente 899/104, no directo', 'Fecha póliza = fecha movimiento', 'Cierre con revaluación'],
      },
    ],
    cierre: 'Quedó claro. Abre el correo de Pedro Castillo y concilia el extracto BBVA caso por caso. La 💡 Guía te acompaña en cada fila.',
  },
  'mod-auditoria': {
    id: 'mod-auditoria',
    titulo: 'Curso básico: auditoría, DIOT e IVA',
    npc: 'capacitador',
    introduccion: 'Auditar es verificar que lo cobrado, lo pagado y lo declarado cuadren entre sí. Te explico los módulos, la DIOT y el IVA a cargo con el ejemplo del webinar.',
    secciones: [
      {
        titulo: 'M1, M2, M3 y el bloqueo',
        texto: 'El sistema trabaja por módulos M1, M2 y M3. M1 bloquea la DIOT: sin M1 cerrado no hay declaración posible, aunque el resto esté listo.',
        puntos: ['M1 bloquea la DIOT', 'Verifica estatus por módulo'],
      },
      {
        titulo: 'Cobrado vs pagado y la DIOT',
        texto: 'Compara lo cobrado (10000 con IVA 1600) contra egresos (2787.88 con IVA 424.22). La base DIOT al 16% es 4606; el 0% solo se informa. El parcial 2507 va al 60%.',
        puntos: ['IVA a cargo del caso: 194.67', 'DIOT base 4606', 'Parcial 2507 al 60%'],
      },
      {
        titulo: 'Cuadre, portal y casos',
        texto: 'La balanza debe cuadrar en 0 (464 = 464) y la hoja contra el portal. Los casos a/b/c (72h, corte bancario, sin complemento) te dicen cómo proceder ante cada escenario.',
        puntos: ['Balanza 464 = 464', 'Portal: compras 2714, IVA 434', 'Casos a/b/c'],
      },
    ],
    cierre: 'Ya tienes el mapa. Abre el correo de la Directora Fiscal y cierra la auditoría: IVA 194.67 a cargo y DIOT liberada. Usa la 💡 Guía.',
  },
  'mod-nomina-web': {
    id: 'mod-nomina-web',
    titulo: 'Curso básico: nómina semanal real',
    npc: 'capacitador',
    introduccion: 'Calcular nómina es aplicar la tarifa correcta a cada caso: semanales, asimiladas, incidencias y finiquitos. Nada de porcentajes fijos: tarifa progresiva siempre.',
    secciones: [
      {
        titulo: 'Sueldo semanal y tarifa',
        texto: 'El sueldo semanal sale del diario por 7 (318.19 × 7 = 2227.33). El ISR se calcula con la tarifa del SAT por tramos. Con salario mínimo, ISR e IMSS van en 0.',
        puntos: ['Semanal = diario × 7', 'Tarifa progresiva, nunca 15% fijo', 'Mínimo → 0'],
      },
      {
        titulo: 'Asimiladas e incidencias',
        texto: 'La asimilada de 10000 solo lleva ISR (371 con tarifa) y su neto es 9629. Las incidencias se registran tal cual: Camila 3 días de vacaciones, Emilio 2 horas extra + 1 festivo.',
        puntos: ['Asimilada: solo ISR', 'Camila 3 vacaciones', 'Emilio 2 HE + 1 festivo'],
      },
      {
        titulo: 'Finiquito, prima y cierre',
        texto: 'El finiquito se separa en exento y gravable. La prima a 5 días excedió el exento y el excedente grava. Al cerrar: todas las cuentas asignadas y el pago contra caja por el neto exacto.',
        puntos: ['Exento vs gravable', 'Prima 5 días excedió exento', 'Caja = neto exacto'],
      },
    ],
    cierre: 'A calcular. Abre el correo de Recursos Humanos y arma la nómina semanal con tarifa. Si dudas entre bruto y neto, la 💡 Guía te ubica.',
  },
  'mod-reporte': {
    id: 'mod-reporte',
    titulo: 'Curso básico: DIOT online y acuse',
    npc: 'capacitador',
    introduccion: 'Presentar la DIOT sin entrar al SAT: clasificas por fecha de pago, cuadras contra la hoja, envías y descargas tu acuse. Te explico el flujo completo.',
    secciones: [
      {
        titulo: 'Ruta y columnas',
        texto: 'En Contalink vas a Contabilidad > Reportes > DIOT y eliges enero 2026. El TXT trae 23 columnas para ejercicios pre-2025 y 54 para 2025 en adelante, automático según el ejercicio.',
        puntos: ['Ruta: Contabilidad > Reportes > DIOT', '23 vs 54 columnas', 'Periodo enero 2026'],
      },
      {
        titulo: 'Clasificar por fecha de pago',
        texto: 'Manda el pago, no la emisión: Dic-emitida/Ene-pagada va a Ene, PPD + complemento de Ene va a Ene. Canceladas y pólizas manuales quedan fuera. El cuadre admite ±1 por redondeo.',
        puntos: ['Fecha DIOT = fecha de pago', 'Canceladas y manual fuera', 'Cuadre ±1'],
      },
      {
        titulo: 'Tipos, espera y acuse',
        texto: 'Eliges Normal/Complementaria + Previa/Definitiva + Con datos/En ceros. Ojo: si nov-2025 ya tiene Normal en el SAT, va Complementaria. Con SAT caído esperas 1-2h (máx 5/día) y cierras con folio de acuse + TXT idéntico.',
        puntos: ['Nov-2025 → Complementaria', 'Espera 1-2h, no reenviar', 'Folio + TXT idéntico'],
      },
    ],
    cierre: 'Listo para declarar. Abre el correo de Diego Ramos, clasifica las 6 operaciones y presenta enero 2026. La 💡 Guía te marca cada decisión.',
  },
  'mod-polizas': {
    id: 'mod-polizas',
    titulo: 'Curso básico: pólizas y código agrupador',
    npc: 'capacitador',
    introduccion: 'Del CFDI al asiento: concilias contra el banco, clasificas al agrupador SAT y cuadras DEBE = HABER. Te explico las 5 etapas con el caso MARCELO F.',
    secciones: [
      {
        titulo: 'PUE vs PPD',
        texto: 'PUE pagado es egreso directo: gasto + retenciones + bancos. PPD es solo provisión: gasto + IVA pendiente 119.01 + proveedores 201.01. El IVA acreditable 118.01 nace hasta el pago.',
        puntos: ['PUE = egreso', 'PPD = provisión', '118.01 solo al pagar'],
      },
      {
        titulo: 'Cuenta interna vs agrupador',
        texto: 'Tu póliza usa 601-83 pero el SAT recibe 601.45: esa equivalencia es la sección A del Anexo 24. Sin código agrupador la cuenta no entra a la balanza electrónica.',
        puntos: ['601-83 → 601.45', 'Sección A obligatoria', 'Balanza por agrupador'],
      },
      {
        titulo: 'La retención del 10%',
        texto: 'El arrendamiento a persona física retiene 10% de ISR (Art. 116 LISR): 70,900 × 10% = 7,090 a la 216.03. Si el CFDI trae otra cifra, se pide corrección.',
        puntos: ['10% exacto', 'Cuenta 216.03', '70,900 = 7,090 + 63,810'],
      },
      {
        titulo: 'PF vs PM y la trampa del guion',
        texto: 'Si quien factura es moral (RFC de 12), la cuenta es 601.46 y NO hay retención del 10%. Y ojo con 601.83 con punto: es gasto no deducible; tu cuenta deducible es 601-83 con guion, que viaja como 601.45.',
        puntos: ['PM = 601.46 sin retención', '601.83 punto = no deducible', '601-83 guion → 601.45'],
      },
    ],
    cierre: 'Ya tienes el mapa. Abre el Sim de Pólizas, carga el caso MARCELO F y guarda tu primera póliza. La 💡 Guía te acompaña línea por línea.',
  },
};

// ─── Tracker semanal (mecanización) ────────────────────────────
// Cada semana repite el mismo tipo de tarea varias veces para que el
// alumno memortice el procedimiento. Las veces se derivan del PLAN REAL
// (generateMonthPlan) para no desincronizarse con las tareas del día.

const REPETICION_POR_TIPO: Record<string, { titulo: string; explicacion: string }> = {
  invoice_emission: { titulo: 'Emitir factura', explicacion: 'Repites la facturación hasta dominar el flujo: RFC exacto → concepto → IVA 16% → total. La práctica fija el procedimiento.' },
  payment_registration: { titulo: 'Registrar pago', explicacion: 'Repites el registro de pagos para automatizar el cruce de cliente-factura y el cálculo del saldo pendiente.' },
  supplier_invoice: { titulo: 'Registrar CFDI de proveedor', explicacion: 'Repites el registro de facturas recibidas para aprender a validar RFC y calcular el IVA acreditable sin dudar.' },
  business_expense: { titulo: 'Registrar comida empresarial', explicacion: 'Repites el gasto de comida hasta mecanizar la lectura del ticket: subtotal, IVA, propina no deducible y deducibilidad 65%.' },
  bank_reconciliation: { titulo: 'Conciliar banco', explicacion: 'Repites la conciliación para reconocer las diferencias típicas (cheques sin cobrar, comisiones) y cuadrar sin errores.' },
  payroll: { titulo: 'Calcular nómina', explicacion: 'Repites el cálculo de nómina para dominar la tarifa de ISR y no caer en el error del porcentaje fijo.' },
  cash_cut: { titulo: 'Corte de caja', explicacion: 'Repites el corte de caja para verificar siempre que el efectivo cuadre contra lo registrado en el día.' },
  journal_entry: { titulo: 'Registrar póliza', explicacion: 'Repites las pólizas de diario para afianzar el registro de ajustes contables y el equilibrio débito-crédito.' },
  payment_scheduling: { titulo: 'Programar pago a proveedor', explicacion: 'Repites la programación de pagos para priorizar proveedores y no romper el flujo de efectivo de la empresa.' },
  cfdi_reception: { titulo: 'Recepción de CFDI', explicacion: 'Repites la recepción de comprobantes para mantener al día el buzón fiscal y detectar timbres pendientes.' },
  conciliacion_practica: { titulo: 'Conciliar extracto BBVA', explicacion: 'Repites la conciliación real del webinar para mecanizar parciales, pagos agrupados, dólares con TC completo y traspasos por puente.' },
  auditoria_practica: { titulo: 'Auditar mes e impuestos', explicacion: 'Repites la auditoría para fijar el flujo M1/M2/M3, la DIOT 4606 y el IVA a cargo 194.67 sin dudar.' },
  nomina_practica: { titulo: 'Calcular nómina semanal', explicacion: 'Repites la nómina real para dominar la tarifa progresiva, el filtro por periodicidad y las incidencias.' },
  reporte_practica: { titulo: 'Presentar DIOT online', explicacion: 'Repites la presentación DIOT para clasificar por fecha de pago y cerrar siempre con acuse.' },
  poliza_practica: { titulo: 'Capturar póliza con agrupador', explicacion: 'Repites la póliza del CFDI al asiento para fijar PUE vs PPD, el 10% de ISR y el cuadre DEBE = HABER.' },
};

const SEMANA_MODULO: Record<number, string> = {
  1: 'mod-cfdi',
  2: 'mod-gastos',
  3: 'mod-cobranza',
  4: 'mod-cierre',
};

export function buildPracticasTracker(month: number, year: number): PracticaTrackerSemana[] {
  const plan = generateMonthPlan(month, year, 'practicas');
  return plan.weekPlans.map((wp) => {
    const moduloId = SEMANA_MODULO[wp.week] || 'mod-cfdi';
    const modulo = PRACTICAS_MODULES.find((m) => m.id === moduloId);
    const counts = new Map<string, number>();
    for (const t of wp.tasks) {
      counts.set(t.type, (counts.get(t.type) || 0) + 1);
    }
    const repeticiones: PracticaRepeticion[] = [...counts.entries()]
      .map(([taskType, veces]) => {
        const meta = REPETICION_POR_TIPO[taskType] || { titulo: taskType.replace(/_/g, ' '), explicacion: 'Repites esta tarea para consolidar el procedimiento y ganar velocidad sin errores.' };
        return { taskType, titulo: meta.titulo, veces, explicacion: meta.explicacion };
      })
      .sort((a, b) => b.veces - a.veces);
    return {
      week: wp.week,
      tema: wp.theme.replace('Módulo ', 'Tema '),
      moduloId,
      objetivo: modulo?.objetivo || '',
      repeticiones,
      prueba: PRUEBAS[moduloId] || PRUEBA_CFDI,
    };
  });
}

export function getPracticasCursos(): PracticaCurso[] {
  return Object.values(CURSOS);
}

export function getPracticaCurso(id: string): PracticaCurso | undefined {
  return CURSOS[id];
}

export function evaluatePracticaPrueba(moduleId: string, answers: number[]): { moduleId: string; titulo: string; aprobarMin: number; aciertos: number; total: number; scorePct: number; aprobado: boolean; resultados: { q: string; correcta: number; elegida: number; acierto: boolean; explicacion: string }[] } {
  const prueba = PRUEBAS[moduleId];
  if (!prueba) {
    throw new Error(`Prueba no encontrada para el módulo ${moduleId}`);
  }
  const resultados = prueba.preguntas.map((p, i) => {
    const elegida = Number(answers[i]);
    const acierto = elegida === p.correcta;
    return { q: p.q, correcta: p.correcta, elegida, acierto, explicacion: p.explicacion };
  });
  const aciertos = resultados.filter((r) => r.acierto).length;
  const total = resultados.length;
  const scorePct = Math.round((aciertos / total) * 100);
  return {
    moduleId,
    titulo: prueba.titulo,
    aprobarMin: prueba.aprobarMin,
    aciertos,
    total,
    scorePct,
    aprobado: scorePct >= prueba.aprobarMin,
    resultados,
  };
}

export const PRACTICAS_MODULES: PracticaModulo[] = [
  {
    id: 'mod-cfdi',
    plataforma: 'contabilidad',
    titulo: 'Facturación electrónica (CFDI 4.0)',
    icono: '🧾',
    descripcion: 'Emitir facturas electrónicas como se hace en el portal del SAT y en Odoo.',
    objetivo: 'Que el alumno entienda qué es un CFDI, qué datos lleva y por qué el RFC y el IVA deben ser exactos.',
    semanas: 'Semanas 1-2',
    skill: 'facturacion',
    prueba: PRUEBA_CFDI,
    curso: CURSOS['mod-cfdi'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: '¿Qué es el CFDI 4.0?', descripcion: 'El comprobante fiscal digital que se timbra ante el SAT. Sin timbre, el cliente no deduce y la empresa recibe multa.', datos: ['RFC emisor y receptor', 'Uso de CFDI', 'Régimen fiscal', 'Método de pago'] },
      { id: 'p2', tipo: 'tarea', taskType: 'invoice_emission', titulo: 'Emite tu primera factura', descripcion: 'Abre el correo del Lic. Gómez y emite la factura. Usa el botón 💡 Guía para ver qué se hace en cada campo.', datos: ['Cliente y RFC exacto', 'Concepto del servicio', 'Cantidad × precio = subtotal', 'IVA 16%', 'Total'] },
      { id: 'p3', tipo: 'guia', titulo: '¿Qué pasa después de timbrar?', descripcion: 'El SAT genera el XML y el sello fiscal. Se envía copia al cliente y queda en tu buzón tributario. La factura se registra como Cuenta por Cobrar.', datos: ['1-03 Clientes (cargo)', '4-01 Ventas (abono)', '2-03 IVA por pagar (abono)'] },
      { id: 'p4', tipo: 'asiento', titulo: 'El asiento de la factura', descripcion: 'El sistema genera el asiento automáticamente al validar.', asiento: { cargo: '1-03 Clientes', abono: '4-01 Ventas + 2-03 IVA por pagar', cuentas: '1-03 / 4-01 / 2-03', concepto: 'Factura a cliente por servicio de transporte' } },
    ],
  },
  {
    id: 'mod-gastos',
    plataforma: 'contabilidad',
    titulo: 'Gastos internos: comida empresarial',
    icono: '🍽️',
    descripcion: 'Registrar un gasto por comida de trabajo leyendo el ticket del restaurante.',
    objetivo: 'Que el alumno sepa leer un ticket, separar deducible/no deducible y registrar el gasto con IVA acreditable.',
    semanas: 'Semanas 2-3',
    skill: 'gastos',
    prueba: PRUEBA_GASTOS,
    curso: CURSOS['mod-gastos'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: '¿Qué datos del ticket importan?', descripcion: 'Del ticket de restaurante solo importan: RFC del establecimiento, subtotal, IVA desglosado (16%) y total. La propina NO es deducible ni genera IVA.', datos: ['RFC del establecimiento', 'Subtotal (consumos)', 'IVA 16%', 'Propina (no deducible)', 'Total'] },
      { id: 'p2', tipo: 'tarea', taskType: 'business_expense', titulo: 'Registra la comida empresarial', descripcion: 'Abre el correo con el ticket de La Parrilla del Norte. Calcula IVA, total, gasto deducible (65%) e IVA acreditable. Usa la 💡 Guía.', datos: ['IVA = subtotal × 16%', 'Total = subtotal + IVA + propina', 'Gasto deducible = subtotal × 65%', 'IVA acreditable = IVA del consumo'] },
      { id: 'p3', tipo: 'guia', titulo: '¿Por qué 65%?', descripcion: 'La LISR limita la deducción de consumo en restaurantes al 65%. La propina se considera gasto no deducible y se reclasifica en la conciliación fiscal anual.', datos: ['LISR art. 28, fracc. XV'] },
      { id: 'p4', tipo: 'asiento', titulo: 'El asiento del gasto', descripcion: 'Cargo al gasto de administración + IVA acreditable, abono a bancos.', asiento: { cargo: '5-03 Gastos de administración + 2-03 IVA por pagar', abono: '1-02 Bancos', cuentas: '5-03 / 2-03 / 1-02', concepto: 'Gasto por comida empresarial (deducible 65%)' } },
    ],
  },
  {
    id: 'mod-cobranza',
    plataforma: 'contabilidad',
    titulo: 'Cobranza y registro de pagos',
    icono: '💳',
    descripcion: 'Aplicar pagos de clientes a facturas y controlar saldos.',
    objetivo: 'Que el alumno aplique un pago a la factura correcta y calcule el saldo pendiente sin errores.',
    semanas: 'Semanas 3-4',
    skill: 'cobranza',
    prueba: PRUEBA_COBRANZA,
    curso: CURSOS['mod-cobranza'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: '¿A qué factura aplico el pago?', descripcion: 'Cruza el nombre del remitente del SPEI contra la factura. Un error común es aplicar el pago del cliente A a la factura de B, corrompiendo saldos.', datos: ['Factura a pagar', 'Cliente', 'Monto recibido', 'Método de pago', 'Saldo pendiente'] },
      { id: 'p2', tipo: 'tarea', taskType: 'payment_registration', titulo: 'Registra el pago recibido', descripcion: 'Abre el correo del cliente y registra la transferencia. Calcula el saldo pendiente. Usa la 💡 Guía.', datos: ['Factura = total − monto recibido'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento del pago', descripcion: 'El sistema genera el asiento al validar.', asiento: { cargo: '1-02 Bancos', abono: '1-03 Clientes', cuentas: '1-02 / 1-03', concepto: 'Pago de cliente aplicado a factura' } },
    ],
  },
  {
    id: 'mod-proveedores',
    plataforma: 'contabilidad',
    titulo: 'Proveedores y CFDI de gastos',
    icono: '🚚',
    descripcion: 'Registrar facturas recibidas de proveedores y validar su IVA acreditable.',
    objetivo: 'Que el alumno valide un CFDI de proveedor y registre el pasivo con IVA acreditable.',
    semanas: 'Semanas 4-5',
    skill: 'proveedores',
    prueba: PRUEBA_PROVEEDORES,
    curso: CURSOS['mod-proveedores'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'CFDI recibido vs emitido', descripcion: 'Un CFDI de gasto te permite acreditar IVA (reducir lo que pagas al SAT). Debe tener RFC válido del proveedor y tasa de IVA 16%.', datos: ['RFC del proveedor', 'Subtotal', 'IVA 16%', 'Total', 'Categoría'] },
      { id: 'p2', tipo: 'tarea', taskType: 'supplier_invoice', titulo: 'Registra la factura del proveedor', descripcion: 'Abre el correo de Transportes Express y registra el CFDI. Usa la 💡 Guía.', datos: ['IVA = subtotal × 16%', 'Total = subtotal + IVA'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento de la compra', descripcion: 'Cargo a compras + IVA acreditable, abono a proveedores.', asiento: { cargo: '5-01 Compras + 2-03 IVA por pagar', abono: '2-01 Proveedores', cuentas: '5-01 / 2-03 / 2-01', concepto: 'Factura de proveedor por servicios' } },
    ],
  },
  {
    id: 'mod-nomina',
    plataforma: 'contabilidad',
    titulo: 'Nómina: sueldos, ISR e IMSS',
    icono: '👥',
    descripcion: 'Calcular la nómina mensual: sueldo bruto, ISR por tabla, IMSS, PTU y neto.',
    objetivo: 'Que el alumno entienda la diferencia entre sueldo bruto y neto y por qué el ISR se calcula con tabla progresiva, no con un % fijo.',
    semanas: 'Semanas 5-6',
    skill: 'nomina',
    prueba: PRUEBA_NOMINA,
    curso: CURSOS['mod-nomina'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'Bruto vs neto', descripcion: 'El bruto es lo pactado; el neto es lo que el empleado recibe después de ISR, IMSS y otras retenciones. El ISR se calcula con la tabla progresiva del SAT, NUNCA con un porcentaje fijo (eso es una trampa laboral).', datos: ['Sueldo bruto', 'ISR retenido (tabla)', 'IMSS', 'PTU', 'Sueldo neto'] },
      { id: 'p2', tipo: 'tarea', taskType: 'payroll', titulo: 'Calcula la nómina del mes', descripcion: 'Abre el correo de Recursos Humanos y calcula la nómina. Verifica que el ISR salga de la tabla, no de un 15% fijo. Usa la 💡 Guía.', datos: ['Neto = bruto − ISR − IMSS'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento de nómina', descripcion: 'Cargo a gasto de nómina, retenciones por pagar y dispersión bancaria.', asiento: { cargo: '5-04 Gastos de nómina', abono: '2-04 ISR + 2-08 IMSS + 1-02 Bancos', cuentas: '5-04 / 2-04 / 2-08 / 1-02', concepto: 'Nómina mensual' } },
    ],
  },
  {
    id: 'mod-cierre',
    plataforma: 'contabilidad',
    titulo: 'Conciliación bancaria y cierre',
    icono: '🏦',
    descripcion: 'Conciliar el banco contra los registros y preparar el cierre del mes.',
    objetivo: 'Que el alumno cuadre el estado de cuenta contra el sistema y detecte diferencias (cheques sin cobrar, comisiones).',
    semanas: 'Semanas 6-8',
    skill: 'conciliacion',
    prueba: PRUEBA_CIERRE,
    curso: CURSOS['mod-cierre'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: '¿Por qué el banco no cuadra?', descripcion: 'Las diferencias más comunes: cheques emitidos que aún no se cobran, comisiones bancarias no registradas y depósitos en tránsito. Debes identificarlas una por una.', datos: ['Saldo según banco', 'Saldo según libros', 'Cheques sin cobrar', 'Comisiones', 'Depósitos en tránsito'] },
      { id: 'p2', tipo: 'tarea', taskType: 'bank_reconciliation', titulo: 'Concilia el banco de julio', descripcion: 'Abre el estado de cuenta y concilia contra los registros. Usa la 💡 Guía.', datos: ['Detecta el cheque sin cobrar de $3,500'] },
      { id: 'p3', tipo: 'guia', titulo: 'Después de conciliar', descripcion: 'Con la conciliación cuadrada puedes preparar la balanza de comprobación y el estado de resultados del mes. El cierre es la base de la declaración mensual.', datos: ['Balanza de comprobación', 'Estado de resultados', 'Declaración mensual'] },
    ],
  },
  {
    id: 'mod-conciliacion',
    plataforma: 'contalink',
    titulo: 'Conciliación bancaria real (webinar)',
    icono: '🏦',
    descripcion: 'Conciliar el extracto BBVA con parciales, pagos agrupados, dólares y traspasos.',
    objetivo: 'Que el alumno concilie casos reales (parcial, 1-vs-2, N-vs-1, USD, traspaso, rebote, reembolso) y cierre con revaluación.',
    semanas: 'Contalink x4',
    skill: 'conciliacion',
    prueba: PRUEBA_CONCILIACION,
    curso: CURSOS['mod-conciliacion'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'Los 6 casos del extracto', descripcion: 'Parcial, 1-vs-2, N-vs-1, USD con TC completo, traspaso por puente, rebote y reembolso. Cada uno se cuadra distinto.', datos: ['Factura vs movimiento', 'Sumas y restos', 'TC con decimales', 'Cuenta puente'] },
      { id: 'p2', tipo: 'tarea', taskType: 'conciliacion_practica', titulo: 'Concilia el extracto BBVA', descripcion: 'Abre el correo de Pedro Castillo y calcula cada caso. Usa la 💡 Guía.', datos: ['Resto 3200.00', 'TC 789/45 completo', 'Puente 899/104', 'Fecha póliza = fecha movimiento'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento de la cobranza', descripcion: 'La cobranza conciliada se registra contra clientes.', asiento: { cargo: '1-02 Bancos', abono: '1-03 Clientes', cuentas: '1-02 / 1-03', concepto: 'Cobranza conciliada contra extracto BBVA 102-01-001' } },
    ],
  },
  {
    id: 'mod-auditoria',
    plataforma: 'contalink',
    titulo: 'Auditoría e impuestos (webinar)',
    icono: '🔍',
    descripcion: 'Auditar M1/M2/M3, validar la DIOT y determinar el IVA a cargo.',
    objetivo: 'Que el alumno verifique módulos, audite cobrado vs pagado y cierre con DIOT liberada e IVA 194.67 a cargo.',
    semanas: 'Contalink x4',
    skill: 'fiscal',
    prueba: PRUEBA_AUDITORIA,
    curso: CURSOS['mod-auditoria'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'M1 bloquea la DIOT', descripcion: 'Sin M1 cerrado no hay declaración. Verifica el estatus de M1, M2 y M3 antes de auditar números.', datos: ['M1', 'M2', 'M3'] },
      { id: 'p2', tipo: 'tarea', taskType: 'auditoria_practica', titulo: 'Cierra la auditoría del mes', descripcion: 'Abre el correo de la Directora Fiscal y valida cobrado, pagado, DIOT y casos. Usa la 💡 Guía.', datos: ['IVA a cargo 194.67', 'DIOT base 4606', 'Balanza 0', 'Casos a/b/c'] },
      { id: 'p3', tipo: 'asiento', titulo: 'La póliza de cierre', descripcion: 'El IVA a cargo se liquida contra bancos.', asiento: { cargo: '2-03 IVA por pagar', abono: '1-02 Bancos', cuentas: '2-03 / 1-02', concepto: 'Póliza de cierre: IVA a cargo 194.67' } },
    ],
  },
  {
    id: 'mod-nomina-web',
    plataforma: 'contalink',
    titulo: 'Nómina semanal real (webinar)',
    icono: '👥',
    descripcion: 'Calcular la nómina semanal con tarifa ISR progresiva e incidencias.',
    objetivo: 'Que el alumno aplique la tarifa progresiva (nunca 15% fijo), filtre por periodicidad y trate asimiladas, finiquitos y primas.',
    semanas: 'Contalink x4',
    skill: 'nomina',
    prueba: PRUEBA_NOMINA_WEB,
    curso: CURSOS['mod-nomina-web'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'Tarifa, no porcentaje fijo', descripcion: 'El ISR sale de la tabla progresiva por tramos. El 15% fijo es la trampa #4. Las asimiladas solo llevan ISR.', datos: ['Tarifa progresiva', 'Asimilada solo ISR', 'Filtro 3 de 6'] },
      { id: 'p2', tipo: 'tarea', taskType: 'nomina_practica', titulo: 'Calcula la nómina semanal', descripcion: 'Abre el correo de Recursos Humanos y calcula percepciones, ISR e incidencias. Usa la 💡 Guía.', datos: ['Semanal 2227.33', 'ISR asimilada 371', 'Camila/Emilio', 'Prima 5 días'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento de nómina', descripcion: 'Cargo a gasto de nómina, retenciones por pagar y pago contra caja por el neto exacto.', asiento: { cargo: '5-04 Gastos de nómina', abono: '2-04 ISR + 1-02 Bancos', cuentas: '5-04 / 2-04 / 1-02', concepto: 'Nómina semanal con tarifa progresiva' } },
    ],
  },
  {
    id: 'mod-reporte',
    plataforma: 'contalink',
    titulo: 'DIOT online y acuse (video)',
    icono: '📤',
    descripcion: 'Clasificar operaciones, cuadrar y presentar la DIOT de enero 2026.',
    objetivo: 'Que el alumno clasifique por fecha de pago, elija los tipos correctos y cierre con folio de acuse.',
    semanas: 'Contalink x4',
    skill: 'fiscal',
    prueba: PRUEBA_REPORTE,
    curso: CURSOS['mod-reporte'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'Fecha de pago manda', descripcion: 'Dic-emitida/Ene-pagada va a Ene; PPD + complemento de Ene va a Ene. Canceladas y pólizas manuales quedan fuera.', datos: ['Fecha DIOT = fecha de pago', 'Canceladas fuera', 'Manual fuera'] },
      { id: 'p2', tipo: 'tarea', taskType: 'reporte_practica', titulo: 'Presenta la DIOT enero 2026', descripcion: 'Abre el correo de Diego Ramos, clasifica las 6 operaciones y envía. Usa la 💡 Guía.', datos: ['23/54 columnas', 'Nov-2025 Complementaria', 'No reenviar', 'Folio + TXT idéntico'] },
      { id: 'p3', tipo: 'guia', titulo: 'El cierre con acuse', descripcion: 'Con estado Éxito descargas el acuse del SAT y archivas el TXT idéntico al enviado. Ese par es tu comprobante de presentación.', datos: ['Folio de acuse', 'TXT idéntico', 'Estado Éxito'] },
    ],
  },
  {
    id: 'mod-polizas',
    plataforma: 'contalink',
    titulo: 'Pólizas con código agrupador (Anexo 24)',
    icono: '📝',
    descripcion: 'Del CFDI al asiento: conciliar, clasificar al agrupador y cuadrar DEBE = HABER.',
    objetivo: 'Que el alumno capture la póliza del caso MARCELO F (70,900/7,090/63,810), la provisión PPD y vea cómo alimentan la balanza.',
    semanas: 'Contalink x4',
    skill: 'polizas',
    prueba: PRUEBA_POLIZA,
    curso: CURSOS['mod-polizas'],
    pasos: [
      { id: 'p1', tipo: 'guia', titulo: 'Del CFDI al asiento en 5 etapas', descripcion: 'Ingesta del CFDI y el estado de cuenta, cotejo de montos, clasificación al agrupador, cálculo fiscal y póliza cuadrada.', datos: ['UUID manda', 'Cotejo exacto', '601-83 → 601.45'] },
      { id: 'p2', tipo: 'tarea', taskType: 'poliza_practica', titulo: 'Captura la póliza del arrendamiento', descripcion: 'Abre el Sim de Pólizas, carga el caso MARCELO F y guarda la póliza de egresos. Usa la 💡 Guía.', datos: ['70,900/7,090/63,810', 'PUE = egreso', 'DEBE = HABER'] },
      { id: 'p3', tipo: 'asiento', titulo: 'El asiento del arrendamiento', descripcion: 'El sistema genera el asiento al guardar la póliza.', asiento: { cargo: '601.45 Arrendamiento a personas físicas', abono: '216.03 ISR retenido + 102.01 Bancos', cuentas: '601.45 / 216.03 / 102.01', concepto: 'Póliza de egresos: arrendamiento MARCELO F UUID 1317D7E0' } },
    ],
  },
];

export function getPracticasModules(): PracticaModulo[] {
  return PRACTICAS_MODULES;
}

export function getPracticasModule(id: string): PracticaModulo | undefined {
  return PRACTICAS_MODULES.find(m => m.id === id);
}

// Verifica que cada módulo referencia solo workflows reales del motor,
// que cada prueba tenga respuestas válidas y que el tracker sea coherente
// con el plan real.
export function auditPracticasModules(validTaskTypes: string[]): { module: string; paso: string; ok: boolean; error?: string }[] {
  const issues: { module: string; paso: string; ok: boolean; error?: string }[] = [];
  for (const m of PRACTICAS_MODULES) {
    if (!PLATAFORMAS_MODULOS.some(p => p.id === (m as PracticaModulo).plataforma)) {
      issues.push({ module: m.id, paso: 'plataforma', ok: false, error: `plataforma '${(m as PracticaModulo).plataforma}' no está en el catálogo` });
    }
    for (const p of m.pasos) {
      if (p.tipo === 'tarea' && p.taskType && !validTaskTypes.includes(p.taskType)) {
        issues.push({ module: m.id, paso: p.id, ok: false, error: `taskType '${p.taskType}' no existe en el motor` });
      }
    }
    if (!m.prueba || !m.prueba.preguntas?.length) {
      issues.push({ module: m.id, paso: 'prueba', ok: false, error: 'el módulo no tiene prueba de conocimiento' });
    } else {
      m.prueba.preguntas.forEach((p, i) => {
        if (!p.opciones?.length || p.correcta < 0 || p.correcta >= p.opciones.length) {
          issues.push({ module: m.id, paso: `prueba.q${i}`, ok: false, error: 'pregunta sin opciones o índice correcto inválido' });
        }
      });
    }
    if (!m.curso || !m.curso.secciones?.length) {
      issues.push({ module: m.id, paso: 'curso', ok: false, error: 'el módulo no tiene curso teórico con el capacitador' });
    }
  }
  // Tracker: cada repetición del plan real debe tener explicación y el
  // módulo de la semana debe existir.
  const tracker = buildPracticasTracker(7, 2026);
  for (const s of tracker) {
    if (!getPracticasModule(s.moduloId)) {
      issues.push({ module: s.moduloId, paso: 'tracker', ok: false, error: `módulo de la semana ${s.week} no existe` });
    }
    for (const r of s.repeticiones) {
      if (!REPETICION_POR_TIPO[r.taskType] && !validTaskTypes.includes(r.taskType)) {
        issues.push({ module: s.moduloId, paso: `tracker.${r.taskType}`, ok: false, error: `repetición '${r.taskType}' no está en el plan real` });
      }
    }
  }
  return issues;
}