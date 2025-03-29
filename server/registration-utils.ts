import { 
  ApplicantType, 
  RegistrationProcess, 
  VerificationDocument,
  InsertRegistrationProcess
} from "../shared/schema";
import { storage } from "./storage";
import { 
  APPLICANT_TYPE, 
  REGISTRATION_STEPS, 
  REQUIRED_DOCUMENTS,
  VERIFICATION_REQUIREMENTS,
  REGISTRATION_STATUS,
  DOCUMENT_VERIFICATION_STATUS,
  EMAIL_VALIDATION
} from "../shared/constants";

/**
 * Creates a new registration process for a user based on applicant type
 */
export async function createRegistrationProcess(
  userId: number, 
  applicantTypeId: number
): Promise<RegistrationProcess> {
  // Get the applicant type details
  const applicantType = await storage.getApplicantType(applicantTypeId);
  if (!applicantType) {
    throw new Error("Invalid applicant type");
  }
  
  // Determine the total steps based on applicant type
  let totalSteps = 0;
  if (applicantType.name === APPLICANT_TYPE.INDIVIDUAL) {
    totalSteps = REGISTRATION_STEPS[APPLICANT_TYPE.INDIVIDUAL].length;
  } else if (applicantType.name === APPLICANT_TYPE.ORGANIZATION) {
    totalSteps = REGISTRATION_STEPS[APPLICANT_TYPE.ORGANIZATION].length;
  } else if (applicantType.name === APPLICANT_TYPE.CORPORATION) {
    totalSteps = REGISTRATION_STEPS[APPLICANT_TYPE.CORPORATION].length;
  } else {
    totalSteps = 5; // Default number of steps
  }
  
  // Create the registration process
  const registrationProcess: InsertRegistrationProcess = {
    userId,
    applicantTypeId,
    totalSteps
  };
  
  return await storage.createRegistrationProcess(registrationProcess);
}

/**
 * Updates the current step in the registration process
 */
export async function updateRegistrationStep(
  registrationProcessId: number,
  newStep: number,
  completedStep?: string
): Promise<RegistrationProcess | undefined> {
  const process = await storage.getRegistrationProcess(registrationProcessId);
  if (!process) {
    throw new Error("Registration process not found");
  }
  
  // Update the completed steps array if a completed step is provided
  let completedSteps = process.completedSteps || [];
  if (completedStep && !completedSteps.includes(completedStep)) {
    completedSteps = [...completedSteps, completedStep];
  }
  
  // Check if all steps are completed
  const status = completedSteps.length >= process.totalSteps 
    ? REGISTRATION_STATUS.PENDING_VERIFICATION 
    : REGISTRATION_STATUS.INCOMPLETE;
  
  return await storage.updateRegistrationProcess(registrationProcessId, {
    currentStep: newStep,
    completedSteps,
    status,
    updatedAt: new Date()
  });
}

/**
 * Verifies a registration process based on document verification
 */
export async function verifyRegistrationProcess(
  registrationProcessId: number,
  adminId: number,
  approved: boolean,
  rejectionReason?: string
): Promise<RegistrationProcess | undefined> {
  const process = await storage.getRegistrationProcess(registrationProcessId);
  if (!process) {
    throw new Error("Registration process not found");
  }
  
  const status = approved ? REGISTRATION_STATUS.VERIFIED : REGISTRATION_STATUS.REJECTED;
  
  // If approved, update the user isVerified flag
  if (approved) {
    await storage.updateUser(process.userId, { isVerified: true });
  }
  
  return await storage.updateRegistrationProcess(registrationProcessId, {
    status,
    rejectionReason: rejectionReason || null,
    verificationDate: new Date(),
    updatedAt: new Date()
  });
}

/**
 * AI-based verification of document information
 * This function would use AI to extract information from the document
 * and verify it against the requirements
 */
export function performAIDocumentVerification(
  documentPath: string,
  documentType: string
): { 
  verified: boolean; 
  score: number; 
  extractedFields: Record<string, string>;
  issues?: string[];
  message?: string;
} {
  // This is a placeholder for actual AI verification logic
  // In a real implementation, this would use an AI service to analyze the document
  
  // Simulate AI verification by returning a successful result
  // In production, this would actually analyze the image, extract text, etc.
  const extractedFields: Record<string, string> = {};
  const requirements = VERIFICATION_REQUIREMENTS[documentType as keyof typeof VERIFICATION_REQUIREMENTS] || [];
  
  // Just for simulation - pretend we extracted these fields
  requirements.forEach(field => {
    extractedFields[field] = `Sample ${field.replace('_', ' ')}`;
  });
  
  return {
    verified: true,
    score: 87, // Example score
    extractedFields,
    message: "Document appears to be valid and all required information was successfully extracted."
  };
}

