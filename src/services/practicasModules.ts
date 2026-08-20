// ─── R-13: Módulos de Prácticas Profesionales de Contabilidad ──
// Catálogo de módulos procedurales que guían al alumno paso a paso.
// Cada módulo: pasos de guía conceptual + workflow real + explicación
// del asiento contable. Los números/validaciones SIEMPRE salen de los
// motores reales (workflowEngine / autoEntries / persistentData).

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

export interface PracticaModulo {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  objetivo: string;
  semanas: string;          // rango de semanas del plan de prácticas
  pasos: PracticaPaso[];
  skill: string;            // dimensión de habilidad (skillProfile)
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

// Verifica que cada módulo referencia solo workflows reales del motor.
export function auditPracticasModules(validTaskTypes: string[]): { module: string; paso: string; ok: boolean; error?: string }[] {
  const issues: { module: string; paso: string; ok: boolean; error?: string }[] = [];
  for (const m of PRACTICAS_MODULES) {
    for (const p of m.pasos) {
      if (p.tipo === 'tarea' && p.taskType && !validTaskTypes.includes(p.taskType)) {
        issues.push({ module: m.id, paso: p.id, ok: false, error: `taskType '${p.taskType}' no existe en el motor` });
      }
    }
  }
  return issues;
}