import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldAlert, Key, UserPlus, Mail, Lock } from "lucide-react";
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Acesso negado ou erro ao buscar");
      return res.json();
    },
    enabled: userRole === 'admin'
  });

  const mutCreateUser = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          email: newEmail, 
          password: newPassword, 
          role_name: newRole 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar usuário");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "✅ Usuário criado com sucesso!" });
      setIsDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
    },
    onError: (e: any) => {
      toast({ 
        title: "Erro na criação", 
        description: e.message, 
        variant: "destructive" 
      });
    }
  });

  const mutRole = useMutation({
    mutationFn: async ({ id, newRole }: { id: string, newRole: string }) => {
      const res = await fetch(`${API_URL}/auth/users/${id}/role`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role_name: newRole })
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: (e: any) => {
      toast({ title: "Erro na atualização", description: e.message, variant: "destructive" });
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
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciador de Usuários</h1>
            <p className="text-sm text-muted-foreground">Administração global de acessos e perfis</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo acesso para um colaborador. Ele poderá fazer login com as credenciais abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="exemplo@hcgeo.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={mutCreateUser.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => mutCreateUser.mutate()}
                disabled={mutCreateUser.isPending || !newEmail || newPassword.length < 6}
              >
                {mutCreateUser.isPending ? "Criando..." : "Confirmar Cadastro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-4 w-4" /> Controle de Perfis (Roles)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email de Acesso</TableHead>
                  <TableHead>Identificador Interno</TableHead>
                  <TableHead>Perfil Atual</TableHead>
                  <TableHead className="text-right">Alterar Perfil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Buscando lista de usuários...</TableCell></TableRow>
                )}
                {!isLoading && users.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground select-all">{u.id}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? "default" : u.role === 'financeiro' ? "secondary" : "outline"}>
                        {u.role ? u.role.toUpperCase() : "NENHUM"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select 
                        disabled={mutRole.isPending}
                        value={u.role || "user"} 
                        onValueChange={(val) => {
                          if (val !== u.role) mutRole.mutate({ id: u.id, newRole: val });
                        }}
                      >
                        <SelectTrigger className="w-[180px] ml-auto">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário Comum</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
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
