import { describe, it, expect } from 'vitest';
import { generateWorkflow } from '../services/workflowEngine';
import { getDEWorkflow, DE_WORKFLOWS } from '../services/dataEngineeringWorkflows';

describe('workflows faltantes — P0.2/P0.3/P1.1', () => {
  describe('depreciation (P1.1)', () => {
    const wf = generateWorkflow('depreciation');

    it('genera un workflow completo con 3 activos', () => {
      expect(wf.taskType).toBe('depreciation');
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      expect(spread.data.rows).toHaveLength(4);
      expect(spread.data.rows[0].label).toContain('Maquinaria');
    });

    it('valida la depreciación anual (línea recta)', () => {
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const maq = spread.data.rows[0] as { cell_B: number; cell_C: number };
      const rule = wf.validation.find(v => v.field === 'row_Maquinaria de carga')!;
      expect(rule.expected).toBe(Math.round(maq.cell_B / maq.cell_C));
    });
  });

  describe('financial_statements (P1.1)', () => {
    const wf = generateWorkflow('financial_statements');

    it('genera estado de resultados completo', () => {
      expect(wf.taskType).toBe('financial_statements');
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const labels = spread.data.rows.map((r: any) => r.label);
      expect(labels).toEqual(expect.arrayContaining(['Ventas netas', 'Utilidad bruta', 'Utilidad neta']));
    });

    it('las fórmulas del ER son coherentes', () => {
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      const rows = spread.data.rows;
      const [sales, cogs, gross, opex, op, taxes, net] = rows.map((r: any) => r.cell_B);
      expect(gross).toBe(sales - cogs);
      expect(op).toBe(gross - opex);
      expect(taxes).toBe(Math.round(op * 0.30));
      expect(net).toBe(op - taxes);
    });
  });

  describe('code_review (P0.2)', () => {
    it('existe en el factory DE', () => {
      expect(DE_WORKFLOWS.code_review).toBeDefined();
    });

    const wf = getDEWorkflow('code_review');

    it('genera checklist de revisión', () => {
      expect(wf.type).toBe('code_review');
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      expect(spread.data.rows.some((r: any) => r.label.includes('SELECT *'))).toBe(true);
      expect(spread.data.rows.some((r: any) => r.label.includes('Veredicto'))).toBe(true);
    });

    it('la validación usa el validador de review (detección de SELECT * y rechazo)', () => {
      const rule = wf.validation.find((r: any) => r.type === 'de');
      expect(rule).toBeTruthy();
      expect(rule.validator).toBe('review');
    });
  });

  describe('soporte_datos (P0.2)', () => {
    it('existe en el factory DE', () => {
      expect(DE_WORKFLOWS.soporte_datos).toBeDefined();
    });

    const wf = getDEWorkflow('soporte_datos');

    it('genera confirmación de dataset', () => {
      expect(wf.type).toBe('soporte_datos');
      const spread = wf.steps.find(s => s.id === 'spreadsheet')!;
      expect(spread.data.rows.some((r: any) => String(r.cell_B).includes('mrt_ventas_por_cliente'))).toBe(true);
    });

    it('la validación premia confirmar disponibilidad', () => {
      const rule = wf.validation.find((r: any) => r.field === 'row_Disponible en warehouse? (si/no)');
      expect(rule.expected).toBe('si');
    });
  });

  describe('validación DE end-to-end (P0.3)', () => {
    it('las respuestas correctas de un DE workflow dan 100%', () => {
      const wf = getDEWorkflow('soporte_datos');
      const answers: Record<string, any> = {};
      for (const rule of wf.validation) {
        answers[rule.field] = rule.expected;
      }
      let totalScore = 0;
      let maxPossible = 0;
      for (const rule of wf.validation) {
        maxPossible += rule.points;
        const userAnswer = answers[rule.field];
        let passed = false;
        if (rule.type === 'exact' || rule.type === 'choice') {
          passed = String(userAnswer).trim().toLowerCase() === String(rule.expected).trim().toLowerCase();
        } else {
          passed = Math.abs(Number(userAnswer) - Number(rule.expected)) <= (rule.tolerance ?? 0);
        }
        if (passed) totalScore += rule.points;
      }
      expect(maxPossible).toBeGreaterThan(0);
      expect(totalScore).toBe(maxPossible);
    });
  });
});
