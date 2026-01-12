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
}
export interface ScheduleRow {
    order_no: string;
    product_id: string;      // ★ここを追加：紐付けに必須です
    quantity: number;
    part_id: string;
    part_name: string;
    process_category: string;
    process_id: string;
    part_quantity: number;
    作業者: string;
    合計数: number;
    進捗: '計画' | '実績';
    dailyProgress: DailyProgress[];
}
// 以下のインターフェースは変更なし
export interface PartWithProcesses extends Part {
    processes: ProcessTemplate[];
    totalStandardTime: number;
    totalCost: number;
}
export interface ProcessTimer {
    elapsedSeconds: number;
    isRunning: boolean;
    startTime?: number;
    status: 'not_started' | 'in_progress' | 'working' | 'completed';
}
export interface WorkLog {
    [partId: string]: {
        completedWorkCount: number;
        currentProcessIndex: number;
        processTimers: { [processIndex: number]: ProcessTimer };
        history?: { unit_no: number; timers: { [processIndex: number]: ProcessTimer } }[];
    };
}
export interface JoinedWorkData {
    order_no: string;
    product_id: string;
    product_name: string;
    product_quantity: number;
    part_id: string;
    part_name: string;
    part_quantity: number;
    process_category: string;
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