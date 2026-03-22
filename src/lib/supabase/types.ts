export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          id: string;
          wedding_id: string;
          entity_type: "task" | "vendor" | "guest" | "expense" | "general";
          entity_id: string;
          user_id: string;
          user_name: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          entity_type: "task" | "vendor" | "guest" | "expense" | "general";
          entity_id: string;
          user_id: string;
          user_name: string;
          content: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      cron_log: {
        Row: {
          id: string;
          job_name: string;
          status: "success" | "error";
          duration_ms: number | null;
          details: Record<string, unknown> | null;
          error_message: string | null;
          started_at: string;
        };
        Insert: {
          id?: string;
          job_name: string;
          status: "success" | "error";
          duration_ms?: number | null;
          details?: Record<string, unknown> | null;
          error_message?: string | null;
          started_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      lifecycle_emails: {
        Row: {
          id: string;
          wedding_id: string;
          email_type: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          email_type: string;
          sent_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          wedding_id: string;
          user_id: string;
          action: "create" | "update" | "delete" | "restore";
          entity_type: string;
          entity_id: string;
          entity_name: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          user_id: string;
          action: "create" | "update" | "delete" | "restore";
          entity_type: string;
          entity_id: string;
          entity_name?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      mood_board_items: {
        Row: {
          id: string;
          wedding_id: string;
          image_url: string;
          caption: string | null;
          category: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          image_url: string;
          caption?: string | null;
          category?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          caption?: string | null;
          category?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "mood_board_items_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      wedding_collaborators: {
        Row: {
          id: string;
          wedding_id: string;
          email: string;
          role: "partner" | "coordinator";
          invite_status: "pending" | "accepted";
          invited_by: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          email: string;
          role: "partner" | "coordinator";
          invite_status?: "pending" | "accepted";
          invited_by: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invite_status?: "pending" | "accepted";
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wedding_collaborators_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_accounts: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          category: string;
          description: string | null;
          website: string | null;
          phone: string | null;
          email: string;
          address: string | null;
          city: string;
          state: string;
          zip: string | null;
          logo_url: string | null;
          price_range: "$" | "$$" | "$$$" | "$$$$" | null;
          status: "pending" | "approved" | "suspended";
          is_preferred: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          category: string;
          description?: string | null;
          website?: string | null;
          phone?: string | null;
          email: string;
          address?: string | null;
          city: string;
          state: string;
          zip?: string | null;
          logo_url?: string | null;
          price_range?: "$" | "$$" | "$$$" | "$$$$" | null;
          status?: "pending" | "approved" | "suspended";
          is_preferred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          category?: string;
          description?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string;
          address?: string | null;
          city?: string;
          state?: string;
          zip?: string | null;
          logo_url?: string | null;
          price_range?: "$" | "$$" | "$$$" | "$$$$" | null;
          status?: "pending" | "approved" | "suspended";
          is_preferred?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      placement_tiers: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_monthly: number;
          price_quarterly: number;
          price_annual: number;
          features: string[];
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_monthly: number;
          price_quarterly: number;
          price_annual: number;
          features?: string[];
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price_monthly?: number;
          price_quarterly?: number;
          price_annual?: number;
          features?: string[];
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      vendor_placements: {
        Row: {
          id: string;
          vendor_account_id: string;
          tier_id: string;
          billing_period: "monthly" | "quarterly" | "annual";
          amount_paid: number;
          starts_at: string;
          expires_at: string;
          auto_renew: boolean;
          stripe_subscription_id: string | null;
          stripe_payment_intent_id: string | null;
          status: "active" | "expired" | "cancelled" | "past_due";
          geographic_target: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_account_id: string;
          tier_id: string;
          billing_period: "monthly" | "quarterly" | "annual";
          amount_paid: number;
          starts_at?: string;
          expires_at: string;
          auto_renew?: boolean;
          stripe_subscription_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: "active" | "expired" | "cancelled" | "past_due";
          geographic_target?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: "active" | "expired" | "cancelled" | "past_due";
          auto_renew?: boolean;
          stripe_subscription_id?: string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_placements_vendor_account_id_fkey";
            columns: ["vendor_account_id"];
            isOneToOne: false;
            referencedRelation: "vendor_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_placements_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "placement_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_analytics: {
        Row: {
          id: string;
          vendor_account_id: string;
          event_type: "impression" | "click" | "lead" | "contact";
          wedding_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_account_id: string;
          event_type: "impression" | "click" | "lead" | "contact";
          wedding_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_vendor_account_id_fkey";
            columns: ["vendor_account_id"];
            isOneToOne: false;
            referencedRelation: "vendor_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriber_purchases: {
        Row: {
          id: string;
          user_id: string;
          wedding_id: string | null;
          amount: number;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          status: "active" | "refunded";
          purchased_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wedding_id?: string | null;
          amount: number;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          status?: "active" | "refunded";
          purchased_at?: string;
        };
        Update: {
          id?: string;
          status?: "active" | "refunded";
        };
        Relationships: [];
      };
      weddings: {
        Row: {
          id: string;
          user_id: string;
          partner1_name: string;
          partner2_name: string;
          date: string | null;
          venue: string | null;
          budget: number | null;
          guest_count_estimate: number | null;
          style_description: string | null;
          has_wedding_party: boolean | null;
          wedding_party_count: number | null;
          has_pre_wedding_events: boolean | null;
          has_honeymoon: boolean | null;
          trial_started_at: string | null;
          website_slug: string | null;
          website_enabled: boolean;
          website_headline: string | null;
          website_story: string | null;
          website_cover_url: string | null;
          website_schedule: Record<string, unknown>[];
          website_travel_info: string | null;
          website_accommodations: string | null;
          website_faq: Record<string, unknown>[];
          website_couple_photo_url: string | null;
          phase: "active" | "post_wedding" | "archived" | "sunset";
          memory_plan_active: boolean;
          memory_plan_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          partner1_name: string;
          partner2_name: string;
          date?: string | null;
          venue?: string | null;
          budget?: number | null;
          guest_count_estimate?: number | null;
          style_description?: string | null;
          has_wedding_party?: boolean | null;
          wedding_party_count?: number | null;
          has_pre_wedding_events?: boolean | null;
          has_honeymoon?: boolean | null;
          phase?: "active" | "post_wedding" | "archived" | "sunset";
          memory_plan_active?: boolean;
          memory_plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          partner1_name?: string;
          partner2_name?: string;
          date?: string | null;
          venue?: string | null;
          budget?: number | null;
          guest_count_estimate?: number | null;
          style_description?: string | null;
          has_wedding_party?: boolean | null;
          wedding_party_count?: number | null;
          has_pre_wedding_events?: boolean | null;
          has_honeymoon?: boolean | null;
          phase?: "active" | "post_wedding" | "archived" | "sunset";
          memory_plan_active?: boolean;
          memory_plan_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          wedding_id: string;
          name: string;
          email: string | null;
          rsvp_status: "not_invited" | "invite_sent" | "pending" | "accepted" | "declined";
          meal_preference: string | null;
          role: "family" | "friend" | "wedding_party" | "coworker" | "plus_one" | "other" | null;
          plus_one: boolean;
          plus_one_name: string | null;
          address: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          group_name: string | null;
          table_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          name: string;
          email?: string | null;
          rsvp_status?: "not_invited" | "invite_sent" | "pending" | "accepted" | "declined";
          meal_preference?: string | null;
          role?: "family" | "friend" | "wedding_party" | "coworker" | "plus_one" | "other" | null;
          plus_one?: boolean;
          plus_one_name?: string | null;
          address?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          group_name?: string | null;
          table_number?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          name?: string;
          email?: string | null;
          rsvp_status?: "not_invited" | "invite_sent" | "pending" | "accepted" | "declined";
          meal_preference?: string | null;
          role?: "family" | "friend" | "wedding_party" | "coworker" | "plus_one" | "other" | null;
          plus_one?: boolean;
          plus_one_name?: string | null;
          address?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          group_name?: string | null;
          table_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          wedding_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          completed: boolean;
          status: "not_started" | "in_progress" | "done";
          priority: "high" | "medium" | "low";
          category: string | null;
          edyn_message: string | null;
          sort_order: number | null;
          timeline_phase: string | null;
          is_system_generated: boolean;
          parent_task_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          completed?: boolean;
          status?: "not_started" | "in_progress" | "done";
          priority?: "high" | "medium" | "low";
          category?: string | null;
          edyn_message?: string | null;
          sort_order?: number | null;
          timeline_phase?: string | null;
          is_system_generated?: boolean;
          parent_task_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          completed?: boolean;
          status?: "not_started" | "in_progress" | "done";
          priority?: "high" | "medium" | "low";
          category?: string | null;
          edyn_message?: string | null;
          sort_order?: number | null;
          timeline_phase?: string | null;
          is_system_generated?: boolean;
          parent_task_id?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          wedding_id: string;
          description: string;
          estimated: number;
          amount_paid: number;
          final_cost: number | null;
          category: string;
          paid: boolean;
          vendor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          description: string;
          estimated: number;
          amount_paid?: number;
          final_cost?: number | null;
          category: string;
          paid?: boolean;
          vendor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          description?: string;
          estimated?: number;
          amount_paid?: number;
          final_cost?: number | null;
          category?: string;
          paid?: boolean;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      questionnaire_responses: {
        Row: {
          id: string;
          wedding_id: string;
          responses: Record<string, unknown>;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          responses?: Record<string, unknown>;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          responses?: Record<string, unknown>;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: true;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "admin";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: "user" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "user" | "admin";
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      registry_links: {
        Row: { id: string; wedding_id: string; name: string; url: string; sort_order: number; created_at: string };
        Insert: { id?: string; wedding_id: string; name: string; url: string; sort_order?: number; created_at?: string };
        Update: { id?: string; name?: string; url?: string; sort_order?: number };
        Relationships: [{ foreignKeyName: "registry_links_wedding_id_fkey"; columns: ["wedding_id"]; isOneToOne: false; referencedRelation: "weddings"; referencedColumns: ["id"] }];
      };
      wedding_photos: {
        Row: { id: string; wedding_id: string; uploaded_by: string; uploader_name: string | null; file_url: string; caption: string | null; approved: boolean; created_at: string };
        Insert: { id?: string; wedding_id: string; uploaded_by: string; uploader_name?: string | null; file_url: string; caption?: string | null; approved?: boolean; created_at?: string };
        Update: { id?: string; approved?: boolean; caption?: string | null };
        Relationships: [{ foreignKeyName: "wedding_photos_wedding_id_fkey"; columns: ["wedding_id"]; isOneToOne: false; referencedRelation: "weddings"; referencedColumns: ["id"] }];
      };
      rsvp_tokens: {
        Row: { id: string; guest_id: string; wedding_id: string; token: string; responded: boolean; responded_at: string | null; created_at: string };
        Insert: { id?: string; guest_id: string; wedding_id: string; token?: string; responded?: boolean; responded_at?: string | null; created_at?: string };
        Update: { id?: string; responded?: boolean; responded_at?: string | null };
        Relationships: [{ foreignKeyName: "rsvp_tokens_guest_id_fkey"; columns: ["guest_id"]; isOneToOne: true; referencedRelation: "guests"; referencedColumns: ["id"] }, { foreignKeyName: "rsvp_tokens_wedding_id_fkey"; columns: ["wedding_id"]; isOneToOne: false; referencedRelation: "weddings"; referencedColumns: ["id"] }];
      };
      ceremony_positions: {
        Row: {
          id: string;
          wedding_id: string;
          person_type: "wedding_party" | "officiant" | "couple";
          person_id: string | null;
          person_name: string;
          role: string | null;
          side: "left" | "right" | "center" | null;
          position_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          person_type: "wedding_party" | "officiant" | "couple";
          person_id?: string | null;
          person_name: string;
          role?: string | null;
          side?: "left" | "right" | "center" | null;
          position_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          person_type?: "wedding_party" | "officiant" | "couple";
          person_id?: string | null;
          person_name?: string;
          role?: string | null;
          side?: "left" | "right" | "center" | null;
          position_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ceremony_positions_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      related_tasks: {
        Row: {
          id: string;
          task_id: string;
          related_task_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          related_task_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "related_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "related_tasks_related_task_id_fkey";
            columns: ["related_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_resources: {
        Row: {
          id: string;
          task_id: string;
          label: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          label: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_resources_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_submissions: {
        Row: {
          id: string;
          submitted_by: string;
          name: string;
          category: string;
          website: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          state: string | null;
          notes: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          submitted_by: string;
          name: string;
          category: string;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          notes?: string | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: "pending" | "approved" | "rejected";
        };
        Relationships: [];
      };
      suggested_vendors: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          website: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string;
          state: string;
          zip: string | null;
          country: string;
          price_range: "$" | "$$" | "$$$" | "$$$$" | null;
          featured: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city: string;
          state: string;
          zip?: string | null;
          country?: string;
          price_range?: "$" | "$$" | "$$$" | "$$$$" | null;
          featured?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string;
          state?: string;
          zip?: string | null;
          country?: string;
          price_range?: "$" | "$$" | "$$$" | "$$$$" | null;
          featured?: boolean;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      seating_tables: {
        Row: {
          id: string;
          wedding_id: string;
          table_number: number;
          name: string | null;
          x: number;
          y: number;
          shape: "round" | "rectangle";
          capacity: number;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          table_number: number;
          name?: string | null;
          x?: number;
          y?: number;
          shape?: "round" | "rectangle";
          capacity?: number;
        };
        Update: {
          id?: string;
          table_number?: number;
          name?: string | null;
          x?: number;
          y?: number;
          shape?: "round" | "rectangle";
          capacity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seating_tables_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      seat_assignments: {
        Row: {
          id: string;
          seating_table_id: string;
          guest_id: string;
          seat_number: number | null;
        };
        Insert: {
          id?: string;
          seating_table_id: string;
          guest_id: string;
          seat_number?: number | null;
        };
        Update: {
          id?: string;
          seating_table_id?: string;
          guest_id?: string;
          seat_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "seat_assignments_seating_table_id_fkey";
            columns: ["seating_table_id"];
            isOneToOne: false;
            referencedRelation: "seating_tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_assignments_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: true;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          },
        ];
      };
      day_of_plans: {
        Row: {
          id: string;
          wedding_id: string;
          content: Record<string, unknown>;
          generated_at: string | null;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          content?: Record<string, unknown>;
          generated_at?: string | null;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          content?: Record<string, unknown>;
          generated_at?: string | null;
          edited_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "day_of_plans_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: true;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          wedding_id: string;
          type: string;
          title: string;
          body: string | null;
          read: boolean;
          task_id: string | null;
          vendor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          type: string;
          title: string;
          body?: string | null;
          read?: boolean;
          task_id?: string | null;
          vendor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          wedding_id: string;
          entity_type: "task" | "vendor";
          entity_id: string;
          file_name: string;
          file_url: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          entity_type: "task" | "vendor";
          entity_id: string;
          file_name: string;
          file_url: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          wedding_id: string;
          email_reminders: boolean;
          reminder_days_before: number;
        };
        Insert: {
          wedding_id: string;
          email_reminders?: boolean;
          reminder_days_before?: number;
        };
        Update: {
          wedding_id?: string;
          email_reminders?: boolean;
          reminder_days_before?: number;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: true;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          wedding_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          role?: "user" | "assistant";
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      wedding_party: {
        Row: {
          id: string;
          wedding_id: string;
          name: string;
          role: string;
          email: string | null;
          phone: string | null;
          job_assignment: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          name: string;
          role: string;
          email?: string | null;
          phone?: string | null;
          job_assignment?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          name?: string;
          role?: string;
          email?: string | null;
          phone?: string | null;
          job_assignment?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wedding_party_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          id: string;
          wedding_id: string;
          category: string;
          name: string;
          status: "searching" | "contacted" | "quote_received" | "booked" | "deposit_paid" | "paid_in_full";
          poc_name: string | null;
          poc_email: string | null;
          poc_phone: string | null;
          notes: string | null;
          amount: number | null;
          amount_paid: number | null;
          gmb_place_id: string | null;
          gmb_data: Record<string, unknown> | null;
          gmb_fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          category: string;
          name: string;
          status?: "searching" | "contacted" | "quote_received" | "booked" | "deposit_paid" | "paid_in_full";
          poc_name?: string | null;
          poc_email?: string | null;
          poc_phone?: string | null;
          notes?: string | null;
          amount?: number | null;
          amount_paid?: number | null;
          gmb_place_id?: string | null;
          gmb_data?: Record<string, unknown> | null;
          gmb_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          category?: string;
          name?: string;
          status?: "searching" | "contacted" | "quote_received" | "booked" | "deposit_paid" | "paid_in_full";
          poc_name?: string | null;
          poc_email?: string | null;
          poc_phone?: string | null;
          notes?: string | null;
          amount?: number | null;
          amount_paid?: number | null;
          gmb_place_id?: string | null;
          gmb_data?: Record<string, unknown> | null;
          gmb_fetched_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey";
            columns: ["wedding_id"];
            isOneToOne: false;
            referencedRelation: "weddings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
