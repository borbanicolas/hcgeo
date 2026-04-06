# Configurações do Registro
REGISTRY_USER = borbanicolas
PROJECT_NAME = hcgeo
TAG ?= latest

# Imagens
FRONTEND_IMAGE = $(REGISTRY_USER)/$(PROJECT_NAME)-frontend
API_IMAGE = $(REGISTRY_USER)/$(PROJECT_NAME)-api

# Argumentos de Build
VITE_API_URL = https://api-hcgeo.nikoscience.tech
CORS_ORIGIN = https://hcgeo.nikoscience.tech

# Configurações do Servidor (VPS)
VPS_USER = root
VPS_HOST = 185.252.233.201
VPS_PATH = /opt/hcgeo

.PHONY: build-frontend build-api push-frontend push-api build push release help deploy-config

help:
	@echo "Comandos disponíveis:"
	@echo "  make build             - Compila ambas as imagens (frontend e api)"
	@echo "  make push              - Envia ambas as imagens para o Docker Hub"
	@echo "  make release TAG=v1.0  - Compila e envia com uma TAG específica (padrão: latest)"
	@echo "  make build-frontend    - Compila apenas o frontend"
	@echo "  make build-api         - Compila apenas a api"

# --- BUILD ---

build-frontend:
	docker build --build-arg VITE_API_URL=$(VITE_API_URL) \
		-t $(FRONTEND_IMAGE):$(TAG) \
		-t $(FRONTEND_IMAGE):latest \
		./hcgeogestao

build-api:
	docker build --build-arg CORS_ORIGIN=$(CORS_ORIGIN) \
		-t $(API_IMAGE):$(TAG) \
		-t $(API_IMAGE):latest \
		./hcgeogestao-api

build: build-frontend build-api

# --- PUSH ---

push-frontend:
	docker push $(FRONTEND_IMAGE):$(TAG)
	docker push $(FRONTEND_IMAGE):latest

push-api:
	docker push $(API_IMAGE):$(TAG)
	docker push $(API_IMAGE):latest

push: push-frontend push-api

# --- RELEASE ---

# --- DEPLOY ---

deploy-config:
	@echo "📤 Enviando arquivos de configuração para VPS ($(VPS_HOST))..."
	scp docker-compose.yml $(VPS_USER)@$(VPS_HOST):$(VPS_PATH)/
	scp .env $(VPS_USER)@$(VPS_HOST):$(VPS_PATH)/
	@echo "✅ Arquivos enviados com sucesso!"

deploy: release deploy-config
	@echo "🚀 Build, Push e Config enviados! Agora rode 'docker compose pull && docker compose up -d' na VPS."
