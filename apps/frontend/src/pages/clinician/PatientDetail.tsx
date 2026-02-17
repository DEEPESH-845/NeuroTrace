import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockDataService, type Patient } from '../../services/MockDataService';
import { ArrowLeft, Activity, User, Calendar, AlertTriangle } from 'lucide-react';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      mockDataService.getPatient(id).then(data => {
        setPatient(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading patient details...</div>;
  if (!patient) return <div className="p-8 text-center text-red-500">Patient not found</div>;

  // Mock data for chart
  const dataPoints = [65, 59, 80, 81, 56, 55, 40];
  const max = Math.max(...dataPoints);
  const points = dataPoints.map((d, i) => `${i * 100},${100 - (d / max) * 100}`).join(' ');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <span className={`px-2 py-1 text-sm font-semibold rounded-full ${
            patient.status === 'stable' ? 'bg-green-100 text-green-800' :
            patient.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {patient.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info Card */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
             <div className="flex items-center space-x-3 text-gray-700">
               <User className="h-5 w-5" />
               <span className="font-medium">Age:</span>
               <span>{patient.age}</span>
             </div>
             <div className="flex items-center space-x-3 text-gray-700">
               <Activity className="h-5 w-5" />
               <span className="font-medium">Condition:</span>
               <span>{patient.condition}</span>
             </div>
             <div className="flex items-center space-x-3 text-gray-700">
               <Calendar className="h-5 w-5" />
               <span className="font-medium">Last Assessment:</span>
               <span>{new Date(patient.lastAssessment).toLocaleString()}</span>
             </div>
          </div>

          {/* Recovery Trend Chart (Mock) */}
          <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Recovery Trend (Last 7 Days)</h3>
            <div className="h-48 w-full">
               <svg viewBox="0 0 600 100" className="w-full h-full overflow-visible">
                 {/* Grid lines */}
                 <line x1="0" y1="0" x2="600" y2="0" stroke="#e5e7eb" strokeWidth="1" />
                 <line x1="0" y1="50" x2="600" y2="50" stroke="#e5e7eb" strokeWidth="1" />
                 <line x1="0" y1="100" x2="600" y2="100" stroke="#e5e7eb" strokeWidth="1" />
                 
                 {/* Trend line */}
                 <polyline 
                    fill="none" 
                    stroke={patient.status === 'critical' ? '#EF4444' : '#10B981'} 
                    strokeWidth="3" 
                    points={points} 
                 />
                 
                 {/* Points */}
                 {dataPoints.map((d, i) => (
                   <circle 
                     key={i} 
                     cx={i * 100} 
                     cy={100 - (d / max) * 100} 
                     r="4" 
                     fill="#1E3A8A" 
                   />
                 ))}
               </svg>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">Assessment Scores</p>
          </div>
        </div>

         {/* Alerts Specific to Patient */}
         {(patient.status === 'critical' || patient.status === 'warning') && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    Recent critical deviation detected in facial symmetry. Immediate review recommended.
                  </p>
                </div>
              </div>
            </div>
         )}

      </div>
    </div>
  );
};

export default PatientDetail;
