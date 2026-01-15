#!/bin/bash

# EC2 Deployment Script for Battery ML Backend

echo "======================================"
echo "AWS EC2 Deployment for Battery ML API"
echo "======================================"

# Set region
export AWS_DEFAULT_REGION=us-east-1

# Step 1: Create security group
echo "Step 1: Creating security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name battery-ml-backend-sg \
    --description "Security group for Battery ML backend server" \
    --output text 2>/dev/null || aws ec2 describe-security-groups \
    --group-names battery-ml-backend-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "Security Group ID: $SG_ID"

# Step 2: Add inbound rules (HTTP, HTTPS, SSH, Custom 8000)
echo "Step 2: Configuring security group rules..."
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "SSH rule already exists"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "HTTP rule already exists"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "HTTPS rule already exists"

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8000 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8000 rule already exists"

# Step 3: Create key pair if it doesn't exist
echo "Step 3: Creating key pair..."
if [ ! -f ~/.ssh/battery-ml-key.pem ]; then
    aws ec2 create-key-pair \
        --key-name battery-ml-key \
        --query 'KeyMaterial' \
        --output text > ~/.ssh/battery-ml-key.pem
    chmod 400 ~/.ssh/battery-ml-key.pem
    echo "Key pair created: ~/.ssh/battery-ml-key.pem"
else
    echo "Key pair already exists"
fi

# Step 4: Launch EC2 instance (Ubuntu 22.04 LTS, t2.medium for ML workloads)
echo "Step 4: Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0e2c8caa4b6378d8c \
    --instance-type t2.medium \
    --key-name battery-ml-key \
    --security-group-ids $SG_ID \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":20,\"VolumeType\":\"gp3\"}}]" \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=battery-ml-backend}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Step 5: Wait for instance to be running
echo "Step 5: Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Step 6: Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "======================================"
echo "EC2 Instance Created Successfully!"
echo "======================================"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH Command: ssh -i ~/.ssh/battery-ml-key.pem ubuntu@$PUBLIC_IP"
echo ""
echo "Waiting 30 seconds for instance to fully initialize..."
sleep 30

# Save instance details
cat > ec2-instance-info.txt <<EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Security Group: $SG_ID
Region: $AWS_DEFAULT_REGION
API URL: http://$PUBLIC_IP:8000
SSH: ssh -i ~/.ssh/battery-ml-key.pem ubuntu@$PUBLIC_IP
EOF

echo "Instance details saved to ec2-instance-info.txt"
echo ""
echo "Next: Run ./setup-server.sh to install and start the application"
