import React from 'react';
import type { ScheduleRow, WorkHistory } from '../types';

interface GanttChartProps {
    scheduleData: ScheduleRow[];
    currentDay: number;
    workHistory: WorkHistory[];
    completedWorkCount: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({ scheduleData, currentDay, workHistory, completedWorkCount }) => {
    if (scheduleData.length === 0) return null;

    const allDateLabels = Array.from(
        new Set(scheduleData.flatMap(row => row.dailyProgress.map(p => p.dateLabel)))
    ).sort((a, b) => {
        const parse = (s: string) => {
            const m = s.match(/(\d+)月(\d+)日/);
            return m ? parseInt(m[1]) * 100 + parseInt(m[2]) : 0;
        };
        return parse(a) - parse(b);
    });

    const currentMonth = new Date().getMonth() + 1;

    const getActualCount = (partId: string, dateLabel: string) => {
        const match = dateLabel.match(/(\d+)月(\d+)日/);
        if (!match) return 0;
        const formattedDate = `2026-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        const dailyHist = workHistory.filter(h => h.part_id === partId && h.date === formattedDate);
        return new Set(dailyHist.map(h => h.timestamp)).size;
    };

    return (
        <div className="p-6 bg-white text-slate-900">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold italic uppercase">数量ベース日程管理</h3>
                <div className="flex gap-4 text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-600 rounded-sm shadow-sm"></div> 計画</span>
                    <span className="flex items-center gap-1.5"><div className="w-4 h-4 bg-emerald-500 rounded-sm shadow-sm"></div> 実績（累計: {completedWorkCount}）</span>
                </div>
            </div>
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xl bg-white">
                <table className="w-full text-[11px] border-collapse table-fixed">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="sticky left-0 bg-slate-100 z-30 p-3 text-left border-b border-r border-slate-300 w-[120px]">注文番号</th>
                            <th className="sticky left-[120px] bg-slate-100 z-30 p-3 text-left border-b border-r border-slate-300 w-[160px]">部品名</th>
                            <th className="sticky left-[280px] bg-slate-100 z-30 p-3 text-center border-b border-r border-slate-300 w-[80px] shadow-sm">区分</th>
                            {allDateLabels.map(label => (
                                <th key={label} className={`p-2 border-b border-r border-slate-200 min-w-[38px] text-center font-bold ${label === `${currentMonth}月${currentDay}日` ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                    {label.replace('月', '/').replace('日', '')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="sticky left-0 bg-white z-20 p-3 border-b border-r border-slate-200 font-medium overflow-hidden text-ellipsis">{row.order_no}</td>
                                <td className="sticky left-[120px] bg-white z-20 p-3 border-b border-r border-slate-200 font-bold text-blue-700 overflow-hidden text-ellipsis">{row.part_name}</td>
                                <td className={`sticky left-[280px] z-20 p-3 border-b border-r border-slate-200 text-center font-bold ${row.進捗 === '計画' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.進捗}</td>
                                {allDateLabels.map(label => {
                                    const val = row.進捗 === '計画' ? (row.dailyProgress.find(p => p.dateLabel === label)?.value || 0) : getActualCount(row.part_id, label);
                                    return (
                                        <td key={label} className="border-b border-r border-slate-200 p-1 text-center align-middle h-14">
                                            {val > 0 && <div className={`${row.進捗 === '計画' ? 'bg-blue-600' : 'bg-emerald-500'} text-white p-1 rounded-sm text-[10px] font-black`}>{val}</div>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};