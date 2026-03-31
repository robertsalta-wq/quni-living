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
          short_name: string | null
          city: string | null
          state: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          short_name?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          short_name?: string | null
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
          suburb: string | null
          state: string | null
          slug: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          university_id?: string | null
          suburb?: string | null
          state?: string | null
          slug?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          university_id?: string | null
          suburb?: string | null
          state?: string | null
          slug?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
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
          stripe_connect_account_id: string | null
          stripe_connect_details_submitted: boolean | null
          stripe_charges_enabled: boolean | null
          stripe_payouts_enabled: boolean | null
          terms_accepted_at: string | null
          landlord_terms_accepted_at: string | null
          has_landlord_insurance: boolean | null
          insurance_acknowledged_at: string | null
          onboarding_complete: boolean
          onboarding_completed_at: string | null
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
          stripe_connect_account_id?: string | null
          stripe_connect_details_submitted?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          terms_accepted_at?: string | null
          landlord_terms_accepted_at?: string | null
          has_landlord_insurance?: boolean | null
          insurance_acknowledged_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
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
          stripe_connect_account_id?: string | null
          stripe_connect_details_submitted?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          terms_accepted_at?: string | null
          landlord_terms_accepted_at?: string | null
          has_landlord_insurance?: boolean | null
          insurance_acknowledged_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          gender: string | null
          nationality: string | null
          university_id: string | null
          campus_id: string | null
          course: string | null
          year_of_study: number | null
          study_level: string | null
          student_type: string | null
          room_type_preference: string | null
          budget_min_per_week: number | null
          budget_max_per_week: number | null
          preferred_move_in_date: string | null
          preferred_lease_length: string | null
          emergency_contact_name: string | null
          emergency_contact_relationship: string | null
          emergency_contact_phone: string | null
          emergency_contact_email: string | null
          is_smoker: boolean | null
          date_of_birth: string | null
          avatar_url: string | null
          stripe_customer_id: string | null
          onboarding_complete: boolean
          terms_accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: string | null
          nationality?: string | null
          university_id?: string | null
          campus_id?: string | null
          course?: string | null
          year_of_study?: number | null
          study_level?: string | null
          student_type?: string | null
          room_type_preference?: string | null
          budget_min_per_week?: number | null
          budget_max_per_week?: number | null
          preferred_move_in_date?: string | null
          preferred_lease_length?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_email?: string | null
          is_smoker?: boolean | null
          date_of_birth?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          onboarding_complete?: boolean
          terms_accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: string | null
          nationality?: string | null
          university_id?: string | null
          campus_id?: string | null
          course?: string | null
          year_of_study?: number | null
          study_level?: string | null
          student_type?: string | null
          room_type_preference?: string | null
          budget_min_per_week?: number | null
          budget_max_per_week?: number | null
          preferred_move_in_date?: string | null
          preferred_lease_length?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_email?: string | null
          is_smoker?: boolean | null
          date_of_birth?: string | null
          avatar_url?: string | null
          stripe_customer_id?: string | null
          onboarding_complete?: boolean
          terms_accepted_at?: string | null
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
          status: 'active' | 'inactive' | 'pending' | 'suspended'
          linen_supplied: boolean | null
          weekly_cleaning_service: boolean | null
          property_type: string | null
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
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          linen_supplied?: boolean | null
          weekly_cleaning_service?: boolean | null
          property_type?: string | null
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
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          linen_supplied?: boolean | null
          weekly_cleaning_service?: boolean | null
          property_type?: string | null
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
          status:
            | 'pending'
            | 'pending_payment'
            | 'pending_confirmation'
            | 'confirmed'
            | 'active'
            | 'cancelled'
            | 'declined'
            | 'expired'
            | 'payment_failed'
            | 'completed'
          notes: string | null
          move_in_date: string | null
          lease_length: string | null
          student_message: string | null
          booking_fee_paid: boolean | null
          deposit_amount: number | null
          platform_fee_amount: number | null
          stripe_payment_intent_id: string | null
          deposit_released_at: string | null
          confirmed_at: string | null
          declined_at: string | null
          expires_at: string | null
          bond_acknowledged: boolean | null
          property_type: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
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
          status?:
            | 'pending'
            | 'pending_payment'
            | 'pending_confirmation'
            | 'confirmed'
            | 'active'
            | 'cancelled'
            | 'declined'
            | 'expired'
            | 'payment_failed'
            | 'completed'
          notes?: string | null
          move_in_date?: string | null
          lease_length?: string | null
          student_message?: string | null
          booking_fee_paid?: boolean | null
          deposit_amount?: number | null
          platform_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          deposit_released_at?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          bond_acknowledged?: boolean | null
          property_type?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
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
          status?:
            | 'pending'
            | 'pending_payment'
            | 'pending_confirmation'
            | 'confirmed'
            | 'active'
            | 'cancelled'
            | 'declined'
            | 'expired'
            | 'payment_failed'
            | 'completed'
          notes?: string | null
          move_in_date?: string | null
          lease_length?: string | null
          student_message?: string | null
          booking_fee_paid?: boolean | null
          deposit_amount?: number | null
          platform_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          deposit_released_at?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          bond_acknowledged?: boolean | null
          property_type?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          booking_id: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          amount_total: number | null
          amount_platform_fee: number | null
          amount_landlord_payout: number | null
          payment_type: string | null
          status: string | null
          paid_at: string | null
          created_at: string
          xero_invoice_id: string | null
          xero_synced_at: string | null
          xero_sync_status: string | null
          refund_reason: string | null
          refund_notes: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          refunded_by_admin_user_id: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          id?: string
          booking_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount_total?: number | null
          amount_platform_fee?: number | null
          amount_landlord_payout?: number | null
          payment_type?: string | null
          status?: string | null
          paid_at?: string | null
          created_at?: string
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
          xero_sync_status?: string | null
          refund_reason?: string | null
          refund_notes?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          refunded_by_admin_user_id?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          id?: string
          booking_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount_total?: number | null
          amount_platform_fee?: number | null
          amount_landlord_payout?: number | null
          payment_type?: string | null
          status?: string | null
          paid_at?: string | null
          created_at?: string
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
          xero_sync_status?: string | null
          refund_reason?: string | null
          refund_notes?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          refunded_by_admin_user_id?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      xero_settings: {
        Row: {
          id: string
          access_token: string | null
          refresh_token: string | null
          tenant_id: string | null
          connected_at: string | null
          last_sync_at: string | null
        }
        Insert: {
          id?: string
          access_token?: string | null
          refresh_token?: string | null
          tenant_id?: string | null
          connected_at?: string | null
          last_sync_at?: string | null
        }
        Update: {
          id?: string
          access_token?: string | null
          refresh_token?: string | null
          tenant_id?: string | null
          connected_at?: string | null
          last_sync_at?: string | null
        }
        Relationships: []
      }
      bonds: {
        Row: {
          id: string
          booking_id: string
          student_id: string
          landlord_id: string
          property_id: string | null
          bond_amount: number
          bond_type: string
          bond_status: string
          state: string | null
          bond_authority: string | null
          lodgement_reference: string | null
          lodged_at: string | null
          released_at: string | null
          dispute_notes: string | null
          acknowledged_by_student: boolean
          acknowledged_by_landlord: boolean
          student_acknowledged_at: string | null
          landlord_acknowledged_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          student_id: string
          landlord_id: string
          property_id?: string | null
          bond_amount: number
          bond_type?: string
          bond_status?: string
          state?: string | null
          bond_authority?: string | null
          lodgement_reference?: string | null
          lodged_at?: string | null
          released_at?: string | null
          dispute_notes?: string | null
          acknowledged_by_student?: boolean
          acknowledged_by_landlord?: boolean
          student_acknowledged_at?: string | null
          landlord_acknowledged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          student_id?: string
          landlord_id?: string
          property_id?: string | null
          bond_amount?: number
          bond_type?: string
          bond_status?: string
          state?: string | null
          bond_authority?: string | null
          lodgement_reference?: string | null
          lodged_at?: string | null
          released_at?: string | null
          dispute_notes?: string | null
          acknowledged_by_student?: boolean
          acknowledged_by_landlord?: boolean
          student_acknowledged_at?: string | null
          landlord_acknowledged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          id: string
          type: string
          processed_at: string
        }
        Insert: {
          id: string
          type: string
          processed_at?: string
        }
        Update: {
          id?: string
          type?: string
          processed_at?: string
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
          reply: string | null
          replied_at: string | null
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
          reply?: string | null
          replied_at?: string | null
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
          reply?: string | null
          replied_at?: string | null
          status?: 'new' | 'read' | 'replied' | 'archived'
          created_at?: string
        }
        Relationships: []
      }
      tenancies: {
        Row: {
          id: string
          booking_id: string | null
          property_id: string | null
          landlord_profile_id: string | null
          student_profile_id: string | null
          start_date: string
          end_date: string | null
          weekly_rent: number
          bond_amount: number | null
          bond_lodgement_reference: string | null
          bond_lodged_at: string | null
          status: 'active' | 'ended' | 'disputed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          property_id?: string | null
          landlord_profile_id?: string | null
          student_profile_id?: string | null
          start_date: string
          end_date?: string | null
          weekly_rent: number
          bond_amount?: number | null
          bond_lodgement_reference?: string | null
          bond_lodged_at?: string | null
          status?: 'active' | 'ended' | 'disputed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          property_id?: string | null
          landlord_profile_id?: string | null
          student_profile_id?: string | null
          start_date?: string
          end_date?: string | null
          weekly_rent?: number
          bond_amount?: number | null
          bond_lodgement_reference?: string | null
          bond_lodged_at?: string | null
          status?: 'active' | 'ended' | 'disputed'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenancy_documents: {
        Row: {
          id: string
          tenancy_id: string | null
          document_type:
            | 'lease'
            | 'condition_report_ingoing'
            | 'condition_report_outgoing'
            | 'breach_notice'
            | 'termination_notice'
            | 'rent_increase_notice'
            | 'bond_lodgement'
            | 'other'
          status:
            | 'draft'
            | 'sent_for_signing'
            | 'signed'
            | 'acknowledged'
            | 'disputed'
            | 'archived'
          file_path: string | null
          docuseal_submission_id: string | null
          generated_by: string | null
          landlord_signed_at: string | null
          student_signed_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenancy_id?: string | null
          document_type:
            | 'lease'
            | 'condition_report_ingoing'
            | 'condition_report_outgoing'
            | 'breach_notice'
            | 'termination_notice'
            | 'rent_increase_notice'
            | 'bond_lodgement'
            | 'other'
          status?:
            | 'draft'
            | 'sent_for_signing'
            | 'signed'
            | 'acknowledged'
            | 'disputed'
            | 'archived'
          file_path?: string | null
          docuseal_submission_id?: string | null
          generated_by?: string | null
          landlord_signed_at?: string | null
          student_signed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenancy_id?: string | null
          document_type?:
            | 'lease'
            | 'condition_report_ingoing'
            | 'condition_report_outgoing'
            | 'breach_notice'
            | 'termination_notice'
            | 'rent_increase_notice'
            | 'bond_lodgement'
            | 'other'
          status?:
            | 'draft'
            | 'sent_for_signing'
            | 'signed'
            | 'acknowledged'
            | 'disputed'
            | 'archived'
          file_path?: string | null
          docuseal_submission_id?: string | null
          generated_by?: string | null
          landlord_signed_at?: string | null
          student_signed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      landlord_leads: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          suburb: string
          property_count: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          suburb: string
          property_count: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          suburb?: string
          property_count?: string
          message?: string | null
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
