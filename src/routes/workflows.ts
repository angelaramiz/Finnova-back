import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { generateWorkflow, ValidationRule, registerWorkflow, getStoredWorkflow } from '../services/workflowEngine';
import { getDEWorkflow, getDSWorkflow } from '../services/dataEngineeringWorkflows';
import { runDEValidator } from '../services/deValidation';
import { runDSValidator } from '../services/dsValidation';
import { getAdvancedWorkflow, runAdvancedValidator } from '../services/advancedDataEngines';
import { getFundamentalWorkflow, FUNDAMENTAL_TYPES } from '../services/fundamentals';
import { recoverIncident } from '../services/simWorld';
import { ingestEvents } from '../services/learningAnalytics';
import { enrichFeedback } from '../services/qualityConsumption';

export const workflowRouter = Router();

const accountingTypes = ['invoice_emission', 'payment_registration', 'tax_calculation', 'bank_reconciliation', 'journal_entry', 'payroll', 'supplier_invoice', 'business_expense', 'payment_scheduling', 'ap_reconciliation', 'cfdi_reception', 'credit_note', 'cash_cut', 'depreciation', 'financial_statements'];
const deTypes = ['sql_query', 'etl_pipeline', 'data_quality', 'ontology_modeling', 'airflow_dag', 'code_review', 'soporte_datos', 'incident_recovery'];
const dsTypes = ['eda_churn', 'modelo_baseline', 'eval_metricas'];
const advancedTypes = ['excel_advanced', 'powerbi_dax', 'forecast_sales', 'automation_etl', 'llm_integration', 'agent_task', 'prompt_engineering'];
const fundamentalsTypes = FUNDAMENTAL_TYPES;

// GET /api/sim/workflows/:taskType — Genera workflow para tipo de tarea
workflowRouter.get('/:taskType', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskType } = req.params;
  const trap = typeof req.query.trap === 'string' ? req.query.trap : undefined;
  const userId = req.user?.id;
  
  if (accountingTypes.includes(taskType)) {
    const workflow = registerWorkflow(userId, generateWorkflow(taskType, userId, trap));
    res.json(workflow);
  } else if (deTypes.includes(taskType)) {
    const workflow = registerWorkflow(userId, getDEWorkflow(taskType, trap));
    res.json(workflow);
  } else if (dsTypes.includes(taskType)) {
    const workflow = registerWorkflow(userId, getDSWorkflow(taskType));
    res.json(workflow);
  } else if (advancedTypes.includes(taskType)) {
    const workflow = registerWorkflow(userId, getAdvancedWorkflow(taskType));
    res.json(workflow);
  } else if (fundamentalsTypes.includes(taskType)) {
    const workflow = registerWorkflow(userId, getFundamentalWorkflow(taskType));
    res.json(workflow);
  } else {
    res.status(400).json({ error: `Tipo no válido: ${taskType}` });
  }
});

// POST /api/sim/workflows/validate — Valida respuestas del usuario contra las reglas
workflowRouter.post('/validate', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskType, answers, trap, workflowId } = req.body;
  const userId = req.user?.id;
  if (!taskType || !answers) {
    res.status(400).json({ error: 'taskType y answers son requeridos' });
    return;
  }

  const stored = typeof workflowId === 'string' ? getStoredWorkflow(userId, workflowId) : undefined;
  const workflow = stored ?? (fundamentalsTypes.includes(taskType) ? getFundamentalWorkflow(taskType) : advancedTypes.includes(taskType) ? getAdvancedWorkflow(taskType) : dsTypes.includes(taskType) ? getDSWorkflow(taskType) : deTypes.includes(taskType) ? getDEWorkflow(taskType) : generateWorkflow(taskType, userId, typeof trap === 'string' ? trap : undefined));
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
      case 'de': {
        const vr = runDEValidator(rule, answers);
        passed = vr.passed;
        if (rule.feedback && !vr.passed) rule.feedback.fail = vr.feedback;
        if (rule.feedback && vr.passed) rule.feedback.pass = vr.feedback;
        results.push({
          field: rule.field,
          label: rule.label,
          expected: rule.trap ? `detectar: ${rule.trap}` : rule.validator,
          received: userAnswer !== undefined ? userAnswer : '(código evaluado)',
          passed,
          points: passed ? rule.points : 0,
          maxPoints: rule.points,
          feedback: vr.feedback,
        });
        if (passed) totalScore += rule.points;
        continue;
      }
      case 'ds': {
        const vr = runDSValidator(rule, answers);
        passed = vr.passed;
        if (rule.feedback && !vr.passed) rule.feedback.fail = vr.feedback;
        if (rule.feedback && vr.passed) rule.feedback.pass = vr.feedback;
        results.push({
          field: rule.field,
          label: rule.label,
          expected: rule.validator,
          received: userAnswer !== undefined ? userAnswer : '(texto evaluado)',
          passed,
          points: passed ? rule.points : 0,
          maxPoints: rule.points,
          feedback: vr.feedback,
        });
        if (passed) totalScore += rule.points;
        continue;
      }
      case 'advanced': {
        const vr = runAdvancedValidator(rule, answers);
        passed = vr.passed;
        if (rule.feedback && !vr.passed) rule.feedback.fail = vr.feedback;
        if (rule.feedback && vr.passed) rule.feedback.pass = vr.feedback;
        results.push({
          field: rule.field,
          label: rule.label,
          expected: rule.validator,
          received: userAnswer !== undefined ? userAnswer : '(texto evaluado)',
          passed,
          points: passed ? rule.points : 0,
          maxPoints: rule.points,
          feedback: vr.feedback,
        });
        if (passed) totalScore += rule.points;
        continue;
      }
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

  // R-11: telemetría anonimizada de cada regla fallida (flywheel).
  if (userId) {
    const events = results
      .filter(r => !r.passed)
      .map(r => ({
        stage: 2, // simulador
        type: trap ? 'trap_missed' : 'task_fail',
        ref: { taskId: taskType, ruleField: r.field, trap },
        data: { pattern: trap ? `trampa no detectada: ${trap}` : 'regla incorrecta', ruleLabel: r.label, scorePct },
      }));
    await ingestEvents(userId, events).catch(() => {});

    // R-11 T5: enriquece el feedback de los resultados DE fallidos con
    // misconceptions aprobadas por staff (insight del flywheel).
    for (const r of results) {
      if (r.passed) continue;
      const skill = r.field.replace('row_', '') || taskType;
      r.feedback = await enrichFeedback(skill, r.feedback || 'Revisa la regla.');
    }
  }

  // Side effect: aprobar la recuperación del incidente actualiza el mundo
  if (taskType === 'incident_recovery' && passed && userId) {
    await recoverIncident(userId);
  }

  res.json({
    results,
    totalScore,
    maxPossible,
    scorePct,
    passed,
    gradedAt: new Date().toISOString(),
  });
});
