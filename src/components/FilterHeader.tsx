import React, { useRef } from 'react';
import type { Product, PartWithProcesses, LoadedCSVFiles } from '../types';

interface FilterHeaderProps {
    products: Product[];
    parts: PartWithProcesses[];
    selectedProductId: string;
    selectedPartId: string;
    onProductChange: (id: string) => void;
    onPartChange: (id: string) => void;
    loadedCSVFiles: LoadedCSVFiles | null;
    onImportCSV: (fileContents: { [key: string]: string }) => void; // 型を変更
    onExportLog: () => void;
    isServerConnected: boolean;
    lastImportTime: string | null;
}

export const FilterHeader: React.FC<FilterHeaderProps> = ({
    products, parts, selectedProductId, selectedPartId, onProductChange, onPartChange,
    onImportCSV, onExportLog, lastImportTime
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ボタンが押されたら隠しインプットをクリック
    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    // ファイルが選択されたら内容を読み込んでAppへ渡す
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const contents: { [key: string]: string } = {};
        const readers = Array.from(files).map(file => {
            return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    contents[file.name] = event.target?.result as string;
                    resolve();
                };
                reader.readAsText(file);
            });
        });

        await Promise.all(readers);
        onImportCSV(contents);

        // 入力をリセット（同じファイルを再度選べるように）
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <nav className="bg-slate-900 text-white p-4 shadow-2xl sticky top-0 z-50">
            <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-tighter mb-1">Select Product</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => onProductChange(e.target.value)}
                            className="bg-slate-800 border-l-4 border-blue-500 rounded px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mb-1">Select Part</label>
                        <select
                            value={selectedPartId}
                            onChange={(e) => onPartChange(e.target.value)}
                            className="bg-slate-800 border-l-4 border-emerald-500 rounded px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            {parts.filter(p => p.product_id === selectedProductId).map(p => <option key={p.part_id} value={p.part_id}>{p.part_name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                        <div className="text-[9px] font-black text-slate-500 uppercase">Update Status</div>
                        <div className="text-[11px] font-bold text-slate-300">{lastImportTime || '---'}</div>
                    </div>

                    {/* 隠しファイル入力 */}
                    <input
                        type="file"
                        multiple
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        onClick={handleButtonClick}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 uppercase"
                    >
                        <span className="text-lg">📥</span> CSVインポート
                    </button>

                    <button
                        onClick={onExportLog}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 uppercase"
                    >
                        <span className="text-lg">📝</span> 日報出力
                    </button>
                </div>
            </div>
        </nav>
    );
};