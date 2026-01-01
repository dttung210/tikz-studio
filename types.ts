export enum Tab {
  DESC_TO_TIKZ = 'DESC_TO_TIKZ',
  TIKZ_TO_SVG = 'TIKZ_TO_SVG',
  IMAGE_TO_TIKZ = 'IMAGE_TO_TIKZ'
}

export interface TikZResult {
  code: string;
  explanation?: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
}

export interface GeneratedData {
  description?: string;
  tikzCode: string;
  svgOutput?: string;
  timestamp: number;
}