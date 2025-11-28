# Audit Logging Quick Start Guide

## Overview
Your password management system now has complete audit logging that tracks:
- 🔐 Who logged in, when, and from where
- 👁️ Who viewed usernames and passwords
- 📋 Who copied usernames and passwords  
- ✏️ Who edited passwords and what they changed

## How to View Audit Logs

### Step 1: Navigate to Passwords
Go to the Password page in your application.

### Step 2: View Activity Logs
Click the **History** icon (clock icon) next to any password entry.

### Step 3: Review the Audit Trail
The Activity Logs dialog now shows two sections:

#### 📊 Audit Trail
Shows detailed access logs including:
- **Action Type**: Login, View Username, Copy Username, View Password, Copy Password, Edit Password
- **User**: Who performed the action (name and email)
- **Timestamp**: Exact date and time
- **IP Address**: Where the action came from
- **Location**: City, region, and country (automatically detected from IP)
- **Changes**: For edit actions, shows what fields were changed

#### 📝 Change History
Shows password modification records:
- Create, Update, Delete actions
- Field-level changes
- User who made the change

## What Gets Logged

### ✅ Automatically Logged Actions

1. **Login Events**
   - Every time any user logs in
   - Captures IP address and location
   - No action needed - happens automatically

2. **View Actions**
   - When you click the eye icon to reveal a username
   - When you click the eye icon to reveal a password
   - Logged immediately when you click

3. **Copy Actions**
   - When you click the copy icon for a username
   - When you click the copy icon for a password
   - Logged immediately when you click

4. **Edit Actions**
   - When you save changes to a password
   - **Smart Detection**: Only logs if you actually changed something
   - If you open edit form but don't change anything = No log created
   - If you change any field = Log created with details

### ❌ NOT Logged

- Opening the edit form (without saving changes)
- Viewing the password list
- Searching or filtering
- Navigation between pages

## Understanding the Audit Trail

### Action Types and Colors

| Action | Badge Color | What It Means |
|--------|-------------|---------------|
| LOGIN | Blue | User logged into the system |
| VIEW USERNAME | Gray | User revealed the username |
| COPY USERNAME | White | User copied username to clipboard |
| VIEW PASSWORD | Gray | User revealed the password |
| COPY PASSWORD | White | User copied password to clipboard |
| EDIT PASSWORD | Red | User modified the password entry |

### Location Information

The system automatically detects location from IP address:
- **Public IPs**: Shows actual city, region, country
- **Local/Private IPs**: Shows "Local" for development/internal networks
- **Failed Lookups**: Location field will be empty

### Example Audit Log Entry

```
Action: COPY PASSWORD
Time: Nov 28, 2025, 10:30:45 AM
User: John Doe (john@company.com)
IP Address: 203.0.113.45
Location: New York, New York, United States
```

## Use Cases

### 1. Security Monitoring
**Scenario**: You want to see who accessed a sensitive password.

**Steps**:
1. Find the password in the list
2. Click the History icon
3. Review the Audit Trail section
4. Look for VIEW PASSWORD and COPY PASSWORD actions
5. Check the IP addresses and locations

### 2. Compliance Audits
**Scenario**: You need to prove who changed a password and when.

**Steps**:
1. Find the password in the list
2. Click the History icon
3. Review both Audit Trail and Change History
4. Export or screenshot the logs for compliance records

### 3. Investigating Suspicious Activity
**Scenario**: You notice unusual access patterns.

**Steps**:
1. Check the Audit Trail for the password
2. Look for:
   - Unusual IP addresses
   - Unexpected locations
   - Access at odd times
   - Multiple rapid copy actions

### 4. User Activity Review
**Scenario**: You want to see what a specific user has been doing.

**Steps**:
1. Look through password audit logs
2. Filter by user email or name
3. Review their actions and timestamps

## Privacy and Security

### What's Protected
- ✅ Actual password values are NEVER stored in audit logs
- ✅ Only field names and "changed" indicators are logged
- ✅ All sensitive data remains encrypted

### Who Can See Audit Logs
- **Master Admins**: Can see all audit logs
- **Company Super Admins**: Can see logs for their company
- **Company Users**: Can see logs for passwords they have access to

### Data Retention
- Audit logs are stored indefinitely by default
- Consider implementing retention policies based on your compliance needs

## Tips and Best Practices

### 1. Regular Reviews
- Review audit logs weekly for sensitive passwords
- Look for unusual patterns or access times
- Monitor for unexpected locations

### 2. Compliance Documentation
- Take screenshots of audit logs for compliance records
- Document any suspicious activities
- Keep records of who accessed what and when

### 3. User Training
- Inform users that all actions are logged
- Explain that this is for security and compliance
- Encourage responsible password access

### 4. Incident Response
- If you detect suspicious activity:
  1. Check the audit trail immediately
  2. Identify the user and IP address
  3. Verify the location makes sense
  4. Take appropriate action (password reset, user lockout, etc.)

## Troubleshooting

### Issue: Location Shows "Local"
**Reason**: You're accessing from localhost or a private network
**Solution**: This is normal for development environments

### Issue: No Location Data
**Reason**: IP geolocation lookup failed or rate limit reached
**Solution**: Wait a minute and try again; IP address is still logged

### Issue: Audit Logs Not Showing
**Reason**: No actions have been performed on this password yet
**Solution**: Perform an action (view, copy, edit) and check again

### Issue: Old Actions Not Logged
**Reason**: Audit logging was just implemented
**Solution**: Only new actions (after implementation) will be logged

## Technical Details

### IP Geolocation
- Uses ip-api.com free tier
- 45 requests per minute limit
- Results are cached to minimize API calls
- No API key required

### Performance
- Logging is asynchronous (doesn't slow down your actions)
- Logs are indexed for fast retrieval
- No impact on user experience

### Database
- Logs are stored in the `auditlogs` collection
- Separate from password data
- Can be queried independently

## Need More Information?

- **Technical Details**: See `AUDIT_LOGGING_DOCUMENTATION.md`
- **Implementation Details**: See `AUDIT_IMPLEMENTATION_SUMMARY.md`
- **Support**: Check console logs for any error messages

---

**Remember**: All password access is now tracked. This helps keep your data secure and meets compliance requirements! 🔒
