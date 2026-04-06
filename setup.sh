#!/bin/bash

# HC GeoGestão - Server Bootstrap Script
# This script installs Docker and Docker Compose on a fresh Ubuntu/Debian server.

set -e

echo "--- Starting Server Bootstrap ---"

# 1. Update system
echo "Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install prerequisites
echo "Installing prerequisites..."
apt-get install -y ca-certificates curl gnupg lsb-release

# 3. Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Install Docker Compose Plugin
echo "Installing Docker Compose Plugin..."
apt-get install -y docker-compose-plugin

# 5. Verify installation
echo "Checking versions..."
docker --version
docker compose version

# 6. Create project directory
mkdir -p /opt/hcgeo
cd /opt/hcgeo

echo "--- Bootstrap Complete! ---"
echo ""
echo "PROXIMOS PASSOS:"
echo "1. Envie seus arquivos para o servidor em /opt/hcgeo"
echo "   Dica: scp -r . root@185.252.233.201:/opt/hcgeo"
echo ""
echo "2. No servidor, dentro de /opt/hcgeo, rode o comando para subir tudo:"
echo "   docker compose up -d --build"
echo ""
echo "3. Para gerar o SSL (HTTPS) pela primeira vez, rode este comando:"
echo "   docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d hcgeo.nikoscience.tech -d api-hcgeo.nikoscience.tech"
echo ""
echo "4. Apos gerar o SSL, edite o nginx-proxy/default.conf para habilitar o HTTPS (porta 443)."
echo "   (Ou me peça para preparar a versao final do Nginx com SSL ja configurado!)"
