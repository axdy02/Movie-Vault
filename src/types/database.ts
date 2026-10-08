// Generated from applied PostgreSQL migrations by npm run db:types.
// Source: supabase/generate-types.mjs (PGlite catalog introspection).
// For a linked live Supabase project: npx supabase gen types typescript --linked.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'app_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_events: {
        Row: {
          id: string
          actor_user_id: string | null
          actor_display_name_snapshot: string | null
          action: string
          entity_type: Database['public']['Enums']['audit_entity_type']
          entity_id: string | null
          movie_id: string | null
          collection_id: string | null
          source_surface: string | null
          source_route: string | null
          interaction_method: string | null
          before_state: Json | null
          after_state: Json | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          actor_display_name_snapshot?: string | null
          action: string
          entity_type: Database['public']['Enums']['audit_entity_type']
          entity_id?: string | null
          movie_id?: string | null
          collection_id?: string | null
          source_surface?: string | null
          source_route?: string | null
          interaction_method?: string | null
          before_state?: Json | null
          after_state?: Json | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_user_id?: string | null
          actor_display_name_snapshot?: string | null
          action?: string
          entity_type?: Database['public']['Enums']['audit_entity_type']
          entity_id?: string | null
          movie_id?: string | null
          collection_id?: string | null
          source_surface?: string | null
          source_route?: string | null
          interaction_method?: string | null
          before_state?: Json | null
          after_state?: Json | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_collection_id_fkey'
            columns: ['collection_id']
            isOneToOne: false
            referencedRelation: 'collections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
      collection_items: {
        Row: {
          id: string
          collection_id: string
          movie_id: string
          added_by: string
          added_at: string
          position: number | null
          removed_at: string | null
          removed_by: string | null
        }
        Insert: {
          id?: string
          collection_id: string
          movie_id: string
          added_by: string
          added_at?: string
          position?: number | null
          removed_at?: string | null
          removed_by?: string | null
        }
        Update: {
          id?: string
          collection_id?: string
          movie_id?: string
          added_by?: string
          added_at?: string
          position?: number | null
          removed_at?: string | null
          removed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'collection_items_added_by_fkey'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collection_items_collection_id_fkey'
            columns: ['collection_id']
            isOneToOne: false
            referencedRelation: 'collections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collection_items_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collection_items_removed_by_fkey'
            columns: ['removed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_by: string
          is_pinned: boolean
          cover_movie_id: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          archived_by: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_by: string
          is_pinned?: boolean
          cover_movie_id?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          archived_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_by?: string
          is_pinned?: boolean
          cover_movie_id?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          archived_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'collections_archived_by_fkey'
            columns: ['archived_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collections_cover_movie_id_fkey'
            columns: ['cover_movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collections_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      genres: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          id: string
          movie_id: string
          added_by: string
          added_at: string
          source: Database['public']['Enums']['library_source']
          source_query: string | null
          source_route: string | null
          source_person_id: string | null
          source_collection_id: string | null
          removed_at: string | null
          removed_by: string | null
          restored_at: string | null
          restored_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          movie_id: string
          added_by: string
          added_at?: string
          source: Database['public']['Enums']['library_source']
          source_query?: string | null
          source_route?: string | null
          source_person_id?: string | null
          source_collection_id?: string | null
          removed_at?: string | null
          removed_by?: string | null
          restored_at?: string | null
          restored_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          movie_id?: string
          added_by?: string
          added_at?: string
          source?: Database['public']['Enums']['library_source']
          source_query?: string | null
          source_route?: string | null
          source_person_id?: string | null
          source_collection_id?: string | null
          removed_at?: string | null
          removed_by?: string | null
          restored_at?: string | null
          restored_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'library_items_added_by_fkey'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: true
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_removed_by_fkey'
            columns: ['removed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_restored_by_fkey'
            columns: ['restored_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_source_person_id_fkey'
            columns: ['source_person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_source_collection_fk'
            columns: ['source_collection_id']
            isOneToOne: false
            referencedRelation: 'collections'
            referencedColumns: ['id']
          },
        ]
      }
      movie_genres: {
        Row: {
          movie_id: string
          genre_id: number
        }
        Insert: {
          movie_id: string
          genre_id: number
        }
        Update: {
          movie_id?: string
          genre_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'movie_genres_genre_id_fkey'
            columns: ['genre_id']
            isOneToOne: false
            referencedRelation: 'genres'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movie_genres_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
      movie_people: {
        Row: {
          id: string
          movie_id: string
          person_id: string
          credit_type: Database['public']['Enums']['credit_type']
          character_name: string | null
          department: string | null
          job: string | null
          cast_order: number | null
          credit_id: string | null
        }
        Insert: {
          id?: string
          movie_id: string
          person_id: string
          credit_type: Database['public']['Enums']['credit_type']
          character_name?: string | null
          department?: string | null
          job?: string | null
          cast_order?: number | null
          credit_id?: string | null
        }
        Update: {
          id?: string
          movie_id?: string
          person_id?: string
          credit_type?: Database['public']['Enums']['credit_type']
          character_name?: string | null
          department?: string | null
          job?: string | null
          cast_order?: number | null
          credit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'movie_people_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movie_people_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      movie_provider_snapshots: {
        Row: {
          id: string
          movie_id: string
          region_code: string
          raw_payload: Json
          flatrate_provider_ids: number[]
          free_provider_ids: number[]
          ads_provider_ids: number[]
          rent_provider_ids: number[]
          buy_provider_ids: number[]
          tmdb_link: string | null
          fetched_at: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          movie_id: string
          region_code: string
          raw_payload: Json
          flatrate_provider_ids?: number[]
          free_provider_ids?: number[]
          ads_provider_ids?: number[]
          rent_provider_ids?: number[]
          buy_provider_ids?: number[]
          tmdb_link?: string | null
          fetched_at: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          movie_id?: string
          region_code?: string
          raw_payload?: Json
          flatrate_provider_ids?: number[]
          free_provider_ids?: number[]
          ads_provider_ids?: number[]
          rent_provider_ids?: number[]
          buy_provider_ids?: number[]
          tmdb_link?: string | null
          fetched_at?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'movie_provider_snapshots_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
      movies: {
        Row: {
          id: string
          tmdb_id: number
          title: string
          original_title: string | null
          overview: string | null
          release_date: string | null
          release_year: number | null
          runtime_minutes: number | null
          original_language: string | null
          poster_path: string | null
          backdrop_path: string | null
          tmdb_vote_average: number | null
          tmdb_vote_count: number | null
          tmdb_popularity: number | null
          metadata_json: Json
          metadata_refreshed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tmdb_id: number
          title: string
          original_title?: string | null
          overview?: string | null
          release_date?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          original_language?: string | null
          poster_path?: string | null
          backdrop_path?: string | null
          tmdb_vote_average?: number | null
          tmdb_vote_count?: number | null
          tmdb_popularity?: number | null
          metadata_json?: Json
          metadata_refreshed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tmdb_id?: number
          title?: string
          original_title?: string | null
          overview?: string | null
          release_date?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          original_language?: string | null
          poster_path?: string | null
          backdrop_path?: string | null
          tmdb_vote_average?: number | null
          tmdb_vote_count?: number | null
          tmdb_popularity?: number | null
          metadata_json?: Json
          metadata_refreshed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          id: string
          tmdb_person_id: number
          name: string
          profile_path: string | null
          known_for_department: string | null
          metadata_json: Json
          metadata_refreshed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tmdb_person_id: number
          name: string
          profile_path?: string | null
          known_for_department?: string | null
          metadata_json?: Json
          metadata_refreshed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tmdb_person_id?: number
          name?: string
          profile_path?: string | null
          known_for_department?: string | null
          metadata_json?: Json
          metadata_refreshed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          role: Database['public']['Enums']['app_role']
          avatar_url: string | null
          is_active: boolean
          editor_slot: number
          preferred_region: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          role?: Database['public']['Enums']['app_role']
          avatar_url?: string | null
          is_active?: boolean
          editor_slot: number
          preferred_region?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          role?: Database['public']['Enums']['app_role']
          avatar_url?: string | null
          is_active?: boolean
          editor_slot?: number
          preferred_region?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      provider_catalog: {
        Row: {
          provider_id: number
          provider_name: string
          logo_path: string | null
          display_priority: number | null
          updated_at: string
        }
        Insert: {
          provider_id: number
          provider_name: string
          logo_path?: string | null
          display_priority?: number | null
          updated_at?: string
        }
        Update: {
          provider_id?: number
          provider_name?: string
          logo_path?: string | null
          display_priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_movie_state: {
        Row: {
          user_id: string
          movie_id: string
          is_watched: boolean
          last_watched_at: string | null
          rating: number | null
          is_favorite: boolean
          personal_note: string | null
          want_to_watch: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          movie_id: string
          is_watched?: boolean
          last_watched_at?: string | null
          rating?: number | null
          is_favorite?: boolean
          personal_note?: string | null
          want_to_watch?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          movie_id?: string
          is_watched?: boolean
          last_watched_at?: string | null
          rating?: number | null
          is_favorite?: boolean
          personal_note?: string | null
          want_to_watch?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_movie_state_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_movie_state_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      watch_events: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          watched_at: string
          note: string | null
          source_route: string | null
          created_at: string
          created_by: string
          corrected_from_event_id: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          watched_at: string
          note?: string | null
          source_route?: string | null
          created_at?: string
          created_by: string
          corrected_from_event_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          watched_at?: string
          note?: string | null
          source_route?: string | null
          created_at?: string
          created_by?: string
          corrected_from_event_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'watch_events_corrected_from_event_id_fkey'
            columns: ['corrected_from_event_id']
            isOneToOne: false
            referencedRelation: 'watch_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'watch_events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'watch_events_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'watch_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'watch_events_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_activity_feed: {
        Row: {
          id: string | null
          actor_user_id: string | null
          actor_display_name_snapshot: string | null
          action: string | null
          entity_type: Database['public']['Enums']['audit_entity_type'] | null
          entity_id: string | null
          movie_id: string | null
          collection_id: string | null
          source_surface: string | null
          source_route: string | null
          interaction_method: string | null
          created_at: string | null
          movie_title: string | null
          poster_path: string | null
          collection_name: string | null
        }
        Relationships: []
      }
      public_library_view: {
        Row: {
          id: string | null
          tmdb_id: number | null
          title: string | null
          original_title: string | null
          overview: string | null
          release_date: string | null
          release_year: number | null
          runtime_minutes: number | null
          original_language: string | null
          poster_path: string | null
          backdrop_path: string | null
          tmdb_vote_average: number | null
          tmdb_vote_count: number | null
          tmdb_popularity: number | null
          added_at: string | null
          added_by: string | null
          added_by_name: string | null
          watched_count: number | null
          average_rating: number | null
        }
        Relationships: []
      }
      public_movie_states: {
        Row: {
          user_id: string | null
          movie_id: string | null
          is_watched: boolean | null
          last_watched_at: string | null
          rating: number | null
          is_favorite: boolean | null
          want_to_watch: boolean | null
          watch_count: number | null
        }
        Relationships: []
      }
      public_watch_history: {
        Row: {
          id: string | null
          user_id: string | null
          movie_id: string | null
          watched_at: string | null
          created_at: string | null
          corrected_from_event_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      vault_activity: {
        Args: {
          p_limit?: number | null
          p_offset?: number | null
          p_actor?: string | null
          p_action?: string | null
          p_movie_id?: string | null
          p_collection_id?: string | null
          p_from?: string | null
          p_to?: string | null
        }
        Returns: Json
      }
      vault_add_movie: {
        Args: {
          p_movie: Json
          p_context: Json
          p_collection_id?: string | null
        }
        Returns: string
      }
      vault_cached_movie: { Args: { p_tmdb_id: number | null }; Returns: Json }
      vault_collection: {
        Args: {
          p_id: string | null
          p_name: string | null
          p_description: string | null
          p_cover_movie_id: string | null
          p_context: Json
          p_archive?: boolean | null
        }
        Returns: string
      }
      vault_correct_watch: {
        Args: {
          p_event_id: string | null
          p_watched_at: string | null
          p_context: Json
        }
        Returns: string
      }
      vault_is_editor: { Args: Record<PropertyKey, never>; Returns: boolean }
      vault_membership: {
        Args: {
          p_collection_id: string | null
          p_movie_id: string | null
          p_remove: boolean | null
          p_context: Json
        }
        Returns: undefined
      }
      vault_note: {
        Args: {
          p_movie_id: string | null
          p_note: string | null
          p_context: Json
        }
        Returns: undefined
      }
      vault_preferences: {
        Args: { p_region: string | null; p_context: Json }
        Returns: undefined
      }
      vault_private_data: { Args: Record<PropertyKey, never>; Returns: Json }
      vault_provider_snapshot: {
        Args: { p_movie_id: string | null; p_snapshot: Json; p_context: Json }
        Returns: undefined
      }
      vault_public_data: { Args: { p_region?: string | null }; Returns: Json }
      vault_rate: {
        Args: {
          p_movie_id: string | null
          p_rating: number | null
          p_context: Json
        }
        Returns: undefined
      }
      vault_refresh_movie: {
        Args: { p_movie_id: string | null; p_movie: Json; p_context: Json }
        Returns: undefined
      }
      vault_remove_movie: {
        Args: { p_movie_id: string | null; p_context: Json }
        Returns: undefined
      }
      vault_watch: {
        Args: {
          p_movie_id: string | null
          p_watched: boolean | null
          p_watched_at: string | null
          p_context: Json
          p_rewatch?: boolean | null
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: 'editor'
      audit_entity_type:
        | 'movie'
        | 'library_item'
        | 'watch_state'
        | 'watch_event'
        | 'rating'
        | 'collection'
        | 'collection_item'
        | 'note'
        | 'provider_snapshot'
        | 'profile'
      credit_type: 'cast' | 'crew'
      library_source:
        | 'global_search'
        | 'movie_detail'
        | 'person_filmography'
        | 'collection_editor'
        | 'random_picker'
        | 'import'
        | 'other'
      provider_offer_type: 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'
    }
    CompositeTypes: Record<PropertyKey, never>
  }
}
