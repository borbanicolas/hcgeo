import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, Pencil, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FornecedorFormDialog } from "@/components/fornecedores/FornecedorFormDialog";
import { toast } from "sonner";
import { whatsappUrlFromPhone } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const tipoColors: Record<string, string> = {
  Material: "bg-info/15 text-info border-info/30",
  Equipamento: "bg-accent/15 text-accent border-accent/30",
  Serviço: "bg-success/15 text-success border-success/30",
  Escritório: "bg-muted text-muted-foreground border-border",
  Logística: "bg-warning/15 text-warning border-warning/30",
  Outro: "bg-muted text-muted-foreground border-border",
};

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
    if (error) toast.error("Erro ao carregar fornecedores");
    else setFornecedores(data || []);
    setLoadingData(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir fornecedor");
    else { toast.success("Fornecedor excluído"); fetchData(); }
    setDeleteId(null);
  };

  const filtered = fornecedores.filter((f) =>
    f.nome?.toLowerCase().includes(search.toLowerCase()) ||
    f.produtos_servicos?.toLowerCase().includes(search.toLowerCase()) ||
    f.tipo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fornecedores.length} fornecedor{fornecedores.length !== 1 ? "es" : ""} cadastrado{fornecedores.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, tipo ou produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
          <Button variant="link" onClick={() => { setEditing(null); setDialogOpen(true); }}>Cadastrar primeiro fornecedor</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f, i) => {
            const wa = whatsappUrlFromPhone(f.telefone);
            return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="stat-card cursor-pointer group"
              onClick={() => { setEditing(f); setDialogOpen(true); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{f.nome}</h3>
                    <Badge variant="outline" className={tipoColors[f.tipo] || ""}>
                      {f.tipo}
                    </Badge>
                  </div>
                  {f.cnpj_cpf && <p className="text-sm text-muted-foreground mt-0.5">{f.cnpj_cpf}</p>}
                  {f.cidade_uf && <p className="text-sm text-muted-foreground">{f.cidade_uf}</p>}
                </div>
                <Truck className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              </div>

              {f.produtos_servicos && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{f.produtos_servicos}</p>
              )}

              <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="text-muted-foreground hover:text-[hsl(var(--success))] transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {f.email && (
                  <a href={`mailto:${f.email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => { setEditing(f); setDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteId(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      <FornecedorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} fornecedor={editing} onSaved={fetchData} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fornecedores;
