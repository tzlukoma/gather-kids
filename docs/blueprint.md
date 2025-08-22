# **App Name**: MinistrySync

## Core Features:

- Check-In/Out UI: Leaders can check in and check out children for Sunday School with an immediate UI update using optimistic updates. Check-out must verify guardian via last4 of phone number or household PIN.
- Real-Time Rosters: Implement realtime roster updates using subscriptions. Leaders should see changes (check-ins, new enrollments) instantly across all devices.
- Incident Logging: Add a feature for leaders to log incidents during sessions, capturing description and severity. Incidents require admin acknowledgment before closure.
- Household Verification: Add parent verification via email magic link to create a registration session. If unavailable, implement a backup flow with security questions (child DOB, address street number, emergency contact first name).
- Admin Dashboard: Include key metrics: % completion of registrations, Number of missing consents, Choir eligibility warnings.
- Report Generation: Support generating reports and exporting CSVs, including: Emergency snapshot (today’s roster + allergies/contacts), Attendance rollup by date range. Ensure system can prefill last year’s household + children when parents re-register.
- Registration Page: Add full parent-facing form: Household and guardian info, Emergency contact, Child details (DOB, grade, safety info), Ministry selections (with automatic Sunday School enrollment), Interest-only activities, Consents (liability, photo release). Enforce choir age eligibility and Bible Bee date-window visibility.

## Style Guidelines:

- Primary color: A calming blue (#64B5F6), evoking trust and reliability, essential for managing sensitive data.
- Background color: A light, desaturated blue (#E3F2FD), creating a serene and uncluttered backdrop.
- Accent color: A vibrant orange (#FFB74D) for action items and highlights, drawing attention to key interactions.
- Font pairing: 'Poppins' (sans-serif) for headlines, conveying modernity and clarity, and 'PT Sans' (sans-serif) for body text, providing readability and a friendly feel.
- Code Font: 'Source Code Pro' for displaying any code snippets.
- Use clear, intuitive icons to represent actions and categories, ensuring easy navigation. Icons should follow a consistent style, focused on simplicity and ease of understanding.
- Design a clean, mobile-first responsive layout. The key will be optimizing content for different screen sizes. Maintain consistent spacing and alignment across all elements to improve visual coherence.