export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: "teacher" | "student";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role: "teacher" | "student";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: "teacher" | "student";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_credentials: {
        Row: {
          id: string;
          profile_id: string;
          role: "teacher" | "student";
          teacher_login_id: string | null;
          password_hash: string | null;
          student_phone_last4_hash: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role: "teacher" | "student";
          teacher_login_id?: string | null;
          password_hash?: string | null;
          student_phone_last4_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          role?: "teacher" | "student";
          teacher_login_id?: string | null;
          password_hash?: string | null;
          student_phone_last4_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_credentials_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          teacher_id: string;
          title: string;
          description: string;
          question_type: "subjective" | "objective" | "mixed";
          due_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          title: string;
          description: string;
          question_type?: "subjective" | "objective" | "mixed";
          due_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          title?: string;
          description?: string;
          question_type?: "subjective" | "objective" | "mixed";
          due_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_targets: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_targets_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_targets_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          answer_text: string;
          selected_option_ids: string[];
          is_correct: boolean | null;
          feedback_text: string | null;
          feedback_updated_at: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          answer_text: string;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          feedback_text?: string | null;
          feedback_updated_at?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          answer_text?: string;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          feedback_text?: string | null;
          feedback_updated_at?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_image_assets: {
        Row: {
          id: string;
          teacher_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_image_assets_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_objective_details: {
        Row: {
          assignment_id: string;
          prompt: string;
          allow_multiple: boolean;
          explanation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          prompt: string;
          allow_multiple?: boolean;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          prompt?: string;
          allow_multiple?: boolean;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_objective_details_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_objective_options: {
        Row: {
          id: string;
          assignment_id: string;
          option_text: string;
          is_correct: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          option_text: string;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          option_text?: string;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_objective_options_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_questions: {
        Row: {
          id: string;
          assignment_id: string;
          question_type: "subjective" | "objective";
          prompt: string;
          image_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          question_type: "subjective" | "objective";
          prompt: string;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          question_type?: "subjective" | "objective";
          prompt?: string;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_questions_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          is_correct: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_question_options_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "assignment_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_answers: {
        Row: {
          id: string;
          submission_id: string;
          question_id: string;
          answer_text: string | null;
          selected_option_ids: string[];
          is_correct: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_id: string;
          answer_text?: string | null;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          question_id?: string;
          answer_text?: string | null;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_answers_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "assignment_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submission_answers_submission_id_fkey";
            columns: ["submission_id"];
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
