import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Package, Pencil, Trash2, AlertTriangle, Phone, Mail, Truck, Car, Fuel, Calendar, LogOut, Undo2, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { EstoqueFormDialog } from "@/components/estoque/EstoqueFormDialog";
import { SaidaFormDialog } from "@/components/estoque/SaidaFormDialog";
import { FornecedorFormDialog } from "@/components/fornecedores/FornecedorFormDialog";
import { VeiculoFormDialog } from "@/components/veiculos/VeiculoFormDialog";
import { VeiculoDetalhe } from "@/components/veiculos/VeiculoDetalhe";
import { toast } from "sonner";
import { whatsappUrlFromPhone } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categoriaColors: Record<string, string> = {
  "Sondagem à Percussão": "bg-info/15 text-info border-info/30",
  "Sondagem Rotativa": "bg-accent/15 text-accent border-accent/30",
  "Instrumentação": "bg-success/15 text-success border-success/30",
  "Poços de Monitoramento": "bg-warning/15 text-warning border-warning/30",
  "Poço Tubular Profundo": "bg-primary/15 text-primary border-primary/30",
  "Material": "bg-secondary/15 text-secondary-foreground border-secondary/30",
  "Equipamentos": "bg-accent/15 text-accent-foreground border-accent/30",
  "Geofísica": "bg-success/15 text-success border-success/30",
  "Escritório": "bg-muted text-muted-foreground border-border",
  "Veículos": "bg-info/15 text-info border-info/30",
  "EPI": "bg-destructive/15 text-destructive border-destructive/30",
  "Outro": "bg-muted text-muted-foreground border-border",
};

const tipoColors: Record<string, string> = {
  Material: "bg-info/15 text-info border-info/30",
  Equipamento: "bg-accent/15 text-accent border-accent/30",
  Serviço: "bg-success/15 text-success border-success/30",
  Escritório: "bg-muted text-muted-foreground border-border",
  Logística: "bg-warning/15 text-warning border-warning/30",
  Outro: "bg-muted text-muted-foreground border-border",
};

const statusVeiculoColors: Record<string, string> = {
  "Disponível": "bg-success/15 text-success border-success/30",
  "Em uso": "bg-info/15 text-info border-info/30",
  "Manutenção": "bg-warning/15 text-warning border-warning/30",
  "Inativo": "bg-muted text-muted-foreground border-border",
};

