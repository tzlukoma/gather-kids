/**
 * Migration script to convert existing leader data from users + leader_assignments 
 * to the new leader_profiles + ministry_leader_memberships schema.
 */

import { db } from '../../src/lib/db';
import type { User, LeaderAssignment, LeaderProfile, MinistryLeaderMembership, MinistryAccount } from '../../src/lib/types';
import { AuthRole } from '../../src/lib/auth-types';
import { v4 as uuidv4 } from 'uuid';

interface MigrationReport {
  profilesCreated: number;
  profilesUpdated: number;
  membershipsCreated: number;
  ministryAccountsCreated: number;
  duplicatesFound: string[];
  errors: string[];
}

// Normalize email to lowercase
function normalizeEmail(email?: string): string | undefined {
  return email ? email.toLowerCase().trim() : undefined;
}

// Normalize phone number (basic implementation)
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/\D/g, ''); // Remove all non-digits
}

// Create a deduplication key for leaders
function createDedupeKey(user: User): string {
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.mobile_phone);
  
  if (email) {
    return `email:${email}`;
  } else if (phone) {
    return `phone:${phone}`;
  } else {
    // Fallback to name if no email/phone
    return `name:${user.name.toLowerCase().replace(/\s+/g, '_')}`;
  }
}

export async function migrateLeaders(): Promise<MigrationReport> {
  const report: MigrationReport = {
    profilesCreated: 0,
    profilesUpdated: 0,
    membershipsCreated: 0,
    ministryAccountsCreated: 0,
    duplicatesFound: [],
    errors: []
  };

  try {
    console.log('Starting leader migration...');

    // 1. Get all existing ministry leaders
    const existingLeaders = await db.users.where('role').equals(AuthRole.MINISTRY_LEADER).toArray();
    console.log(`Found ${existingLeaders.length} existing ministry leaders`);

    // 2. Get all leader assignments
    const existingAssignments = await db.leader_assignments.toArray();
    console.log(`Found ${existingAssignments.length} existing assignments`);

    // 3. Deduplicate leaders by email/phone/name
    const leaderMap = new Map<string, { user: User, profiles: LeaderProfile[] }>();
    
    for (const user of existingLeaders) {
      const dedupeKey = createDedupeKey(user);
      
      if (leaderMap.has(dedupeKey)) {
        report.duplicatesFound.push(`Duplicate leader found: ${user.name} (${user.email})`);
      }
      
      // Convert user to leader profile
      const [firstName, ...lastNameParts] = user.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
      const profile: LeaderProfile = {
        leader_id: user.user_id, // Keep the same ID for easier migration
        first_name: firstName,
        last_name: lastName,
        email: normalizeEmail(user.email),
        phone: normalizePhone(user.mobile_phone),
        notes: undefined,
        is_active: user.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (leaderMap.has(dedupeKey)) {
        leaderMap.get(dedupeKey)!.profiles.push(profile);
      } else {
        leaderMap.set(dedupeKey, { user, profiles: [profile] });
      }
    }

    // 4. Insert leader profiles
    for (const [dedupeKey, { user, profiles }] of leaderMap) {
      try {
        if (profiles.length === 1) {
          await db.leader_profiles.put(profiles[0]);
          report.profilesCreated++;
          console.log(`Created profile for: ${profiles[0].first_name} ${profiles[0].last_name}`);
        } else {
          // Handle duplicates - for now, take the first active one or just the first
          const activeProfile = profiles.find(p => p.is_active) || profiles[0];
          await db.leader_profiles.put(activeProfile);
          report.profilesCreated++;
          console.log(`Created merged profile for: ${activeProfile.first_name} ${activeProfile.last_name} (${profiles.length} duplicates)`);
        }
      } catch (error) {
        report.errors.push(`Failed to create profile for ${user.name}: ${error}`);
      }
    }

    // 5. Convert assignments to memberships
    for (const assignment of existingAssignments) {
      try {
        // Check if the leader profile exists
        const leaderExists = await db.leader_profiles.get(assignment.leader_id);
        if (!leaderExists) {
          report.errors.push(`Leader profile not found for assignment: ${assignment.leader_id}`);
          continue;
        }

        const membership: MinistryLeaderMembership = {
          membership_id: uuidv4(),
          ministry_id: assignment.ministry_id,
          leader_id: assignment.leader_id,
          role_type: assignment.role.toUpperCase() as 'PRIMARY' | 'VOLUNTEER',
          is_active: true, // Assume active if it was an assignment
          notes: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await db.ministry_leader_memberships.put(membership);
        report.membershipsCreated++;
        console.log(`Created membership: ${assignment.leader_id} -> ${assignment.ministry_id} (${membership.role_type})`);

      } catch (error) {
        report.errors.push(`Failed to create membership for assignment ${assignment.assignment_id}: ${error}`);
      }
    }

    // 6. Create ministry accounts for all active ministries
    const ministries = (await db.ministries.toArray()).filter(m => {
      const val: any = (m as any).is_active;
      return val === true || val === 1 || String(val) === '1';
    });
    
    for (const ministry of ministries) {
      try {
        // Skip if ministry account already exists
        const existingAccount = await db.ministry_accounts.get(ministry.ministry_id);
        if (existingAccount) {
          continue;
        }

        const ministryAccount: MinistryAccount = {
          ministry_id: ministry.ministry_id,
          email: `${ministry.code.toLowerCase()}@church.example`, // Placeholder email
          display_name: `${ministry.name} Ministry`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await db.ministry_accounts.put(ministryAccount);
        report.ministryAccountsCreated++;
        console.log(`Created ministry account for: ${ministry.name}`);

      } catch (error) {
        report.errors.push(`Failed to create ministry account for ${ministry.name}: ${error}`);
      }
    }

    console.log('Migration completed!');
    return report;

  } catch (error) {
    report.errors.push(`Migration failed: ${error}`);
    console.error('Migration failed:', error);
    return report;
  }
}

export function printMigrationReport(report: MigrationReport) {
  console.log('\n=== MIGRATION REPORT ===');
  console.log(`Profiles Created: ${report.profilesCreated}`);
  console.log(`Profiles Updated: ${report.profilesUpdated}`);
  console.log(`Memberships Created: ${report.membershipsCreated}`);
  console.log(`Ministry Accounts Created: ${report.ministryAccountsCreated}`);
  
  if (report.duplicatesFound.length > 0) {
    console.log('\n--- DUPLICATES FOUND ---');
    report.duplicatesFound.forEach(dup => console.log(`⚠️  ${dup}`));
  }
  
  if (report.errors.length > 0) {
    console.log('\n--- ERRORS ---');
    report.errors.forEach(err => console.log(`❌ ${err}`));
  }
  
  console.log('========================\n');
}

// Allow running as a standalone script
if (typeof window === 'undefined' && require.main === module) {
  (async () => {
    try {
      const report = await migrateLeaders();
      printMigrationReport(report);
    } catch (error) {
      console.error('Failed to run migration:', error);
      process.exit(1);
    }
  })();
}