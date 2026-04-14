# 🔒 HTTPS Setup for EC2 Backend - Quick Start

Your backend is returning **Mixed Content** error because the frontend (HTTPS) is trying to access the backend (HTTP).

## ✅ Quick Fix Steps

### Step 1: SSH into Your EC2

```bash
ssh -i your-aws-key.pem ec2-user@3.90.162.23
```

### Step 2: Run the HTTPS Setup Script

Copy and paste this command:

```bash
curl -s https://raw.githubusercontent.com/ziptraxtech/Zeflash2/main/setup-https-ec2.sh | bash
```

Or if that doesn't work, manually:

```bash
# Download the script
wget https://raw.githubusercontent.com/ziptraxtech/Zeflash2/main/setup-https-ec2.sh
chmod +x setup-https-ec2.sh

# Run it
sudo ./setup-https-ec2.sh
```

### Step 3: Wait for Completion

The script will:
- ✅ Install nginx and certbot
- ✅ Check if backend is running (port 3000)
- ✅ Create a self-signed SSL certificate
- ✅ Configure nginx as HTTPS reverse proxy
- ✅ Start the services
- ✅ Give you the new URL

### Step 4: Update Vercel

When the script finishes, it will show:
```
Your backend is now available at:
https://3.90.162.23
```

**On Vercel Dashboard:**
1. Settings → Environment Variables
2. Update: `VITE_API_BASE=https://3.90.162.23`
3. Redeploy

### Step 5: Test

In your browser developer tools, verify:
```
GET https://3.90.162.23/health
```

Should return:
```json
{"status":"ok","service":"zeflash-backend","timestamp":"..."}
```

---

## 🔐 Using a Real Domain (Optional but Recommended)

Once everything works, get a real SSL certificate:

```bash
# On EC2, after running setup-https-ec2.sh:
sudo certbot certonly --webroot -w /var/www/certbot -d api.yourdomain.com

# Update Vercel:
VITE_API_BASE=https://api.yourdomain.com
```

---

## ❓ Troubleshooting

### Backend won't start
```bash
docker logs zeflash-backend
# or
sudo systemctl status zeflash-backend
```

### Nginx won't start
```bash
sudo nginx -t  # Check syntax
sudo tail -f /var/log/nginx/error.log  # View logs
```

### Still getting Mixed Content
```bash
# Verify HTTPS is working
curl -k https://localhost/health

# Verify Vercel has the new VITE_API_BASE
# (might need to redeploy)
```

### Certificate issues
```bash
# View certificate
sudo openssl x509 -in /etc/ssl/certs/zeflash-backend.crt -text -noout

# Regenerate
sudo ./setup-https-ec2.sh
```

---

## 🚀 What the Script Does

1. **Installs nginx** - Acts as a reverse proxy with HTTPS
2. **Creates SSL certificate** - Self-signed for immediate testing
3. **Configures reverse proxy** - Maps HTTPS to your backend port 3000
4. **Handles HTTP redirect** - All HTTP requests → HTTPS
5. **Adds CORS headers** - So frontend can communicate
6. **Enables TLS 1.2+** - Secure modern protocols

---

## 📝 Before Running

Make sure:
- [ ] SSH access to EC2 works
- [ ] Backend is running on port 3000
- [ ] You have internet access on EC2
- [ ] Port 443 (HTTPS) is open in security group

---

**Ready? Run the script and test!** 🎉
