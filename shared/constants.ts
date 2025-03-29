/**
 * Constants for applicant registration processes
 */

// Applicant Types
export const APPLICANT_TYPE = {
  ORGANIZATION: "organization",
  INDIVIDUAL: "individual",
  CORPORATION: "corporation"
};

// Registration steps for different applicant types
export const REGISTRATION_STEPS = {
  [APPLICANT_TYPE.INDIVIDUAL]: [
    "account_creation",
    "personal_information",
    "contact_details",
    "identity_verification",
    "complete_profile"
  ],
  [APPLICANT_TYPE.ORGANIZATION]: [
    "account_creation",
    "organization_information",
    "legal_status",
    "contact_person",
    "documentation",
    "verification_submission"
  ],
  [APPLICANT_TYPE.CORPORATION]: [
    "account_creation",
    "company_information",
    "legal_registration",
    "financial_information",
    "contact_person",
    "documentation",
    "verification_submission"
  ]
};

// Required documents for each applicant type
export const REQUIRED_DOCUMENTS = {
  [APPLICANT_TYPE.INDIVIDUAL]: [
    "id_card_passport", // Lična karta ili pasoš (obostrano)
    "resume_cv", // CV / biografija
    "motivation_letter", // Motivaciono pismo / plan korištenja sredstava
    "signed_declaration" // Potpisana izjava o korištenju sredstava u skladu s pravilima
  ],
  [APPLICANT_TYPE.ORGANIZATION]: [
    "registration_certificate", // Rješenje o registraciji udruženja/fondacije
    "organization_statute", // Statut udruženja
    "board_decision", // Odluka Upravnog odbora o apliciranju na poziv
    "tax_id_document", // Identifikacioni broj (JIB) / porezni broj
    "authorized_person_declaration" // Izjava ovlaštene osobe (predsjednik/sekretar)
  ],
  [APPLICANT_TYPE.CORPORATION]: [
    "business_registration", // Rješenje o registraciji firme (izvod iz sudskog registra)
    "tax_id_document", // PDV broj ili porezni ID
    "bank_statement", // Izvod iz banke ili dokaz o poslovnom računu
    "legal_representative_declaration" // Potpisana izjava zakonskog zastupnika
  ]
};

// Verification requirements for different document types
export const VERIFICATION_REQUIREMENTS = {
  "id_card_passport": ["document_type", "full_name", "document_number", "expiry_date", "issuing_authority"],
  "resume_cv": ["full_name", "education", "experience", "min_length_words_300"],
  "motivation_letter": ["purpose", "goals", "min_length_words_300"],
  "signed_declaration": ["full_name", "signature", "date"],
  
  "registration_certificate": ["organization_name", "registration_number", "registration_date", "issuing_authority"],
  "organization_statute": ["organization_name", "purpose", "governance_structure"],
  "board_decision": ["organization_name", "decision_date", "signatures", "meeting_reference"],
  "tax_id_document": ["entity_name", "tax_id_number", "issue_date"],
  "authorized_person_declaration": ["full_name", "position", "signature", "date"],
  
  "business_registration": ["company_name", "registration_number", "registration_date", "legal_structure"],
  "bank_statement": ["account_number", "bank_name", "account_holder_name", "statement_date"],
  "legal_representative_declaration": ["full_name", "position", "signature", "date"]
};

// Email validation patterns
export const EMAIL_VALIDATION = {
  [APPLICANT_TYPE.INDIVIDUAL]: {
    // Can use any email
    pattern: null,
    allowed_domains: null,
    disallowed_domains: null
  },
  [APPLICANT_TYPE.ORGANIZATION]: {
    // Must use .org, .ngo, .ba, etc. and not personal domains
    pattern: /\.(org|ngo|ba|net|com)$/,
    disallowed_domains: ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "gmail.ba", "yahoo.ba"]
  },
  [APPLICANT_TYPE.CORPORATION]: {
    // Must have business domain (not personal email)
    pattern: null,
    disallowed_domains: ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "gmail.ba", "yahoo.ba"]
  }
};

// Registration process statuses
export const REGISTRATION_STATUS = {
  INCOMPLETE: "incomplete",
  PENDING_VERIFICATION: "pending_verification",
  VERIFIED: "verified",
  REJECTED: "rejected"
};

// Verification document statuses
export const DOCUMENT_VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  REQUIRES_RESUBMISSION: "requires_resubmission"
};