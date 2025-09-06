## Registration Fresh Start Checklist

Please ensure the following items are completed before merging:

### Code Quality & Consistency
- [ ] Ran **types regen** (`npm run gen:types`) and committed diff
- [ ] **DAL contract** tests pass (`npm test -- contracts/registration.contract.test.ts`)
- [ ] **snake_case guard** passes (`npm test -- contracts/casing.guard.test.ts`)
- [ ] **Enum sync** tests pass (`npm test -- contracts/enum-sync.test.ts`)
- [ ] No direct DB imports outside DAL (ESLint passes)
- [ ] TypeScript compilation passes (`npm run typecheck`)

### Data Shape Compliance
- [ ] All new DTOs use **snake_case** field names
- [ ] Timestamps use **timestamptz** format and UI displays ISO strings
- [ ] All UI data flows through **DAL/dbAdapter** (no direct DB access)
- [ ] **Postgres enums** mirrored as TypeScript unions where applicable

### Naming & Repository Compliance
- [ ] If spec/example names differ from repo, **used actual repository names**
- [ ] Function signatures match existing codebase conventions
- [ ] No breaking changes to existing public APIs or routes

### Testing & Validation
- [ ] All existing tests continue to pass
- [ ] Added appropriate contract tests for new functionality
- [ ] Manual testing confirms no behavior changes for end users

## Conventions Reference

This PR follows the **Registration Fresh Start** conventions:

- **snake_case** for DB/DTOs/DAL/JSON field names
- **timestamptz** timestamps; UI uses ISO strings  
- **Postgres enums** mirrored as TS unions
- **All UI data** flows through DAL/dbAdapter
- **No direct DB imports** outside the DAL layer

For detailed guidelines, see: [Copilot Instructions](/.github/copilot-instructions.md)

---

**Note:** This checklist ensures data shape consistency and prevents drift in the Registration flow architecture.