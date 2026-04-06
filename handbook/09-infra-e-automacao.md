# Infraestrutura e Automação (CI/CD) — HC GeoGestão

Este capítulo detalha como o sistema é construído e entregue em produção, garantindo estabilidade e escalabilidade.

---

## 1. Pipeline de Build e Tagging

Utilizamos o Docker para garantir que o código que roda no computador do desenvolvedor seja o mesmo que roda no servidor.

### 1.1 Makefile (O Motor)
O arquivo `Makefile` na raiz abstrai a complexidade do Docker. 
- **Build-Args:** O Makefile passa automaticamente URLs de produção (`api-hcgeo.nikoscience.tech`) durante a compilação do front-end, garantindo que o bundle de produção não dependa de `localhost`.
- **Múltiplas Tags:** Cada build gera uma imagem com a tag específica (`v1.0.X`) e também atualiza a tag `latest`.

---

## 2. Fluxo de Deploy (Git-First)

O deploy é feito de forma síncrona através do repositório Git, eliminando a dependência de um registro externo (Docker Hub).

1. **Local:** O desenvolvedor envia o código para o GitHub (`git add . && git commit && git push`).
2. **VPS:** O servidor puxa as novas alterações (`cd /opt/hcgeo && git pull`).
3. **Rebuild:** O comando `docker compose up -d --build` reconstrói as imagens localmente no hardware da VPS usando o código recém-baixado.

> [!NOTE]
> Este método garante que o código na VPS seja sempre idêntico ao do repositório Git, mas requer que a VPS tenha capacidade de processamento para rodar o build do Vite (Front-end).

---

## 3. Servidor de Produção (VPS)

A produção reside em um servidor Linux com a seguinte configuração:

### 3.1 Nginx Proxy Manager (Manual)
O container `proxy` atua como um gerenciador de tráfego. O arquivo de configuração em `./nginx-proxy/default.conf` define o roteamento:
- `hcgeo.nikoscience.tech` → Encaminha para o container `frontend` (porta 80).
- `api-hcgeo.nikoscience.tech` → Encaminha para o container `api` (porta 3000).

### 3.2 SSL e Certificados
Usamos o **Certbot** em modo container.
- **Auto-renovação:** O container Certbot roda em background e verifica a validade do certificado a cada 12 horas.
- **Desafio HTTP-01:** O desafio de domínio é resolvido através da pasta `./certbot/www`, mapeada no Apache/Nginx.

---

## 4. Otimização em Desenvolvimento (Local)

Para agilizar o trabalho, o `docker-compose.yml` local tem comportamentos diferentes:
- **Hot-Reload:** Mapeamos `./hcgeogestao-api:/app`. Isso significa que, ao salvar um arquivo de código, o servidor `node --watch` reinicia instantaneamente dentro do container.
- **Node Modules Privado:** Usamos `- /app/node_modules` como volume anônimo para que as dependências do container (Linux) não entrem em conflito com as do seu computador (Windows/macOS).

---

## 5. Lead Search Engine (Novidade)

Adicionamos a capacidade de buscar leads diretamente do Google Maps.
- **API Utilizada:** Google Places API (New).
- **Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`.
- **Segurança:** A chave de API é mantida apenas no servidor (variável `GOOGLE_PLACES_API_KEY`) e nunca é exposta diretamente no código do Front-end.

---
**Atualizado em: 06/04/2026**
