import { readFileSync } from 'node:fs';
import path from 'node:path';

const script = readFileSync(
  path.join(process.cwd(), 'scripts/db/check_fks.sh'),
  'utf8'
);

describe('check_fks leader_assignments parents', () => {
  it('joins leader_id to leader_profiles, not users', () => {
    expect(script).toContain(
      'leader_assignments leader_id leader_profiles leader_id'
    );
    expect(script).not.toContain(
      'leader_assignments leader_id users user_id'
    );
  });

  it('still checks ministry_id against ministries', () => {
    expect(script).toContain(
      'leader_assignments ministry_id ministries ministry_id'
    );
  });
});
