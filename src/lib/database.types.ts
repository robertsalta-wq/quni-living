/**
 * Supabase public schema — matches supabase/quni_supabase_schema.sql (Claude / Wix-style model).
 * Regenerate: npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string
          name: string
          slug: string
          city: string | null
          state: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Relationships: []
      }
      campuses: {
        Row: {
          id: string
          name: string
          university_id: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          university_id?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          university_id?: string | null
          address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          id: string
          name: string
          icon: string | null
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
        }
        Relationships: []
      }
      landlord_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          company_name: string | null
          abn: string | null
          landlord_type: string | null
          address: string | null
          suburb: string | null
          state: string | null
          postcode: string | null
          email: string | null
          phone: string | null
          bio: string | null
          avatar_url: string | null
          verified: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          abn?: string | null
          landlord_type?: string | null
          address?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          email?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          verified?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          abn?: string | null
          landlord_type?: string | null
          address?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          email?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          verified?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          email: string | null
          phone: string | null
          university_id: string | null
          course: string | null
          year_of_study: number | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          university_id?: string | null
          course?: string | null
          year_of_study?: number | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          university_id?: string | null
          course?: string | null
          year_of_study?: number | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          rent_per_week: number
          room_type: 'single' | 'shared' | 'studio' | 'apartment' | 'house' | null
          images: string[] | null
          bedrooms: number | null
          bathrooms: number | null
          furnished: boolean | null
          bond: number | null
          lease_length: string | null
          listing_type: 'rent' | 'homestay' | 'student_house' | null
          featured: boolean | null
          address: string | null
          suburb: string | null
          state: string | null
          postcode: string | null
          latitude: number | null
          longitude: number | null
          landlord_id: string | null
          university_id: string | null
          campus_id: string | null
          available_from: string | null
          status: 'active' | 'inactive' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          rent_per_week: number
          room_type?: 'single' | 'shared' | 'studio' | 'apartment' | 'house' | null
          images?: string[] | null
          bedrooms?: number | null
          bathrooms?: number | null
          furnished?: boolean | null
          bond?: number | null
          lease_length?: string | null
          listing_type?: 'rent' | 'homestay' | 'student_house' | null
          featured?: boolean | null
          address?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          latitude?: number | null
          longitude?: number | null
          landlord_id?: string | null
          university_id?: string | null
          campus_id?: string | null
          available_from?: string | null
          status?: 'active' | 'inactive' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          rent_per_week?: number
          room_type?: 'single' | 'shared' | 'studio' | 'apartment' | 'house' | null
          images?: string[] | null
          bedrooms?: number | null
          bathrooms?: number | null
          furnished?: boolean | null
          bond?: number | null
          lease_length?: string | null
          listing_type?: 'rent' | 'homestay' | 'student_house' | null
          featured?: boolean | null
          address?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          latitude?: number | null
          longitude?: number | null
          landlord_id?: string | null
          university_id?: string | null
          campus_id?: string | null
          available_from?: string | null
          status?: 'active' | 'inactive' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_features: {
        Row: {
          property_id: string
          feature_id: string
        }
        Insert: {
          property_id: string
          feature_id: string
        }
        Update: {
          property_id?: string
          feature_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          property_id: string | null
          student_id: string | null
          landlord_id: string | null
          start_date: string
          end_date: string | null
          weekly_rent: number | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          student_id?: string | null
          landlord_id?: string | null
          start_date: string
          end_date?: string | null
          weekly_rent?: number | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          student_id?: string | null
          landlord_id?: string | null
          start_date?: string
          end_date?: string | null
          weekly_rent?: number | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          id: string
          property_id: string | null
          student_id: string | null
          landlord_id: string | null
          name: string | null
          email: string | null
          message: string
          status: 'new' | 'read' | 'replied' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          student_id?: string | null
          landlord_id?: string | null
          name?: string | null
          email?: string | null
          message: string
          status?: 'new' | 'read' | 'replied' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          student_id?: string | null
          landlord_id?: string | null
          name?: string | null
          email?: string | null
          message?: string
          status?: 'new' | 'read' | 'replied' | 'archived'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type UniversityRow = Database['public']['Tables']['universities']['Row']
export type CampusRow = Database['public']['Tables']['campuses']['Row']
export type PropertyRow = Database['public']['Tables']['properties']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export type PropertyListingRow = PropertyRow & {
  university: Pick<UniversityRow, 'id' | 'name' | 'slug' | 'city' | 'state'> | null
  campus: Pick<CampusRow, 'id' | 'name' | 'address'> | null
  landlord: Pick<LandlordProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}
