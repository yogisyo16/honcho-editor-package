import { Content, DownloadResolution, UploadResolution } from "@/types";

export interface Response<T> {
	code: number;
	data?: T;
	error_message?: string;
}

interface Log {
	created_at: string;
	updated_at: string;
}

export interface IBaseResponse {
	code: number;
	data: string;
}

export interface ImageEditorPreset {
	name: string;
	id?: string;
	temperature: number;
	tint: number;
	saturation: number;
	vibrance: number;
	exposure: number;
	contrast: number;
	highlights: number;
	shadows: number;
	whites: number;
	blacks: number;
	clarity: number;
	sharpness: number;
}

export interface ProfileUser {
	company_logo_url: string;
	profile_photo_url: string;
	first_name: string;
	last_name: string;
	log: Log;
}

export interface Event {
	available: boolean;
	client_name: string;
	id: string;
	log: Log;
	user_id: string;
	name: string;
}

export interface GalleryStats {
	published: number;
	pending: number;
	deleted: number;
}

export interface ColorAdjustment {
	temperature: number;
	tint: number;
	saturation: number;
	vibrance: number;
	exposure: number;
	contrast: number;
	highlights: number;
	shadows: number;
	whites: number;
	blacks: number;
	clarity: number;
	sharpness: number;
}

export interface TransformationAdjustment {
	angle_score?: number;
	direction?: "cw" | "ccw";
	scale_score?: number;
	keep_dimension?: boolean;
	flip_mode?: "horizontal" | "vertical" | "mix";
	aspect_ratio?: string;
	width?: number;
	height?: number;
}

export interface Watermark {
	path: string;
	max_pct: [number, number];
	anchor: [string, number | null, number[] | null];
	rotate_deg: [number, "cw" | "ccw"];
}

export interface EditorConfig {
	color_adjustment: ColorAdjustment;
	transformation_adjustment: TransformationAdjustment[];
	watermarks: Watermark[];
}

export interface Gallery {
	id: string;
	uid: string;
	event_id: string;
	download: Content;
	download_edited: Content;
	raw?: Content;
	raw_edited?: Content;
	raw_preview?: Content;
	raw_thumbnail?: Content;
	original?: Content;
	original_edited?: Content;
	large?: Content;
	large_edited?: Content;
	medium?: Content;
	medium_edited?: Content;
	small?: Content;
	small_edited?: Content;
	mini?: Content;
	mini_edited?: Content;
	create_from?: string[];
	thumbnail: Content;
	thumbnail_edited: Content;
	is_original: boolean;
	available: boolean;
	show_gallery: boolean;
	editor_config?: EditorConfig;
	log: Log;
}

export interface GalleryFaceRecognition {
	galleries: Gallery[];
	fetch_url: string;
}

export interface GalleryFaceRecognitionUpdate {
	galleries: Gallery[];
}

export interface GetRefreshedGalleryResponse {
	gallery: Gallery[]
}

export interface ResponseGalleryPaging {
	gallery: Gallery[];
	limit: number;
	current_page: number;
	prev_page: number;
	next_page: number;
	sum_of_image?: number;
}

export interface ResponseSlideShow {
	gallery: Gallery[];
	limit: number;
	next_page: string | null;
	total: number;
}

export interface Task {
	id: string;
	event_id: string;
	task_id: string;
	status: string;
	path: string;
	image_count: string;
	gif_count: string;
	log: Log;
}

export type SizeDownload = "hi-res" | "web-size";


export interface EditorConfigHistory {
    color_adjustment: ColorAdjustment;
}

export interface HistoryEditorConfig {
    id: string;
    gallery_id: string;
    event_id: string;
    task_id: string;
    editor_config: EditorConfigHistory;
    log: Log;
}

export interface HistoryEditorConfigResponse {
    history: HistoryEditorConfig[];
}