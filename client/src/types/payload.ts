export interface ErgonomicPayload {
  study_name: string;
  primary_risk_factors: string[];
  design_interventions: string[];
  preserve_geometries?: string[];
  spatial_constraints?: string[];
  force_load_newtons: number;
  task_frequency_per_hour?: number;
  daily_exposure_hours?: number;
  material_options?: string[];
  safety_factor: number;
  applicable_standards?: string[];
  design_justification: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

// Anthropic content-block shapes we care about on the client.
export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: ErgonomicPayload;
}

export type ContentBlock = TextBlock | ToolUseBlock | { type: string; [k: string]: unknown };

export interface AnalyzeResponse {
  content: ContentBlock[];
  stop_reason: string;
}

// Anthropic message format sent to the backend.
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}
