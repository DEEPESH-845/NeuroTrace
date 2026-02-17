import React, { useEffect, useState } from 'react';
import { mockDataService, type Patient } from '../../services/MockDataService';
import { User, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockDataService.getPatients().then(data => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading patients...</div>;
  }

  const getStatusColor = (status: Patient['status']) => {
    switch (status) {
      case 'stable': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Patient['status']) => {
    switch (status) {
      case 'stable': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Patients</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Monitor recovery progress and status.</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {patients.map((patient) => (
          <li key={patient.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
            <Link to={`/patients/${patient.id}`} className="block focus:outline-none">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                     <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                     </div>
                     <div className="ml-4">
                        <div className="text-sm font-medium text-primary truncate">{patient.name}</div>
                        <div className="flex items-center text-sm text-gray-500">
                           {patient.condition}
                        </div>
                     </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${getStatusColor(patient.status)}`}>
                      {getStatusIcon(patient.status)}
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                     <p className="flex items-center text-sm text-gray-500">
                        Age: {patient.age}
                     </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <Activity className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    <p>
                      Last Assessment: <time dateTime={patient.lastAssessment}>{new Date(patient.lastAssessment).toLocaleDateString()}</time>
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatientList;
