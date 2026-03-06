import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

function CustomerCard({ visit, category, onClick }) {
  const customer = visit.customerId || {};

  const accentColor = category === 'completed' ? 'bg-green-500'
    : category === 'missed' ? 'bg-red-400'
    : 'bg-orange-400';

  const badgeStyle = category === 'completed'
    ? 'bg-green-100 text-green-700'
    : category === 'missed'
    ? 'bg-red-100 text-red-600'
    : 'bg-orange-100 text-orange-600';

  const badgeLabel = category === 'completed' ? 'Visited'
    : category === 'missed' ? 'Missed'
    : 'Pending';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden active:scale-[0.98] cursor-pointer transition-all"
    >
      {/* Card Content */}
      <div className="p-4 pb-3">
        {/* Top: Name + Badge */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-bold text-gray-900 leading-tight flex-1 min-w-0 mr-2">
            {customer.customerName || 'Unknown Customer'}
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 uppercase tracking-wide ${badgeStyle}`}>
            {badgeLabel}
          </span>
        </div>

        {/* Zone / Area */}
        <div className="text-sm text-gray-500 font-medium mb-3">
          {customer.route || customer.location || '--'}
        </div>

        {/* Details Grid */}
        <div className="space-y-2">
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-gray-400 font-semibold w-28 flex-shrink-0">Customer Code</span>
            <span className="text-sm font-bold text-blue-600">
              {customer.customerCode || '--'}
            </span>
          </div>
          <div className="flex items-center min-h-[28px]">
            <span className="text-xs text-gray-400 font-semibold w-28 flex-shrink-0">Contact No.</span>
            <span className="text-sm font-medium text-gray-700">
              {customer.contactNumber || '--'}
            </span>
          </div>
          {customer.location && customer.route && (
            <div className="flex items-center min-h-[28px]">
              <span className="text-xs text-gray-400 font-semibold w-28 flex-shrink-0">Location</span>
              <span className="text-sm font-medium text-gray-700">
                {customer.location}
              </span>
            </div>
          )}
        </div>

        {/* Completed info */}
        {category === 'completed' && visit.visitTime && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
            <span>Visited: {new Date(visit.visitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {visit.salesOrderAmount > 0 && (
              <span className="font-bold text-green-600">Order: ${visit.salesOrderAmount.toFixed(2)}</span>
            )}
          </div>
        )}
      </div>

      {/* Orange bottom accent */}
      <div className={`h-1 w-full ${accentColor}`} />
    </div>
  );
}

export default function MobileCustomerList() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/mobile/today-journey-plan').then(r => {
      const found = r.data.find(p => p._id === planId);
      setPlan(found || null);
    }).finally(() => setLoading(false));
  }, [planId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-3xl mb-2">...</div>
        <p className="text-sm">Loading customers</p>
      </div>
    </div>
  );

  if (!plan) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-3xl mb-2">--</div>
        <p className="text-sm">Plan not found</p>
      </div>
    </div>
  );

  const visits = plan.visits || [];

  const getVisitCategory = (visit) => {
    if (visit.visitStatus === 'completed') return 'completed';
    if (visit.visitStatus === 'missed') return 'missed';
    return 'pending';
  };

  const completedVisits = visits.filter(v => getVisitCategory(v) === 'completed');
  const pendingVisits = visits.filter(v => getVisitCategory(v) === 'pending');
  const missedVisits = visits.filter(v => getVisitCategory(v) === 'missed');

  const filteredVisits = activeTab === 'all' ? visits
    : activeTab === 'completed' ? completedVisits
    : activeTab === 'pending' ? pendingVisits
    : missedVisits;

  const tabs = [
    { key: 'completed', label: 'Visited', count: completedVisits.length, color: 'green' },
    { key: 'pending', label: 'Pending', count: pendingVisits.length, color: 'orange' },
    { key: 'missed', label: 'Missed', count: missedVisits.length, color: 'red' }
  ];

  const tabStyles = {
    blue: { active: 'bg-blue-600 text-white shadow-blue-200', inactive: 'bg-white text-gray-600 border border-gray-200' },
    green: { active: 'bg-green-600 text-white shadow-green-200', inactive: 'bg-white text-gray-600 border border-gray-200' },
    orange: { active: 'bg-orange-500 text-white shadow-orange-200', inactive: 'bg-white text-gray-600 border border-gray-200' },
    red: { active: 'bg-red-600 text-white shadow-red-200', inactive: 'bg-white text-gray-600 border border-gray-200' }
  };

  const pct = visits.length ? Math.round((completedVisits.length / visits.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button
          onClick={() => navigate('/mobile')}
          className="bg-white/20 px-3 py-2.5 rounded-xl text-sm font-medium min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          &larr; Back
        </button>
        <h1 className="text-lg font-bold">Customer List</h1>
        <div className="w-16" />
      </div>

      <div className="px-4 pt-4">
        {/* Progress Summary */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500 font-medium">{completedVisits.length} of {visits.length} visited</span>
            <span className="text-sm font-bold text-green-600">{pct}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Quick Stats */}
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-blue-700">{visits.length}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Total</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-green-600">{completedVisits.length}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Done</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-orange-500">{pendingVisits.length}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Pending</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-red-500">{missedVisits.length}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Missed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(tab => {
            const styles = tabStyles[tab.color];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all min-h-[44px] ${
                  isActive ? styles.active + ' shadow-md' : styles.inactive
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Customer Cards */}
        {filteredVisits.map((visit) => (
          <CustomerCard
            key={visit._id}
            visit={visit}
            category={getVisitCategory(visit)}
            onClick={() => {
              const customer = visit.customerId || {};
              navigate(`/mobile/customer/${customer._id}?visitId=${visit._id}&planId=${planId}`);
            }}
          />
        ))}

        {filteredVisits.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">--</div>
            <p className="text-lg font-medium">
              {activeTab === 'completed' ? 'No visited customers yet'
                : activeTab === 'pending' ? 'No pending visits'
                : 'No missed visits'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
