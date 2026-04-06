# 02 — Banco de Dados: Script Completo de Criação

> Este arquivo contém o SQL completo para criar todas as 26 tabelas no PostgreSQL 16.
> Deve ser colocado em `db/init.sql` e será executado automaticamente pelo Docker na primeira inicialização.

## Diferenças em relação ao Supabase

| Aspecto | Supabase | Docker Self-Hosted |
|---|---|---|
| UUID | `gen_random_uuid()` | Precisa `CREATE EXTENSION "pgcrypto"` ou `uuid-ossp` |
| RLS | Policies com `auth.uid()` | **Removido** — filtro por `user_id` feito na API |
| Auth functions | `auth.uid()` | **Não existe** — API injeta `user_id` via JWT |
| Triggers | Iguais | Iguais (mantidos) |
| RPCs | Chamadas via SDK | Chamadas via API → `SELECT function()` |

---

## SQL Completo (`db/init.sql`)

```sql
-- ═══════════════════════════════════════════════════════════════
-- HC GeoGestão — Inicialização do Banco de Dados
-- PostgreSQL 16 — Docker Self-Hosted
-- Gerado a partir do schema Supabase (26 tabelas)
-- ═══════════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- TABELA: users (substituindo Supabase Auth)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar updated_at automaticamente
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 1. CLIENTES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT DEFAULT '',
    cnpj_cpf TEXT DEFAULT '',
    tipo_cliente TEXT NOT NULL DEFAULT 'Pessoa Jurídica',
    contato_principal TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    endereco TEXT DEFAULT '',
    cidade_uf TEXT DEFAULT '',
    observacoes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 2. LEADS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome_contato TEXT NOT NULL,
    empresa TEXT NOT NULL DEFAULT '',
    telefone_whatsapp TEXT DEFAULT '',
    email TEXT DEFAULT '',
    cidade_uf TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Novo',
    tipo_servico_interesse TEXT[] DEFAULT '{}',
    valor_estimado NUMERIC DEFAULT 0,
    prioridade TEXT NOT NULL DEFAULT 'Média',
    proximo_contato_em DATE,
    observacoes TEXT DEFAULT '',
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 3. PROPOSTAS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS propostas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    revisao TEXT,
    titulo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    tipo_servico TEXT NOT NULL DEFAULT '',
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    validade_dias INTEGER NOT NULL DEFAULT 15,
    valor_total NUMERIC NOT NULL DEFAULT 0,
    desconto_percentual NUMERIC NOT NULL DEFAULT 0,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    contratante_nome TEXT,
    cnpj_cpf TEXT,
    contato_nome TEXT,
    contato_telefone TEXT,
    contato_email TEXT,
    local_obra TEXT,
    forma_pagamento TEXT,
    condicoes_pagamento TEXT,
    prazo_inicio TEXT,
    prazo_execucao_campo TEXT,
    prazo_entrega_relatorio TEXT,
    prazo_execucao TEXT,
    encargos_contratante TEXT,
    encargos_contratada TEXT,
    condicoes_gerais TEXT,
    cancelamento_suspensao TEXT,
    notas_complementares TEXT,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_propostas_user_id ON propostas(user_id);
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE TRIGGER update_propostas_updated_at
    BEFORE UPDATE ON propostas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 4. PROPOSTA_ITENS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS proposta_itens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
    item_numero TEXT,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'un',
    quantidade NUMERIC NOT NULL DEFAULT 0,
    valor_unitario NUMERIC NOT NULL DEFAULT 0,
    valor_total NUMERIC NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0,
    is_grupo BOOLEAN DEFAULT false,
    grupo_nome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposta_itens_proposta_id ON proposta_itens(proposta_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. ORDENS_SERVICO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ordens_servico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    proposta_id UUID REFERENCES propostas(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL DEFAULT '',
    local_obra TEXT DEFAULT '',
    tipo_servico TEXT DEFAULT '',
    descricao_servico TEXT,
    responsavel TEXT,
    equipe TEXT,
    status TEXT NOT NULL DEFAULT 'Aberta',
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio DATE,
    data_previsao_fim DATE,
    data_conclusao DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordens_servico_user_id ON ordens_servico(user_id);
CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 6. OBRAS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS obras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    cliente_nome TEXT NOT NULL DEFAULT '',
    proposta_id UUID REFERENCES propostas(id) ON DELETE SET NULL,
    ordem_servico_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Planejada',
    progresso INTEGER NOT NULL DEFAULT 0,
    tipo_servico TEXT,
    local_obra TEXT,
    responsavel TEXT,
    equipe_campo TEXT,
    data_inicio DATE,
    data_previsao_fim DATE,
    data_conclusao DATE,
    data_entrega_relatorio DATE,
    hotel TEXT,
    alimentacao TEXT,
    transporte TEXT,
    observacoes TEXT,
    observacoes_logistica TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obras_user_id ON obras(user_id);
CREATE TRIGGER update_obras_updated_at
    BEFORE UPDATE ON obras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 7. MEDICOES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medicoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'un',
    tipo_servico TEXT,
    descricao_atividades TEXT,
    profundidade_de NUMERIC,
    profundidade_ate NUMERIC,
    hora_inicio TEXT,
    hora_fim TEXT,
    clima TEXT,
    coordenadas_gps TEXT,
    ocorrencias TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicoes_user_id ON medicoes(user_id);
CREATE INDEX idx_medicoes_obra_id ON medicoes(obra_id);
CREATE TRIGGER update_medicoes_updated_at
    BEFORE UPDATE ON medicoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 8. MEDICAO_FOTOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medicao_fotos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicao_id UUID NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicao_fotos_medicao_id ON medicao_fotos(medicao_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. RELATORIOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS relatorios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    numero TEXT NOT NULL DEFAULT '',
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT '',
    obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Em Elaboração',
    responsavel TEXT,
    revisor TEXT,
    versao TEXT,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_entrega DATE,
    descricao TEXT,
    conclusoes TEXT,
    recomendacoes TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatorios_user_id ON relatorios(user_id);
CREATE TRIGGER update_relatorios_updated_at
    BEFORE UPDATE ON relatorios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 10. ESTOQUE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS estoque (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    quantidade NUMERIC NOT NULL DEFAULT 0,
    quantidade_minima NUMERIC NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'un',
    localizacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estoque_user_id ON estoque(user_id);
CREATE TRIGGER update_estoque_updated_at
    BEFORE UPDATE ON estoque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 11. ESTOQUE_SAIDAS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS estoque_saidas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    estoque_id UUID NOT NULL REFERENCES estoque(id) ON DELETE CASCADE,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    retirado_por TEXT NOT NULL DEFAULT '',
    destino TEXT,
    tipo_saida TEXT NOT NULL DEFAULT 'Consumo',
    data_saida DATE NOT NULL DEFAULT CURRENT_DATE,
    devolvido BOOLEAN NOT NULL DEFAULT false,
    data_devolucao DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estoque_saidas_user_id ON estoque_saidas(user_id);
CREATE INDEX idx_estoque_saidas_estoque_id ON estoque_saidas(estoque_id);

-- ═══════════════════════════════════════════════════════════════
-- 12. FORNECEDORES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT '',
    cnpj_cpf TEXT,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade_uf TEXT,
    produtos_servicos TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_user_id ON fornecedores(user_id);
CREATE TRIGGER update_fornecedores_updated_at
    BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 13. VEICULOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS veiculos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    placa TEXT NOT NULL,
    marca TEXT NOT NULL DEFAULT '',
    modelo TEXT NOT NULL,
    ano TEXT,
    cor TEXT,
    combustivel TEXT,
    tipo TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Disponível',
    km_atual NUMERIC,
    responsavel TEXT,
    data_ultima_revisao DATE,
    data_proxima_revisao DATE,
    seguro_vencimento DATE,
    licenciamento_vencimento DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_veiculos_user_id ON veiculos(user_id);
CREATE TRIGGER update_veiculos_updated_at
    BEFORE UPDATE ON veiculos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 14. ABASTECIMENTOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS abastecimentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    km_atual NUMERIC NOT NULL,
    km_anterior NUMERIC,
    litros NUMERIC NOT NULL DEFAULT 0,
    valor_litro NUMERIC NOT NULL DEFAULT 0,
    valor_total NUMERIC NOT NULL DEFAULT 0,
    combustivel TEXT,
    posto TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_abastecimentos_veiculo_id ON abastecimentos(veiculo_id);

-- ═══════════════════════════════════════════════════════════════
-- 15. REGISTROS_USO_VEICULO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS registros_uso_veiculo (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
    colaborador_nome TEXT NOT NULL DEFAULT '',
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_ligado TEXT NOT NULL,
    hora_desligado TEXT,
    km_inicio NUMERIC,
    km_fim NUMERIC,
    local_servico TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registros_uso_veiculo_veiculo_id ON registros_uso_veiculo(veiculo_id);

-- ═══════════════════════════════════════════════════════════════
-- 16. COLABORADORES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    cargo TEXT,
    funcao TEXT,
    data_admissao DATE,
    data_nascimento DATE,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade_uf TEXT,
    contato_emergencia TEXT,
    telefone_emergencia TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaboradores_user_id ON colaboradores(user_id);
CREATE TRIGGER update_colaboradores_updated_at
    BEFORE UPDATE ON colaboradores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 17. COLABORADOR_ASOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaborador_asos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'Admissional',
    data_realizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    resultado TEXT NOT NULL DEFAULT 'Apto',
    medico TEXT,
    crm TEXT,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaborador_asos_colaborador_id ON colaborador_asos(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 18. COLABORADOR_NRS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaborador_nrs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    norma TEXT NOT NULL,
    descricao TEXT,
    data_realizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    carga_horaria TEXT,
    instituicao TEXT,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaborador_nrs_colaborador_id ON colaborador_nrs(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 19. COLABORADOR_EPIS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaborador_epis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    equipamento TEXT NOT NULL,
    ca TEXT,
    data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    quantidade INTEGER NOT NULL DEFAULT 1,
    motivo TEXT,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaborador_epis_colaborador_id ON colaborador_epis(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 20. COLABORADOR_VACINAS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaborador_vacinas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    vacina TEXT NOT NULL,
    dose TEXT,
    data_aplicacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    local_aplicacao TEXT,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaborador_vacinas_colaborador_id ON colaborador_vacinas(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 21. COLABORADOR_ARQUIVOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS colaborador_arquivos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaborador_arquivos_colaborador_id ON colaborador_arquivos(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 22. PONTO_REGISTROS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ponto_registros (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    entrada TEXT,
    saida_almoco TEXT,
    retorno_almoco TEXT,
    saida TEXT,
    horas_extras TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ponto_registros_colaborador_id ON ponto_registros(colaborador_id);

-- ═══════════════════════════════════════════════════════════════
-- 23. CONTAS_PAGAR
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Outros',
    tipo_despesa TEXT NOT NULL DEFAULT '',
    fornecedor TEXT,
    valor NUMERIC NOT NULL DEFAULT 0,
    valor_pago NUMERIC NOT NULL DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    forma_pagamento TEXT,
    numero_documento TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    centro_custo TEXT,
    recorrente BOOLEAN NOT NULL DEFAULT false,
    recorrencia TEXT,
    despesa_pai_id UUID,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    comprovante_nome TEXT,
    comprovante_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contas_pagar_user_id ON contas_pagar(user_id);
CREATE TRIGGER update_contas_pagar_updated_at
    BEFORE UPDATE ON contas_pagar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 24. CONTAS_RECEBER
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contas_receber (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Serviço',
    cliente TEXT,
    obra_referencia TEXT,
    proposta_referencia TEXT,
    valor NUMERIC NOT NULL DEFAULT 0,
    valor_recebido NUMERIC NOT NULL DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    forma_recebimento TEXT,
    numero_nf TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contas_receber_user_id ON contas_receber(user_id);
CREATE TRIGGER update_contas_receber_updated_at
    BEFORE UPDATE ON contas_receber
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 25. DESPESAS_FIXAS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS despesas_fixas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    valor NUMERIC NOT NULL DEFAULT 0,
    dia_vencimento INTEGER NOT NULL DEFAULT 1,
    ativa BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_fixas_user_id ON despesas_fixas(user_id);
CREATE TRIGGER update_despesas_fixas_updated_at
    BEFORE UPDATE ON despesas_fixas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 26. DOCUMENTOS_EMPRESA
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documentos_empresa (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome_documento TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    data_emissao DATE,
    data_validade DATE,
    observacoes TEXT,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_empresa_user_id ON documentos_empresa(user_id);
CREATE TRIGGER update_documentos_empresa_updated_at
    BEFORE UPDATE ON documentos_empresa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS: Geração de números sequenciais
-- ═══════════════════════════════════════════════════════════════

-- Gerar número de proposta: PROP-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_proposta_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    next_num INTEGER;
    result TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO next_num
    FROM propostas
    WHERE user_id = p_user_id
      AND numero LIKE 'PROP-' || current_year || '-%';

    result := 'PROP-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Gerar número de OS: OS-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_os_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    next_num INTEGER;
    result TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO next_num
    FROM ordens_servico
    WHERE user_id = p_user_id
      AND numero LIKE 'OS-' || current_year || '-%';

    result := 'OS-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Gerar número de relatório: REL-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_relatorio_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    next_num INTEGER;
    result TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO next_num
    FROM relatorios
    WHERE user_id = p_user_id
      AND numero LIKE 'REL-' || current_year || '-%';

    result := 'REL-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════
```

---

## Migração de Dados Existentes

Para exportar dados do Supabase e importar no novo banco:

```bash
# 1. Exportar do Supabase (via Dashboard ou CLI)
npx supabase db dump --data-only > supabase_data.sql

# 2. Mapear user_id do Supabase Auth para a nova tabela users
# Criar o usuário manualmente primeiro:
INSERT INTO users (id, email, password_hash, full_name)
VALUES ('UUID_DO_SUPABASE_AUTH', 'email@empresa.com', '$2b$10$...hash...', 'Nome');

# 3. Importar dados (os user_id devem bater)
docker compose exec -T db psql -U hcgeo hcgeogestao < supabase_data.sql
```
