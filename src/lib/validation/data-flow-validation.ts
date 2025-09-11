import { z } from 'zod';
import * as CanonicalDtos from '@/lib/database/canonical-dtos';
import { testCanonicalConversion } from '@/lib/database/canonical-dal';

/**
 * Data Flow Validation Utilities
 * 
 * These utilities provide systematic validation of data contracts
 * throughout the registration process. They can be used in:
 * - Unit tests
 * - Integration tests
 * - CI/CD pipelines
 * - Development debugging
 */

export interface DataFlowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  layerResults: {
    frontendValidation: boolean;
    canonicalConversion: boolean;
    dtoValidation: boolean;
    schemaCompatibility: boolean;
  };
}

export interface ValidationOptions {
  strictMode?: boolean;
  includeWarnings?: boolean;
  validateTimestamps?: boolean;
  validateForeignKeys?: boolean;
}

/**
 * Comprehensive data flow validation
 * Validates data through all layers of the registration process
 */
export function validateRegistrationDataFlow(
  formData: Record<string, unknown>,
  options: ValidationOptions = {}
): DataFlowValidationResult {
  const {
    strictMode = true,
    includeWarnings = true,
    validateTimestamps = true,
    validateForeignKeys = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const layerResults = {
    frontendValidation: false,
    canonicalConversion: false,
    dtoValidation: false,
    schemaCompatibility: false,
  };

  // Layer 1: Frontend Form Validation
  try {
    validateFrontendFormData(formData);
    layerResults.frontendValidation = true;
  } catch (error) {
    errors.push(`Frontend validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Layer 2: Canonical Conversion
  try {
    const conversionResult = testCanonicalConversion(formData);
    if (conversionResult) {
      layerResults.canonicalConversion = true;
    } else {
      // Only add canonical conversion errors if we're validating timestamps
      if (validateTimestamps) {
        errors.push('Canonical conversion failed');
      }
    }
  } catch (error) {
    if (validateTimestamps) {
      errors.push(`Canonical conversion error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Layer 3: DTO Validation (same as canonical conversion)
  layerResults.dtoValidation = layerResults.canonicalConversion;

  // Layer 4: Schema Compatibility
  try {
    validateSchemaCompatibility(formData);
    layerResults.schemaCompatibility = true;
  } catch (error) {
    errors.push(`Schema compatibility failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Additional validations based on options
  if (validateTimestamps) {
    validateTimestampFields(formData, errors, warnings);
  }

  if (validateForeignKeys) {
    validateForeignKeyConstraints(formData, errors, warnings);
  }

  if (includeWarnings) {
    checkForPotentialIssues(formData, warnings);
  }

  // Always validate phone numbers and emails for specific error detection
  validatePhoneNumbers(formData, errors);
  validateEmails(formData, errors);

  const isValid = errors.length === 0 && Object.values(layerResults).every(Boolean);

  return {
    isValid,
    errors,
    warnings,
    layerResults,
  };
}

/**
 * Validate frontend form data structure
 */
function validateFrontendFormData(formData: Record<string, unknown>): void {
  const requiredFields = [
    'household',
    'guardians',
    'emergencyContact',
    'children',
    'consents',
  ];

  for (const field of requiredFields) {
    if (!formData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate household structure
  const household = formData.household as Record<string, unknown>;
  if (!household.address_line1) {
    throw new Error('Household missing required address_line1');
  }

  // Validate guardians array
  const guardians = formData.guardians as Array<Record<string, unknown>>;
  if (!Array.isArray(guardians) || guardians.length === 0) {
    throw new Error('At least one guardian is required');
  }

  for (const guardian of guardians) {
    if (!guardian.first_name || !guardian.last_name || !guardian.mobile_phone) {
      throw new Error('Guardian missing required fields');
    }
  }

  // Validate emergency contact
  const emergencyContact = formData.emergencyContact as Record<string, unknown>;
  if (!emergencyContact.first_name || !emergencyContact.last_name || !emergencyContact.mobile_phone) {
    throw new Error('Emergency contact missing required fields');
  }

  // Validate children array
  const children = formData.children as Array<Record<string, unknown>>;
  if (!Array.isArray(children) || children.length === 0) {
    throw new Error('At least one child is required');
  }

  for (const child of children) {
    if (!child.first_name || !child.last_name) {
      throw new Error('Child missing required fields');
    }
  }

  // Validate consents
  const consents = formData.consents as Record<string, unknown>;
  if (!consents.liability || !consents.photoRelease) {
    throw new Error('Required consents not provided');
  }
}

/**
 * Validate schema compatibility
 */
function validateSchemaCompatibility(formData: Record<string, unknown>): void {
  // Check for camelCase fields that should be snake_case
  const jsonString = JSON.stringify(formData);
  const camelCaseFields = [
    'preferredScriptureTranslation',
    'photoRelease',
    'emergencyContact',
    'ministrySelections',
    'interestSelections',
    'customData',
  ];

  for (const camelField of camelCaseFields) {
    if (jsonString.includes(camelField)) {
      // This is expected in frontend data, but we should warn about it
      console.warn(`Found camelCase field in frontend data: ${camelField}`);
    }
  }

  // Validate that required database fields are present
  const household = formData.household as Record<string, unknown>;
  if (!household.address_line1) {
    throw new Error('Missing required database field: address_line1');
  }

  const guardians = formData.guardians as Array<Record<string, unknown>>;
  for (const guardian of guardians) {
    if (!guardian.first_name || !guardian.last_name || !guardian.mobile_phone) {
      throw new Error('Missing required database fields for guardian');
    }
  }

  const children = formData.children as Array<Record<string, unknown>>;
  for (const child of children) {
    if (!child.first_name || !child.last_name) {
      throw new Error('Missing required database fields for child');
    }
  }
}

/**
 * Validate timestamp fields
 */
function validateTimestampFields(
  formData: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  // Check for proper timestamp formats in children DOB
  const children = formData.children as Array<Record<string, unknown>>;
  for (const child of children) {
    if (child.dob) {
      const dob = child.dob as string;
      if (isNaN(Date.parse(dob))) {
        errors.push(`Invalid date format for child DOB: ${dob}`);
      } else {
        // Check if date is reasonable (not in future, not too old)
        const dobDate = new Date(dob);
        const now = new Date();
        const age = now.getFullYear() - dobDate.getFullYear();
        
        if (dobDate > now) {
          errors.push(`Child DOB cannot be in the future: ${dob}`);
        } else if (age > 25) {
          warnings.push(`Child age seems unusually high: ${age} years`);
        }
      }
    }
  }
}

/**
 * Validate foreign key constraints
 */
function validateForeignKeyConstraints(
  formData: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  // Check that all entities have consistent household_id references
  const household = formData.household as Record<string, unknown>;
  const householdId = household.household_id as string | undefined;
  
  const guardians = formData.guardians as Array<Record<string, unknown>>;
  for (const guardian of guardians) {
    const guardianHouseholdId = guardian.household_id as string | undefined;
    if (householdId && guardianHouseholdId && householdId !== guardianHouseholdId) {
      errors.push('Guardian household_id does not match household household_id');
    }
  }

  const children = formData.children as Array<Record<string, unknown>>;
  for (const child of children) {
    const childHouseholdId = child.household_id as string | undefined;
    if (householdId && childHouseholdId && householdId !== childHouseholdId) {
      errors.push('Child household_id does not match household household_id');
    }
  }

  const emergencyContact = formData.emergencyContact as Record<string, unknown>;
  const emergencyHouseholdId = emergencyContact.household_id as string | undefined;
  if (householdId && emergencyHouseholdId && householdId !== emergencyHouseholdId) {
    errors.push('Emergency contact household_id does not match household household_id');
  }
}

/**
 * Validate phone numbers
 */
function validatePhoneNumbers(
  formData: Record<string, unknown>,
  errors: string[]
): void {
  const guardians = formData.guardians as Array<Record<string, unknown>>;
  for (const guardian of guardians) {
    const phone = guardian.mobile_phone as string;
    if (phone && phone.length < 10) {
      errors.push(`Invalid phone number: ${phone} (too short)`);
    }
  }

  const emergencyContact = formData.emergencyContact as Record<string, unknown>;
  const emergencyPhone = emergencyContact.mobile_phone as string;
  if (emergencyPhone && emergencyPhone.length < 10) {
    errors.push(`Invalid emergency contact phone number: ${emergencyPhone} (too short)`);
  }
}

/**
 * Validate email addresses
 */
function validateEmails(
  formData: Record<string, unknown>,
  errors: string[]
): void {
  const guardians = formData.guardians as Array<Record<string, unknown>>;
  for (const guardian of guardians) {
    const email = guardian.email as string;
    if (email && !email.includes('@')) {
      errors.push(`Invalid email address: ${email}`);
    }
  }
}

/**
 * Check for potential issues
 */
function checkForPotentialIssues(
  formData: Record<string, unknown>,
  warnings: string[]
): void {
  // Check for duplicate guardian emails
  const guardians = formData.guardians as Array<Record<string, unknown>>;
  const emails = guardians.map(g => g.email as string).filter(Boolean);
  const uniqueEmails = new Set(emails);
  if (emails.length !== uniqueEmails.size) {
    warnings.push('Duplicate guardian emails detected');
  }

  // Check for duplicate child names
  const children = formData.children as Array<Record<string, unknown>>;
  const childNames = children.map(c => `${c.first_name} ${c.last_name}`);
  const uniqueNames = new Set(childNames);
  if (childNames.length !== uniqueNames.size) {
    warnings.push('Duplicate child names detected');
  }

  // Check for missing optional but recommended fields
  const household = formData.household as Record<string, unknown>;
  if (!household.city || !household.state || !household.zip) {
    warnings.push('Household missing address details (city, state, zip)');
  }

  // Check for special needs without notes
  for (const child of children) {
    if (child.special_needs && !child.special_needs_notes) {
      warnings.push(`Child ${child.first_name} has special needs but no notes provided`);
    }
  }
}

/**
 * Generate a comprehensive validation report
 */
export function generateValidationReport(
  formData: Record<string, unknown>,
  options: ValidationOptions = {}
): string {
  const result = validateRegistrationDataFlow(formData, options);
  
  let report = '=== Registration Data Flow Validation Report ===\n\n';
  
  report += `Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;
  
  report += 'Layer Results:\n';
  report += `  Frontend Validation: ${result.layerResults.frontendValidation ? '✅' : '❌'}\n`;
  report += `  Canonical Conversion: ${result.layerResults.canonicalConversion ? '✅' : '❌'}\n`;
  report += `  DTO Validation: ${result.layerResults.dtoValidation ? '✅' : '❌'}\n`;
  report += `  Schema Compatibility: ${result.layerResults.schemaCompatibility ? '✅' : '❌'}\n\n`;
  
  if (result.errors.length > 0) {
    report += 'Errors:\n';
    result.errors.forEach(error => report += `  ❌ ${error}\n`);
    report += '\n';
  }
  
  if (result.warnings.length > 0) {
    report += 'Warnings:\n';
    result.warnings.forEach(warning => report += `  ⚠️ ${warning}\n`);
    report += '\n';
  }
  
  report += '=== End Report ===\n';
  
  return report;
}

/**
 * Quick validation for development/debugging
 */
export function quickValidate(formData: Record<string, unknown>): boolean {
  try {
    const result = validateRegistrationDataFlow(formData, {
      strictMode: false,
      includeWarnings: false,
      validateTimestamps: false,
      validateForeignKeys: false,
    });
    return result.isValid;
  } catch (error) {
    console.error('Quick validation failed:', error);
    return false;
  }
}
