-- ============================================================================
-- HC GeoGestão — Database Initialization
-- Creates all 26 application tables + auth_users table
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Auth Users Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed_attempts INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  last_failed_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Updated At Trigger Function ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_users_updated_at
  BEFORE UPDATE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- APPLICATION TABLES
-- ============================================================================

-- ─── 1. clientes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. leads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. propostas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  revisao TEXT,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  tipo_servico TEXT NOT NULL,
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
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON propostas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. proposta_itens ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ─── 5. ordens_servico ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 6. obras ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. medicoes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_medicoes_updated_at BEFORE UPDATE ON medicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 8. medicao_fotos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicao_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  medicao_id UUID NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 9. relatorios ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_relatorios_updated_at BEFORE UPDATE ON relatorios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 10. estoque ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 11. estoque_saidas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque_saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 12. fornecedores ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 13. veiculos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 14. abastecimentos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 15. registros_uso_veiculo ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_uso_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 16. colaboradores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 17. colaborador_asos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaborador_asos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 18. colaborador_nrs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaborador_nrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 19. colaborador_epis ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaborador_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 20. colaborador_vacinas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaborador_vacinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 21. colaborador_arquivos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaborador_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 22. ponto_registros ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ponto_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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

-- ─── 23. contas_pagar ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 24. contas_receber ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 25. despesas_fixas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS despesas_fixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 1,
  ativa BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_despesas_fixas_updated_at BEFORE UPDATE ON despesas_fixas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 26. documentos_empresa ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
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
CREATE TRIGGER update_documentos_empresa_updated_at BEFORE UPDATE ON documentos_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_propostas_user_id ON propostas(user_id);
CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta_id ON proposta_itens(proposta_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_user_id ON ordens_servico(user_id);
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_user_id ON medicoes(user_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_obra_id ON medicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_medicao_fotos_medicao_id ON medicao_fotos(medicao_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_user_id ON relatorios(user_id);
CREATE INDEX IF NOT EXISTS idx_estoque_user_id ON estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_estoque_saidas_estoque_id ON estoque_saidas(estoque_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_user_id ON veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo_id ON abastecimentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_registros_uso_veiculo_veiculo_id ON registros_uso_veiculo(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id ON colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_asos_colaborador_id ON colaborador_asos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_nrs_colaborador_id ON colaborador_nrs(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_epis_colaborador_id ON colaborador_epis(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_vacinas_colaborador_id ON colaborador_vacinas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_arquivos_colaborador_id ON colaborador_arquivos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_registros_colaborador_id ON ponto_registros(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_user_id ON contas_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_user_id ON contas_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_user_id ON despesas_fixas(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_empresa_user_id ON documentos_empresa(user_id);

-- ============================================================================
-- Done! 🎉
-- ============================================================================
