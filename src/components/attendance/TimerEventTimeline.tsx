'use client';

import { Clock, Play, Pause, Square, MessageSquare } from 'lucide-react';

interface TimerEvent {
  id: string;
  eventType: string;
  timestamp: string;
  durationFromPrevious: number | null;
  endTimestamp: string | null;
  memo: string | null;
  notes: string | null;
}

interface TimerEventTimelineProps {
  events: TimerEvent[];
  workStats?: {
    totalWorkMinutes: number;
    totalRestMinutes: number;
    totalWorkHours: string;
    totalRestHours: string;
    workPeriods: number;
    restPeriods: number;
  };
}

export function TimerEventTimeline({ events, workStats }: TimerEventTimelineProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'WORK':
        return <Play className="w-5 h-5" />;
      case 'REST':
        return <Pause className="w-5 h-5" />;
      case 'END':
        return <Square className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'WORK':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'REST':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'END':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'WORK':
        return '勤務開始';
      case 'REST':
        return '休憩開始';
      case 'END':
        return '業務終了';
      default:
        return eventType;
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>タイマーイベントがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {workStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">勤務時間サマリー</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">総労働時間</p>
              <p className="text-lg font-bold text-blue-700">{workStats.totalWorkHours}h</p>
              <p className="text-xs text-gray-500">{workStats.totalWorkMinutes}分</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">総休憩時間</p>
              <p className="text-lg font-bold text-yellow-700">{workStats.totalRestHours}h</p>
              <p className="text-xs text-gray-500">{workStats.totalRestMinutes}分</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">勤務回数</p>
              <p className="text-lg font-bold text-green-700">{workStats.workPeriods}回</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">休憩回数</p>
              <p className="text-lg font-bold text-orange-700">{workStats.restPeriods}回</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="relative pl-14">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-2 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getEventColor(event.eventType)}`}>
                {getEventIcon(event.eventType)}
              </div>

              {/* Event card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{getEventLabel(event.eventType)}</h4>
                      <p className="text-sm text-gray-600">{formatTime(event.timestamp)}</p>
                    </div>
                    {event.durationFromPrevious !== null && event.durationFromPrevious > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">前のイベントから</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDuration(event.durationFromPrevious)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* End timestamp for WORK events */}
                  {event.eventType === 'WORK' && event.endTimestamp && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600">
                        終了: {formatTime(event.endTimestamp)}
                      </p>
                      <p className="text-xs text-gray-500">
                        稼働時間: {formatDuration(Number(event.endTimestamp) - Number(event.timestamp))}
                      </p>
                    </div>
                  )}

                  {/* Memo */}
                  {event.memo && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 mb-1">メモ</p>
                          <p className="text-sm text-gray-700">{event.memo}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* System notes */}
                  {event.notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">{event.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        全{events.length}件のイベント
      </div>
    </div>
  );
}
