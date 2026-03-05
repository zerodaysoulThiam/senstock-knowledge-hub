import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Edit2, Shield, ShieldCheck, User as UserIcon } from "lucide-react";

interface AppUser {
  id: number;
  username: string;
  role: "admin" | "manager" | "employé" | "client";
  status: "actif" | "inactif";
  lastLogin: string;
}

const mockUsers: AppUser[] = [
  { id: 1, username: "passer", role: "admin", status: "actif", lastLogin: "Il y a 2 min" },
  { id: 2, username: "matar", role: "admin", status: "actif", lastLogin: "Il y a 1h" },
  { id: 3, username: "a.diallo", role: "manager", status: "actif", lastLogin: "Il y a 3h" },
  { id: 4, username: "m.ndiaye", role: "employé", status: "actif", lastLogin: "Hier" },
  { id: 5, username: "f.sow", role: "employé", status: "actif", lastLogin: "Il y a 2 jours" },
  { id: 6, username: "client_total", role: "client", status: "inactif", lastLogin: "Il y a 1 semaine" },
];

const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  admin: { icon: ShieldCheck, color: "bg-destructive/10 text-destructive" },
  manager: { icon: Shield, color: "bg-primary/10 text-primary" },
  employé: { icon: UserIcon, color: "bg-accent/10 text-accent" },
  client: { icon: UserIcon, color: "bg-muted text-muted-foreground" },
};

const UsersManagement = () => {
  const [users] = useState<AppUser[]>(mockUsers);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground mt-1">Gestion des comptes et permissions</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="w-4 h-4" />
            Créer un utilisateur
          </button>
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {(["admin", "manager", "employé", "client"] as const).map((role) => {
            const config = roleConfig[role];
            const count = users.filter((u) => u.role === role).length;
            return (
              <div key={role} className="senstock-stat-card flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
                  <config.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{role}s</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="senstock-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dernière connexion</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const config = roleConfig[user.role];
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          <config.icon className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.status === "actif" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${user.status === "actif" ? "bg-success" : "bg-muted-foreground"}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.lastLogin}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UsersManagement;
