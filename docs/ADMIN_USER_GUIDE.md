# Creating an Admin User in gatherKids

This guide explains how to create an administrator user in the gatherKids application, using either the Supabase dashboard or the provided script.

## Method 1: Using the Admin Script (Recommended)

We've created a script that automates the process of creating an admin user for both authentication and application roles.

### Prerequisites

- Node.js installed on your system
- Access to your Supabase project credentials
- The `.env.local` file configured with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Steps

1. **Make the script executable:**

   ```bash
   chmod +x scripts/admin/create-admin-user.js
   ```

2. **Run the script:**

   ```bash
   node scripts/admin/create-admin-user.js admin@example.com YourStrongPassword123!
   ```

3. **Verify in Supabase Dashboard:**
   - Check the Authentication > Users section to confirm the user exists
   - Check the Table Editor > users table to verify the user has the ADMIN role

## Method 2: Using the Supabase Dashboard

If you prefer a manual approach, you can create an admin user through the Supabase dashboard.

### Steps

1. **Access the Supabase Dashboard:**

   - Log in to [app.supabase.com](https://app.supabase.com/)
   - Select your project

2. **Create the Auth User:**

   - Navigate to Authentication > Users
   - Click "Invite user"
   - Enter the email address
   - Set "Auto-confirm" to YES
   - Add custom user metadata with the admin role:
     ```json
     {
     	"role": "ADMIN",
     	"full_name": "Administrator"
     }
     ```
   - Click "Invite"

3. **Add the User to the Database:**

   - Navigate to SQL Editor
   - Create a new query and run:

   ```sql
   INSERT INTO users (
     user_id,
     name,
     email,
     role,
     is_active,
     created_at,
     updated_at
   ) VALUES (
     '[USER_ID_FROM_AUTH_TABLE]',  -- Replace with the user ID from step 2
     'Administrator',
     'admin@example.com',  -- Use the same email from step 2
     'ADMIN',
     true,
     now(),
     now()
   );
   ```

4. **Set a Password:**
   - Return to Authentication > Users
   - Find your admin user
   - Click "Reset password"
   - Set a new password

## Authentication System in gatherKids

Authentication is **Supabase Auth only**. There is no demo mode, `DEMO_USERS` list, or `DATABASE_MODE`.

- Log in with a real auth user in the target project (local, UAT, or production).
- The user must exist in both `auth.users` and the application's `users` table.
- The role must be set in auth user metadata and the `users` table.
- For password login, set `NEXT_PUBLIC_LOGIN_PASSWORD_ENABLED=true`.

Stakeholder demos use the UAT Supabase project and its seeded accounts, not in-app demo users.
