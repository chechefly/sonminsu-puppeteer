export interface Slide {
  id: string;
  html: string;
  slideNumber: number;
  candidateImages: string[];
}

export interface EditImageData {
  slideId: string;
  editId: string;
  src: string;
  candidateImages: string[];
  allImages: string[];
}

export interface EditTextData {
  slideId: string;
  editId: string;
  text: string;
}

export interface ExportResult {
  success: number;
  failed: number;
  cancelled: boolean;
  errors: Array<{ slideNumber: number; message: string }>;
}

export type AppStep = 'input' | 'editor';

export interface EditorSession {
  id: string;
  title: string;
  slide_count: number;
  caption: string;
  slides_json: Slide[];
  extracted_styles: string;
  created_at: string;
  updated_at: string;
}
