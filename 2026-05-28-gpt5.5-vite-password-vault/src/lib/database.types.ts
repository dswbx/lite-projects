export type Database = {
  public: {
    Tables: {
      vault_entries: {
        Row: {
          id: string;
          user_id: string;
          site_name: string;
          username: string;
          password_ciphertext: string;
          password_iv: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          site_name: string;
          username: string;
          password_ciphertext: string;
          password_iv: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          site_name?: string;
          username?: string;
          password_ciphertext?: string;
          password_iv?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
