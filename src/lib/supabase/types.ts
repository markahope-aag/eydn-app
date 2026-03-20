export type Database = {
  public: {
    Tables: {
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
          rsvp_status: "pending" | "accepted" | "declined";
          meal_preference: string | null;
          plus_one: boolean;
          plus_one_name: string | null;
          address: string | null;
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
          rsvp_status?: "pending" | "accepted" | "declined";
          meal_preference?: string | null;
          plus_one?: boolean;
          plus_one_name?: string | null;
          address?: string | null;
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
          rsvp_status?: "pending" | "accepted" | "declined";
          meal_preference?: string | null;
          plus_one?: boolean;
          plus_one_name?: string | null;
          address?: string | null;
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
