import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — PVALUX Business OS" }] }),
  component: LoginPage,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (mode: "in" | "up") => {
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/dashboard";
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
        if (error) throw error;
        toast.success("Compte créé !");
        window.location.href = "/dashboard";
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) { toast.error((result.error as Error).message); setBusy(false); return; }
    if (result.redirected) return;
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex flex-1 bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground font-bold">P</div>
          <span className="font-display text-xl font-bold">PVALUX Business OS</span>
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold leading-tight">Gérez votre atelier alu & PVC depuis un seul endroit.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">Clients, devis, factures, paiements et relances — pensé pour les artisans tunisiens.</p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">© PVALUX</p>
      </div>
      <div className="flex-1 grid place-items-center p-6">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 lg:hidden mb-2">
              <Building2 className="size-5 text-primary" />
              <span className="font-display font-bold">PVALUX Business OS</span>
            </div>
            <CardTitle className="font-display">Bienvenue</CardTitle>
            <CardDescription>Connectez-vous pour gérer vos devis et factures.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="in">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="in">Connexion</TabsTrigger>
                <TabsTrigger value="up">Créer un compte</TabsTrigger>
              </TabsList>
              {(["in", "up"] as const).map((m) => (
                <TabsContent key={m} value={m} className="space-y-3 mt-4">
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Mot de passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button className="w-full" disabled={busy} onClick={() => submit(m)}>{m === "in" ? "Se connecter" : "Créer mon compte"}</Button>
                </TabsContent>
              ))}
            </Tabs>
            <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">ou</span><div className="h-px flex-1 bg-border" /></div>
            <Button variant="outline" className="w-full" disabled={busy} onClick={google}>Continuer avec Google</Button>
            <p className="mt-4 text-xs text-muted-foreground text-center"><Link to="/" className="hover:underline">Retour</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
