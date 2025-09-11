# Production Ministry Seeding

This script creates ministries in the production database using the same app functions as the frontend, ensuring proper auto-generated IDs and data consistency.

## Features

- ✅ Uses the app's DAL functions (`createMinistry`) for proper data handling
- ✅ Auto-generated UUIDs (no test prefixes)
- ✅ Same ministry codes as UAT for consistency
- ✅ Email fields left blank for manual UI entry
- ✅ Idempotent (safe to run multiple times)
- ✅ Proper error handling and progress tracking

## Prerequisites

1. **Environment Variables**: Set up production environment variables

   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="your-production-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
   ```

2. **Database Access**: Ensure the service role key has proper permissions to create ministries

## Usage

### Run the Script

```bash
npm run seed:prod:ministries
```

### Manual Execution

```bash
node scripts/seed/prod_ministries.js
```

## What It Creates

The script creates **20 ministries** with the following characteristics:

### Active Ministries (18)

- Sunday School
- Acolyte Ministry
- Bible Bee
- Dance Ministry
- Media Production Ministry
- Mentoring Ministry-Boys (Khalfani)
- Mentoring Ministry-Girls (Nailah)
- Symphonic Orchestra
- Youth Choirs- Joy Bells (Ages 4-8)
- Youth Choirs- Keita Praise Choir (Ages 9-12)
- Youth Choirs- New Generation Teen Choir (Ages 13-18)
- Youth Ushers
- Children's Musical
- Confirmation
- New Jersey Orators
- Nursery
- Vacation Bible School
- College Tour

### Inactive Ministries (2)

- New Generation Teen Fellowship
- International Travel

## Post-Seeding Steps

After running the script, you'll need to complete the setup through the admin UI:

1. **Log into the production admin interface**
2. **Navigate to the Ministries page**
3. **Add email addresses** for each ministry through the UI
4. **Assign ministry leaders** as needed
5. **Configure any additional settings** per ministry

## Safety Features

- **Idempotent**: Safe to run multiple times
- **Duplicate Detection**: Checks for existing ministries by code
- **Error Handling**: Continues processing even if individual ministries fail
- **Progress Tracking**: Shows detailed progress and summary
- **No Email Creation**: Intentionally leaves email fields blank for manual entry

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   ```
   ❌ Missing required environment variables:
      NEXT_PUBLIC_SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY
   ```

   **Solution**: Set the required environment variables

2. **Permission Errors**

   ```
   ❌ Failed to create ministry: permission denied
   ```

   **Solution**: Verify the service role key has proper permissions

3. **Duplicate Code Errors**
   ```
   ⏭️ Ministry already exists: Sunday School (min_sunday_school)
   ```
   **Solution**: This is expected behavior - the script skips existing ministries

### Verification

To verify the ministries were created correctly:

1. Check the console output for success messages
2. Log into the admin UI and verify ministries appear
3. Check that ministry codes match the expected values
4. Verify inactive ministries are marked as inactive

## Script Output Example

```
🚀 Starting Production Ministry Seeding...
📡 Connecting to: https://your-project.supabase.co
🔑 Using service role key

📋 Starting ministry creation for production...
📊 Found 20 ministries to process
🔄 Creating ministry: Sunday School...
✅ Created ministry: Sunday School (ID: 123e4567-e89b-12d3-a456-426614174000)
📝 Ministry account will be created manually through UI for: Sunday School
...

📊 Summary:
   ✅ Ministries created: 20
   ⏭️  Ministries skipped (already exist): 0
   ❌ Errors: 0

📝 Next Steps:
   1. Log into the production admin interface
   2. Navigate to Ministries page
   3. Add email addresses for each ministry through the UI
   4. Assign ministry leaders as needed

✅ Production ministry seeding completed successfully!
```
