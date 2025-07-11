import React, { useState, useEffect } from 'react';
import { getAttachments, deleteAttachment, downloadAttachment } from '../../services/attachmentService';
import { formatDate, formatFileSize } from '../../utils/formatters';
import FileUploader from '../common/FileUploader';

const AttachmentList = ({ entityType, entityId, onUploadComplete }) => {
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAttachments(entityType, entityId);
      setAttachments(data);
    } catch (err) {
      console.error('Error loading attachments:', err);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      try {
        await deleteAttachment(attachmentId);
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      } catch (err) {
        console.error('Error deleting attachment:', err);
        alert('Failed to delete attachment');
      }
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const blob = await downloadAttachment(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      alert('Failed to download attachment');
    }
  };

  const handleUploadComplete = () => {
    loadAttachments();
    setShowUploader(false);
    onUploadComplete?.();
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Attachments
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage files and documents
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setShowUploader(prev => !prev)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg
            className="-ml-1 mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Files
        </button>
      </div>

      {showUploader && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <FileUploader
            entityType={entityType}
            entityId={entityId}
            onUploadComplete={handleUploadComplete}
            onError={(err) => setError(err.message)}
          />
        </div>
      )}

      {error && (
        <div className="px-4 py-5 sm:p-6 bg-red-50 border-t border-gray-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-
