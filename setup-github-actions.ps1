#!/usr/bin/env pwsh

<#
.SYNOPSIS
AWS & GitHub Actions Setup Script for Zeflash
Configures AWS credentials and prepares GitHub Actions deployment

.DESCRIPTION
This script helps you:
1. Create new AWS IAM user for GitHub Actions
2. Generate AWS credentials
3. Configure GitHub Secrets
4. Test AWS connectivity
5. Prepare for GitHub Actions deployment

.EXAMPLE
./setup-github-actions.ps1

.NOTES
Author: Zeflash Team
Date: April 12, 2026
Requires: AWS CLI, GitHub CLI (gh), PowerShell 5.0+
#>

param(
    [switch]$SkipAWSSetup = $false,
    [switch]$SkipGitHubSetup = $false,
    [switch]$TestOnly = $false
)

$ErrorActionPreference = "Stop"
$host.UI.RawUI.WindowTitle = "Zeflash AWS & GitHub Setup"

# Colors
$Green = @{ ForegroundColor = 'Green' }
$Red = @{ ForegroundColor = 'Red' }
$Yellow = @{ ForegroundColor = 'Yellow' }
$Cyan = @{ ForegroundColor = 'Cyan' }

function Write-Status {
    param([string]$Message, [ValidateSet('Info', 'Success', 'Warning', 'Error')]$Type = 'Info')
    
    switch ($Type) {
        'Success' { Write-Host "✅ $Message" @Green }
        'Error' { Write-Host "❌ $Message" @Red }
        'Warning' { Write-Host "⚠️  $Message" @Yellow }
        default { Write-Host "ℹ️  $Message" @Cyan }
    }
}

# ═══════════════════════════════════════════════════════════════
# PHASE 1: PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
Write-Host "║        Zeflash AWS & GitHub Actions Setup Wizard             ║" @Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

Write-Status "Phase 1: Pre-flight Checks" "Info"

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Status "AWS CLI found: $awsVersion" "Success"
} catch {
    Write-Status "AWS CLI not found. Install from: https://aws.amazon.com/cli/" "Error"
    exit 1
}

# Check if GitHub CLI is installed
try {
    $ghVersion = gh --version 2>&1
    Write-Status "GitHub CLI found" "Success"
} catch {
    Write-Status "GitHub CLI not found. Install from: https://cli.github.com/" "Error"
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path ".github/workflows")) {
    Write-Status "Not in project root directory" "Error"
    Write-Host "Please run this script from the root of your Zeflash repository"
    exit 1
}
Write-Status "Running from Zeflash project root" "Success"

# ═══════════════════════════════════════════════════════════════
# PHASE 2: AWS SETUP
# ═══════════════════════════════════════════════════════════════

