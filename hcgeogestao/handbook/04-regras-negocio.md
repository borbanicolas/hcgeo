# HC GeoGestão — Regras de Negócio e Valores Enumerados

## 1. Status e Valores por Módulo

### 1.1. Lead Status (Pipeline CRM)
```
Novo → Qualificado → Portfólio Enviado → Reunião Agendada 
     → Proposta Enviada → Negociação → Fechado (Ganho) | Fechado (Perdido)
```

| Status | Cor (CSS) | Funil Dashboard |
|---|---|---|
| Novo | `--pipeline-novo` | — |
| Qualificado | `--pipeline-qualificado` | ✅ qualificado |
| Portfólio Enviado | `--pipeline-portfolio` | — |
| Reunião Agendada | `--pipeline-reuniao` | — |
| Proposta Enviada | `--pipeline-proposta` | ✅ proposta |
| Negociação | `--pipeline-negociacao` | ✅ negociacao |
| Fechado (Ganho) | `--pipeline-ganho` | ✅ ganho |
| Fechado (Perdido) | `--pipeline-perdido` | — |

**Prioridades**: Alta (border-destructive), Média (border-warning), Baixa (border-muted)

### 1.2. Proposta Status
```
Rascunho → Enviada → Em Análise → Aprovada | Reprovada | Cancelada
```

| Status | Cor |
|---|---|
| Rascunho | bg-muted |
| Enviada | bg-info/15 |
| Em Análise | bg-warning/15 |
| Aprovada | bg-success/15 |
| Reprovada | bg-destructive/15 |
| Cancelada | bg-muted |

### 1.3. Ordem de Serviço Status
```
Aberta → Em Execução → Concluída | Cancelada
```

### 1.4. Obra Status
```
Planejada → Em Mobilização → Em Andamento → Pausada → Concluída | Cancelada
```

### 1.5. Relatório Status
```
Em Elaboração → Em Revisão → Aprovado → Entregue | Cancelado
```

### 1.6. Financeiro Status
**Contas a Pagar**: Pendente → Pago | Parcial | Atrasado | Cancelado
**Contas a Receber**: Pendente → Recebido | Parcial | Atrasado | Cancelado

### 1.7. Veículo Status
```
Disponível | Em uso | Manutenção | Inativo
```

### 1.8. Saída de Estoque Tipo
```
Consumo | Retornável
```
- **Consumo**: Material definitivamente consumido
- **Retornável**: Deve ser devolvido (rastreado no Dashboard)

### 1.9. Colaborador
- **Ativo**: `boolean` (true/false → filtro Ativos/Inativos)

### 1.10. ASO Tipos
```
Admissional | Periódico | Demissional | Retorno ao Trabalho | Mudança de Função
```

---

## 2. Tipos de Serviço (Domínio Geotécnico)

Usados em propostas, leads e categorias de estoque:

| Serviço | Contexto |
|---|---|
| Sondagem SPT | Sondagem à percussão padrão |
| Sondagem Rotativa | Sondagem com broca rotativa |
| Sondagem Mista | Combinação SPT + Rotativa |
| Geofísica | Investigação geofísica |
| Poço Tubular Profundo | Perfuração de poço artesiano |
| Poços de Monitoramento | Poços para monitoramento ambiental |
| Instrumentação | Instalação de instrumentos geotécnicos |
| Consultoria | Consultoria técnica |
| Relatório | Elaboração de relatório técnico |

---

## 3. Categorias Financeiras

### Despesas (contas_pagar.categoria)
Combustível, Manutenção, Aluguel, Salários, Impostos, Material, Equipamentos, Seguros, Alimentação, Hospedagem, Transporte, Telecomunicações, Software, Contabilidade, Marketing, Cartão de Crédito, Boleto, Fornecedor, Outros

### Receitas (contas_receber.categoria)
Serviço, Sondagem SPT, Sondagem Rotativa, Sondagem Mista, Geofísica, Poço Tubular, Consultoria, Relatório, Outros

### Despesas Fixas (despesas_fixas.categoria)
Aluguel, Salários, Energia, Internet, Telefone, Água, Contabilidade, Software, Seguros, Impostos, Marketing, Operacional, Outros

### Formas de Pagamento
PIX, Boleto, Transferência, Cartão Crédito, Cartão Débito, Cheque, Dinheiro, Depósito

---

## 4. Categorias de Estoque

| Categoria | Cor UI |
|---|---|
| Sondagem à Percussão | info |
| Sondagem Rotativa | accent |
| Instrumentação | success |
| Poços de Monitoramento | warning |
| Poço Tubular Profundo | primary |
| Material | secondary |
| Equipamentos | accent |
| Geofísica | success |
| Escritório | muted |
| Veículos | info |
| EPI | destructive |
| Outro | muted |

