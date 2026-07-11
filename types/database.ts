export type UserRole = 'student' | 'junior_mentor' | 'mentor' | 'admin';
export type MentorType = 'one_on_one' | 'group' | 'sprint';
export type ActivityType =
	| 'session'
	| 'porch_post'
	| 'yt_note'
	| 'mentor_msg_read';
export type ReportPeriod = 'weekly' | 'monthly' | 'custom';
export type ReactionType = 'spartan' | 'lion' | 'wolf';

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					username: string;
					full_name: string | null;
					avatar_url: string | null;
					bio: string | null;
					role: UserRole;
					mentor_id: string | null;
					cohort_id: string | null;
					promoted_at: string | null;
					calendar_public: boolean;
					timezone: string;
					email: string | null;
					show_email: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username: string;
					full_name?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
					role?: UserRole;
					mentor_id?: string | null;
					cohort_id?: string | null;
					promoted_at?: string | null;
					calendar_public?: boolean;
					timezone?: string;
					email?: string | null;
					show_email?: boolean;
				};
				Update: {
					username?: string;
					full_name?: string | null;
					avatar_url?: string | null;
					bio?: string | null;
					calendar_public?: boolean;
					timezone?: string;
					show_email?: boolean;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'profiles_mentor_id_fkey';
						columns: ['mentor_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			sessions: {
				Row: {
					id: string;
					user_id: string;
					topic: string;
					score: number | null;
					difficulty: string | null;
					details: unknown | null;
					completed_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					topic: string;
					score?: number | null;
					difficulty?: string | null;
					details?: unknown | null;
					completed_at?: string | null;
				};
				Update: {
					topic?: string;
					score?: number | null;
					difficulty?: string | null;
					details?: unknown | null;
					completed_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'sessions_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			porch_posts: {
				Row: {
					id: string;
					user_id: string;
					what_learned: string;
					challenges: string | null;
					tomorrow: string | null;
					mood: number | null;
					is_public: boolean;
					post_date: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					what_learned: string;
					challenges?: string | null;
					tomorrow?: string | null;
					mood?: number | null;
					is_public?: boolean;
					post_date: string;
				};
				Update: {
					what_learned?: string;
					challenges?: string | null;
					tomorrow?: string | null;
					mood?: number | null;
					is_public?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: 'porch_posts_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			porch_comments: {
				Row: {
					id: string;
					post_id: string;
					author_id: string;
					content: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					post_id: string;
					author_id: string;
					content: string;
				};
				Update: {
					content?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'porch_comments_post_id_fkey';
						columns: ['post_id'];
						referencedRelation: 'porch_posts';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'porch_comments_author_id_fkey';
						columns: ['author_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			porch_likes: {
				Row: {
					id: string;
					post_id: string;
					user_id: string;
					reaction_type: ReactionType;
					created_at: string;
				};
				Insert: {
					id?: string;
					post_id: string;
					user_id: string;
					reaction_type: ReactionType;
				};
				Update: {
					reaction_type?: ReactionType;
				};
				Relationships: [
					{
						foreignKeyName: 'porch_likes_post_id_fkey';
						columns: ['post_id'];
						referencedRelation: 'porch_posts';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'porch_likes_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			learning_activity: {
				Row: {
					id: string;
					user_id: string;
					activity_date: string;
					activity_type: ActivityType;
					points: number;
					ref_id: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					activity_date: string;
					activity_type: ActivityType;
					points?: number;
					ref_id?: string | null;
				};
				Update: never;
				Relationships: [
					{
						foreignKeyName: 'learning_activity_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
			streaks: {
				Row: {
					user_id: string;
					current_streak: number;
					longest_streak: number;
					last_active_date: string | null;
					updated_at: string;
				};
				Insert: { user_id: string };
				Update: {
					current_streak?: number;
					longest_streak?: number;
					last_active_date?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'streaks_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
				];
			};
		};
		Views: {
			daily_points: {
				Row: {
					user_id: string;
					activity_date: string;
					total_points: number;
					heat_level: number;
				};
				Relationships: [];
			};
		};
		Functions: {
			assign_mentor: {
				Args: { student_id: string; mentor_id: string };
				Returns: void;
			};
			promote_to_junior_mentor: {
				Args: { student_id: string };
				Returns: void;
			};
		};
		Enums: {
			user_role: UserRole;
			mentor_type: MentorType;
			activity_type: ActivityType;
			report_period: ReportPeriod;
		};
		CompositeTypes: Record<string, never>;
	};
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type PorchPost = Database['public']['Tables']['porch_posts']['Row'];
export type PorchComment =
	Database['public']['Tables']['porch_comments']['Row'];
export type PorchLike = Database['public']['Tables']['porch_likes']['Row'];
export type LearningActivity =
	Database['public']['Tables']['learning_activity']['Row'];
export type Streak = Database['public']['Tables']['streaks']['Row'];
export type DailyPoints = Database['public']['Views']['daily_points']['Row'];

// Feed display type — a journal PorchPost enriched with author/comments/likes
export type PorchFeedPost = PorchPost & {
	author?: Pick<
		Profile,
		| 'username'
		| 'full_name'
		| 'avatar_url'
		| 'role'
		| 'email'
		| 'show_email'
	> & {
		streaks?: Pick<Streak, 'current_streak'> | null;
	};
	comments?: (PorchComment & {
		author?: Pick<Profile, 'username' | 'full_name'>;
	})[];
	likes?: PorchLike[];
};
