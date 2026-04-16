import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function ExportMessages({ onClose, clinicNumber }) {
  const [patients, setPatients] = useState([]);
  const [contactMap, setContactMap] = useState({});
  const [selectedPatient, setSelectedPatient] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: contactsList } = await supabase
      .from('contacts')
      .select('phone_number, display_name')
      .eq('practitioner_id', session.user.id);

    const map = {};
    if (contactsList) {
      contactsList.forEach(c => { map[c.phone_number] = c.display_name; });
    }
    setContactMap(map);

    const { data: msgData } = await supabase
      .from('messages')
      .select('from_number, to_number, direction')
      .eq('practitioner_id', session.user.id);

    const unique = [];
    if (msgData) {
      msgData.forEach(msg => {
        const num = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
        if (num && num !== clinicNumber && !unique.includes(num)) {
          unique.push(num);
        }
      });
    }
    setPatients(unique);
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from('messages')
        .select('*')
        .eq('practitioner_id', session.user.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (selectedPatient !== 'all') {
        query = query.or(`from_number.eq.${selectedPatient},to_number.eq.${selectedPatient}`);
      }

      if (dateRange === '30') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        query = query.gte('created_at', date.toISOString());
      } else if (dateRange === '90') {
        const date = new Date();
        date.setDate(date.getDate() - 90);
        query = query.gte('created_at', date.toISOString());
      } else if (dateRange === 'custom') {
        if (fromDate) query = query.gte('created_at', new Date(fromDate).toISOString());
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59);
          query = query.lte('created_at', to.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        setError('No messages found for the selected filters.');
        setExporting(false);
        return;
      }

      // Log export
      await supabase.from('export_logs').insert([{
        practitioner_id: session.user.id,
        user_email: session.user.email,
        exported_at: new Date().toISOString(),
        record_count: data.length
      }]);

      // Build CSV
      const csvRows = [['Date', 'Time', 'Patient Name', 'Phone', 'Direction', 'Message'].join(',')];
      data.forEach(msg => {
        const date = new Date(msg.created_at);
        const patientPhone = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
        const patientName = contactMap[patientPhone] || 'Unknown';
        csvRows.push([
          date.toLocaleDateString(),
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          `"${patientName}"`,
          patientPhone || 'Unknown',
          msg.direction,
          `"${(msg.body || '').replace(/"/g, '""')}"`
        ].join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CUB_Archive_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      onClose();

    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const chipStyle = (active) => ({
    padding: '5px 12px', borderRadius: '20px',
    border: active ? '0.5px solid #9CAF88' : '0.5px solid #E2E8E1',
    background: active ? '#EAF3DE' : '#F7F6F2',
    fontSize: '10px', color: '#588157', fontWeight: '500',
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.4)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 32px', width: '100%',
        border: '0.5px solid #E2E8E1'
      }}>
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: '#E2E8E1', borderRadius: '2px', margin: '0 auto 16px' }} />

        <div style={{ fontSize: '14px', fontWeight: '500', color: '#2F3E46', marginBottom: '4px' }}>Export Messages</div>
        <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '16px' }}>Filter your export or download everything</div>

        {/* Patient filter */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Patient</label>
          <select
            value={selectedPatient}
            onChange={e => setSelectedPatient(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E2E8E1', borderRadius: '10px', fontSize: '12px', color: '#2F3E46', background: '#F7F6F2', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
          >
            <option value="all">All patients</option>
            {patients.map(num => (
              <option key={num} value={num}>{contactMap[num] || num}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Date Range</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', '30', '90', 'custom'].map(range => (
              <button key={range} onClick={() => setDateRange(range)} style={chipStyle(dateRange === range)}>
                {range === 'all' ? 'All time' : range === 'custom' ? 'Custom' : `Last ${range} days`}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {dateRange === 'custom' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Custom Range</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                style={{ padding: '8px 10px', border: '0.5px solid #E2E8E1', borderRadius: '10px', fontSize: '11px', color: '#2F3E46', background: '#F7F6F2', outline: 'none', fontFamily: "'Outfit', sans-serif" }} />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                style={{ padding: '8px 10px', border: '0.5px solid #E2E8E1', borderRadius: '10px', fontSize: '11px', color: '#2F3E46', background: '#F7F6F2', outline: 'none', fontFamily: "'Outfit', sans-serif" }} />
            </div>
            <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px' }}>Leave blank to export all dates</p>
          </div>
        )}

        {/* Privacy warning */}
        <div style={{ background: '#FFF8F0', borderRadius: '10px', padding: '10px 12px', border: '0.5px solid #D6BD98', marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', color: '#A0845C', lineHeight: '1.6', margin: 0 }}>Once downloaded, this file is no longer encrypted. Store it securely and delete it when no longer needed.</p>
        </div>

        {error && (
          <p style={{ fontSize: '11px', color: '#E57373', marginBottom: '8px', textAlign: 'center' }}>{error}</p>
        )}

        {/* Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={onClose} style={{ height: '44px', background: '#fff', border: '0.5px solid #E2E8E1', borderRadius: '12px', fontSize: '10px', fontWeight: '600', color: '#94A3B8', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting} style={{ height: '44px', background: '#588157', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: '600', color: 'white', cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportMessages;