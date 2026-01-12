import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { FilterHeader } from './components/FilterHeader';
import { WorkDetailsPanel } from './components/WorkDetailsPanel';
import { ProgressIndicator } from './components/ProgressIndicator';
import { GanttChart } from './components/GanttChart';
import { loadCSV, parseProcessTemplatesCSV, parseOverallScheduleCSV, parseProductCSV, parsePartsCSV } from './utils/csvParser';
import { linkPartsToProcesses, createJoinedDataset } from './utils/dataLinker';
import { saveLogToBackend, formatElapsedTime } from './utils/timerUtils';
import type { Product, PartWithProcesses, ScheduleRow, WorkLog, ApiResponse, LoadedCSVFiles, JoinedWorkData, WorkHistory, ActiveWorkLogs, DailyProgress } from './types';
import './index.css';

const FILES = { SCHEDULE: 'overall_schedule.csv', PRODUCT: 'product.csv', PARTS: 'parts.csv', TEMPLATES: 'process_templates.csv' };
const STORAGE_KEY = 'gantt_pro_user_data';
const LOG_STORAGE_KEY = 'gantt_pro_work_log';

const formatToHMS = (seconds: number) => {
  const h = Math.floor(Math.abs(seconds) / 3600);
  const m = Math.floor((Math.abs(seconds) % 3600) / 60);
  const s = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [parts, setParts] = useState<PartWithProcesses[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleRow[]>([]);
  const [joinedData, setJoinedData] = useState<JoinedWorkData[]>([]);
  const [loadedCSVFiles, setLoadedCSVFiles] = useState<LoadedCSVFiles | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [workLog, setWorkLog] = useState<WorkLog>({ activeLogs: {}, history: [] });
  const [errors, setErrors] = useState<string[]>([]);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const todayLabel = useMemo(() => {
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日`;
  }, []);

  const applyCSVData = useCallback((pCSV: string, ptsCSV: string, prcCSV: string, sCSV: string) => {
    const prod = parseProductCSV(pCSV);
    const pts = parsePartsCSV(ptsCSV);
    const tmpl = parseProcessTemplatesCSV(prcCSV);
    const sched = parseOverallScheduleCSV(sCSV);
    const linked = linkPartsToProcesses(pts, tmpl.filter(t => !t.is_outsource));

    setProducts(prod);
    setParts(linked);
    setScheduleData(sched);
    setJoinedData(createJoinedDataset(sched, prod, linked));

    if (prod.length > 0) {
      setSelectedProductId(prod[0].product_id);
      const p = linked.find(x => x.product_id === prod[0].product_id);
      if (p) setSelectedPartId(p.part_id);
    }
    setLoadedCSVFiles({ overall_schedule: FILES.SCHEDULE, product: FILES.PRODUCT, parts: FILES.PARTS, process_templates: FILES.TEMPLATES });
  }, []);

  const init = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrors([]);
      const savedData = localStorage.getItem(STORAGE_KEY);
      const savedLog = localStorage.getItem(LOG_STORAGE_KEY);

      if (savedData) {
        const parsed = JSON.parse(savedData);
        applyCSVData(parsed.product, parsed.parts, parsed.templates, parsed.schedule);
        setLastImportTime("保存済みデータ");
      } else {
        const baseUrl = import.meta.env.BASE_URL;
        const [pCSV, ptsCSV, prcCSV, sCSV] = await Promise.all([
          loadCSV(`${baseUrl}${FILES.PRODUCT}`),
          loadCSV(`${baseUrl}${FILES.PARTS}`),
          loadCSV(`${baseUrl}${FILES.TEMPLATES}`),
          loadCSV(`${baseUrl}${FILES.SCHEDULE}`)
        ]);
        applyCSVData(pCSV, ptsCSV, prcCSV, sCSV);
        setLastImportTime("サンプル表示中");
      }

      if (savedLog) setWorkLog(JSON.parse(savedLog));

      try {
        const res = await fetch('http://localhost:8000/api/data');
        if (res.ok) {
          const serverResponse: ApiResponse = await res.json();
          setIsServerConnected(true);
          if (serverResponse.logs) setWorkLog(serverResponse.logs);
        }
      } catch (e) {
        setIsServerConnected(false);
      }
    } catch (e) {
      setErrors(["データの読み込みに失敗しました。"]);
    } finally {
      setIsLoading(false);
    }
  }, [applyCSVData]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(workLog));
  }, [workLog, isLoading]);

  useEffect(() => { init(); }, [init]);

  const handleLocalImport = async (fileContents: { [key: string]: string }) => {
    try {
      setIsLoading(true);
      const pCSV = fileContents[FILES.PRODUCT];
      const ptsCSV = fileContents[FILES.PARTS];
      const prcCSV = fileContents[FILES.TEMPLATES];
      const sCSV = fileContents[FILES.SCHEDULE];
      if (!pCSV || !ptsCSV || !prcCSV || !sCSV) throw new Error("4つのCSVをすべて選択してください。");
      applyCSVData(pCSV, ptsCSV, prcCSV, sCSV);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ product: pCSV, parts: ptsCSV, templates: prcCSV, schedule: sCSV }));
      setLastImportTime(`更新完了: ${new Date().toLocaleTimeString()}`);
      setErrors([]);
    } catch (e: any) {
      setErrors([e.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setWorkLog(prev => {
        const nextActive: ActiveWorkLogs = { ...prev.activeLogs };
        let changed = false;
        Object.keys(nextActive).forEach(id => {
          const entry = nextActive[id];
          const t = entry.processTimers[entry.currentProcessIndex];
          if (t?.isRunning) {
            nextActive[id] = { ...entry, processTimers: { ...entry.processTimers, [entry.currentProcessIndex]: { ...t, elapsedSeconds: (t.elapsedSeconds || 0) + 1 } } };
            changed = true;
          }
        });
        return changed ? { ...prev, activeLogs: nextActive } : prev;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentActive = workLog.activeLogs[selectedPartId] || { completedWorkCount: 0, currentProcessIndex: 0, processTimers: {} };
  const totalActualCount = currentActive.completedWorkCount || 0;

  const totalPlannedCount = useMemo(() => {
    const row = scheduleData.find(r => r.part_id === selectedPartId && r.進捗 === '計画');
    return row ? row.合計数 : 0;
  }, [scheduleData, selectedPartId]);

  const cumulativePlannedUpToToday = useMemo(() => {
    const row = scheduleData.find(r => r.part_id === selectedPartId && r.進捗 === '計画');
    if (!row) return 0;
    const n = new Date();
    const curM = n.getMonth() + 1;
    const curD = n.getDate();
    return row.dailyProgress.reduce((sum: number, p: DailyProgress) => {
      const match = p.dateLabel.match(/(\d+)月(\d+)日/);
      if (match) {
        const m = parseInt(match[1], 10);
        const d = parseInt(match[2], 10);
        if (m < curM || (m === curM && d <= curD)) return sum + (p.value || 0);
      }
      return sum;
    }, 0);
  }, [scheduleData, selectedPartId]);

  const handleStartWork = useCallback(() => {
    const nextActive = { ...workLog.activeLogs };
    const entry = { ...currentActive, processTimers: { ...currentActive.processTimers } };
    entry.processTimers[entry.currentProcessIndex] = { ...(entry.processTimers[entry.currentProcessIndex] || { elapsedSeconds: 0 }), isRunning: true, status: 'working' };
    nextActive[selectedPartId] = entry;
    const next = { ...workLog, activeLogs: nextActive };
    setWorkLog(next);
    saveLogToBackend(next);
  }, [selectedPartId, currentActive, workLog]);

  const handlePauseWork = useCallback(() => {
    const nextActive = { ...workLog.activeLogs };
    const entry = { ...currentActive, processTimers: { ...currentActive.processTimers } };
    if (entry.processTimers[entry.currentProcessIndex]) entry.processTimers[entry.currentProcessIndex].isRunning = false;
    nextActive[selectedPartId] = entry;
    const next = { ...workLog, activeLogs: nextActive };
    setWorkLog(next);
    saveLogToBackend(next);
  }, [selectedPartId, currentActive, workLog]);

  const handleCompleteProcess = useCallback(() => {
    const joined = joinedData.find(j => j.part_id === selectedPartId);
    if (!joined) return;
    const idx = currentActive.currentProcessIndex;
    const isLast = idx >= (joined.processes.length - 1);
    const nextActive = { ...workLog.activeLogs };
    const entry = { ...currentActive, processTimers: { ...currentActive.processTimers } };
    entry.processTimers[idx] = { ...(entry.processTimers[idx] || { elapsedSeconds: 0 }), isRunning: false, status: 'completed' };

    if (isLast) {
      const totalSec = Object.values(entry.processTimers).reduce((s, t) => s + (t.elapsedSeconds || 0), 0);
      if (confirm(`一個完了（合計作業時間: ${formatElapsedTime(totalSec)}）実績を記録しますか？`)) {
        const ts = new Date().toISOString();
        const sched = scheduleData.find(s => s.part_id === selectedPartId && s.進捗 === '計画');
        const newHistories: WorkHistory[] = joined.processes.map((proc, i) => ({
          timestamp: ts, date: ts.slice(0, 10),
          order_no: sched?.order_no || "-", product_id: sched?.product_id || "-", product_name: sched?.product_name || "-",
          part_id: selectedPartId, part_name: joined.part_name, worker_name: sched?.作業者 || "未割当",
          process_name: proc.process_name, standard_time_sec: (proc.standard_time_min || 0) * 60,
          actual_time_sec: entry.processTimers[i]?.elapsedSeconds || 0
        }));
        nextActive[selectedPartId] = { completedWorkCount: totalActualCount + 1, currentProcessIndex: 0, processTimers: {} };
        const next = { history: [...workLog.history, ...newHistories], activeLogs: nextActive };
        setWorkLog(next);
        saveLogToBackend(next);
      }
    } else {
      entry.currentProcessIndex = idx + 1;
      entry.processTimers[idx + 1] = { elapsedSeconds: 0, isRunning: false, status: 'not_started' };
      nextActive[selectedPartId] = entry;
      const next = { ...workLog, activeLogs: nextActive };
      setWorkLog(next);
      saveLogToBackend(next);
    }
  }, [selectedPartId, joinedData, currentActive, workLog, scheduleData, totalActualCount]);

  const handleUndo = useCallback(() => {
    const nextActive = { ...workLog.activeLogs };
    const entry = { ...currentActive, processTimers: { ...currentActive.processTimers } };
    if (entry.processTimers[entry.currentProcessIndex]?.elapsedSeconds > 0) {
      entry.processTimers[entry.currentProcessIndex] = { elapsedSeconds: 0, isRunning: false, status: 'not_started' };
    } else if (entry.currentProcessIndex > 0) {
      entry.currentProcessIndex -= 1;
    }
    nextActive[selectedPartId] = entry;
    setWorkLog(prev => ({ ...prev, activeLogs: nextActive }));
  }, [selectedPartId, currentActive, workLog]);

  const handleExportLog = useCallback(() => {
    // 1. 【数量ベース進捗】セクションの作成
    let csv = "\uFEFF【数量ベース進捗】\n注文番号,製品名,部品名,担当者,計画合計,累計完了,進捗率,日程差異\n";
    scheduleData.filter(s => s.進捗 === '計画').forEach(sched => {
      const act = workLog.activeLogs[sched.part_id]?.completedWorkCount || 0;
      const prog = sched.合計数 > 0 ? Math.round((act / sched.合計数) * 100) : 0;
      const n = new Date();
      const cp = sched.dailyProgress.reduce((sum, p) => {
        const match = p.dateLabel.match(/(\d+)月(\d+)日/);
        if (match && (parseInt(match[1]) < n.getMonth() + 1 || (parseInt(match[1]) === n.getMonth() + 1 && parseInt(match[2]) <= n.getDate()))) return sum + (p.value || 0);
        return sum;
      }, 0);
      csv += [sched.order_no, sched.product_name, sched.part_name, sched.作業者 || "未割当", sched.合計数, act, `${prog}%`, act - cp].join(",") + "\n";
    });

    // 2. 【作業実績ログ】セクションの作成
    csv += "\n【作業実績ログ】\n完了日時,注文番号,製品名,部品名,工程名,担当者,標準時間,実績時間,差異\n";
    
    // ★ここが重要な修正ポイントです★
    workLog.history.forEach(h => {
      // 先ほど追加した formatToHMS 関数を使って、秒数を HH:MM:SS に変換します
      const stdTime = formatToHMS(h.standard_time_sec);
      const actTime = formatToHMS(h.actual_time_sec);
      const diffTime = formatToHMS(h.actual_time_sec - h.standard_time_sec);

      csv += [
        `${h.date} ${h.timestamp.slice(11, 19)}`,
        h.order_no,
        h.product_name,
        h.part_name,
        h.process_name,
        h.worker_name,
        stdTime,  // "00:30:00" のような形式になります
        actTime,  // "00:25:00" のような形式になります
        diffTime
      ].join(",") + "\n";
    });

    // 3. ダウンロード処理
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `製造日報_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }, [workLog, scheduleData]);

  if (isLoading) return <div className="p-20 text-center font-black text-blue-600 bg-slate-50 min-h-screen">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <FilterHeader
        products={products} parts={parts} selectedProductId={selectedProductId} selectedPartId={selectedPartId}
        onProductChange={(id) => { setSelectedProductId(id); const p = parts.find(x => x.product_id === id); if (p) setSelectedPartId(p.part_id); }}
        onPartChange={setSelectedPartId} loadedCSVFiles={loadedCSVFiles} onImportCSV={handleLocalImport} onExportLog={handleExportLog}
        isServerConnected={isServerConnected} lastImportTime={lastImportTime}
      />
      {errors.length > 0 && <div className="m-6 p-4 bg-red-100 text-red-700 rounded-xl font-bold border border-red-200">{errors.join(", ")}</div>}
      <div className="container mx-auto p-6 space-y-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
          <div><h1 className="text-xl font-black italic uppercase">Production Mode</h1><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Operation Live</p></div>
          <div className="text-right text-2xl font-black">{todayLabel}</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <WorkDetailsPanel
              product={products.find(p => p.product_id === selectedProductId) || null}
              part={parts.find(p => p.part_id === selectedPartId) || null}
              joinedData={joinedData.find(j => j.part_id === selectedPartId) || null}
              currentProcessIndex={currentActive.currentProcessIndex}
              totalWorkCount={totalPlannedCount} completedWorkCount={totalActualCount}
              elapsedSeconds={currentActive.processTimers[currentActive.currentProcessIndex]?.elapsedSeconds || 0}
              isTimerRunning={currentActive.processTimers[currentActive.currentProcessIndex]?.isRunning || false}
              processTimers={currentActive.processTimers} onStartWork={handleStartWork} onPauseWork={handlePauseWork}
              onCompleteProcess={handleCompleteProcess} onUndo={handleUndo}
              isAllWorkComplete={totalActualCount >= totalPlannedCount && totalPlannedCount > 0}
            />
          </div>
          <div className="lg:col-span-1">
            <ProgressIndicator
              productProgress={totalPlannedCount > 0 ? Math.round((totalActualCount / totalPlannedCount) * 100) : 0}
              processProgress={joinedData.find(j => j.part_id === selectedPartId) ? Math.round((currentActive.currentProcessIndex / (joinedData.find(j => j.part_id === selectedPartId)?.processes.length || 1)) * 100) : 0}
              delayCount={totalActualCount - cumulativePlannedUpToToday}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto border border-slate-200 custom-scrollbar">
          <div className="min-w-[3800px]">
            <GanttChart scheduleData={selectedPartId ? scheduleData.filter(row => row.part_id === selectedPartId) : []} currentDay={new Date().getDate()} workHistory={workLog.history} completedWorkCount={totalActualCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;