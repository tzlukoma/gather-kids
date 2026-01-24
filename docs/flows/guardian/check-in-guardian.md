# Guardian Check-in/Check-out Flow

## Overview

Guardians can check their children in and out of events from the household portal. The flow is similar to ministry leader check-in but accessed from the guardian's household dashboard.

## Flow Steps

1. **Access from Household Portal**
   - Navigate to `/household`
   - View children in household
   - Click "Check In" button for a child

2. **Event Selection**
   - Select event: Sunday School, Children's Church, or Teen Church
   - Event selection determines which event child is checked into

3. **Check-in Child**
   - Select child from household list
   - Click "Check In" button
   - Calls `recordCheckIn(childId, eventId)`
   - Creates attendance record
   - Updates UI

4. **Check-out Child**
   - View checked-in children
   - Click "Check Out" button
   - Enter PIN (last 4 digits of phone number)
   - Verify PIN
   - Calls `recordCheckOut(attendanceId, verifier)`
   - Updates attendance record

5. **PIN Verification**
   - Same PIN verification as ministry leader flow
   - Checks against guardian/emergency contact/child phone
   - Self-checkout available for children 13+

## Key Differences from Ministry Leader Flow

- **Access Point**: From household portal instead of dashboard
- **Child Filtering**: Only shows children in guardian's household
- **Event Selection**: May be simplified or event-specific

## Related Flows

- [Household Portal](./household-portal.md) - Household dashboard
- [Shared Check-in Technical](../shared/check-in-technical.md) - Technical check-in details
- [Main Guardian README](./README.md) - Return to guardian flows overview
