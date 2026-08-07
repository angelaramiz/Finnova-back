// ─── SQL & Python Exercises for Data Engineering ───────────────

export interface SQLExercise {
  id: string;
  title: string;
  difficulty: number;
  description: string;
  schema: { table: string; columns: string[] }[];
  expectedQuery: string;
  hints: string[];
  timeMinutes: number;
}

export interface PythonExercise {
  id: string;
  title: string;
  difficulty: number;
  description: string;
  starterCode: string;
  expectedOutput: string;
  hints: string[];
  timeMinutes: number;
}

// ─── SQL Exercises ────────────────────────────────────────────

export const SQL_EXERCISES: SQLExercise[] = [
  {
    id: 'sql-001',
    title: 'Consulta básica — SELECT',
    difficulty: 1,
    description: 'Selecciona todos los clientes de la ciudad de CDMX',
    schema: [{ table: 'clientes', columns: ['id', 'nombre', 'ciudad', 'sector'] }],
    expectedQuery: "SELECT * FROM clientes WHERE ciudad = 'CDMX'",
    hints: ['Usa WHERE para filtrar', 'La ciudad es "CDMX"'],
    timeMinutes: 10,
  },
  {
    id: 'sql-002',
    title: 'Agregación — GROUP BY',
    difficulty: 1,
    description: 'Calcula el total de ventas por producto',
    schema: [{ table: 'ventas', columns: ['id', 'producto', 'cantidad', 'total'] }],
    expectedQuery: 'SELECT producto, SUM(total) as total_ventas FROM ventas GROUP BY producto',
    hints: ['Usa SUM() para agregar', 'Agrupa por producto'],
    timeMinutes: 15,
  },
  {
    id: 'sql-003',
    title: 'JOIN — Relaciones',
    difficulty: 2,
    description: 'Obtén las ventas con el nombre del cliente',
    schema: [
      { table: 'ventas', columns: ['id', 'cliente_id', 'total'] },
      { table: 'clientes', columns: ['id', 'nombre'] },
    ],
    expectedQuery: 'SELECT v.id, c.nombre, v.total FROM ventas v JOIN clientes c ON v.cliente_id = c.id',
    hints: ['Usa JOIN para relacionar tablas', 'La clave es cliente_id = id'],
    timeMinutes: 20,
  },
  {
    id: 'sql-004',
    title: 'Window Functions',
    difficulty: 3,
    description: 'Calcula el ranking de ventas por cliente con RANK()',
    schema: [{ table: 'ventas', columns: ['id', 'cliente_id', 'total'] }],
    expectedQuery: 'SELECT *, RANK() OVER (ORDER BY total DESC) as ranking FROM ventas',
    hints: ['Usa RANK() OVER (ORDER BY ...)', 'OVER define la ventana'],
    timeMinutes: 25,
  },
  {
    id: 'sql-005',
    title: 'Subconsulta',
    difficulty: 3,
    description: 'Encuentra los clientes con ventas superiores al promedio',
    schema: [
      { table: 'ventas', columns: ['cliente_id', 'total'] },
      { table: 'clientes', columns: ['id', 'nombre'] },
    ],
    expectedQuery: 'SELECT nombre FROM clientes WHERE id IN (SELECT cliente_id FROM ventas GROUP BY cliente_id HAVING SUM(total) > (SELECT AVG(total) FROM ventas))',
    hints: ['Usa subconsulta en WHERE', 'Primero calcula el promedio'],
    timeMinutes: 30,
  },
];

// ─── Python Exercises ─────────────────────────────────────────

