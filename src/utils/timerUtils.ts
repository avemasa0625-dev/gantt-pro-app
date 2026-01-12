// import { WorkLog } ... を以下のように修正
import type { WorkLog } from '../types';

/**
 * 経過時間を「分:秒」の形式に変換する
 */
export const formatElapsedTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 作業ログをバックエンド（FastAPI）に保存する
 */
export const saveLogToBackend = async (workLog: WorkLog): Promise<void> => {
    try {
        const response = await fetch('http://localhost:8000/api/save-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workLog),
        });

        if (!response.ok) {
            throw new Error(`Failed to save log: ${response.statusText}`);
        }

        console.log('Work log saved successfully');
    } catch (error) {
        console.error('Error saving log to backend:', error);
    }
};