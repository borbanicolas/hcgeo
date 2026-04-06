# Análise de Segurança de Dados - HC GeoGestão

Esta documentação detalha a situação atual e um conjunto de boas práticas e melhorias de segurança de dados para proteger tanto o banco de dados quanto os dados trafegados entre Front-End e Back-End.

---

## 1. Implementações Entregues (Sessão de 1 Hora)

Como parte imediata das melhorias, o sistema de autenticação foi modificado em ambas as pontas para **forçar a expiração das contas em uso para 1 Hora**:

*   **No Backend (`hcgeogestao-api/src/routes/auth.js`):** A variável `TOKEN_EXPIRY` que por padrão do JWT gera um token de `7d` (7 dias) foi **reconfigurada para emitir o JWT válido por estritamente `1h`** (`expires_in: 3600`).
*   **No Frontend (`hcgeogestao/src/hooks/useAuth.ts`):** O hook de autenticação principal foi alterado para analisar (`decode`) o payload do Token JWT e comparar o campo `exp` da assinatura. Se a data atual exceder o tempo de vida, ele limpa o `localStorage` sozinho, derrubando imediatamente o acesso.

### Recompilando o Backend (Necessário)
Uma vez que esta configuração opera dentro do escopo fechado do container `api` do Docker, recompile para vigorar:
```bash
docker-compose down
docker-compose up --build -d
```

---

## 2. Relatório Analítico: Onde podemos melhorar a segurança?

Para garantir que nenhuma invasão cause exposição de dados corporativos (Leads, Clientes, Obras e Propostas), sugiro as seguintes ações:

### 2.1. Variáveis de Ambiente e Credenciais Vazadas
**Situação:** Atualmente, as credenciais `POSTGRES_PASSWORD` e o `JWT_SECRET` se encontram em plain-text no arquivo genérico `.env` e repetidos como fallback (`|| 'super_secret...'`) dentro do próprio código fonte (`auth.js` e `docker-compose.yml`).
**Melhoria e Plano de Ação:**
1.  **Limpar o Fallback do código-fonte:** Remover as chaves hard-coded no JS e no Compose. O sistema DEVE explodir (crashar) se subir sem um \`.env\` forte.
2.  **Gerar JWT forte:** O JWT deve se usar uma string alfanumérica criptografada aleatória longa (ex: `openssl rand -hex 32` > `9a2b5e...`).
3.  **Proteger o Banco de Dados:** A senha do DB não pode ser `hcgeo_secret_2026`.

### 2.2. SSL / HTTPS Nginx Reverso
**Situação:** O tráfego do React -> API no ambiente real de **VPS** precisa correr obrigatoriamente sob protocolo `HTTPS` validado. Sem isso, os tokens JWT e as senhas de login inseridas em tela trafegam sem criptografia através do servidor host. Modificações Man in the Middle (MITM) podem interceptá-los rapidamente na web de fora.
**Ponto de Ação:**
1.  Ajustaremos um proxy reverso frontal (Nginx nativo ou Traefik) por trás do domínio configurado (ex: painel.hcgeo.com.br).
2.  Implementaremos o Certbot para Let's Encrypt certificados digitais válidos e forçar redirecionamento HTTP para HTTPS na porta 80 e 443.

### 2.3. Rastreamento e Prevenção de Injeção SQL & XSS
**Situação Atual do Docker DB:** O banco PostgreSQL foi levantado com acesso total. `node-postgres` nativo tem tratativas de array binding `($1, $2)`, que previne SQL Injection razoavelmente.
**Ponto de Ação:** 
1. Adicionar middlewares (`helmet` e bibliotecas `xss-clean` / `hpp`) no `express` em `index.js`. Essas dependências fecham frestas abertas em Headers de chamadas de requisição por curiosos ou invasores que exploram XSS ou falsificação de requests.
2.  Desativar console e logs excessivos das requisições com dados cruciais do cliente que possivelmente iriam para a tela "Terminal" exposta no ambiente Node.

### 2.4. Autorização Avançada e Roles (Controle de Acessos)
**Melhoria Ideal:** No momento, há um único nível de `auth_users`. Criar Perfis de Acesso (Ex: Consultor, Financeiro, Admin), de forma que a API **feche e trave rotas** como deleções financeiras para qualquer `user_id` sem a função de Gestor/Admin. Atualmente quem estiver logado possui autoridade master caso as rotas fiquem conhecidas.

### 2.5. Senhas e Dados Sensíveis Hardcoded no Front-end (URGENTE)
**Situação:** Foi identificada uma vulnerabilidade grave no arquivo `src/pages/Financeiro.tsx`, onde a senha de acesso ao módulo financeiro (`G@lves05`) está escrita em texto limpo ("chumbada") direto no código fonte do componente (`const SENHA_FINANCEIRO = "G@lves05";`).
Mesmo que a interface oculte a aba sem a senha, qualquer usuário com conhecimento mínimo de navegação (apertando F12 e inspecionando o código JavaScript na aba *Sources*) pode ler esta senha e destravar a tela bancária. Isso anula completamente o propósito da trava. O mesmo alerta vale para variáveis de `import.meta.env` que, quando compiladas pelo Vite, tornam-se visíveis no navegador.
**Ponto de Ação:** 
1. **Remover Imediatamente** a constante `SENHA_FINANCEIRO` do código do painel React na nossa próxima etapa de refatoração de segurança.
2. Trocar este "Password Gate" inseguro por **Comunicação Segura de API Backend**. O Front-end passará a captar o que o usuário digitou e enviar cego para uma rota `POST /api/verify-finance-access`. O Back-end (que é invisível ao navegador) fará a checagem com o Banco de Dados ou `.env` e responderá apenas com `Atorizado: True/False`.
3. Idealmente, cruzar isso com o ponto 2.4 (Roles), onde apenas contas criadas para a equipe financeira terão privilégio de renderizar a visualização das métricas.
