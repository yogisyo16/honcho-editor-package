import {AlertColor} from "@mui/material";

export interface Event {
  available: boolean;
  client_name: string;
  id: string;
  log: Log;
  user_id: string;
  name: string;
}

interface OptionList {
  selected: boolean;
  description: string;
}
export interface UploadResolution {
  original: OptionList;
  large: OptionList;
  medium: OptionList;
  small: OptionList;
  mini: OptionList;
}

interface HiRes {
  enabled: boolean;
  original: OptionList;
  large: OptionList;
}

interface WebSize {
  enabled: boolean;
  medium: OptionList;
  small: OptionList;
  mini: OptionList;
}

export interface DownloadResolution {
  hi_res: HiRes;
  web_size: WebSize;
}

export interface DataSetting {
  id: string;
  landscape_frame: Content;
  portrait_frame: Content;
  auto_publish: boolean;
  show_gallery: boolean;
  show_slide_show: boolean;
  hidden_gallery: boolean;
  output: {
    width: number;
    height: number;
  };
  upload_resolution: UploadResolution;
  download_resolution: DownloadResolution;
  log?: Log;
}

export type SizeDownload = "hi-res" | "web-size";

export interface DataEmail {
  id: string;
  subject: string;
  body: string;
  log?: Log;
}

export interface EventPageResult {
  events: Event[];
  limit: number;
  current_page: number;
  prev_page: number;
  next_page: number;
}

export interface GalleryPageResult {
  gallery: Gallery[];
  limit: number;
  current_page: number;
  prev_page: number;
  next_page: number;
  sum_of_image?: number;
}

export interface SlideshowResult {
  gallery: Gallery[];
  limit: number;
  next_page: string | null;
  total: number;
}

export interface DownloadCheckResult {
  id: string;
  event_id: string;
  task_id: string;
  status: string;
  path?: string;
  image_count: number;
  gif_count: number;
  log?: Log;
}

export interface Content {
  key: string;
  path: string;
  size: number;
  width: number;
  height: number;
}
export interface Log {
  created_at: string;
  updated_at: string;
}

export interface SelectedItem {
  id: string;
  width: number;
  height: number;
  isGif: boolean;
  isPublish: boolean;
}

export interface GallerySetup {
  src: string;
  original: string;
  srcSet?: string | string[] | undefined;
  sizes?: string | string[] | undefined;
  width: number;
  height: number;
  alt: string | undefined;
  key: string | undefined;
  frame?: string | undefined;
  isSelected?: boolean | undefined;
}

export interface PreviewSetup {
  src: string;
}

export interface PictureWithSelected {
  picture: Gallery;
  isSelected: boolean;
  index: number;
}

export interface Gallery {
  id: string;
  uid: string;
  event_id: string;
  download: Content;
  download_edited: Content;
  raw?: Content;
  raw_edited?: Content;
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
  log: Log;
}

export interface DeepfaceResultAuto {
  fetch_url: string;
  galleries: Gallery[]
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

export interface EventPublic {
  id: string;
  password: string;
}

export interface Profile {
  company_logo_url: string;
  profile_photo_url: string;
  first_name: string;
  last_name: string;
  log: Log;
}

export interface JWT {
  event_id: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface Subscription {
  client_secret: string;
  price_id: string;
  product_id: string;
  subscription_id: string;
  subscription_item_id: string;
  status: string;
  invoice_id: string;
  created_at: number;
  cancel_at_period_end: boolean;
}

export interface StatFaceRecognation {
  usage: number;
  limit: number;
}
export interface GalleryStat {
  published: number;
  pending: number;
  deleted: number;
}

// Type SnackBar
export interface SnackBarMessage {
  open: boolean;
  status: AlertColor | undefined ;
  message: string
}