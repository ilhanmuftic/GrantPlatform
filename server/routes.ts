import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertApplicationSchema, insertMessageSchema, insertDocumentSchema, insertEvaluationSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
