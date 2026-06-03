export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          default_tax: number
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          payment_terms: string | null
          phone: string | null
          tax_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          default_tax?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          default_tax?: number
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          id: string
          next_number: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type: string
          id?: string
          next_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          id?: string
          next_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          language: string | null
          message: string | null
          next_action_date: string | null
          note: string | null
          priority: Database["public"]["Enums"]["followup_priority"]
          promised_date: string | null
          quote_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["followup_status"]
          tone: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          language?: string | null
          message?: string | null
          next_action_date?: string | null
          note?: string | null
          priority?: Database["public"]["Enums"]["followup_priority"]
          promised_date?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          tone?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          language?: string | null
          message?: string | null
          next_action_date?: string | null
          note?: string | null
          priority?: Database["public"]["Enums"]["followup_priority"]
          promised_date?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          tone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          balance: number
          company_id: string
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid: number
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total: number
          updated_at: string
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid?: number
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid?: number
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          category: string | null
          description: string | null
          height: number | null
          id: string
          position: number
          product_type: Database["public"]["Enums"]["product_type"]
          quantity: number
          quote_id: string
          total: number
          unit: Database["public"]["Enums"]["pricing_unit"]
          unit_price: number
          width: number | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          height?: number | null
          id?: string
          position?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          quantity?: number
          quote_id: string
          total?: number
          unit?: Database["public"]["Enums"]["pricing_unit"]
          unit_price?: number
          width?: number | null
        }
        Update: {
          category?: string | null
          description?: string | null
          height?: number | null
          id?: string
          position?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          quantity?: number
          quote_id?: string
          total?: number
          unit?: Database["public"]["Enums"]["pricing_unit"]
          unit_price?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount: number
          id: string
          installation: number
          notes: string | null
          project_name: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          transport: number
          updated_at: string
        }
        Insert: {
          company_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount?: number
          id?: string
          installation?: number
          notes?: string | null
          project_name?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          transport?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount?: number
          id?: string
          installation?: number
          notes?: string | null
          project_name?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          transport?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_company_member: {
        Args: { _company_id: string }
        Returns: undefined
      }
      convert_quote_to_invoice: {
        Args: { _due_date: string; _quote_id: string }
        Returns: Json
      }
      create_company_onboarding: {
        Args: { _address?: string; _name: string; _phone?: string }
        Returns: string
      }
      create_payment: {
        Args: {
          _amount: number
          _invoice_id: string
          _method: string
          _notes: string
          _paid_at: string
        }
        Returns: string
      }
      create_quote_with_lines: {
        Args: {
          _company_id: string
          _conditions: string
          _customer_id: string
          _discount: number
          _installation: number
          _lines: Json
          _notes: string
          _project_name: string
          _tax_rate: number
          _transport: number
        }
        Returns: Json
      }
      current_company_id: { Args: never; Returns: string }
      delete_payment: { Args: { _payment_id: string }; Returns: undefined }
      generate_document_number: {
        Args: { _company_id: string; _document_type: string }
        Returns: string
      }
      has_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_invoice: {
        Args: { _due_date: string; _invoice_id: string; _notes: string }
        Returns: Json
      }
      update_payment: {
        Args: {
          _amount: number
          _method: string
          _notes: string
          _paid_at: string
          _payment_id: string
        }
        Returns: undefined
      }
      update_quote_with_lines: {
        Args: {
          _conditions: string
          _customer_id: string
          _discount: number
          _installation: number
          _lines: Json
          _notes: string
          _project_name: string
          _quote_id: string
          _tax_rate: number
          _transport: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "sales"
      customer_status: "lead" | "active" | "inactive"
      followup_priority: "high" | "medium" | "low"
      followup_status:
        | "new"
        | "waiting"
        | "promise"
        | "partial"
        | "escalated"
        | "closed"
      invoice_status: "unpaid" | "partial" | "paid" | "overdue"
      pricing_unit: "m2" | "ml" | "piece"
      product_type:
        | "fenetres"
        | "portes"
        | "baies_vitrees"
        | "volet_roulant"
        | "garde_corps"
        | "brise_soleil"
        | "mur_rideau"
        | "autre"
      quote_status: "draft" | "sent" | "follow_up" | "accepted" | "rejected"
      risk_level: "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "sales"],
      customer_status: ["lead", "active", "inactive"],
      followup_priority: ["high", "medium", "low"],
      followup_status: [
        "new",
        "waiting",
        "promise",
        "partial",
        "escalated",
        "closed",
      ],
      invoice_status: ["unpaid", "partial", "paid", "overdue"],
      pricing_unit: ["m2", "ml", "piece"],
      product_type: [
        "fenetres",
        "portes",
        "baies_vitrees",
        "volet_roulant",
        "garde_corps",
        "brise_soleil",
        "mur_rideau",
        "autre",
      ],
      quote_status: ["draft", "sent", "follow_up", "accepted", "rejected"],
      risk_level: ["low", "medium", "high"],
    },
  },
} as const
