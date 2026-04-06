# Arquitetura e Estrutura do Banco de Dados (PostgreSQL + Docker)

Este documento descreve como o banco de dados do HC GeoGestão funciona atualmente após a migração do serviço em nuvem hospedado da Supabase (Cloud) para nossa infraestrutura local "On-Premise" / Docker, orquestrada por uma API Express customizada.

---

## 1. Visão Geral da Infraestrutura

1. **O Motor:** O sistema agora roda em cima da imagem oficial do [PostgreSQL v15](https://hub.docker.com/_/postgres) através do container `hcgeogestao-db`.
2. **O Driver:** O NodeJS (Express Server) dentro do container `hcgeogestao-api` comunica-se de forma direta com o banco de dados utilizando a biblioteca leve e de alta performance `pg` (node-postgres).
3. **Migração Automática (Auto-Migration):** Em vez de mantermos arquivos `.sql` antigos de migração (como os que a antiga pasta `/supabase` usava), toda a estrutura básica das tabelas principais e regras de segurança foi transcrita para JavaScript no arquivo raiz da API (`hcgeogestao-api/src/index.js`). Sempre que a API sobe, ela executa instruções cegas e seguras do tipo `CREATE TABLE IF NOT EXISTS`, garantindo a sanidade das estruturas fundamentais.

---

## 2. Tabelas Core (Motor Base)

O ecossistema é suportado por 3 macro-pilares essenciais que substituem a infraestrutura que antes era invisível da Supabase:

### A) Segurança e Credenciais (`auth_users` e `sys_roles`)
Sem a ferramenta "Auth" do Supabase, o sistema agora gerencia os logins no próprio código usando hash BCrypt para senhas e codificação JWT.
- **`sys_roles`**: Dita os privilégios. As categorias fixas instaladas pelo sistema são:
    1. **`admin`**: Acesso completo a todas as tabelas em todas as rotas e liberação à tela de rastreio de logs de ações.
    2. **`financeiro`**: Pode bater à porta do módulo Cofre (necessitando senha especial contida no `.env`) para lidar com caixa da empresa.
    3. **`user`**: Acesso genérico e básico a apenas os dados de sua propriedade (`user_id`).
- **`auth_users`**: Registra e mapeia os e-mails e a string gigantesca em hash das senhas dos funcionários. Todos os usuários são obrigatoriamente vinculados a um Role (por padrão criado como `user`).

### B) Rastreabilidade Corporativa (`sys_audit_logs`)
Esta tabela funciona como uma caixa-preta contínua do sistema. Ela escuta todas as ações críticas em segundo-plano e serve ao Painel de Acessos do Admin.
- **Campos arquivados:** 
  - `user_id` (quem fez)
  - `action` (INSERT, UPDATE, DELETE)
  - `table_name` (onde a ação ocorreu)
  - `details` (logs ricos do que de fato mudou ou foi tocado)
  - `ip_address` (endereço da nuvem/roteador de onde partiu a ação).

---

## 3. Módulos / Entidades de Negócios (CRUD)

Muitas tabelas de negócio se conectam dinamicamente por uma rota mágica programada na nossa API: o arquivo **`crud.js`** (`/api/:table`).
Esta mágica substitui o famoso e custoso Supabase client-side JS (`supabase.from(..).select(..)`), permitindo que todo o sistema flua da exata mesma maneira através de requisições HTTP REST clássicas.

### Domínios Principais
* **Vendas:** `leads`, `clientes`, `propostas`, `proposta_itens`
* **Operacional:** `ordens_servico`, `obras`, `medicoes`, `relatorios`
* **Insumos e Cadeia:** `estoque`, `fornecedores`
* **Frotas:** `veiculos`, `registros_uso_veiculo`, `abastecimentos`
* **Recursos Humanos:** `colaboradores`, `colaborador_asos`, `colaborador_epis`, `ponto_registros`
* **Gestão Restrita Financeira (Apenas Vault):** `contas_pagar`, `contas_receber`, `despesas_fixas`

---

## 4. Onde Mora o "Row Level Security (RLS)"?

Na época do Supabase, o banco de dados impedia que Usuário A visse tabelas do Usuário B configurando políticas no próprio PostgreSQL. Isso sobrecarregava as conexões e dependia 100% de infraestrutura na nuvem.
**Na nova arquitetura:**
O middleware de Auth do Express e a rota mágica (`crud.js`) são os porteiros do RLS!
Quando uma requisição chega em `GET /api/leads`, a API intercepta o cabeçalho Token JWT, entende quem é o remetente, extrai o ID de seu banco invisível e secretamente anexa uma restrição no SQL:
```sql
SELECT * FROM leads WHERE user_id = $userId
```
Desse modo, nenhuma query do frontend jamais escapa de ser vigiada ou filtrada por inquilino, sem depender de recursos fechados de provedores cloud.

---

## Considerações Finais sobre Infraestrutura Antiga

Todo o emaranhado de pastas de migração da CLI (Command Line Interface) nativas do ecossistema antigo, notadamente a pasta `supabase/`, que servia apenas para iniciar o emulador de banco de dados do serviço cloud e sincronizar tipagens velhas, é considerado **Software Muerto (Legado)** e pode ser suprimido/arquivado para limpar o repositório. O "fonte da verdade" (Single Source of Truth) repousa agora unicamente na espinha de SQL auto-gerado ao rodar o `docker-compose`.
