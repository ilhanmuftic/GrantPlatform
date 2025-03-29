import { users, User, InsertUser, programs, Program, InsertProgram, 
  applicantTypes, ApplicantType, InsertApplicantType,
  registrationProcesses, RegistrationProcess, InsertRegistrationProcess,
  verificationDocuments, VerificationDocument, InsertVerificationDocument,
  applications, Application, InsertApplication, documents, Document, InsertDocument,
  evaluations, Evaluation, InsertEvaluation, messages, Message, InsertMessage,
  budgetTracking, BudgetTracking, InsertBudgetTracking } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;

  // Program methods
  getProgram(id: number): Promise<Program | undefined>;
  getPrograms(): Promise<Program[]>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: number, program: Partial<Program>): Promise<Program | undefined>;

  // Applicant Type methods
  getApplicantType(id: number): Promise<ApplicantType | undefined>;
  getApplicantTypes(): Promise<ApplicantType[]>;
  createApplicantType(applicantType: InsertApplicantType): Promise<ApplicantType>;
  updateApplicantType(id: number, applicantType: Partial<ApplicantType>): Promise<ApplicantType | undefined>;

  // Registration Process methods
  getRegistrationProcess(id: number): Promise<RegistrationProcess | undefined>;
  getRegistrationProcessByUser(userId: number): Promise<RegistrationProcess | undefined>;
  getRegistrationProcesses(): Promise<RegistrationProcess[]>;
  createRegistrationProcess(registrationProcess: InsertRegistrationProcess): Promise<RegistrationProcess>;
  updateRegistrationProcess(id: number, registrationProcess: Partial<RegistrationProcess>): Promise<RegistrationProcess | undefined>;

  // Verification Document methods
  getVerificationDocument(id: number): Promise<VerificationDocument | undefined>;
  getVerificationDocumentsByUser(userId: number): Promise<VerificationDocument[]>;
  getVerificationDocumentsByRegistrationProcess(registrationProcessId: number): Promise<VerificationDocument[]>;
  createVerificationDocument(document: InsertVerificationDocument): Promise<VerificationDocument>;
  updateVerificationDocument(id: number, document: Partial<VerificationDocument>): Promise<VerificationDocument | undefined>;

  // Application methods
  getApplication(id: number): Promise<Application | undefined>;
  getApplications(): Promise<Application[]>;
  getApplicationsByApplicant(applicantId: number): Promise<Application[]>;
  getApplicationsByProgram(programId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<Application>): Promise<Application | undefined>;
  
  // Document methods
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByApplication(applicationId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Evaluation methods
  getEvaluation(id: number): Promise<Evaluation | undefined>;
  getEvaluationsByApplication(applicationId: number): Promise<Evaluation[]>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByApplication(applicationId: number): Promise<Message[]>;
  getMessagesBySender(senderId: number): Promise<Message[]>;
  getMessagesByReceiver(receiverId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Budget tracking methods
  getBudgetTracking(id: number): Promise<BudgetTracking | undefined>;
  getBudgetTrackingByProgram(programId: number): Promise<BudgetTracking | undefined>;
  createBudgetTracking(budgetTracking: InsertBudgetTracking): Promise<BudgetTracking>;
  updateBudgetTracking(id: number, budgetTracking: Partial<BudgetTracking>): Promise<BudgetTracking | undefined>;

  // Session storage
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private programs: Map<number, Program>;
  private applicantTypes: Map<number, ApplicantType>;
  private registrationProcesses: Map<number, RegistrationProcess>;
  private verificationDocuments: Map<number, VerificationDocument>;
  private applications: Map<number, Application>;
  private documents: Map<number, Document>;
  private evaluations: Map<number, Evaluation>;
  private messages: Map<number, Message>;
  private budgetTrackings: Map<number, BudgetTracking>;
  
  currentUserId: number;
  currentProgramId: number;
  currentApplicantTypeId: number;
  currentRegistrationProcessId: number;
  currentVerificationDocumentId: number;
  currentApplicationId: number;
  currentDocumentId: number;
  currentEvaluationId: number;
  currentMessageId: number;
  currentBudgetTrackingId: number;
  
  sessionStore: session.Store;

  private async hashPasswordForSeed(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  constructor() {
    this.users = new Map();
    this.programs = new Map();
    this.applicantTypes = new Map();
    this.registrationProcesses = new Map();
    this.verificationDocuments = new Map();
    this.applications = new Map();
    this.documents = new Map();
    this.evaluations = new Map();
    this.messages = new Map();
    this.budgetTrackings = new Map();
    
    this.currentUserId = 1;
    this.currentProgramId = 1;
    this.currentApplicantTypeId = 1;
    this.currentRegistrationProcessId = 1;
    this.currentVerificationDocumentId = 1;
    this.currentApplicationId = 1;
    this.currentDocumentId = 1;
    this.currentEvaluationId = 1;
    this.currentMessageId = 1;
    this.currentBudgetTrackingId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Seed initial data
    this.seedInitialData();
  }

  private async seedInitialData() {
    // Create a hashed password for all seed users
    const hashedPassword = await this.hashPasswordForSeed("password");
    
    // Seed users
    const users = [
      {
        username: "admin1",
        fullName: "Admin Adminić",
        email: "admin@donacije.ba",
        password: hashedPassword,
        role: "administrator",
      },
      {
        username: "nina_kultura",
        fullName: "Nina Kultura",
        email: "nina@kultura.org",
        role: "applicant",
        password: hashedPassword,
      },
      {
        username: "ref_human",
        fullName: "Refik Humanović",
        email: "refik@donacije.ba",
        role: "referent",
        password: hashedPassword,
      },
      {
        username: "don_corp",
        fullName: "Don Korporativni",
        email: "don@corporate.com",
        role: "donator",
        password: hashedPassword,
      },
      {
        username: "reviewer1",
        fullName: "Review Manager",
        email: "reviewer@donacije.ba",
        role: "reviewer",
        password: hashedPassword,
      },
    ] as InsertUser[];

    for (const user of users) {
      await this.createUser(user);
    }

    // Seed programs
    const programs = [
      {
        name: "Korporativno sponzorstvo",
        type: "sponzorstvo",
        budgetTotal: 100000,
        year: 2025,
        description: "Program korporativnog sponzorstva za 2025. godinu",
        active: true,
      },
      {
        name: "Lokalno sponzorstvo",
        type: "sponzorstvo",
        budgetTotal: 50000,
        year: 2025,
        description: "Program lokalnog sponzorstva za 2025. godinu",
        active: true,
      },
      {
        name: "Humanitarne donacije",
        type: "donacija",
        budgetTotal: 75000,
        year: 2025,
        description: "Program humanitarnih donacija za 2025. godinu",
        active: true,
      },
    ] as InsertProgram[];

    programs.forEach(program => this.createProgram(program));

    // Seed applicant types
    const applicantTypes = [
      {
        name: "ORGANIZATION",
        description: "Neprofitne organizacije i udruženja građana",
        requiredDocuments: [
          "Registracijski dokument",
          "Finansijski izvještaj",
          "Statut organizacije",
          "Potvrda o poreznoj registraciji"
        ],
        registrationSteps: [
          "Osnovna registracija",
          "Verifikacija dokumenata",
          "Pregled i potvrda"
        ],
        verificationRequirements: [
          "Validna registracija u instituciji",
          "Aktivni status organizacije",
          "Usklađenost sa statutom"
        ]
      },
      {
        name: "INDIVIDUAL",
        description: "Pojedinci i građani",
        requiredDocuments: [
          "Identifikacijski dokument",
          "Potvrda adrese stanovanja",
          "Bankovna potvrda"
        ],
        registrationSteps: [
          "Osnovna registracija",
          "Verifikacija identiteta",
          "Pregled i potvrda"
        ],
        verificationRequirements: [
          "Validna lična karta/pasoš",
          "Adresa stanovanja ne starija od 6 mjeseci"
        ]
      },
      {
        name: "CORPORATION",
        description: "Profitne kompanije i preduzeća",
        requiredDocuments: [
          "Izvod iz sudskog registra",
          "Potvrda o poreznoj registraciji",
          "Godišnji finansijski izvještaj",
          "Bilans stanja",
          "Potvrda o izmirenim obavezama"
        ],
        registrationSteps: [
          "Osnovna registracija",
          "Verifikacija dokumenata",
          "Finansijska verifikacija",
          "Pregled i potvrda"
        ],
        verificationRequirements: [
          "Aktivni status u registru",
          "Izmirene porezne obaveze",
          "Pozitivno poslovanje u zadnjoj godini"
        ]
      }
    ] as InsertApplicantType[];

    applicantTypes.forEach(type => this.createApplicantType(type));

    // Update programs with eligible applicant types
    this.updateProgram(1, { eligibleApplicantTypes: ["ORGANIZATION", "CORPORATION"] });
    this.updateProgram(2, { eligibleApplicantTypes: ["ORGANIZATION"] });
    this.updateProgram(3, { eligibleApplicantTypes: ["ORGANIZATION", "INDIVIDUAL"] });

    // Seed budget tracking
    this.createBudgetTracking({
      programId: 1,
      reserved: 10000,
      approved: 5000,
      spent: 4500,
      available: 85000,
    });

    this.createBudgetTracking({
      programId: 2,
      reserved: 12000,
      approved: 8000,
      spent: 4000,
      available: 38000,
    });

    this.createBudgetTracking({
      programId: 3,
      reserved: 20000,
      approved: 12000,
      spent: 8000,
      available: 47000,
    });

    // Seed applications
    const applications = [
      {
        applicantId: 2,
        programId: 3,
        status: "u obradi",
        submittedAt: new Date("2025-03-25T13:20:00"),
        autoCode: "0001/03/2025",
        summary: "Donacija za dječije pozorište",
        requestedAmount: 5000,
        projectDuration: 6,
        organization: "Kulturni centar",
        description: "Projekt dječijeg pozorišta za promociju kulturnih vrijednosti",
      },
      {
        applicantId: 2,
        programId: 1,
        status: "odbijeno",
        submittedAt: new Date("2025-03-20T10:10:00"),
        autoCode: "0002/03/2025",
        summary: "Sponzorstvo za koncert \"Zvuk Mira\"",
        requestedAmount: 3000,
        projectDuration: 2,
        organization: "Muzički kolektiv",
        description: "Koncert klasične muzike s temom mira i pomirenja",
      },
      {
        applicantId: 3,
        programId: 2,
        status: "odobreno",
        submittedAt: new Date("2025-03-15T09:30:00"),
        autoCode: "0003/04/2025",
        summary: "Podrška lokalnom umjetničkom festivalu",
        requestedAmount: 8000,
        projectDuration: 12,
        organization: "Art Centar",
        description: "Godišnji umjetnički festival s lokalnim umjetnicima",
      },
    ] as unknown as Application[];

    applications.forEach(app => this.applications.set(this.currentApplicationId++, app as Application));

    // Seed evaluations
    const evaluations = [
      {
        applicationId: 1,
        evaluatedBy: 3,
        score: 85,
        decision: "preporučeno",
        comment: "Kompletna dokumentacija, pozitivan utisak",
        createdAt: new Date(),
      },
      {
        applicationId: 2,
        evaluatedBy: 3,
        score: 45,
        decision: "odbijeno",
        comment: "Nedostaje detaljan finansijski plan",
        createdAt: new Date(),
      },
    ] as Evaluation[];

    evaluations.forEach(evaluation => this.evaluations.set(this.currentEvaluationId++, evaluation));

    // Seed documents
    const documents = [
      {
        applicationId: 1,
        fileName: "budzet_2025.pdf",
        fileType: "pdf",
        filePath: "/uploads/budzet_2025.pdf",
        uploadedAt: new Date("2025-03-25T13:22:00"),
        uploadedBy: 2,
      },
      {
        applicationId: 1,
        fileName: "plan_aktivnosti.docx",
        fileType: "docx",
        filePath: "/uploads/plan_aktivnosti.docx",
        uploadedAt: new Date("2025-03-25T13:23:00"),
        uploadedBy: 2,
      },
      {
        applicationId: 2,
        fileName: "sponzorski_ugovor.pdf",
        fileType: "pdf",
        filePath: "/uploads/sponzorski_ugovor.pdf",
        uploadedAt: new Date("2025-03-20T10:12:00"),
        uploadedBy: 2,
      },
    ] as Document[];

    documents.forEach(doc => this.documents.set(this.currentDocumentId++, doc));

    // Seed messages
    const messages = [
      {
        applicationId: 1,
        senderId: 2,
        receiverId: 1, // admin1
        content: "Poštovani, želio bih se prijaviti za program donacija za naš lokalni projekat pomoći djeci. Možete li mi dati više informacija?",
        read: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        applicationId: 1,
        senderId: 2,
        receiverId: 3,
        content: "I've uploaded the required documentation for the Dječije pozorište project. Could you please review it?",
        read: false,
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      },
      {
        applicationId: 1,
        senderId: 4,
        receiverId: 1, // admin1
        content: "Could you provide the summary of March applications for our sponsorship program?",
        read: false,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        applicationId: 1,
        senderId: 1,
        receiverId: 3,
        content: "New evaluation criteria has been added to the Humanitarne donacije program. Please review.",
        read: true,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
      },
    ] as Message[];

    messages.forEach(message => this.messages.set(this.currentMessageId++, message));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Program methods
  async getProgram(id: number): Promise<Program | undefined> {
    return this.programs.get(id);
  }

  async getPrograms(): Promise<Program[]> {
    return Array.from(this.programs.values());
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const id = this.currentProgramId++;
    const program: Program = { ...insertProgram, id };
    this.programs.set(id, program);
    return program;
  }

  async updateProgram(id: number, programUpdate: Partial<Program>): Promise<Program | undefined> {
    const program = this.programs.get(id);
    if (!program) return undefined;
    
    const updatedProgram = { ...program, ...programUpdate };
    this.programs.set(id, updatedProgram);
    return updatedProgram;
  }
  
  // Applicant Type methods
  async getApplicantType(id: number): Promise<ApplicantType | undefined> {
    return this.applicantTypes.get(id);
  }

  async getApplicantTypes(): Promise<ApplicantType[]> {
    return Array.from(this.applicantTypes.values());
  }

  async createApplicantType(insertApplicantType: InsertApplicantType): Promise<ApplicantType> {
    const id = this.currentApplicantTypeId++;
    const applicantType: ApplicantType = { ...insertApplicantType, id };
    this.applicantTypes.set(id, applicantType);
    return applicantType;
  }

  async updateApplicantType(id: number, applicantTypeUpdate: Partial<ApplicantType>): Promise<ApplicantType | undefined> {
    const applicantType = this.applicantTypes.get(id);
    if (!applicantType) return undefined;
    
    const updatedApplicantType = { ...applicantType, ...applicantTypeUpdate };
    this.applicantTypes.set(id, updatedApplicantType);
    return updatedApplicantType;
  }
  
  // Registration Process methods
  async getRegistrationProcess(id: number): Promise<RegistrationProcess | undefined> {
    return this.registrationProcesses.get(id);
  }

  async getRegistrationProcessByUser(userId: number): Promise<RegistrationProcess | undefined> {
    return Array.from(this.registrationProcesses.values()).find(
      (process) => process.userId === userId
    );
  }

  async getRegistrationProcesses(): Promise<RegistrationProcess[]> {
    return Array.from(this.registrationProcesses.values());
  }

  async createRegistrationProcess(insertRegistrationProcess: InsertRegistrationProcess): Promise<RegistrationProcess> {
    const id = this.currentRegistrationProcessId++;
    const registrationProcess: RegistrationProcess = { 
      ...insertRegistrationProcess, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.registrationProcesses.set(id, registrationProcess);
    return registrationProcess;
  }

  async updateRegistrationProcess(id: number, registrationProcessUpdate: Partial<RegistrationProcess>): Promise<RegistrationProcess | undefined> {
    const registrationProcess = this.registrationProcesses.get(id);
    if (!registrationProcess) return undefined;
    
    const updatedRegistrationProcess = { 
      ...registrationProcess, 
      ...registrationProcessUpdate,
      updatedAt: new Date(),
    };
    this.registrationProcesses.set(id, updatedRegistrationProcess);
    return updatedRegistrationProcess;
  }
  
  // Verification Document methods
  async getVerificationDocument(id: number): Promise<VerificationDocument | undefined> {
    return this.verificationDocuments.get(id);
  }

  async getVerificationDocumentsByUser(userId: number): Promise<VerificationDocument[]> {
    return Array.from(this.verificationDocuments.values()).filter(
      (doc) => doc.userId === userId
    );
  }

  async getVerificationDocumentsByRegistrationProcess(registrationProcessId: number): Promise<VerificationDocument[]> {
    return Array.from(this.verificationDocuments.values()).filter(
      (doc) => doc.registrationProcessId === registrationProcessId
    );
  }

  async createVerificationDocument(insertVerificationDocument: InsertVerificationDocument): Promise<VerificationDocument> {
    const id = this.currentVerificationDocumentId++;
    const verificationDocument: VerificationDocument = { 
      ...insertVerificationDocument, 
      id,
      uploadedAt: new Date(),
      updatedAt: new Date()
    };
    this.verificationDocuments.set(id, verificationDocument);
    return verificationDocument;
  }

  async updateVerificationDocument(id: number, verificationDocumentUpdate: Partial<VerificationDocument>): Promise<VerificationDocument | undefined> {
    const verificationDocument = this.verificationDocuments.get(id);
    if (!verificationDocument) return undefined;
    
    const updatedVerificationDocument = { 
      ...verificationDocument, 
      ...verificationDocumentUpdate,
      updatedAt: new Date(),
    };
    this.verificationDocuments.set(id, updatedVerificationDocument);
    return updatedVerificationDocument;
  }

  // Application methods
  async getApplication(id: number): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async getApplicationsByApplicant(applicantId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.applicantId === applicantId,
    );
  }

  async getApplicationsByProgram(programId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.programId === programId,
    );
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const autoCode = `${id.toString().padStart(4, '0')}/${month}/${year}`;
    
    const application: Application = { 
      ...insertApplication, 
      id,
      status: "draft",
      autoCode,
    };
    
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: number, applicationUpdate: Partial<Application>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    
    // If status is changing to submitted, add submittedAt date
    if (applicationUpdate.status === "submitted" && application.status === "draft") {
      applicationUpdate.submittedAt = new Date();
    }
    
    const updatedApplication = { ...application, ...applicationUpdate };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByApplication(applicationId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.applicationId === applicationId,
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { 
      ...insertDocument, 
      id,
      uploadedAt: new Date(),
    };
    
    this.documents.set(id, document);
    return document;
  }

  // Evaluation methods
  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    return this.evaluations.get(id);
  }

  async getEvaluationsByApplication(applicationId: number): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values()).filter(
      (evaluation) => evaluation.applicationId === applicationId,
    );
  }

  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {
    const id = this.currentEvaluationId++;
    const evaluation: Evaluation = { 
      ...insertEvaluation, 
      id,
      createdAt: new Date(),
    };
    
    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByApplication(applicationId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => msg.applicationId === applicationId,
    );
  }

  async getMessagesBySender(senderId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => msg.senderId === senderId,
    );
  }

  async getMessagesByReceiver(receiverId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => msg.receiverId === receiverId,
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id,
      read: false,
      createdAt: new Date(),
    };
    
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, read: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  // Budget tracking methods
  async getBudgetTracking(id: number): Promise<BudgetTracking | undefined> {
    return this.budgetTrackings.get(id);
  }

  async getBudgetTrackingByProgram(programId: number): Promise<BudgetTracking | undefined> {
    return Array.from(this.budgetTrackings.values()).find(
      (bt) => bt.programId === programId,
    );
  }

  async createBudgetTracking(insertBudgetTracking: InsertBudgetTracking): Promise<BudgetTracking> {
    const id = this.currentBudgetTrackingId++;
    const budgetTracking: BudgetTracking = { 
      ...insertBudgetTracking, 
      id,
      updatedAt: new Date(),
    };
    
    this.budgetTrackings.set(id, budgetTracking);
    return budgetTracking;
  }

  async updateBudgetTracking(id: number, budgetTrackingUpdate: Partial<BudgetTracking>): Promise<BudgetTracking | undefined> {
    const budgetTracking = this.budgetTrackings.get(id);
    if (!budgetTracking) return undefined;
    
    const updatedBudgetTracking = { 
      ...budgetTracking, 
      ...budgetTrackingUpdate,
      updatedAt: new Date(),
    };
    
    this.budgetTrackings.set(id, updatedBudgetTracking);
    return updatedBudgetTracking;
  }
}

export const storage = new MemStorage();
