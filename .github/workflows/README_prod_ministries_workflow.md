# Production Ministry Seeding Workflow

This GitHub Actions workflow provides a safe, controlled way to seed ministries in the production database.

## 🚀 **Workflow Features**

- ✅ **Production Safety**: Requires explicit confirmation to run against production
- ✅ **Dry Run Mode**: Preview what would be created without making changes
- ✅ **Environment Protection**: Uses GitHub environment secrets
- ✅ **Audit Trail**: Complete logging and summary of all actions
- ✅ **Idempotent**: Safe to run multiple times

## 📋 **Prerequisites**

### **GitHub Secrets Required**

Set these secrets in your GitHub repository settings:

- `PROD_SUPABASE_URL` - Production Supabase project URL
- `PROD_SUPABASE_SERVICE_ROLE_KEY` - Production service role key

### **GitHub Environment**

- Create a `production` environment in GitHub
- Configure environment protection rules as needed
- Add the required secrets to the environment

## 🎯 **How to Use**

### **1. Manual Trigger**

1. Go to **Actions** tab in GitHub
2. Select **"Production Ministry Seeding"** workflow
3. Click **"Run workflow"**
4. Configure options:
   - **Confirm Production**: Must be set to `true` to proceed
   - **Dry Run**: Set to `true` to preview changes without making them

### **2. Workflow Options**

| Option               | Description                                 | Required | Default |
| -------------------- | ------------------------------------------- | -------- | ------- |
| `confirm_production` | Confirms this is for PRODUCTION environment | ✅ Yes   | `false` |
| `dry_run`            | Preview mode - no changes made              | ❌ No    | `false` |

## 🔄 **Workflow Steps**

1. **Pre-flight Checks**: Verifies environment variables and production confirmation
2. **Ministry Creation**: Creates 20 ministries using app's DAL functions
3. **Summary Report**: Detailed summary of what was created
4. **Security Notice**: Audit trail and security reminders

## 📊 **What Gets Created**

### **Active Ministries (18)**

- Sunday School, Acolyte Ministry, Bible Bee, Dance Ministry
- Media Production Ministry, Mentoring Ministry-Boys/Girls
- Symphonic Orchestra, Youth Choirs (3 age groups)
- Youth Ushers, Children's Musical, Confirmation
- New Jersey Orators, Nursery, Vacation Bible School, College Tour

### **Inactive Ministries (2)**

- New Generation Teen Fellowship
- International Travel

## 🛡️ **Safety Features**

### **Production Protection**

- ⚠️ **Double Confirmation**: Must explicitly confirm production environment
- 🔐 **Environment Secrets**: Uses secure GitHub environment secrets
- 📋 **Audit Trail**: Complete logging of who ran what when

### **Dry Run Mode**

- 🧪 **Preview Changes**: See exactly what would be created
- 📊 **Detailed Output**: Shows ministry codes, types, and configurations
- ✅ **Safe Testing**: No database changes made

### **Idempotent Operation**

- 🔄 **Safe Re-runs**: Can be run multiple times safely
- ⏭️ **Skip Existing**: Automatically skips ministries that already exist
- 📝 **Clear Logging**: Shows what was created vs. skipped

## 📝 **Post-Seeding Steps**

After successful seeding:

1. **🔐 Log into production admin interface**
2. **📧 Navigate to Ministries page**
3. **✉️ Add email addresses** for each ministry through the UI
4. **👥 Assign ministry leaders** as needed
5. **⚙️ Configure additional settings** per ministry

## 🔍 **Monitoring & Troubleshooting**

### **Workflow Logs**

- Check the **Actions** tab for detailed logs
- Look for the **Summary** section for quick overview
- Review **Security Notice** for audit information

### **Common Issues**

| Issue                    | Solution                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| Missing secrets          | Verify `PROD_SUPABASE_URL` and `PROD_SUPABASE_SERVICE_ROLE_KEY` are set |
| Permission denied        | Check Supabase service role key permissions                             |
| Duplicate ministries     | Expected behavior - script skips existing ministries                    |
| Production not confirmed | Set `confirm_production` to `true`                                      |

### **Verification**

After running the workflow:

1. Check the workflow summary for success confirmation
2. Log into production admin interface
3. Verify ministries appear in the UI
4. Confirm ministry codes match expected values

## 🚨 **Important Notes**

- ⚠️ **Production Data**: This creates real data in your production database
- 🔐 **Access Control**: Ensure proper database access controls are in place
- 📧 **Email Setup**: Ministry email addresses must be added manually through UI
- 🔄 **Idempotent**: Safe to re-run if needed
- 📋 **Audit Trail**: All runs are logged with user and timestamp information

## 🔗 **Related Scripts**

- **Local Testing**: `npm run seed:prod:ministries:dry` (dry run)
- **Local Production**: `npm run seed:prod:ministries` (requires env vars)
- **Documentation**: `scripts/seed/README_prod_ministries.md`
