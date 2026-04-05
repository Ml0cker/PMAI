#!/bin/bash
set -e

# ==========================================
#  PMAI — First-time Server Setup
#  Run ONCE on the fresh Linux server
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/pmai"

echo "=========================================="
echo "  PMAI — Server Setup"
echo "=========================================="

# 1. Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    usermod -aG docker $USER
    echo -e "${GREEN}Docker installed.${NC}"
fi

# 2. Setup project directory
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}Updating existing deployment...${NC}"
    cd "$APP_DIR"
    git pull
else
    echo -e "${YELLOW}Setting up project directory...${NC}"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    git init
    # Configure git user (required for initial commit)
    git config user.email "deploy@pmai.fun"
    git config user.name "Deploy"
fi

# 3. Create production .env
if [ ! -f "docker/.env" ]; then
    echo -e "${YELLOW}Creating production .env...${NC}"
    cp docker/.env.example docker/.env

    read -p "Domain (default: pmai.fun): " DOMAIN
    DOMAIN=${DOMAIN:-pmai.fun}

    read -p "OpenRouter API key: " OPENROUTER_KEY

    DB_PASS=$(openssl rand -hex 16)

    sed -i "s|POSTGRES_PASSWORD=CHANGE_ME.*|POSTGRES_PASSWORD=$DB_PASS|g" docker/.env
    sed -i "s|OPENROUTER_API_KEY=sk-or-v1-xxxxx|OPENROUTER_API_KEY=$OPENROUTER_KEY|g" docker/.env
    echo "" >> docker/.env
    echo "DOMAIN=$DOMAIN" >> docker/.env

    # Update docker-compose DATABASE_URL with the generated password
    sed -i "s|pmai:pmai_dev@postgres|pmai:$DB_PASS@postgres|g" docker/docker-compose.yml

    echo -e "${GREEN}.env created with random DB password.${NC}"
else
    echo -e "${GREEN}.env already exists, skipping.${NC}"
fi

# 4. Initial commit (so git pull works later)
git add -A
git commit -m "initial" --allow-empty 2>/dev/null || true

# 5. Build & Start
echo -e "${YELLOW}Building Docker images (this takes a few minutes)...${NC}"
docker compose -f docker/docker-compose.yml build

echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker/docker-compose.yml up -d

# 6. Wait for DB + Redis
echo -e "${YELLOW}Waiting for database...${NC}"
sleep 5

# 7. DB migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker compose -f docker/docker-compose.yml exec -T api \
    npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss 2>/dev/null || \
docker compose -f docker/docker-compose.yml exec -T api \
    npx prisma db push --schema=packages/db/prisma/schema.prisma

# 8. Done
DOMAIN=$(grep DOMAIN docker/.env | tail -1 | cut -d= -f2)
echo ""
echo -e "${GREEN}=========================================="
echo "  Setup complete!"
echo "==========================================${NC}"
echo ""
docker compose -f docker/docker-compose.yml ps
echo ""
echo -e "  Site:   https://$DOMAIN"
echo -e "  Health: https://$DOMAIN/api/health"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Push your code to GitHub repo"
echo "  2. Add these secrets in GitHub repo Settings → Secrets:"
echo "     SERVER_HOST  = server IP"
echo "     SERVER_USER  = root (or your SSH user)"
echo "     SERVER_SSH_KEY = your private SSH key"
echo "  3. Every push to main will auto-deploy"
echo ""
echo -e "Or deploy manually: ${YELLOW}npm run deploy${NC}"
