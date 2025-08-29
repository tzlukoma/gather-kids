# gatherKids - Features Documentation

## Overview

gatherKids is a comprehensive children's ministry management system designed to streamline registration, check-in/out processes, incident management, and administrative oversight for church ministries.

## Personas

### 1. **Administrator**

_Primary users responsible for system oversight, configuration, and reporting_

### 2. **Ministry Leader**

_Volunteers and staff who manage daily operations, check-ins, and incident reporting_

### 3. **Parent/Guardian**

_Families registering children and managing household information_

---

## Epic 1: Leader Profile Management

### Epic Description

Comprehensive leader management system with central profiles, multi-ministry memberships, and ministry-scoped RBAC authentication.

### User Stories

#### As an Administrator

- **US-1.1**: I want to create and manage leader profiles independently of user accounts so that I can maintain accurate leader information
- **US-1.2**: I want to search leader profiles by name or email so that I can quickly find specific leaders
- **US-1.3**: I want to assign leaders to multiple ministries with different roles (PRIMARY/VOLUNTEER) so that they can serve across programs
- **US-1.4**: I want to view all leader profiles in a directory interface so that I can manage the complete leadership roster
- **US-1.5**: I want to activate/deactivate leader profiles so that I can control their status in the system
- **US-1.6**: I want to migrate existing user-based leaders to the new profile system so that I can preserve historical data
- **US-1.7**: I want to create ministry-specific accounts for RBAC so that leaders can access ministry-scoped functions
- **US-1.8**: I want to track leader membership history across ministries so that I can maintain accurate records

#### As a Ministry Leader

- **US-1.9**: I want to view my profile information so that I can verify my contact details are current
- **US-1.10**: I want to see my ministry memberships and roles so that I know which programs I'm responsible for

---

## Epic 2: User Authentication & Authorization

### Epic Description

Secure access control system with role-based permissions for administrators and ministry leaders.

### User Stories

#### As an Administrator

- **US-2.1**: I want to log in with admin credentials so that I can access all system features
- **US-2.2**: I want to manage user accounts so that I can control who has access to the system
- **US-2.3**: I want to assign ministry roles to leaders so that they can only access relevant ministry data

#### As a Ministry Leader

- **US-2.4**: I want to log in with leader credentials so that I can access ministry-specific features
- **US-2.5**: I want to see only my assigned ministries so that I can focus on relevant children and activities

#### As a Parent/Guardian

- **US-2.6**: I want to access a public registration form so that I can register my family without needing system access

---

## Epic 3: Family Registration & Profile Management

### Epic Description

Comprehensive family registration system with household profiles, guardian information, and child details.

### User Stories

#### As a Parent/Guardian

- **US-3.1**: I want to register my household information so that my family can participate in ministry activities
- **US-3.2**: I want to add multiple children to my household so that all my children can be registered together
- **US-3.3**: I want to provide emergency contact information so that leaders can reach someone if needed
- **US-3.4**: I want to specify my children's allergies and medical needs so that leaders can ensure their safety
- **US-3.5**: I want to select ministries for my children so that they can participate in appropriate activities
- **US-3.6**: I want to provide consent for liability and photo release so that my children can fully participate
- **US-3.7**: I want to update my family information so that my records remain current

#### As an Administrator

- **US-3.8**: I want to view all registered households so that I can monitor registration completion
- **US-3.9**: I want to see registration statistics so that I can track ministry participation
- **US-3.10**: I want to filter registrations by ministry so that I can focus on specific programs

---

## Epic 4: Check-In & Check-Out Management

### Epic Description

Real-time attendance tracking system with secure guardian verification for child safety.

### User Stories

#### As a Ministry Leader

- **US-3.1**: I want to check in children for my ministry so that I can track who is present
- **US-3.2**: I want to see a real-time roster of checked-in children so that I know who is under my care
- **US-3.3**: I want to filter children by grade so that I can organize activities appropriately
- **US-3.4**: I want to search for specific children so that I can quickly find them in the system
- **US-3.5**: I want to check out children to verified guardians so that I can ensure safe pickup
- **US-3.6**: I want to verify guardian identity using phone number or PIN so that I can maintain security
- **US-3.7**: I want to see special needs and allergy information for checked-in children so that I can provide appropriate care

#### As an Administrator

- **US-3.8**: I want to view real-time check-in status across all ministries so that I can monitor overall attendance
- **US-3.9**: I want to see check-in/out history so that I can track patterns and verify compliance
- **US-3.10**: I want to export attendance data so that I can maintain records and generate reports

---

## Epic 5: Incident Management & Reporting

### Epic Description

Comprehensive incident logging system with severity tracking and administrative oversight.

### User Stories

#### As a Ministry Leader

- **US-4.1**: I want to log incidents that occur during ministry activities so that I can document important events
- **US-4.2**: I want to specify incident severity (low/medium/high) so that administrators can prioritize responses
- **US-4.3**: I want to provide detailed descriptions of incidents so that there is a complete record
- **US-4.4**: I want to see my incident history so that I can track patterns and follow up on previous reports
- **US-4.5**: I want to log incidents only for children in my assigned ministries so that I maintain appropriate access

#### As an Administrator

- **US-4.6**: I want to view all reported incidents so that I can monitor ministry safety
- **US-4.7**: I want to acknowledge incidents so that leaders know their reports have been received
- **US-4.8**: I want to filter incidents by severity so that I can prioritize urgent matters
- **US-4.9**: I want to see pending incidents that require acknowledgment so that I can maintain oversight
- **US-4.10**: I want to track incident patterns so that I can identify areas for improvement

---

## Epic 6: Ministry Configuration & Management

### Epic Description

Flexible ministry setup system with customizable enrollment types, age restrictions, and data requirements.

