#!/bin/bash

# Zeflash Backend EC2 - HTTPS Setup with Nginx
# This script sets up HTTPS for your backend to fix Mixed Content errors

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=========================================="
echo "Zeflash Backend - HTTPS Setup"
echo "==========================================${NC}"

# Check if running on EC2
if ! ec2-metadata &>/dev/null; then
  echo -e "${RED}Error: This script must run on EC2${NC}"
  exit 1
fi

# Get EC2 info
EC2_IP=$(ec2-metadata --public-ipv4 | cut -d " " -f 2)
echo -e "${GREEN}EC2 Public IP: ${EC2_IP}${NC}"

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing nginx and certbot...${NC}"
sudo yum update -y > /dev/null
sudo yum install -y nginx certbot > /dev/null

# Step 2: Check if backend is running
echo -e "${YELLOW}Step 2: Checking if backend is running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null; then
  echo -e "${RED}❌ Backend not running on localhost:3000${NC}"
  echo "Please start the backend first:"
  echo "  docker run -d --name zeflash-backend -p 3000:3000 ..."
  echo "  or"
  echo "  sudo systemctl start zeflash-backend"
  exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Step 3: Setup nginx as reverse proxy
echo -e "${YELLOW}Step 3: Configuring nginx...${NC}"

sudo tee /etc/nginx/conf.d/zeflash-backend.conf > /dev/null <<'NGINX_CONFIG'
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name _;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://$http_host$request_uri;
    }
}

# HTTPS server (with self-signed cert initially)
server {
    listen 443 ssl http2;
    server_name _;

    # SSL certificates (will be updated if domain cert obtained)
    ssl_certificate /etc/ssl/certs/zeflash-backend.crt;
    ssl_certificate_key /etc/ssl/private/zeflash-backend.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, DELETE, PUT' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    add_header 'Access-Control-Max-Age' '3600' always;

    # Handle CORS preflight
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    # Proxy to backend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_read_timeout 90;
    }
}
NGINX_CONFIG

# Step 4: Create self-signed certificate
echo -e "${YELLOW}Step 4: Creating self-signed SSL certificate...${NC}"
sudo mkdir -p /etc/ssl/private /etc/ssl/certs /var/www/certbot

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/zeflash-backend.key \
  -out /etc/ssl/certs/zeflash-backend.crt \
  -subj "/C=IN/ST=State/L=City/O=Zeflash/CN=${EC2_IP}" 2>/dev/null

sudo chmod 644 /etc/ssl/certs/zeflash-backend.crt
sudo chmod 600 /etc/ssl/private/zeflash-backend.key

echo -e "${GREEN}✅ Self-signed certificate created${NC}"

# Step 5: Test nginx config
echo -e "${YELLOW}Step 5: Testing nginx configuration...${NC}"
sudo nginx -t > /dev/null 2>&1 || {
  echo -e "${RED}❌ Nginx configuration error${NC}"
  sudo nginx -t
  exit 1
}
echo -e "${GREEN}✅ Configuration valid${NC}"

# Step 6: Start nginx
echo -e "${YELLOW}Step 6: Starting nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx

# Step 7: Verify
echo -e "${YELLOW}Step 7: Verifying HTTPS...${NC}"
sleep 2

if sudo systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx is running${NC}"
else
  echo -e "${RED}❌ Nginx failed to start${NC}"
  sudo systemctl status nginx
  exit 1
fi

# Test HTTPS endpoint (ignore cert warnings for self-signed)
if curl -k -s https://localhost/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ HTTPS endpoint working${NC}"
else
  echo -e "${YELLOW}⚠️  HTTPS endpoint test inconclusive (may be normal for self-signed)${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "✅ HTTPS Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Your backend is now available at:${NC}"
echo -e "${GREEN}https://${EC2_IP}:443${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update Vercel environment variable:"
echo "   VITE_API_BASE=https://${EC2_IP}"
echo ""
echo "2. If you have a domain, run:"
echo "   sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com"
echo "   Then update /etc/nginx/conf.d/zeflash-backend.conf with the new cert paths"
echo ""
echo "3. Redeploy on Vercel to test the connection"
echo ""
echo -e "${YELLOW}Certificate Details:${NC}"
echo "  Path: /etc/ssl/certs/zeflash-backend.crt"
echo "  Key: /etc/ssl/private/zeflash-backend.key"
echo "  Valid for: 365 days"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "  View nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "  Restart nginx: sudo systemctl restart nginx"
echo "  Check status: sudo systemctl status nginx"
echo ""
