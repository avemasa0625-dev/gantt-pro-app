import React from 'react';

interface ProgressIndicatorProps {
    productProgress: number;
    processProgress: number; // ★これを使って描画します
    delayCount: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ productProgress, processProgress, delayCount }) => {
    const isAhead = delayCount > 0;
    const isDelayed = delayCount < 0;
    const statusColor = isAhead ? "text-blue-600 bg-blue-50" : (isDelayed ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-100");

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">製品進捗</h4>
                <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-blue-500" strokeDasharray={`${productProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-gray-800">{productProgress}%</div>
                </div>
            </div>

            {/* ★processProgress を使って工程内進捗を表示 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">工程内進捗</h4>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                    <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${processProgress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>0%</span>
                    <span className="text-green-600">{processProgress}% 完了</span>
                    <span>100%</span>
                </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-sm border border-transparent transition-colors duration-500 ${statusColor.split(' ')[1]}`}>
                <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">日程差異</h4>
                <div className="flex items-end gap-2">
                    <span className={`text-5xl font-black ${statusColor.split(' ')[0]}`}>{delayCount > 0 ? `+${delayCount}` : delayCount}</span>
                    <span className={`text-xl font-bold mb-1 ${statusColor.split(' ')[0]}`}>{delayCount > 0 ? "先行" : (delayCount < 0 ? "遅延" : "±0")}</span>
                </div>
            </div>
        </div>
    );
};