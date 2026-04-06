import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldAlert, Key } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UsersAdmin() {
  const { session } = useAuth();
  const userRole = session?.user?.role;
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const token = localStorage.getItem("hcgeotoken");

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
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciador de Usuários</h1>
          <p className="text-sm text-muted-foreground">Administração global de acessos e perfis</p>
        </div>
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
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando usuários...</TableCell></TableRow>
                )}
                {!isLoading && users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{u.id}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? "default" : u.role === 'financeiro' ? "secondary" : "outline"}>
                        {u.role ? u.role.toUpperCase() : "NENHUM"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select 
                        disabled={mutRole.isPending}
                        value={u.role} 
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
