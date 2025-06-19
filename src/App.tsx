import React, { useState, useRef } from 'react';
import { Camera, Upload, Download, Database, X, Loader } from 'lucide-react';

interface TableData {
  headers: string[];
  rows: string[][];
}

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Convert base64 to blob for API call
      const base64Data = capturedImage.split(',')[1];
      
      const response = await fetch('/api/process-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          prompt: `Extract all table data from this coal log book image. Return the data in JSON format with 'headers' array and 'rows' array. Each row should be an array of cell values. Focus on coal-related data like date, shift, coal type, quantity, location, etc.`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process image');
      }
      
      const result = await response.json();
      setExtractedData(result.tableData);
      
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!extractedData) return;
    
    const csvContent = [
      extractedData.headers.join(','),
      ...extractedData.rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coal-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const addToDatabase = async () => {
    if (!extractedData) return;
    
    try {
      const response = await fetch('/api/save-to-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedData)
      });
      
      if (response.ok) {
        alert('Data successfully added to database');
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (err) {
      setError('Failed to save to database. Please try again.');
    }
  };

  const resetApp = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setError(null);
    stopCamera();
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333', fontSize: '28px', margin: '0 0 10px 0' }}>
          Coal Log Book Digitizer
        </h1>
        <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
          Convert handwritten or printed coal log tables to electronic format
        </p>
      </header>

      {error && (
        <div style={{ 
          backgroundColor: '#ffe6e6', 
          color: '#d00', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #ffcccc'
        }}>
          {error}
        </div>
      )}

      {!capturedImage && !showCamera && (
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <button
            onClick={startCamera}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '15px 25px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Camera size={20} />
            Take Photo
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 25px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Upload size={20} />
            Upload Image
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {showCamera && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ 
              width: '100%', 
              maxWidth: '500px',
              borderRadius: '10px',
              marginBottom: '15px'
            }}
          />
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={capturePhoto}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Capture
            </button>
            <button
              onClick={stopCamera}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Captured Image</h3>
          <img
            src={capturedImage}
            alt="Captured coal log"
            style={{ 
              width: '100%', 
              maxWidth: '500px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}
          />
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={processImage}
              disabled={isProcessing}
              style={{
                backgroundColor: isProcessing ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {isProcessing ? <Loader size={16} /> : null}
              {isProcessing ? 'Processing...' : 'Extract Table Data'}
            </button>
            
            <button
              onClick={resetApp}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {extractedData && (
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', textAlign: 'center' }}>
            Extracted Table Data
          </h3>
          
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #ddd'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  {extractedData.headers.map((header, index) => (
                    <th key={index} style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {extractedData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ 
                    backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa' 
                  }}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ 
                        padding: '10px',
                        borderBottom: '1px solid #ddd'
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={downloadCSV}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Download size={16} />
              Download CSV
            </button>
            
            <button
              onClick={addToDatabase}
              style={{
                backgroundColor: '#ffc107',
                color: '#333',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Database size={16} />
              Add to Database
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default App;