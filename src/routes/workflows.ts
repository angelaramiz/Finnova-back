import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { generateWorkflow, ValidationRule } from '../services/workflowEngine';

export const workflowRouter = Router();

// GET /api/sim/workflows/:taskType — Genera workflow para tipo de tarea
workflowRouter.get('/:taskType', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskType } = req.params;
  const userId = req.user?.id;
  const validTypes = ['invoice_emission', 'payment_registration', 'tax_calculation', 'bank_reconciliation', 'journal_entry', 'payroll', 'supplier_invoice', 'payment_scheduling', 'ap_reconciliation', 'cfdi_reception', 'credit_note', 'cash_cut'];
  if (!validTypes.includes(taskType)) {
    res.status(400).json({ error: `Tipo no válido: ${taskType}. Usa: ${validTypes.join(', ')}` });
    return;
  }
  const workflow = generateWorkflow(taskType, userId);
  res.json(workflow);
});

// POST /api/sim/workflows/validate — Valida respuestas del usuario contra las reglas
workflowRouter.post('/validate', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskType, answers } = req.body;
  const userId = req.user?.id;
  if (!taskType || !answers) {
    res.status(400).json({ error: 'taskType y answers son requeridos' });
    return;
  }

  const workflow = generateWorkflow(taskType, userId);
  const results: any[] = [];
  let totalScore = 0;
  let maxPossible = 0;

  for (const rule of workflow.validation) {
    const userAnswer = answers[rule.field];
    if (userAnswer === undefined) continue;

    maxPossible += rule.points;
    let passed = false;

    switch (rule.type) {
      case 'exact':
        passed = String(userAnswer).trim().toLowerCase() === String(rule.expected).trim().toLowerCase();
        break;
      case 'choice':
        passed = String(userAnswer).trim().toLowerCase() === String(rule.expected).trim().toLowerCase();
        break;
      case 'calculated': {
        const userNum = Number(userAnswer);
        const expNum = Number(rule.expected);
        const tol = rule.tolerance ?? 0;
        passed = Math.abs(userNum - expNum) <= tol;
        break;
      }
      case 'range': {
        const [min, max] = rule.expected as [number, number];
        passed = Number(userAnswer) >= min && Number(userAnswer) <= max;
        break;
      }
    }

    if (passed) totalScore += rule.points;

    results.push({
      field: rule.field,
      label: rule.label,
      expected: rule.expected,
      received: userAnswer,
      passed,
      points: passed ? rule.points : 0,
      maxPoints: rule.points,
      feedback: passed ? rule.feedback.pass : rule.feedback.fail,
    });
  }

  const passed = totalScore >= (maxPossible * 0.6);
  const scorePct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  res.json({
    results,
    totalScore,
    maxPossible,
    scorePct,
    passed,
    gradedAt: new Date().toISOString(),
  });
});
