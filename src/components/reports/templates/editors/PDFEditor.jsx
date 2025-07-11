import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

export const PDFEditor = ({ value, onChange }) => {
  const handleEditorChange = (content) => {
    onChange({
      ...value,
      content
    });
  };

  const handleSettingsChange = (settings) => {
    onChange({
      ...value,
      settings
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-900">Page Settings</h4>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Page Size
            </label>
            <select
              value={value.settings?.pageSize || 'A4'}
              onChange={(e) => handleSettingsChange({
                ...value.settings,
                pageSize: e.target.value
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Orientation
            </label>
            <select
              value={value.settings?.orientation || 'portrait'}
              onChange={(e) => handleSettingsChange({
                ...value.settings,
                orientation: e.target.value
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Margins
            </label>
            <select
              value={value.settings?.margins || 'normal'}
              onChange={(e) => handleSettingsChange({
                ...value.settings,
                margins: e.target.value
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="normal">Normal</option>
              <option value="narrow">Narrow</option>
              <option value="wide">Wide</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">Template Content</h4>
        <div className="mt-2">
          <Editor
            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
            value={value.content || ''}
            init={{
              height: 500,
              menubar: true,
              plugins: [
                'advlist autolink lists link image charmap print preview anchor',
                'searchreplace visualblocks code fullscreen',
                'insertdatetime media table paste code help wordcount'
              ],
              toolbar:
                'undo redo | formatselect | bold italic backcolor | \
                alignleft aligncenter alignright alignjustify | \
                bullist numlist outdent indent | removeformat | help'
            }}
            onEditorChange={handleEditorChange}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">Dynamic Fields</h4>
        <div className="mt-2 grid grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleEditorChange(value.content + ' {{company_name}}')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Company Name
          </button>
          <button
            type="button"
            onClick={() => handleEditorChange(value.content + ' {{date}}')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => handleEditorChange(value.content + ' {{page_number}}')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Page Number
          </button>
          <button
            type="button"
            onClick={() => handleEditorChange(value.content + ' {{total_pages}}')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Total Pages
          </button>
        </div>
      </div>
    </div>
  );
};
