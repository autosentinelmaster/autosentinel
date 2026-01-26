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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          session_id: string
          token_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          session_id: string
          token_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          session_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "driving_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "driving_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          created_at: string
          fuel_capacity_liters: number
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          fuel_capacity_liters?: number
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          fuel_capacity_liters?: number
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      driving_sessions: {
        Row: {
          created_at: string
          current_distance_km: number
          current_fuel_percent: number
          current_lat: number | null
          current_lng: number | null
          current_speed: number
          end_time: string | null
          id: string
          max_speed_reached: number
          seat_belt_confirmed: boolean
          session_secret: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"]
          sudden_stops_count: number
          token_id: string
          total_violations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_distance_km?: number
          current_fuel_percent?: number
          current_lat?: number | null
          current_lng?: number | null
          current_speed?: number
          end_time?: string | null
          id?: string
          max_speed_reached?: number
          seat_belt_confirmed?: boolean
          session_secret?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          sudden_stops_count?: number
          token_id: string
          total_violations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_distance_km?: number
          current_fuel_percent?: number
          current_lat?: number | null
          current_lng?: number | null
          current_speed?: number
          end_time?: string | null
          id?: string
          max_speed_reached?: number
          seat_belt_confirmed?: boolean
          session_secret?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          sudden_stops_count?: number
          token_id?: string
          total_violations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driving_sessions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "driving_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      driving_tokens: {
        Row: {
          car_id: string | null
          created_at: string
          distance_limit_km: number
          expires_at: string
          fuel_limit_percent: number
          geofence_center_lat: number
          geofence_center_lng: number
          geofence_radius_km: number
          guest_name: string
          guest_phone: string | null
          id: string
          is_active: boolean
          is_returned: boolean
          is_used: boolean
          master_user_id: string
          returned_at: string | null
          speed_limit: number
          time_limit_minutes: number
          token_code: string
          validity_hours: number
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          distance_limit_km?: number
          expires_at: string
          fuel_limit_percent?: number
          geofence_center_lat?: number
          geofence_center_lng?: number
          geofence_radius_km?: number
          guest_name: string
          guest_phone?: string | null
          id?: string
          is_active?: boolean
          is_returned?: boolean
          is_used?: boolean
          master_user_id: string
          returned_at?: string | null
          speed_limit?: number
          time_limit_minutes?: number
          token_code: string
          validity_hours?: number
        }
        Update: {
          car_id?: string | null
          created_at?: string
          distance_limit_km?: number
          expires_at?: string
          fuel_limit_percent?: number
          geofence_center_lat?: number
          geofence_center_lng?: number
          geofence_radius_km?: number
          guest_name?: string
          guest_phone?: string | null
          id?: string
          is_active?: boolean
          is_returned?: boolean
          is_used?: boolean
          master_user_id?: string
          returned_at?: string | null
          speed_limit?: number
          time_limit_minutes?: number
          token_code?: string
          validity_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "driving_tokens_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          is_sos: boolean
          message: string
          sender_type: string
          token_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_sos?: boolean
          message: string
          sender_type: string
          token_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_sos?: boolean
          message?: string
          sender_type?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "driving_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rpc_rate_limits: {
        Row: {
          attempt_count: number
          function_name: string
          identifier: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          function_name: string
          identifier: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          function_name?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          created_at: string
          description: string
          distance_at_violation: number | null
          id: string
          lat: number | null
          lng: number | null
          session_id: string
          speed_at_violation: number | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Insert: {
          created_at?: string
          description: string
          distance_at_violation?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          session_id: string
          speed_at_violation?: number | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Update: {
          created_at?: string
          description?: string
          distance_at_violation?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          session_id?: string
          speed_at_violation?: number | null
          violation_type?: Database["public"]["Enums"]["violation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "violations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "driving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_function: string
          p_identifier: string
          p_max_calls: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      confirm_seat_belt: {
        Args: { p_session_id: string; p_session_secret: string }
        Returns: boolean
      }
      create_session_alert: {
        Args: {
          p_message: string
          p_session_id: string
          p_session_secret: string
        }
        Returns: boolean
      }
      generate_token_code: { Args: never; Returns: string }
      return_token: {
        Args: { p_session_secret: string; p_token_code: string }
        Returns: boolean
      }
      send_guest_message: {
        Args: {
          p_message: string
          p_session_secret: string
          p_token_code: string
        }
        Returns: boolean
      }
      send_sos: {
        Args: {
          p_message?: string
          p_session_secret: string
          p_token_code: string
        }
        Returns: boolean
      }
      session_has_token: {
        Args: { p_session_id: string; p_token_id: string }
        Returns: boolean
      }
      start_driving_session: {
        Args: { p_token_code: string }
        Returns: {
          error_message: string
          session_id: string
          session_secret: string
          success: boolean
        }[]
      }
      stop_driving_session: {
        Args: { p_session_id: string; p_session_secret: string }
        Returns: boolean
      }
      update_session_telemetry:
        | {
            Args: {
              p_distance_km: number
              p_session_id: string
              p_session_secret: string
              p_speed: number
            }
            Returns: {
              current_speed_limit: number
              speed_violation: boolean
              success: boolean
            }[]
          }
        | {
            Args: {
              p_distance_km: number
              p_fuel_percent?: number
              p_session_id: string
              p_session_secret: string
              p_speed: number
              p_sudden_stop?: boolean
            }
            Returns: {
              current_speed_limit: number
              speed_violation: boolean
              success: boolean
            }[]
          }
      user_owns_token: { Args: { p_token_id: string }; Returns: boolean }
      validate_driving_token: {
        Args: { p_token_code: string }
        Returns: {
          car_name: string
          distance_limit_km: number
          fuel_limit_percent: number
          geofence_center_lat: number
          geofence_center_lng: number
          geofence_radius_km: number
          guest_name: string
          is_valid: boolean
          speed_limit: number
          time_limit_minutes: number
          token_id: string
        }[]
      }
    }
    Enums: {
      session_status: "pending" | "active" | "completed" | "violated"
      user_role: "master" | "child"
      violation_type: "speed" | "geofence" | "time" | "sudden_stop" | "fuel"
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
      session_status: ["pending", "active", "completed", "violated"],
      user_role: ["master", "child"],
      violation_type: ["speed", "geofence", "time", "sudden_stop", "fuel"],
    },
  },
} as const
