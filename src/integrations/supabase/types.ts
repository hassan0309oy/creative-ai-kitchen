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
      favorites: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          rating: number
          reason: string | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number
          reason?: string | null
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          reason?: string | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_runs: {
        Row: {
          created_at: string
          details: Json
          error: string | null
          id: string
          kind: string
          latency_ms: number | null
          model: string | null
          plan_id: string | null
          provider: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          error?: string | null
          id?: string
          kind?: string
          latency_ms?: number | null
          model?: string | null
          plan_id?: string | null
          provider?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          error?: string | null
          id?: string
          kind?: string
          latency_ms?: number | null
          model?: string | null
          plan_id?: string | null
          provider?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          aisle: string
          allergens: string[]
          base_unit: string
          category: string
          created_at: string
          currency: string
          diet_flags: string[]
          name: string
          pack_price: number
          pack_qty: number
          price_confidence: string
          price_fetched_at: string
          price_source: string
          slug: string
        }
        Insert: {
          aisle?: string
          allergens?: string[]
          base_unit?: string
          category?: string
          created_at?: string
          currency?: string
          diet_flags?: string[]
          name: string
          pack_price?: number
          pack_qty?: number
          price_confidence?: string
          price_fetched_at?: string
          price_source?: string
          slug: string
        }
        Update: {
          aisle?: string
          allergens?: string[]
          base_unit?: string
          category?: string
          created_at?: string
          currency?: string
          diet_flags?: string[]
          name?: string
          pack_price?: number
          pack_qty?: number
          price_confidence?: string
          price_fetched_at?: string
          price_source?: string
          slug?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          ingredient_slug: string | null
          name: string
          quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          ingredient_slug?: string | null
          name: string
          quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          ingredient_slug?: string | null
          name?: string
          quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_ingredient_slug_fkey"
            columns: ["ingredient_slug"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["slug"]
          },
        ]
      }
      plan_meals: {
        Row: {
          cooked_at: string | null
          cost: number
          created_at: string
          day: number
          id: string
          locked: boolean
          meal_type: string
          plan_id: string
          recipe_id: string
          servings: number
          slot: number
          user_id: string
        }
        Insert: {
          cooked_at?: string | null
          cost?: number
          created_at?: string
          day: number
          id?: string
          locked?: boolean
          meal_type: string
          plan_id: string
          recipe_id: string
          servings?: number
          slot?: number
          user_id: string
        }
        Update: {
          cooked_at?: string | null
          cost?: number
          created_at?: string
          day?: number
          id?: string
          locked?: boolean
          meal_type?: string
          plan_id?: string
          recipe_id?: string
          servings?: number
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          budget: number | null
          constraints: Json
          created_at: string
          currency: string
          days: number
          estimated_total: number
          id: string
          notes: string
          progress: number
          progress_label: string
          servings: number
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          budget?: number | null
          constraints?: Json
          created_at?: string
          currency?: string
          days?: number
          estimated_total?: number
          id?: string
          notes?: string
          progress?: number
          progress_label?: string
          servings?: number
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          budget?: number | null
          constraints?: Json
          created_at?: string
          currency?: string
          days?: number
          estimated_total?: number
          id?: string
          notes?: string
          progress?: number
          progress_label?: string
          servings?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          answers: Json
          city: string | null
          country: string
          created_at: string
          currency: string
          display_name: string | null
          language: string
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean
          postal_code: string | null
          store_brand: string | null
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          display_name?: string | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          postal_code?: string | null
          store_brand?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          display_name?: string | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          postal_code?: string | null
          store_brand?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_images: {
        Row: {
          created_at: string
          id: string
          prompt: string | null
          provider: string
          recipe_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt?: string | null
          provider?: string
          recipe_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string | null
          provider?: string
          recipe_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_images_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          allergens: string[]
          base_servings: number
          cook_minutes: number
          created_at: string
          cuisine: string
          description: string
          diets: string[]
          difficulty: string
          equipment: string[]
          id: string
          image_url: string | null
          items: Json
          meal_type: string
          prep_minutes: number
          published: boolean
          slug: string
          steps: Json
          tags: string[]
          tips: string
          title: string
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          base_servings?: number
          cook_minutes?: number
          created_at?: string
          cuisine?: string
          description?: string
          diets?: string[]
          difficulty?: string
          equipment?: string[]
          id?: string
          image_url?: string | null
          items?: Json
          meal_type: string
          prep_minutes?: number
          published?: boolean
          slug: string
          steps?: Json
          tags?: string[]
          tips?: string
          title: string
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          base_servings?: number
          cook_minutes?: number
          created_at?: string
          cuisine?: string
          description?: string
          diets?: string[]
          difficulty?: string
          equipment?: string[]
          id?: string
          image_url?: string | null
          items?: Json
          meal_type?: string
          prep_minutes?: number
          published?: boolean
          slug?: string
          steps?: Json
          tags?: string[]
          tips?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          aisle: string
          already_have: boolean
          checked: boolean
          created_at: string
          id: string
          ingredient_slug: string | null
          manual: boolean
          name: string
          packs: number
          plan_id: string
          price: number
          price_confidence: string
          price_source: string
          purchase_qty: number
          required_qty: number
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          aisle?: string
          already_have?: boolean
          checked?: boolean
          created_at?: string
          id?: string
          ingredient_slug?: string | null
          manual?: boolean
          name: string
          packs?: number
          plan_id: string
          price?: number
          price_confidence?: string
          price_source?: string
          purchase_qty?: number
          required_qty?: number
          unit?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          aisle?: string
          already_have?: boolean
          checked?: boolean
          created_at?: string
          id?: string
          ingredient_slug?: string | null
          manual?: boolean
          name?: string
          packs?: number
          plan_id?: string
          price?: number
          price_confidence?: string
          price_source?: string
          purchase_qty?: number
          required_qty?: number
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          brand: string
          city: string | null
          country: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          price_index: number
        }
        Insert: {
          address?: string | null
          brand: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price_index?: number
        }
        Update: {
          address?: string | null
          brand?: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price_index?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
