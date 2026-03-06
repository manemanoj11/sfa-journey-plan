import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MobileDashboard() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/mobile/today-journey-plan')
      .then(r => setPlans(r.data))
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-4 sticky top-0 z-50 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">My Journey</h1>
            <p className="text-blue-200 text-sm mt-0.5">{todayStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-80">{user.name}</span>
            <button onClick={logout} className="bg-white/20 px-3 py-2 rounded-lg text-sm font-medium">Logout</button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Today's Plans</h2>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">...</div>
            <p>Loading your plans</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">--</div>
            <p className="text-lg font-medium">No plans for today</p>
            <p className="text-sm mt-1">Check back later or contact your admin</p>
          </div>
        ) : (
          plans.map(plan => {
            const stats = plan.visitStats || { total: 0, completed: 0, pending: 0, missed: 0 };
            const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div
                key={plan._id}
                onClick={() => navigate(`/mobile/plan/${plan._id}/customers`)}
                className="bg-white rounded-2xl p-5 mb-4 shadow-sm active:bg-gray-50 cursor-pointer transition-all"
              >
                {/* Stats Row */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                      <div className="text-xs text-gray-400">Stops</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <div className="text-xs text-gray-400">Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{stats.pending || 0}</div>
                      <div className="text-xs text-gray-400">Pending</div>
                    </div>
                    {(stats.missed || 0) > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">{stats.missed}</div>
                        <div className="text-xs text-gray-400">Missed</div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">{pct}%</div>
                    <div className="text-xs text-gray-400">Complete</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{plan.customers?.length || stats.total} customers</span>
                  <span className="text-sm font-bold text-blue-600">View Customers &rarr;</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
