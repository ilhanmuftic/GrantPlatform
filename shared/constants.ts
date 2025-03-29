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
    "id_card",
    "proof_of_address", 
    "resume_cv",
    "motivation_letter"
  ],
  [APPLICANT_TYPE.ORGANIZATION]: [
    "registration_certificate",
    "tax_id_document", 
    "financial_statements",
    "statute_bylaws", 
    "board_member_list",
    "proof_of_address",
    "organizational_structure"
  ],
  [APPLICANT_TYPE.CORPORATION]: [
    "business_registration",
    "tax_id_document",
    "financial_statements",
    "company_structure",
    "board_resolution",
    "proof_of_address",
    "annual_report"
  ]
};

// Verification requirements for different document types
export const VERIFICATION_REQUIREMENTS = {
  "id_card": ["document_type", "full_name", "document_number", "expiry_date", "issuing_authority"],
  "proof_of_address": ["document_type", "full_name", "address", "issue_date"],
  "registration_certificate": ["organization_name", "registration_number", "registration_date", "issuing_authority"],
  "tax_id_document": ["entity_name", "tax_id_number", "issue_date"],
  "business_registration": ["company_name", "registration_number", "registration_date", "legal_structure"]
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