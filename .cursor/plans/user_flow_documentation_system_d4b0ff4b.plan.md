---
name: User Flow Documentation System
overview: Create a hierarchical markdown documentation system that documents all key user flows and technical flows in the gatherKids application, organized by user role with progressive levels of detail (high-level journeys → medium-detail flows → detailed technical flows).
todos:
  - id: create-structure
    content: Create directory structure in docs/flows/ with admin/, ministry-leader/, guardian/, and shared/ subdirectories
    status: pending
  - id: extract-admin-flows
    content: Extract and document all admin user journeys (authentication, dashboard, user management, ministry management, etc.)
    status: pending
  - id: extract-ministry-leader-flows
    content: Extract and document all ministry leader journeys (email-based login, filtered views, check-in, Bible Bee tracking)
    status: pending
  - id: extract-guardian-flows
    content: Extract and document all guardian/parent journeys (registration, onboarding, household portal, Bible Bee student tracking)
    status: pending
  - id: create-high-level-diagrams
    content: Create high-level Mermaid flowchart diagrams for each role showing major user journeys
    status: pending
  - id: create-medium-detail-diagrams
    content: Create medium-detail Mermaid diagrams (sequence/flowchart) showing decision points and branches for each flow
    status: pending
  - id: create-technical-diagrams
    content: Create detailed technical Mermaid sequence diagrams showing API calls, database operations, and error handling
    status: pending
  - id: cross-reference-files
    content: Add hyperlinks between files (high-level → medium-detail → technical) and validate all links work
    status: pending
isProject: false
---

# User Flow Documentation System Plan

## File Structure

Create a hierarchical documentation structure in `docs/flows/`:

```
docs/flows/
├── README.md                    # Main entry point - organized by user role
├── admin/
│   ├── README.md               # Admin flows overview
│   ├── authentication.md       # Admin login & session management
│   ├── dashboard.md            # Admin dashboard overview
│   ├── user-management.md      # Managing users and roles
│   ├── ministry-management.md  # Creating/editing ministries
│   ├── registration-review.md  # Reviewing family registrations
│   ├── check-in-management.md  # Managing check-ins
│   ├── bible-bee-admin.md      # Bible Bee administration
│   ├── incident-management.md  # Incident reporting and review
│   └── branding.md             # Branding customization
├── ministry-leader/
│   ├── README.md               # Ministry leader flows overview
│   ├── authentication.md       # Ministry leader login (email-based)
│   ├── rosters.md              # Viewing ministry rosters
│   ├── registrations.md        # Viewing filtered registrations
│   ├── check-in.md             # Checking children in/out
│   ├── bible-bee-tracking.md   # Tracking Bible Bee progress
│   └── incident-reporting.md   # Reporting incidents
├── guardian/
│   ├── README.md               # Guardian/parent flows overview
│   ├── registration.md         # Family registration journey
│   ├── onboarding.md           # Post-registration onboarding
│   ├── household-portal.md     # Household dashboard
│   ├── profile-management.md   # Updating household/child profiles
│   ├── bible-bee-student.md    # Student Bible Bee tracking
│   └── check-in-guardian.md    # Guardian check-in/out
└── shared/
    ├── authentication-flows.md # Common auth patterns
    ├── registration-flow.md     # Detailed registration technical flow
    └── check-in-technical.md    # Detailed check-in technical flow
```

## Content Structure for Each File

### High-Level Files (Role READMEs)

- **Purpose**: Overview of all flows for that role
- **Content**:
  - Role description and permissions
  - List of all user journeys with brief descriptions
  - Links to medium-detail flow files
  - High-level Mermaid diagram showing all journeys

### Medium-Detail Files (Feature-specific)

- **Purpose**: Show decision points, branches, and key steps
- **Content**:
  - Overview of the flow
  - Decision points and branches
  - Key user actions
  - Links to detailed technical flows
  - Medium-detail Mermaid sequence/flowchart diagrams

### Detailed Technical Files

- **Purpose**: Technical implementation details
- **Content**:
  - API calls and database operations
  - Error handling paths
  - State management
  - Detailed Mermaid sequence diagrams with technical components

## Extraction Strategy

### 1. Identify Flows from Codebase

**Authentication & Authorization:**

- Extract from: `src/contexts/auth-context.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/page.tsx`
- Key flows: Login (demo/password/magic link), session initialization, role assignment, ministry access check

**Registration:**

- Extract from: `src/app/register/page.tsx`, `src/lib/dal.ts` (registerHouseholdCanonical)
- Key flows: Email lookup, prefill detection, form submission, Bible Bee enrollment, user creation

**Check-in/Check-out:**