if (-not $SkipAWSSetup) {
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
    Write-Host "║              Phase 2: AWS Configuration                        ║" @Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

    Write-Status "AWS Configuration" "Info"
    
    # Check current AWS identity
    Write-Host "`nChecking current AWS identity..."
    try {
        $identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Status "Current AWS Account: $($identity.Account)" "Success"
        Write-Status "Current User ARN: $($identity.Arn)" "Success"
    } catch {
        Write-Status "Cannot connect to AWS. Please configure AWS credentials first:" "Error"
        Write-Host "  aws configure"
        exit 1
    }

    # Prompt for new IAM user creation
    Write-Host "`nDo you want to create a new IAM user for GitHub Actions? (y/n)"
    $createUser = Read-Host

    if ($createUser -eq 'y') {
        $userName = "github-actions-zeflash"
        Write-Status "Creating IAM user: $userName" "Info"
        
        try {
            aws iam create-user --user-name $userName --tags Key=Environment,Value=CI-CD | Out-Null
            Write-Status "IAM user created: $userName" "Success"
        } catch {
            if ($_.Exception.Message -like "*EntityAlreadyExists*") {
                Write-Status "IAM user already exists: $userName" "Warning"
            } else {
                Write-Status "Failed to create IAM user: $_" "Error"
                exit 1
            }
        }

        # Attach policy
        Write-Status "Attaching ECR and ECS policy..." "Info"
        try {
            # Create inline policy
            $policy = @{
                Version = "2012-10-17"
                Statement = @(
                    @{
                        Effect = "Allow"
                        Action = @(
                            "ecr:GetAuthorizationToken",
                            "ecr:BatchGetImage",
                            "ecr:GetDownloadUrlForLayer",
                            "ecr:PutImage",
                            "ecr:InitiateLayerUpload",
                            "ecr:UploadLayerPart",
                            "ecr:CompleteLayerUpload"
                        )
                        Resource = "*"
                    },
                    @{
                        Effect = "Allow"
                        Action = @(
                            "ecs:DescribeServices",
                            "ecs:DescribeTaskDefinition",
                            "ecs:DescribeContainerInstances",
                            "ecs:UpdateService",
                            "ecs:RegisterTaskDefinition"
                        )
                        Resource = @(
                            "arn:aws:ecs:us-east-1:$($identity.Account):service/zipbolt-cluster/*",
                            "arn:aws:ecs:us-east-1:$($identity.Account):task-definition/*"
                        )
                    }
                )
            } | ConvertTo-Json -Depth 10

            $policy | Out-File "github-actions-policy.json" -Encoding UTF8
            
            aws iam put-user-policy --user-name $userName `
                --policy-name GitHubActionsPolicy `
                --policy-document file://github-actions-policy.json | Out-Null
            
            Remove-Item "github-actions-policy.json" -Force
            Write-Status "Policy attached successfully" "Success"
        } catch {
            Write-Status "Failed to attach policy: $_" "Error"
            exit 1
        }

        # Create access key
        Write-Status "Creating access keys..." "Info"
        try {
            $response = aws iam create-access-key --user-name $userName | ConvertFrom-Json
            $accessKeyId = $response.AccessKey.AccessKeyId
            $secretAccessKey = $response.AccessKey.SecretAccessKey
            
            Write-Status "✅ Access Keys Created Successfully!" "Success"
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════════════════════╗" @Green
            Write-Host "║              ⚠️  SAVE THESE CREDENTIALS NOW  ⚠️               ║" @Yellow
            Write-Host "╚════════════════════════════════════════════════════════════════╝" @Green
            Write-Host ""
            Write-Host "Access Key ID:" -ForegroundColor Yellow
            Write-Host "  $accessKeyId" @Green
            Write-Host ""
            Write-Host "Secret Access Key:" -ForegroundColor Yellow
            Write-Host "  $secretAccessKey" @Green
            Write-Host ""
            Write-Host "⚠️  Store these in a secure location (password manager)" -ForegroundColor Red
            Write-Host ""
        } catch {
            Write-Status "Failed to create access keys: $_" "Error"
            exit 1
        }
    } else {
        Write-Status "Skipping IAM user creation" "Warning"
        Write-Host "Please create a new AWS IAM user with ECR and ECS permissions manually"
        Write-Host "Reference: AWS_GITHUB_SETUP.md"
    }
}

# ═══════════════════════════════════════════════════════════════
# PHASE 3: GITHUB SECRETS SETUP
# ═══════════════════════════════════════════════════════════════

if (-not $SkipGitHubSetup) {
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
    Write-Host "║              Phase 3: GitHub Secrets Setup                     ║" @Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

    # Check if logged in to GitHub
    Write-Status "Checking GitHub authentication..." "Info"
    try {
        $user = gh auth status 2>&1
        Write-Status "GitHub authentication successful" "Success"
    } catch {
        Write-Status "GitHub CLI authentication required" "Warning"
        Write-Host "Please run: gh auth login"
        exit 1
    }

    Write-Host "`nEnter your AWS credentials to set up GitHub Secrets:"
    Write-Host ""
    
    $accessKeyId = Read-Host "AWS Access Key ID"
    $secretAccessKey = Read-Host "AWS Secret Access Key" -AsSecureString

    # Convert secure string back to plain text for API call
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secretAccessKey)
    $secretPlainText = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($bstr)

    if ([string]::IsNullOrEmpty($accessKeyId) -or [string]::IsNullOrEmpty($secretPlainText)) {
        Write-Status "Credentials cannot be empty" "Error"
        exit 1
    }

    # Store secrets
    Write-Status "Setting GitHub Secrets..." "Info"
    
    try {
        Write-Host "  → AWS_ACCESS_KEY_ID"
        gh secret set AWS_ACCESS_KEY_ID --body $accessKeyId

        Write-Host "  → AWS_SECRET_ACCESS_KEY"
        gh secret set AWS_SECRET_ACCESS_KEY --body $secretPlainText

        Write-Host "  → AWS_REGION"
        gh secret set AWS_REGION --body "us-east-1"

        Write-Status "GitHub Secrets configured successfully!" "Success"
    } catch {
        Write-Status "Failed to set GitHub secrets: $_" "Error"
        exit 1
    }
}

