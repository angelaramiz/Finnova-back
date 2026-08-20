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
  pasos: PracticaPaso[];
  skill: string;            // dimensión de habilidad (skillProfile)
  prueba: PracticaPrueba;   // prueba de conocimiento/comprensión del tema
  curso: PracticaCurso;     // curso básico teórico con el NPC capacitador
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

const PRUEBAS: Record<string, PracticaPrueba> = {
  'mod-cfdi': PRUEBA_CFDI,
  'mod-gastos': PRUEBA_GASTOS,
  'mod-cobranza': PRUEBA_COBRANZA,
  'mod-proveedores': PRUEBA_PROVEEDORES,
  'mod-nomina': PRUEBA_NOMINA,
  'mod-cierre': PRUEBA_CIERRE,
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