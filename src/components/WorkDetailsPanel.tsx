import { PlayCircle, PauseCircle, CheckCircle2, Circle, Clock, Undo2, AlertTriangle } from 'lucide-react';
import { formatElapsedTime } from '../utils/timerUtils';
import type { Product, PartWithProcesses, ProcessTemplate, ProcessTimer, JoinedWorkData } from '../types';

interface WorkDetailsPanelProps {
    product: Product | null;
    part: PartWithProcesses | null;
    joinedData?: JoinedWorkData | null;  // ★ Step 2: Single source of truth for processes
    currentProcessIndex: number;
    totalWorkCount: number;
    completedWorkCount: number;
    elapsedSeconds: number;
    isTimerRunning: boolean;
    processTimers: { [processIndex: number]: ProcessTimer };
    isAllWorkComplete?: boolean;
    isWorkLimitReached?: boolean;
    completionStats?: { onTimeCount: number; delayedCount: number };
    onStartWork: () => void;
    onPauseWork: () => void;
    onCompleteProcess: () => void;
    onUndo?: () => void;
}

export function WorkDetailsPanel({
    product,
    part,
    joinedData,
    currentProcessIndex,
    totalWorkCount,
    completedWorkCount,
    elapsedSeconds,
    isTimerRunning,
    processTimers,
    isAllWorkComplete = false,
    isWorkLimitReached = false,
    completionStats,
    onStartWork,
    onPauseWork,
    onCompleteProcess,
    onUndo,
}: WorkDetailsPanelProps) {
    if (!product || !part) {
        return (
            <div className="card">
                <div className="text-center text-gray-500 py-12">
                    <p className="text-lg">製品と部品を選択してください</p>
                </div>
            </div>
        );
    }

    // ★ Step 2: Use JoinedWorkData processes as single source of truth
    // If joinedData exists, use it; otherwise fall back to part.processes
    const processes = joinedData?.processes || part.processes || [];
    const partName = joinedData?.part_name || part.part_name;
    const processCategory = joinedData?.process_category || part.process_category;

    // Helper functions for timer display
    const getTimerColorClass = (elapsed: number, standardMinutes: number) => {
        const standardSeconds = standardMinutes * 60;
        const percentage = standardSeconds > 0 ? (elapsed / standardSeconds) * 100 : 0;

        if (percentage >= 100) return 'text-red-600 font-bold';
        if (percentage >= 80) return 'text-yellow-600 font-bold';
        return 'text-blue-600';
    };

    const getDelayMessage = (elapsed: number, standardMinutes: number) => {
        const standardSeconds = standardMinutes * 60;
        if (elapsed <= standardSeconds) return null;

        const delayMinutes = Math.ceil((elapsed - standardSeconds) / 60);
        return `+${delayMinutes}分遅れ`;
    };

    const renderProcessStatus = (process: ProcessTemplate, index: number) => {
        const timer = processTimers[index];
        const status = timer?.status || 'not_started';

        let statusIcon;
        let statusColor;
        let statusBadge;

        if (status === 'completed') {
            statusIcon = <CheckCircle2 className="text-green-500" size={20} />;
            statusColor = 'bg-green-50 border-green-200';
            statusBadge = (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    作業完了
                </span>
            );
        } else if (status === 'working') {
            statusIcon = <Clock className="text-blue-500 animate-pulse" size={20} />;
            statusColor = 'bg-blue-50 border-blue-200';
            statusBadge = (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    ● 作業中
                </span>
            );
        } else if (status === 'in_progress') {
            statusIcon = <PauseCircle className="text-orange-500" size={20} />;
            statusColor = 'bg-orange-50 border-orange-200';
            statusBadge = (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                    作業途中
                </span>
            );
        } else {
            statusIcon = <Circle className="text-gray-300" size={20} />;
            statusColor = 'bg-gray-50 border-gray-200';
            statusBadge = (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                    作業未
                </span>
            );
        }

        return (
            <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${statusColor} transition-all`}
            >
                {statusIcon}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">
                            [{process.process_name}]
                        </span>
                        <span className="text-sm text-gray-600">
                            {process.standard_time_min}min
                        </span>
                        {process.is_outsource && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                外注
                            </span>
                        )}
                        {statusBadge}
                    </div>
                    {status === 'working' && (
                        <div className="mt-1 flex items-center gap-2">
                            <span className={`text-lg font-mono font-bold ${getTimerColorClass(elapsedSeconds, process.standard_time_min)}`}>
                                {formatElapsedTime(elapsedSeconds)}
                            </span>
                            {getDelayMessage(elapsedSeconds, process.standard_time_min) && (
                                <span className="text-sm font-bold text-red-600">
                                    {getDelayMessage(elapsedSeconds, process.standard_time_min)}
                                </span>
                            )}
                        </div>
                    )}
                    {status === 'in_progress' && timer && timer.elapsedSeconds > 0 && (
                        <div className="mt-1">
                            <span className="text-sm text-orange-600 font-mono">
                                積算: {formatElapsedTime(timer.elapsedSeconds)}
                            </span>
                        </div>
                    )}
                    {status === 'completed' && timer && timer.elapsedSeconds > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm text-green-600 font-mono">
                                実績: {formatElapsedTime(timer.elapsedSeconds)}
                            </span>
                            {timer.completionStatus && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${timer.completionStatus === 'on_time'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {timer.completionStatus === 'on_time' ? '予定通り' : '遅延'}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ★ 修正1: 作業上限到達時のUI表示
    const buttonsDisabled = isAllWorkComplete || isWorkLimitReached;

    return (
        <div className={`card ${isWorkLimitReached ? 'opacity-75' : ''}`}>
            {/* Work Count Display */}
            <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-center justify-center gap-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-8 py-4 rounded-xl border-2 border-blue-300 shadow-md">
                        <div className="text-sm text-blue-700 font-bold mb-1">全部品作業数</div>
                        <div className="text-4xl font-black text-blue-900">
                            {totalWorkCount}
                        </div>
                    </div>
                    <div className={`bg-gradient-to-br ${isWorkLimitReached ? 'from-red-50 to-red-100 border-red-300' : 'from-green-50 to-green-100 border-green-300'} px-8 py-4 rounded-xl border-2 shadow-md`}>
                        <div className={`text-sm font-bold mb-1 ${isWorkLimitReached ? 'text-red-700' : 'text-green-700'}`}>
                            {isWorkLimitReached ? '⚠️ 上限到達' : '作業済数'}
                        </div>
                        <div className={`text-4xl font-black ${isWorkLimitReached ? 'text-red-900' : 'text-green-900'}`}>
                            {completedWorkCount}
                        </div>
                        {completionStats && (completionStats.onTimeCount > 0 || completionStats.delayedCount > 0) && (
                            <div className={`mt-2 text-sm font-semibold border-t pt-2 ${isWorkLimitReached ? 'text-red-700 border-red-300' : 'text-green-700 border-green-300'}`}>
                                <div className="flex justify-between">
                                    <span>予定通り:</span>
                                    <span className="text-blue-700">{completionStats.onTimeCount}個</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>遅延:</span>
                                    <span className="text-red-700">{completionStats.delayedCount}個</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Process Flow */}
            <div className="mb-6">
                <div className="card-header mb-4">全体フロー</div>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <span className="font-medium">└─ {partName}</span>
                        <span className="text-gray-400">({processCategory})</span>
                    </div>
                    {processes.map((process, index) => {
                        // Filter out zero-time processes (outsourced/external) from display
                        if (process.standard_time_min === 0) return null;
                        return renderProcessStatus(process, index);
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            {isAllWorkComplete && (
                <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 rounded-xl text-center">
                    <div className="text-2xl font-black text-green-700">✨ 全部品 完了 ✨</div>
                    <div className="text-sm text-green-600 mt-1">お疲れ様でした！</div>
                </div>
            )}

            {/* ★ 修正1: 作業上限到達時の警告表示 */}
            {isWorkLimitReached && !isAllWorkComplete && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-xl font-black text-red-700">
                        <AlertTriangle size={24} />
                        作業上限に到達しました
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                        これ以上の作業は記録できません（{completedWorkCount}/{totalWorkCount}）
                    </div>
                </div>
            )}

            <div className={`flex items-center justify-center gap-4 pt-6 border-t border-gray-200 ${buttonsDisabled ? 'opacity-50' : ''}`}>
                {onUndo && (
                    <button
                        onClick={onUndo}
                        disabled={currentProcessIndex === 0 && Object.keys(processTimers).length === 0}
                        className="flex items-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="前の工程に戻る"
                    >
                        <Undo2 size={20} />
                        <span className="text-base">戻る</span>
                    </button>
                )}
                <button
                    onClick={onStartWork}
                    disabled={isTimerRunning || buttonsDisabled}
                    className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    <PlayCircle size={24} />
                    <span className="text-lg">作業開始</span>
                </button>
                <button
                    onClick={onPauseWork}
                    disabled={!isTimerRunning || buttonsDisabled}
                    className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    <PauseCircle size={24} />
                    <span className="text-lg">一時中断</span>
                </button>
                <button
                    onClick={onCompleteProcess}
                    disabled={isTimerRunning || buttonsDisabled}
                    className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    <CheckCircle2 size={24} />
                    <span className="text-lg">工程完了</span>
                </button>
            </div>
        </div>
    );
}