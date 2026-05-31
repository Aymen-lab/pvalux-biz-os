import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut, Menu, X, Building2, Flame } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/customers", label: "Clients", icon: Users },
  { to: "/quotes", label: "Devis", icon: FileText },
  { to: "/invoices", label: "Factures", icon: Receipt },
  { to: "/follow-ups", label: "Relances IA", icon: Flame },
  { to: "/settings", label: "Paramètres", icon: Settings },
] as const;

function AppLayout() {
  const { profile, user, loading, signOut, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement…</div>;
  if (!user) return null;

  // Onboarding: no company yet
  if (profile && !profile.company_id) {
    return <Onboarding onDone={refreshProfile} />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-accent grid place-items-center text-accent-foreground font-bold">P</div>
            <div className="leading-tight">
              <div className="font-display font-bold text-sm">PVALUX</div>
              <div className="text-[11px] text-sidebar-foreground/60">Business OS</div>
            </div>
          </div>
          <button className="lg:hidden text-sidebar-foreground/70" onClick={() => setOpen(false)}><X className="size-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = loc.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
                <Icon className="size-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
          <button onClick={async () => { await signOut(); nav({ to: "/login" }); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60">
            <LogOut className="size-4" />Déconnexion
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/60 px-4 lg:px-8 py-3 flex items-center gap-3 no-print">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          <h1 className="font-display font-semibold text-lg">{NAV.find((n) => loc.pathname.startsWith(n.to))?.label ?? "PVALUX"}</h1>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

function Onboarding({ onDone }: { onDone: () => Promise<void> }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      // 1. Re-verify authenticated user
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        console.error("[onboarding] getUser failed", userErr);
        throw new Error("Session expirée. Reconnectez-vous.");
      }
      const uid = userData.user.id;

      // 2. Insert company with owner_id = uid
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({ name, phone, address, email: userData.user.email, owner_id: uid })
        .select()
        .single();
      if (companyErr || !company) {
        console.error("[onboarding] company insert failed", companyErr);
        throw new Error(`Création entreprise: ${companyErr?.message ?? "inconnue"}`);
      }

      // 3. Insert owner role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: uid, company_id: company.id, role: "owner" })
        .select()
        .single();
      if (roleErr) {
        console.error("[onboarding] user_roles insert failed", roleErr);
        throw new Error(`Attribution rôle: ${roleErr.message}`);
      }

      // 4. Update profile.company_id
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("id", uid);
      if (profileErr) {
        console.error("[onboarding] profile update failed", profileErr);
        throw new Error(`Mise à jour profil: ${profileErr.message}`);
      }

      toast.success("Entreprise créée !");
      await onDone();
    } catch (e: any) {
      console.error("[onboarding] error", e);
      toast.error(e?.message ?? "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/40">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2"><Building2 className="size-5 text-primary" /><span className="font-display font-semibold">Configuration</span></div>
          <CardTitle>Créez votre entreprise</CardTitle>
          <CardDescription>Quelques informations pour commencer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Nom de l'entreprise *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aluminium PVALUX" /></div>
          <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 …" /></div>
          <div className="space-y-1.5"><Label>Adresse</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <Button className="w-full mt-2" disabled={busy || !name.trim()} onClick={create}>Continuer</Button>
        </CardContent>
      </Card>
    </div>
  );
}
