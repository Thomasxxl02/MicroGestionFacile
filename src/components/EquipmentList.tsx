import { useState } from 'react';
import { FireExtinguisher, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import InterventionForm from './InterventionForm';

const equipment = [
  { id: '1', name: 'Extincteur RDC', type: 'Eau', status: 'OK' },
  { id: '2', name: 'RIA 1er étage', type: 'RIA', status: 'HS' },
];

export default function EquipmentList() {
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Équipements</h2>
      <div className="grid grid-cols-1 gap-4">
        {equipment.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FireExtinguisher className="text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">{item.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${item.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status === 'OK' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {item.status}
                </div>
                <button onClick={() => setSelectedEquipment(item.id)} className="p-2 rounded-full hover:bg-gray-100">
                  <Plus size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            {selectedEquipment === item.id && (
              <div className="mt-4 pt-4 border-t">
                <InterventionForm companyId="comp1" establishmentId="est1" equipmentId={item.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
