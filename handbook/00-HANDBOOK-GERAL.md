# Handbook Geral - HC GeoGestão (Sistema Autônomo)
cd /opt/hcgeo
docker compose up -d --build
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

## 2. Fluxo de Deploy (Git-First)

O deploy é feito de forma síncrona através do repositório Git:

1. **Local:** O desenvolvedor envia o código para o GitHub (`git push`).
2. **VPS:** O servidor puxa o código novo (`git pull`).
3. **Rebuild:** O comando `docker compose up -d --build` reconstrói as imagens localmente na VPS.

> [!NOTE]
> Este método é mais simples e dispensa o uso de um Registro de Imagens externo (como Docker Hub), mas exige que a VPS compile o Front-end (Vite), o que pode levar alguns minutos.

---

### 2.2 Rodando Localmente (WSL)
Para desenvolver no seu computador, o fluxo continua com alta velocidade:
```bash
docker compose up -d --build
```
> [!TIP]
> O ambiente local usa **Hot-Reload** (montagem de volumes). As alterações na API são refletidas na hora, sem precisar de build!

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
- [10. Correções de Datas e Uploads](file:///\\wsl.localhost\Ubuntu-24.04\home\nicolas\nikoscience\hcgeogestao\handbook\10-correcoes-data-e-arquivos.md): Histórico de correções críticas em datas, armazenamento e links de arquivos.

---
**Atualizado em: 06/04/2026**


docker exec -it hcgeo-db psql -U hcgeo -d hcgeogestao -c "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0, ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;"



docker exec -it hcgeo-db psql -U hcgeo -d hcgeogestao -c "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS last_failed_ip TEXT;"
```_
​
