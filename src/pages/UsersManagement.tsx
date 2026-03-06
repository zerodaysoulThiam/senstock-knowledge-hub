import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Shield, ShieldCheck, User as UserIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  admin: { icon: ShieldCheck, color: "bg-destructive/10 text-destructive" },
  manager: { icon: Shield, color: "bg-primary/10 text-primary" },
  employee: { icon: UserIcon, color: "bg-accent/10 text-accent" },
};

const UsersManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { name, email, role, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Utilisateur créé avec succès !");
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground mt-1">Gestion des comptes et permissions</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="w-4 h-4" />
            Créer un utilisateur
          </button>
        </div>

        {/* Create user form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="senstock-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">Nouvel utilisateur</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="senstock-input"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="senstock-input"
                required
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="senstock-input"
                required
                minLength={6}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="senstock-input"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employé</option>
              </select>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Role stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {(["admin", "manager", "employee"] as const).map((r) => {
            const config = roleConfig[r];
            const count = users.filter((u: any) => u.role === r).length;
            return (
              <div key={r} className="senstock-stat-card flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
                  <config.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{r}s</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="senstock-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-display font-semibold">Aucun utilisateur créé pour le moment.</p>
              <p className="text-sm mt-1">Cliquez sur « Créer un utilisateur » pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date de création</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => {
                    const config = roleConfig[user.role] || roleConfig.employee;
                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                            <config.icon className="w-3 h-3" />
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UsersManagement;
