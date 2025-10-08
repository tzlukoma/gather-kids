# Release Notes - gatherKids

## v1.5.0 - Ministry Leadership & Reporting Enhancements

### 🆕 New Features

#### Automatic Ministry Leader Role Assignment

- **Email-based role assignment** - Users with email addresses assigned to ministries automatically receive `MINISTRY_LEADER` role
- **Ministry group support** - Users with emails assigned to ministry groups get access to all ministries in the group
- **Role preservation** - Existing higher-priority roles (like `ADMIN`) are preserved when ministry access is detected
- **Automatic filtering** - Ministry leaders see only children from their assigned ministries in rosters and registrations
- **Demo user support** - Added `cathedralchoirs@example.com` demo user to test ministry group functionality

#### Ministry Enrollment Report System

- **On-demand reporting** - New GitHub workflow for generating ministry enrollment reports
- **Flexible ministry selection** - Specify ministry codes (e.g., `choir-joy-bells,choir-keita`) or include all ministries
- **HTML email reports** - Professional email reports with children grouped by ministry
- **Unique child counting** - Prevents double-counting children enrolled in multiple ministries
- **Environment support** - Works with both PROD and UAT environments
- **Dry run mode** - Test functionality without sending actual emails

### 🔧 Technical Improvements

#### Authentication & Role Management

- **Enhanced AuthContext** - Improved role assignment logic with ministry access detection
- **Consistent initialization** - Role assignment works across all authentication paths (login, session recovery, demo mode)
- **Ministry ID population** - `assignedMinistryIds` automatically populated for users with ministry access

#### User Interface Improvements

- **Bible Bee cycle selection** - Registration cycle dropdown now shows meaningful names (e.g., "Fall 2026") instead of cryptic IDs
- **Ministry dropdown filtering** - Roster page ministry filter shows all assigned ministries for ministry leaders
- **Debug logging** - Enhanced logging for ministry access and role assignment troubleshooting

#### Database & Query Optimizations

- **Supabase query fixes** - Resolved relationship ambiguity and nested field ordering issues
- **Data consistency** - Ministry enrollment reports use same query structure as daily digest
- **Error handling** - Improved error messages and debugging for database operations

### 🐛 Bug Fixes

- **Ministry group access** - Fixed issue where ministry group users only saw one ministry instead of all group ministries
- **Role assignment consistency** - Ensured ministry leader role assignment works in all authentication scenarios
- **Dropdown display** - Fixed Bible Bee cycle dropdown to show user-friendly names
- **Email sender branding** - Updated email sender name to "CI Nation Ministry Report"

### 📊 Infrastructure

- **GitHub workflow** - New `ministry-enrollment-report.yml` workflow for on-demand reports
- **Environment variables** - Consistent environment variable structure matching daily digest workflow
- **Script organization** - New `ministryEnrollmentReport.js` script with comprehensive error handling

---

## v1.4.0 - Bible Bee Household Features & Infrastructure Improvements

### 🆕 New Features

#### Bible Bee Household Guardian Experience

- **Complete household Bible Bee view** - Parents can view Bible Bee progress for all enrolled children
- **Date-gated access** - Content only shown after program's official open date
- **Individual child progress tracking** - Detailed progress pages showing scripture completion and essay status
- **Essay submission interface** - Parents can mark essays as submitted directly from household interface
- **Conditional navigation** - Bible Bee navigation only appears for households with enrolled children

#### Bible Bee Admin Management Features

- **Enhanced Bible Bee administration** - Complete cycle-based management system for Bible Bee programs
- **Essay prompt management** - Create and manage essay assignments for different divisions
- **Scripture progress tracking** - Monitor individual student progress with detailed metrics
- **Division management** - Organize participants by age groups with custom requirements
- **Student assignment interface** - Assign scriptures and essays to individual students
- **Progress analytics** - Comprehensive reporting on program participation and completion rates

#### Generic Avatar Storage System

