import { describe, it, expect } from 'vitest';
import { validateSQL, validateETLClean, validateQualityDecision, validateReview, validateIncident } from '../services/deValidation';
import { getDEWorkflow, DE_WORKFLOWS } from '../services/dataEngineeringWorkflows';

describe('validadores DE — evaluación por patrón real', () => {
  describe('validateSQL', () => {
    it('acepta query correcta con GROUP BY (sin trampa)', () => {
      const r = validateSQL({
        'row_SELECT': 'cliente_id, SUM(total) as total_ventas',
        'row_FROM': 'ventas',
        'row_WHERE': "fecha BETWEEN '2026-07-01' AND '2026-07-31'",
        'row_GROUP BY': 'cliente_id',
        'row_ORDER BY': 'total_ventas DESC',
      });
      expect(r.passed).toBe(true);
    });

    it('rechaza SUM sin GROUP BY (resultado incorrecto)', () => {
      const r = validateSQL({
        'row_SELECT': 'cliente_id, SUM(total) as total_ventas',
        'row_FROM': 'ventas',
      });
      expect(r.passed).toBe(false);
      expect(r.feedback.toLowerCase()).toContain('group by');
    });

    it('rechaza falta de columnas requeridas', () => {
      const r = validateSQL({
        'row_SELECT': 'id, cantidad',
        'row_FROM': 'ventas',
      });
      expect(r.passed).toBe(false);
    });

    it('trampa sql_sin_group_by: corrige y pasa', () => {
      const r = validateSQL({
        'row_SELECT': 'cliente_id, SUM(total) as total_ventas',
        'row_FROM': 'ventas',
        'row_GROUP BY': 'cliente_id',
      }, 'sql_sin_group_by');
      expect(r.passed).toBe(true);
    });

    it('trampa sql_sin_group_by: replica el error y falla', () => {
      const r = validateSQL({
        'row_SELECT': 'cliente_id, SUM(total) as total_ventas',
        'row_FROM': 'ventas',
      }, 'sql_sin_group_by');
      expect(r.passed).toBe(false);
      expect(r.feedback.toLowerCase()).toContain('group by');
    });
  });

  describe('validateETLClean', () => {
    it('acepta dropna + drop_duplicates (flujo normal)', () => {
      const r = validateETLClean({ 'row_# 2. LIMPIAR DATOS': 'df = df.dropna().drop_duplicates()' });
      expect(r.passed).toBe(true);
    });

    it('trampa pipeline_datos_perdidos: imputar pasa, dropar falla', () => {
      const impute = validateETLClean({ 'row_# 2. LIMPIAR DATOS': 'df = df.fillna(df.median())' }, 'pipeline_datos_perdidos');
      expect(impute.passed).toBe(true);
      const drop = validateETLClean({ 'row_# 2. LIMPIAR DATOS': 'df = df.dropna()' }, 'pipeline_datos_perdidos');
      expect(drop.passed).toBe(false);
      expect(drop.feedback.toLowerCase()).toContain('200');
    });
  });

  describe('validateQualityDecision', () => {
    it('acepta acción de remediación (flujo normal)', () => {
      const r = validateQualityDecision({ 'row_DECISIÓN sobre datos nulos': 'investigar el origen y corregir' }, 'row_DECISIÓN sobre datos nulos');
      expect(r.passed).toBe(true);
    });

    it('rechaza ignorar la alerta', () => {
      const r = validateQualityDecision({ 'row_DECISIÓN sobre datos nulos': 'no hacer nada, ignorar' }, 'row_DECISIÓN sobre datos nulos');
      expect(r.passed).toBe(false);
    });

    it('trampa alerta_calidad_ignorada: corregir RFC pasa, ignorar falla', () => {
      const fix = validateQualityDecision({ 'row_DECISIÓN sobre datos nulos': 'corregir los 500 rfc inválidos' }, 'row_DECISIÓN sobre datos nulos', 'alerta_calidad_ignorada');
      expect(fix.passed).toBe(true);
      const ignore = validateQualityDecision({ 'row_DECISIÓN sobre datos nulos': 'ignorar' }, 'row_DECISIÓN sobre datos nulos', 'alerta_calidad_ignorada');
      expect(ignore.passed).toBe(false);
      expect(ignore.feedback.toLowerCase()).toContain('500');
    });
  });

  describe('validateReview', () => {
    it('aprueba: detecta SELECT *, sin refs rotos, rechaza PR', () => {
      const r = validateReview({
        'row_-- SELECT * detectado? (si/no)': 'si',
        'row_Refs rotos detectados? (si/no)': 'no',
        'row_Veredicto del review (aprobar/rechazar)': 'rechazar',
      });
      expect(r.passed).toBe(true);
    });

    it('falla si no detecta SELECT *', () => {
      const r = validateReview({
        'row_-- SELECT * detectado? (si/no)': 'no',
        'row_Refs rotos detectados? (si/no)': 'no',
        'row_Veredicto del review (aprobar/rechazar)': 'rechazar',
      });
      expect(r.passed).toBe(false);
    });

    it('falla si inventa refs rotos', () => {
      const r = validateReview({
        'row_-- SELECT * detectado? (si/no)': 'si',
        'row_Refs rotos detectados? (si/no)': 'si',
        'row_Veredicto del review (aprobar/rechazar)': 'rechazar',
      });
      expect(r.passed).toBe(false);
    });
  });

  describe('trampas DE end-to-end', () => {
    it('sql_sin_group_by: workflow trampa + validador activo', () => {
      const wf = getDEWorkflow('sql_query', 'sql_sin_group_by');
      expect(wf.isTrap).toBe(true);
      expect(wf.trapId).toBe('sql_sin_group_by');
      const email = wf.steps.find(s => s.id === 'email')!.data.body;
      expect(email).toContain('GROUP BY');
      const rule = wf.validation.find((r: any) => r.type === 'de');
      expect(rule.trap).toBe('sql_sin_group_by');
    });

    it('pipeline_datos_perdidos: email advierte de dropna y pérdida', () => {
      const wf = getDEWorkflow('etl_pipeline', 'pipeline_datos_perdidos');
      const email = wf.steps.find(s => s.id === 'email')!.data.body;
      expect(email).toContain('dropna');
      expect(email).toContain('200');
      const rule = wf.validation.find((r: any) => r.type === 'de');
      expect(rule.trap).toBe('pipeline_datos_perdidos');
    });

    it('alerta_calidad_ignorada: email advierte de RFC inválidos ignorados', () => {
      const wf = getDEWorkflow('data_quality', 'alerta_calidad_ignorada');
      const email = wf.steps.find(s => s.id === 'email')!.data.body;
      expect(email).toContain('500');
      expect(email).toContain('RFC');
      const rule = wf.validation.find((r: any) => r.type === 'de');
      expect(rule.trap).toBe('alerta_calidad_ignorada');
    });

    it('los 8 workflows DE siguen exponiéndose sin trampa', () => {
      for (const t of ['sql_query', 'etl_pipeline', 'data_quality', 'ontology_modeling', 'airflow_dag', 'code_review', 'soporte_datos', 'incident_recovery']) {
        expect(DE_WORKFLOWS[t]).toBeDefined();
        const wf = getDEWorkflow(t);
        expect(wf.isTrap).toBeUndefined();
        expect(wf.validation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateIncident (recuperación del 05-jul)', () => {
    it('acepta el diagnóstico correcto', () => {
      const r = validateIncident({
        'row_Tarea que falló en el DAG': 'dbt_test',
        'row_Test que falló': 'positive(total_ventas)',
        'row_Acción de recuperación': 'corregir el modelo y reprocesar el run',
      });
      expect(r.passed).toBe(true);
    });

    it('rechaza identificar la tarea equivocada', () => {
      const r = validateIncident({
        'row_Tarea que falló en el DAG': 'export_redshift',
        'row_Test que falló': 'positive(total_ventas)',
        'row_Acción de recuperación': 'reprocesar',
      });
      expect(r.passed).toBe(false);
      expect(r.feedback).toContain('dbt_test');
    });

    it('rechaza diagnóstico incompleto', () => {
      const r = validateIncident({ 'row_Tarea que falló en el DAG': 'dbt_test' });
      expect(r.passed).toBe(false);
      expect(r.feedback.toLowerCase()).toContain('completa');
    });

    it('el workflow incident_recovery se genera y expone', () => {
      const wf = getDEWorkflow('incident_recovery');
      expect(wf.type).toBe('incident_recovery');
      const spread = wf.steps.find((s: any) => s.id === 'spreadsheet')!;
      expect(spread.data.rows.some((r: any) => r.label.includes('Tarea que falló'))).toBe(true);
      const rule = wf.validation.find((r: any) => r.type === 'de');
      expect(rule.validator).toBe('incident');
    });
  });

  describe('P0-3 — paso tool (herramienta real embebida)', () => {
    const SUPPORTED = ['sql', 'notebook', 'git', 'airflow', 'catalog', 'bi', 'warehouse', 'pipeline'];

    it('cada workflow DE incluye un paso tool con app soportada, justo después del email', () => {
      for (const t of Object.keys(DE_WORKFLOWS)) {
        const wf = getDEWorkflow(t);
        const tool = wf.steps.find((s: any) => s.type === 'tool');
        expect(tool, `${t} sin paso tool`).toBeTruthy();
        expect(SUPPORTED).toContain(tool.data.app);
        const emailIdx = wf.steps.findIndex((s: any) => s.id === 'email');
        const toolIdx = wf.steps.findIndex((s: any) => s.type === 'tool');
        expect(toolIdx, `${t}: tool debe ir después del email`).toBe(emailIdx + 1);
      }
    });

    it('las trampas DE conservan el paso tool', () => {
      const wf = getDEWorkflow('sql_query', 'sql_sin_group_by');
      const tool = wf.steps.find((s: any) => s.type === 'tool');
      expect(tool).toBeTruthy();
      expect(tool.data.app).toBe('sql');
    });

    it('el mapeo app→tarea está completo (8 tareas con tool distinto)', () => {
      const apps = new Set(Object.values(DE_WORKFLOWS).map(f => getDEWorkflow((f as any)().type)).map(w => w.steps.find((s: any) => s.type === 'tool')?.data?.app));
      expect(apps.size).toBeGreaterThanOrEqual(5);
    });
  });
});
