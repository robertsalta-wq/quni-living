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
      house_rules_ref: {
        Row: {
          id: string
          name: string
          icon: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          icon: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          icon?: string
          sort_order?: number
        }
        Relationships: []
      }
      fee_exempt_accounts: {
        Row: {
          id: string
          email: string
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          email: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      platform_staff: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'support' | 'moderator'
          display_name: string | null
          user_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          email: string
          role?: 'admin' | 'support' | 'moderator'
          display_name?: string | null
          user_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'support' | 'moderator'
          display_name?: string | null
          user_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      admin_checklist_progress: {
        Row: {
          id: string
          key: string
          completed_items: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          completed_items?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          completed_items?: Json
          updated_at?: string
        }
        Relationships: []
      }
      operational_status: {
        Row: {
          service_name: string
          status: 'operational' | 'degraded' | 'down'
          message: string | null
          checked_at: string
        }
        Insert: {
          service_name: string
          status: 'operational' | 'degraded' | 'down'
          message?: string | null
          checked_at?: string
        }
        Update: {
          service_name?: string
          status?: 'operational' | 'degraded' | 'down'
          message?: string | null
          checked_at?: string
        }
        Relationships: []
      }
      incident_log: {
        Row: {
          id: string
          service_name: string
          status: string
          message: string | null
          comment: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_name: string
          status: string
          message?: string | null
          comment?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_name?: string
          status?: string
          message?: string | null
          comment?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      admin_vendor_subscriptions: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          href: string
          billing_href: string | null
          plan_name: string | null
          amount: number
          currency: 'AUD' | 'USD'
          cadence: 'monthly' | 'yearly' | 'usage' | 'free'
          logo_src: string | null
          is_active: boolean
          account_email: string | null
          account_entity: 'quni' | '4logistics' | 'personal' | null
          encrypted_password: string | null
          twofa_enabled: boolean | null
          twofa_method: string | null
          recovery_location: string | null
          api_key_notes: string | null
          connected_to: string | null
          cred_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          href: string
          billing_href?: string | null
          plan_name?: string | null
          amount?: number
          currency?: 'AUD' | 'USD'
          cadence?: 'monthly' | 'yearly' | 'usage' | 'free'
          logo_src?: string | null
          is_active?: boolean
          account_email?: string | null
          account_entity?: 'quni' | '4logistics' | 'personal' | null
          encrypted_password?: string | null
          twofa_enabled?: boolean | null
          twofa_method?: string | null
          recovery_location?: string | null
          api_key_notes?: string | null
          connected_to?: string | null
          cred_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          href?: string
          billing_href?: string | null
          plan_name?: string | null
          amount?: number
          currency?: 'AUD' | 'USD'
          cadence?: 'monthly' | 'yearly' | 'usage' | 'free'
          logo_src?: string | null
          is_active?: boolean
          account_email?: string | null
          account_entity?: 'quni' | '4logistics' | 'personal' | null
          encrypted_password?: string | null
          twofa_enabled?: boolean | null
          twofa_method?: string | null
          recovery_location?: string | null
          api_key_notes?: string | null
          connected_to?: string | null
          cred_notes?: string | null
          created_at?: string
          updated_at?: string
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
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          landlord_terms_accepted_at: string | null
          has_landlord_insurance: boolean | null
          insurance_acknowledged_at: string | null
          onboarding_complete: boolean
          onboarding_completed_at: string | null
          fee_exempt: boolean
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
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          landlord_terms_accepted_at?: string | null
          has_landlord_insurance?: boolean | null
          insurance_acknowledged_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          fee_exempt?: boolean
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
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          landlord_terms_accepted_at?: string | null
          has_landlord_insurance?: boolean | null
          insurance_acknowledged_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          fee_exempt?: boolean
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
          uni_email: string | null
          uni_email_verified: boolean | null
          uni_email_verified_at: string | null
          work_email: string | null
          work_email_verified: boolean | null
          work_email_verified_at: string | null
          id_document_url: string | null
          id_submitted_at: string | null
          enrolment_doc_url: string | null
          enrolment_submitted_at: string | null
          onboarding_complete: boolean
          terms_accepted_at: string | null
          verification_type: 'student' | 'identity' | 'none'
          identity_supporting_doc_url: string | null
          identity_supporting_submitted_at: string | null
          accommodation_verification_route: 'student' | 'non_student' | null
          bio: string | null
          occupancy_type: 'sole' | 'couple' | 'open' | null
          move_in_flexibility: 'exact' | 'one_week' | 'two_weeks' | null
          has_pets: boolean | null
          needs_parking: boolean | null
          bills_preference: 'included' | 'separate' | 'either' | null
          furnishing_preference: 'furnished' | 'unfurnished' | 'either' | null
          has_guarantor: boolean | null
          guarantor_name: string | null
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
          uni_email?: string | null
          uni_email_verified?: boolean | null
          uni_email_verified_at?: string | null
          work_email?: string | null
          work_email_verified?: boolean | null
          work_email_verified_at?: string | null
          id_document_url?: string | null
          id_submitted_at?: string | null
          enrolment_doc_url?: string | null
          enrolment_submitted_at?: string | null
          onboarding_complete?: boolean
          terms_accepted_at?: string | null
          verification_type?: 'student' | 'identity' | 'none'
          identity_supporting_doc_url?: string | null
          identity_supporting_submitted_at?: string | null
          accommodation_verification_route?: 'student' | 'non_student' | null
          bio?: string | null
          occupancy_type?: 'sole' | 'couple' | 'open' | null
          move_in_flexibility?: 'exact' | 'one_week' | 'two_weeks' | null
          has_pets?: boolean | null
          needs_parking?: boolean | null
          bills_preference?: 'included' | 'separate' | 'either' | null
          furnishing_preference?: 'furnished' | 'unfurnished' | 'either' | null
          has_guarantor?: boolean | null
          guarantor_name?: string | null
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
          uni_email?: string | null
          uni_email_verified?: boolean | null
          uni_email_verified_at?: string | null
          work_email?: string | null
          work_email_verified?: boolean | null
          work_email_verified_at?: string | null
          id_document_url?: string | null
          id_submitted_at?: string | null
          enrolment_doc_url?: string | null
          enrolment_submitted_at?: string | null
          onboarding_complete?: boolean
          terms_accepted_at?: string | null
          verification_type?: 'student' | 'identity' | 'none'
          identity_supporting_doc_url?: string | null
          identity_supporting_submitted_at?: string | null
          accommodation_verification_route?: 'student' | 'non_student' | null
          bio?: string | null
          occupancy_type?: 'sole' | 'couple' | 'open' | null
          move_in_flexibility?: 'exact' | 'one_week' | 'two_weeks' | null
          has_pets?: boolean | null
          needs_parking?: boolean | null
          bills_preference?: 'included' | 'separate' | 'either' | null
          furnishing_preference?: 'furnished' | 'unfurnished' | 'either' | null
          has_guarantor?: boolean | null
          guarantor_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_profiles_campus_id_fkey'
            columns: ['campus_id']
            isOneToOne: false
            referencedRelation: 'campuses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_profiles_university_id_fkey'
            columns: ['university_id']
            isOneToOne: false
            referencedRelation: 'universities'
            referencedColumns: ['id']
          },
        ]
      }
      pricing_change_log: {
        Row: {
          id: string
          changed_at: string
          tier: string | null
          service_tier: string | null
          field_name: string
          old_value: string | null
          new_value: string | null
          changed_by: string | null
        }
        Insert: {
          id?: string
          changed_at?: string
          tier?: string | null
          service_tier?: string | null
          field_name: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
        }
        Update: {
          id?: string
          changed_at?: string
          tier?: string | null
          service_tier?: string | null
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
        }
        Relationships: []
      }
      service_tier_events: {
        Row: {
          id: string
          booking_id: string | null
          property_id: string | null
          landlord_id: string | null
          student_id: string | null
          event_type: string
          service_tier: 'listing' | 'managed' | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          property_id?: string | null
          landlord_id?: string | null
          student_id?: string | null
          event_type: string
          service_tier?: 'listing' | 'managed' | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          property_id?: string | null
          landlord_id?: string | null
          student_id?: string | null
          event_type?: string
          service_tier?: 'listing' | 'managed' | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_tier_events_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_tier_events_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }
      pricing_config: {
        Row: {
          id: string
          tier: string
          property_tier: string
          service_tier: string
          svc_fee_pct: number
          fee_mode: string
          fee_percent: number
          fee_fixed_cents: number
          student_fee_type: string
          student_fee_mode: string
          student_fee_percent: number
          student_fee_fixed_cents: number
          card_surcharge_enabled: boolean
          free_transfer_required: boolean
          fee_model: string
          utilities_cap: number
          utilities_cap_aud: number
          early_adopter_active: boolean
          early_adopter_type: string | null
          early_adopter_value: number | null
          early_adopter_expiry_type: string | null
          early_adopter_expiry_date: string | null
          early_adopter_expiry_count: number | null
          early_adopter_landlords_used: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          tier: string
          property_tier?: string
          service_tier?: string
          svc_fee_pct: number
          fee_mode?: string
          fee_percent?: number
          fee_fixed_cents?: number
          student_fee_type: string
          student_fee_mode?: string
          student_fee_percent?: number
          student_fee_fixed_cents?: number
          card_surcharge_enabled?: boolean
          free_transfer_required?: boolean
          fee_model: string
          utilities_cap?: number
          utilities_cap_aud?: number
          early_adopter_active?: boolean
          early_adopter_type?: string | null
          early_adopter_value?: number | null
          early_adopter_expiry_type?: string | null
          early_adopter_expiry_date?: string | null
          early_adopter_expiry_count?: number | null
          early_adopter_landlords_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          tier?: string
          property_tier?: string
          service_tier?: string
          svc_fee_pct?: number
          fee_mode?: string
          fee_percent?: number
          fee_fixed_cents?: number
          student_fee_type?: string
          student_fee_mode?: string
          student_fee_percent?: number
          student_fee_fixed_cents?: number
          card_surcharge_enabled?: boolean
          free_transfer_required?: boolean
          fee_model?: string
          utilities_cap?: number
          utilities_cap_aud?: number
          early_adopter_active?: boolean
          early_adopter_type?: string | null
          early_adopter_value?: number | null
          early_adopter_expiry_type?: string | null
          early_adopter_expiry_date?: string | null
          early_adopter_expiry_count?: number | null
          early_adopter_landlords_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      volume_discount_tiers: {
        Row: {
          id: string
          service_tier: string
          label: string
          min_rooms: number
          max_rooms: number
          discount_rate_pct: number
        }
        Insert: {
          id?: string
          service_tier?: string
          label: string
          min_rooms: number
          max_rooms: number
          discount_rate_pct: number
        }
        Update: {
          id?: string
          service_tier?: string
          label?: string
          min_rooms?: number
          max_rooms?: number
          discount_rate_pct?: number
        }
        Relationships: []
      }
      property_fee_snapshots: {
        Row: {
          id: string
          property_id: string
          service_tier: 'listing' | 'managed'
          source_property_tier: string
          fee_mode: string
          fee_percent: number
          fee_fixed_cents: number
          student_fee_mode: string
          student_fee_percent: number
          student_fee_fixed_cents: number
          card_surcharge_enabled: boolean
          free_transfer_required: boolean
          utilities_cap_aud: number
          snapshot_taken_at: string
          snapshot_source: string
          changed_by: string | null
          change_reason: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          property_id: string
          service_tier: 'listing' | 'managed'
          source_property_tier: string
          fee_mode: string
          fee_percent: number
          fee_fixed_cents: number
          student_fee_mode: string
          student_fee_percent: number
          student_fee_fixed_cents: number
          card_surcharge_enabled: boolean
          free_transfer_required: boolean
          utilities_cap_aud: number
          snapshot_taken_at?: string
          snapshot_source: string
          changed_by?: string | null
          change_reason?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          property_id?: string
          service_tier?: 'listing' | 'managed'
          source_property_tier?: string
          fee_mode?: string
          fee_percent?: number
          fee_fixed_cents?: number
          student_fee_mode?: string
          student_fee_percent?: number
          student_fee_fixed_cents?: number
          card_surcharge_enabled?: boolean
          free_transfer_required?: boolean
          utilities_cap_aud?: number
          snapshot_taken_at?: string
          snapshot_source?: string
          changed_by?: string | null
          change_reason?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'property_fee_snapshots_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
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
          available_to: string | null
          status: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft'
          linen_supplied: boolean | null
          weekly_cleaning_service: boolean | null
          property_type: string | null
          open_to_non_students: boolean
          is_registered_rooming_house: boolean
          rooming_house_registration_number: string | null
          house_rules: string | null
          created_at: string
          updated_at: string
          property_group_id: string | null
          service_tier: 'listing' | 'managed'
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
          available_to?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft'
          linen_supplied?: boolean | null
          weekly_cleaning_service?: boolean | null
          property_type?: string | null
          open_to_non_students?: boolean
          is_registered_rooming_house?: boolean
          rooming_house_registration_number?: string | null
          house_rules?: string | null
          created_at?: string
          updated_at?: string
          property_group_id?: string | null
          service_tier?: 'listing' | 'managed'
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
          available_to?: string | null
          status?: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft'
          linen_supplied?: boolean | null
          weekly_cleaning_service?: boolean | null
          property_type?: string | null
          open_to_non_students?: boolean
          is_registered_rooming_house?: boolean
          rooming_house_registration_number?: string | null
          house_rules?: string | null
          created_at?: string
          updated_at?: string
          property_group_id?: string | null
          service_tier?: 'listing' | 'managed'
        }
        Relationships: [
          {
            foreignKeyName: 'properties_landlord_id_fkey'
            columns: ['landlord_id']
            isOneToOne: false
            referencedRelation: 'landlord_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_university_id_fkey'
            columns: ['university_id']
            isOneToOne: false
            referencedRelation: 'universities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_campus_id_fkey'
            columns: ['campus_id']
            isOneToOne: false
            referencedRelation: 'campuses'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'property_features_feature_id_fkey'
            columns: ['feature_id']
            isOneToOne: false
            referencedRelation: 'features'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_features_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }
      property_house_rules: {
        Row: {
          property_id: string
          rule_id: string
          permitted: string
        }
        Insert: {
          property_id: string
          rule_id: string
          permitted: string
        }
        Update: {
          property_id?: string
          rule_id?: string
          permitted?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_house_rules_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_house_rules_rule_id_fkey'
            columns: ['rule_id']
            isOneToOne: false
            referencedRelation: 'house_rules_ref'
            referencedColumns: ['id']
          },
        ]
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
            | 'awaiting_info'
            | 'bond_pending'
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
          listing_fee_stripe_payment_intent_id: string | null
          deposit_released_at: string | null
          confirmed_at: string | null
          declined_at: string | null
          expires_at: string | null
          expired_at: string | null
          bond_received_by_landlord_at: string | null
          bond_window_expires_at: string | null
          bond_acknowledged: boolean | null
          property_type: string | null
          rent_payment_method: 'bank_transfer' | 'quni_platform' | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          ai_assessment: string | null
          ai_assessment_at: string | null
          service_tier_at_request: 'listing' | 'managed' | null
          service_tier_final: 'listing' | 'managed' | null
          decline_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          housemates_count: number | null
          conversation_id: string | null
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
            | 'awaiting_info'
            | 'bond_pending'
            | 'confirmed'
            | 'active'
            | 'cancelled'
            | 'declined'
            | 'expired'
            | 'payment_failed'
            | 'completed'
          notes?: string | null
          decline_reason?: string | null
          move_in_date?: string | null
          lease_length?: string | null
          student_message?: string | null
          booking_fee_paid?: boolean | null
          deposit_amount?: number | null
          platform_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          listing_fee_stripe_payment_intent_id?: string | null
          deposit_released_at?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          expired_at?: string | null
          bond_received_by_landlord_at?: string | null
          bond_window_expires_at?: string | null
          bond_acknowledged?: boolean | null
          property_type?: string | null
          rent_payment_method?: 'bank_transfer' | 'quni_platform' | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          ai_assessment?: string | null
          ai_assessment_at?: string | null
          service_tier_at_request?: 'listing' | 'managed' | null
          service_tier_final?: 'listing' | 'managed' | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          housemates_count?: number | null
          conversation_id?: string | null
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
            | 'awaiting_info'
            | 'bond_pending'
            | 'confirmed'
            | 'active'
            | 'cancelled'
            | 'declined'
            | 'expired'
            | 'payment_failed'
            | 'completed'
          notes?: string | null
          decline_reason?: string | null
          move_in_date?: string | null
          lease_length?: string | null
          student_message?: string | null
          booking_fee_paid?: boolean | null
          deposit_amount?: number | null
          platform_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          listing_fee_stripe_payment_intent_id?: string | null
          deposit_released_at?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          expired_at?: string | null
          bond_received_by_landlord_at?: string | null
          bond_window_expires_at?: string | null
          bond_acknowledged?: boolean | null
          property_type?: string | null
          rent_payment_method?: 'bank_transfer' | 'quni_platform' | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          ai_assessment?: string | null
          ai_assessment_at?: string | null
          service_tier_at_request?: 'listing' | 'managed' | null
          service_tier_final?: 'listing' | 'managed' | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          housemates_count?: number | null
          conversation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_landlord_id_fkey'
            columns: ['landlord_id']
            isOneToOne: false
            referencedRelation: 'landlord_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'student_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      booking_messages: {
        Row: {
          id: string
          booking_id: string
          sender_id: string
          sender_role: 'landlord' | 'student'
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          sender_id: string
          sender_role: 'landlord' | 'student'
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          sender_id?: string
          sender_role?: 'landlord' | 'student'
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'booking_messages_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          property_id: string
          landlord_profile_id: string
          landlord_user_id: string
          tenant_user_id: string
          tenant_profile_id: string | null
          booking_id: string | null
          status: 'open' | 'archived'
          contact_unlocked_at: string | null
          last_message_at: string
          last_message_preview: string
          landlord_last_read_at: string | null
          tenant_last_read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          landlord_profile_id?: string
          landlord_user_id?: string
          tenant_user_id: string
          tenant_profile_id?: string | null
          booking_id?: string | null
          status?: 'open' | 'archived'
          contact_unlocked_at?: string | null
          last_message_at?: string
          last_message_preview?: string
          landlord_last_read_at?: string | null
          tenant_last_read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          landlord_profile_id?: string
          landlord_user_id?: string
          tenant_user_id?: string
          tenant_profile_id?: string | null
          booking_id?: string | null
          status?: 'open' | 'archived'
          contact_unlocked_at?: string | null
          last_message_at?: string
          last_message_preview?: string
          landlord_last_read_at?: string | null
          tenant_last_read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_landlord_profile_id_fkey'
            columns: ['landlord_profile_id']
            isOneToOne: false
            referencedRelation: 'landlord_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_tenant_profile_id_fkey'
            columns: ['tenant_profile_id']
            isOneToOne: false
            referencedRelation: 'student_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_user_id: string | null
          sender_role: 'tenant' | 'landlord' | 'system'
          kind: 'user' | 'system'
          body: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_user_id?: string | null
          sender_role: 'tenant' | 'landlord' | 'system'
          kind: 'user' | 'system'
          body: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_user_id?: string | null
          sender_role?: 'tenant' | 'landlord' | 'system'
          kind?: 'user' | 'system'
          body?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      message_contact_mask_events: {
        Row: {
          id: string
          conversation_id: string
          message_id: string
          sender_user_id: string | null
          mask_type: 'phone' | 'email' | 'url' | 'social'
          match_count: number
          content_dedup_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          message_id: string
          sender_user_id?: string | null
          mask_type: 'phone' | 'email' | 'url' | 'social'
          match_count: number
          content_dedup_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          message_id?: string
          sender_user_id?: string | null
          mask_type?: 'phone' | 'email' | 'url' | 'social'
          match_count?: number
          content_dedup_hash?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_contact_mask_events_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_contact_mask_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'conversation_messages'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
        ]
      }
      service_tier_state_matrix: {
        Row: {
          id: string
          state_code: 'NSW' | 'QLD' | 'VIC' | 'DEFAULT'
          property_tier: 't1' | 't2' | 't3'
          managed_status: 'available' | 'gated' | 'unsupported'
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          state_code: 'NSW' | 'QLD' | 'VIC' | 'DEFAULT'
          property_tier: 't1' | 't2' | 't3'
          managed_status: 'available' | 'gated' | 'unsupported'
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          state_code?: 'NSW' | 'QLD' | 'VIC' | 'DEFAULT'
          property_tier?: 't1' | 't2' | 't3'
          managed_status?: 'available' | 'gated' | 'unsupported'
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          id: string
          config_key: string
          config_value: string
          label: string
          category: string
          is_sensitive: boolean
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          config_key: string
          config_value?: string
          label: string
          category: string
          is_sensitive?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: string
          label?: string
          category?: string
          is_sensitive?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
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
        Relationships: [
          {
            foreignKeyName: 'bonds_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonds_landlord_id_fkey'
            columns: ['landlord_id']
            isOneToOne: false
            referencedRelation: 'landlord_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonds_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bonds_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'student_profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'enquiries_landlord_id_fkey'
            columns: ['landlord_id']
            isOneToOne: false
            referencedRelation: 'landlord_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enquiries_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enquiries_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'student_profiles'
            referencedColumns: ['id']
          },
        ]
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
            | 'bond_receipt'
            | 'residential_tenancy'
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
            | 'bond_receipt'
            | 'residential_tenancy'
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
            | 'bond_receipt'
            | 'residential_tenancy'
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
    Functions: {
      is_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      property_access_status_for_viewer: {
        Args: { p_slug: string }
        Returns: string
      }
      property_access_status_for_viewer_by_id: {
        Args: { p_id: string }
        Returns: string
      }
      property_availability_check: {
        Args: {
          p_property_ids: string[]
          p_move_in_date: string
          p_move_out_date?: string | null
          p_exclude_student_id?: string | null
        }
        Returns: string[]
      }
      duplicate_property_listing: {
        Args: { p_source_id: string }
        Returns: string
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      admin_update_property_fee_snapshots: {
        Args: {
          p_property_id: string
          p_change_reason: string
          p_listing_fee_mode: string
          p_listing_fee_percent: number
          p_listing_fee_fixed_cents: number
          p_listing_student_fee_mode: string
          p_listing_student_fee_percent: number
          p_listing_student_fee_fixed_cents: number
          p_listing_card_surcharge_enabled: boolean
          p_listing_free_transfer_required: boolean
          p_listing_utilities_cap_aud: number
          p_managed_fee_mode: string
          p_managed_fee_percent: number
          p_managed_fee_fixed_cents: number
          p_managed_student_fee_mode: string
          p_managed_student_fee_percent: number
          p_managed_student_fee_fixed_cents: number
          p_managed_card_surcharge_enabled: boolean
          p_managed_free_transfer_required: boolean
          p_managed_utilities_cap_aud: number
        }
        Returns: undefined
      }
      admin_reset_property_fee_snapshots_from_template: {
        Args: { p_property_id: string; p_change_reason: string }
        Returns: undefined
      }
    }
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