- **Universal avatar support** - New system supports children, guardians, leaders, and users
- **Immediate photo updates** - Photos update instantly across all views without page refresh
- **Square cropping functionality** - Built-in photo cropping with camera and upload support
- **Flexible storage backend** - Base64 in demo mode, Supabase Storage in production

#### React Query Data Management

- **Modern data fetching** - Migrated to React Query for better state management
- **Optimistic updates** - Immediate UI feedback for check-in/check-out operations
- **Automatic cache invalidation** - Data stays fresh across all views and components

### 🔧 Technical Improvements

#### Authentication & Security

- **Magic link authentication fixes** - Resolved PKCE flow errors and cross-tab compatibility issues
- **Simplified PKCE storage** - Replaced complex monitoring systems with clean NextJSStorage adapter
- **Enhanced error handling** - Clear, actionable error messages for authentication issues
- **Consistent redirect behavior** - All auth flows now redirect to `/register` consistently

#### Bible Bee System Migration

- **Complete cycle migration** - Migrated from BibleBeeYear to BibleBeeCycle system
- **Enhanced data consistency** - All Bible Bee operations use canonical cycle-based approach
- **Essay system integration** - Full essay assignment and submission tracking

#### Infrastructure & Monitoring

- **Sentry error tracking** - Comprehensive error monitoring and performance tracking in production
- **User session replay** - Session replay functionality for debugging user issues
- **Production-only monitoring** - Sentry only runs in production environments

### 🎯 User Experience Improvements

#### Household Guardian Interface

- **Intuitive Bible Bee navigation** - Clear progress overview with clickable child cards
- **Consistent design language** - Progress cards match overall application design system
- **Loading states** - Proper loading indicators and skeleton screens

#### Photo Management

- **Streamlined photo upload** - Simple camera and file upload interface
- **Real-time updates** - Photos appear immediately after upload across all views
- **Consistent avatar display** - Same avatar shown consistently across all views

#### Authentication Experience

- **Improved magic link flow** - More reliable authentication with better error messages
- **Cross-browser compatibility** - Magic links work consistently across different browsers
- **Clear error guidance** - Helpful messages explaining common authentication issues

### 🛡️ Security & Reliability

#### Authentication Security

- **PKCE flow implementation** - Secure authentication using Proof Key for Code Exchange
- **Session persistence** - Reliable session management across browser tabs
- **Storage security** - Secure handling of authentication tokens and verifiers

#### Data Protection

- **Avatar access control** - Row-level security policies for avatar data
- **Household data isolation** - Users only see data for their own household
- **Secure file uploads** - Proper validation and processing of uploaded images

---

## v1.3.0 - Admin User Management

### 🆕 New Features

#### Admin User Management System

- **User overview dashboard** - Admins can view all registered users with their roles, email confirmation status, and account details
- **Role promotion interface** - Admins can promote users to ADMIN role directly from the web interface
- **User status monitoring** - Track email confirmation status, last sign-in dates, and account creation dates
- **Secure user management** - Server-side API routes protect sensitive operations using Supabase service role key
- **Real-time user updates** - User list updates immediately after role changes without page refresh

### 🔧 Technical Improvements

#### Secure API Endpoints

- **New `/api/users` route** - Handles user fetching and role updates securely
- **Enhanced authentication** - Proper server-side authentication using Supabase Admin API
- **Role-based navigation** - New "Users" menu item visible only to ADMIN users
- **Toast notifications** - User-friendly feedback for successful operations and error handling
- **Environment variable support** - Production-ready configuration with `PROD_SUPABASE_URL` and `PROD_SUPABASE_SERVICE_ROLE_KEY`

#### Bible Bee System Architecture

- **Cycle-based data model** - Migrated from year-based to cycle-based system for better flexibility
- **Enhanced DAL functions** - Updated data access layer with cycle-based operations
- **Improved data consistency** - Better handling of enrollment data and ministry relationships
- **Optimized queries** - More efficient database queries for student and progress data

### 🎯 User Experience Improvements

- **Intuitive user interface** - Clean table layout with badges for role and email confirmation status
- **One-click role promotion** - Simple button interface for promoting users to ADMIN
- **Comprehensive user information** - Display user names, emails, roles, confirmation status, and timestamps
- **Responsive design** - User management interface works seamlessly on all device sizes
- **Error handling** - Clear error messages and loading states for better user experience

