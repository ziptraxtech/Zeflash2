# EC2 Backend Deployment Guide

## Prerequisites
- EC2 instance running at `3.90.162.23`
- Docker installed on EC2
- AWS CLI configured with ECR access
- Security group allows port 3000 inbound

## Option 1: Quick Deployment (Single Command)

SSH into your EC2 instance and run:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com

# Pull and run the backend
docker run -d \
  --name zeflash-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e ML_BACKEND_URL="http://localhost:8000" \
  -e S3_BUCKET="battery-ml-results-test" \
  -e AWS_REGION="us-east-1" \
  --restart unless-stopped \
  070872471952.dkr.ecr.us-east-1.amazonaws.com/battery-ml:ec2-backend

# Verify it's running
curl http://localhost:3000/health
```

## Option 2: Using Docker Compose

On EC2, create `/opt/zeflash/docker-compose.yml` with the content from `docker-compose-ec2.yml`, then:

```bash
docker compose -f /opt/zeflash/docker-compose.yml up -d
```

## Option 3: Using Deployment Script

Copy `deploy-to-ec2.sh` to your EC2:

```bash
scp -i your-key.pem deploy-to-ec2.sh ec2-user@3.90.162.23:/tmp/
ssh -i your-key.pem ec2-user@3.90.162.23
chmod +x /tmp/deploy-to-ec2.sh
/tmp/deploy-to-ec2.sh
```

## Useful EC2 Commands

### Check container status
```bash
docker ps | grep zeflash-backend
```

### View logs
```bash
docker logs -f zeflash-backend
```

### Restart container
```bash
docker restart zeflash-backend
```

### Stop and remove container
```bash
docker stop zeflash-backend
docker rm zeflash-backend
```

### Health check
```bash
curl http://3.90.162.23:3000/health
```

## Update Vercel Frontend

Once the backend is running on EC2, update your Vercel environment variables:

```
VITE_API_BASE=http://3.90.162.23:3000
```

Or if you have a domain pointing to the EC2 IP:
```
VITE_API_BASE=https://yourdomain.com:3000
```

## AWS Credentials on EC2

The EC2 instance needs IAM permissions to pull from ECR. Ensure the EC2 role has:
- `ecr:GetAuthorizationToken`
- `ecr:BatchGetImage`
- `ecr:GetDownloadUrlForLayer`

## CloudWatch Logs

If container logs are configured with awslogs driver, view them:

```bash
aws logs tail /ec2/zeflash-backend --follow
```

## Troubleshooting

### Container won't start
```bash
docker logs zeflash-backend
```

### ECR authentication fails
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 070872471952.dkr.ecr.us-east-1.amazonaws.com
```

### Port already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Container health check failing
Check if backend is actually running inside container:
```bash
docker exec zeflash-backend curl http://localhost:3000/health
```

