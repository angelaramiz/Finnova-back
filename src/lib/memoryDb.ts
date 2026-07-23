/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Domain Interfaces
export interface Profile {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: 'student' | 'instructor' | 'admin';
  pointsEarned: number;
  passwordHash?: string;
  mustChangePassword?: boolean;
  otpCode?: string;
  otpExpires?: string;
}

export interface AccountRequest {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'instructor';
  specialty?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}


export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  slug: string;
  imageUrl: string;
  instructorId: string;
  isPublished: boolean;
  category?: string;
  learningPath?: string;
  createdAt: string;
}

export interface Clip {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoProviderId: string;
  videoUrl: string;
  duration: number; // in seconds
  sequenceOrder: number;
  status: 'draft' | 'reviewing' | 'approved';
  section?: string;
  videoFormat?: '9:16' | '16:9';
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  clipId: string;
  watchedSeconds: number;
  isCompleted: boolean;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  clipId: string;
  title: string;
  exerciseType: 'multiple_choice' | 'formula' | 'ratio_calculation' | 'portfolio_weight';
  question: string;
  prompt?: string;
  correctAnswer: string;
  rubrics?: any;
  maxPoints: number;
}

export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  userAnswer: string;
  isPassed: boolean;
  scorePoints: number;
  evaluationType: 'deterministic' | 'ai_evaluated' | 'hybrid';
  aiFeedback: string;
  attemptedAt: string;
}

export interface PipelineReview {
  id: string;
  clipId?: string;
  inputPrompt: string;
  draftAudioUrl?: string;
  voiceModelUsed?: string;
  videoGenerationPrompt?: string;
  renderedVideoUrl?: string;
  pipelineId?: string;
  status: 'pending_ingredients' | 'tts_generated' | 'video_composited' | 'awaiting_approval' | 'approved' | 'rejected';
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllowedEmail {
  email: string;
  role: 'student' | 'instructor' | 'admin';
  fullName: string;
  createdAt: string;
}

export interface StudentQuestion {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  clipId: string;
  clipTitle: string;
  questionText: string;
  replyText?: string;
  createdAt: string;
  repliedAt?: string;
}

// Memory Database populated with SEED values:
export class MemoryDatabase {
  static accountRequests: AccountRequest[] = [];
  static allowedEmails: AllowedEmail[] = [
    {
      email: 'aramizeth@gmail.com',
      role: 'admin',
      fullName: 'Admin Aramiz',
      createdAt: new Date().toISOString()
    },
    {
      email: 'profesor.senior@finanzas.edu',
      role: 'instructor',
      fullName: 'Profe Finanzas Senior',
      createdAt: new Date().toISOString()
    },
    {
      email: 'student_tester@gmail.com',
      role: 'student',
      fullName: 'Inversor Novato',
      createdAt: new Date().toISOString()
    },
    {
      email: 'demo@simulador.com',
      role: 'student',
      fullName: 'Demo Simulador',
      createdAt: new Date().toISOString()
    }
  ];

  static questions: StudentQuestion[] = [];

  static profiles: Profile[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      fullName: 'Profe Finanzas Senior',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role: 'instructor',
      pointsEarned: 500,
      passwordHash: '$2b$10$gPDR21bvVjKVLc5jjqov9u40uc7AIy7gihrJPT49HMWlUtx8bYPoW',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      fullName: 'Inversor Novato',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      role: 'student',
      pointsEarned: 80,
      passwordHash: '$2b$10$gPDR21bvVjKVLc5jjqov9u40uc7AIy7gihrJPT49HMWlUtx8bYPoW',
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      fullName: 'Demo Simulador',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      role: 'student',
      pointsEarned: 100,
      passwordHash: '$2b$10$gPDR21bvVjKVLc5jjqov9u40uc7AIy7gihrJPT49HMWlUtx8bYPoW',
    },
  ];

