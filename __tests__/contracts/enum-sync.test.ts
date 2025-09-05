import * as CanonicalDtos from '@/lib/database/canonical-dtos';

describe('Enum Sync Tests', () => {
  describe('Registration Status Values', () => {
    test('registration status values are aligned between TypeScript and expected DB values', () => {
      // Define the expected status values that should be in the database
      const expectedDbStatuses = ['active', 'pending', 'inactive'];
      
      // Extract the enum values from the canonical DTO
      const registrationStatusSchema = CanonicalDtos.RegistrationReadDto.shape.status;
      const tsStatusValues = registrationStatusSchema._def.values;
      
      // Ensure they match
      expect(tsStatusValues.sort()).toEqual(expectedDbStatuses.sort());
    });

    test('registration status enum is consistent across read and write DTOs', () => {
      const readStatusSchema = CanonicalDtos.RegistrationReadDto.shape.status;
      const writeStatusSchema = CanonicalDtos.RegistrationWriteDto.shape.status;
      
      // For ZodDefault schemas, we need to unwrap to get to the base enum
      const writeBaseSchema = writeStatusSchema._def.innerType || writeStatusSchema;
      
      const readValues = readStatusSchema._def.values;
      const writeValues = writeBaseSchema._def.values;
      
      expect(readValues.sort()).toEqual(writeValues.sort());
    });
  });

  describe('Consent Type Values', () => {
    test('consent type values are aligned', () => {
      const expectedConsentTypes = ['liability', 'photo_release', 'custom'];
      
      const consentTypeSchema = CanonicalDtos.ConsentDto.shape.type;
      const tsConsentTypes = consentTypeSchema._def.values;
      
      expect(tsConsentTypes.sort()).toEqual(expectedConsentTypes.sort());
    });

    test('consent types use snake_case consistently', () => {
      const consentTypeSchema = CanonicalDtos.ConsentDto.shape.type;
      const tsConsentTypes = consentTypeSchema._def.values;
      
      // Check that all consent types are snake_case (no camelCase like 'photoRelease')
      tsConsentTypes.forEach((type: string) => {
        expect(type).not.toMatch(/[A-Z]/); // No uppercase letters (camelCase)
        if (type.includes('_') || type.length > 1) {
          expect(type).toMatch(/^[a-z][a-z_]*[a-z]$|^[a-z]$/); // Valid snake_case pattern
        }
      });
      
      // Specifically check that we use 'photo_release', not 'photoRelease'
      expect(tsConsentTypes).toContain('photo_release');
      expect(tsConsentTypes).not.toContain('photoRelease');
    });
  });

  describe('Submitted Via Values', () => {
    test('submitted_via values are aligned', () => {
      const expectedSubmittedViaValues = ['web', 'import'];
      
      const submittedViaSchema = CanonicalDtos.RegistrationReadDto.shape.submitted_via;
      const tsSubmittedViaValues = submittedViaSchema._def.values;
      
      expect(tsSubmittedViaValues.sort()).toEqual(expectedSubmittedViaValues.sort());
    });

    test('submitted_via enum is consistent across read and write DTOs', () => {
      const readSchema = CanonicalDtos.RegistrationReadDto.shape.submitted_via;
      const writeSchema = CanonicalDtos.RegistrationWriteDto.shape.submitted_via;
      
      // For ZodDefault schemas, we need to unwrap to get to the base enum
      const writeBaseSchema = writeSchema._def.innerType || writeSchema;
      
      const readValues = readSchema._def.values;
      const writeValues = writeBaseSchema._def.values;
      
      expect(readValues.sort()).toEqual(writeValues.sort());
    });
  });

  describe('Boolean Field Defaults', () => {
    test('boolean fields have appropriate defaults in write DTOs', () => {
      // Test that boolean fields that should default to true/false are set correctly
      
      // Child is_active should default to true
      const childWriteDto = CanonicalDtos.ChildWriteDto.shape;
      const isActiveDefault = childWriteDto.is_active._def.defaultValue();
      expect(isActiveDefault).toBe(true);
      
      // Guardian is_primary should default to false
      const guardianWriteDto = CanonicalDtos.GuardianWriteDto.shape;
      const isPrimaryDefault = guardianWriteDto.is_primary._def.defaultValue();
      expect(isPrimaryDefault).toBe(false);
      
      // Registration status should default to 'active'
      const registrationWriteDto = CanonicalDtos.RegistrationWriteDto.shape;
      const statusDefault = registrationWriteDto.status._def.defaultValue();
      expect(statusDefault).toBe('active');
      
      // Registration pre_registered_sunday_school should default to true
      const preRegDefault = registrationWriteDto.pre_registered_sunday_school._def.defaultValue();
      expect(preRegDefault).toBe(true);
      
      // Registration submitted_via should default to 'web'
      const submittedViaDefault = registrationWriteDto.submitted_via._def.defaultValue();
      expect(submittedViaDefault).toBe('web');
    });
  });

  describe('Required Field Validation', () => {
    test('all required fields are properly marked in DTOs', () => {
      // Test a few critical required fields to ensure they're not optional
      
      // Household address_line1 should be required in write DTO
      const householdWriteDto = CanonicalDtos.HouseholdWriteDto.shape;
      expect(householdWriteDto.address_line1.isOptional()).toBe(false);
      
      // Guardian first_name and last_name should be required
      const guardianWriteDto = CanonicalDtos.GuardianWriteDto.shape;
      expect(guardianWriteDto.first_name.isOptional()).toBe(false);
      expect(guardianWriteDto.last_name.isOptional()).toBe(false);
      expect(guardianWriteDto.mobile_phone.isOptional()).toBe(false);
      
      // Child first_name and last_name should be required
      const childWriteDto = CanonicalDtos.ChildWriteDto.shape;
      expect(childWriteDto.first_name.isOptional()).toBe(false);
      expect(childWriteDto.last_name.isOptional()).toBe(false);
      
      // Emergency contact required fields
      const emergencyContactWriteDto = CanonicalDtos.EmergencyContactWriteDto.shape;
      expect(emergencyContactWriteDto.first_name.isOptional()).toBe(false);
      expect(emergencyContactWriteDto.last_name.isOptional()).toBe(false);
      expect(emergencyContactWriteDto.mobile_phone.isOptional()).toBe(false);
    });
  });
});