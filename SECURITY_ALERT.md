# 🚨 CRITICAL SECURITY ALERT - AWS Credentials Exposed

## ⚠️ IMMEDIATE ACTION REQUIRED

Your AWS credentials were found hardcoded in `battery-ml-lambda/task-definition-test.json` and pushed to public GitHub repository.

**Exposed Credentials:**
- Access Key ID: `AKIARBACUDGIA3S5E22G`
- Secret Access Key: `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`
- Region: `us-east-1`

## 🔥 Step 1: ROTATE CREDENTIALS IMMEDIATELY (Do This NOW!)

### Option A: Delete the Access Key (Recommended)

```bash
# Delete the exposed access key
aws iam delete-access-key --access-key-id AKIARBACUDGIA3S5E22G --user-name <YOUR_IAM_USERNAME>
```

### Option B: Deactivate First (Safer for testing)

```bash
# Deactivate the key first (can reactivate if needed)
aws iam update-access-key --access-key-id AKIARBACUDGIA3S5E22G --status Inactive --user-name <YOUR_IAM_USERNAME>

# Later, permanently delete it
aws iam delete-access-key --access-key-id AKIARBACUDGIA3S5E22G --user-name <YOUR_IAM_USERNAME>
```

### Find Your IAM Username

```bash
# Get current user info
aws sts get-caller-identity

# List access keys for user
aws iam list-access-keys --user-name <YOUR_IAM_USERNAME>
```

## 🔒 Step 2: Use IAM Roles Instead (BEST PRACTICE)

Your ECS task definition already has IAM roles configured:
```json
"taskRoleArn": "arn:aws:iam::070872471952:role/ecsTaskExecutionRole"
```

**You DON'T need access keys in ECS!** The IAM role provides automatic, rotating credentials.

### Update ecsTaskExecutionRole Permissions

Ensure the role has these policies:
```bash
# Attach S3 access policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach ECR access policy (already should have)
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

# Verify attached policies
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole
```

## 🛡️ Step 3: Remove Credentials from Code

I've updated the task definitions to remove hardcoded credentials. The IAM role will handle authentication automatically.

## 📊 Step 4: Check for Unauthorized Usage

```bash
# Check CloudTrail for suspicious activity with this key
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=<YOUR_IAM_USERNAME> \
  --max-results 50 \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)

# Check recent EC2 instances (in case attacker launched servers)
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,LaunchTime]' --output table

# Check S3 buckets (in case data was accessed/deleted)
aws s3 ls

# Check IAM users (in case attacker created backdoor users)
aws iam list-users
```

## 🔍 Step 5: Review GitHub History

The credentials are in git history even after removal. Options:

### Option A: Use GitHub's Secret Scanning (Recommended)
GitHub may have already detected this and sent you an alert. Check:
- Repository → Security → Secret scanning alerts

### Option B: Rewrite Git History (Nuclear Option - USE WITH CAUTION!)
```bash
# WARNING: This rewrites history and breaks others' local repos!
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch battery-ml-lambda/task-definition-test.json" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**Better**: Just rotate the keys and move on. GitHub history is forever, but rotated keys are useless.

## ✅ Step 6: Prevention Checklist

- [ ] Deleted/deactivated exposed AWS access key
- [ ] Verified IAM role permissions for ECS
- [ ] Removed credentials from task-definition-test.json (already done)
- [ ] Added task-definition-test.json to .gitignore (already done)
- [ ] Checked CloudTrail for unauthorized usage
- [ ] Set up AWS CloudWatch alarms for unusual activity
- [ ] Enabled AWS Config for compliance monitoring
- [ ] Reviewed all IAM users and removed unused ones

## 🚀 Moving Forward: Secure Deployment

### For Production:
Use IAM roles (already configured) - **NO CREDENTIALS NEEDED**

### For Local Development:
Use AWS CLI credentials from `~/.aws/credentials`:
```bash
# Configure AWS CLI (stores in ~/.aws/credentials)
aws configure

# Or use environment variables in .env (NEVER commit .env!)
AWS_ACCESS_KEY_ID=your_new_key_here
AWS_SECRET_ACCESS_KEY=your_new_secret_here
AWS_DEFAULT_REGION=us-east-1
```

## 📞 Support

- **AWS Support**: https://console.aws.amazon.com/support/
- **GitHub Security**: https://github.com/security
- **Report Compromised Keys**: https://aws.amazon.com/premiumsupport/knowledge-center/potential-account-compromise/

## 🎯 Summary

1. ✅ **DONE**: Removed credentials from task definition files
2. ⚠️ **YOU DO**: Delete/rotate the exposed AWS access key
3. ✅ **DONE**: Using IAM roles for ECS (no credentials needed)
4. ⚠️ **YOU DO**: Check CloudTrail for unauthorized usage
5. ✅ **DONE**: Added .gitignore rules to prevent future exposure

**The code is now secure. You just need to rotate the old exposed key!**