- Extract from: `src/app/dashboard/check-in/page.tsx`, `src/lib/dal.ts` (recordCheckIn, recordCheckOut)
- Key flows: Event selection, child check-in, PIN verification, check-out

**Bible Bee:**

- Extract from: `src/lib/bibleBee.ts`, `src/hooks/data/bibleBee.ts`, `src/app/household/bible-bee/page.tsx`
- Key flows: Enrollment, scripture assignment, progress tracking, essay submission

**Navigation & Access Control:**

- Extract from: `src/lib/navigation.tsx`, `src/components/auth/protected-route.tsx`
- Key flows: Role-based menu filtering, route protection, ministry-based access

### 2. Create Mermaid Diagrams

**High-Level Journey Diagrams:**

- Use flowchart diagrams showing major steps
- Focus on user actions and outcomes
- Minimal technical detail

**Medium-Detail Flow Diagrams:**

- Use sequence diagrams for multi-actor flows
- Use flowchart diagrams for decision-heavy flows
- Show decision points and branches
- Include key system checks

**Detailed Technical Diagrams:**

- Use sequence diagrams with API calls, database operations
- Show error paths and recovery
- Include state management and data flow

## Implementation Steps

### Step 1: Create File Structure

- Create directory structure in `docs/flows/`
- Create placeholder README files for each role

### Step 2: Extract High-Level Journeys

- Review navigation files and role routes
- Document primary user journeys for each role
- Create high-level Mermaid flowcharts

### Step 3: Extract Medium-Detail Flows

- For each high-level journey, identify decision points
- Map branches and alternative paths
- Create medium-detail Mermaid diagrams
- Link from high-level to medium-detail files

### Step 4: Extract Technical Details

- Identify API endpoints, database operations, state management
- Document error handling and edge cases
- Create detailed technical Mermaid sequence diagrams
- Link from medium-detail to technical files

### Step 5: Cross-Reference and Validate

- Ensure all links work
- Verify diagrams match codebase
- Add navigation aids (back links, breadcrumbs)

## Key Flows to Document

### Admin Flows

1. Authentication → Dashboard → User Management
2. Ministry Creation → Configuration → Leader Assignment
3. Registration Review → Approval → Household Access
4. Bible Bee Year Setup → Scripture Import → Division Configuration
5. Incident Review → Response → Resolution

### Ministry Leader Flows

1. Email Login → Ministry Access Check → Filtered Dashboard
2. View Rosters → Filter by Ministry → Check-in Children
3. View Registrations → Filter by Ministry → Review Households
4. Bible Bee Progress → View Student Assignments → Track Completion
5. Incident Reporting → Create Report → Submit

### Guardian Flows

1. Registration → Email Verification → Form Completion → Onboarding
2. Household Portal → View Children → Update Profiles
3. Bible Bee → View Assignments → Mark Scriptures Complete → Submit Essays
4. Check-in → Select Event → Verify Identity → Check-out with PIN

## Mermaid Diagram Guidelines

- Use consistent naming conventions (camelCase for nodes)
- Include role indicators in actor names (Admin, MinistryLeader, Guardian, System)
- Show decision points clearly with diamond shapes
- Use notes for important context
- Keep high-level diagrams simple (5-10 nodes max)
- Medium-detail can be more complex (10-20 nodes)
- Technical diagrams can be very detailed (20+ nodes)

## Files to Reference During Extraction

**Authentication:**

- `src/contexts/auth-context.tsx` - Auth state management
- `src/app/login/page.tsx` - Login UI and logic
- `src/app/auth/callback/page.tsx` - Magic link callback
- `src/components/auth/protected-route.tsx` - Route protection
- `src/lib/auth-utils.ts` - Role routing

**Registration:**

- `src/app/register/page.tsx` - Registration form
- `src/lib/dal.ts` - Registration DAL functions
- `src/lib/database/canonical-dal.ts` - Canonical registration
- `src/app/onboarding/page.tsx` - Post-registration onboarding

**Check-in:**

- `src/app/dashboard/check-in/page.tsx` - Check-in UI
- `src/lib/dal.ts` - recordCheckIn, recordCheckOut
- `src/components/gatherKids/checkout-dialog.tsx` - Checkout verification

**Bible Bee:**

- `src/lib/bibleBee.ts` - Bible Bee enrollment logic
- `src/hooks/data/bibleBee.ts` - React Query hooks
- `src/app/household/bible-bee/page.tsx` - Student view
- `src/app/dashboard/bible-bee/page.tsx` - Admin view

**Navigation:**

- `src/lib/navigation.tsx` - Menu items and filtering
- `src/app/dashboard/layout.tsx` - Dashboard layout with navigation