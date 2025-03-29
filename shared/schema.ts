import { pgTable, text, serial, integer, timestamp, boolean, varchar, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["administrator", "applicant", "reviewer", "donor"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Added fields for user profile and verification
  applicantTypeId: integer("applicant_type_id").references(() => applicantTypes.id),
  isVerified: boolean("is_verified").default(false),
  profileComplete: boolean("profile_complete").default(false),
  
  // Contact information
  phoneNumber: text("phone_number"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  postalCode: text("postal_code"),
  
  // For organizations and corporations
  organizationName: text("organization_name"),
  organizationPosition: text("organization_position"),
  website: text("website"),
  
  // For proper display
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    fullName: true,
    email: true,
    password: true,
    role: true,
    applicantTypeId: true,
    phoneNumber: true,
    address: true,
    city: true,
    country: true,
    postalCode: true,
    organizationName: true,
    organizationPosition: true,
    website: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Invalid email format"),
  });

// Programs model
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["sponzorstvo", "donacija"] }).notNull(),
  budgetTotal: integer("budget_total").notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  // Which applicant types can apply for this program
  eligibleApplicantTypes: text("eligible_applicant_types").array(),
});

export const insertProgramSchema = createInsertSchema(programs).pick({
  name: true,
  type: true,
  budgetTotal: true,
  year: true,
  description: true,
  active: true,
  eligibleApplicantTypes: true,
});

// Applicant Types
export const applicantTypes = pgTable("applicant_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),  // "organization", "individual", "corporation"
  description: text("description"),
  requiredDocuments: text("required_documents").array(),  // Array of required document types
  registrationSteps: text("registration_steps").array(), // Array of registration steps to complete
  verificationRequirements: text("verification_requirements").array(), // Array of verification requirements
});

export const insertApplicantTypeSchema = createInsertSchema(applicantTypes).pick({
  name: true,
  description: true,
  requiredDocuments: true,
  registrationSteps: true,
  verificationRequirements: true,
});

// Registration Process
export const registrationProcesses = pgTable("registration_processes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  applicantTypeId: integer("applicant_type_id").notNull().references(() => applicantTypes.id),
  status: text("status", { 
    enum: ["incomplete", "pending_verification", "verified", "rejected"] 
  }).notNull().default("incomplete"),
  currentStep: integer("current_step").default(1),
  totalSteps: integer("total_steps").notNull(),
  completedSteps: text("completed_steps").array(), // Array of completed step names
  verificationDate: timestamp("verification_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRegistrationProcessSchema = createInsertSchema(registrationProcesses).pick({
  userId: true,
  applicantTypeId: true,
  totalSteps: true,
});

// Applications model
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").notNull().references(() => users.id),
  programId: integer("program_id").notNull().references(() => programs.id),
  applicantTypeId: integer("applicant_type_id").references(() => applicantTypes.id),
  status: text("status", { 
    enum: ["draft", "submitted", "u obradi", "preporučeno", "odbijeno", "odobreno", "completed", "revisit"] 
  }).notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  autoCode: text("auto_code").notNull(),
  summary: text("summary").notNull(),
  requestedAmount: integer("requested_amount"),
  projectDuration: integer("project_duration"),
  organization: text("organization"),
  description: text("description"),
  // New fields for different applicant types
  legalStructure: text("legal_structure"),  // For organizations/corporations
  yearEstablished: integer("year_established"),  // For organizations/corporations
  taxId: text("tax_id"),  // For organizations/corporations
  registrationNumber: text("registration_number"),  // For organizations/corporations
  numberOfEmployees: integer("number_of_employees"),  // For organizations/corporations
  annualBudget: integer("annual_budget"),  // For organizations
  profitLastYear: integer("profit_last_year"),  // For corporations
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  applicantId: true,
  programId: true,
  applicantTypeId: true,
  summary: true,
  requestedAmount: true,
  projectDuration: true,
  organization: true,
  description: true,
  legalStructure: true,
  yearEstablished: true,
  taxId: true,
  registrationNumber: true,
  numberOfEmployees: true,
  annualBudget: true,
  profitLastYear: true,
});

// Documents model
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  applicationId: true,
  fileName: true,
  fileType: true,
  filePath: true,
  uploadedBy: true,
});

// Evaluations model
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  evaluatedBy: integer("evaluated_by").notNull().references(() => users.id),
  score: integer("score"),
  decision: text("decision", { enum: ["preporučeno", "odbijeno", "revisit"] }),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvaluationSchema = createInsertSchema(evaluations).pick({
  applicationId: true,
  evaluatedBy: true,
  score: true,
  decision: true,
  comment: true,
});

// Messages model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  applicationId: true,
  senderId: true,
  receiverId: true,
  content: true,
});

// Budget tracking model
export const budgetTracking = pgTable("budget_tracking", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id),
  reserved: integer("reserved").default(0),
  approved: integer("approved").default(0),
  spent: integer("spent").default(0),
  available: integer("available"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBudgetTrackingSchema = createInsertSchema(budgetTracking).pick({
  programId: true,
  reserved: true,
  approved: true,
  spent: true,
  available: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;

export type ApplicantType = typeof applicantTypes.$inferSelect;
export type InsertApplicantType = z.infer<typeof insertApplicantTypeSchema>;

export type RegistrationProcess = typeof registrationProcesses.$inferSelect;
export type InsertRegistrationProcess = z.infer<typeof insertRegistrationProcessSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type BudgetTracking = typeof budgetTracking.$inferSelect;
export type InsertBudgetTracking = z.infer<typeof insertBudgetTrackingSchema>;