### 🛡️ Security Features

- **Admin-only access** - User management features are restricted to ADMIN role users
- **Server-side validation** - All user operations are validated and executed server-side
- **Secure key management** - Service role keys are never exposed to client-side code
- **Audit trail** - User role changes are logged and tracked through Supabase

---

## v1.2.0 - Ministry Groups & Enhanced Communication

### 🆕 New Features

#### Ministry Groups System

- **Grouped ministry management** - Organize related ministries (like choirs) into logical groups for shared administration
- **Group-level custom consents** - Define specific consent requirements at the ministry group level (e.g., Planning Center app consent for choirs)
- **Consolidated notifications** - Ministry groups can receive single digest emails covering all ministries in the group
- **Shared RBAC** - Role-based access control can be managed at the group level for related ministries
- **Group email addresses** - Dedicated email addresses for ministry groups to receive consolidated communications
- **Registration form integration** - Group-level consents appear in the registration form when applicable

#### Enhanced Daily Digest System

- **Ministry group email support** - Daily digest now sends consolidated emails to ministry group contacts
- **Intelligent email routing** - System automatically determines whether to send individual ministry emails or group emails
- **Group enrollment consolidation** - Multiple enrollments within the same ministry group are combined into single digest emails
- **Enhanced email templates** - Updated templates support both individual ministry and group-level notifications
- **Flexible notification preferences** - Ministry groups can choose between individual ministry emails or consolidated group emails

### 🔧 Technical Improvements

- **Database schema enhancements** - Added `ministry_groups` and `ministry_group_members` tables for group management
- **Custom consent fields** - Added `custom_consent_text` and `custom_consent_required` fields to ministry groups
- **Group email field** - Added `email` field to ministry groups for consolidated notifications
- **Enhanced data access layer** - Updated DAL functions to support ministry group operations
- **Registration form updates** - Dynamic loading of group-level consents in the registration process
- **Seeding script improvements** - Updated all seeding scripts to include ministry group creation and assignment

### 🎯 User Experience Improvements

- **Cleaner registration flow** - Group-level consents are presented clearly in the registration form
- **Consistent UI patterns** - Ministry group management follows the same patterns as individual ministry management
- **Better organization** - Related ministries are now logically grouped for easier management
- **Streamlined communications** - Ministry leaders can receive consolidated notifications for related programs

---

## v1.1.0 - Daily Digest & Enhanced Communication

### 🆕 New Features

#### Daily Digest System

- **Automated daily enrollment notifications** - Ministry leaders receive daily emails summarizing new enrollments
- **Admin digest emails** - System administrators get comprehensive daily reports across all ministries
- **Primary guardian contact information** - Digest emails include correct household contact emails from primary guardians
- **Ministry-specific notifications** - Each ministry leader receives only their relevant enrollment information
- **Professional email templates** - Clean, branded email formatting for both HTML and text versions
- **Automated scheduling** - Daily digest runs automatically via GitHub Actions workflow

#### Enhanced Data Management

- **Improved guardian email handling** - System now correctly identifies and uses primary guardian emails for household contact
- **Better enrollment tracking** - Enhanced querying to provide accurate enrollment data in digest emails
- **Debug logging improvements** - Better visibility into enrollment data processing for troubleshooting

### 🔧 Technical Improvements

- **Database query optimization** - Updated enrollment queries to properly join guardian data
- **Email content generation** - Refactored email templates to use correct data sources
- **Error handling** - Improved error handling and logging for email delivery
- **Data validation** - Enhanced validation of guardian and household data

---

## v1.0.0 - Initial Release

### Overview

This release introduces the core functionality of gatherKids, a comprehensive ministry management system designed to streamline registration, attendance tracking, and ministry operations for churches and religious organizations.

### 🎯 Core Features

### Registration System

