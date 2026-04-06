import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldAlert, Key, UserPlus, Mail, Lock, Edit2, RotateCcw, Check, X, Copy, AlertTriangle, Unlock, UserX, Info, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UsersAdmin() {
  const { session } = useAuth();
  const userRole = session?.user?.role;
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const token = localStorage.getItem("hcgeotoken");

  // Estados para criação de usuário
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");

  // Estados para manutenção
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState("");
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [userToReset, setUserToReset] = useState<any>(null);
  const [lockoutUserInfo, setLockoutUserInfo] = useState<any>(null); // Modal de detalhes do bloqueio

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Acesso negado");
      return res.json();
    },
    enabled: userRole === 'admin'
  });

  const mutCreateUser = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role_name: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "✅ Usuário criado!" });
      setIsDialogOpen(false);
      setNewEmail(""); setNewPassword("");
    },
    onError: (e: any) => toast({ title: "Erro na criação", description: e.message, variant: "destructive" })
  });

  const mutUpdateEmail = useMutation({
    mutationFn: async ({ id, email }: { id: string, email: string }) => {
      const res = await fetch(`${API_URL}/auth/users/${id}/email`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error("Erro ao atualizar e-mail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      setEditingUserId(null);
      toast({ title: "E-mail atualizado!" });
    }
  });

  const mutResetPassword = useMutation({
    mutationFn: async (user: any) => {
      const res = await fetch(`${API_URL}/auth/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao resetar");
      const data = await res.json();
      return { email: user.email, password: data.newPassword };
    },
    onSuccess: (data) => {
      setUserToReset(null);
      setResetResult(data);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" })
  });

  const mutUnblock = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/auth/users/${id}/unblock`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao desbloquear");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      setLockoutUserInfo(null);
      toast({ title: "✅ Conta Desbloqueada", description: "O acesso foi restabelecido." });
    }
  });

  const mutRole = useMutation({
    mutationFn: async ({ id, newRole }: { id: string, newRole: string }) => {
      const res = await fetch(`${API_URL}/auth/users/${id}/role`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role_name: newRole })
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "Perfil atualizado!" });
    }
  });

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas administradores globais podem gerenciar usuários do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg"><Shield className="h-8 w-8 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciador de Usuários</h1>
            <p className="text-sm text-muted-foreground">Administração global de acessos e perfis</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>Crie um novo acesso para um colaborador.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="exemplo@hcgeo.com.br" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Senha Temporária</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-9" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => mutCreateUser.mutate()} disabled={mutCreateUser.isPending || !newEmail || newPassword.length < 6}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5" /> Resetar Senha?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a resetar a senha de <b>{userToReset?.email}</b>. 
              Uma nova senha temporária será gerada e mostrada na tela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutResetPassword.mutate(userToReset)} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Sim, Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetResult} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success"><Check className="h-5 w-5" /> Senha Resetada!</DialogTitle>
            <DialogDescription>Copia a nova senha e envie ao colaborador:</DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg flex items-center justify-between border border-border">
            <code className="text-xl font-bold tracking-wider">{resetResult?.password}</code>
            <Button size="icon" variant="ghost" onClick={() => {
              navigator.clipboard.writeText(resetResult?.password || "");
              toast({ title: "Copiado!" });
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Bloqueio */}
      <Dialog open={!!lockoutUserInfo} onOpenChange={(open) => !open && setLockoutUserInfo(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Detalhes do Bloqueio
            </DialogTitle>
            <DialogDescription>Informações de segurança da conta:</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" /> IP de Origem
              </div>
              <span className="font-mono font-bold text-foreground">{lockoutUserInfo?.last_failed_ip || "Não registrado"}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Erros Seguidos
              </div>
              <span className="font-bold text-destructive">{lockoutUserInfo?.failed_attempts} de 5</span>
            </div>
            
            <p className="text-[11px] text-muted-foreground text-center italic">
              Este bloqueio ocorreu após o limite de segurança ser atingido. 
              Verifique com o colaborador se as tentativas foram legítimas.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setLockoutUserInfo(null)}>Fechar</Button>
            <Button 
               className="flex-1 bg-success text-success-foreground hover:bg-success/90 gap-2" 
               onClick={() => mutUnblock.mutate(lockoutUserInfo.id)}
               disabled={mutUnblock.isPending}
            >
              <Unlock className="h-4 w-4" /> Desbloquear Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Key className="h-4 w-4" /> Controle de Usuários</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail / Status</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-8">Carregando...</TableCell></TableRow>}
                {users.map((u: any) => (
                  <TableRow key={u.id} className={u.is_blocked ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <Input size={30} value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} autoFocus />
                            <Button size="icon" variant="ghost" className="text-success" onClick={() => mutUpdateEmail.mutate({ id: u.id, email: tempEmail })}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setEditingUserId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-medium">{u.email}</span>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingUserId(u.id); setTempEmail(u.email); }}>
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                            {u.is_blocked && (
                              <button 
                                onClick={() => setLockoutUserInfo(u)}
                                className="flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold border border-destructive/20 animate-pulse hover:bg-destructive/20 transition-colors"
                              >
                                ! CONTA BLOQUEADA
                                <Info className="h-2.5 w-2.5 ml-1" />
                              </button>
                            )}
                          </div>
                        )}
                        {u.failed_attempts > 0 && !u.is_blocked && (
                          <span className="text-[10px] text-muted-foreground">Tentativas falhas: {u.failed_attempts}/5</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select disabled={mutRole.isPending} value={u.role || "user"} onValueChange={(val) => mutRole.mutate({ id: u.id, newRole: val })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">USER</SelectItem>
                          <SelectItem value="financeiro">FINAN</SelectItem>
                          <SelectItem value="admin">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 text-right">
                        {u.is_blocked ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="gap-2 bg-success text-success-foreground hover:bg-success/90" 
                            onClick={() => mutUnblock.mutate(u.id)}
                            disabled={mutUnblock.isPending}
                          >
                            <Unlock className="h-3.5 w-3.5" /> Liberar
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-2 border-warning/30 hover:bg-warning/5 text-warning" onClick={() => setUserToReset(u)}>
                            <RotateCcw className="h-3.5 w-3.5" /> Resetar
                          </Button>
                        )}
                      </div>
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
