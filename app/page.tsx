'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import Style from './Uploadpage.module.css';

// Image paths updated for public directory
const Uploadimg = "/images/uploadicon.png";
const texticon = "/images/docicon.png";
const rowicon = "/images/rowicon.png";
const mailicon = "/images/mailicon.png";
const duplicateicon = "/images/duplicateicon.png";

interface CustomColumn {
  id: number;
  value: string;
}

interface UploadData {
  filename: string;
  file_type: string;
  sheets: string[];
  has_multiple_sheets: boolean;
}

interface SheetData {
  filename:string;
  sheetname:string
  columns: string[];
}

interface PreprocessData {
  summary: {
    total_rows_input: number;
    duplicates_removed: number;
    final_unique_emails: number;
  };
  preview: Array<{
    name?: string;
    email?: string;
    country?: string;
    domain?: string;
  }>;
}

export default function UploadPage() {

  // ─── File selection state ───────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState('');

  // ─── Logic 1: Upload response state ─────────────────────────────────────────
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ─── Logic 2: Sheet selection + proceed response state ───────────────────────
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const [proceedError, setProceedError] = useState<string | null>(null);

  // ─── Column mapping state ────────────────────────────────────────────────────
  const [nameCol, setNameCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [countryCol, setCountryCol] = useState('');
  const [duplicateCol, setDuplicateCol] = useState('');

  // ─── Preprocessing Options state ──────────────────────────────────────────────
  const [splitMulti, setSplitMulti] = useState(true);
  const [deriveDomain, setDeriveDomain] = useState(true);
  const [dropInvalid, setDropInvalid] = useState(false);

  // ─── Dynamic custom column rows ──────────────────────────────────────────────
  const [customCols, setCustomCols] = useState<CustomColumn[]>([]);
  const [nextCustomId, setNextCustomId] = useState(1);

  // ─── Preprocessing Result state ──────────────────────────────────────────────
  const [preprocessData, setPreprocessData] = useState<PreprocessData | null>(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessError, setPreprocessError] = useState<string | null>(null);

  // ─── Logic 4: Insert into DB state ──────────────────────────────────────────
  const [isInserting, setIsInserting] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState();


  
  const selectedMappingCols = [
    nameCol,
    emailCol,
    countryCol,
    ...customCols.map((c) => c.value),
  ].filter(Boolean);

  const handleAddCustom = () => {
    if (customCols.length >= 5) return;
    setCustomCols((prev) => [...prev, { id: nextCustomId, value: '' }]);
    setNextCustomId((n) => n + 1);
  };

  const handleCustomColChange = (id: number, value: string) => {
    setCustomCols((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c))
    );
  };

  const handleRemoveCustom = (id: number) => {
    setCustomCols((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadData(null);
      setSelectedSheet('');
      setSheetData(null);
      setUploadError(null);
      setProceedError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadData(null);
    setSelectedSheet('');
    setSheetData(null);

    try {
      const safeFileName = encodeURIComponent(file.name);

      // This is the CRITICAL fix for the 404
      const newBlob = await upload(safeFileName, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        // onUploadProgress: (progressEvent) => {
        //   console.log(`Upload Progress: ${progressEvent.percentage}%`);
          // You could set a state here to show a progress bar to the user
        // }// Matches your folder: app/api/blob/upload/
      });

      setBlobUrl(newBlob.url);

      const payload = {
        file_url: newBlob.url,
        filename: file.name
      };

      // console.log("payload", payload)

      const response = await fetch('https://email-ingestion-backend.vercel.app/files/process-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Processing failed: ${response.status}`);
      const data = await response.json();
      // console.log("sir response",data)

      if (data.status === 'success') {
        setUploadData({
          
          filename: data.filename,
          file_type: data.file_type,
          sheets: data.sheets,
          has_multiple_sheets: data.has_multiple_sheets,
        });

        if (!data.has_multiple_sheets && data.sheets.length === 1) {
          setSelectedSheet(data.sheets[0]);
        }
      } else {
        throw new Error('Processing response returned non-success status');
      }
    } catch (err) {
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('Something went wrong while loading sheet.');
      }
    } finally {
      setIsUploading(false);
    }
  };



  const handleProceed = async () => {
    
  if (!uploadData) return;
  if (uploadData.has_multiple_sheets && !selectedSheet) return;
    
    setIsProceeding(true);
    setProceedError(null);
    setSheetData(null);
    setNameCol('');
    setEmailCol('');
    setCountryCol('');
    setDuplicateCol('');
    setCustomCols([]);
    setNextCustomId(1);
    const payload = {
          file_url:blobUrl,
          filename: uploadData.filename,
          sheet_name: selectedSheet,
      };
    try {
      const response = await fetch('https://email-ingestion-backend.vercel.app/files/blob-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // console.log("my request",payload)
      // if (!response.ok) throw new Error(`Sheet selection failed: ${response.status}`);
      const data = await response.json();
      // console.log("sir response",data)
      if (data.status === 'success') {
        setSheetData({
          filename:data.filename,
          sheetname:data.sheetname,
          columns: data.columns,
        });
      } else {
        throw new Error('Sheet selection returned non-success status');
      }
    } catch (err) {
      if (err instanceof Error) {
        setProceedError(err.message);
      } else {
        setProceedError('Something went wrong while loading sheet.');
      }
    } finally {
      setIsProceeding(false);
    }
  };

  const handlePreprocess = async () => {
    // if (!uploadData?.file_id || !selectedSheet) return;

    setIsPreprocessing(true);
    setPreprocessError(null);
    setPreprocessData(null);

    const custom_fields_map: Record<string, string> = {};
    customCols.forEach((c) => {
      if (c.value) {
        let key = c.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        custom_fields_map[key] = c.value;
      }
    });

    const field_mapping: Record<string, string> = {};
    if (nameCol) field_mapping['name'] = nameCol;
    if (emailCol) field_mapping['email'] = emailCol;
    if (countryCol) field_mapping['country'] = countryCol;

    const options: any = {
      split_multi_emails: splitMulti,
      derive_domain_if_missing: deriveDomain,
      drop_invalid_emails: dropInvalid
    };
    if (duplicateCol) {
      options.deduplicate_by = duplicateCol;
    }

    const payload = {
      file_url: blobUrl,
      filename: uploadData?.filename || file?.name || 'unknown',
      sheet_name: selectedSheet || null,
      field_mapping,
      custom_fields: custom_fields_map,
      options
    };

    try {
      const response = await fetch('https://email-ingestion-backend.vercel.app/files/blob-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // console.log("my request",payload)
      
      const data = await response.json();
      // console.log("response",data)
      if (data.status === 'success') {
        setPreprocessData({
          summary: data.summary,
          preview: data.preview,
        });
      } else {
        throw new Error('Preprocess returned non-success status');
      }
    } catch (err) {
      if (err instanceof Error) {
        setPreprocessError(err.message);
      } else {
        setPreprocessError('Something went wrong while loading sheet.');
      }
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleInsertToDB = async () => {
    if (!uploadData) return;
    if (uploadData.has_multiple_sheets && !selectedSheet) return;

    setIsInserting(true);
    setInsertError(null);

    const custom_fields_map: Record<string, string> = {};
    customCols.forEach((c) => {
      if (c.value) {
        let key = c.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        custom_fields_map[key] = c.value;
      }
    });

    const field_mapping: Record<string, string> = {};
    if (nameCol) field_mapping['name'] = nameCol;
    if (emailCol) field_mapping['email'] = emailCol;
    if (countryCol) field_mapping['country'] = countryCol;

    const options: any = {
      split_multi_emails: splitMulti,
      derive_domain_if_missing: deriveDomain,
      drop_invalid_emails: dropInvalid,
    };
    if (duplicateCol) {
      options.deduplicate_by = duplicateCol;
    }

    const payload = {
      file_url: blobUrl,
      filename: uploadData?.filename || file?.name || 'unknown',
      sheet_name: selectedSheet || null,
      field_mapping,
      custom_fields: custom_fields_map,
      options,
    };

    try {
      const response = await fetch('https://email-ingestion-backend.vercel.app/files/blob-forward-processed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Insert failed: ${response.status}`);
      const data = await response.json();
      // console.log(data)
      if (data.status === 'success') {
        setPopupMessage(data.target_response.message);
        setPopupType(data.target_status_code);
        setShowPopup(true);
      } else {
        throw new Error(data.target_response.message || 'Insert returned non-success status');
      }
    } catch (err: any) {
      const errorMsg = err.target_response.message || 'Something went wrong during insertion.';
      setInsertError(errorMsg);
      setPopupMessage(errorMsg);
      setPopupType(errorMsg.target_status_code);
      setShowPopup(true);
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className={Style.uploadPage}>

      {/* ── Page Header & Upload Card ── */}
      <div className={Style.pageHeader}>
        <h1>UPLOAD YOUR DATA</h1>

        <div className={Style.uploadForm}>
          <form onSubmit={handleUpload}>
            <div className={Style.uploadBox}>
              <input
                type="file"
                id="fileUpload"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                required
              />
              <label htmlFor="fileUpload" className={Style.uploadLabel}>
                <div className={Style.uploadContent}>
                  <div className={Style.uploadIcon}>
                    <img src={Uploadimg} alt="Upload Icon" />
                  </div>
                  <p>Drag & drop or <span>Browse</span></p>
                  <small>Max size: 100MB (CSV, XLSX). Supported formats: CSV, XLSX</small>
                  <p>{file ? file.name : 'No file selected'}</p>
                </div>
              </label>
            </div>

            <button type="submit" disabled={!file || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>

            {uploadError && (
              <p className={Style.errorMsg}>{uploadError}</p>
            )}
          </form>
        </div>
      </div>

      {/* ── Main Dashboard Container ── */}
      <div className={Style.container}>

        {/* ── Left Side: File Info & Settings ── */}
        <div className={Style.preprocessSection}>
          <div className={Style.fileInfo}>
            <div className={Style.icon}>
              <img src={texticon} alt="File Icon" />
            </div>
            <h2>
              File Name :{' '}
              {uploadData?.filename ?? (file ? file.name : 'No file selected')}
            </h2>
          </div>

          <div className={Style.preprocessOptions}>

            {/* ── Sheet Selection ── */}
            <div id={Style.sheetSelect}>
              <div>
                <label htmlFor="sheetDropdown">Sheet:</label>
                <select
                  id="sheetDropdown"
                  name="sheet name"
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    setSheetData(null);
                    setProceedError(null);
                  }}
                  disabled={!uploadData}
                >
                  <option value="" hidden>
                    {uploadData ? 'Select your sheet' : 'Upload a file first'}
                  </option>
                  {uploadData?.sheets?.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                id={Style.btn}
                onClick={handleProceed}
                disabled={isProceeding || !uploadData || (uploadData.has_multiple_sheets && !selectedSheet)}
              >
                {isProceeding ? 'Loading...' : 'Proceed'}
              </button>
              </div>
              
            </div>

            {/* ── Column Mapping Sidebar ── */}
            {sheetData?.columns && (
              <div id={Style.columnSelect}>
                <div id={Style.columnSelect1}>
                  <div>
                    <label htmlFor="nameColumn">Name:</label>
                    <select
                      id="nameColumn"
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                    >
                      <option value="" hidden>Select Name</option>
                      {sheetData.columns
                        .filter((col) => col === nameCol || !selectedMappingCols.includes(col))
                        .map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="emailColumn">Email:</label>
                    <select
                      id="emailColumn"
                      value={emailCol}
                      onChange={(e) => setEmailCol(e.target.value)}
                    >
                      <option value="" hidden>Select Email</option>
                      {sheetData.columns
                        .filter((col) => col === emailCol || !selectedMappingCols.includes(col))
                        .map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="countryColumn">Country:</label>
                    <select
                      id="countryColumn"
                      value={countryCol}
                      onChange={(e) => setCountryCol(e.target.value)}
                    >
                      <option value="" hidden>Select Country</option>
                      {sheetData.columns
                        .filter((col) => col === countryCol || !selectedMappingCols.includes(col))
                        .map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="duplicateColumn">De-duplicate by:</label>
                    <select
                      id="duplicateColumn"
                      value={duplicateCol}
                      onChange={(e) => setDuplicateCol(e.target.value)}
                    >
                      <option value="" hidden>Select column</option>
                      {sheetData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div id={Style.checkBoxContainer}>
                    <label>
                      <input
                        type="checkbox"
                        checked={splitMulti}
                        onChange={(e) => setSplitMulti(e.target.checked)}
                      /> split multi mails
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={deriveDomain}
                        onChange={(e) => setDeriveDomain(e.target.checked)}
                      /> derive domain if missing
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={dropInvalid}
                        onChange={(e) => setDropInvalid(e.target.checked)}
                      /> drop invalid mails
                    </label>
                  </div>
                </div>

                <div id={Style.columnSelect2}>
                  <div className={Style.customBtnContainer}>
                    <button id={Style.custombtn} type="button" onClick={handleAddCustom}>Add custom field</button>
                    <div id={Style.customList}>
                      {customCols.map((custom, idx) => (
                        <div key={custom.id}>
                          <select
                            value={custom.value}
                            onChange={(e) => handleCustomColChange(custom.id, e.target.value)}
                          >
                            <option value="" hidden>{`Custom Field ${idx + 1}`}</option>
                            {sheetData.columns
                              .filter((col) => col === custom.value || !selectedMappingCols.includes(col)) 
                              .map((col) => (
                               <option key={col} value={col}>{col}</option>
                             ))}
                          </select>
                          <button onClick={() => handleRemoveCustom(custom.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    id={Style.btn}
                    disabled={!sheetData || isPreprocessing}
                    onClick={handlePreprocess}
                  >
                    {isPreprocessing ? 'Processing...' : 'Preprocess'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Side: Statistics & Preview ── */}
        <div className={Style.ResultSection}>
          <div className={Style.statistics}>
            <div id={Style.statisticscontainer}>
                  <div id={Style.statistic1}>
                  <div id={Style.icon1}>
                    <div><img src={rowicon} alt="Rows" /></div>
                  </div>
                  <div id={Style.statisticText}>
                    <p>Total Rows</p>
                    <h1>{preprocessData?.summary?.total_rows_input ?? 0}</h1>
                  </div>
                </div>
                <div id={Style.statistic2}>
                  <div id={Style.icon1}>
                    <div><img src={duplicateicon} alt="Duplicates" /></div>
                  </div>
                  <div id={Style.statisticText}>
                    <p>Duplicates</p>
                    <h1>{preprocessData?.summary?.duplicates_removed ?? 0}</h1>
                  </div>
                </div>

                  <div id={Style.statistic3}>
                <div id={Style.icon1}>
                  <div><img src={mailicon} alt="Unique" /></div>
                </div>
                <div id={Style.statisticText}>
                  <p>Unique</p>
                  <h1>{preprocessData?.summary?.final_unique_emails ?? 0}</h1>
                </div>
              </div>
            </div>
          
            <button
              id={Style.btn}
              disabled={!preprocessData || isInserting}
              onClick={handleInsertToDB}
            >
              {isInserting ? 'Inserting...' : 'Insert into DB'}
            </button>
          </div>

          <div className={Style.tableContainer}>
            <table className={Style.resultTable}>
              <thead>
                <tr>
                  <th>S.no</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Domain</th>
                </tr>
              </thead>
              <tbody>
                {preprocessData?.preview?.length ? (
                  preprocessData.preview.map((row: any, i: number) => (
                    <tr key={i}>
                      <td>{i+1}</td>
                      <td>{row.name || '-'}</td>
                      <td>{row.email || '-'}</td>
                      <td>{row.country || '-'}</td>
                      <td>{row.domain || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                      No data preview available. Click Preprocess to see results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          
        </div>
      </div>

      {/* Popup Container */}
      {showPopup && (
        <div className={Style.popupOverlay}>
          <div className={Style.popupContainer}>
            <div className={Style.popupHeader}>
              <h3>{popupType === 200 ? 'Success' : 'Error'}</h3>
              <button 
                className={Style.popupClose}
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
            <div className={Style.popupBody}>
              <p>{popupMessage}</p>
            </div>
            <div className={Style.popupFooter}>
              <button 
                className={Style.popupBtn}
                onClick={() => setShowPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
