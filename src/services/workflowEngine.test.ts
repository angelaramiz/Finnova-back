import { describe, it, expect } from 'vitest';
import { generateWorkflow, TRAP_SCENARIOS, registerWorkflow, getStoredWorkflow } from '../services/workflowEngine';

describe('workflowEngine — trampas contables', () => {
  describe('TRAP_SCENARIOS', () => {
    it('expone las 4 trampas contables con metadata completa', () => {
      expect(TRAP_SCENARIOS).toHaveLength(4);
      const ids = TRAP_SCENARIOS.map(s => s.id);
      expect(ids).toEqual(expect.arrayContaining(['iva_incorrecto', 'pago_mal_aplicado', 'conciliacion_no_cuadra', 'nomina_isr_mal']));
      for (const s of TRAP_SCENARIOS) {
        expect(s.specialty).toBe('accounting');
        expect(s.taskType).toBeTruthy();
        expect(s.description).toBeTruthy();
        expect(s.expectedMistake).toBeTruthy();
      }
    });
  });

  describe('iva_incorrecto (invoice_emission)', () => {
    const wf = generateWorkflow('invoice_emission', undefined, 'iva_incorrecto');

    it('marca el workflow como trampa', () => {
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('iva_incorrecto');
      expect(wf.trapDescription).toContain('IVA al 10%');
    });

    it('advierte del error en el email', () => {
      const email = wf.steps.find(s => s.id === 'email')!;
      expect(email.data.body).toContain('IVA al 10%');
    });

    it('agrega campo de detección de tasa IVA', () => {
      const form = wf.steps.find(s => s.id === 'form')!;
      const field = form.data.fields.find((f: any) => f.key === 'ivaRate');
      expect(field).toBeTruthy();
      expect(field.options).toEqual(expect.arrayContaining(['10%', '16%']));
      expect(field.correct).toBe('16%');
    });

    it('la validación premia la detección (16%)', () => {
      const rule = wf.validation.find(v => v.field === 'ivaRate')!;
      expect(rule.expected).toBe('16%');
      expect(rule.feedback.fail).toContain('16%');
    });

    it('los cálculos base siguen siendo correctos (IVA real = 16%)', () => {
      const ivaRule = wf.validation.find(v => v.field === 'iva')!;
      const form = wf.steps.find(s => s.id === 'form')!;
      const ivaField = form.data.fields.find((f: any) => f.key === 'iva');
      expect(ivaRule.expected).toBe(ivaField.correct);
    });
  });

  describe('pago_mal_aplicado (payment_registration)', () => {
    const wf = generateWorkflow('payment_registration', undefined, 'pago_mal_aplicado');

    it('marca el workflow como trampa', () => {
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('pago_mal_aplicado');
    });

    it('el email menciona un cliente distinto al que pagó', () => {
      const email = wf.steps.find(s => s.id === 'email')!;
      const form = wf.steps.find(s => s.id === 'form')!;
      const clientField = form.data.fields.find((f: any) => f.key === 'clientName');
      const payer = clientField.correct as string;
      const match = email.data.body.match(/menciona la factura de \*\*(.+?)\*\*, pero la transferencia la realizó \*\*(.+?)\*\*/);
      expect(match).toBeTruthy();
      expect(match![2]).toBe(payer);
      expect(match![1]).not.toBe(payer);
      const applyField = form.data.fields.find((f: any) => f.key === 'applyToClient');
      expect(applyField.options).toContain(payer);
      expect(applyField.options.some((o: string) => o !== payer)).toBe(true);
    });

    it('agrega campo applyToClient con correct = quien pagó', () => {
      const form = wf.steps.find(s => s.id === 'form')!;
      const clientField = form.data.fields.find((f: any) => f.key === 'clientName');
      const applyField = form.data.fields.find((f: any) => f.key === 'applyToClient');
      expect(applyField.correct).toBe(clientField.correct);
    });

    it('la validación premia aplicar al cliente correcto', () => {
      const rule = wf.validation.find(v => v.field === 'applyToClient')!;
      const form = wf.steps.find(s => s.id === 'form')!;
      const clientField = form.data.fields.find((f: any) => f.key === 'clientName');
      expect(rule.expected).toBe(clientField.correct);
      expect(rule.feedback.fail).toContain('saldos incorrectos');
    });
  });

  describe('conciliacion_no_cuadra (bank_reconciliation)', () => {
    const wf = generateWorkflow('bank_reconciliation', undefined, 'conciliacion_no_cuadra');

    it('marca el workflow como trampa', () => {
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('conciliacion_no_cuadra');
    });

    it('el email avisa del cheque de $3,500', () => {
      const email = wf.steps.find(s => s.id === 'email')!;
      expect(email.data.body).toContain('3,500');
    });

    it('la validación exige incluir el cheque faltante', () => {
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const rule = wf.validation.find(v => v.field === 'row_Cheques sin cobrar')!;
      const bankChecks = spread.data.rows[2].cell_B as number;
      expect(rule.expected).toBe(bankChecks + 3500);
      expect(rule.feedback.fail).toContain('3,500');
    });

    it('el saldo conciliado esperado se recalcula con el cheque', () => {
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const saldoRule = wf.validation.find(v => v.field === 'row_Saldo conciliado')!;
      const [bank, transit, checks] = [spread.data.rows[0].cell_B, spread.data.rows[1].cell_B, spread.data.rows[2].cell_B] as number[];
      expect(saldoRule.expected).toBe(bank + transit - (checks + 3500));
    });
  });

  describe('nomina_isr_mal (payroll)', () => {
    const wf = generateWorkflow('payroll', undefined, 'nomina_isr_mal');

    it('marca el workflow como trampa', () => {
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('nomina_isr_mal');
    });

    it('el email advierte del ISR fijo del 15%', () => {
      const email = wf.steps.find(s => s.id === 'email')!;
      expect(email.data.body).toContain('15% fijo');
    });

    it('agrega fila de detección del método ISR en el spreadsheet', () => {
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const row = spread.data.rows.find((r: any) => r.label === 'Método ISR aplicado');
      expect(row).toBeTruthy();
      expect(row.cell_B).toBe('15% fijo');
    });

    it('la validación premia la tabla SAT', () => {
      const rule = wf.validation.find(v => v.field === 'row_Método ISR aplicado')!;
      expect(rule.expected).toBe('Tabla SAT progresiva');
      expect(rule.feedback.fail).toContain('tabla progresiva');
    });
  });

  describe('generación normal intacta', () => {
    it('sin trap el workflow no está marcado y no tiene campos de detección', () => {
      const wf = generateWorkflow('invoice_emission');
      expect(wf.isTrap).toBeUndefined();
      const form = wf.steps.find(s => s.id === 'form')!;
      expect(form.data.fields.find((f: any) => f.key === 'ivaRate')).toBeUndefined();
    });

    it('trap desconocido no rompe el workflow', () => {
      const wf = generateWorkflow('invoice_emission', undefined, 'no_existe');
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('no_existe');
    });
  });

  describe('workflow store (coherencia GET → validate)', () => {
    it('registra y recupera el mismo workflow por id', () => {
      const wf = registerWorkflow('user-1', generateWorkflow('invoice_emission', 'user-1'));
      const stored = getStoredWorkflow('user-1', wf.taskId);
      expect(stored).toBeDefined();
      expect(stored!.taskId).toBe(wf.taskId);
    });

    it('las pistas del formulario (correct) coinciden con las reglas de validación del workflow guardado', () => {
      const wf = registerWorkflow('user-2', generateWorkflow('invoice_emission', 'user-2'));
      const form = wf.steps.find((s: any) => s.id === 'form')!;
      const corrects = Object.fromEntries(form.data.fields.map((f: any) => [f.key, f.correct]));
      for (const rule of wf.validation) {
        expect(String(rule.expected)).toBe(String(corrects[rule.field]));
      }
    });

    it('no encuentra workflows de otro usuario', () => {
      const wf = registerWorkflow('user-3', generateWorkflow('invoice_emission', 'user-3'));
      expect(getStoredWorkflow('user-4', wf.taskId)).toBeUndefined();
    });
  });
});