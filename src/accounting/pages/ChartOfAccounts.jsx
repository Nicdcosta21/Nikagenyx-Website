import React, { useState, useEffect } from 'react';

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState('');

  const fetchAccounts = async () => {
    const res = await fetch('/.netlify/functions/accounting/getAccounts');
    const data = await res.json();
    setAccounts(data.accounts || []);
  };

  const addAccount = async () => {
    if (!newAccount) return;
    await fetch('/.netlify/functions/accounting/addAccount', {
      method: 'POST',
      body: JSON.stringify({ name: newAccount }),
    });
    setNewAccount('');
    fetchAccounts();
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chart of Accounts</h1>
      <input
        className="border p-2 w-full mb-2"
        type="text"
        placeholder="New Account Name"
        value={newAccount}
        onChange={(e) => setNewAccount(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={addAccount}
      >
        Add Account
      </button>
      <ul className="border p-4 rounded">
        {accounts.map((acc, i) => (
          <li key={i} className="border-b py-1">{acc}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChartOfAccounts;
