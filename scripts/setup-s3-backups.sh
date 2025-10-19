#!/bin/bash
# SmartFarm - S3 Backup Configuration Script
# Sets up S3 bucket with lifecycle policies for cost-effective backup storage

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET="${S3_BUCKET:-smartfarm-backups}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-586794472237}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SmartFarm S3 Backup Setup           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI is not installed${NC}"
    echo "Install with: sudo apt-get install -y awscli"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
    echo "Configure with: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo ""

# Cost estimation
echo -e "${YELLOW}💰 Cost Estimation:${NC}"
echo ""
echo -e "S3 Storage Costs (us-east-1):"
echo -e "  Standard storage:      \$0.023 per GB/month"
echo -e "  Standard-IA:          \$0.0125 per GB/month"
echo -e "  Glacier Instant:      \$0.004 per GB/month"
echo -e "  Glacier Deep Archive: \$0.00099 per GB/month"
echo ""
echo -e "Estimated backup sizes:"
echo -e "  Daily backups:   ~500MB × 7  = 3.5GB"
echo -e "  Weekly backups:  ~500MB × 4  = 2GB"
echo -e "  Monthly backups: ~500MB × 6  = 3GB"
echo -e "  ${BLUE}Total estimated: ~8.5GB${NC}"
echo ""
echo -e "With lifecycle policies:"
echo -e "  Daily (Standard):        3.5GB × \$0.023  = \$0.08/mo"
echo -e "  Weekly (Standard-IA):    2GB   × \$0.0125 = \$0.03/mo"
echo -e "  Monthly (Glacier):       3GB   × \$0.004  = \$0.01/mo"
echo -e "  ${GREEN}Total estimated cost: \$0.12/month${NC}"
echo ""
echo -e "Additional costs:"
echo -e "  - PUT requests: \$0.005 per 1,000 requests (~\$0.01/mo)"
echo -e "  - Data transfer OUT: \$0.09/GB (only when restoring)"
echo ""
echo -e "${GREEN}Projected monthly cost: < \$0.25/month${NC}"
echo -e "${GREEN}Well under \$2/month budget! ✓${NC}"
echo ""

read -p "Continue with S3 setup? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

# Create S3 bucket
echo -e "${YELLOW}📦 Creating S3 bucket: ${S3_BUCKET}${NC}"

if aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null; then
    echo -e "${GREEN}✓ Bucket already exists${NC}"
else
    if [[ "${AWS_REGION}" == "us-east-1" ]]; then
        aws s3api create-bucket \
            --bucket "${S3_BUCKET}" \
            --region "${AWS_REGION}"
    else
        aws s3api create-bucket \
            --bucket "${S3_BUCKET}" \
            --region "${AWS_REGION}" \
            --create-bucket-configuration LocationConstraint="${AWS_REGION}"
    fi
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Enable versioning
echo -e "${YELLOW}🔄 Enabling versioning...${NC}"
aws s3api put-bucket-versioning \
    --bucket "${S3_BUCKET}" \
    --versioning-configuration Status=Enabled \
    --region "${AWS_REGION}"
echo -e "${GREEN}✓ Versioning enabled${NC}"

# Enable encryption
echo -e "${YELLOW}🔐 Enabling encryption...${NC}"
aws s3api put-bucket-encryption \
    --bucket "${S3_BUCKET}" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }' \
    --region "${AWS_REGION}"
echo -e "${GREEN}✓ Encryption enabled (AES256)${NC}"

# Create lifecycle policy
echo -e "${YELLOW}⏰ Creating lifecycle policy...${NC}"

