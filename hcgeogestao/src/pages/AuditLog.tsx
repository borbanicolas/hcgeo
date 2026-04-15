import { ShieldAlert, List, Activity, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";
import { apiAuthHeaders } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

/** Deve coincidir com AUDIT_LOG_RESET_EMAILS na API (exibição só de UX; a API valida de novo). */
const AUDIT_RESET_EMAILS = new Set(["dev@nikoscience.com", "dev@nikoscience.tech", "dev@nikoscience"]);

function canResetAuditLogs(email?: string | null) {
  const e = email?.toLowerCase().trim();
  return !!e && AUDIT_RESET_EMAILS.has(e);
}

export default function AuditLog() {
  const { session } = useAuth();
  const userRole = session?.user?.role;
  const userEmail = session?.user?.email as string | undefined;
  const token = localStorage.getItem("hcgeotoken");
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin_audit_logs"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/audit`, {
        headers: apiAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Acesso negado aos logs");
      return res.json();
    },
    enabled: userRole === 'admin',
    refetchInterval: 15000 // A cada 15s puxa atualizações
  });

  const handleResetLogs = async () => {
    if (!token) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/auth/audit/reset`, {
        method: "POST",
        headers: apiAuthHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Falha ao limpar logs");
      }
      toast.success(data.message || "Logs reiniciados.");
      await queryClient.invalidateQueries({ queryKey: ["admin_audit_logs"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar logs");
    } finally {
      setResetting(false);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas administradores globais podem ver os logs do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs do Sistema</h1>
            <p className="text-sm text-muted-foreground">Rastreamento de ações, edições e segurança.</p>
          </div>
        </div>
        {canResetAuditLogs(userEmail) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-2 shrink-0"
                disabled={resetting}
              >
                <RotateCcw className="h-4 w-4" />
                Resetar logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar todos os logs?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação apaga o histórico de auditoria no servidor. Será registrada uma única entrada indicando que os logs foram limpos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => void handleResetLogs()}
                >
                  Resetar logs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <List className="h-4 w-4" /> Histórico de Alterações (Em breve)
          </CardTitle>
          <CardDescription>O sistema de rastreabilidade completa será ativado aqui.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto opacity-60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário Responsável</TableHead>
                  <TableHead>Ação Realizada</TableHead>
                  <TableHead>Tabela / Módulo</TableHead>
                  <TableHead className="text-right">Detalhes / IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Buscando do motor do banco...</TableCell></TableRow>
                )}
                {!isLoading && logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">O sistema ainda não registrou operações hoje.</TableCell></TableRow>
                )}
                {!isLoading && logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{log.user_email || 'Sistema'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase
                        ${log.action === 'INSERT' ? "bg-green-100 text-green-700" : 
                          log.action === 'UPDATE' ? "bg-blue-100 text-blue-700" : 
                          "bg-red-100 text-red-700"}
                      `}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{log.table_name}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Detalhes da Operação</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4 text-sm">
                            <div className="flex justify-between border-b pb-2">
                              <span className="font-semibold text-muted-foreground">Módulo afetado:</span>
                              <span className="font-mono">{log.table_name}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span className="font-semibold text-muted-foreground">Ação Central:</span>
                              <span className="font-semibold px-2 py-0.5 rounded bg-muted">
                                {log.action}
                              </span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                              <span className="font-semibold text-muted-foreground">ID do Registro Afetado:</span>
                              <span className="font-mono text-xs">{log.record_id || 'Não Aplicável'}</span>
                            </div>
                            <div className="flex flex-col gap-2 border-b pb-2">
                              <span className="font-semibold text-muted-foreground">Histórico Capturado:</span>
                              <pre className="p-3 bg-muted rounded-md text-xs whitespace-pre-wrap font-mono">
                                {log.details || 'Nenhum detalhe adicional processado.'}
                              </pre>
                            </div>
                            <div className="flex justify-between bg-yellow-500/10 p-3 rounded-md">
                              <span className="font-semibold text-yellow-600">Endereço de Origem (IP):</span>
                              <span className="font-mono text-xs text-yellow-600">{log.ip_address || 'Oculto / Servidor Local'}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