const Estoque = () => {
  const [tab, setTab] = useState("estoque");

  // Estoque state
  const [items, setItems] = useState<any[]>([]);
  const [searchEstoque, setSearchEstoque] = useState("");
  const [estoqueDialogOpen, setEstoqueDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteEstoqueId, setDeleteEstoqueId] = useState<string | null>(null);
  const [loadingEstoque, setLoadingEstoque] = useState(true);

  // Fornecedores state
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [searchFornecedor, setSearchFornecedor] = useState("");
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);
  const [deleteFornecedorId, setDeleteFornecedorId] = useState<string | null>(null);
  const [loadingFornecedores, setLoadingFornecedores] = useState(true);

  // Veiculos state
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [searchVeiculo, setSearchVeiculo] = useState("");
  const [veiculoDialogOpen, setVeiculoDialogOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<any>(null);
  const [deleteVeiculoId, setDeleteVeiculoId] = useState<string | null>(null);
  const [loadingVeiculos, setLoadingVeiculos] = useState(true);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);

  // Saídas state
  const [saidas, setSaidas] = useState<any[]>([]);
  const [searchSaida, setSearchSaida] = useState("");
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [editingSaida, setEditingSaida] = useState<any>(null);
  const [deleteSaidaId, setDeleteSaidaId] = useState<string | null>(null);
  const [loadingSaidas, setLoadingSaidas] = useState(true);
  const fetchItems = useCallback(async () => {
    setLoadingEstoque(true);
    const { data, error } = await supabase.from("estoque").select("*").order("nome");
    if (error) toast.error("Erro ao carregar estoque");
    else setItems(data || []);
    setLoadingEstoque(false);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    setLoadingFornecedores(true);
    const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
    if (error) toast.error("Erro ao carregar fornecedores");
    else setFornecedores(data || []);
    setLoadingFornecedores(false);
  }, []);

  const fetchVeiculos = useCallback(async () => {
    setLoadingVeiculos(true);
    const { data, error } = await supabase.from("veiculos" as any).select("*").order("placa");
    if (error) toast.error("Erro ao carregar veículos");
    else setVeiculos((data as any[]) || []);
    setLoadingVeiculos(false);
  }, []);
  const fetchSaidas = useCallback(async () => {
    setLoadingSaidas(true);
    const { data, error } = await supabase.from("estoque_saidas" as any).select("*").order("data_saida", { ascending: false });
    if (error) toast.error("Erro ao carregar saídas");
    else setSaidas((data as any[]) || []);
    setLoadingSaidas(false);
  }, []);

  useEffect(() => { fetchItems(); fetchFornecedores(); fetchVeiculos(); fetchSaidas(); }, [fetchItems, fetchFornecedores, fetchVeiculos, fetchSaidas]);

  const handleDeleteEstoque = async () => {
    if (!deleteEstoqueId) return;
    const { error } = await supabase.from("estoque").delete().eq("id", deleteEstoqueId);
    if (error) toast.error("Erro ao excluir item");
    else { toast.success("Item excluído"); fetchItems(); }
    setDeleteEstoqueId(null);
  };

  const handleDeleteFornecedor = async () => {
    if (!deleteFornecedorId) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", deleteFornecedorId);
    if (error) toast.error("Erro ao excluir fornecedor");
    else { toast.success("Fornecedor excluído"); fetchFornecedores(); }
    setDeleteFornecedorId(null);
  };

  const handleDeleteVeiculo = async () => {
    if (!deleteVeiculoId) return;
    const { error } = await supabase.from("veiculos" as any).delete().eq("id", deleteVeiculoId);
    if (error) toast.error("Erro ao excluir veículo");
    else { toast.success("Veículo excluído"); fetchVeiculos(); }
    setDeleteVeiculoId(null);
  };

  const handleDeleteSaida = async () => {
    if (!deleteSaidaId) return;
    const { error } = await supabase.from("estoque_saidas" as any).delete().eq("id", deleteSaidaId);
    if (error) toast.error("Erro ao excluir saída");
    else { toast.success("Saída excluída"); fetchSaidas(); }
    setDeleteSaidaId(null);
  };

  const getItemNome = (estoqueId: string) => {
    const item = items.find((i) => i.id === estoqueId);
    return item ? item.nome : "Item removido";
  };

  const filteredSaidas = saidas.filter((s: any) =>
    s.retirado_por?.toLowerCase().includes(searchSaida.toLowerCase()) ||
    s.destino?.toLowerCase().includes(searchSaida.toLowerCase()) ||
    getItemNome(s.estoque_id)?.toLowerCase().includes(searchSaida.toLowerCase())
  );

  const filteredItems = items.filter((i) =>
    i.nome?.toLowerCase().includes(searchEstoque.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(searchEstoque.toLowerCase())
  );

  const filteredFornecedores = fornecedores.filter((f) =>
    f.nome?.toLowerCase().includes(searchFornecedor.toLowerCase()) ||
    f.produtos_servicos?.toLowerCase().includes(searchFornecedor.toLowerCase()) ||
    f.tipo?.toLowerCase().includes(searchFornecedor.toLowerCase())
  );

  const filteredVeiculos = veiculos.filter((v: any) =>
    v.placa?.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    v.marca?.toLowerCase().includes(searchVeiculo.toLowerCase()) ||
    v.responsavel?.toLowerCase().includes(searchVeiculo.toLowerCase())
  );

  const lowStock = items.filter((i) => i.quantidade <= i.quantidade_minima && i.quantidade_minima > 0);

  const isDateExpiring = (dateStr: string | null) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };
  const isDateExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const veiculosAlerta = veiculos.filter((v: any) =>
    isDateExpiring(v.data_proxima_revisao) || isDateExpired(v.data_proxima_revisao) ||
    isDateExpiring(v.seguro_vencimento) || isDateExpired(v.seguro_vencimento) ||
    isDateExpiring(v.licenciamento_vencimento) || isDateExpired(v.licenciamento_vencimento)
  );

  if (selectedVeiculo) {
    return <VeiculoDetalhe veiculo={selectedVeiculo} onBack={() => setSelectedVeiculo(null)} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estoque, Fornecedores & Veículos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie materiais, equipamentos, fornecedores e frota em um só lugar
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="estoque" className="gap-2">
            <Package className="h-4 w-4" />
            Estoque
            {lowStock.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {lowStock.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saidas" className="gap-2">
            <LogOut className="h-4 w-4" />
            Saídas
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="gap-2">
            <Truck className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="veiculos" className="gap-2">
            <Car className="h-4 w-4" />
            Veículos
            {veiculosAlerta.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {veiculosAlerta.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== ESTOQUE TAB ===== */}
        <TabsContent value="estoque" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {items.length} ite{items.length !== 1 ? "ns" : "m"} cadastrado{items.length !== 1 ? "s" : ""}
              {lowStock.length > 0 && (
                <span className="text-destructive ml-2">· {lowStock.length} abaixo do mínimo</span>
              )}
            </p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingItem(null); setEstoqueDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo Item
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou categoria..." value={searchEstoque} onChange={(e) => setSearchEstoque(e.target.value)} className="pl-9" />
          </div>

          {loadingEstoque ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum item encontrado</p>
              <Button variant="link" onClick={() => { setEditingItem(null); setEstoqueDialogOpen(true); }}>Cadastrar primeiro item</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const grouped: Record<string, any[]> = {};
                filteredItems.forEach((item) => {
                  const cat = item.categoria || "Outro";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(item);
                });
                const sortedCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

                return sortedCategories.map((categoria) => {
                  const groupItems = grouped[categoria];
                  const lowInGroup = groupItems.filter((i) => i.quantidade <= i.quantidade_minima && i.quantidade_minima > 0);

                  return (
                    <Collapsible key={categoria} defaultOpen>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{categoria}</span>
                            <Badge variant="secondary" className="text-xs">{groupItems.length} {groupItems.length === 1 ? "item" : "itens"}</Badge>
                            {lowInGroup.length > 0 && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {lowInGroup.length} baixo
                              </Badge>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 mt-2 ml-4 border-l-2 border-border pl-4">
                          {groupItems.map((item, i) => {
                            const isLow = item.quantidade <= item.quantidade_minima && item.quantidade_minima > 0;
                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`stat-card cursor-pointer group ${isLow ? "border-destructive/40" : ""}`}
                                onClick={() => { setEditingItem(item); setEstoqueDialogOpen(true); }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-foreground truncate">{item.nome}</h3>
                                      {isLow && (
                                        <span className="flex items-center gap-1 text-xs text-destructive">
                                          <AlertTriangle className="h-3 w-3" /> Estoque baixo
                                        </span>
                                      )}
                                    </div>
                                    {item.localizacao && (
                                      <p className="text-sm text-muted-foreground mt-1 truncate">{item.localizacao}</p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-lg font-bold text-foreground">{item.quantidade}</span>
                                    <span className="text-sm text-muted-foreground ml-1">{item.unidade}</span>
                                    {item.quantidade_minima > 0 && (
                                      <p className="text-xs text-muted-foreground">mín: {item.quantidade_minima}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => { setEditingItem(item); setEstoqueDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setDeleteEstoqueId(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                });
              })()}
            </div>
          )}
        </TabsContent>

        {/* ===== SAÍDAS TAB ===== */}
        <TabsContent value="saidas" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {saidas.length} saída{saidas.length !== 1 ? "s" : ""} registrada{saidas.length !== 1 ? "s" : ""}
            </p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingSaida(null); setSaidaDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Nova Saída
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por item, pessoa ou destino..." value={searchSaida} onChange={(e) => setSearchSaida(e.target.value)} className="pl-9" />
          </div>

          {loadingSaidas ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : filteredSaidas.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhuma saída registrada</p>
              <Button variant="link" onClick={() => { setEditingSaida(null); setSaidaDialogOpen(true); }}>Registrar primeira saída</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSaidas.map((s: any, i: number) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`stat-card cursor-pointer group ${s.tipo_saida === 'Consumo' ? "border-muted" : !s.devolvido ? "border-warning/40" : "border-success/40"}`}
                  onClick={() => { setEditingSaida(s); setSaidaDialogOpen(true); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{getItemNome(s.estoque_id)}</h3>
                        {s.tipo_saida === 'Consumo' ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Consumo</Badge>
                        ) : (
                          <Badge variant="outline" className={s.devolvido ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}>
                            {s.devolvido ? "Devolvido" : "Pendente"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Retirado por: <span className="font-medium text-foreground">{s.retirado_por}</span>
                      </p>
                      {s.destino && <p className="text-sm text-muted-foreground">Destino: {s.destino}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-foreground">{s.quantidade}</span>
                      <p className="text-xs text-muted-foreground">{new Date(s.data_saida).toLocaleDateString("pt-BR")}</p>
                      {s.data_devolucao && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Undo2 className="h-3 w-3" />
                          {new Date(s.data_devolucao).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingSaida(s); setSaidaDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteSaidaId(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== FORNECEDORES TAB ===== */}
        <TabsContent value="fornecedores" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {fornecedores.length} fornecedor{fornecedores.length !== 1 ? "es" : ""} cadastrado{fornecedores.length !== 1 ? "s" : ""}
            </p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingFornecedor(null); setFornecedorDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, tipo ou produtos..." value={searchFornecedor} onChange={(e) => setSearchFornecedor(e.target.value)} className="pl-9" />
          </div>

          {loadingFornecedores ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : filteredFornecedores.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
              <Button variant="link" onClick={() => { setEditingFornecedor(null); setFornecedorDialogOpen(true); }}>Cadastrar primeiro fornecedor</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFornecedores.map((f, i) => {
                const waFornecedor = whatsappUrlFromPhone(f.telefone);
                return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="stat-card cursor-pointer group"
                  onClick={() => { setEditingFornecedor(f); setFornecedorDialogOpen(true); }}
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
                    {waFornecedor && (
                      <a
                        href={waFornecedor}
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
                    <button onClick={() => { setEditingFornecedor(f); setFornecedorDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteFornecedorId(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== VEÍCULOS TAB ===== */}
        <TabsContent value="veiculos" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""} cadastrado{veiculos.length !== 1 ? "s" : ""}
              {veiculosAlerta.length > 0 && (
                <span className="text-destructive ml-2">· {veiculosAlerta.length} com pendências</span>
              )}
            </p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingVeiculo(null); setVeiculoDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo Veículo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por placa, modelo, marca ou responsável..." value={searchVeiculo} onChange={(e) => setSearchVeiculo(e.target.value)} className="pl-9" />
          </div>

          {loadingVeiculos ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : filteredVeiculos.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum veículo encontrado</p>
              <Button variant="link" onClick={() => { setEditingVeiculo(null); setVeiculoDialogOpen(true); }}>Cadastrar primeiro veículo</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVeiculos.map((v: any, i: number) => {
                const hasAlert = isDateExpiring(v.data_proxima_revisao) || isDateExpired(v.data_proxima_revisao) ||
                  isDateExpiring(v.seguro_vencimento) || isDateExpired(v.seguro_vencimento) ||
                  isDateExpiring(v.licenciamento_vencimento) || isDateExpired(v.licenciamento_vencimento);
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`stat-card cursor-pointer group ${hasAlert ? "border-warning/40" : ""}`}
                    onClick={() => setSelectedVeiculo(v)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{v.placa}</h3>
                          <Badge variant="outline" className={statusVeiculoColors[v.status] || ""}>
                            {v.status}
                          </Badge>
                          {hasAlert && (
                            <span className="flex items-center gap-1 text-xs text-warning">
                              <AlertTriangle className="h-3 w-3" /> Pendência
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {v.marca} {v.modelo} {v.ano && `· ${v.ano}`}
                        </p>
                        {v.responsavel && (
                          <p className="text-xs text-muted-foreground mt-0.5">Resp: {v.responsavel}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                          <Fuel className="h-3.5 w-3.5" />
                          <span>{v.combustivel}</span>
                        </div>
                        {v.km_atual > 0 && (
                          <p className="text-xs text-muted-foreground">{Number(v.km_atual).toLocaleString("pt-BR")} km</p>
                        )}
                      </div>
                    </div>

                    {/* Datas de vencimento */}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {v.data_proxima_revisao && (
                        <span className={`flex items-center gap-1 ${isDateExpired(v.data_proxima_revisao) ? "text-destructive" : isDateExpiring(v.data_proxima_revisao) ? "text-warning" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          Revisão: {new Date(v.data_proxima_revisao).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {v.seguro_vencimento && (
                        <span className={`flex items-center gap-1 ${isDateExpired(v.seguro_vencimento) ? "text-destructive" : isDateExpiring(v.seguro_vencimento) ? "text-warning" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          Seguro: {new Date(v.seguro_vencimento).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {v.licenciamento_vencimento && (
                        <span className={`flex items-center gap-1 ${isDateExpired(v.licenciamento_vencimento) ? "text-destructive" : isDateExpiring(v.licenciamento_vencimento) ? "text-warning" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          Licenciamento: {new Date(v.licenciamento_vencimento).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingVeiculo(v); setVeiculoDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteVeiculoId(v.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EstoqueFormDialog open={estoqueDialogOpen} onOpenChange={setEstoqueDialogOpen} item={editingItem} onSaved={fetchItems} />
      <FornecedorFormDialog open={fornecedorDialogOpen} onOpenChange={setFornecedorDialogOpen} fornecedor={editingFornecedor} onSaved={fetchFornecedores} />
      <VeiculoFormDialog open={veiculoDialogOpen} onOpenChange={setVeiculoDialogOpen} veiculo={editingVeiculo} onSaved={fetchVeiculos} />
      <SaidaFormDialog open={saidaDialogOpen} onOpenChange={setSaidaDialogOpen} saida={editingSaida} estoqueItems={items} onSaved={() => { fetchSaidas(); fetchItems(); }} />

      <AlertDialog open={!!deleteEstoqueId} onOpenChange={(o) => !o && setDeleteEstoqueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEstoque} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFornecedorId} onOpenChange={(o) => !o && setDeleteFornecedorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFornecedor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteVeiculoId} onOpenChange={(o) => !o && setDeleteVeiculoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVeiculo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSaidaId} onOpenChange={(o) => !o && setDeleteSaidaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir saída?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSaida} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Estoque;