### User Stories

#### As an Administrator

- **US-5.1**: I want to create new ministries so that I can add new programs to the system
- **US-5.2**: I want to set age and grade restrictions for ministries so that children are appropriately placed
- **US-5.3**: I want to configure enrollment types (enrolled vs. interest-only) so that I can track different participation levels
- **US-5.4**: I want to add custom questions to ministry forms so that I can collect specific information
- **US-5.5**: I want to set ministry open/close dates so that I can control when registrations are available
- **US-5.6**: I want to assign leaders to ministries so that they can manage specific programs
- **US-5.7**: I want to activate/deactivate ministries so that I can control program availability

#### As a Ministry Leader

- **US-5.8**: I want to see my assigned ministries so that I know which programs I'm responsible for
- **US-5.9**: I want to view ministry rosters so that I can see enrolled children

---

## Epic 7: Reporting & Data Export

### Epic Description

Comprehensive reporting system for administrative oversight and compliance requirements.

### User Stories

#### As an Administrator

- **US-6.1**: I want to generate emergency snapshots so that I have current contact and allergy information
- **US-6.2**: I want to export attendance data by date range so that I can track participation over time
- **US-6.3**: I want to see registration completion percentages so that I can monitor ministry engagement
- **US-6.4**: I want to identify missing consents so that I can ensure compliance requirements are met
- **US-6.5**: I want to export data in CSV format so that I can use it in other systems
- **US-6.6**: I want to see choir eligibility warnings so that I can ensure age-appropriate participation

---

## Epic 8: Dashboard & Analytics

### Epic Description

Real-time dashboard providing key metrics and status overview for administrators and leaders.

### User Stories

#### As an Administrator

- **US-7.1**: I want to see current check-in counts so that I know how many children are on site
- **US-7.2**: I want to view pending incidents so that I can address urgent matters quickly
- **US-7.3**: I want to see registration statistics so that I can monitor ministry participation
- **US-7.4**: I want to access all administrative functions from a central location so that I can efficiently manage the system

#### As a Ministry Leader

- **US-7.5**: I want to see my ministry's current status so that I can manage my responsibilities
- **US-7.6**: I want to quickly access check-in/out functions so that I can efficiently manage attendance

---

## Epic 9: Mobile-First Responsive Design

### Epic Description

Optimized user experience across all devices with mobile-first design principles.

### User Stories

#### As a Ministry Leader

- **US-8.1**: I want to use the system on my mobile device so that I can manage check-ins from anywhere
- **US-8.2**: I want the interface to adapt to my screen size so that I can easily use all features
- **US-8.3**: I want touch-friendly controls so that I can efficiently operate the system on mobile

#### As a Parent/Guardian

- **US-8.4**: I want to complete registration on my mobile device so that I can register my family conveniently
- **US-8.5**: I want the registration form to be easy to use on small screens so that I can complete it without difficulty

---

## Epic 10: Data Management & Seeding

### Epic Description

Comprehensive data management system with sample data for demonstration and testing.

### User Stories

#### As an Administrator

- **US-9.1**: I want to populate the system with sample data so that I can demonstrate features to stakeholders
- **US-9.2**: I want to reset the system to a clean state so that I can start fresh when needed
- **US-9.3**: I want to manage household and child data so that I can maintain accurate records

---

## Epic 11: Feature Flags & Configuration

### Epic Description

Flexible feature management system allowing administrators to control feature availability.

### User Stories

#### As an Administrator

- **US-10.1**: I want to enable/disable demo features so that I can control what users see
- **US-10.2**: I want to configure system behavior so that I can customize the user experience
- **US-10.3**: I want to manage feature rollouts so that I can test new functionality safely

---

## Technical Implementation Details

### Technology Stack

- **Frontend**: Next.js 15 with React 18, TypeScript
- **UI Components**: Radix UI with custom Tailwind CSS styling
- **State Management**: React Context API with custom hooks
- **Database**: IndexedDB (Dexie.js) for client-side data persistence
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Custom context-based auth system
- **Real-time Updates**: Dexie React Hooks for live data queries

### Key Features Implemented

- ✅ Central leader profile management with multi-ministry support
- ✅ Leader Directory interface with search and profile creation
- ✅ Ministry-scoped RBAC with separate ministry accounts
- ✅ Leader profile migration from user-based system
- ✅ Real-time leader profile search and filtering
- ✅ Role-based access control (Admin/Leader)
- ✅ Family registration with multi-child support
- ✅ Real-time check-in/out with guardian verification
- ✅ Incident logging with severity tracking
- ✅ Ministry configuration and management
- ✅ Comprehensive reporting and data export
- ✅ Mobile-responsive design
- ✅ Sample data seeding system
- ✅ Feature flag management
- ✅ Real-time roster updates
- ✅ Guardian verification (phone/PIN)
- ✅ Allergy and medical information tracking
- ✅ Consent management (liability, photo release)
- ✅ Age and grade-based ministry eligibility
- ✅ Custom ministry questions and data collection

### Data Models

- **LeaderProfile**: Central non-user leader records with normalized contact data
- **MinistryLeaderMembership**: Many-to-many relationships with role types (PRIMARY/VOLUNTEER)
- **MinistryAccount**: One per ministry for RBAC authentication and scoped access
- **Household**: Family unit information
- **Guardian**: Parent/guardian details with contact info
- **Child**: Individual child records with medical/allergy info
- **Ministry**: Program configuration and settings
- **Registration**: Annual enrollment records
- **Attendance**: Check-in/out tracking
- **Incident**: Safety and behavior reporting
- **User**: System users with role assignments

This comprehensive feature set provides a complete solution for children's ministry management, addressing the needs of administrators, leaders, and families while maintaining security, compliance, and ease of use.
