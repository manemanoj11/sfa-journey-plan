import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function MobileCustomerDetail() {
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get('visitId');
  const planId = searchParams.get('planId');

  const [customer, setCustomer] = useState(null);
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/mobile/customer-details/${customerId}`);
        setCustomer(data.customer);

        // Find the specific visit
        if (visitId) {
          const plansRes = await api.get('/mobile/today-journey-plan');
          const plan = plansRes.data.find(p => p._id === planId);
          if (plan) {
            const v = plan.visits.find(v => v._id === visitId);
            if (v) {
              setVisit(v);
              setNotes(v.visitNotes || '');
              setOrderAmount(v.salesOrderAmount ? String(v.salesOrderAmount) : '');
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId, visitId, planId]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCompleteVisit = async () => {
    if (!visitId) return;
    setSaving(true);
    try {
      const { data } = await api.post('/mobile/complete-visit', { visitId });
      setVisit(data.visit);
      showSuccess('Visit marked as completed!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete visit');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNotes = async () => {
    if (!visitId) return;
    setSaving(true);
    try {
      const { data } = await api.post('/mobile/add-visit-notes', { visitId, visitNotes: notes });
      setVisit(data.visit);
      showSuccess('Notes saved!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordOrder = async () => {
    if (!visitId || !orderAmount) return;
    setSaving(true);
    try {
      const { data } = await api.post('/mobile/record-order', {
        visitId,
        salesOrderAmount: parseFloat(orderAmount)
      });
      setVisit(data.visit);
      showSuccess('Order recorded!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!customer) return <div className="text-center py-12 text-gray-400">Customer not found</div>;

  const isCompleted = visit?.visitStatus === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button
          onClick={() => navigate(`/mobile/plan/${planId}/customers`)}
          className="bg-white/20 px-3 py-2 rounded-lg text-sm font-medium"
        >
          &larr; Back
        </button>
        <h1 className="text-lg font-bold">Customer Detail</h1>
        <div className="w-16" />
      </div>

      <div className="p-4">
        {/* Success Message */}
        {successMsg && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center">
            {successMsg}
          </div>
        )}

        {/* Customer Info Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{customer.customerName}</h2>
              <span className="text-sm text-blue-600 font-medium">{customer.customerCode}</span>
            </div>
            {visit && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
              }`}>
                {visit.visitStatus}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-800">{customer.customerName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Code</span>
              <span className="text-sm font-medium text-gray-800">{customer.customerCode}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Address</span>
              <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{customer.address}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Contact</span>
              <a href={`tel:${customer.contactNumber}`} className="text-sm font-medium text-blue-600">{customer.contactNumber}</a>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Route</span>
              <span className="text-sm font-medium text-gray-800">{customer.route}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Location</span>
              <span className="text-sm font-medium text-gray-800">{customer.location}</span>
            </div>
          </div>
        </div>

        {/* Visit Actions */}
        {visit && !isCompleted && (
          <>
            {/* Mark Visit Complete */}
            <button
              onClick={handleCompleteVisit}
              disabled={saving}
              className="w-full bg-green-600 text-white py-4 rounded-2xl text-lg font-bold mb-4 hover:bg-green-700 disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
            >
              {saving ? 'Processing...' : 'Mark Visit Complete'}
            </button>

            {/* Add Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Visit Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about the visit..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 resize-none min-h-[100px]"
              />
              <button
                onClick={handleAddNotes}
                disabled={saving || !notes.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-2 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                Save Notes
              </button>
            </div>

            {/* Record Order */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Record Order</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={orderAmount}
                    onChange={e => setOrderAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleRecordOrder}
                disabled={saving || !orderAmount || parseFloat(orderAmount) <= 0}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold mt-2 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                Record Order
              </button>
            </div>
          </>
        )}

        {/* Completed Visit Info */}
        {visit && isCompleted && (
          <div className="bg-green-50 rounded-2xl p-5 mb-4">
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">&#10003;</div>
              <h3 className="text-lg font-bold text-green-700">Visit Completed</h3>
              {visit.visitTime && (
                <p className="text-sm text-green-600 mt-1">{new Date(visit.visitTime).toLocaleString()}</p>
              )}
            </div>
            {visit.visitNotes && (
              <div className="bg-white rounded-xl p-3 mb-2">
                <div className="text-xs font-bold text-gray-400 mb-1">NOTES</div>
                <p className="text-sm text-gray-700">{visit.visitNotes}</p>
              </div>
            )}
            {visit.salesOrderAmount > 0 && (
              <div className="bg-white rounded-xl p-3">
                <div className="text-xs font-bold text-gray-400 mb-1">ORDER AMOUNT</div>
                <p className="text-lg font-bold text-green-700">${visit.salesOrderAmount.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
