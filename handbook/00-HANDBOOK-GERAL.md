# Handbook Geral - HC GeoGestão (Sistema Autônomo)

Este documento centraliza a visão técnica e operacional do ecossistema **HC GeoGestão**, agora totalmente migrado para uma infraestrutura própria (Self-Hosted) via Docker, eliminando a dependência do Supabase Cloud.

---

## 1. Visão Geral da Arquitetura (Produção)

O sistema opera de forma orquestrada através de containers Docker, divididos em quatro pilares principais, acessíveis via HTTPS:

### 1.1 Domínios e Acesso
- **Painel Administrativo (Front-end):** [hcgeo.nikoscience.tech](https://hcgeo.nikoscience.tech)
- **API Backend (REST):** [api-hcgeo.nikoscience.tech](https://api-hcgeo.nikoscience.tech)
- **Segurança:** Todos os acessos são protegidos por certificados SSL (Let's Encrypt), gerenciados automaticamente via **Certbot**.

### 1.2 Componentes do Sistema (Docker)
- **`proxy` (Nginx):** O "guarda" da entrada. Redireciona o tráfego dos subdomínios para os containers corretos e gerencia o HTTPS.
- **`frontend` (React/Vite):** Interface do usuário servida via Nginx interno (porta 80).
- **`api` (Node.js/Express):** O motor de lógica e autenticação (JWT). Conecta-se diretamente ao banco de dados.
- **`db` (PostgreSQL 16):** Banco de dados relacional onde residem todos os dados (Leads, Clientes, Financeiro, etc.).

---

## 2. Fluxo de Desenvolvimento e Deploy (CI/CD)

Não realizamos mais builds manuais ou cópias de arquivos via FTP. Utilizamos um pipeline baseado em **Makefile** e **Docker Hub**.

### 2.1 Comandos Principais (Local)
Para trabalhar no projeto, utilize os atalhos do `Makefile` na raiz:
- `make build`: Compila as imagens localmente com as configurações de produção.
- `make push`: Envia as imagens compiladas para o Docker Hub (`borbanicolas`).
- `make deploy TAG=v1.0.X`: O comando "mágico". Faz o build, o push e já envia o arquivo `docker-compose.yml` atualizado para a VPS via SCP.

### 2.2 Rodando Localmente (WSL)
Para testar e desenvolver no seu computador:
```bash
docker compose up -d --build
```
> [!TIP]
> O ambiente local está configurado com **Hot-Reload**. Qualquer alteração feita no código da API (`hcgeogestao-api/src`) é refletida instantaneamente no container sem necessidade de reiniciar.

---

## 3. Configurações e Segredos (.env)

O sistema utiliza variáveis de ambiente para se portar de forma diferente em cada ambiente.

### 3.1 Variáveis Críticas
- `VITE_API_URL`: Aponta o front-end para a API correta.
- `CORS_ORIGIN`: Autoriza o front-end a conversar com a API de forma segura.
- `GOOGLE_PLACES_API_KEY`: Chave necessária para o funcionamento do **Search Engine (Buscador de Leads)**.

---

## 4. Guia de Documentos Relacionados

Para detalhes profundos, consulte os outros arquivos deste handbook:
- [08. Banco de Dados](file:///\\wsl.localhost\Ubuntu-24.04\home\nicolas\nikoscience\hcgeogestao\handbook\08-banco-de-dados.md): Estrutura de tabelas e schemas.
- [09. Infraestrutura e Automação](file:///\\wsl.localhost\Ubuntu-24.04\home\nicolas\nikoscience\hcgeogestao\handbook\09-infra-e-automacao.md): Detalhes do Nginx, Certbot e ciclo de deploy.

---
**Atualizado em: 06/04/2026**
