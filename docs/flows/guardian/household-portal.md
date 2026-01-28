# Guardian Household Portal Flow

## Overview

The household portal serves as the guardian's dashboard, providing access to household information, children, and quick access to features.

## Flow Steps

1. **Access Household Portal**
   - Navigate to `/household`
   - Protected route verifies GUARDIAN role
   - Loads household data

2. **View Household Information**
   - See household details
   - View address
   - See household members

3. **View Children**
   - List all children in household
   - See child details
   - Quick access to child-specific pages

4. **Navigate to Features**
   - Access Bible Bee student tracking
   - Check children in/out
   - Update profiles

## Related Flows

- [Profile Management](./profile-management.md) - Profile updates
- [Bible Bee Student](./bible-bee-student.md) - Bible Bee tracking
- [Check-in Guardian](./check-in-guardian.md) - Check-in flow
- [Main Guardian README](./README.md) - Return to guardian flows overview
