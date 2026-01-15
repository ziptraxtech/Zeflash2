#!/bin/bash

# Complete Automated Deployment Script

echo "======================================"
echo "Complete EC2 Deployment Automation"
echo "======================================"

# Check if instance info exists
if [ ! -f ec2-instance-info.txt ]; then
    echo "Error: ec2-instance-info.txt not found!"
    echo "Please run ./deploy-ec2.sh first"
    exit 1
fi

# Read instance info
PUBLIC_IP=$(grep "Public IP:" ec2-instance-info.txt | awk '{print $3}')
echo "Deploying to: $PUBLIC_IP"

# Create deployment package
echo "Creating deployment package..."
cd ..
tar -czf battery-ml-deploy.tar.gz \
    battery-ml-lambda/server.py \
    battery-ml-lambda/inference_pipeline.py \
    battery-ml-lambda/requirements.txt \
    battery-ml-lambda/.env \
    battery-ml-lambda/models/

# Upload deployment package
echo "Uploading application files..."
scp -i ~/.ssh/battery-ml-key.pem \
    -o StrictHostKeyChecking=no \
    battery-ml-deploy.tar.gz \
    ubuntu@$PUBLIC_IP:/home/ubuntu/

# Upload and run setup script
echo "Uploading setup script..."
scp -i ~/.ssh/battery-ml-key.pem \
    -o StrictHostKeyChecking=no \
    battery-ml-lambda/setup-server.sh \
    ubuntu@$PUBLIC_IP:/home/ubuntu/

# Run setup on server
echo "Running server setup..."
ssh -i ~/.ssh/battery-ml-key.pem \
    -o StrictHostKeyChecking=no \
    ubuntu@$PUBLIC_IP << 'ENDSSH'
    
    # Make setup script executable and run it
    chmod +x setup-server.sh
    ./setup-server.sh
    
    # Extract application files
    cd /home/ubuntu/battery-ml-backend
    tar -xzf /home/ubuntu/battery-ml-deploy.tar.gz
    mv battery-ml-lambda/* .
    
    # Start the service
    sudo systemctl daemon-reload
    sudo systemctl start battery-ml
    sudo systemctl enable battery-ml
    
    # Check status
    echo ""
    echo "Service status:"
    sudo systemctl status battery-ml --no-pager
    
    echo ""
    echo "Checking if API is responding..."
    sleep 5
    curl http://localhost:8000/docs || echo "API not yet ready"
ENDSSH

# Clean up
rm battery-ml-deploy.tar.gz

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo "API URL: http://$PUBLIC_IP:8000"
echo "API Docs: http://$PUBLIC_IP:8000/docs"
echo ""
echo "Test the API:"
echo "curl http://$PUBLIC_IP:8000/"
echo ""
echo "View logs:"
echo "ssh -i ~/.ssh/battery-ml-key.pem ubuntu@$PUBLIC_IP 'sudo journalctl -u battery-ml -f'"
echo ""
echo "Update your frontend .env with:"
echo "VITE_ML_API_URL=http://$PUBLIC_IP:8000"
