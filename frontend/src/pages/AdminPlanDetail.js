import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function AdminPlanDetail() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingCustomers, setAddingCustomers] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedNew, setSelectedNew] = useState([]);
  const navigate = useNavigate();

  const fetchPlan = () => {
    api.get('/admin/journey-plans').then(r => {
      const found = (r.data.plans || []).find(p => p._id === id);
      setPlan(found || null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlan(); }, [id]);

  const openAddCustomers = async () => {
    const r = await api.get('/customers?status=active');
    setAllCustomers(r.data.customers || r.data);
    setSelectedNew([]);
    setAddingCustomers(true);
  };

  const handleAddCustomers = async () => {
    if (selectedNew.length === 0) return;
    try {
      await api.post('/admin/add-customers-to-plan', {
        journeyPlanId: id,
        customerIds: selectedNew
      });
      setAddingCustomers(false);
      fetchPlan();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add customers');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!plan) return <div className="text-center py-12 text-gray-400">Plan not found</div>;

  const stats = plan.visitStats || { total: 0, completed: 0, pending: 0 };
  const totalSales = (plan.visits || []).reduce((sum, v) => sum + (v.salesOrderAmount || 0), 0);
  const existingCustomerIds = (plan.customers || []).map(c => c._id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/admin')} className="bg-white/20 px-3 py-1.5 rounded-lg text-sm">&larr; Back</button>
        <h1 className="text-lg font-bold">Plan Details</h1>
        <div className="w-16" />
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Plan Info */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-sm text-gray-500">{formatDate(plan.planDate)}</div>
            <div className="font-bold text-gray-700 mt-1">{plan.assignedTo?.name}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            plan.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {plan.status}
          </span>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Stops</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">${totalSales.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Total Sales</div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: stats.total ? `${(stats.completed / stats.total) * 100}%` : 0 }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button onClick={openAddCustomers} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all">
            + Add Customers
          </button>
        </div>

        {/* Customer/Visit Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase px-4 pt-4 pb-2">Customers & Visits</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">#</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Customer Name</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Visit Time</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Status</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Visit Order</th>
                </tr>
              </thead>
              <tbody>
                {(plan.visits || []).length > 0 ? (
                  plan.visits.map((visit, i) => (
                    <tr key={visit._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{visit.customerId?.customerName || `Customer ${i + 1}`}</div>
                        <div className="text-xs text-gray-400">{visit.customerId?.customerCode} {visit.customerId?.location ? `· ${visit.customerId.location}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {visit.visitTime ? new Date(visit.visitTime).toLocaleString() : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          visit.visitStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {visit.visitStatus === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {visit.salesOrderAmount > 0
                          ? <span className="font-bold text-green-700">${visit.salesOrderAmount.toFixed(2)}</span>
                          : <span className="text-gray-300">--</span>
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  (plan.customers || []).map((cust, i) => (
                    <tr key={cust._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{cust.customerName}</div>
                        <div className="text-xs text-gray-400">{cust.customerCode} {cust.location ? `· ${cust.location}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">--</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Not Started</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">--</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(plan.visits || []).length === 0 && (plan.customers || []).length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No customers in this plan</div>
          )}
        </div>
      </div>

      {/* Add Customers Modal */}
      {addingCustomers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setAddingCustomers(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Add Customers</h2>
            <div className="space-y-2 mb-4">
              {allCustomers.filter(c => !existingCustomerIds.includes(c._id)).map(c => (
                <div
                  key={c._id}
                  onClick={() => setSelectedNew(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id])}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${
                    selectedNew.includes(c._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input type="checkbox" checked={selectedNew.includes(c._id)} readOnly className="w-5 h-5 accent-blue-600" />
                  <div>
                    <div className="font-bold text-sm">{c.customerName}</div>
                    <div className="text-xs text-gray-500">{c.customerCode} &bull; {c.location}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddCustomers} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">
                Add ({selectedNew.length})
              </button>
              <button onClick={() => setAddingCustomers(false)} className="flex-1 border-2 border-gray-200 py-3 rounded-xl font-bold text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
