export type ConditionId = "jira-cli" | "jira-axi";
export type TaskCategory = "single_step" | "multi_step";
export type GradingMode = "llm-graded" | "heuristic-graded";

export interface GradingSpec {
  grading_hint: string;
}

export interface TaskDef {
  id: string;
  category: TaskCategory;
  prompt: string;
  grading: GradingSpec;
  mutates?: boolean;
}

export interface ConditionDef {
  id: ConditionId;
  name: string;
  tool: string;
  agents_md: string;
}

export interface RunSpec {
  condition: ConditionId;
  task: string;
  run: number;
  model: string;
}

export interface UsageMetrics {
  input_tokens: number;
  input_tokens_cached: number;
  input_tokens_uncached: number;
  output_tokens: number;
  cost_proxy_usd: number;
  wall_clock_seconds: number;
  turn_count: number;
  command_count: number;
  error_count: number;
  command_log: string[];
}

export interface GradeResult {
  task_success: boolean;
  details: string;
  grading_mode: GradingMode;
  judge_model?: string;
}

export interface RunResult {
  condition: ConditionId;
  task: string;
  run: number;
  model: string;
  timestamp: string;
  usage: UsageMetrics;
  grade: GradeResult;
  agent_output: string;
}
