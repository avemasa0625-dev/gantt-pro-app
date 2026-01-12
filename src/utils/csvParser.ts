import type { Product, Part, ProcessTemplate, ScheduleRow, DailyProgress } from '../types';

export const loadCSV = async (filename: string): Promise<string> => {
    try {
        const response = await fetch(`${filename}?t=${Date.now()}`);
        if (!response.ok) {
            const apiRes = await fetch(`http://localhost:8000/static/${filename}?t=${Date.now()}`);
            if (!apiRes.ok) return "";
            return await apiRes.text();
        }
        return await response.text();
    } catch (err) {
        console.error("CSV Load Error:", err);
        return "";
    }
};

export const parseOverallScheduleCSV = (csv: string): ScheduleRow[] => {
    if (!csv || csv.trim() === "") return [];
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const result: ScheduleRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols.length < 12) continue;

        const row: ScheduleRow = {
            order_no: cols[0],
            product_id: cols[1],
            product_name: cols[2],
            product_quantity: Number(cols[3]) || 0,
            part_id: cols[4],
            part_name: cols[5],
            process_category: cols[6],
            part_quantity: Number(cols[7]) || 0,
            process_id: cols[8],
            作業者: cols[9],
            合計数: Number(cols[10]) || 0,
            進捗: cols[11].includes('実績') ? '実績' : '計画',
            dailyProgress: []
        };

        for (let j = 12; j < headers.length; j++) {
            if (!headers[j]) continue;
            const val = cols[j] || "";
            const num = val === "" ? 0 : Number(val.replace('%', ''));
            const match = headers[j].match(/(\d+)月(\d+)日/);
            let dayNum = j;
            if (match) dayNum = parseInt(match[2], 10);

            const progress: DailyProgress = {
                day: dayNum,
                type: row.進捗 === '計画' ? 'planned' : 'actual',
                value: isNaN(num) ? 0 : num,
                dateLabel: headers[j]
            };
            row.dailyProgress.push(progress);
        }
        result.push(row);
    }
    return result;
};

export const parseProductCSV = (csv: string): Product[] => {
    if (!csv || csv.trim() === "") return [];
    return csv.split(/\r?\n/).filter(l => l.trim() !== "").slice(1).map(line => {
        const c = line.split(",").map(s => s.trim());
        return { product_id: c[0], product_name: c[1], order_no: c[2], quantity: Number(c[3]) || 0 };
    });
};

export const parsePartsCSV = (csv: string): Part[] => {
    if (!csv || csv.trim() === "") return [];
    return csv.split(/\r?\n/).filter(l => l.trim() !== "").slice(1).map(line => {
        const c = line.split(",").map(s => s.trim());
        return { part_id: c[0], product_id: c[1], part_name: c[2], process_category: c[3], process_id: c[4], quantity: Number(c[5]) || 0 };
    });
};

export const parseProcessTemplatesCSV = (csv: string): ProcessTemplate[] => {
    if (!csv || csv.trim() === "") return [];
    return csv.split(/\r?\n/).filter(l => l.trim() !== "").slice(1).map(line => {
        const c = line.split(",").map(s => s.trim());
        return { process_category: c[0], process_order: Number(c[1]) || 0, process_name: c[2], standard_time_min: Number(c[3]) || 0, standard_cost_yen: Number(c[4]) || 0, is_outsource: c[5]?.toUpperCase() === 'TRUE' };
    });
};