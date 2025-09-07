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
      errors.push('Canonical conversion failed');
    }
  } catch (error) {
    errors.push(`Canonical conversion error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Layer 3: DTO Validation
  try {
    validateCanonicalDTOs(formData);
    layerResults.dtoValidation = true;
  } catch (error) {
    errors.push(`DTO validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

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
 * Validate canonical DTOs
 */
function validateCanonicalDTOs(formData: Record<string, unknown>): void {
  try {
    // Test household DTO
    const household = formData.household as Record<string, unknown>;
    CanonicalDtos.HouseholdWriteDto.parse({
      household_id: household.household_id as string | undefined,
      name: household.name as string | undefined,
      address_line1: household.address_line1 as string | undefined,
      address_line2: household.address_line2 as string | undefined,
      city: household.city as string | undefined,
      state: household.state as string | undefined,
      zip: household.zip as string | undefined,
      preferred_scripture_translation: household.preferredScriptureTranslation as string | undefined,
      primary_email: household.primary_email as string | undefined,
      primary_phone: household.primary_phone as string | undefined,
      photo_url: household.photo_url as string | undefined,
    });

    // Test guardian DTOs
    const guardians = formData.guardians as Array<Record<string, unknown>>;
    for (const guardian of guardians) {
      CanonicalDtos.GuardianWriteDto.parse({
        guardian_id: guardian.guardian_id as string | undefined,
        household_id: guardian.household_id as string | undefined,
        first_name: guardian.first_name as string | undefined,
        last_name: guardian.last_name as string | undefined,
        mobile_phone: guardian.mobile_phone as string | undefined,
        email: guardian.email as string | undefined,
        relationship: guardian.relationship as string | undefined,
        is_primary: guardian.is_primary as boolean | undefined,
      });
    }

    // Test emergency contact DTO
    const emergencyContact = formData.emergencyContact as Record<string, unknown>;
    CanonicalDtos.EmergencyContactWriteDto.parse({
      contact_id: emergencyContact.contact_id as string | undefined,
      household_id: emergencyContact.household_id as string | undefined,
      first_name: emergencyContact.first_name as string | undefined,
      last_name: emergencyContact.last_name as string | undefined,
      mobile_phone: emergencyContact.mobile_phone as string | undefined,
      relationship: emergencyContact.relationship as string | undefined,
    });

    // Test child DTOs
    const children = formData.children as Array<Record<string, unknown>>;
    for (const child of children) {
      CanonicalDtos.ChildWriteDto.parse({
        child_id: child.child_id as string | undefined,
        household_id: child.household_id as string | undefined,
        first_name: child.first_name as string | undefined,
        last_name: child.last_name as string | undefined,
        dob: child.dob as string | undefined,
        grade: child.grade as string | undefined,
        child_mobile: child.child_mobile as string | undefined,
        allergies: child.allergies as string | undefined,
        medical_notes: child.medical_notes as string | undefined,
        special_needs: child.special_needs as boolean | undefined,
        special_needs_notes: child.special_needs_notes as string | undefined,
        is_active: child.is_active !== undefined ? Boolean(child.is_active) : true,
        photo_url: child.photo_url as string | undefined,
      });
    }
  } catch (error) {
    throw new Error(`DTO validation failed: ${error instanceof Error ? error.message : String(error)}`);
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
