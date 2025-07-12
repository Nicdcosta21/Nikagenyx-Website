import React, { useState, useEffect } from 'react';

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date: '', account: '', type: 'credit', amount: '', description: '' });

  const fetchEntries = async () => {
    const res = await fetch('/.netlify/functions/get_ledger_entries');
    const data = await res.json();
    setEntries(data.entries || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/.netlify/functions/add_ledger_entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const result = await res.json();
    if (result.success) {
      setForm({ date: '', account: '', type: 'credit', amount: '', description: '' });
      fetchEntries();
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ledger</h1>
      <form onSubmit={handleSubmit} className="space-y-2 mb-6">
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="border p-2 rounded w-full" />
        <input type="text" placeholder="Account" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} required className="border p-2 rounded w-full" />
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border p-2 rounded w-full">
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required className="border p-2 rounded w-full" />
        <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border p-2 rounded w-full"></textarea>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Entry</button>
      </form>
      <table className="w-full text-left border-t">
        <thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td>{e.date}</td><td>{e.account}</td><td>{e.type}</td><td>{e.amount}</td><td>{e.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
