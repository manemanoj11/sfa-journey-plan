import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminRouteManagement() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({ companies: [], roles: [], routeNames: [] });
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const emptyForm = {
    status: 'active',
    routeName: '',
    routeCode: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    company: '',
    warehouse: '',
    vehicle: '',
    role: '',
    primaryEmployee: ''
  };

  const [form, setForm] = useState(emptyForm);

  const fetchRoutes = () => api.get('/routes').then(r => setRoutes(r.data.routes || []));
  const fetchConfig = () => api.get('/routes/config').then(r => setConfig(r.data)).catch(() => {});

  useEffect(() => {
    api.get('/routes/config')
      .then(r => setConfig(r.data))
      .catch(() => {});
    api.get('/users?role=vansales')
      .then(r => setUsers(r.data))
      .catch(() => {});
    api.get('/routes')
      .then(r => setRoutes(r.data.routes || []))
      .catch(() => {});
  }, []);

  const handleSelectRoute = (id) => {
    setSelectedRouteId(id);
    setError('');
    setSuccess('');
    if (id === 'new') {
      setForm(emptyForm);
      return;
    }
    const route = routes.find(r => r._id === id);
    if (!route) return;
    const companyMatch = config.companies.find(c => c.name === route.company);
    setForm({
      status: route.status || 'active',
      routeName: route.routeName || '',
      routeCode: route.routeCode || '',
      validFrom: route.validFrom ? route.validFrom.split('T')[0] : '',
      validTo: route.validTo ? route.validTo.split('T')[0] : '',
      company: companyMatch?.id || '',
      warehouse: route.warehouse || '',
      vehicle: route.vehicle || '',
      role: route.role || '',
      primaryEmployee: route.primaryEmployee?._id || ''
    });
  };

  const today = new Date().toISOString().split('T')[0];
  const selectedCompany = config.companies.find(c => c.id === form.company);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'company') {
        updated.warehouse = '';
        updated.vehicle = '';
      }
      if (field === 'validFrom') {
        if (updated.validTo && updated.validTo <= value) {
          updated.validTo = '';
        }
      }
      if (field === 'validTo' && updated.validFrom && value <= updated.validFrom) {
        return prev;
      }
      return updated;
    });
  };

  const isEditing = selectedRouteId !== 'new';

  // Open summary popup instead of submitting directly
  const handleReview = (e) => {
    e.preventDefault();
    setShowSummary(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSummary(false);
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { ...form, company: selectedCompany?.name || form.company };
      if (isEditing) {
        await api.put(`/routes/${selectedRouteId}`, payload);
        showToast('Route updated successfully!', 'success');
      } else {
        await api.post('/routes', payload);
        showToast('Route created successfully!', 'success');
      }
      await fetchRoutes();
      await fetchConfig();
      if (!isEditing) {
        setForm(emptyForm);
        setSelectedRouteId('new');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save route', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build summary rows for the popup
  const employeeName = users.find(u => u._id === form.primaryEmployee);
  const summaryRows = [
    { label: 'Status', value: form.status === 'active' ? 'Active' : 'Inactive' },
    { label: 'Route Name', value: form.routeName },
    { label: 'Route Code', value: form.routeCode },
    { label: 'Valid From', value: form.validFrom },
    { label: 'Valid To', value: form.validTo },
    { label: 'Company', value: selectedCompany?.name || '' },
    { label: 'Warehouse', value: form.warehouse },
    { label: 'Vehicle', value: form.vehicle },
    { label: 'Role', value: form.role },
    { label: 'Primary Employee', value: employeeName ? `${employeeName.name} (${employeeName.username})` : '' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/admin')} className="bg-white/20 px-3 py-1.5 rounded-lg text-sm">&larr; Back</button>
        <h1 className="text-lg font-bold">Route Management</h1>
        <div className="w-16" />
      </div>

      {/* Centered Toast Notification */}
      {toast.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className={`pointer-events-auto px-8 py-5 rounded-2xl shadow-2xl text-center max-w-sm animate-bounce-in ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            <div className="text-3xl mb-2">{toast.type === 'success' ? '\u2713' : '\u2717'}</div>
            <div className="text-base font-bold">{toast.message}</div>
          </div>
        </div>
      )}

      <div className="p-4 max-w-2xl mx-auto">

        <form onSubmit={handleReview}>
          {/* Basic Information Section */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Basic Information</h2>

            {/* Status Toggle */}
            <div className="flex items-center justify-between mb-5">
              <label className="text-sm font-semibold text-gray-600">Status</label>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${form.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                  {form.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => handleChange('status', form.status === 'active' ? 'inactive' : 'active')}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Route Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Route Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="routeNamesList"
                value={form.routeName}
                onChange={e => {
                  const val = e.target.value;
                  handleChange('routeName', val);
                  const match = routes.find(r => r.routeName === val);
                  if (match) {
                    handleSelectRoute(match._id);
                  } else {
                    setSelectedRouteId('new');
                  }
                }}
                placeholder="Select or type a new route name"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 placeholder-gray-400"
              />
              <datalist id="routeNamesList">
                {(config.routeNames || []).map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Route Code */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Route Code<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.routeCode}
                onChange={e => handleChange('routeCode', e.target.value)}
                placeholder="Enter route code"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 placeholder-gray-400"
              />
            </div>

            {/* Valid From / Valid To */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Valid From<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={e => handleChange('validFrom', e.target.value)}
                  min={today}
                  max={form.validTo || undefined}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Valid To<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.validTo}
                  min={form.validFrom || today}
                  onChange={e => handleChange('validTo', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Company */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Company<span className="text-red-500">*</span>
              </label>
              <select
                value={form.company}
                onChange={e => handleChange('company', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select Company</option>
                {config.companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Warehouse */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Warehouse (WH)</label>
              <select
                value={form.warehouse}
                onChange={e => handleChange('warehouse', e.target.value)}
                disabled={!form.company}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white ${!form.company ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">{form.company ? 'Select Warehouse' : 'Select Company first'}</option>
                {selectedCompany?.warehouses.map(wh => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            </div>

            {/* Vehicle */}
            <div className="mb-0">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Vehicle</label>
              <select
                value={form.vehicle}
                onChange={e => handleChange('vehicle', e.target.value)}
                disabled={!form.company}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white ${!form.company ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">{form.company ? 'Select Vehicle' : 'Select Company first'}</option>
                {selectedCompany?.vehicles.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Assignment</h2>

            {/* Role */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Role<span className="text-red-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={e => handleChange('role', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select role</option>
                {config.roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Primary Employee */}
            <div className="mb-0">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Primary Employee
              </label>
              <p className="text-xs text-gray-400 mb-2">(Automatically assigned to route)</p>
              <select
                value={form.primaryEmployee}
                onChange={e => handleChange('primaryEmployee', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select primary employee</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-base font-bold hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? 'Saving...' : isEditing ? 'Review & Update' : 'Review & Create'}
          </button>
        </form>
      </div>

      {/* Summary Confirmation Popup */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSummary(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            {/* Popup Header */}
            <div className="bg-blue-700 text-white px-5 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold">Route Summary</h2>
              <p className="text-blue-200 text-sm mt-0.5">Please review the details before submitting</p>
            </div>

            {/* Summary Content */}
            <div className="p-5">
              <table className="w-full text-sm">
                <tbody>
                  {summaryRows.map((row, i) => (
                    <tr key={row.label} className={i < summaryRows.length - 1 ? 'border-b border-gray-100' : ''}>
                      <td className="py-3 pr-4 text-gray-500 font-semibold whitespace-nowrap align-top">{row.label}</td>
                      <td className="py-3 text-gray-800 font-medium text-right">
                        {row.label === 'Status' ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            form.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {row.value}
                          </span>
                        ) : (
                          row.value || <span className="text-gray-300">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Popup Actions */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowSummary(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                Go Back & Edit
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Saving...' : isEditing ? 'Confirm Update' : 'Confirm Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