---

## 5. Tipos de Fornecedor
Material, Equipamento, Serviço, Escritório, Logística, Outro

---

## 6. Tipos de Cliente
| Tipo | Critério de Classificação |
|---|---|
| Pessoa Física | CNPJ/CPF com 11 dígitos |
| Pessoa Jurídica | CNPJ/CPF com 14 dígitos OU tem razão social |

**Auto-classificação**: Função `classificarTipoCliente()` em `clienteSync.ts`

---

## 7. Regras de Negócio Importantes

### 7.1. Geração Automática de Números
- **Propostas**: RPC `generate_proposta_number(p_user_id)` — formato sequencial
- **OS**: RPC `generate_os_number(p_user_id)` — formato sequencial
- **Relatórios**: RPC `generate_relatorio_number(p_user_id)` — formato sequencial

### 7.2. Geração de OS a partir de Proposta
Quando proposta é Aprovada → botão "Gerar OS":
1. Chama `generate_os_number` via RPC
2. Cria registro em `ordens_servico` com dados copiados da proposta

### 7.3. Geração de Cobranças (Financeiro)
Para propostas aprovadas sem cobrança vinculada:
1. Gera 2 registros em `contas_receber`:
   - **Entrada**: 50% do `valor_total`, vencimento = hoje
   - **Saldo**: 50% do `valor_total`, vencimento = hoje + 30 dias
2. Vincula via `proposta_referencia` = `proposta.numero`

### 7.4. Upsert de Clientes
`clienteSync.ts`.`upsertCliente()`:
1. Busca cliente existente por CNPJ/CPF, depois email, depois telefone
2. Se encontra → update
3. Se não encontra → insert
4. Auto-classifica tipo PF/PJ

### 7.5. Alertas de Vencimento (Dashboard + Colaboradores)
| Tipo | Tabela | Campo | Prazo |
|---|---|---|---|
| ASO | `colaborador_asos` | `data_validade` | ≤ 30 dias |
| NR | `colaborador_nrs` | `data_validade` | ≤ 30 dias |
| EPI | `colaborador_epis` | `data_validade` | ≤ 30 dias |
| Vacina | `colaborador_vacinas` | `data_validade` | ≤ 30 dias |
| Proposta | `propostas` | `data_emissao + validade_dias` | ≤ 15 dias |
| Veículo Revisão | `veiculos` | `data_proxima_revisao` | ≤ 30 dias |
| Veículo Seguro | `veiculos` | `seguro_vencimento` | ≤ 30 dias |
| Veículo Licenciamento | `veiculos` | `licenciamento_vencimento` | ≤ 30 dias |

**Classificação de urgência**:
- **Vencido** (vermelho): `differenceInDays < 0`
- **Urgente** (laranja): `differenceInDays ≤ 15`
- **Atenção** (amarelo): `differenceInDays ≤ 30`

### 7.6. Estoque Baixo
Alerta quando `estoque.quantidade ≤ estoque.quantidade_minima`

### 7.7. Devolução de Materiais
Saídas com `tipo_saida = "Retornável"` e `devolvido = false` aparecem como "Pendente" no Dashboard

### 7.8. DRE (Demonstração do Resultado)
```
Receitas Realizadas = contas_receber (status="Recebido").valor_recebido
Despesas Realizadas = contas_pagar (status="Pago").valor_pago
Lucro = Receitas - Despesas
```
Filtrado por mês selecionado.

### 7.9. Financeiro — Senha de Acesso
- Senha hardcoded: `G@lves05`
- Armazenada em `sessionStorage.financeiro_unlocked`
- Gate visual com Card centralizado + Lock icon

### 7.10. Export PDF
- **Propostas**: `PropostaPDFExport.ts` — Layout profissional com cabeçalho HCGEO, itens em tabela, cláusulas, prazos
- **Financeiro**: `FinanceiroPDFExport.ts` — Resumo mensal com contas a pagar/receber

### 7.11. Import de Propostas
- Via JSON com dialog dedicado
- Campos mapeados do JSON para a estrutura de `propostas` + `proposta_itens`

---

## 8. Unidades de Medida Comuns

Usadas em estoque e medições:
- `un` (unidade — padrão)
- `m` (metro)
- `m²` (metro quadrado)
- `m³` (metro cúbido)
- `kg` (quilograma)
- `L` (litro)
- `pç` (peça)
- `cx` (caixa)
- `par`
- `jogo`
- `rolo`
- `pt` (pacote)
