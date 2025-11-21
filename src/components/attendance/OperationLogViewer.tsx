'use client';

import { Activity, Monitor, MapPin, Edit, Trash2, LogIn, LogOut, Clock } from 'lucide-react';

interface OperationLog {
  id: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  reason: string | null;
}

interface OperationLogViewerProps {
  logs: OperationLog[];
}

export function OperationLogViewer({ logs }: OperationLogViewerProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CHECK_IN':
      case 'WORK':
        return <LogIn className="w-4 h-4" />;
      case 'CHECK_OUT':
      case 'END':
        return <LogOut className="w-4 h-4" />;
      case 'EDIT_TIME':
        return <Edit className="w-4 h-4" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4" />;
      case 'BREAK_START':
      case 'REST':
        return <Clock className="w-4 h-4" />;
      case 'BREAK_END':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CHECK_IN':
      case 'WORK':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'CHECK_OUT':
      case 'END':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'EDIT_TIME':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'DELETE':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'BREAK_START':
      case 'BREAK_END':
      case 'REST':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCEL_CHECKOUT':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CHECK_IN: 'Check In',
      CHECK_OUT: 'Check Out',
      EDIT_TIME: 'Edit Time',
      DELETE: 'Delete',
      BREAK_START: 'Break Start',
      BREAK_END: 'Break End',
      CANCEL_CHECKOUT: 'Cancel Checkout',
      WORK: 'Work Start',
      REST: 'Break Start',
      END: 'Work End',
    };
    return labels[action] || action;
  };

  const getBrowserName = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const getDeviceType = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'PC';
  };

  const renderValueChange = (oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) => {
    if (!oldValue && !newValue) return null;

    return (
      <div className="mt-2 space-y-1">
        {oldValue && (
          <div className="text-xs">
            <span className="text-gray-500">Before: </span>
            <code className="bg-red-50 text-red-700 px-2 py-0.5 rounded">
              {JSON.stringify(oldValue)}
            </code>
          </div>
        )}
        {newValue && (
          <div className="text-xs">
            <span className="text-gray-500">After: </span>
            <code className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
              {JSON.stringify(newValue)}
            </code>
          </div>
        )}
      </div>
    );
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No operation logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Operation History
        </h3>
        <span className="text-xs text-gray-500">Total: {logs.length}</span>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded border ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    {getActionLabel(log.action)}
                  </h4>
                  <p className="text-xs text-gray-600">{formatTime(log.timestamp)}</p>
                </div>
              </div>
            </div>

            {/* Device and location info */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {log.ipAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{log.ipAddress}</span>
                </div>
              )}
              {log.userAgent && (
                <div className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  <span>
                    {getBrowserName(log.userAgent)} / {getDeviceType(log.userAgent)}
                  </span>
                </div>
              )}
            </div>

            {/* Value changes */}
            {(log.oldValue || log.newValue) && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                {renderValueChange(log.oldValue, log.newValue)}
              </div>
            )}

            {/* Reason */}
            {log.reason && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <span className="font-medium text-gray-700">Reason: </span>
                <span className="text-gray-600">{log.reason}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
