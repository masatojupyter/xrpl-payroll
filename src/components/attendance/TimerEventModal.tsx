'use client';

import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { TimerEventTimeline } from './TimerEventTimeline';

interface TimerEvent {
  id: string;
  eventType: string;
  timestamp: string;
  durationFromPrevious: number | null;
  endTimestamp: string | null;
  memo: string | null;
  notes: string | null;
}

interface WorkStats {
  totalWorkMinutes: number;
  totalRestMinutes: number;
  totalWorkHours: string;
  totalRestHours: string;
  workPeriods: number;
  restPeriods: number;
}

interface TimerEventModalProps {
  attendanceId: string;
  employeeName: string;
  date: string;
  onClose: () => void;
}

export function TimerEventModal({ attendanceId, employeeName, date, onClose }: TimerEventModalProps) {
  const [events, setEvents] = useState<TimerEvent[]>([]);
  const [workStats, setWorkStats] = useState<WorkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimerEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/timer-events?attendanceId=${attendanceId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch timer events');
        }
        
        const data = await response.json();
        setEvents(data.events || []);
        setWorkStats(data.workStats || null);
      } catch (err) {
        console.error('Error fetching timer events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load timer events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimerEvents();
  }, [attendanceId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">タイマーイベント詳細</h2>
            <p className="text-sm text-gray-600 mt-1">
              {employeeName} - {new Date(date).toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">タイマーイベントを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">
                <Clock className="w-12 h-12" />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : (
            <TimerEventTimeline events={events} workStats={workStats || undefined} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