cat > /tmp/s3-lifecycle-policy.json <<'EOF'
{
    "Rules": [
        {
            "Id": "DailyBackupTransition",
            "Status": "Enabled",
            "Prefix": "backups/daily/",
            "Transitions": [
                {
                    "Days": 7,
                    "StorageClass": "STANDARD_IA"
                }
            ],
            "Expiration": {
                "Days": 30
            }
        },
        {
            "Id": "WeeklyBackupTransition",
            "Status": "Enabled",
            "Prefix": "backups/weekly/",
            "Transitions": [
                {
                    "Days": 0,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 30,
                    "StorageClass": "GLACIER_IR"
                }
            ],
            "Expiration": {
                "Days": 120
            }
        },
        {
            "Id": "MonthlyBackupTransition",
            "Status": "Enabled",
            "Prefix": "backups/monthly/",
            "Transitions": [
                {
                    "Days": 0,
                    "StorageClass": "GLACIER_IR"
                },
                {
                    "Days": 90,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 365
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "${S3_BUCKET}" \
    --lifecycle-configuration file:///tmp/s3-lifecycle-policy.json \
    --region "${AWS_REGION}"

rm /tmp/s3-lifecycle-policy.json
echo -e "${GREEN}✓ Lifecycle policy created${NC}"

# Create bucket policy for secure access
echo -e "${YELLOW}🔒 Setting bucket policy...${NC}"

cat > /tmp/s3-bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyUnencryptedObjectUploads",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET}/*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-server-side-encryption": "AES256"
                }
            }
        },
        {
            "Sid": "DenyInsecureTransport",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::${S3_BUCKET}",
                "arn:aws:s3:::${S3_BUCKET}/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "${S3_BUCKET}" \
    --policy file:///tmp/s3-bucket-policy.json \
    --region "${AWS_REGION}"

rm /tmp/s3-bucket-policy.json
echo -e "${GREEN}✓ Bucket policy set${NC}"

# Block public access
echo -e "${YELLOW}🚫 Blocking public access...${NC}"
aws s3api put-public-access-block \
    --bucket "${S3_BUCKET}" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region "${AWS_REGION}"
echo -e "${GREEN}✓ Public access blocked${NC}"

# Create IAM policy for backup script (optional)
echo ""
echo -e "${YELLOW}📋 IAM Policy for Backup User (optional):${NC}"
echo ""
echo "You can create a dedicated IAM user for backups with this policy:"
echo ""
cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${S3_BUCKET}",
                "arn:aws:s3:::${S3_BUCKET}/*"
            ]
        }
    ]
}
EOF
echo ""

# Test upload
echo -e "${YELLOW}🧪 Testing S3 access...${NC}"
echo "test" > /tmp/s3-test.txt
if aws s3 cp /tmp/s3-test.txt "s3://${S3_BUCKET}/test.txt" --region "${AWS_REGION}" 2>/dev/null; then
    aws s3 rm "s3://${S3_BUCKET}/test.txt" --region "${AWS_REGION}" 2>/dev/null
    rm /tmp/s3-test.txt
    echo -e "${GREEN}✓ S3 upload test successful${NC}"
else
    echo -e "${RED}❌ S3 upload test failed${NC}"
    exit 1
fi

# Configuration summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Setup Complete!               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}S3 Configuration:${NC}"
echo -e "  Bucket:       ${S3_BUCKET}"
echo -e "  Region:       ${AWS_REGION}"
echo -e "  Versioning:   Enabled"
echo -e "  Encryption:   AES256"
echo -e "  Public Access: Blocked"
echo ""
echo -e "${GREEN}Lifecycle Policies:${NC}"
echo -e "  Daily backups:   7 days Standard → 30 days retention"
echo -e "  Weekly backups:  Instant IA → 30 days Glacier → 120 days retention"
echo -e "  Monthly backups: Instant Glacier → 90 days Deep Archive → 365 days retention"
echo ""
echo -e "${GREEN}Enable S3 backups in automation:${NC}"
echo -e "  1. On production server: ${YELLOW}sudo nano /opt/smartfarm/.env${NC}"
echo -e "  2. Add these lines:"
echo ""
echo -e "     ${BLUE}S3_ENABLED=true${NC}"
echo -e "     ${BLUE}S3_BUCKET=${S3_BUCKET}${NC}"
echo -e "     ${BLUE}AWS_REGION=${AWS_REGION}${NC}"
echo ""
echo -e "  3. Ensure AWS credentials are configured on the server"
echo ""
echo -e "${GREEN}Estimated cost: < \$0.25/month ✓${NC}"
echo ""

exit 0
