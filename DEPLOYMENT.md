# Glory Simon Interiors — Production Deployment Guide

This document describes the steps required to deploy the **Glory Simon Interiors - Site Visit Booking System** backend API and frontend SPA to a production environment (such as an AWS EC2 instance, DigitalOcean Droplet, VPS, or similar).

---

## 📋 Production Architecture Overview

The production setup consists of:
1. **Frontend**: React (Vite) static build files served via **Nginx**.
2. **Backend**: Express app managed by **PM2** process manager, running on `localhost:5000`.
3. **Reverse Proxy & TLS**: Nginx acting as a reverse proxy routing `/api` to the backend Express server, with SSL/TLS certificates provided by **Let's Encrypt** (`certbot`).
4. **Database**: **MySQL 8.0** server instance with active connection pool configurations.

---

## 🛠️ Step 1: Server Provisioning & Setup

Log in to your server and install the necessary dependencies:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (Version 18.x or 20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git, MySQL Client, Nginx, and Certbot
sudo apt-get install -y git Nginx mysql-server certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install pm2 -g
```

---

## 🗄️ Step 2: Database Initialization

1. Log into MySQL shell:
   ```bash
   sudo mysql -u root
   ```
2. Create database and dedicated database user:
   ```sql
   CREATE DATABASE glory_simon_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'glory_user'@'localhost' IDENTIFIED BY 'production_strong_password_here';
   GRANT ALL PRIVILEGES ON glory_simon_booking.* TO 'glory_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Load the MySQL schema:
   ```bash
   mysql -u glory_user -p glory_simon_booking < backend/database.sql
   ```

---

## 🔌 Step 3: Backend Deployment & PM2 Setup

1. Copy the repository files to your deployment directory (e.g., `/var/www/glory-simon-booking`).
2. Navigate to the backend directory and configure the environment variables:
   ```bash
   cd /var/www/glory-simon-booking/backend
   npm install --production
   cp .env.example .env
   nano .env
   ```
   *Modify the production environment configurations:*
   - Set `NODE_ENV=production`
   - Set `DB_HOST=localhost`
   - Set `DB_USER=glory_user`
   - Set `DB_PASSWORD=production_strong_password_here`
   - Set `DB_NAME=glory_simon_booking`
   - Set `JWT_SECRET` to a cryptographically secure 64-character string.
   - Enter your production SMTP mail and Firebase Admin SDK service account credentials.

3. Start the API server via **PM2**:
   ```bash
   pm2 start src/app.js --name "glory-simon-api"
   pm2 save
   pm2 startup
   ```
   This ensures the Express API server restarts automatically on system reboots or crash incidents.

---

## 🌐 Step 4: Frontend Static Compilation

1. Navigate to the frontend directory:
   ```bash
   cd /var/www/glory-simon-booking/frontend
   npm install
   ```
2. Configure the production API base URL by creating a `.env.production` file:
   ```env
   VITE_API_BASE_URL=https://yourdomain.com/api
   ```
3. Build the static production bundle:
   ```bash
   npm run build
   ```
   This creates a optimized `dist` folder containing HTML, CSS, and JS assets.

---

## 🖥️ Step 5: Nginx Configuration

Create a new Nginx block configuration to server the frontend assets and reverse proxy the `/api` route:

1. Create a server block:
   ```bash
   sudo nano /etc/nginx/sites-available/glory-simon
   ```
2. Paste the following configuration (replace `yourdomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Frontend Static Files
       root /var/www/glory-simon-booking/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Backend API Proxy
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Error Logging
       error_log  /var/log/nginx/glory-simon-error.log error;
       access_log /var/log/nginx/glory-simon-access.log;
   }
   ```
3. Enable the site configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/glory-simon /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🔒 Step 6: Enable HTTPS SSL Certificate

Use Let's Encrypt to provision a free, auto-renewing SSL certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Select the option to **Redirect HTTP traffic to HTTPS**. Nginx will automatically be reconfigured.

---

## ⚙️ Maintenance & Logs Checking

To view production backend logs:
```bash
pm2 logs glory-simon-api
```

To monitor resource utilization:
```bash
pm2 monit
```

To check Nginx error logs:
```bash
sudo tail -f /var/log/nginx/glory-simon-error.log
```
