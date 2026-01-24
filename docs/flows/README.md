# User Flow Documentation System

This directory contains comprehensive documentation of all user flows in the gatherKids application, organized by user role with progressive levels of detail.

## Structure

The documentation is organized hierarchically:

- **High-Level (Role READMEs)**: Overview of all flows for a role with links to detailed flows
- **Medium-Detail (Feature-specific)**: Decision points, branches, and key steps for specific features
- **Detailed Technical**: API calls, database operations, error handling, and state management

## User Roles

### [Admin](./admin/README.md)
Full system access including user management, ministry configuration, registration review, and system administration.

**Key Flows:**
- [Authentication](./admin/authentication.md)
- [Dashboard](./admin/dashboard.md)
- [User Management](./admin/user-management.md)
- [Ministry Management](./admin/ministry-management.md)
- [Registration Review](./admin/registration-review.md)
- [Check-in Management](./admin/check-in-management.md)
- [Bible Bee Administration](./admin/bible-bee-admin.md)
- [Incident Management](./admin/incident-management.md)
- [Branding](./admin/branding.md)

### [Ministry Leader](./ministry-leader/README.md)
Email-based access to ministry-specific features including rosters, registrations, check-in, and Bible Bee tracking.

**Key Flows:**
- [Authentication](./ministry-leader/authentication.md)
- [Rosters](./ministry-leader/rosters.md)
- [Registrations](./ministry-leader/registrations.md)
- [Check-in](./ministry-leader/check-in.md)
- [Bible Bee Tracking](./ministry-leader/bible-bee-tracking.md)
- [Incident Reporting](./ministry-leader/incident-reporting.md)

### [Guardian](./guardian/README.md)
Parent/guardian access for family registration, household management, Bible Bee student tracking, and check-in/out.

**Key Flows:**
- [Registration](./guardian/registration.md)
- [Onboarding](./guardian/onboarding.md)
- [Household Portal](./guardian/household-portal.md)
- [Profile Management](./guardian/profile-management.md)
- [Bible Bee Student](./guardian/bible-bee-student.md)
- [Check-in (Guardian)](./guardian/check-in-guardian.md)

### [Shared Flows](./shared/)
Technical flows shared across multiple roles:

- [Authentication Flows](./shared/authentication-flows.md) - Common auth patterns
- [New User Account Creation](./shared/new-user-account-creation.md) - Account creation flow for new users
- [Registration Flow](./shared/registration-flow.md) - Detailed registration technical flow
- [Check-in Technical](./shared/check-in-technical.md) - Detailed check-in technical flow

## Navigation

Each documentation file includes:
- Overview of the flow
- Decision points and branches
- Mermaid diagrams (flowchart or sequence)
- Links to related flows
- Technical implementation details (in detailed files)

## Diagram Types

- **High-Level Flowcharts**: Simple flowcharts showing major steps (5-10 nodes)
- **Medium-Detail Diagrams**: Sequence/flowchart diagrams showing decision points (10-20 nodes)
- **Technical Sequence Diagrams**: Detailed sequences with API calls and database operations (20+ nodes)

## How to Use This Documentation

1. Start with the role-specific README to understand all available flows
2. Navigate to feature-specific files for medium-detail flows
3. Reference shared technical flows for implementation details
4. Use Mermaid diagrams to visualize flow paths and decision points
