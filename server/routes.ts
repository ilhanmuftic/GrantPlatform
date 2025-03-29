import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { 
  insertUserSchema,
  insertApplicationSchema, 
  insertMessageSchema, 
  insertDocumentSchema, 
  insertEvaluationSchema,
  Application,
  Program,
  User
} from "@shared/schema";

// AI evaluation function
interface AIEvaluationResult {
  score: number;
  decision: "preporučeno" | "odbijeno" | "revisit";
  comment: string;
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };
}

function generateAIEvaluation(
  application: Application, 
  program: Program, 
  applicant: User
): AIEvaluationResult {
  // This would be replaced with a real AI service in production
  // For now, we'll create a sample analysis based on application data
  
  // Calculate a score based on various factors
  let score = 75; // Default score
  let strengths = [];
  let weaknesses = [];
  
  // Adjust score based on application data
  if (application.requestedAmount && program.budgetTotal) {
    const requestRatio = application.requestedAmount / program.budgetTotal;
    
    // If requested amount is less than 10% of budget, consider it reasonable
    if (requestRatio < 0.1) {
      score += 10;
      strengths.push("Reasonable budget request relative to program size");
    } else if (requestRatio > 0.3) {
      score -= 15;
      weaknesses.push("Requested amount is significant portion of total program budget");
    }
  }
  
  // Analyze application completeness
  if (application.description && application.description.length > 300) {
    score += 5;
    strengths.push("Detailed project description provided");
  } else {
    score -= 5;
    weaknesses.push("Project description could be more comprehensive");
  }
  
  // Analyze organization information
  if (application.organization) {
    score += 5;
    strengths.push("Clear organizational information provided");
  } else {
    weaknesses.push("Missing organizational details");
  }
  
  // Check project duration for reasonableness
  if (application.projectDuration) {
    if (application.projectDuration > 24) {
      score -= 5;
      weaknesses.push("Project timeline may be too long for effective monitoring");
    } else if (application.projectDuration < 6) {
      score += 5;
      strengths.push("Project has focused, achievable timeline");
    }
  }
  
  // Determine decision based on score
  let decision: "preporučeno" | "odbijeno" | "revisit";
  let recommendation = "";
  
  if (score >= 80) {
    decision = "preporučeno";
    recommendation = "This application shows strong potential for success and alignment with program goals.";
  } else if (score < 60) {
    decision = "odbijeno";
    recommendation = "This application has several areas that need improvement before it can be recommended.";
  } else {
    decision = "revisit";
    recommendation = "This application has potential but requires further discussion and possibly additional information.";
  }
  
  // Generate a comment based on the analysis
  const comment = `AI Evaluation Analysis:
Based on my review of the application "${application.summary}" for the program "${program.name}", I have assigned a score of ${score}/100.

Key observations:
${strengths.map(s => `+ ${s}`).join('\n')}
${weaknesses.map(w => `- ${w}`).join('\n')}

${recommendation}
`;

  return {
    score,
    decision,
    comment,
    insights: {
      strengths,
      weaknesses,
      recommendation
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove password from the response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Only administrators can create users
    if (req.user.role !== 'administrator') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Validate data and hash the password
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("User creation error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.patch("/api/users/:id/role", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Only administrators can change user roles
    if (req.user.role !== 'administrator') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !['administrator', 'applicant', 'reviewer', 'referent', 'donator'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(id, { role });
      
      // Remove password from the response
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to update user role" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Programs routes
  app.get("/api/programs", async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getProgram(id);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  app.get("/api/programs/:id/budget", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const budgetTracking = await storage.getBudgetTrackingByProgram(id);
      
      if (!budgetTracking) {
        return res.status(404).json({ message: "Budget tracking not found" });
      }
      
      res.json(budgetTracking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budget tracking" });
    }
  });

  // Applications routes
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertApplicationSchema.parse({
        ...req.body,
        applicantId: req.user.id,
      });
      
      const application = await storage.createApplication(validatedData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid application data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only allow applicant to update own applications or admin/reviewer for others
      if (application.applicantId !== req.user.id && 
          !['administrator', 'reviewer'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Don't allow updates to submitted applications unless admin/reviewer
      if (application.status !== 'draft' && !['administrator', 'reviewer'].includes(req.user.role)) {
        return res.status(403).json({ message: "Cannot update submitted application" });
      }
      
      const updatedApplication = await storage.updateApplication(id, req.body);
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  app.post("/api/applications/:id/submit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only allow applicant to submit own applications
      if (application.applicantId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Don't allow submitting already submitted applications
      if (application.status !== 'draft') {
        return res.status(400).json({ message: "Application already submitted" });
      }
      
      const updatedApplication = await storage.updateApplication(id, { 
        status: 'submitted', 
        submittedAt: new Date() 
      });
      
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Documents routes
  app.get("/api/applications/:id/documents", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const documents = await storage.getDocumentsByApplication(id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/applications/:id/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only allow applicant to add documents to own applications or admin/reviewer
      if (application.applicantId !== req.user.id && 
          !['administrator', 'reviewer'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        applicationId,
        uploadedBy: req.user.id,
      });
      
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Evaluations routes
  app.get("/api/evaluations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only reviewers and admins can view all evaluations
    if (!['administrator', 'reviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const applications = await storage.getApplications();
      let allEvaluations = [];
      
      for (const application of applications) {
        const evaluations = await storage.getEvaluationsByApplication(application.id);
        allEvaluations = [...allEvaluations, ...evaluations];
      }
      
      res.json(allEvaluations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });
  
  // AI-assisted evaluation generation
  app.post("/api/applications/:id/ai-evaluation", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only reviewers and admins can use AI evaluation
    if (!['administrator', 'reviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get program details
      const program = await storage.getProgram(application.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      // Get applicant details
      const applicant = await storage.getUser(application.applicantId);
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }
      
      // Depending on program type and application data, determine AI analysis
      const aiAnalysis = generateAIEvaluation(application, program, applicant);
      
      res.json(aiAnalysis);
    } catch (error) {
      console.error("AI evaluation error:", error);
      res.status(500).json({ message: "Failed to generate AI evaluation" });
    }
  });

  app.get("/api/applications/:id/evaluations", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const evaluations = await storage.getEvaluationsByApplication(id);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  app.post("/api/applications/:id/evaluations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only reviewers and admins can create evaluations
    if (!['administrator', 'reviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const validatedData = insertEvaluationSchema.parse({
        ...req.body,
        applicationId,
        evaluatedBy: req.user.id,
      });
      
      const evaluation = await storage.createEvaluation(validatedData);
      
      // Update application status based on evaluation decision
      if (validatedData.decision) {
        await storage.updateApplication(applicationId, { status: validatedData.decision });
      }
      
      res.status(201).json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid evaluation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluation" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const receivedMessages = await storage.getMessagesByReceiver(req.user.id);
      const sentMessages = await storage.getMessagesBySender(req.user.id);
      res.json({ received: receivedMessages, sent: sentMessages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/applications/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only allow users involved with the application to view messages
      if (application.applicantId !== req.user.id && 
          !['administrator', 'reviewer', 'donor'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const messages = await storage.getMessagesByApplication(applicationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/applications/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only allow users involved with the application to send messages
      if (application.applicantId !== req.user.id && 
          !['administrator', 'reviewer', 'donor'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        applicationId,
        senderId: req.user.id,
      });
      
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only receiver can mark message as read
      if (message.receiverId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedMessage = await storage.markMessageAsRead(id);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Budget tracking routes
  app.get("/api/budget", async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      const budgetData = await Promise.all(
        programs.map(async (program) => {
          const budgetTracking = await storage.getBudgetTrackingByProgram(program.id);
          return {
            program,
            budget: budgetTracking,
          };
        })
      );
      
      res.json(budgetData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budget data" });
    }
  });
  
  // Applicant types routes
  app.get("/api/applicant-types", async (req, res) => {
    try {
      const applicantTypes = await storage.getApplicantTypes();
      res.json(applicantTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applicant types" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