  static courses: Course[] = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Mentalidad y Fundamentos de Inversión',
      description: 'Domina los principios matemáticos y psicológicos que separan a los ahorradores de los verdaderos inversores en menos de 60 segundos por concepto.',
      difficulty: 'beginner',
      slug: 'fundamentos-inversion',
      imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600',
      instructorId: '11111111-1111-1111-1111-111111111111',
      isPublished: true,
      category: 'Finanzas Corporativas',
      learningPath: 'Ruta Máster en Finanzas',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      title: 'Análisis de Empresas y Ratios Financieros',
      description: 'Aprende a leer balances y estados de resultados de compañías mundiales como Apple o Nvidia. Detecta trampas contables mediante ratios.',
      difficulty: 'intermediate',
      slug: 'analisis-empresas',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600',
      instructorId: '11111111-1111-1111-1111-111111111111',
      isPublished: true,
      category: 'Inversión y Mercados de Capitales',
      learningPath: 'Ruta de Análisis de Inversiones',
      createdAt: new Date().toISOString(),
    },
  ];

  static clips: Clip[] = [
    {
      id: 'f0000001-0000-0000-0000-000000000001',
      courseId: 'c0000000-0000-0000-0000-000000000001',
      title: 'El Superpoder del Interés Compuesto',
      description: '¿Cómo Einstein llamó al interés compuesto la octava maravilla del mundo? Revelamos la matemática visual del crecimiento exponencial.',
      videoProviderId: 'cf-stream-id-compound-interest',
      videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
      duration: 52,
      sequenceOrder: 1,
      status: 'approved',
      section: 'Fundamentos de Crecimiento',
      videoFormat: '9:16',
    },
    {
      id: 'f0000001-0000-0000-0000-000000000002',
      courseId: 'c0000000-0000-0000-0000-000000000001',
      title: 'Diversificación Real vs Falsa',
      description: 'Comprar 10 acciones tecnológicas no es diversificar. Te explicamos los coeficientes de correlación y cómo proteger tu portafolio.',
      videoProviderId: 'cf-stream-id-diversification',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      duration: 45,
      sequenceOrder: 2,
      status: 'approved',
      section: 'Fundamentos de Crecimiento',
      videoFormat: '9:16',
    },
    {
      id: 'f0000002-0000-0000-0000-000000000001',
      courseId: 'c0000000-0000-0000-0000-000000000002',
      title: '¿Qué es el P/E Ratio (Price/Earnings)?',
      description: 'Aprende si una acción está cara o barata en segundos usando el múltiplo precio-beneficio. El caso práctico usando Tesla y Ford.',
      videoProviderId: 'cf-stream-id-pe-ratio',
      videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
      duration: 58,
      sequenceOrder: 1,
      status: 'approved',
      section: 'Múltiplos de Valuación',
      videoFormat: '9:16',
    },
    {
      id: 'f0000002-0000-0000-0000-000000000002',
      courseId: 'c0000000-0000-0000-0000-000000000002',
      title: 'Apalancamiento: Arma de Doble Filo',
      description: 'Cómo la deuda magnifica tus ganancias corporativas pero acelera tu quiebra si el retorno sobre capital (ROC) es menor que el costo de deuda.',
      videoProviderId: 'cf-stream-id-leverage',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      duration: 59,
      sequenceOrder: 2,
      status: 'approved',
      section: 'Múltiplos de Valuación',
      videoFormat: '9:16',
    },
  ];

  static exercises: Exercise[] = [
    {
      id: 'e0000001-0000-0000-0000-000000000001',
      clipId: 'f0000001-0000-0000-0000-000000000001',
      title: 'Cálculo de Capital Final Exponencial',
      exerciseType: 'formula',
      question: 'Tienes un capital inicial de **$10,000 USD** invirtiendo a una tasa de interés del **10% anual compuesto**. ¿Cuál es el capital acumulado al término de **3 años** sin reinversión externa? *(Indica únicamente la cifra numérica, redondeada a enteros)*',
      prompt: 'Calcula usando la fórmula de interés compuesto: Cf = Ci * (1 + r)^n donde Ci=10000, r=0.10, n=3. Respuesta esperada: 13310.',
      correctAnswer: '13310',
      rubrics: {
        steps: [
          'Cf = 10000 * (1.10)^3',
          'Calculation: (1.10)^3 = 1.331',
          'Evaluation: 10000 * 1.331 = 13310'
        ]
      },
      maxPoints: 15,
    },
    {
      id: 'e0000001-0000-0000-0000-000000000002',
      clipId: 'f0000001-0000-0000-0000-000000000002',
      title: 'Diversificación de Sectores Reales',
      exerciseType: 'multiple_choice',
      question: '¿Cuál de los siguientes portafolios representa el mayor grado de diversificación estructural para mitigar el riesgo de mercado?',
      correctAnswer: 'B',
      rubrics: {
        options: {
          A: '10 acciones de empresas tecnológicas (Apple, Microsoft, Nvidia, Tesla, etc.)',
          B: '4 activos distribuidos en: software corporativo, bonos del tesoro a corto plazo, bienes raíces agrícolas, y minería de oro.',
          C: 'Acciones de 5 bancos diferentes de Estados Unidos.',
          D: 'Inversión del 100% en Bitcoin y Ethereum'
        }
      },
      maxPoints: 10,
    },
    {
      id: 'e0000002-0000-0000-0000-000000000001',
      clipId: 'f0000002-0000-0000-0000-000000000001',
      title: 'Cálculo Comparativo de Ratio P/E',
      exerciseType: 'ratio_calculation',
      question: 'Una compañía cotiza a un precio de acción de **$150 USD** y reporta una ganancia neta por acción (EPS o GPA) de **$6 USD**. ¿Cuál es su ratio P/E (Múltiplo de precio sobre ganancias)?',
      prompt: 'Ratio P/E = Precio por accion / EPS. Ci=150, EPS=6. Respuesta esperada: 25.',
      correctAnswer: '25',
      rubrics: {
        steps: [
          'Dividir 150 entre 6',
          '150 / 6 = 25'
        ]
      },
      maxPoints: 10,
    },
  ];

  static userProgress: UserProgress[] = [];
  static exerciseAttempts: ExerciseAttempt[] = [];

  static pipelineReviews: PipelineReview[] = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      clipId: 'f0000001-0000-0000-0000-000000000001',
      inputPrompt: 'Guión para video corto de 50 segundos explicando el crecimiento exponencial del interés compuesto.',
      draftAudioUrl: 'https://example.com/audio/draft1.mp3',
      voiceModelUsed: 'elevenlabs-charon-finance-v2',
      videoGenerationPrompt: 'A cinematic dark scene showing charts and nodes expanding exponentially, hyperrealistic, neon blue accents, vertical 9:16 layout.',
      renderedVideoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
      pipelineId: 'n8n-exec-uuid-77777',
      status: 'approved',
      reviewerNotes: 'Revisión automática aprobada mediante webhook de validación. Firma HMAC verificada satisfactoriamente.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // ================================================================
  // SIMULADOR LABORAL - SEED DATA (Fase 1)
  // ================================================================

  static simCompanies: SimCompany[] = [
    { id: '00000001-0000-0000-0000-000000000001', name: 'Operadora Logística del Norte S.A. de C.V.', taxId: 'OLN-220701-ABC', industry: 'logística', address: 'Av. Industria 452, Col. Industrial, Monterrey, NL', phone: '81-2345-6789', fiscalRegime: 'Régimen General de Ley Personas Morales', complexity: 2 },
    { id: '00000001-0000-0000-0000-000000000002', name: 'Grupo Financiero Corporativo S.A.B. de C.V.', taxId: 'GFC-880315-XYZ', industry: 'financiero', address: 'Paseo de la Reforma 350, Col. Juárez, CDMX', phone: '55-9876-5432', fiscalRegime: 'Régimen General de Ley Personas Morales', complexity: 4 },
  ];

  static simClients: SimClient[] = [
    { id: 'a0000000-0000-0000-0000-000000000001', companyId: '00000001-0000-0000-0000-000000000001', name: 'Comercial del Norte S.A.', taxId: 'CNS-990101-HIJ', creditLimit: 500000, paymentTerms: '30 días', status: 'active' },
    { id: 'a0000000-0000-0000-0000-000000000002', companyId: '00000001-0000-0000-0000-000000000001', name: 'Transportes Rápidos S.A.', taxId: 'TRA-880202-KLM', creditLimit: 300000, paymentTerms: '60 días', status: 'active' },
    { id: 'a0000000-0000-0000-0000-000000000003', companyId: '00000001-0000-0000-0000-000000000001', name: 'Almacenes del Bajío S.P.R.', taxId: 'ALB-770303-NOP', creditLimit: 750000, paymentTerms: '30 días', status: 'active' },
    { id: 'a0000000-0000-0000-0000-000000000004', companyId: '00000001-0000-0000-0000-000000000002', name: 'Inversiones del Valle S.A.', taxId: 'INV-660404-QRS', creditLimit: 2000000, paymentTerms: '15 días', status: 'active' },
    { id: 'a0000000-0000-0000-0000-000000000005', companyId: '00000001-0000-0000-0000-000000000002', name: 'Corporativo Trust S.A.', taxId: 'CTR-550505-TUV', creditLimit: 5000000, paymentTerms: '7 días', status: 'active' },
  ];

  static simJobs: SimJob[] = [
    { id: 'b0000000-0000-0000-0000-000000000001', title: 'Auxiliar Contable', description: 'Apoyo en registro de operaciones diarias, facturación y conciliación bancaria.', difficulty: 1, requiredCompletion: 0, unlocksJobId: 'b0000000-0000-0000-0000-000000000002', category: 'contabilidad', minScoreToPass: 60 },
    { id: 'b0000000-0000-0000-0000-000000000002', title: 'Analista de Cuentas por Pagar', description: 'Gestión de proveedores, registro de facturas recibidas, programación de pagos.', difficulty: 2, requiredCompletion: 5, unlocksJobId: '', category: 'contabilidad', minScoreToPass: 65 },
  ];

  static simTasks: SimTask[] = [
    { id: 'c0000000-0000-0000-0000-000000000001', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Emisión de Factura', description: 'Genera una factura para el cliente por servicios de logística.', taskType: 'invoice_emission', difficulty: 1, estimatedMinutes: 15, sequenceOrder: 1 },
    { id: 'c0000000-0000-0000-0000-000000000002', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Registro de Pago', description: 'Registra el pago recibido de cliente por factura del periodo.', taskType: 'payment_registration', difficulty: 1, estimatedMinutes: 10, sequenceOrder: 2 },
    { id: 'c0000000-0000-0000-0000-000000000003', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Conciliación Bancaria', description: 'Concilia movimientos del mes contra estado de cuenta.', taskType: 'bank_reconciliation', difficulty: 2, estimatedMinutes: 25, sequenceOrder: 3 },
    { id: 'c0000000-0000-0000-0000-000000000004', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Cálculo de IVA', description: 'Calcula IVA del mes: ingresos gravados, IVA trasladado y por pagar.', taskType: 'tax_calculation', difficulty: 2, estimatedMinutes: 20, sequenceOrder: 4 },
    { id: 'c0000000-0000-0000-0000-000000000005', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Póliza de Diario', description: 'Registra depreciación del mes de equipo de cómputo.', taskType: 'journal_entry', difficulty: 2, estimatedMinutes: 20, sequenceOrder: 5 },
    { id: 'c0000000-0000-0000-0000-000000000009', jobId: 'b0000000-0000-0000-0000-000000000001', title: 'Cálculo de Nómina', description: 'Calcula la nómina quincenal del personal administrativo.', taskType: 'payroll', difficulty: 3, estimatedMinutes: 25, sequenceOrder: 6 },
    { id: 'c0000000-0000-0000-0000-000000000006', jobId: 'b0000000-0000-0000-0000-000000000002', title: 'Registro de Factura de Proveedor', description: 'Registra factura recibida de proveedor de transporte.', taskType: 'supplier_invoice', difficulty: 2, estimatedMinutes: 15, sequenceOrder: 1 },
    { id: 'c0000000-0000-0000-0000-000000000007', jobId: 'b0000000-0000-0000-0000-000000000002', title: 'Programación de Pagos', description: 'Programa pagos a proveedores según vencimientos.', taskType: 'payment_scheduling', difficulty: 2, estimatedMinutes: 20, sequenceOrder: 2 },
    { id: 'c0000000-0000-0000-0000-000000000008', jobId: 'b0000000-0000-0000-0000-000000000002', title: 'Conciliación de CxP', description: 'Concilia saldo de proveedores contra auxiliar de CxP.', taskType: 'ap_reconciliation', difficulty: 3, estimatedMinutes: 30, sequenceOrder: 3 },
  ];

  // Onboarding data store (simulado)
  static onboardingData: Map<string, any> = new Map();
  static userStats: Map<string, any> = new Map();
}

// ================================================================
// INTERFACES DEL SIMULADOR
// ================================================================

export interface SimCompany {
  id: string; name: string; taxId: string; industry?: string;
  address?: string; phone?: string; fiscalRegime?: string;
  complexity: number; logoUrl?: string;
}

export interface SimClient {
  id: string; companyId: string; name: string; taxId?: string;
  creditLimit?: number; paymentTerms?: string; status?: string;
}

export interface SimJob {
  id: string; title: string; description: string;
  difficulty: number; requiredCompletion: number;
  unlocksJobId?: string; category?: string; minScoreToPass: number;
}

export interface SimTask {
  id: string; jobId: string; title: string; description: string;
  taskType: string; difficulty: number; estimatedMinutes: number;
  requiredFields?: any; validationRules?: any; documentTemplate?: string;
  sequenceOrder: number;
}