/**
 * Validates a document using AI and updates its verification status
 */
export async function validateDocumentWithAI(
  documentId: number
): Promise<VerificationDocument | undefined> {
  const document = await storage.getVerificationDocument(documentId);
  if (!document) {
    throw new Error("Document not found");
  }
  
  // Perform AI verification on the document
  const aiVerificationResult = performAIDocumentVerification(
    document.filePath,
    document.documentType
  );
  
  // Determine verification status based on AI score
  let verificationStatus = DOCUMENT_VERIFICATION_STATUS.PENDING;
  if (aiVerificationResult.score >= 85) {
    verificationStatus = DOCUMENT_VERIFICATION_STATUS.APPROVED;
  } else if (aiVerificationResult.score >= 60) {
    verificationStatus = DOCUMENT_VERIFICATION_STATUS.PENDING; // Human review needed
  } else {
    verificationStatus = DOCUMENT_VERIFICATION_STATUS.REQUIRES_RESUBMISSION;
  }
  
  // Update the document with AI verification results
  return await storage.updateVerificationDocument(documentId, {
    aiVerified: true,
    aiVerificationResult: JSON.stringify(aiVerificationResult),
    aiVerificationScore: aiVerificationResult.score,
    verificationStatus: aiVerificationResult.score >= 85 ? DOCUMENT_VERIFICATION_STATUS.APPROVED : verificationStatus
  });
}

/**
 * Validates if an email is acceptable for the given applicant type
 * Enforces business rules for email domains based on applicant type
 */
export function validateEmailForApplicantType(email: string, applicantType: string): {
  valid: boolean;
  message?: string;
} {
  if (!email) {
    return { valid: false, message: "Email is required" };
  }
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, message: "Invalid email format" };
  }
  
  // Get validation rules for this applicant type
  const validationRules = EMAIL_VALIDATION[applicantType as keyof typeof EMAIL_VALIDATION];
  if (!validationRules) {
    return { valid: true }; // No specific rules
  }
  
  // Individual applicants can use any email
  if (applicantType === APPLICANT_TYPE.INDIVIDUAL) {
    return { valid: true };
  }
  
  // Check against disallowed domains (both for org and corp)
  if (validationRules.disallowed_domains && 
      validationRules.disallowed_domains.includes(domain)) {
    return { 
      valid: false, 
      message: `${applicantType === APPLICANT_TYPE.ORGANIZATION ? 'Organizations' : 'Corporations'} cannot use personal email domains like gmail.com, yahoo.com, etc.` 
    };
  }
  
  // Additional checks for organizations - must end with .org, .ngo, etc.
  if (applicantType === APPLICANT_TYPE.ORGANIZATION && 
      validationRules.pattern && 
      !validationRules.pattern.test(domain)) {
    return { 
      valid: false, 
      message: "Organizations should use official domain names ending with .org, .ngo, .ba, .net, or .com" 
    };
  }
  
  return { valid: true };
}

/**
 * Checks if all required documents for a registration process have been uploaded and verified
 */
export async function checkDocumentVerificationStatus(
  registrationProcessId: number
): Promise<{
  allUploaded: boolean;
  allVerified: boolean;
  pendingDocuments: string[];
  rejectedDocuments: string[];
}> {
  const process = await storage.getRegistrationProcess(registrationProcessId);
  if (!process) {
    throw new Error("Registration process not found");
  }
  
  // Get applicant type to determine required documents
  const applicantType = await storage.getApplicantType(process.applicantTypeId);
  if (!applicantType) {
    throw new Error("Applicant type not found");
  }
  
  // Get all uploaded verification documents for this registration process
  const documents = await storage.getVerificationDocumentsByRegistrationProcess(registrationProcessId);
  
  // Get the list of required documents for this applicant type
  const requiredDocs = REQUIRED_DOCUMENTS[applicantType.name as keyof typeof REQUIRED_DOCUMENTS] || [];
  
  // Check which documents are uploaded and verified
  const uploadedDocTypes = documents.map(doc => doc.documentType);
  const verifiedDocTypes = documents
    .filter(doc => doc.verificationStatus === DOCUMENT_VERIFICATION_STATUS.APPROVED)
    .map(doc => doc.documentType);
  
  const pendingDocuments = requiredDocs.filter(doc => !uploadedDocTypes.includes(doc));
  const rejectedDocuments = documents
    .filter(doc => doc.verificationStatus === DOCUMENT_VERIFICATION_STATUS.REJECTED || 
                  doc.verificationStatus === DOCUMENT_VERIFICATION_STATUS.REQUIRES_RESUBMISSION)
    .map(doc => doc.documentType);
  
  return {
    allUploaded: pendingDocuments.length === 0,
    allVerified: verifiedDocTypes.length === requiredDocs.length,
    pendingDocuments,
    rejectedDocuments
  };
}