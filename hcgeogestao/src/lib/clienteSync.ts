import { supabase } from "@/integrations/supabase/client";

interface ClienteData {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  contato_principal?: string;
  telefone?: string;
  email?: string;
  cidade_uf?: string;
  endereco?: string;
  observacoes?: string;
}

/**
 * Auto-classifies a client as PF or PJ based on available data.
 */
function classificarTipoCliente(data: ClienteData): string {
  const doc = (data.cnpj_cpf || "").replace(/\D/g, "");
  if (doc.length === 11) return "Pessoa Física";
  if (doc.length === 14 || data.razao_social) return "Pessoa Jurídica";
  return "Pessoa Jurídica";
}

/**
 * Upserts a client record from lead or proposta data.
 * Matches by cnpj_cpf, email, or telefone to avoid duplicates.
 */
export async function upsertCliente(data: ClienteData, userId: string): Promise<string | null> {
  if (!data.razao_social && !data.nome_fantasia && !data.email && !data.telefone) {
    return null; // Not enough data to create a client
  }

  const nome = data.razao_social || data.nome_fantasia || data.email || "Cliente sem nome";
  const tipo_cliente = classificarTipoCliente(data);

  // Try to find existing client by cnpj_cpf, email, or telefone
  let existingId: string | null = null;

  if (data.cnpj_cpf && data.cnpj_cpf.trim()) {
    const { data: found } = await supabase
      .from("clientes")
      .select("id")
      .eq("cnpj_cpf", data.cnpj_cpf.trim())
      .eq("user_id", userId)
      .limit(1);
    if (found && found.length > 0) existingId = found[0].id;
  }

  if (!existingId && data.email && data.email.trim()) {
    const { data: found } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", data.email.trim())
      .eq("user_id", userId)
      .limit(1);
    if (found && found.length > 0) existingId = found[0].id;
  }

  if (!existingId && data.telefone && data.telefone.trim()) {
    const { data: found } = await supabase
      .from("clientes")
      .select("id")
      .eq("telefone", data.telefone.trim())
      .eq("user_id", userId)
      .limit(1);
    if (found && found.length > 0) existingId = found[0].id;
  }

  // Build update payload (only non-empty fields)
  const updatePayload: Record<string, any> = { tipo_cliente };
  if (data.razao_social) updatePayload.razao_social = data.razao_social;
  if (data.nome_fantasia) updatePayload.nome_fantasia = data.nome_fantasia;
  if (data.cnpj_cpf) updatePayload.cnpj_cpf = data.cnpj_cpf;
  if (data.contato_principal) updatePayload.contato_principal = data.contato_principal;
  if (data.telefone) updatePayload.telefone = data.telefone;
  if (data.email) updatePayload.email = data.email;
  if (data.cidade_uf) updatePayload.cidade_uf = data.cidade_uf;
  if (data.endereco) updatePayload.endereco = data.endereco;

  if (existingId) {
    // Update existing client
    await supabase.from("clientes").update(updatePayload).eq("id", existingId);
    return existingId;
  } else {
    // Create new client
    const { data: inserted, error } = await supabase
      .from("clientes")
      .insert({ ...updatePayload, razao_social: nome, user_id: userId })
      .select("id")
      .single();
    if (error) {
      console.error("Error creating client:", error);
      return null;
    }
    return inserted.id;
  }
}
