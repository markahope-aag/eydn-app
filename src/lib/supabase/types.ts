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
          updated_at?: string;
        };
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
          table_number?: number | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          wedding_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          completed: boolean;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wedding_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          completed?: boolean;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wedding_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          completed?: boolean;
          category?: string | null;
        };
      };
    };
  };
};