- **Complete household registration flow** with support for multiple children per family
- **Dynamic ministry enrollment** with age-appropriate program suggestions
- **Emergency contact management** with relationship tracking
- **Consent management** for liability waivers and photo releases
- **Registration cycle management** with active/inactive status tracking

### Data Management

- **Ministry management** with detailed program information and enrollment types
- **Leader assignment system** with role-based access control
- **Registration cycle tracking** with seasonal organization
- **Comprehensive data export** capabilities for reporting and record-keeping

### 👨‍👩‍👧‍👦 Family Features (GUARDIAN Role)

### Registration & Enrollment

- **Complete family registration** - Register your entire household in one streamlined process
- **Multiple children support** - Add and manage multiple children with individual ministry preferences
- **Ministry browsing** - View all available programs with age requirements and descriptions
- **Interest expression** - Indicate interest in programs even if not ready to enroll
- **Registration history** - View past registrations and enrollment status

### Household Management

- **View family profile** - Access your household information and registration details
- **View emergency contacts** - See current emergency contact information
- **View registration history** - Monitor past registrations and enrollment status across different programs

_Note: Profile editing, consent status viewing, and update capabilities are planned for future releases_

### 👥 Leader Features (MINISTRY_LEADER Role)

### Check-In/Out System

- **Digital attendance tracking** - Record children's arrival and departure times
- **Event-based check-ins** - Organize attendance by specific events (Sunday School, Children's Church, Teen Church)
- **Real-time attendance monitoring** - See who's currently checked in at any time
- **Attendance history** - Review past attendance records and patterns

### Roster Management

- **Ministry rosters** - View and manage lists of enrolled children
- **Age-based organization** - Sort children by grade and age for appropriate grouping
- **Contact information access** - Quick access to parent/guardian contact details
- **Enrollment status tracking** - Monitor which children are actively participating
- **Export capabilities** - Generate roster reports for planning and communication

### Incident Reporting

- **Incident logging** - Document and report incidents that occur during ministry activities
- **Detailed incident forms** - Capture comprehensive information about incidents
- **Incident history** - Review past incidents and follow-up actions
- **Acknowledgment system** - Track which incidents have been reviewed and addressed
- **Privacy controls** - Secure incident reporting with appropriate access controls

### 🔧 Administrator Features (ADMIN Role)

### System Management

- **Ministry configuration** - Create and manage all ministry programs
- **Leader assignment** - Assign ministry leaders to specific programs
- **Registration cycle management** - Control when registrations are open/closed
- **User role management** - Backend system for managing user permissions and access levels (_Frontend interface planned for future releases_)
- **System settings** - Configure application-wide settings and preferences

### Bible Bee Management

- **Program administration** - Manage Bible Bee competitions and activities
- **Scripture management** - Organize and distribute scripture memorization materials
- **Progress tracking** - Monitor participants' progress through the program
- **Division management** - Organize participants by age groups and skill levels
- **Competition coordination** - Manage competition schedules and logistics
- **Essay prompt management** - Create and manage essay assignments for different divisions
- **Student assignment interface** - Assign scriptures and essays to individual students
- **Progress analytics** - Comprehensive reporting on program participation and completion rates

### Reports & Analytics

- **Comprehensive reporting** - Generate detailed reports on attendance, enrollment, and participation
- **Data export capabilities** - Export data in various formats for external analysis
- **Emergency snapshots** - Quick access to critical information during emergencies
- **Custom date ranges** - Generate reports for specific time periods

### Data Management

- **Ministry database** - Maintain comprehensive ministry and program information
- **Registration data management** - Oversee all registration and enrollment data
- **Leader profile management** - Manage ministry leader information and assignments
- **System maintenance** - Perform administrative tasks and system upkeep

### Security & Access Control

- **Role-based permissions** - Granular control over what users can access and modify
- **Data privacy controls** - Ensure sensitive information is protected appropriately

### Registration Cycle Management

- **Seasonal organization** - Registration cycles are organized by seasons (Fall, Winter, Spring, Summer)
- **Active cycle tracking** - System automatically identifies and uses the current active registration cycle
- **Historical data** - Maintain records from previous registration cycles
- **Flexible scheduling** - Administrators can create and manage multiple cycles as needed
- **Automatic cycle detection** - System finds and uses the active registration cycle for all operations
- **Cycle-specific data** - All registrations and enrollments are tied to specific cycles
- **Cross-cycle reporting** - Ability to analyze data across multiple registration cycles
- **Cycle transitions** - Smooth transitions between registration periods

### 🚧 Features in Development (Beta Status)

The following features are currently in **Beta** status, meaning they are functional but may have limited features or require additional testing:

### User Management

- **User overview dashboard** - Admins can view all registered users with their roles, email confirmation status, and account details
- **Role promotion interface** - Admins can promote users to ADMIN role directly from the web interface
- **User status monitoring** - Track email confirmation status, last sign-in dates, and account creation dates
- **Secure user management** - Server-side API routes protect sensitive operations using Supabase service role key
- **Real-time user updates** - User list updates immediately after role changes without page refresh
- _Note: Additional user management features and bulk operations in development_

### Reports & Analytics

- Comprehensive reporting and data export capabilities
- Emergency snapshots and basic analytics
- _Note: Additional report types and customization options in development_

### 🛡️ Security & Privacy

### Data Protection

- **Secure data storage** - All sensitive information is encrypted and securely stored
- **Role-based access** - Users only see and can modify data appropriate to their role
- **Privacy controls** - Emergency contact and personal information is protected
- **Consent management** - Proper handling of liability waivers and photo releases

### Authentication & Authorization

- **Secure login system** - Robust authentication with session management
- **Role verification** - System ensures users can only access features appropriate to their role
- **Session security** - Automatic logout and session timeout for security
- **Access logging** - Comprehensive logging of system access and changes

### 📱 Technical Features

### Database Management

- **Comprehensive data model** - Complete database schema supporting all ministry operations
- **Data integrity** - Foreign key relationships and constraints ensure data consistency
- **Migration support** - Database migrations for schema updates and data management
- **Backup capabilities** - Automated backup systems for data protection

### User Interface

- **Responsive design** - Works seamlessly on desktop, tablet, and mobile devices
- **Intuitive navigation** - Clear, role-based navigation that adapts to user permissions
- **Modern UI components** - Clean, professional interface built with modern design principles
- **Accessibility** - Interface designed with accessibility best practices

### Integration & Export

- **CSV export** - Export data in standard formats for external analysis
- **API support** - RESTful API for potential future integrations
- **Data portability** - Easy data export for migration or backup purposes
- **Reporting integration** - Built-in reporting capabilities with export options

### 🎉 Getting Started

### For Families

1. **Register your household** - Complete the registration form with your family information
2. **Select ministries** - Choose programs that interest your children
3. **Complete consents** - Review and accept necessary waivers and permissions
4. **Stay informed** - Check your household profile for updates and communications

### For Ministry Leaders

1. **Access your assigned ministries** - View rosters and manage your programs
2. **Use check-in/out** - Track attendance for your ministry activities
3. **Report incidents** - Document any incidents that occur during activities
4. **Manage participants** - Keep track of enrolled children and their progress

### For Administrators

1. **Configure ministries** - Set up all ministry programs and requirements
2. **Assign leaders** - Assign ministry leaders to appropriate programs
3. **Manage registration cycles** - Control when registrations are open
4. **Generate reports** - Use reporting tools to analyze participation and attendance

### 📞 Support & Feedback

### Beta Feature Feedback

We encourage users to provide feedback on beta features to help us improve and refine the system. Please report any issues or suggestions through the appropriate channels.

### Documentation

- **User guides** - Comprehensive documentation for all user roles
- **Administrative guides** - Detailed setup and configuration instructions
- **API documentation** - Technical documentation for developers

### Updates

- **Regular updates** - System improvements and new features are released regularly
- **Release notes** - Detailed information about changes and new features
- **Migration guides** - Instructions for updating and maintaining the system

---

_This release represents a significant milestone in ministry management technology, providing churches and religious organizations with powerful tools to manage their programs, track participation, and serve their communities more effectively._
