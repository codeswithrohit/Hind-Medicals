import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { firebase } from '../../Firebase/config';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 1. ULTRA-STRICT NORMALIZATION (Fixes the "12000 New Products" issue)
// This strips ALL spaces, hyphens, brackets, and asterisks so the match is bulletproof.
const normalizeString = (str) => {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Removes everything except letters and numbers
};

// 2. STRICT PRICE PARSING (Fixes the "39.279999999999994" issue)
// Converts strings to numbers and enforces exactly 2 decimal places to prevent false updates.
const parsePrice = (val) => {
  return Number((parseFloat(val) || 0).toFixed(2));
};

const Products = () => {
  const [activeTab, setActiveTab] = useState('upload'); 

  const [processedData, setProcessedData] = useState([]); 
  const [unchangedCount, setUnchangedCount] = useState(0); 
  const [restoreData, setRestoreData] = useState([]);
  
  const [existingProducts, setExistingProducts] = useState(new Map());
  const [uploading, setUploading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch existing products from Firebase
  useEffect(() => {
    const fetchExistingProducts = async () => {
      try {
        const snapshot = await firebase.firestore().collection('Products').get();
        const productsMap = new Map();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.name) {
            const cleanKey = normalizeString(data.name);
            productsMap.set(cleanKey, { id: doc.id, ...data });
          }
        });
        
        setExistingProducts(productsMap);
      } catch (error) {
        toast.error('Error fetching existing products.');
        console.error('Fetch error:', error);
      } finally {
        setFetchingData(false);
      }
    };

    fetchExistingProducts();
  }, []);

  // ------------------------- UPLOAD LOGIC -------------------------
  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const binaryString = event.target.result;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const dataRows = jsonData.slice(1);
          const newAndUpdatedItems = [];
          let unchanged = 0; 

          dataRows.forEach((row, index) => {
            if (!row || row.length === 0) return;
            
            const rawProductName = row[1]; // Column 2
            if (!rawProductName) return;

            const productName = rawProductName.toString().trim();
            
            // Clean Prices using the new helper
            const mrp = parsePrice(row[10]); 
            const purchasePrice = parsePrice(row[11]); 
            const salesPrice = parsePrice(row[12]); 
            
            const companyName = (row[13] || '').toString().trim(); 
            const batchName = (row[16] || '').toString().trim(); 

            const nameKey = normalizeString(productName);
            const parsedValues = { productName, mrp, purchasePrice, salesPrice, companyName, batchName };

            if (existingProducts.has(nameKey)) {
              const existingDoc = existingProducts.get(nameKey);
              const existingPriceDet = existingDoc.priceDetails?.[0] || {};
              
              // Clean Existing Prices using the new helper
              const exPrice = parsePrice(existingPriceDet.price);
              const exDisc = parsePrice(existingPriceDet.discountPrice);
              const exPur = parsePrice(existingPriceDet.purchaseprice);
              const exComp = (existingDoc.companyName || '').toString().trim();
              const exBatch = (existingDoc.batchNameName || '').toString().trim();

              const hasChanges = 
                exPrice !== mrp ||
                exDisc !== salesPrice ||
                exPur !== purchasePrice ||
                exComp !== companyName ||
                exBatch !== batchName;

              if (hasChanges) {
                let changesArr = [];
                if (exPrice !== mrp) changesArr.push(`MRP: ${exPrice} ➔ ${mrp}`);
                if (exDisc !== salesPrice) changesArr.push(`Sales: ${exDisc} ➔ ${salesPrice}`);
                if (exPur !== purchasePrice) changesArr.push(`Purchase: ${exPur} ➔ ${purchasePrice}`);
                if (exComp !== companyName) changesArr.push(`Company: ${exComp || '-'} ➔ ${companyName}`);
                if (exBatch !== batchName) changesArr.push(`Batch: ${exBatch || '-'} ➔ ${batchName}`);

                newAndUpdatedItems.push({
                  status: 'UPDATE', id: existingDoc.id, existingDoc: existingDoc,
                  parsed: parsedValues, rowIndex: index, changesInfo: changesArr.join(', ')
                });
              } else {
                unchanged++;
              }
            } else {
              newAndUpdatedItems.push({
                status: 'NEW', parsed: parsedValues, rowIndex: index, changesInfo: 'New Product Added'
              });
            }
          });

          if (newAndUpdatedItems.length === 0) {
            toast.info(`File processed: ${unchanged} products are already up to date. No new changes found.`);
          } else {
            toast.success(`Found ${newAndUpdatedItems.length} records to process!`);
          }

          setProcessedData(newAndUpdatedItems);
          setUnchangedCount(unchanged); 
        }
      } catch (error) {
        toast.error('Error processing file: ' + error.message);
      }
    };
    reader.onerror = () => toast.error('Error reading file');
    reader.readAsBinaryString(file);
  };

  const uploadImages = async () => ["https://firebasestorage.googleapis.com/v0/b/lifelineshop12.firebasestorage.app/o/ChatGPT%20Image%20May%2025%2C%202025%2C%2007_03_48%20PM.png?alt=media&token=31ad98cd-fa40-467c-a8a1-b711fa64f860"];

  const uploadProductsToFirebase = async () => {
    if (!processedData.length) return toast.error('No data to upload');

    try {
      setUploading(true);
      setUploadProgress(0);
      let successCount = 0;
      const db = firebase.firestore();

      for (let i = 0; i < processedData.length; i++) {
        const item = processedData[i];
        const { productName, mrp, purchasePrice, salesPrice, companyName, batchName } = item.parsed;

        try {
          if (item.status === 'NEW') {
            const productData = {
              name: productName, description: '', category: "Medicine", menu: "Diabetes", brand: "MEDIPILL",
              mainCategory: 'MEDIPILL', companyName: companyName, batchNameName: batchName,
              priceDetails: [{ price: mrp, discountPrice: salesPrice, purchaseprice: purchasePrice, color: '', variant: '', stock: 10, images: await uploadImages() }],
              Active: 'True', View: 'True',
            };
            await db.collection('Products').add(productData);

          } else if (item.status === 'UPDATE') {
            const existingPriceDetails = [...(item.existingDoc.priceDetails || [])];
            if (existingPriceDetails.length > 0) {
              existingPriceDetails[0] = { ...existingPriceDetails[0], price: mrp, discountPrice: salesPrice, purchaseprice: purchasePrice };
            } else {
               existingPriceDetails.push({ price: mrp, discountPrice: salesPrice, purchaseprice: purchasePrice, stock: 10, images: [] });
            }
            const updatePayload = { companyName, batchNameName: batchName, priceDetails: existingPriceDetails };
            await db.collection('Products').doc(item.id).update(updatePayload);
          }
          successCount++;
          setUploadProgress(Math.floor((i + 1) / processedData.length * 100));
        } catch (rowError) {
          console.error(`Error processing ${productName}:`, rowError);
        }
      }
      toast.success(`${successCount} records processed successfully!`);
      setTimeout(() => window.location.reload(), 2000); 
    } catch (error) {
      toast.error('Failed to process database changes');
    } finally {
      setUploading(false);
    }
  };

  // ------------------------- BACKUP EXPORT & RESTORE LOGIC -------------------------
  const downloadBackup = () => {
    if (existingProducts.size === 0) return toast.warning('No products found to backup.');

    try {
      const backupData = [];
      existingProducts.forEach((product) => {
        const priceDet = product.priceDetails?.[0] || {};
        const images = (priceDet.images && Array.isArray(priceDet.images)) ? priceDet.images.join(', ') : '';

        backupData.push({
          'Product Name': product.name || '',
          'Category': product.category || '',
          'Main Category': product.mainCategory || '',
          'Brand': product.brand || '',
          'Company': product.companyName || '',
          'Batch': product.batchNameName || '',
          'MRP': priceDet.price || 0,
          'Purchase Price': priceDet.purchaseprice || 0,
          'Sales Price': priceDet.discountPrice || 0,
          'Stock': priceDet.stock || 0,
          'Image URLs': images, 
          'Active': product.Active || '',
          'View': product.View || ''
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(backupData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All_Products_Backup");

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Products_Backup_${dateStr}.xlsx`);
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate backup file.');
    }
  };

  const processRestoreFile = (file) => {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if (jsonData.length > 0) {
          if (!jsonData[0].hasOwnProperty('Product Name') || !jsonData[0].hasOwnProperty('Image URLs')) {
             return toast.error("Invalid file format. Please upload a valid Backup File.");
          }
          setRestoreData(jsonData);
          toast.success(`Ready to restore ${jsonData.length} products!`);
        }
      } catch (error) {
        toast.error('Error processing backup file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const restoreBackupToFirebase = async () => {
    if (!restoreData.length) return toast.error('No backup data to restore.');

    try {
      setUploading(true);
      setUploadProgress(0);
      let successCount = 0;
      const db = firebase.firestore();

      for (let i = 0; i < restoreData.length; i++) {
        const item = restoreData[i];
        const productName = item['Product Name'];
        if (!productName) continue;

        let imagesArr = [];
        if (item['Image URLs'] && typeof item['Image URLs'] === 'string') {
           imagesArr = item['Image URLs'].split(',').map(url => url.trim()).filter(url => url !== '');
        }

        const nameKey = normalizeString(productName);
        const productPayload = {
          name: productName.toString().trim(),
          category: item['Category'] || "Medicine",
          mainCategory: item['Main Category'] || "MEDIPILL",
          brand: item['Brand'] || "MEDIPILL",
          companyName: item['Company'] || "",
          batchNameName: item['Batch'] || "",
          description: '',
          menu: "Diabetes",
          priceDetails: [{
            price: parsePrice(item['MRP']),
            purchaseprice: parsePrice(item['Purchase Price']),
            discountPrice: parsePrice(item['Sales Price']),
            stock: parseInt(item['Stock']) || 10,
            images: imagesArr.length > 0 ? imagesArr : await uploadImages(),
            color: '', variant: ''
          }],
          Active: item['Active'] !== undefined ? item['Active'].toString() : 'True',
          View: item['View'] !== undefined ? item['View'].toString() : 'True',
        };

        try {
          if (existingProducts.has(nameKey)) {
            const existingId = existingProducts.get(nameKey).id;
            await db.collection('Products').doc(existingId).update(productPayload);
          } else {
            await db.collection('Products').add(productPayload);
          }
          successCount++;
          setUploadProgress(Math.floor((i + 1) / restoreData.length * 100));
        } catch (rowErr) {
          console.error(`Error restoring ${productName}:`, rowErr);
        }
      }

      toast.success(`${successCount} products restored successfully!`);
      setTimeout(() => window.location.reload(), 2000); 
    } catch (error) {
      toast.error('Failed to process restoration process.');
    } finally {
      setUploading(false);
    }
  };

  // ------------------------- UI EVENT HANDLERS -------------------------
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (fetchingData) return;
    activeTab === 'upload' ? processFile(e.dataTransfer.files[0]) : processRestoreFile(e.dataTransfer.files[0]);
  };
  const handleFileUpload = (e) => {
    activeTab === 'upload' ? processFile(e.target.files[0]) : processRestoreFile(e.target.files[0]);
  };

  // ------------------------- UI RENDER -------------------------
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Product Database Manager</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('upload')} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', border: activeTab === 'upload' ? '2px solid #4CAF50' : '1px solid #ccc', backgroundColor: activeTab === 'upload' ? '#e8f5e9' : '#fff', color: activeTab === 'upload' ? '#2E7D32' : '#555' }}>Upload Vendor Excel</button>
          <button onClick={() => setActiveTab('backup')} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', border: activeTab === 'backup' ? '2px solid #2196F3' : '1px solid #ccc', backgroundColor: activeTab === 'backup' ? '#e3f2fd' : '#fff', color: activeTab === 'backup' ? '#1565C0' : '#555' }}>Backup & Restore</button>
        </div>
      </div>
      
      {activeTab === 'upload' && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '5px' }}>
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => !fetchingData && document.getElementById('excel-file-upload').click()} style={{ border: isDragging ? '2px dashed #4CAF50' : '2px dashed #ccc', backgroundColor: isDragging ? '#e8f5e9' : '#ffffff', padding: '40px 20px', textAlign: 'center', borderRadius: '8px', cursor: fetchingData ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', marginBottom: '20px' }}>
            <input id="excel-file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={fetchingData} style={{ display: 'none' }} />
            <div style={{ fontSize: '48px', color: isDragging ? '#4CAF50' : '#888', marginBottom: '10px' }}>📥</div>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#555', fontSize: '16px' }}>{fetchingData ? `Syncing Database (${existingProducts.size} loaded)... Please wait.` : "Drag & Drop Vendor Excel file here, or click to browse"}</p>
          </div>
          
          {(processedData.length > 0 || unchangedCount > 0) && (
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Analysis Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontWeight: 'bold', fontSize: '16px' }}>
                <span style={{ color: '#4CAF50' }}>{processedData.filter(d => d.status === 'NEW').length} New</span>
                <span style={{ color: '#FF9800' }}>{processedData.filter(d => d.status === 'UPDATE').length} Updated</span>
                <span style={{ color: '#9E9E9E' }}>{unchangedCount} Skipped (Matches DB)</span>
              </div>
              {processedData.length > 0 && <button onClick={uploadProductsToFirebase} disabled={uploading} style={{ marginTop: '15px', padding: '12px 24px', backgroundColor: uploading ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>{uploading ? `Processing... (${uploadProgress}%)` : 'Sync Changes to Firebase'}</button>}
            </div>
          )}

          {uploading && <div style={{ marginBottom: '20px', width: '100%', backgroundColor: '#ddd', borderRadius: '4px' }}><div style={{ width: `${uploadProgress}%`, height: '30px', backgroundColor: '#4CAF50', borderRadius: '4px', textAlign: 'center', lineHeight: '30px', color: 'white', transition: 'width 0.3s' }}>{uploadProgress}%</div></div>}

          {processedData.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2' }}>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Status</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>MRP</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Purchase</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Sales</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Company</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Batch</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Change Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.slice(0, 50).map((item, itemIndex) => (
                    <tr key={itemIndex} style={{ backgroundColor: item.status === 'NEW' ? '#e8f5e9' : '#fff3e0' }}>
                      <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', backgroundColor: item.status === 'NEW' ? '#4CAF50' : '#FF9800', color: 'white' }}>{item.status}</span></td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.parsed.productName}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹{item.parsed.mrp}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹{item.parsed.purchasePrice}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹{item.parsed.salesPrice}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.parsed.companyName || '-'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.parsed.batchName || '-'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px', color: item.status === 'UPDATE' ? '#d32f2f' : '#388e3c', fontWeight: 'bold', fontSize: '13px' }}>{item.changesInfo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '5px' }}>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px', backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>1. Export Database</h3>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Download a secure backup of all {existingProducts.size} products currently in the system.</p>
              <button onClick={downloadBackup} disabled={fetchingData || existingProducts.size === 0} style={{ padding: '12px 24px', backgroundColor: (fetchingData || existingProducts.size === 0) ? '#ccc' : '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: (fetchingData || existingProducts.size === 0) ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}>📥 Download Backup File (.xlsx)</button>
            </div>
            <div style={{ flex: '1', minWidth: '300px', backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>2. Restore Database</h3>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Upload a previously downloaded Backup file to restore data, prices, and image links.</p>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => document.getElementById('backup-file-upload').click()} style={{ border: isDragging ? '2px dashed #2196F3' : '2px dashed #ccc', backgroundColor: isDragging ? '#e3f2fd' : '#f9f9f9', padding: '20px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s' }}>
                <input id="backup-file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                <div style={{ fontSize: '30px', color: isDragging ? '#2196F3' : '#888', marginBottom: '10px' }}>📤</div>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#555', fontSize: '14px' }}>Click to Upload Backup File</p>
              </div>
              {restoreData.length > 0 && <button onClick={restoreBackupToFirebase} disabled={uploading} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: uploading ? '#ccc' : '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}>{uploading ? `Restoring... (${uploadProgress}%)` : `🚨 Confirm Restore (${restoreData.length} items)`}</button>}
            </div>
          </div>
          {uploading && <div style={{ marginTop: '30px', width: '100%', backgroundColor: '#ddd', borderRadius: '4px' }}><div style={{ width: `${uploadProgress}%`, height: '30px', backgroundColor: '#d32f2f', borderRadius: '4px', textAlign: 'center', lineHeight: '30px', color: 'white', transition: 'width 0.3s' }}>Restoring {uploadProgress}%</div></div>}
        </div>
      )}
    </div>
  );
};

export default Products;