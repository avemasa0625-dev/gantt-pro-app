export interface Product {
  product_id: string;
  product_name: string;
  order_no: string;
  quantity: number;
}

export interface Part {
  part_id: string;
  product_id: string;
  part_name: string;
  process_category: string;
  process_id: string;
  quantity: number;
}

export interface ProcessTemplate {
  process_category: string;
  process_order: number;
  process_name: string;
  standard_time_min: number;
  standard_cost_yen: number;
  is_outsource: boolean;
}

export interface DailyProgress {
  day: number;
  type: 'planned' | 'actual' | 'percentage';
  value: number;
  dateLabel: string;
}

export interface ScheduleRow {
  order_no: string;
  product_id: string;
  product_name: string;
  product_quantity: number;
  part_id: string;
  part_name: string;
  process_category: string;
  part_quantity: number;
  process_id: string;
  作業者: string;
  合計数: number;
  進捗: '計画' | '実績';
  dailyProgress: DailyProgress[];
}

export interface PartWithProcesses extends Part {
  processes: ProcessTemplate[];
}

export interface ProcessTimer {
  elapsedSeconds: number;
  isRunning: boolean;
  status: 'not_started' | 'in_progress' | 'working' | 'completed';
  completionStatus?: string;
}

export interface WorkHistory {
  timestamp: string;
  date: string;
  order_no: string;
  product_id: string;
  product_name: string;
  part_id: string;
  part_name: string;
  worker_name: string;
  process_name: string;
  standard_time_sec: number;
  actual_time_sec: number;
}

export interface ActiveWorkLogs {
  [partId: string]: {
    completedWorkCount: number;
    currentProcessIndex: number;
    processTimers: { [processIndex: number]: ProcessTimer };
  };
}

export interface WorkLog {
  activeLogs: ActiveWorkLogs;
  history: WorkHistory[];
}

export interface JoinedWorkData extends ScheduleRow {
  processes: ProcessTemplate[];
}

export interface LoadedCSVFiles {
  overall_schedule: string;
  product: string;
  parts: string;
  process_templates: string;
}

export interface ApiResponse {
  overall: any[];
  product: any[];
  parts: any[];
  logs: WorkLog;
}