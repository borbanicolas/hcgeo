# 05 — Storage & Upload Migration

## Estado Atual (Supabase Storage)

O projeto utiliza **4 buckets** no Supabase Storage:

| Bucket | Usado em | Operações |
|---|---|---|
| `medicao-fotos` | MedicaoFormDialog, Medicoes, ObraDetalhe | upload, getPublicUrl, remove |
| `empresa-docs` | DocumentosEmpresa | upload, getPublicUrl |
| `proposta-docs` | PropostaFormDialog | upload, getPublicUrl |
| `colaborador-docs` | ColaboradorDocumentos | upload, getPublicUrl, remove |

---

## Mapa de Chamadas Atuais

### `medicao-fotos` (3 arquivos)

| Arquivo | Linha | Operação | Código Supabase |
|---|---|---|---|
| MedicaoFormDialog.tsx | 91 | remove | `supabase.storage.from("medicao-fotos").remove([path])` |
| MedicaoFormDialog.tsx | 103 | upload | `supabase.storage.from("medicao-fotos").upload(filePath, file)` |
| MedicaoFormDialog.tsx | 109 | getPublicUrl | `supabase.storage.from("medicao-fotos").getPublicUrl(filePath)` |
| Medicoes.tsx | 66 | remove | `supabase.storage.from("medicao-fotos").remove(paths)` |
| ObraDetalhe.tsx | 80 | remove | `supabase.storage.from("medicao-fotos").remove(paths)` |

### `empresa-docs` (1 arquivo)

| Arquivo | Linha | Operação |
|---|---|---|
| DocumentosEmpresa.tsx | 118 | upload |
| DocumentosEmpresa.tsx | 124 | getPublicUrl |

### `proposta-docs` (1 arquivo)

| Arquivo | Linha | Operação |
|---|---|---|
| PropostaFormDialog.tsx | 299 | upload |
| PropostaFormDialog.tsx | 301 | getPublicUrl |

### `colaborador-docs` (1 arquivo)

| Arquivo | Linha | Operação |
|---|---|---|
| ColaboradorDocumentos.tsx | 61 | upload |
| ColaboradorDocumentos.tsx | 63 | getPublicUrl |
| ColaboradorDocumentos.tsx | 207 | upload |
| ColaboradorDocumentos.tsx | 209 | getPublicUrl |
| ColaboradorDocumentos.tsx | 223 | remove |

**Total: 15 chamadas de storage em 6 arquivos**

---

## Novo Sistema de Upload

### Estrutura de pastas no volume Docker

```
uploads/
├── medicao-fotos/
│   └── {user_id}/
│       ├── 1711900000000-123456789.jpg
│       └── ...
├── empresa-docs/
│   └── {user_id}/
│       ├── 1711900000000-987654321.pdf
│       └── ...
├── proposta-docs/
│   └── {user_id}/
│       └── ...
└── colaborador-docs/
    └── {user_id}/
        └── ...
```

### API Endpoint de Upload

```
POST /api/upload/:bucket
- Headers: Authorization: Bearer <token>
- Body: multipart/form-data com campo "file"
- Response: { data: { path, publicUrl, filename } }

DELETE /api/upload/:bucket/:filename
- Headers: Authorization: Bearer <token>
- Response: { message: "Arquivo removido" }
```

### Servir Arquivos (estáticos via Express)

```
GET /uploads/:bucket/:userId/:filename
→ Servido por express.static('uploads/')
→ Em produção, proxied pelo Nginx
```

---

## Como o apiClient Lida com Storage

O `apiClient.ts` (criado no doc 04) já implementa `storage.from(bucket)` com os mesmos métodos:

```typescript
// Já implementado em apiClient.ts
supabase.storage.from("medicao-fotos").upload(filePath, file);
// → POST /api/upload/medicao-fotos (FormData)

supabase.storage.from("medicao-fotos").getPublicUrl(filePath);
// → Retorna URL local: /uploads/medicao-fotos/userId/filename

supabase.storage.from("medicao-fotos").remove([path]);
// → DELETE /api/upload/medicao-fotos/filename
```

**Nenhuma mudança adicional** é necessária nos componentes além da troca de import.

---

## Migração de Dados Existentes

Para migrar arquivos já armazenados no Supabase Storage:

### 1. Listar arquivos de cada bucket

```bash
# Via Supabase Dashboard ou CLI
npx supabase storage ls medicao-fotos --recursive
npx supabase storage ls empresa-docs --recursive
npx supabase storage ls proposta-docs --recursive
npx supabase storage ls colaborador-docs --recursive
```

### 2. Download em massa

```bash
# Script bash para download
for bucket in medicao-fotos empresa-docs proposta-docs colaborador-docs; do
  npx supabase storage cp -r "ss:///$bucket" "./uploads/$bucket/"
done
```

### 3. Atualizar URLs no banco

Após migrar os arquivos, as URLs armazenadas no banco precisam ser atualizadas:

```sql
-- Atualizar URLs de medicao_fotos
UPDATE medicao_fotos
SET url = REPLACE(url,
  'https://uixhyywpqiwpjghbbtju.supabase.co/storage/v1/object/public/medicao-fotos/',
  '/uploads/medicao-fotos/'
);

-- Atualizar URLs de colaborador_asos
UPDATE colaborador_asos
SET arquivo_url = REPLACE(arquivo_url,
  'https://uixhyywpqiwpjghbbtju.supabase.co/storage/v1/object/public/colaborador-docs/',
  '/uploads/colaborador-docs/'
)
WHERE arquivo_url IS NOT NULL;

-- Repetir para: colaborador_nrs, colaborador_epis, colaborador_vacinas,
-- colaborador_arquivos, propostas, documentos_empresa, contas_pagar
-- (todas as tabelas que possuem colunas arquivo_url ou url)
```

### Tabelas com URLs de Storage

| Tabela | Colunas com URL |
|---|---|
| `medicao_fotos` | `url` |
| `colaborador_asos` | `arquivo_url` |
| `colaborador_nrs` | `arquivo_url` |
| `colaborador_epis` | `arquivo_url` |
| `colaborador_vacinas` | `arquivo_url` |
| `colaborador_arquivos` | `url` |
| `propostas` | `arquivo_url` |
| `documentos_empresa` | `arquivo_url` |
| `contas_pagar` | `comprovante_url` |

**Total: 9 tabelas com 9 colunas de URL**
