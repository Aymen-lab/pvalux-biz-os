import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Paramètres — PVALUX" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const { data: company } = useQuery({
    queryKey: ["company", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("companies").select("*").eq("id", cid!).single()).data,
  });
  const [f, setF] = useState<any>({});
  useEffect(() => { if (company) setF(company); }, [company]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("companies").update({
      name: f.name, phone: f.phone, address: f.address, email: f.email,
      tax_id: f.tax_id, currency: f.currency, default_tax: Number(f.default_tax),
      payment_terms: f.payment_terms,
    }).eq("id", cid!);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Enregistré");
    qc.invalidateQueries({ queryKey: ["company"] });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Profil de l'entreprise</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Nom</Label><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Adresse</Label><Textarea rows={2} value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><Label>Matricule fiscal</Label><Input value={f.tax_id ?? ""} onChange={(e) => setF({ ...f, tax_id: e.target.value })} /></div>
          <div><Label>Devise</Label><Input value={f.currency ?? "TND"} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
          <div><Label>TVA par défaut (%)</Label><Input type="number" value={f.default_tax ?? 19} onChange={(e) => setF({ ...f, default_tax: e.target.value })} /></div>
          <div><Label>Conditions de paiement</Label><Input value={f.payment_terms ?? ""} onChange={(e) => setF({ ...f, payment_terms: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-end"><Button onClick={save} disabled={busy}>Enregistrer</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
