// Tool-calling schema. Claude is instructed to call this for every analysis so the
// frontend can render a structured engineering payload alongside the conversation.
export const ergoTool = {
  name: "generate_ergonomic_payload",
  description:
    "Generates a structured engineering payload from an ergonomic problem. Call this for every analysis, in addition to responding conversationally.",
  input_schema: {
    type: "object",
    properties: {
      study_name: { type: "string" },
      primary_risk_factors: { type: "array", items: { type: "string" } },
      design_interventions: { type: "array", items: { type: "string" } },
      preserve_geometries: {
        type: "array",
        items: { type: "string" },
        description:
          "Human contact surfaces that must maintain exact shape for user comfort or safety (grip zones, seat pans, pad surfaces, etc.)",
      },
      spatial_constraints: {
        type: "array",
        items: { type: "string" },
        description:
          "Existing infrastructure or workspace features any intervention must accommodate without disturbing (cart heights, aisle widths, existing equipment footprints, etc.)",
      },
      force_load_newtons: { type: "number" },
      task_frequency_per_hour: {
        type: "number",
        description:
          "Estimated number of times this task is performed per hour. Drives fatigue/cumulative exposure reasoning.",
      },
      daily_exposure_hours: {
        type: "number",
        description:
          "Estimated hours per shift the worker performs this task. Drives sustained-load reasoning.",
      },
      material_options: { type: "array", items: { type: "string" } },
      safety_factor: { type: "number" },
      applicable_standards: { type: "array", items: { type: "string" } },
      design_justification: { type: "string" },
    },
    required: [
      "study_name",
      "primary_risk_factors",
      "design_interventions",
      "force_load_newtons",
      "safety_factor",
      "design_justification",
    ],
  },
};