export const PYTHON_EXERCISES: PythonExercise[] = [
  {
    id: 'py-001',
    title: 'Lectura de CSV con pandas',
    difficulty: 1,
    description: 'Lee un archivo CSV y muestra las primeras 5 filas',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas.csv")\nprint(df.____())',
    expectedOutput: '   id  producto  total\n0   1  Flete    8500\n1   2  Almacén  3200\n2   3  Carga    12500\n3   4  Seguro   2500\n4   5  Transporte 28500',
    hints: ['Usa .head() para mostrar primeras filas'],
    timeMinutes: 10,
  },
  {
    id: 'py-002',
    title: 'Filtrado de datos',
    difficulty: 1,
    description: 'Filtra ventas mayores a $10,000',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas.csv")\nfiltered = df[df["total"] > ____]\nprint(filtered)',
    expectedOutput: '   id  producto  total\n2   3  Carga    12500\n4   5  Transporte 28500',
    hints: ['Filtra con df[df["total"] > 10000]'],
    timeMinutes: 10,
  },
  {
    id: 'py-003',
    title: 'Agrupación con groupby',
    difficulty: 2,
    description: 'Agrupa ventas por categoría y calcula el promedio',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas.csv")\navg_by_cat = df.groupby("____")["total"].____()\nprint(avg_by_cat)',
    expectedOutput: 'categoria\nTransporte    18500.0\nAlmacenamiento 3200.0\nServicios     2500.0\nName: total, dtype: float64',
    hints: ['Agrupa por "categoria"', 'Usa .mean() para promedio'],
    timeMinutes: 15,
  },
  {
    id: 'py-004',
    title: 'Transformación de datos',
    difficulty: 2,
    description: 'Crea una columna calculada con el IVA',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas.csv")\ndf["iva"] = df["total"] * ____\ndf["total_con_iva"] = df["total"] + df["iva"]\nprint(df[["total", "iva", "total_con_iva"]].head())',
    expectedOutput: '   total     iva  total_con_iva\n0   8500   1360          9860\n1   3200    512          3712\n2  12500   2000         14500',
    hints: ['IVA es 16% = 0.16'],
    timeMinutes: 15,
  },
  {
    id: 'py-005',
    title: 'Merge de DataFrames',
    difficulty: 3,
    description: 'Une ventas con clientes usando merge',
    starterCode: 'import pandas as pd\nventas = pd.read_csv("ventas.csv")\nclientes = pd.read_csv("clientes.csv")\nmerged = pd.merge(ventas, clientes, left_on="____", right_on="____", how="____")\nprint(merged[["nombre", "total"]].head())',
    expectedOutput: '       nombre  total\n0  TechCorp   8500\n1  Luna       3200\n2  Norte      12500',
    hints: ['left_on="cliente_id"', 'right_on="id"', 'how="left"'],
    timeMinutes: 20,
  },
  {
    id: 'py-006',
    title: 'Limpieza de datos',
    difficulty: 2,
    description: 'Elimina duplicados y valores nulos',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas_sucias.csv")\nprint(f"Antes: {len(df)} filas")\ndf = df.____().____()\nprint(f"Después: {len(df)} filas")',
    expectedOutput: 'Antes: 1050 filas\nDespués: 980 filas',
    hints: ['Usa .dropna() para nulos', 'Usa .drop_duplicates() para duplicados'],
    timeMinutes: 15,
  },
  {
    id: 'py-007',
    title: 'Pivot Table',
    difficulty: 3,
    description: 'Crea una tabla pivote de ventas por cliente y producto',
    starterCode: 'import pandas as pd\ndf = pd.read_csv("ventas.csv")\npivot = pd.pivot_table(df, values="____", index="____", columns="____", aggfunc="____")\nprint(pivot)',
    expectedOutput: '             Flete  Almacén  Carga\nTechCorp     8500        0  12500\nLuna            0     3200      0\nNorte        5000        0   7500',
    hints: ['values="total"', 'index="cliente"', 'columns="producto"', 'aggfunc="sum"'],
    timeMinutes: 25,
  },
];

export function getSQLExercise(id: string): SQLExercise | undefined {
  return SQL_EXERCISES.find(e => e.id === id);
}

export function getPythonExercise(id: string): PythonExercise | undefined {
  return PYTHON_EXERCISES.find(e => e.id === id);
}
