export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          combustivel: string | null
          created_at: string
          data: string
          id: string
          km_anterior: number | null
          km_atual: number
          litros: number
          observacoes: string | null
          posto: string | null
          user_id: string
          valor_litro: number
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          combustivel?: string | null
          created_at?: string
          data?: string
          id?: string
          km_anterior?: number | null
          km_atual?: number
          litros?: number
          observacoes?: string | null
          posto?: string | null
          user_id: string
          valor_litro?: number
          valor_total?: number
          veiculo_id: string
        }
        Update: {
          combustivel?: string | null
          created_at?: string
          data?: string
          id?: string
          km_anterior?: number | null
          km_atual?: number
          litros?: number
          observacoes?: string | null
          posto?: string | null
          user_id?: string
          valor_litro?: number
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cidade_uf: string | null
          cnpj_cpf: string | null
          contato_principal: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          tipo_cliente: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade_uf?: string | null
          cnpj_cpf?: string | null
          contato_principal?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          tipo_cliente?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade_uf?: string | null
          cnpj_cpf?: string | null
          contato_principal?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          tipo_cliente?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      colaborador_arquivos: {
        Row: {
          categoria: string
          colaborador_id: string
          created_at: string
          id: string
          nome_arquivo: string
          observacoes: string | null
          url: string
          user_id: string
        }
        Insert: {
          categoria?: string
          colaborador_id: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          observacoes?: string | null
          url: string
          user_id: string
        }
        Update: {
          categoria?: string
          colaborador_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          observacoes?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_arquivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_asos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          colaborador_id: string
          created_at: string
          crm: string | null
          data_realizacao: string
          data_validade: string | null
          id: string
          medico: string | null
          observacoes: string | null
          resultado: string
          tipo: string
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          colaborador_id: string
          created_at?: string
          crm?: string | null
          data_realizacao?: string
          data_validade?: string | null
          id?: string
          medico?: string | null
          observacoes?: string | null
          resultado?: string
          tipo?: string
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          colaborador_id?: string
          created_at?: string
          crm?: string | null
          data_realizacao?: string
          data_validade?: string | null
          id?: string
          medico?: string | null
          observacoes?: string | null
          resultado?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_asos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_epis: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          ca: string | null
          colaborador_id: string
          created_at: string
          data_entrega: string
          data_validade: string | null
          equipamento: string
          id: string
          motivo: string | null
          observacoes: string | null
          quantidade: number
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          ca?: string | null
          colaborador_id: string
          created_at?: string
          data_entrega?: string
          data_validade?: string | null
          equipamento: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          ca?: string | null
          colaborador_id?: string
          created_at?: string
          data_entrega?: string
          data_validade?: string | null
          equipamento?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_epis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_nrs: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          carga_horaria: string | null
          colaborador_id: string
          created_at: string
          data_realizacao: string
          data_validade: string | null
          descricao: string | null
          id: string
          instituicao: string | null
          norma: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          carga_horaria?: string | null
          colaborador_id: string
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          descricao?: string | null
          id?: string
          instituicao?: string | null
          norma?: string
          observacoes?: string | null
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          carga_horaria?: string | null
          colaborador_id?: string
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          descricao?: string | null
          id?: string
          instituicao?: string | null
          norma?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_nrs_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_vacinas: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          colaborador_id: string
          created_at: string
          data_aplicacao: string
          data_validade: string | null
          dose: string | null
          id: string
          local_aplicacao: string | null
          observacoes: string | null
          user_id: string
          vacina: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          colaborador_id: string
          created_at?: string
          data_aplicacao?: string
          data_validade?: string | null
          dose?: string | null
          id?: string
          local_aplicacao?: string | null
          observacoes?: string | null
          user_id: string
          vacina: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          colaborador_id?: string
          created_at?: string
          data_aplicacao?: string
          data_validade?: string | null
          dose?: string | null
          id?: string
          local_aplicacao?: string | null
          observacoes?: string | null
          user_id?: string
          vacina?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_vacinas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          cidade_uf: string | null
          contato_emergencia: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          rg: string | null
          telefone: string | null
          telefone_emergencia: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cidade_uf?: string | null
          contato_emergencia?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          funcao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          telefone_emergencia?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cidade_uf?: string | null
          contato_emergencia?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          rg?: string | null
          telefone?: string | null
          telefone_emergencia?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria: string
          centro_custo: string | null
          comprovante_nome: string | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          despesa_pai_id: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          parcela_atual: number | null
          recorrencia: string | null
          recorrente: boolean
          status: string
          tipo_despesa: string
          total_parcelas: number | null
          updated_at: string
          user_id: string
          valor: number
          valor_pago: number
        }
        Insert: {
          categoria?: string
          centro_custo?: string | null
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao: string
          despesa_pai_id?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          parcela_atual?: number | null
          recorrencia?: string | null
          recorrente?: boolean
          status?: string
          tipo_despesa?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id: string
          valor?: number
          valor_pago?: number
        }
        Update: {
          categoria?: string
          centro_custo?: string | null
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          despesa_pai_id?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          parcela_atual?: number | null
          recorrencia?: string | null
          recorrente?: boolean
          status?: string
          tipo_despesa?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id?: string
          valor?: number
          valor_pago?: number
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          categoria: string
          cliente: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          forma_recebimento: string | null
          id: string
          numero_nf: string | null
          obra_referencia: string | null
          observacoes: string | null
          proposta_referencia: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
          valor_recebido: number
        }
        Insert: {
          categoria?: string
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao: string
          forma_recebimento?: string | null
          id?: string
          numero_nf?: string | null
          obra_referencia?: string | null
          observacoes?: string | null
          proposta_referencia?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
          valor_recebido?: number
        }
        Update: {
          categoria?: string
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_recebimento?: string | null
          id?: string
          numero_nf?: string | null
          obra_referencia?: string | null
          observacoes?: string | null
          proposta_referencia?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_recebido?: number
        }
        Relationships: []
      }
      despesas_fixas: {
        Row: {
          ativa: boolean
          categoria: string
          created_at: string
          descricao: string
          dia_vencimento: number
          id: string
          observacoes: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          categoria?: string
          created_at?: string
          descricao: string
          dia_vencimento?: number
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          ativa?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          dia_vencimento?: number
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      documentos_empresa: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          categoria: string
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          id: string
          nome_documento: string
          observacoes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          nome_documento: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          nome_documento?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          categoria: string
          created_at: string
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          quantidade: number
          quantidade_minima: number
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          quantidade_minima?: number
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          quantidade_minima?: number
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estoque_saidas: {
        Row: {
          created_at: string
          data_devolucao: string | null
          data_saida: string
          destino: string | null
          devolvido: boolean
          estoque_id: string
          id: string
          observacoes: string | null
          quantidade: number
          retirado_por: string
          tipo_saida: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_devolucao?: string | null
          data_saida?: string
          destino?: string | null
          devolvido?: boolean
          estoque_id: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          retirado_por?: string
          tipo_saida?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_devolucao?: string | null
          data_saida?: string
          destino?: string | null
          devolvido?: boolean
          estoque_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          retirado_por?: string
          tipo_saida?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_saidas_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade_uf: string | null
          cnpj_cpf: string | null
          contato: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          produtos_servicos: string | null
          telefone: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade_uf?: string | null
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          produtos_servicos?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade_uf?: string | null
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          produtos_servicos?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cidade_uf: string | null
          cliente_id: string | null
          created_at: string
          email: string | null
          empresa: string
          id: string
          nome_contato: string
          observacoes: string | null
          prioridade: string
          proximo_contato_em: string | null
          status: string
          telefone_whatsapp: string | null
          tipo_servico_interesse: string[] | null
          updated_at: string
          user_id: string
          valor_estimado: number | null
        }
        Insert: {
          cidade_uf?: string | null
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          empresa?: string
          id?: string
          nome_contato: string
          observacoes?: string | null
          prioridade?: string
          proximo_contato_em?: string | null
          status?: string
          telefone_whatsapp?: string | null
          tipo_servico_interesse?: string[] | null
          updated_at?: string
          user_id: string
          valor_estimado?: number | null
        }
        Update: {
          cidade_uf?: string | null
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          empresa?: string
          id?: string
          nome_contato?: string
          observacoes?: string | null
          prioridade?: string
          proximo_contato_em?: string | null
          status?: string
          telefone_whatsapp?: string | null
          tipo_servico_interesse?: string[] | null
          updated_at?: string
          user_id?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          medicao_id: string
          nome_arquivo: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          medicao_id: string
          nome_arquivo?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          medicao_id?: string
          nome_arquivo?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicao_fotos_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes: {
        Row: {
          clima: string | null
          coordenadas_gps: string | null
          created_at: string
          data_registro: string
          descricao_atividades: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          obra_id: string | null
          observacoes: string | null
          ocorrencias: string | null
          profundidade_ate: number | null
          profundidade_de: number | null
          quantidade: number
          tipo_servico: string | null
          titulo: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clima?: string | null
          coordenadas_gps?: string | null
          created_at?: string
          data_registro?: string
          descricao_atividades?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          ocorrencias?: string | null
          profundidade_ate?: number | null
          profundidade_de?: number | null
          quantidade?: number
          tipo_servico?: string | null
          titulo: string
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clima?: string | null
          coordenadas_gps?: string | null
          created_at?: string
          data_registro?: string
          descricao_atividades?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          ocorrencias?: string | null
          profundidade_ate?: number | null
          profundidade_de?: number | null
          quantidade?: number
          tipo_servico?: string | null
          titulo?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          alimentacao: string | null
          cliente_nome: string
          created_at: string
          data_conclusao: string | null
          data_entrega_relatorio: string | null
          data_inicio: string | null
          data_previsao_fim: string | null
          equipe_campo: string | null
          hotel: string | null
          id: string
          local_obra: string | null
          observacoes: string | null
          observacoes_logistica: string | null
          ordem_servico_id: string | null
          progresso: number
          proposta_id: string | null
          responsavel: string | null
          status: string
          tipo_servico: string | null
          titulo: string
          transporte: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alimentacao?: string | null
          cliente_nome?: string
          created_at?: string
          data_conclusao?: string | null
          data_entrega_relatorio?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          equipe_campo?: string | null
          hotel?: string | null
          id?: string
          local_obra?: string | null
          observacoes?: string | null
          observacoes_logistica?: string | null
          ordem_servico_id?: string | null
          progresso?: number
          proposta_id?: string | null
          responsavel?: string | null
          status?: string
          tipo_servico?: string | null
          titulo: string
          transporte?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alimentacao?: string | null
          cliente_nome?: string
          created_at?: string
          data_conclusao?: string | null
          data_entrega_relatorio?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          equipe_campo?: string | null
          hotel?: string | null
          id?: string
          local_obra?: string | null
          observacoes?: string | null
          observacoes_logistica?: string | null
          ordem_servico_id?: string | null
          progresso?: number
          proposta_id?: string | null
          responsavel?: string | null
          status?: string
          tipo_servico?: string | null
          titulo?: string
          transporte?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          cliente_nome: string
          created_at: string
          data_conclusao: string | null
          data_emissao: string
          data_inicio: string | null
          data_previsao_fim: string | null
          descricao_servico: string | null
          equipe: string | null
          id: string
          local_obra: string | null
          numero: string
          observacoes: string | null
          proposta_id: string | null
          responsavel: string | null
          status: string
          tipo_servico: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_nome?: string
          created_at?: string
          data_conclusao?: string | null
          data_emissao?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          descricao_servico?: string | null
          equipe?: string | null
          id?: string
          local_obra?: string | null
          numero: string
          observacoes?: string | null
          proposta_id?: string | null
          responsavel?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          data_conclusao?: string | null
          data_emissao?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          descricao_servico?: string | null
          equipe?: string | null
          id?: string
          local_obra?: string | null
          numero?: string
          observacoes?: string | null
          proposta_id?: string | null
          responsavel?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          colaborador_id: string
          created_at: string
          data: string
          entrada: string | null
          horas_extras: string | null
          id: string
          observacoes: string | null
          retorno_almoco: string | null
          saida: string | null
          saida_almoco: string | null
          user_id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data?: string
          entrada?: string | null
          horas_extras?: string | null
          id?: string
          observacoes?: string | null
          retorno_almoco?: string | null
          saida?: string | null
          saida_almoco?: string | null
          user_id: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data?: string
          entrada?: string | null
          horas_extras?: string | null
          id?: string
          observacoes?: string | null
          retorno_almoco?: string | null
          saida?: string | null
          saida_almoco?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_registros_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_itens: {
        Row: {
          created_at: string
          descricao: string
          grupo_nome: string | null
          id: string
          is_grupo: boolean | null
          item_numero: string | null
          ordem: number
          proposta_id: string
          quantidade: number
          unidade: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          grupo_nome?: string | null
          id?: string
          is_grupo?: boolean | null
          item_numero?: string | null
          ordem?: number
          proposta_id: string
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          grupo_nome?: string | null
          id?: string
          is_grupo?: boolean | null
          item_numero?: string | null
          ordem?: number
          proposta_id?: string
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          cancelamento_suspensao: string | null
          cliente_id: string | null
          cnpj_cpf: string | null
          condicoes_gerais: string | null
          condicoes_pagamento: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          contratante_nome: string | null
          created_at: string
          data_emissao: string
          desconto_percentual: number
          encargos_contratada: string | null
          encargos_contratante: string | null
          forma_pagamento: string | null
          id: string
          lead_id: string | null
          local_obra: string | null
          notas_complementares: string | null
          numero: string
          observacoes: string | null
          prazo_entrega_relatorio: string | null
          prazo_execucao: string | null
          prazo_execucao_campo: string | null
          prazo_inicio: string | null
          revisao: string | null
          status: string
          tipo_servico: string
          titulo: string
          updated_at: string
          user_id: string
          validade_dias: number
          valor_total: number
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cancelamento_suspensao?: string | null
          cliente_id?: string | null
          cnpj_cpf?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contratante_nome?: string | null
          created_at?: string
          data_emissao?: string
          desconto_percentual?: number
          encargos_contratada?: string | null
          encargos_contratante?: string | null
          forma_pagamento?: string | null
          id?: string
          lead_id?: string | null
          local_obra?: string | null
          notas_complementares?: string | null
          numero: string
          observacoes?: string | null
          prazo_entrega_relatorio?: string | null
          prazo_execucao?: string | null
          prazo_execucao_campo?: string | null
          prazo_inicio?: string | null
          revisao?: string | null
          status?: string
          tipo_servico?: string
          titulo: string
          updated_at?: string
          user_id: string
          validade_dias?: number
          valor_total?: number
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cancelamento_suspensao?: string | null
          cliente_id?: string | null
          cnpj_cpf?: string | null
          condicoes_gerais?: string | null
          condicoes_pagamento?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contratante_nome?: string | null
          created_at?: string
          data_emissao?: string
          desconto_percentual?: number
          encargos_contratada?: string | null
          encargos_contratante?: string | null
          forma_pagamento?: string | null
          id?: string
          lead_id?: string | null
          local_obra?: string | null
          notas_complementares?: string | null
          numero?: string
          observacoes?: string | null
          prazo_entrega_relatorio?: string | null
          prazo_execucao?: string | null
          prazo_execucao_campo?: string | null
          prazo_inicio?: string | null
          revisao?: string | null
          status?: string
          tipo_servico?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          validade_dias?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_uso_veiculo: {
        Row: {
          colaborador_nome: string
          created_at: string
          data: string
          hora_desligado: string | null
          hora_ligado: string
          id: string
          km_fim: number | null
          km_inicio: number | null
          local_servico: string | null
          observacoes: string | null
          user_id: string
          veiculo_id: string
        }
        Insert: {
          colaborador_nome?: string
          created_at?: string
          data?: string
          hora_desligado?: string | null
          hora_ligado: string
          id?: string
          km_fim?: number | null
          km_inicio?: number | null
          local_servico?: string | null
          observacoes?: string | null
          user_id: string
          veiculo_id: string
        }
        Update: {
          colaborador_nome?: string
          created_at?: string
          data?: string
          hora_desligado?: string | null
          hora_ligado?: string
          id?: string
          km_fim?: number | null
          km_inicio?: number | null
          local_servico?: string | null
          observacoes?: string | null
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_uso_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          conclusoes: string | null
          created_at: string
          data_emissao: string
          data_entrega: string | null
          descricao: string | null
          id: string
          numero: string
          obra_id: string | null
          observacoes: string | null
          recomendacoes: string | null
          responsavel: string | null
          revisor: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
          versao: string | null
        }
        Insert: {
          conclusoes?: string | null
          created_at?: string
          data_emissao?: string
          data_entrega?: string | null
          descricao?: string | null
          id?: string
          numero?: string
          obra_id?: string | null
          observacoes?: string | null
          recomendacoes?: string | null
          responsavel?: string | null
          revisor?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
          versao?: string | null
        }
        Update: {
          conclusoes?: string | null
          created_at?: string
          data_emissao?: string
          data_entrega?: string | null
          descricao?: string | null
          id?: string
          numero?: string
          obra_id?: string | null
          observacoes?: string | null
          recomendacoes?: string | null
          responsavel?: string | null
          revisor?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: string | null
          combustivel: string | null
          cor: string | null
          created_at: string
          data_proxima_revisao: string | null
          data_ultima_revisao: string | null
          id: string
          km_atual: number | null
          licenciamento_vencimento: string | null
          marca: string
          modelo: string
          observacoes: string | null
          placa: string
          responsavel: string | null
          seguro_vencimento: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          data_proxima_revisao?: string | null
          data_ultima_revisao?: string | null
          id?: string
          km_atual?: number | null
          licenciamento_vencimento?: string | null
          marca?: string
          modelo: string
          observacoes?: string | null
          placa: string
          responsavel?: string | null
          seguro_vencimento?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          data_proxima_revisao?: string | null
          data_ultima_revisao?: string | null
          id?: string
          km_atual?: number | null
          licenciamento_vencimento?: string | null
          marca?: string
          modelo?: string
          observacoes?: string | null
          placa?: string
          responsavel?: string | null
          seguro_vencimento?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_os_number: { Args: { p_user_id: string }; Returns: string }
      generate_proposta_number: { Args: { p_user_id: string }; Returns: string }
      generate_relatorio_number: {
        Args: { p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