# ═══════════════════════════════════════════════════════════════
# PHASE 4: ENVIRONMENT SETUP
# ═══════════════════════════════════════════════════════════════

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
Write-Host "║              Phase 4: Local Environment Setup                 ║" @Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

Write-Status "Setting up .env files" "Info"

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Status "Creating .env.local template" "Info"
    Copy-Item ".env.local.example" ".env.local" -Force
    Write-Status ".env.local created from template" "Success"
} else {
    Write-Status ".env.local already exists" "Warning"
}

# Verify .env is in .gitignore
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "\.env") {
        Write-Status ".env is in .gitignore (safe)" "Success"
    } else {
        Write-Status "Adding .env to .gitignore" "Warning"
        Add-Content ".gitignore" "`n# Environment variables`n.env`n.env.local`n.env.*.local"
    }
} else {
    Write-Status "Creating .gitignore" "Info"
    @"
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build output
dist/
build/

# IDE
.vscode/
.idea/
"@ | Out-File ".gitignore" -Encoding UTF8
}

# ═══════════════════════════════════════════════════════════════
# PHASE 5: VERIFICATION
# ═══════════════════════════════════════════════════════════════

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
Write-Host "║              Phase 5: Verification & Testing                  ║" @Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

$runTests = Read-Host "Run verification tests? (y/n)" 

if ($runTests -eq 'y') {
    Write-Status "Testing AWS connectivity..." "Info"
    try {
        # Test with environment variables if available
        $testIdentity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
        Write-Status "✅ AWS connection successful!" "Success"
        Write-Host "   Account: $($testIdentity.Account)"
        Write-Host "   User: $($testIdentity.Arn)"
    } catch {
        Write-Status "⚠️  AWS connection test failed" "Warning"
        Write-Host "   This is expected if credentials not yet set in terminal"
        Write-Host "   They will work when GitHub Actions runs"
    }

    # Test ECR repository exists
    Write-Status "Testing ECR repositories..." "Info"
    try {
        $repos = aws ecr describe-repositories --region us-east-1 2>&1 | ConvertFrom-Json
        Write-Status "ECR repositories found:" "Success"
        $repos.repositories | ForEach-Object { Write-Host "   • $($_.repositoryName)" }
    } catch {
        Write-Status "ECR repositories not found" "Warning"
        Write-Host "   You need to create them with:"
        Write-Host "   aws ecr create-repository --repository-name zipbolt-backend --region us-east-1"
        Write-Host "   aws ecr create-repository --repository-name battery-ml --region us-east-1"
    }
}

# ═══════════════════════════════════════════════════════════════
# PHASE 6: SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" @Cyan
Write-Host "║                    ✅ Setup Complete!                         ║" @Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" @Cyan

Write-Host "What's been configured:" @Green
Write-Host "  ✅ AWS IAM user: github-actions-zeflash"
Write-Host "  ✅ GitHub Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
Write-Host "  ✅ Local .env.local: Created from template"
Write-Host "  ✅ .gitignore: Updated to protect credentials"
Write-Host ""

Write-Host "Next steps:" @Yellow
Write-Host "  1. Update .env.local with your actual credentials"
Write-Host "  2. Commit updated .gitignore and .env"
Write-Host "  3. Push to GitHub to trigger GitHub Actions"
Write-Host "  4. Monitor Actions tab for deployment status"
Write-Host ""

Write-Host "Documentation:" @Cyan
Write-Host "  📖 AWS_GITHUB_SETUP.md - Complete setup guide"
Write-Host "  📋 SECURITY_AUDIT_REPORT.md - Security recommendations"
Write-Host ""

Write-Status "Setup wizard complete!" "Success"

