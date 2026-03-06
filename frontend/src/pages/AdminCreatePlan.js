import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';

export default function AdminCreatePlan() {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [config, setConfig] = useState({ companies: [], roles: [], routeNames: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedCustomerIds, setAssignedCustomerIds] = useState([]);
  const [step, setStep] = useState(1);
  const [importResult, setImportResult] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const customersPerPage = 10;
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Basic Information (Route)
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    routeCode: '',
    validFrom: today,
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    company: '',
    warehouse: '',
    vehicle: '',
    role: '',
    primaryEmployee: ''
  });
  const [editingRouteId, setEditingRouteId] = useState(null);

  // Step 2: Journey Plan (frequency + customers)
  const [deliveryFrequency, setDeliveryFrequency] = useState('');
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [showTiming, setShowTiming] = useState('no');
  const [deliveryTimeStart, setDeliveryTimeStart] = useState('09:00');
  const [deliveryTimeEnd, setDeliveryTimeEnd] = useState('17:00');

  // Per-customer frequency overrides (Step 3)
  const [customerFrequencies, setCustomerFrequencies] = useState({});
  const [editingFreqCustomer, setEditingFreqCustomer] = useState(null);
  const [editFreqForm, setEditFreqForm] = useState({ frequency: '', days: [] });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const toggleDay = (day) => {
    setDeliveryDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const fetchData = () => {
    Promise.all([
      api.get('/users?role=vansales'),
      api.get('/customers?status=active'),
      api.get('/admin/journey-plans'),
      api.get('/routes'),
      api.get('/routes/config').catch(() => ({ data: { companies: [], roles: [], routeNames: [] } }))
    ]).then(([u, c, p, r, cfg]) => {
      setUsers(u.data);
      setCustomers(c.data.customers || c.data);
      const plans = p.data.plans || [];
      const ids = new Set();
      plans.forEach(plan => {
        (plan.customers || []).forEach(cust => {
          const custId = typeof cust === 'string' ? cust : cust._id;
          if (custId) ids.add(custId);
        });
      });
      setAssignedCustomerIds([...ids]);
      setRoutes(r.data.routes || r.data || []);
      setConfig(cfg.data);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const selectedCompany = config.companies.find(c => c.id === routeForm.company);
  const existingRouteNames = routes.map(r => r.routeName.toLowerCase());

  const handleRouteChange = (field, value) => {
    setRouteForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'company') { updated.warehouse = ''; updated.vehicle = ''; }
      if (field === 'validFrom' && updated.validTo && updated.validTo <= value) { updated.validTo = ''; }
      if (field === 'validTo' && updated.validFrom && value <= updated.validFrom) return prev;
      return updated;
    });
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { setError('Excel file is empty'); return; }
        const headers = Object.keys(rows[0]);
        const codeKey = headers.find(h => /customer.?code/i.test(h) || /code/i.test(h) || /customer.?id/i.test(h));
        const nameKey = headers.find(h => /customer.?name/i.test(h) || /name/i.test(h));
        const extractedCodes = rows.map(row => ({
          code: codeKey ? String(row[codeKey]).trim() : '',
          name: nameKey ? String(row[nameKey]).trim() : ''
        })).filter(r => r.code);
        if (extractedCodes.length === 0) { setError('No customer codes found in Excel.'); return; }
        let matched = 0;
        let notFound = [];
        const newSelected = [...selectedCustomers];
        extractedCodes.forEach(({ code, name }) => {
          const customer = customers.find(c =>
            c.customerCode.toLowerCase() === code.toLowerCase() ||
            (name && c.customerName.toLowerCase() === name.toLowerCase())
          );
          if (customer) {
            if (!newSelected.includes(customer._id)) newSelected.push(customer._id);
            matched++;
          } else {
            notFound.push(code);
          }
        });
        setSelectedCustomers(newSelected);
        setImportResult({ total: extractedCodes.length, matched, notFound });
        setError('');
      } catch (err) {
        setError('Failed to read Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleNext = () => {
    if (step === 1) {
      if (!routeForm.routeName || !routeForm.routeCode) { setError('Route Name and Route Code are required'); return; }
      if (!editingRouteId && existingRouteNames.includes(routeForm.routeName.toLowerCase())) {
        setError('This route name already exists. Please use a different name.'); return;
      }
      if (!routeForm.company) { setError('Please select a company'); return; }
      if (!routeForm.warehouse) { setError('Please select a warehouse'); return; }
      if (!routeForm.vehicle) { setError('Please select a vehicle'); return; }
      if (!routeForm.role) { setError('Please select a role'); return; }
      setError('');
      setCustomerPage(1);
      setStep(2);
    } else if (step === 2) {
      if (!deliveryFrequency) { setError('Please select a delivery frequency'); return; }
      if (selectedCustomers.length === 0) { setError('Please select at least one customer'); return; }
      setError('');
      setSelectedPage(1);
      setStep(3);
    } else if (step === 3) {
      if (selectedCustomers.length === 0) { setError('Please select at least one customer'); return; }
      if (showTiming === 'yes' && (!deliveryTimeStart || !deliveryTimeEnd)) { setError('Please set Start and End time'); return; }
      setError('');
      setStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const routePayload = { ...routeForm, status: 'active', company: selectedCompany?.name || routeForm.company };
      let routeId = editingRouteId;
      if (editingRouteId) {
        await api.put(`/routes/${editingRouteId}`, routePayload);
      } else {
        const routeRes = await api.post('/routes', routePayload);
        routeId = routeRes.data.route?._id || routeRes.data._id;
      }

      const res = await api.post('/admin/create-journey-plan', {
        planDate: today,
        assignedTo: routeForm.primaryEmployee || undefined,
        customers: selectedCustomers,
        route: routeId || undefined,
        deliveryFrequency,
        deliveryDays,
        ...(showTiming === 'yes' ? { deliveryTimeStart, deliveryTimeEnd } : {})
      });
      alert(res.data.message || 'Journey plan created successfully');
      setStep(1);
      setRouteForm({
        routeName: '', routeCode: '',
        validFrom: today,
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        company: '', warehouse: '', vehicle: '', role: '', primaryEmployee: ''
      });
      setEditingRouteId(null);
      setDeliveryFrequency('');
      setDeliveryDays([]);
      setShowTiming('no');
      setDeliveryTimeStart('09:00');
      setDeliveryTimeEnd('17:00');
      setSelectedCustomers([]);
      setCustomerFrequencies({});
      setEditingFreqCustomer(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomer = (id) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const removeCustomer = (id) => {
    setSelectedCustomers(prev => prev.filter(c => c !== id));
    setCustomerFrequencies(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const getCustomerFrequency = (customerId) => {
    return customerFrequencies[customerId] || { frequency: deliveryFrequency, days: [...deliveryDays] };
  };

  const startEditFrequency = (customerId) => {
    const cf = getCustomerFrequency(customerId);
    setEditFreqForm({ frequency: cf.frequency, days: [...cf.days] });
    setEditingFreqCustomer(customerId);
  };

  const saveCustomerFrequency = () => {
    if (!editingFreqCustomer || !editFreqForm.frequency) return;
    setCustomerFrequencies(prev => ({
      ...prev,
      [editingFreqCustomer]: { frequency: editFreqForm.frequency, days: [...editFreqForm.days] }
    }));
    setEditingFreqCustomer(null);
  };

  const toggleEditDay = (day) => {
    setEditFreqForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  // Customers: only unassigned, sorted by route match
  const unassignedCustomers = customers.filter(c => !assignedCustomerIds.includes(c._id));
  const routeFilteredCustomers = routeForm.routeName
    ? [
        ...unassignedCustomers.filter(c => c.route && c.route.toLowerCase() === routeForm.routeName.toLowerCase()),
        ...unassignedCustomers.filter(c => !c.route || c.route.toLowerCase() !== routeForm.routeName.toLowerCase())
      ]
    : unassignedCustomers;

  const handleDownloadSample = () => {
    const sampleData = [
      { CustomerCode: 'CUST001', CustomerName: 'Sample Customer 1' },
      { CustomerCode: 'CUST002', CustomerName: 'Sample Customer 2' }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customer_import_sample.xlsx');
  };

  const stepLabels = ['Basic Information', 'Customers', 'Schedule', 'Review'];

  // Selected customers for Step 3 display
  const selectedCustomerObjects = selectedCustomers.map(id => customers.find(c => c._id === id)).filter(Boolean);
  const selectedTotalPages = Math.ceil(selectedCustomerObjects.length / customersPerPage);
  const selectedStartIdx = (selectedPage - 1) * customersPerPage;
  const selectedPageCustomers = selectedCustomerObjects.slice(selectedStartIdx, selectedStartIdx + customersPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/admin')} className="bg-white/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-all">&larr; Back</button>
        <h1 className="text-xl font-bold">Journey Plan</h1>
        <div className="w-20" />
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center mb-8 bg-white rounded-2xl p-5 shadow-sm">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                  step > i + 1 ? 'bg-green-600 text-white'
                    : step === i + 1 ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i + 1 ? '\u2713' : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-semibold ${step === i + 1 ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 mt-[-14px] ${step > i + 1 ? 'bg-green-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">{error}</div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100">Basic Information</h2>

            {/* Route Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Route Name<span className="text-red-500">*</span></label>
              <input type="text" value={routeForm.routeName}
                onChange={e => handleRouteChange('routeName', e.target.value)}
                placeholder="Enter a new route name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 placeholder-gray-400" />
              {routeForm.routeName && existingRouteNames.includes(routeForm.routeName.toLowerCase()) && (
                <p className="text-xs text-red-500 mt-1 font-medium">This route name already exists in the database</p>
              )}
            </div>

            {/* Route Code */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Route Code<span className="text-red-500">*</span></label>
              <input type="text" value={routeForm.routeCode} onChange={e => handleRouteChange('routeCode', e.target.value)}
                placeholder="Enter route code"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 placeholder-gray-400" />
            </div>

            {/* Valid From / Valid To */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Valid From<span className="text-red-500">*</span></label>
                <input type="date" value={routeForm.validFrom} onChange={e => handleRouteChange('validFrom', e.target.value)}
                  min={today} max={routeForm.validTo || undefined}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Valid To<span className="text-red-500">*</span></label>
                <input type="date" value={routeForm.validTo} min={routeForm.validFrom || today}
                  onChange={e => handleRouteChange('validTo', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Company */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Company<span className="text-red-500">*</span></label>
              <select value={routeForm.company} onChange={e => handleRouteChange('company', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white">
                <option value="">Select Company</option>
                {config.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Warehouse & Vehicle */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Warehouse<span className="text-red-500">*</span></label>
                <select value={routeForm.warehouse} onChange={e => handleRouteChange('warehouse', e.target.value)}
                  disabled={!routeForm.company}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white ${!routeForm.company ? 'opacity-50' : ''}`}>
                  <option value="">{routeForm.company ? 'Select Warehouse' : 'Select Company first'}</option>
                  {selectedCompany?.warehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Vehicle<span className="text-red-500">*</span></label>
                <select value={routeForm.vehicle} onChange={e => handleRouteChange('vehicle', e.target.value)}
                  disabled={!routeForm.company}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white ${!routeForm.company ? 'opacity-50' : ''}`}>
                  <option value="">{routeForm.company ? 'Select Vehicle' : 'Select Company first'}</option>
                  {selectedCompany?.vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Role & Primary Employee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Role<span className="text-red-500">*</span></label>
                <select value={routeForm.role} onChange={e => handleRouteChange('role', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select role</option>
                  {config.roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Primary Employee</label>
                <select value={routeForm.primaryEmployee} onChange={e => handleRouteChange('primaryEmployee', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select employee</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Journey Plan (Frequency + Select Customers) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100">Customers</h2>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Delivery Schedule</h3>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Frequency<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {['daily', 'weekly', 'monthly'].map(freq => (
                    <button key={freq} type="button"
                      onClick={() => { setDeliveryFrequency(freq); setDeliveryDays([]); }}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        deliveryFrequency === freq ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</button>
                  ))}
                </div>
                {deliveryFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Select Days</label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                            deliveryDays.includes(day) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'
                          }`}>{day}</button>
                      ))}
                    </div>
                  </div>
                )}
                {deliveryFrequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Select Dates</label>
                    <div className="flex flex-wrap gap-2">
                      {monthDays.map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(String(day))}
                          className={`w-9 h-9 rounded-lg text-sm font-medium border-2 transition-all ${
                            deliveryDays.includes(String(day)) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'
                          }`}>{day}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 pb-3 border-b border-gray-100">Select Customers</h2>
              <p className="text-sm text-gray-500 mb-4">
                Route: {routeForm.routeName} &bull; <span className="font-bold text-blue-600">{selectedCustomers.length}</span> selected
              </p>

              <div className="flex flex-wrap gap-3 mb-4">
                <button type="button"
                  onClick={() => setSelectedCustomers(routeFilteredCustomers.map(c => c._id))}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all">Select All</button>
                <button type="button"
                  onClick={() => setSelectedCustomers([])}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-500 hover:bg-gray-100 transition-all">Clear All</button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-all flex items-center gap-1">
                  <span>&#8593;</span> Import Excel
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
                <button type="button" onClick={handleDownloadSample}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all flex items-center gap-1 ml-auto">
                  <span>&#8595;</span> Download Sample File
                </button>
              </div>

              {importResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-blue-700">Import Result</span>
                    <button type="button" onClick={() => setImportResult(null)} className="text-blue-400 text-xs hover:text-blue-600">Dismiss</button>
                  </div>
                  <div className="text-xs text-blue-600">
                    <span className="font-bold text-green-600">{importResult.matched}</span> of {importResult.total} customers matched.
                    {importResult.notFound.length > 0 && (
                      <div className="mt-1 text-red-500">Not found: {importResult.notFound.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                const totalPages = Math.ceil(routeFilteredCustomers.length / customersPerPage);
                const startIdx = (customerPage - 1) * customersPerPage;
                const pageCustomers = routeFilteredCustomers.slice(startIdx, startIdx + customersPerPage);
                return (
                  <>
                    <div className="space-y-2.5">
                      {pageCustomers.map(c => (
                        <div key={c._id} onClick={() => toggleCustomer(c._id)}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedCustomers.includes(c._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                          }`}>
                          <input type="checkbox" checked={selectedCustomers.includes(c._id)} readOnly className="w-5 h-5 accent-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-800">{c.customerName}</div>
                            <div className="text-xs text-gray-500">{c.customerCode} &bull; {c.location || c.address}</div>
                          </div>
                          <span className="text-xs text-gray-400 font-medium">{c.route || 'No Route'}</span>
                        </div>
                      ))}
                      {routeFilteredCustomers.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">No unassigned customers found</div>
                      )}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Showing {startIdx + 1}-{Math.min(startIdx + customersPerPage, routeFilteredCustomers.length)} of {routeFilteredCustomers.length}
                        </span>
                        <div className="flex gap-1">
                          <button type="button" disabled={customerPage === 1}
                            onClick={() => setCustomerPage(p => p - 1)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${customerPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}>
                            &laquo; Prev
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i + 1} type="button"
                              onClick={() => setCustomerPage(i + 1)}
                              className={`w-8 h-8 rounded-lg text-sm font-bold ${customerPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                              {i + 1}
                            </button>
                          ))}
                          <button type="button" disabled={customerPage === totalPages}
                            onClick={() => setCustomerPage(p => p + 1)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${customerPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}>
                            Next &raquo;
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Step 3: Selected Customers (Edit/Delete) + Timing */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 pb-3 border-b border-gray-100">Schedule</h2>
              <p className="text-sm text-gray-500 mb-4">
                <span className="font-bold text-blue-600">{selectedCustomers.length}</span> customers selected &bull; You can remove customers below
              </p>

              <div className="space-y-2.5">
                {selectedPageCustomers.map((c, i) => {
                  const cf = getCustomerFrequency(c._id);
                  const isEditing = editingFreqCustomer === c._id;
                  return (
                    <div key={c._id} className="rounded-xl border-2 border-gray-200 bg-white">
                      <div className="flex items-center gap-4 p-4">
                        <span className="text-gray-400 font-bold text-sm w-6">{selectedStartIdx + i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-gray-800">{c.customerName}</div>
                          <div className="text-xs text-gray-500">{c.customerCode} &bull; {c.location || c.address}</div>
                        </div>
                        <button type="button" onClick={() => isEditing ? setEditingFreqCustomer(null) : startEditFrequency(c._id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all cursor-pointer ${isEditing ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                          {cf.frequency}{cf.days.length > 0 ? ` (${cf.days.join(', ')})` : ''}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => removeCustomer(c._id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-all">
                          Remove
                        </button>
                      </div>
                      {isEditing && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-2">Frequency</label>
                              <div className="flex gap-2">
                                {['daily', 'weekly', 'monthly'].map(f => (
                                  <button key={f} type="button"
                                    onClick={() => setEditFreqForm(prev => ({ ...prev, frequency: f, days: [] }))}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${editFreqForm.frequency === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {editFreqForm.frequency === 'weekly' && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Select Days</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {weekDays.map(d => (
                                    <button key={d} type="button" onClick={() => toggleEditDay(d)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${editFreqForm.days.includes(d) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                      {d}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {editFreqForm.frequency === 'monthly' && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Select Dates</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {monthDays.map(d => (
                                    <button key={d} type="button" onClick={() => toggleEditDay(String(d))}
                                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${editFreqForm.days.includes(String(d)) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                      {d}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button type="button" onClick={saveCustomerFrequency}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingFreqCustomer(null)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {selectedCustomers.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No customers selected. Go back to add customers.</div>
                )}
              </div>

              {selectedTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Showing {selectedStartIdx + 1}-{Math.min(selectedStartIdx + customersPerPage, selectedCustomerObjects.length)} of {selectedCustomerObjects.length}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" disabled={selectedPage === 1}
                      onClick={() => setSelectedPage(p => p - 1)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold ${selectedPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}>
                      &laquo; Prev
                    </button>
                    {Array.from({ length: selectedTotalPages }, (_, i) => (
                      <button key={i + 1} type="button"
                        onClick={() => setSelectedPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold ${selectedPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button type="button" disabled={selectedPage === selectedTotalPages}
                      onClick={() => setSelectedPage(p => p + 1)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold ${selectedPage === selectedTotalPages ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}>
                      Next &raquo;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timing */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h3 className="text-base font-bold text-gray-700 mb-4">Do you want to set delivery timing?</h3>
              <div className="flex gap-4 mb-4">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${showTiming === 'yes' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <input type="radio" name="showTiming" value="yes" checked={showTiming === 'yes'} onChange={() => setShowTiming('yes')} className="accent-blue-600" />
                  <span className="text-sm font-bold text-gray-700">Yes</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${showTiming === 'no' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <input type="radio" name="showTiming" value="no" checked={showTiming === 'no'} onChange={() => setShowTiming('no')} className="accent-blue-600" />
                  <span className="text-sm font-bold text-gray-700">No</span>
                </label>
              </div>
              {showTiming === 'yes' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">Start Time<span className="text-red-500">*</span></label>
                    <input type="time" value={deliveryTimeStart} onChange={e => setDeliveryTimeStart(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">End Time<span className="text-red-500">*</span></label>
                    <input type="time" value={deliveryTimeEnd} onChange={e => setDeliveryTimeEnd(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 bg-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100">Review</h2>

            {/* Route Info */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Route Details</h3>
              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-gray-500">Route Name</span><span className="text-sm font-bold text-gray-800">{routeForm.routeName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Route Code</span><span className="text-sm font-bold text-gray-800">{routeForm.routeCode}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Valid</span><span className="text-sm font-bold text-gray-800">{routeForm.validFrom} to {routeForm.validTo}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Company</span><span className="text-sm font-bold text-gray-800">{selectedCompany?.name || '--'}</span></div>
                {routeForm.warehouse && <div className="flex justify-between"><span className="text-sm text-gray-500">Warehouse</span><span className="text-sm font-bold text-gray-800">{routeForm.warehouse}</span></div>}
                {routeForm.vehicle && <div className="flex justify-between"><span className="text-sm text-gray-500">Vehicle</span><span className="text-sm font-bold text-gray-800">{routeForm.vehicle}</span></div>}
                <div className="flex justify-between"><span className="text-sm text-gray-500">Role</span><span className="text-sm font-bold text-gray-800">{routeForm.role}</span></div>
                {routeForm.primaryEmployee && <div className="flex justify-between"><span className="text-sm text-gray-500">Primary Employee</span><span className="text-sm font-bold text-gray-800">{users.find(u => u._id === routeForm.primaryEmployee)?.name || '--'}</span></div>}
              </div>
            </div>

            {/* Journey Plan Info */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Schedule</h3>
              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-gray-500">Frequency</span><span className="text-sm font-bold text-gray-800 capitalize">{deliveryFrequency}</span></div>
                {deliveryDays.length > 0 && <div className="flex justify-between"><span className="text-sm text-gray-500">Days</span><span className="text-sm font-bold text-gray-800">{deliveryDays.join(', ')}</span></div>}
                <div className="flex justify-between"><span className="text-sm text-gray-500">Timing</span><span className="text-sm font-bold text-gray-800">{showTiming === 'yes' ? `${deliveryTimeStart} - ${deliveryTimeEnd}` : 'Not set'}</span></div>
              </div>
            </div>

            {/* Customers */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Customers ({selectedCustomers.length})</h3>
              <div className="max-h-[30vh] overflow-y-auto space-y-1">
                {selectedCustomers.map((id, i) => {
                  const c = customers.find(cu => cu._id === id);
                  const cf = getCustomerFrequency(id);
                  return c ? (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-400 font-medium w-6">{i + 1}.</span>
                      <span className="font-bold text-gray-800">{c.customerName}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 capitalize">
                        {cf.frequency}{cf.days.length > 0 ? ` (${cf.days.join(', ')})` : ''}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">{c.customerCode}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-6">
          {step > 1 && (
            <button type="button" onClick={handleBack}
              className="flex-1 border-2 border-gray-200 bg-white py-3.5 rounded-xl text-base font-bold text-gray-600 hover:bg-gray-50 transition-all">
              Previous
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={handleNext}
              className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-base font-bold hover:bg-blue-700 active:scale-95 transition-all">
              Continue
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-green-600 text-white py-3.5 rounded-xl text-base font-bold hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all">
              {loading ? 'Creating...' : 'Confirm & Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
