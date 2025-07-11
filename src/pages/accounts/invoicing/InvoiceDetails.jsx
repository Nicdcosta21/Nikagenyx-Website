import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, deleteInvoice, updateInvoiceStatus, generatePdf } from '../../../services/invoiceService';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { v4 as uuidv4 } from 'uuid';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);
  const actionMenuRef = useRef(null);
  
  // Company details would normally come from settings
  const companyDetails = {
    name: 'Nikagenyx',
    gstin: '29AADCB2230M1ZT',
    address: '123 Main Street, Bangalore, Karnataka 560001',
    email: 'accounts@nikagenyx.com',
    phone: '+91 98765 43210',
    bankDetails: 'Account Name: Nikagenyx\nAccount #: 12345678901\nIFSC: HDFC0001234\nBank: HDFC Bank'
  };

  // Get GST rates and totals
  const gstRateTotals = invoice?.items.reduce((acc, item) => {
    const taxRate = parseFloat(item.taxRate);
    if (!acc[taxRate]) {
      acc[taxRate] = {
        taxable
