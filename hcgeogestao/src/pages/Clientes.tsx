import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Building2, Phone, Mail, Pencil, Trash2, User, Filter, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { ImportLeadDialog } from "@/components/ImportLeadDialog";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { apiAuthHeaders } from "@/lib/apiClient";
import { whatsappUrlFromPhone } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIPO_FILTERS = ["Todos", "Pessoa Jurídica", "Pessoa Física"];

const Clientes = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchClientes = useCallback(async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem("hcgeotoken");
      const res = await fetch(`${API_URL}/api/clientes`, {
        headers: apiAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Erro na API");
      const data = await res.json();
      setClientes(data || []);
    } catch (error) {
      toast.error("Erro ao carregar clientes");
      setClientes([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("hcgeotoken");
      const res = await fetch(`${API_URL}/api/clientes/${deleteId}`, {
        method: "DELETE",
        headers: apiAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Erro na exclusão");
      toast.success("Cliente excluído");
      fetchClientes();
    } catch (err) {
      toast.error("Erro ao excluir cliente");
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = clientes.filter((c) => {
    const matchSearch =
      c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj_cpf?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone?.includes(search);
    const matchTipo = tipoFilter === "Todos" || c.tipo_cliente === tipoFilter;
    return matchSearch && matchTipo;
  });

  const countPJ = clientes.filter(c => c.tipo_cliente === "Pessoa Jurídica").length;
  const countPF = clientes.filter(c => c.tipo_cliente === "Pessoa Física").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} · {countPJ} PJ · {countPF} PF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
            onClick={() => setImportDialogOpen(true)}
          >
            <UserCheck className="h-4 w-4" />
            Importar de Leads
          </Button>
          <Button 
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" 
            onClick={() => { setEditingCliente(null); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, fantasia, CNPJ/CPF, e-mail ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {TIPO_FILTERS.map((tipo) => (
            <Button
              key={tipo}
              variant={tipoFilter === tipo ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFilter(tipo)}
              className="text-xs"
            >
              {tipo === "Todos" && <Filter className="h-3 w-3 mr-1" />}
              {tipo === "Pessoa Jurídica" && <Building2 className="h-3 w-3 mr-1" />}
              {tipo === "Pessoa Física" && <User className="h-3 w-3 mr-1" />}
              {tipo}
            </Button>
          ))}
        </div>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum cliente encontrado</p>
          <Button variant="link" onClick={() => { setEditingCliente(null); setDialogOpen(true); }}>Cadastrar primeiro cliente</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cliente, i) => {
            const wa = whatsappUrlFromPhone(cliente.telefone);
            return (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="stat-card cursor-pointer group"
              onClick={() => { setEditingCliente(cliente); setDialogOpen(true); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{cliente.razao_social}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cliente.tipo_cliente === "Pessoa Física" ? "PF" : "PJ"}
                    </Badge>
                  </div>
                  {cliente.nome_fantasia && (
                    <p className="text-sm text-muted-foreground truncate">{cliente.nome_fantasia}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    {cliente.cnpj_cpf && <span>{cliente.cnpj_cpf}</span>}
                    {cliente.cnpj_cpf && cliente.cidade_uf && <span className="mx-1">·</span>}
                    {cliente.cidade_uf && <span>{cliente.cidade_uf}</span>}
                  </div>
                </div>
                {cliente.tipo_cliente === "Pessoa Física" ? (
                  <User className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                )}
              </div>

              {cliente.contato_principal && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Contato: {cliente.contato_principal}
                </p>
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
                {cliente.email && (
                  <a href={`mailto:${cliente.email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => { setEditingCliente(cliente); setDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteId(cliente.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ClienteFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        cliente={editingCliente} 
        onSaved={fetchClientes} 
      />

      <ImportLeadDialog 
        isOpen={importDialogOpen} 
        onOpenChange={setImportDialogOpen} 
        onSuccess={fetchClientes}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Leads e propostas vinculados perderão a referência.</AlertDialogDescription>
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

export default Clientes;
