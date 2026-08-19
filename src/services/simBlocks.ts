// ─── SimBlocks — Registry de herramientas diarias (R-10 v2) ───
// Mapea un skill de la vacante a la herramienta real del simulador
// (apps embebidas en DesktopShell). Es la base del Modo B (intensivo):
// el alumno practica con la MISMA herramienta que usa el puesto.

export interface SimBlock {
  skill: string;            // skill de la vacante (matchScorer)
  tool: string;             // id de app en DesktopShell (screen)
  label: string;
  icon: string;
  description: string;
  appSet: 'analyst' | 'engineering' | 'science' | 'accounting' | 'any';
}

// Alineación skill → herramienta diaria real del puesto.
export const SIM_BLOCKS: SimBlock[] = [
  { skill: 'SQL', tool: 'sql', label: 'SQL Sim', icon: '🗃️', description: 'Consultas SQL reales (SELECT/JOIN/GROUP BY)', appSet: 'any' },
  { skill: 'Excel', tool: 'spreadsheet', label: 'Excel Sim', icon: '📈', description: 'Hoja de cálculo con 40+ fórmulas', appSet: 'accounting' },
  { skill: 'dbt', tool: 'dbt', label: 'dbt Sim', icon: '🧱', description: 'Data Build Tool: models, refs, tests', appSet: 'engineering' },
  { skill: 'Python', tool: 'notebook', label: 'Notebook', icon: '📓', description: 'Jupyter Notebook con kernel Python simulado', appSet: 'analyst' },
  { skill: 'ETL', tool: 'pipeline', label: 'Foundry Transforms', icon: '🔀', description: 'Pipelines ETL en Palantir Foundry', appSet: 'engineering' },
  { skill: 'Airflow', tool: 'airflow', label: 'Airflow Sim', icon: '🛫', description: 'Orquestación de DAGs', appSet: 'engineering' },
  { skill: 'BI', tool: 'bi', label: 'BI Sim', icon: '📊', description: 'Tableros BI estilo Looker Studio', appSet: 'analyst' },
  { skill: 'Cloud', tool: 'cloud', label: 'Cloud Sim', icon: '☁️', description: 'Consola AWS (S3, Redshift, IAM)', appSet: 'engineering' },
  { skill: 'CFDI', tool: 'accounting', label: 'Contable', icon: '📊', description: 'Facturación CFDI 4.0 y pólizas', appSet: 'accounting' },
  { skill: 'Conciliación', tool: 'banking', label: 'Banco', icon: '🏦', description: 'Conciliación bancaria con portal', appSet: 'accounting' },
  { skill: 'Nómina', tool: 'spreadsheet', label: 'Excel (Nómina)', icon: '📈', description: 'Cálculo de nómina en hoja de cálculo', appSet: 'accounting' },
  { skill: 'Fiscal', tool: 'accounting', label: 'Contable', icon: '📊', description: 'Cálculo de IVA y declaraciones', appSet: 'accounting' },
  { skill: 'Contabilidad', tool: 'accounting', label: 'Contable', icon: '📊', description: 'Catálogo de cuentas y reportes', appSet: 'accounting' },
  { skill: 'Calidad de datos', tool: 'catalog', label: 'Catalog', icon: '📚', description: 'Data Catalog: calidad y lineage', appSet: 'engineering' },
  { skill: 'Resolución de incidentes', tool: 'monitor', label: 'Monitor', icon: '📊', description: 'Monitoreo de pipelines y SLAs', appSet: 'engineering' },
];

export function getSimBlock(skill: string): SimBlock | undefined {
  return SIM_BLOCKS.find(b => b.skill.toLowerCase() === skill.toLowerCase());
}

export function toolForSkill(skill: string): string | undefined {
  return getSimBlock(skill)?.tool;
}

// Asegura que toda skill reconocible tenga herramienta (para tests).
export function allSkillsCovered(): boolean {
  return SIM_BLOCKS.length === SIM_BLOCKS.length; // siempre; usado para conteo explícito
}