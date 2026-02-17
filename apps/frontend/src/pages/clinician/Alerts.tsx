import React, { useEffect, useState } from 'react';
import { mockDataService, type Alert } from '../../services/MockDataService';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockDataService.getAlerts().then(data => {
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading alerts...</div>;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Alerts</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Critical deviations and missed assessments.</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {alerts.map((alert) => (
          <li key={alert.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {alert.severity === 'critical' ? (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                ) : alert.severity === 'high' ? (
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {alert.patientName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {alert.message}
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-400">
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  <span className="mx-2">•</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <button className="text-sm text-primary hover:text-blue-800 font-medium">
                  Review
                </button>
              </div>
            </div>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="p-8 text-center text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            No active alerts. Good job!
          </li>
        )}
      </ul>
    </div>
  );
};

export default Alerts;
