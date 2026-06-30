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
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      fullName: 'Inversor Novato',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      role: 'student',
      pointsEarned: 80,
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
}
