import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldAlert, Key, UserPlus, Mail, Lock, Edit2, RotateCcw, Check, X, Copy, AlertTriangle, Unlock, UserX, Info, Globe, ChevronLeft, Eye, EyeOff } from "lucide-react";
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
  const [resetPasswordInput, setResetPasswordInput] = useState(""); // Senha manual no reset
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState(""); // Confirmação manual no reset
  const [showResetPassword, setShowResetPassword] = useState(false); // Toggle olho
  const [resetMode, setResetMode] = useState<"none" | "manual">("none");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Acesso negado");
      return res.json();
    },
    staleTime: 0,
    gcTime: 0
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
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordInput || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao resetar");
      return { email: user.email, password: data.newPassword };
    },
    onSuccess: (data) => {
      setUserToReset(null);
      setResetPasswordInput("");
      setResetPasswordConfirm("");
      setShowResetPassword(false);
      setResetMode("none");
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

      <Dialog open={!!userToReset} onOpenChange={(open) => { if (!open) { setUserToReset(null); setResetPasswordInput(""); setResetPasswordConfirm(""); setShowResetPassword(false); setResetMode("none"); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="relative">
            {resetMode !== "none" && (
              <button 
                onClick={() => { setResetMode("none"); setResetPasswordInput(""); setResetPasswordConfirm(""); }}
                className="absolute -left-2 top-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle className={`flex items-center gap-2 text-warning ${resetMode !== "none" ? "ml-6" : ""}`}>
              <RotateCcw className="h-5 w-5" /> Resetar Senha
            </DialogTitle>
            <DialogDescription className={resetMode !== "none" ? "ml-6" : ""}>
              {resetMode === "manual" ? "Defina uma senha manualmente" : `Como deseja resetar a senha de ${userToReset?.email}?`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {resetMode === "none" ? (
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center gap-1 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => mutResetPassword.mutate(userToReset)}
                  disabled={mutResetPassword.isPending}
                >
                  <Key className="h-5 w-5 text-primary" />
                  <span>Gerar Senha Automática</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Senha forte de 12 caracteres</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center gap-1 border-warning/20 hover:border-warning/50 hover:bg-warning/5"
                  onClick={() => setResetMode("manual")}
                >
                  <Edit2 className="h-5 w-5 text-warning" />
                  <span>Escolher Senha Manual</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Você define a nova senha</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Digite a nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type={showResetPassword ? "text" : "password"}
                        placeholder="Senha com letras, números e símbolos" 
                        className="pl-9 pr-9" 
                        value={resetPasswordInput} 
                        onChange={(e) => setResetPasswordInput(e.target.value)} 
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} 
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Confirme a nova senha</Label>
                    <div className="relative">
                      <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type={showResetPassword ? "text" : "password"}
                        placeholder="Repita a senha" 
                        className="pl-9 pr-9" 
                        value={resetPasswordConfirm} 
                        onChange={(e) => setResetPasswordConfirm(e.target.value)} 
                      />
                    </div>
                    {resetPasswordInput && resetPasswordConfirm && resetPasswordInput !== resetPasswordConfirm && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> As senhas não conferem
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-border mt-2 pt-2">
                    <p className={`text-[11px] flex items-center gap-1.5 ${resetPasswordInput.length >= 6 ? "text-success" : "text-muted-foreground"}`}>
                      {resetPasswordInput.length >= 6 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Pelo menos 6 caracteres
                    </p>
                    <p className={`text-[11px] flex items-center gap-1.5 ${/[a-zA-Z]/.test(resetPasswordInput) ? "text-success" : "text-muted-foreground"}`}>
                      {/[a-zA-Z]/.test(resetPasswordInput) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Letras (az, AZ)
                    </p>
                    <p className={`text-[11px] flex items-center gap-1.5 ${/[0-9]/.test(resetPasswordInput) ? "text-success" : "text-muted-foreground"}`}>
                      {/[0-9]/.test(resetPasswordInput) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Números (0-9)
                    </p>
                    <p className={`text-[11px] flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(resetPasswordInput) ? "text-success" : "text-muted-foreground"}`}>
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(resetPasswordInput) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Caracteres especiais
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-warning text-warning-foreground hover:bg-warning/90" 
                  onClick={() => mutResetPassword.mutate(userToReset)}
                  disabled={
                    mutResetPassword.isPending || 
                    resetPasswordInput !== resetPasswordConfirm ||
                    resetPasswordInput.length < 6 || 
                    !/[a-zA-Z]/.test(resetPasswordInput) || 
                    !/[0-9]/.test(resetPasswordInput) || 
                    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(resetPasswordInput)
                  }
                >
                  Salvar Nova Senha
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setUserToReset(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {lockoutUserInfo?.last_failed_ip && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" /> Endereço de Origem
                </div>
                <span className="font-mono font-bold text-foreground">{lockoutUserInfo?.last_failed_ip}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Histórico de Erros
              </div>
              <span className="font-bold text-destructive">{lockoutUserInfo?.failed_attempts} tentativas seguidas</span>
            </div>
            
            <p className="text-[11px] text-muted-foreground text-center italic">
              Este bloqueio ocorreu automaticamente após 5 erros de senha. 
              {lockoutUserInfo?.last_failed_ip ? " O IP foi registrado para segurança." : ""}
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
