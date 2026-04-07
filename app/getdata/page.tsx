'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import Style from './Getdata.module.css';

interface DataRow {
    name?: string;
    email?: string;
    country?: string;
    domain?: string;
    date_added?: string;
    phone_number?: string;
    mail_sender_name?: string;
    mail_sending_date?: string;
    label?: string;
    profile_name?: string;
    status?: string;
}

export default function Getdata() {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [limit, setLimit] = useState<number | string>(150); 
    const [serialNoFrom, setSerialNoFrom] = useState('');
    const [serialNoTo, setSerialNoTo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [responseData, setResponseData] = useState<DataRow[]>([]); 

    const formatDate = (dateString?: string) => {
        if (!dateString || dateString === '-') return '-';
        return dateString.split('T')[0];
    };

    const isNotEmpty = (val: any) => val !== null && val !== undefined && val !== '' && val !== '-';

    const hasPhoneNumber = responseData.some((item) => isNotEmpty(item.phone_number));
    const hasMailSenderName = responseData.some((item) => isNotEmpty(item.mail_sender_name));
    const hasMailSendingDate = responseData.some((item) => isNotEmpty(item.mail_sending_date));
    const hasLabel = responseData.some((item) => isNotEmpty(item.label));
    const hasProfileName = responseData.some((item) => isNotEmpty(item.profile_name));
    const hasStatus = responseData.some((item) => isNotEmpty(item.status));

    let visibleColumnsCount = 6;
    if (hasPhoneNumber) visibleColumnsCount++;
    if (hasMailSenderName) visibleColumnsCount++;
    if (hasMailSendingDate) visibleColumnsCount++;
    if (hasLabel) visibleColumnsCount++;
    if (hasProfileName) visibleColumnsCount++;
    if (hasStatus) visibleColumnsCount++;

    const handleDownloadExcel = () => {
        if (!responseData || responseData.length === 0) {
            window.alert("No data available to download.");
            return;
        }

        const excelData = responseData.map((item, index) => {
            const rowData: any = {
                "S.No": index + 1,
                "Name": item.name || '-',
                "Email": item.email || '-',
                "Country": item.country || '-',
                "Domain": item.domain || '-',
                "Date Added": formatDate(item.date_added),
            };
            
            if (hasPhoneNumber) rowData["Phone Number"] = item.phone_number || '-';
            if (hasMailSenderName) rowData["Mail Sender Name"] = item.mail_sender_name || '-';
            if (hasMailSendingDate) rowData["Mail Sending Date"] = formatDate(item.mail_sending_date);
            if (hasLabel) rowData["Label"] = item.label || '-';
            if (hasProfileName) rowData["Profile Name"] = item.profile_name || '-';
            if (hasStatus) rowData["Status"] = item.status || '-';

            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, "email_data.xlsx");
    };

    const getresponse = async () => {
        setIsLoading(true);
        setError(null);
        setResponseData([]); 

        const payload: any = {
            limit: limit
        };

        if (fromDate) payload.from_date = fromDate;
        if (toDate) payload.to_date = toDate;
        if (serialNoFrom && serialNoFrom !== '0') {
            payload.serial_no_from = serialNoFrom;
        }
        if (serialNoTo && serialNoTo !== '0') {
            payload.sno_to = serialNoTo;
        }

       try {
    const response = await fetch('https://email-management-database.vercel.app/validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

            console.log("request", payload);

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            // ✅ IMPORTANT: use text() instead of json()
            const text = await response.text();

            // ✅ Convert JSONL → JSON array
            const parsedData = text
                .trim()
                .split("\n")
                .map(line => JSON.parse(line));

            console.log("response", parsedData);

            // ✅ Set data
            setResponseData(parsedData);

            window.alert("Data fetched successfully!");

        } catch (e: any) {
            setError(e.message);
            window.alert(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={Style.page}>
            <div className={Style.pageHeader}>
                <div id={Style.leftside}>
                    <div>
                        <label htmlFor="fromDate">From date:</label>
                        <input
                            id="fromDate"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="toDate">To date:</label>
                        <input
                            id="toDate"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="limit">Enter the Limit:</label>
                        <input
                            id="limit"
                            type="number"
                            placeholder='Enter the number of rows to fetch'
                            min={1}
                            required
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                        />
                    </div>
                </div>
                <div id={Style.rightside}>
                    <div>
                        <label htmlFor="serialNoFrom">From serial number:</label>
                        <input
                            id="serialNoFrom"
                            type="number"
                            placeholder='Enter the serial number'
                            min={1}
                            required
                            value={serialNoFrom}
                            onChange={(e) => setSerialNoFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="serialNoTo">To serial number:</label>
                        <input
                            id="serialNoTo"
                            type="number"
                            placeholder='Enter the serial number'
                            min={0}
                            required
                            value={serialNoTo}
                            onChange={(e) => setSerialNoTo(e.target.value)}
                        />
                    </div>
                    <div className={Style.actionBtn}>
                        <button className={Style.getBtn} onClick={getresponse} disabled={isLoading}>
                            {isLoading ? 'Fetching...' : 'Get data from API'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={Style.tableContainer}>
                <div id={Style.tableHeader}>
                    <h1>💻 Data Table</h1>
                    <button className={Style.downloadBtn} onClick={handleDownloadExcel}>✔ Download data</button>
                </div>
                <div id={Style.tableBody}>
                    <table className={Style.dataTable}>
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Country</th>
                                <th>Domain</th>
                                <th>Date Added</th>
                                {hasPhoneNumber && <th>Phone Number</th>}
                                {hasMailSenderName && <th>Mail Sender Name</th>}
                                {hasMailSendingDate && <th>Mail Sending Date</th>}
                                {hasLabel && <th>Label</th>}
                                {hasProfileName && <th>Profile Name</th>}
                                {hasStatus && <th>Status</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {responseData && responseData.length > 0 ? (
                                responseData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.name || '-'}</td>
                                        <td>{item.email || '-'}</td>
                                        <td>{item.country || '-'}</td>
                                        <td>{item.domain || '-'}</td>
                                        <td>{formatDate(item.date_added)}</td>
                                        {hasPhoneNumber && <td>{item.phone_number || '-'}</td>}
                                        {hasMailSenderName && <td>{item.mail_sender_name || '-'}</td>}
                                        {hasMailSendingDate && <td>{formatDate(item.mail_sending_date)}</td>}
                                        {hasLabel && <td>{item.label || '-'}</td>}
                                        {hasProfileName && <td>{item.profile_name || '-'}</td>}
                                        {hasStatus && <td>{item.status || '-'}</td>}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={visibleColumnsCount}>
                                        <div className={Style.emptyState}>
                                           <i>{isLoading ? '⏳' : '📭'}</i>
                                           <p>{isLoading ? 'Loading data from the cloud...' : 'No records found. Adjust your filters and try again.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
