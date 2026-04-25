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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
          wedding_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string
          id: string
          published_at: string | null
          read_time_minutes: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published_at?: string | null
          read_time_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published_at?: string | null
          read_time_minutes?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_optimizations: {
        Row: {
          dismissed_at: string | null
          generated_at: string
          id: string
          model: string
          suggestion: Json
          trigger_reason: string
          wedding_id: string
        }
        Insert: {
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          model: string
          suggestion: Json
          trigger_reason: string
          wedding_id: string
        }
        Update: {
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          model?: string
          suggestion?: Json
          trigger_reason?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_optimizations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_saves: {
        Row: {
          budget: number
          created_at: string | null
          email: string
          guests: number
          id: string
          month: number
          name: string | null
          short_code: string
          state: string
        }
        Insert: {
          budget: number
          created_at?: string | null
          email: string
          guests: number
          id?: string
          month: number
          name?: string | null
          short_code: string
          state: string
        }
        Update: {
          budget?: number
          created_at?: string | null
          email?: string
          guests?: number
          id?: string
          month?: number
          name?: string | null
          short_code?: string
          state?: string
        }
        Relationships: []
      }
      calendar_feed_tokens: {
        Row: {
          created_at: string
          id: string
          revoked_at: string | null
          token: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_feed_tokens_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      catch_up_plans: {
        Row: {
          dismissed_at: string | null
          generated_at: string
          id: string
          model: string
          plan: Json
          trigger_reason: string
          wedding_id: string
        }
        Insert: {
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          model: string
          plan: Json
          trigger_reason: string
          wedding_id: string
        }
        Update: {
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          model?: string
          plan?: Json
          trigger_reason?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catch_up_plans_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremony_positions: {
        Row: {
          created_at: string
          id: string
          person_id: string | null
          person_name: string
          person_type: string
          position_order: number
          role: string | null
          side: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id?: string | null
          person_name: string
          person_type: string
          position_order?: number
          role?: string | null
          side?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string | null
          person_name?: string
          person_type?: string
          position_order?: number
          role?: string | null
          side?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceremony_positions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          wedding_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          wedding_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
          user_name: string
          wedding_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
          user_name: string
          wedding_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
          user_name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_log: {
        Row: {
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          started_at?: string | null
          status: string
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      date_change_alerts: {
        Row: {
          acknowledged: boolean
          affected_tasks: Json | null
          change_type: string
          created_at: string
          id: string
          message: string
          new_value: string | null
          old_value: string | null
          wedding_id: string
        }
        Insert: {
          acknowledged?: boolean
          affected_tasks?: Json | null
          change_type: string
          created_at?: string
          id?: string
          message: string
          new_value?: string | null
          old_value?: string | null
          wedding_id: string
        }
        Update: {
          acknowledged?: boolean
          affected_tasks?: Json | null
          change_type?: string
          created_at?: string
          id?: string
          message?: string
          new_value?: string | null
          old_value?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_change_alerts_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      day_of_plans: {
        Row: {
          content: Json
          edited_at: string | null
          generated_at: string | null
          id: string
          wedding_id: string
        }
        Insert: {
          content?: Json
          edited_at?: string | null
          generated_at?: string | null
          id?: string
          wedding_id: string
        }
        Update: {
          content?: Json
          edited_at?: string | null
          generated_at?: string | null
          id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_of_plans_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          email_id: string
          email_to: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          email_id: string
          email_to: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          email_id?: string
          email_to?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          deadline_reminders: boolean
          id: string
          lifecycle_emails: boolean
          marketing_emails: boolean
          phone_number: string | null
          push_notifications: boolean
          sms_reminders: boolean
          unsubscribe_token: string
          unsubscribed_all: boolean
          updated_at: string | null
          wedding_id: string
        }
        Insert: {
          deadline_reminders?: boolean
          id?: string
          lifecycle_emails?: boolean
          marketing_emails?: boolean
          phone_number?: string | null
          push_notifications?: boolean
          sms_reminders?: boolean
          unsubscribe_token?: string
          unsubscribed_all?: boolean
          updated_at?: string | null
          wedding_id: string
        }
        Update: {
          deadline_reminders?: boolean
          id?: string
          lifecycle_emails?: boolean
          marketing_emails?: boolean
          phone_number?: string | null
          push_notifications?: boolean
          sms_reminders?: boolean
          unsubscribe_token?: string
          unsubscribed_all?: boolean
          updated_at?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          audience_filter: Json
          enabled: boolean
          id: string
          offset_days: number
          sequence_slug: string
          step_order: number
          template_slug: string
        }
        Insert: {
          audience_filter?: Json
          enabled?: boolean
          id?: string
          offset_days: number
          sequence_slug: string
          step_order: number
          template_slug: string
        }
        Update: {
          audience_filter?: Json
          enabled?: boolean
          id?: string
          offset_days?: number
          sequence_slug?: string
          step_order?: number
          template_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_slug_fkey"
            columns: ["sequence_slug"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["slug"]
          },
        ]
      }
      email_sequences: {
        Row: {
          audience_filter: Json
          created_at: string
          description: string | null
          enabled: boolean
          slug: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          slug: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          slug?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          html: string
          slug: string
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          html: string
          slug: string
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          html?: string
          slug?: string
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_paid: number
          category: string
          created_at: string
          deleted_at: string | null
          description: string
          estimated: number
          final_cost: number | null
          id: string
          paid: boolean
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          amount_paid?: number
          category: string
          created_at?: string
          deleted_at?: string | null
          description: string
          estimated: number
          final_cost?: number | null
          id?: string
          paid?: boolean
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          amount_paid?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          estimated?: number
          final_cost?: number | null
          id?: string
          paid?: boolean
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          group_name: string | null
          id: string
          meal_preference: string | null
          name: string
          phone: string | null
          plus_one: boolean
          plus_one_name: string | null
          role: string | null
          rsvp_status: string
          state: string | null
          table_number: number | null
          wedding_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          group_name?: string | null
          id?: string
          meal_preference?: string | null
          name: string
          phone?: string | null
          plus_one?: boolean
          plus_one_name?: string | null
          role?: string | null
          rsvp_status?: string
          state?: string | null
          table_number?: number | null
          wedding_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          group_name?: string | null
          id?: string
          meal_preference?: string | null
          name?: string
          phone?: string | null
          plus_one?: boolean
          plus_one_name?: string | null
          role?: string | null
          rsvp_status?: string
          state?: string | null
          table_number?: number | null
          wedding_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_responses: {
        Row: {
          completed: boolean
          created_at: string | null
          guide_slug: string
          id: string
          responses: Json
          section_index: number
          updated_at: string | null
          vendor_brief: Json | null
          wedding_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          guide_slug: string
          id?: string
          responses?: Json
          section_index?: number
          updated_at?: string | null
          vendor_brief?: Json | null
          wedding_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          guide_slug?: string
          id?: string
          responses?: Json
          section_index?: number
          updated_at?: string | null
          vendor_brief?: Json | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_emails: {
        Row: {
          email_type: string
          id: string
          sent_at: string | null
          wedding_id: string
        }
        Insert: {
          email_type: string
          id?: string
          sent_at?: string | null
          wedding_id: string
        }
        Update: {
          email_type?: string
          id?: string
          sent_at?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_emails_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_board_items: {
        Row: {
          caption: string | null
          category: string
          created_at: string | null
          deleted_at: string | null
          id: string
          image_url: string
          location: string | null
          sort_order: number
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          caption?: string | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url: string
          location?: string | null
          sort_order?: number
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string
          location?: string | null
          sort_order?: number
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_board_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_reminders: boolean
          reminder_days_before: number
          wedding_id: string
        }
        Insert: {
          email_reminders?: boolean
          reminder_days_before?: number
          wedding_id: string
        }
        Update: {
          email_reminders?: boolean
          reminder_days_before?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          task_id: string | null
          title: string
          type: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          task_id?: string | null
          title: string
          type: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          task_id?: string | null
          title?: string
          type?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_survey: {
        Row: {
          created_at: string
          id: string
          prior_tools: string[]
          venue_status: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prior_tools?: string[]
          venue_status?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prior_tools?: string[]
          venue_status?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_survey_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          promo_code_id: string
          purchase_id: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          promo_code_id: string
          purchase_id?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          promo_code_id?: string
          purchase_id?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "subscriber_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          responses: Json
          updated_at: string
          wedding_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          responses?: Json
          updated_at?: string
          wedding_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          responses?: Json
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_completions: {
        Row: {
          answers: Json
          created_at: string
          email: string
          first_name: string | null
          id: string
          quiz_id: string
          result_key: string
          result_label: string | null
          score: number | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          quiz_id: string
          result_key: string
          result_label?: string | null
          score?: number | null
        }
        Update: {
          answers?: Json
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          quiz_id?: string
          result_key?: string
          result_label?: string | null
          score?: number | null
        }
        Relationships: []
      }
      registry_links: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          url: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          url: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          url?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_links_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rehearsal_dinner: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          date: string | null
          dress_code: string | null
          guest_list: Json | null
          hosted_by: string | null
          id: string
          notes: string | null
          time: string | null
          timeline: Json | null
          venue: string | null
          wedding_id: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date?: string | null
          dress_code?: string | null
          guest_list?: Json | null
          hosted_by?: string | null
          id?: string
          notes?: string | null
          time?: string | null
          timeline?: Json | null
          venue?: string | null
          wedding_id: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date?: string | null
          dress_code?: string | null
          guest_list?: Json | null
          hosted_by?: string | null
          id?: string
          notes?: string | null
          time?: string | null
          timeline?: Json | null
          venue?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_dinner_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      related_tasks: {
        Row: {
          created_at: string
          id: string
          related_task_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_task_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "related_tasks_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_tokens: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          qr_code_url: string | null
          responded: boolean
          responded_at: string | null
          token: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          qr_code_url?: string | null
          responded?: boolean
          responded_at?: string | null
          token?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          qr_code_url?: string | null
          responded?: boolean
          responded_at?: string | null
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_tokens_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_subscriptions: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          last_failure_message: string | null
          plan: string
          processed_at: string | null
          scheduled_for: string
          status: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string
          user_id: string
          wedding_id: string | null
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_message?: string | null
          plan: string
          processed_at?: string | null
          scheduled_for: string
          status?: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string
          user_id: string
          wedding_id?: string | null
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_message?: string | null
          plan?: string
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string
          user_id?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_subscriptions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_assignments: {
        Row: {
          deleted_at: string | null
          guest_id: string
          id: string
          seat_number: number | null
          seating_table_id: string
        }
        Insert: {
          deleted_at?: string | null
          guest_id: string
          id?: string
          seat_number?: number | null
          seating_table_id: string
        }
        Update: {
          deleted_at?: string | null
          guest_id?: string
          id?: string
          seat_number?: number | null
          seating_table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_seating_table_id_fkey"
            columns: ["seating_table_id"]
            isOneToOne: false
            referencedRelation: "seating_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_tables: {
        Row: {
          capacity: number
          deleted_at: string | null
          id: string
          name: string | null
          shape: string
          table_number: number
          wedding_id: string
          x: number
          y: number
        }
        Insert: {
          capacity?: number
          deleted_at?: string | null
          id?: string
          name?: string | null
          shape?: string
          table_number: number
          wedding_id: string
          x?: number
          y?: number
        }
        Update: {
          capacity?: number
          deleted_at?: string | null
          id?: string
          name?: string | null
          shape?: string
          table_number?: number
          wedding_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "seating_tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_send_log: {
        Row: {
          id: string
          recipient_email: string | null
          resend_email_id: string | null
          sent_at: string
          sequence_slug: string
          step_order: number
          user_id: string
          wedding_id: string | null
        }
        Insert: {
          id?: string
          recipient_email?: string | null
          resend_email_id?: string | null
          sent_at?: string
          sequence_slug: string
          step_order: number
          user_id: string
          wedding_id?: string | null
        }
        Update: {
          id?: string
          recipient_email?: string | null
          resend_email_id?: string | null
          sent_at?: string
          sequence_slug?: string
          step_order?: number
          user_id?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_send_log_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_purchases: {
        Row: {
          amount: number
          cancel_at_period_end: boolean
          current_period_end: string | null
          id: string
          payment_method: string
          plan: string
          purchased_at: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string
          wedding_id: string | null
        }
        Insert: {
          amount: number
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          id?: string
          payment_method?: string
          plan?: string
          purchased_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
          wedding_id?: string | null
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          id?: string
          payment_method?: string
          plan?: string
          purchased_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_purchases_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_vendors: {
        Row: {
          active: boolean
          address: string | null
          category: string
          city: string
          country: string
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          id: string
          import_source: string | null
          imported_at: string | null
          name: string
          phone: string | null
          placement_expires_at: string | null
          placement_tier: string | null
          price_range: string | null
          search_vector: unknown
          state: string
          updated_at: string
          vendor_account_id: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          category: string
          city: string
          country?: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          import_source?: string | null
          imported_at?: string | null
          name: string
          phone?: string | null
          placement_expires_at?: string | null
          placement_tier?: string | null
          price_range?: string | null
          search_vector?: unknown
          state: string
          updated_at?: string
          vendor_account_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          import_source?: string | null
          imported_at?: string | null
          name?: string
          phone?: string | null
          placement_expires_at?: string | null
          placement_tier?: string | null
          price_range?: string | null
          search_vector?: unknown
          state?: string
          updated_at?: string
          vendor_account_id?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggested_vendors_vendor_account_id_fkey"
            columns: ["vendor_account_id"]
            isOneToOne: false
            referencedRelation: "vendor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      task_resources: {
        Row: {
          created_at: string
          id: string
          label: string
          task_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          task_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          task_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          completed: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          edyn_message: string | null
          id: string
          is_system_generated: boolean
          notes: string | null
          parent_task_id: string | null
          priority: string
          sort_order: number | null
          status: string
          timeline_phase: string | null
          title: string
          wedding_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          edyn_message?: string | null
          id?: string
          is_system_generated?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          sort_order?: number | null
          status?: string
          timeline_phase?: string | null
          title: string
          wedding_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          edyn_message?: string | null
          id?: string
          is_system_generated?: boolean
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          sort_order?: number | null
          status?: string
          timeline_phase?: string | null
          title?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_email_log: {
        Row: {
          email_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_accounts: {
        Row: {
          address: string | null
          business_name: string
          category: string
          city: string
          created_at: string
          description: string | null
          email: string
          id: string
          is_preferred: boolean
          logo_url: string | null
          phone: string | null
          price_range: string | null
          state: string
          status: string
          updated_at: string
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          category: string
          city: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          is_preferred?: boolean
          logo_url?: string | null
          phone?: string | null
          price_range?: string | null
          state: string
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          category?: string
          city?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          is_preferred?: boolean
          logo_url?: string | null
          phone?: string | null
          price_range?: string | null
          state?: string
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      vendor_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          vendor_account_id: string
          wedding_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          vendor_account_id: string
          wedding_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          vendor_account_id?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_vendor_account_id_fkey"
            columns: ["vendor_account_id"]
            isOneToOne: false
            referencedRelation: "vendor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_analytics_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_submissions: {
        Row: {
          category: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          status: string
          submitted_by: string
          website: string | null
        }
        Insert: {
          category: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          submitted_by: string
          website?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          submitted_by?: string
          website?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          amount: number | null
          amount_paid: number | null
          arrival_time: string | null
          category: string
          created_at: string
          deleted_at: string | null
          gmb_data: Json | null
          gmb_fetched_at: string | null
          gmb_place_id: string | null
          id: string
          insurance_submitted: boolean | null
          meal_needed: boolean | null
          name: string
          notes: string | null
          poc_email: string | null
          poc_name: string | null
          poc_phone: string | null
          status: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          amount?: number | null
          amount_paid?: number | null
          arrival_time?: string | null
          category: string
          created_at?: string
          deleted_at?: string | null
          gmb_data?: Json | null
          gmb_fetched_at?: string | null
          gmb_place_id?: string | null
          id?: string
          insurance_submitted?: boolean | null
          meal_needed?: boolean | null
          name: string
          notes?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          status?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          amount?: number | null
          amount_paid?: number | null
          arrival_time?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          gmb_data?: Json | null
          gmb_fetched_at?: string | null
          gmb_place_id?: string | null
          id?: string
          insurance_submitted?: boolean | null
          meal_needed?: boolean | null
          name?: string
          notes?: string | null
          poc_email?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          status?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          discount_code_sent: boolean
          email: string
          id: string
          name: string
          notes: string | null
          source: string
        }
        Insert: {
          created_at?: string
          discount_code_sent?: boolean
          email: string
          id?: string
          name: string
          notes?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          discount_code_sent?: boolean
          email?: string
          id?: string
          name?: string
          notes?: string | null
          source?: string
        }
        Relationships: []
      }
      wedding_collaborators: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invite_status: string
          invited_by: string
          role: string
          user_id: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invite_status?: string
          invited_by: string
          role: string
          user_id?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invite_status?: string
          invited_by?: string
          role?: string
          user_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_collaborators_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_party: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          attire: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          job_assignment: string | null
          name: string
          phone: string | null
          photo_url: string | null
          role: string
          sort_order: number
          state: string | null
          wedding_id: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          attire?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          job_assignment?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          role: string
          sort_order?: number
          state?: string | null
          wedding_id: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          attire?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          job_assignment?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          sort_order?: number
          state?: string | null
          wedding_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_party_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_photos: {
        Row: {
          approved: boolean
          caption: string | null
          created_at: string
          file_url: string
          id: string
          uploaded_by: string
          uploader_name: string | null
          wedding_id: string
        }
        Insert: {
          approved?: boolean
          caption?: string | null
          created_at?: string
          file_url: string
          id?: string
          uploaded_by: string
          uploader_name?: string | null
          wedding_id: string
        }
        Update: {
          approved?: boolean
          caption?: string | null
          created_at?: string
          file_url?: string
          id?: string
          uploaded_by?: string
          uploader_name?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          budget: number | null
          ceremony_time: string | null
          created_at: string
          date: string | null
          guest_count_estimate: number | null
          has_honeymoon: boolean | null
          has_pre_wedding_events: boolean | null
          has_wedding_party: boolean | null
          id: string
          key_decisions: string | null
          meal_options: Json | null
          memory_plan_active: boolean
          memory_plan_expires_at: string | null
          partner1_name: string
          partner2_name: string
          phase: string
          photo_approval_required: boolean
          rsvp_deadline: string | null
          shared_attire_note: string | null
          style_description: string | null
          tour_complete: boolean
          trial_reminder_sent_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          venue: string | null
          venue_city: string | null
          website_accommodations: string | null
          website_couple_photo_url: string | null
          website_cover_url: string | null
          website_enabled: boolean
          website_faq: Json | null
          website_headline: string | null
          website_hotels: Json | null
          website_schedule: Json | null
          website_slug: string | null
          website_story: string | null
          website_theme: Json | null
          website_travel_info: string | null
          wedding_party_count: number | null
        }
        Insert: {
          budget?: number | null
          ceremony_time?: string | null
          created_at?: string
          date?: string | null
          guest_count_estimate?: number | null
          has_honeymoon?: boolean | null
          has_pre_wedding_events?: boolean | null
          has_wedding_party?: boolean | null
          id?: string
          key_decisions?: string | null
          meal_options?: Json | null
          memory_plan_active?: boolean
          memory_plan_expires_at?: string | null
          partner1_name: string
          partner2_name: string
          phase?: string
          photo_approval_required?: boolean
          rsvp_deadline?: string | null
          shared_attire_note?: string | null
          style_description?: string | null
          tour_complete?: boolean
          trial_reminder_sent_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          venue?: string | null
          venue_city?: string | null
          website_accommodations?: string | null
          website_couple_photo_url?: string | null
          website_cover_url?: string | null
          website_enabled?: boolean
          website_faq?: Json | null
          website_headline?: string | null
          website_hotels?: Json | null
          website_schedule?: Json | null
          website_slug?: string | null
          website_story?: string | null
          website_theme?: Json | null
          website_travel_info?: string | null
          wedding_party_count?: number | null
        }
        Update: {
          budget?: number | null
          ceremony_time?: string | null
          created_at?: string
          date?: string | null
          guest_count_estimate?: number | null
          has_honeymoon?: boolean | null
          has_pre_wedding_events?: boolean | null
          has_wedding_party?: boolean | null
          id?: string
          key_decisions?: string | null
          meal_options?: Json | null
          memory_plan_active?: boolean
          memory_plan_expires_at?: string | null
          partner1_name?: string
          partner2_name?: string
          phase?: string
          photo_approval_required?: boolean
          rsvp_deadline?: string | null
          shared_attire_note?: string | null
          style_description?: string | null
          tour_complete?: boolean
          trial_reminder_sent_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          venue?: string | null
          venue_city?: string | null
          website_accommodations?: string | null
          website_couple_photo_url?: string | null
          website_cover_url?: string | null
          website_enabled?: boolean
          website_faq?: Json | null
          website_headline?: string | null
          website_hotels?: Json | null
          website_schedule?: Json | null
          website_slug?: string | null
          website_story?: string | null
          website_theme?: Json | null
          website_travel_info?: string | null
          wedding_party_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_promo_uses: { Args: { code_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
