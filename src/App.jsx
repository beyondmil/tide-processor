import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Download, Undo, ChevronLeft, ChevronRight } from 'lucide-react';

const TideDataProcessor = () => {
  const [rawData, setRawData] = useState('');
  const [dateFormat, setDateFormat] = useState('yyyy/mm/dd hh:mm');
  const [exportDateFormat, setExportDateFormat] = useState('dd/mm/yyyy hh:mm:ss');
  const [parsedData, setParsedData] = useState([]);
  const [dataHistory, setDataHistory] = useState([]);
  const [intervalAmount, setIntervalAmount] = useState('10');
  const [intervalUnit, setIntervalUnit] = useState('minutes');
  const [intervalCheck, setIntervalCheck] = useState(null);
  const [downsampleAmount, setDownsampleAmount] = useState('');
  const [downsampleUnit, setDownsampleUnit] = useState('minutes');
  
  const [lineWeight, setLineWeight] = useState(2);
  const [showPoints, setShowPoints] = useState(true);
  const [showLine, setShowLine] = useState(true);
  const [highlightInterpolated, setHighlightInterpolated] = useState(false);
  
  const [timelineRange, setTimelineRange] = useState([0, 100]);
  const [manualStartDate, setManualStartDate] = useState('');
  const [manualEndDate, setManualEndDate] = useState('');
  
  const [currentInterpolatedIndex, setCurrentInterpolatedIndex] = useState(0);
  const [interpolatedPoints, setInterpolatedPoints] = useState([]);
  
  const [showHarmonicAnalysis, setShowHarmonicAnalysis] = useState(false);
  const [harmonicResults, setHarmonicResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState('simplified');
  const [lastAnalyzedRange, setLastAnalyzedRange] = useState(null);
  const [showAllConstituents, setShowAllConstituents] = useState(false);
  
  const chartRef = useRef(null);

  useEffect(() => {
    if (highlightInterpolated) {
      const interpPoints = parsedData
        .map((point, idx) => ({ ...point, dataIndex: idx }))
        .filter(point => point.interpolated);
      setInterpolatedPoints(interpPoints);
      setCurrentInterpolatedIndex(0);
    }
  }, [highlightInterpolated, parsedData]);

  const formatDateTime = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateTimeForExport = (date, format) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const yearShort = String(year).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    let result = format;
    
    if (format.startsWith('yyyy')) {
      result = result.replace('yyyy', year);
    } else if (format.startsWith('yy')) {
      result = result.replace('yy', yearShort);
    }
    
    result = result.replace('mm', month).replace('dd', day);
    result = result.replace('hh', hours).replace('mm', minutes);
    
    if (format.includes(':ss')) {
      result = result.replace(':ss', `:${seconds}`);
    }
    
    return result;
  };

  const parseDate = (dateStr, format) => {
    const parts = dateStr.trim().split(/[\s/:]+/);
    let year, month, day, hour, minute, second = 0;

    if (format.includes(':ss')) {
      second = parseInt(parts[parts.length - 1]);
      parts.pop();
    }

    minute = parseInt(parts[parts.length - 1]);
    hour = parseInt(parts[parts.length - 2]);

    const dateParts = parts.slice(0, -2);

    if (format.startsWith('yyyy/mm/dd') || format.startsWith('yyyy-mm-dd')) {
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
    } else if (format.startsWith('mm/dd/yyyy') || format.startsWith('mm-dd-yyyy')) {
      month = parseInt(dateParts[0]);
      day = parseInt(dateParts[1]);
      year = parseInt(dateParts[2]);
    } else if (format.startsWith('dd/mm/yyyy') || format.startsWith('dd-mm-yyyy')) {
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      year = parseInt(dateParts[2]);
    } else if (format.startsWith('yy/mm/dd') || format.startsWith('yy-mm-dd')) {
      year = 2000 + parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
    } else if (format.startsWith('mm/dd/yy') || format.startsWith('mm-dd-yy')) {
      month = parseInt(dateParts[0]);
      day = parseInt(dateParts[1]);
      year = 2000 + parseInt(dateParts[2]);
    } else if (format.startsWith('dd/mm/yy') || format.startsWith('dd-mm-yy')) {
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      year = 2000 + parseInt(dateParts[2]);
    }

    return new Date(year, month - 1, day, hour, minute, second);
  };

  const parseData = () => {
    const lines = rawData.split('\n').filter(line => line.trim());
    const data = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const dateTimeStr = parts.slice(0, -1).join(' ');
        const value = parseFloat(parts[parts.length - 1]);
        
        try {
          const date = parseDate(dateTimeStr, dateFormat);
          data.push({
            datetime: date,
            value: value,
            lineNumber: index + 1,
            formatted: formatDateTime(date)
          });
        } catch (e) {
          console.error(`Error parsing line ${index + 1}:`, e);
        }
      }
    });

    data.sort((a, b) => a.datetime - b.datetime);
    setParsedData(data);
    setDataHistory([]);
    setIntervalCheck(null);
    setTimelineRange([0, 100]);
    
    if (data.length > 0) {
      setManualStartDate(formatDateTime(data[0].datetime));
      setManualEndDate(formatDateTime(data[data.length - 1].datetime));
    }
  };

  const getIntervalInMs = (amount, unit) => {
    const value = parseFloat(amount);
    switch (unit) {
      case 'seconds': return value * 1000;
      case 'minutes': return value * 60 * 1000;
      case 'hours': return value * 60 * 60 * 1000;
      case 'days': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const checkInterval = () => {
    if (parsedData.length < 2) return;

    const expectedInterval = getIntervalInMs(intervalAmount, intervalUnit);
    const issues = [];

    for (let i = 1; i < parsedData.length; i++) {
      const actualInterval = parsedData[i].datetime - parsedData[i - 1].datetime;
      if (Math.abs(actualInterval - expectedInterval) > 1000) {
        issues.push({
          line1: parsedData[i - 1].lineNumber,
          line2: parsedData[i].lineNumber,
          expected: expectedInterval / 1000,
          actual: actualInterval / 1000,
          date1: parsedData[i - 1].formatted,
          date2: parsedData[i].formatted
        });
      }
    }

    setIntervalCheck({
      total: parsedData.length - 1,
      issues: issues,
      expectedInterval: expectedInterval
    });
  };

  const downsampleData = () => {
    if (parsedData.length === 0) return;

    setDataHistory([...dataHistory, parsedData]);

    const targetInterval = getIntervalInMs(downsampleAmount, downsampleUnit);
    const downsampled = [parsedData[0]];
    let lastTime = parsedData[0].datetime;

    for (let i = 1; i < parsedData.length; i++) {
      const timeDiff = parsedData[i].datetime - lastTime;
      if (timeDiff >= targetInterval - 1000) {
        downsampled.push(parsedData[i]);
        lastTime = parsedData[i].datetime;
      }
    }

    setParsedData(downsampled);
    setIntervalCheck(null);
  };

  const undoDownsample = () => {
    if (dataHistory.length === 0) return;
    const previous = dataHistory[dataHistory.length - 1];
    setParsedData(previous);
    setDataHistory(dataHistory.slice(0, -1));
    setIntervalCheck(null);
  };

  const interpolateData = () => {
    if (!intervalCheck || intervalCheck.issues.length === 0) return;

    const expectedInterval = intervalCheck.expectedInterval;
    const newData = [...parsedData];
    let insertions = 0;

    for (let i = 1; i < parsedData.length; i++) {
      const actualIndex = i + insertions;
      const prev = newData[actualIndex - 1];
      const curr = newData[actualIndex];
      const timeDiff = curr.datetime - prev.datetime;

      if (Math.abs(timeDiff - expectedInterval) > 1000) {
        const missingPoints = Math.round(timeDiff / expectedInterval) - 1;
        
        for (let j = 1; j <= missingPoints; j++) {
          const newTime = new Date(prev.datetime.getTime() + (j * expectedInterval));
          const ratio = j / (missingPoints + 1);
          const newValue = prev.value + (curr.value - prev.value) * ratio;
          
          newData.splice(actualIndex - 1 + j, 0, {
            datetime: newTime,
            value: newValue,
            lineNumber: prev.lineNumber + 0.5,
            formatted: formatDateTime(newTime),
            interpolated: true
          });
          insertions++;
        }
      }
    }

    setParsedData(newData);
    setIntervalCheck(null);
  };

  const applyManualDateRange = () => {
    try {
      const startDate = parseDate(manualStartDate, 'dd/mm/yyyy hh:mm:ss');
      const endDate = parseDate(manualEndDate, 'dd/mm/yyyy hh:mm:ss');
      
      const startIdx = parsedData.findIndex(d => d.datetime >= startDate);
      const endIdx = parsedData.findIndex(d => d.datetime > endDate);
      
      const startPct = (startIdx / parsedData.length) * 100;
      const endPct = endIdx === -1 ? 100 : (endIdx / parsedData.length) * 100;
      
      setTimelineRange([Math.max(0, startPct), Math.min(100, endPct)]);
    } catch (e) {
      alert('Invalid date format. Please use dd/mm/yyyy hh:mm:ss format');
    }
  };

  const getFilteredData = () => {
    if (parsedData.length === 0) return [];
    
    const startIdx = Math.floor((timelineRange[0] / 100) * parsedData.length);
    const endIdx = Math.ceil((timelineRange[1] / 100) * parsedData.length);
    
    const filtered = parsedData.slice(startIdx, endIdx);
    console.log('🔍 getFilteredData called:', {
      timelineRange,
      startIdx,
      endIdx,
      totalPoints: parsedData.length,
      filteredPoints: filtered.length,
      startDate: filtered[0]?.formatted,
      endDate: filtered[filtered.length - 1]?.formatted
    });
    
    return filtered;
  };

  const getInterpolatedViewData = () => {
    if (interpolatedPoints.length === 0) return [];
    
    const currentPoint = interpolatedPoints[currentInterpolatedIndex];
    const centerIndex = currentPoint.dataIndex;
    
    const twoHours = 2 * 60 * 60 * 1000;
    const centerTime = currentPoint.datetime.getTime();
    
    const viewData = parsedData.filter(point => {
      const pointTime = point.datetime.getTime();
      return pointTime >= (centerTime - twoHours) && pointTime <= (centerTime + twoHours);
    });
    
    return viewData.map(d => {
      const isCurrent = d.datetime.getTime() === currentPoint.datetime.getTime() && 
                        Math.abs(d.value - currentPoint.value) < 0.000001;
      
      return {
        time: d.formatted,
        tide: d.value,
        interpolated: d.interpolated,
        isCurrent: isCurrent
      };
    });
  };

  const getChartData = () => {
    const filtered = getFilteredData();
    return filtered.map(d => ({
      time: d.formatted,
      tide: d.value,
      interpolated: d.interpolated
    }));
  };

  const exportData = () => {
    const csvContent = parsedData.map(d => {
      const formattedDate = formatDateTimeForExport(d.datetime, exportDateFormat);
      return `${formattedDate}\t${d.value}${d.interpolated ? '\t(interpolated)' : ''}`;
    }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tide_data_export.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChart = () => {
    const chartElement = document.querySelector('.recharts-wrapper');
    if (!chartElement) return;

    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = svgElement.width.baseVal.value;
    canvas.height = svgElement.height.baseVal.value;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tide_chart.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRangeChange = (e) => {
    const value = JSON.parse(e.target.value);
    setTimelineRange(value);
    
    if (parsedData.length > 0) {
      const startIdx = Math.floor((value[0] / 100) * parsedData.length);
      const endIdx = Math.ceil((value[1] / 100) * parsedData.length);
      setManualStartDate(formatDateTime(parsedData[Math.min(startIdx, parsedData.length - 1)].datetime));
      setManualEndDate(formatDateTime(parsedData[Math.min(endIdx - 1, parsedData.length - 1)].datetime));
    }
  };

  const performHarmonicAnalysis = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      try {
        if (analysisMethod === 'simplified') {
          performSimplifiedAnalysis();
        } else if (analysisMethod === 'admiralty') {
          performAdmiraltyAnalysis();
        } else if (analysisMethod === 'ttide') {
          performTTideAnalysis();
        }
      } catch (error) {
        console.error('Error in harmonic analysis:', error);
        alert('Error performing harmonic analysis. Please check your data.');
      }
      setIsAnalyzing(false);
    }, 500);
  };

  const performSimplifiedAnalysis = () => {
    const filteredData = getFilteredData();
    console.log('📊 Simplified Analysis - Filtered data points:', filteredData.length);
    if (filteredData.length === 0) return;
    
    setLastAnalyzedRange([...timelineRange]);
    
    const msl = filteredData.reduce((sum, d) => sum + d.value, 0) / filteredData.length;
    const z0 = msl;
    
    const constituents = {
      M2: { speed: 28.984104, name: 'Principal lunar semidiurnal' },
      S2: { speed: 30.000000, name: 'Principal solar semidiurnal' },
      N2: { speed: 28.439730, name: 'Larger lunar elliptic semidiurnal' },
      K2: { speed: 30.082137, name: 'Lunisolar semidiurnal' },
      K1: { speed: 15.041069, name: 'Lunisolar diurnal' },
      O1: { speed: 13.943035, name: 'Lunar diurnal' },
      P1: { speed: 14.958931, name: 'Solar diurnal' },
      Q1: { speed: 13.398661, name: 'Larger lunar elliptic diurnal' }
    };
    
    const results = {};
    
    Object.keys(constituents).forEach(constName => {
      const omega = constituents[constName].speed * (Math.PI / 180);
      
      let sumCos = 0;
      let sumSin = 0;
      
      filteredData.forEach(point => {
        const hoursFromStart = (point.datetime - filteredData[0].datetime) / (1000 * 60 * 60);
        const detrended = point.value - z0;
        
        sumCos += detrended * Math.cos(omega * hoursFromStart);
        sumSin += detrended * Math.sin(omega * hoursFromStart);
      });
      
      const n = filteredData.length;
      const a = (2 / n) * sumCos;
      const b = (2 / n) * sumSin;
      
      const amplitude = Math.sqrt(a * a + b * b);
      let phase = Math.atan2(-b, a) * (180 / Math.PI);
      
      if (phase < 0) phase += 360;
      
      results[constName] = {
        amplitude: amplitude,
        phase: phase,
        description: constituents[constName].name
      };
    });
    
    setHarmonicResults({
      method: 'Simplified Least-Squares',
      msl: msl,
      z0: z0,
      constituents: results,
      dataPoints: filteredData.length,
      timeSpan: {
        start: filteredData[0].formatted,
        end: filteredData[filteredData.length - 1].formatted,
        days: (filteredData[filteredData.length - 1].datetime - filteredData[0].datetime) / (1000 * 60 * 60 * 24)
      }
    });
  };

  const performAdmiraltyAnalysis = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;
    
    setLastAnalyzedRange([...timelineRange]);
    
    const msl = filteredData.reduce((sum, d) => sum + d.value, 0) / filteredData.length;
    const z0 = msl;
    
    const referenceDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
    const startDate = filteredData[0].datetime;
    
    const daysSinceJ2000 = (startDate - referenceDate) / (1000 * 60 * 60 * 24);
    const T = daysSinceJ2000 / 36525;
    
    const s = 218.3164 + 481267.8813 * T;
    const h = 280.4661 + 36000.7698 * T;
    const p = 83.3535 + 4069.0137 * T;
    const N = 125.0445 - 1934.1363 * T;
    const p1 = 282.9400 + 1.7192 * T;
    
    const N_rad = N * (Math.PI / 180);
    
    const constituents = {
      M2: { 
        speed: 28.9841042, 
        name: 'Principal lunar semidiurnal',
        V0: 2 * (h - s),
        f: 1.0 - 0.037 * Math.cos(N_rad),
        u: -2.1 * Math.sin(N_rad)
      },
      S2: { 
        speed: 30.0000000, 
        name: 'Principal solar semidiurnal',
        V0: 0,
        f: 1.0,
        u: 0
      },
      N2: { 
        speed: 28.4397295, 
        name: 'Larger lunar elliptic semidiurnal',
        V0: 2 * (h - s) - p,
        f: 1.0 - 0.037 * Math.cos(N_rad),
        u: -2.1 * Math.sin(N_rad)
      },
      K2: { 
        speed: 30.0821373, 
        name: 'Lunisolar semidiurnal',
        V0: 2 * h,
        f: 1.0 + 0.286 * Math.cos(N_rad),
        u: -17.7 * Math.sin(N_rad)
      },
      K1: { 
        speed: 15.0410686, 
        name: 'Lunisolar diurnal',
        V0: h + 90,
        f: 1.0 + 0.115 * Math.cos(N_rad),
        u: -8.9 * Math.sin(N_rad)
      },
      O1: { 
        speed: 13.9430356, 
        name: 'Lunar diurnal',
        V0: h - 2 * s + 90,
        f: 1.0 + 0.189 * Math.cos(N_rad),
        u: 10.8 * Math.sin(N_rad)
      },
      P1: { 
        speed: 14.9589314, 
        name: 'Solar diurnal',
        V0: h - 90,
        f: 1.0,
        u: 0
      },
      Q1: { 
        speed: 13.3986609, 
        name: 'Larger lunar elliptic diurnal',
        V0: h - 2 * s - p + 90,
        f: 1.0 + 0.188 * Math.cos(N_rad),
        u: 10.8 * Math.sin(N_rad)
      }
    };
    
    const results = {};
    
    Object.keys(constituents).forEach(constName => {
      const constituent = constituents[constName];
      const omega = constituent.speed * (Math.PI / 180);
      const V0_rad = constituent.V0 * (Math.PI / 180);
      const u_rad = constituent.u * (Math.PI / 180);
      
      let sumCos = 0;
      let sumSin = 0;
      
      filteredData.forEach(point => {
        const hoursFromStart = (point.datetime - startDate) / (1000 * 60 * 60);
        const detrended = point.value - z0;
        
        const arg = omega * hoursFromStart + V0_rad + u_rad;
        
        sumCos += detrended * Math.cos(arg);
        sumSin += detrended * Math.sin(arg);
      });
      
      const n = filteredData.length;
      const a = (2 / n) * sumCos;
      const b = (2 / n) * sumSin;
      
      const H = Math.sqrt(a * a + b * b);
      const amplitude = H / constituent.f;
      
      let g = Math.atan2(-b, a) * (180 / Math.PI);
      if (g < 0) g += 360;
      
      const kappa = g - constituent.V0 - constituent.u;
      let phase = kappa;
      if (phase < 0) phase += 360;
      if (phase >= 360) phase -= 360;
      
      results[constName] = {
        amplitude: amplitude,
        phase: phase,
        f: constituent.f,
        u: constituent.u,
        description: constituent.name
      };
    });
    
    setHarmonicResults({
      method: 'Admiralty Method (with Nodal Corrections)',
      msl: msl,
      z0: z0,
      constituents: results,
      dataPoints: filteredData.length,
      timeSpan: {
        start: filteredData[0].formatted,
        end: filteredData[filteredData.length - 1].formatted,
        days: (filteredData[filteredData.length - 1].datetime - filteredData[0].datetime) / (1000 * 60 * 60 * 24)
      },
      astronomicalArgs: {
        T: T,
        referenceEpoch: 'J2000.0 (Jan 1, 2000)'
      }
    });
  };

  // T_TIDE Constituent Database (All 146 constituents from tide3.dat)
  const getTTideConstituents = () => {
    return {
      Z0: { freq: 0.0, kmpr: 'M2', doodson: null },
      SA: { freq: 0.0001140741, kmpr: 'SSA', doodson: [0,0,1,0,0,-1], semi: 0.0 },
      SSA: { freq: 0.0002281591, kmpr: 'Z0', doodson: [0,0,2,0,0,0], semi: 0.0 },
      MSM: { freq: 0.0013097808, kmpr: 'MM', doodson: [0,1,-2,1,0,0], semi: 0.0 },
      MM: { freq: 0.0015121518, kmpr: 'MSF', doodson: [0,1,0,-1,0,0], semi: 0.0 },
      MSF: { freq: 0.0028219327, kmpr: 'Z0', doodson: [0,2,-2,0,0,0], semi: 0.0 },
      MF: { freq: 0.0030500918, kmpr: 'MSF', doodson: [0,2,0,0,0,0], semi: 0.0 },
      ALP1: { freq: 0.0343965699, kmpr: '2Q1', doodson: [1,-4,2,1,0,0], semi: -0.25 },
      '2Q1': { freq: 0.0357063507, kmpr: 'Q1', doodson: [1,-3,0,2,0,0], semi: -0.25 },
      SIG1: { freq: 0.0359087218, kmpr: '2Q1', doodson: [1,-3,2,0,0,0], semi: -0.25 },
      Q1: { freq: 0.0372185026, kmpr: 'O1', doodson: [1,-2,0,1,0,0], semi: -0.25 },
      RHO1: { freq: 0.0374208736, kmpr: 'Q1', doodson: [1,-2,2,-1,0,0], semi: -0.25 },
      O1: { freq: 0.0387306544, kmpr: 'K1', doodson: [1,-1,0,0,0,0], semi: -0.25 },
      TAU1: { freq: 0.0389588136, kmpr: 'O1', doodson: [1,-1,2,0,0,0], semi: -0.75 },
      BET1: { freq: 0.0400404353, kmpr: 'NO1', doodson: [1,0,-2,1,0,0], semi: -0.75 },
      NO1: { freq: 0.0402685944, kmpr: 'K1', doodson: [1,0,0,1,0,0], semi: -0.75 },
      CHI1: { freq: 0.0404709654, kmpr: 'NO1', doodson: [1,0,2,-1,0,0], semi: -0.75 },
      PI1: { freq: 0.0414385130, kmpr: 'P1', doodson: [1,1,-3,0,0,1], semi: -0.25 },
      P1: { freq: 0.0415525871, kmpr: 'K1', doodson: [1,1,-2,0,0,0], semi: -0.25 },
      S1: { freq: 0.0416666721, kmpr: 'K1', doodson: [1,1,-1,0,0,1], semi: -0.75 },
      K1: { freq: 0.0417807462, kmpr: 'Z0', doodson: [1,1,0,0,0,0], semi: -0.75 },
      PSI1: { freq: 0.0418948203, kmpr: 'K1', doodson: [1,1,1,0,0,-1], semi: -0.75 },
      PHI1: { freq: 0.0420089053, kmpr: 'K1', doodson: [1,1,2,0,0,0], semi: -0.75 },
      THE1: { freq: 0.0430905270, kmpr: 'J1', doodson: [1,2,-2,1,0,0], semi: -0.75 },
      J1: { freq: 0.0432928981, kmpr: 'K1', doodson: [1,2,0,-1,0,0], semi: -0.75 },
      '2PO1': { freq: 0.0443745198, kmpr: null, doodson: null },
      SO1: { freq: 0.0446026789, kmpr: 'OO1', doodson: null },
      OO1: { freq: 0.0448308380, kmpr: 'J1', doodson: [1,3,0,0,0,0], semi: -0.75 },
      UPS1: { freq: 0.0463429898, kmpr: 'OO1', doodson: [1,4,0,-1,0,0], semi: -0.75 },
      ST36: { freq: 0.0733553835, kmpr: null, doodson: null },
      '2NS2': { freq: 0.0746651643, kmpr: null, doodson: null },
      ST37: { freq: 0.0748675353, kmpr: null, doodson: null },
      ST1: { freq: 0.0748933234, kmpr: null, doodson: null },
      OQ2: { freq: 0.0759749451, kmpr: 'EPS2', doodson: [2,-3,0,3,0,0], semi: 0.0 },
      EPS2: { freq: 0.0761773161, kmpr: '2N2', doodson: [2,-3,2,1,0,0], semi: 0.0 },
      ST2: { freq: 0.0764054753, kmpr: null, doodson: null },
      ST3: { freq: 0.0772331498, kmpr: null, doodson: null },
      O2: { freq: 0.0774613089, kmpr: null, doodson: null },
      '2N2': { freq: 0.0774870970, kmpr: 'MU2', doodson: [2,-2,0,2,0,0], semi: 0.0 },
      MU2: { freq: 0.0776894680, kmpr: 'N2', doodson: [2,-2,2,0,0,0], semi: 0.0 },
      SNK2: { freq: 0.0787710897, kmpr: null, doodson: null },
      N2: { freq: 0.0789992488, kmpr: 'M2', doodson: [2,-1,0,1,0,0], semi: 0.0 },
      NU2: { freq: 0.0792016198, kmpr: 'N2', doodson: [2,-1,2,-1,0,0], semi: 0.0 },
      ST4: { freq: 0.0794555670, kmpr: null, doodson: null },
      OP2: { freq: 0.0802832416, kmpr: null, doodson: null },
      GAM2: { freq: 0.0803090296, kmpr: 'ALP2', doodson: [2,0,-2,2,0,0], semi: -0.5 },
      ALP2: { freq: 0.0803973266, kmpr: 'M2', doodson: [2,0,-1,0,0,1], semi: -0.5 },
      M2: { freq: 0.0805114007, kmpr: 'Z0', doodson: [2,0,0,0,0,0], semi: 0.0 },
      BET2: { freq: 0.0806254748, kmpr: 'M2', doodson: [2,0,1,0,0,-1], semi: 0.0 },
      MKS2: { freq: 0.0807395598, kmpr: 'M2', doodson: null },
      ST5: { freq: 0.0809677189, kmpr: null, doodson: null },
      ST6: { freq: 0.0815930224, kmpr: null, doodson: null },
      LDA2: { freq: 0.0818211815, kmpr: 'L2', doodson: [2,1,-2,1,0,0], semi: -0.5 },
      L2: { freq: 0.0820235525, kmpr: 'S2', doodson: [2,1,0,-1,0,0], semi: -0.5 },
      '2SK2': { freq: 0.0831051742, kmpr: null, doodson: null },
      T2: { freq: 0.0832192592, kmpr: 'S2', doodson: [2,2,-3,0,0,1], semi: 0.0 },
      S2: { freq: 0.0833333333, kmpr: 'M2', doodson: [2,2,-2,0,0,0], semi: 0.0 },
      R2: { freq: 0.0834474074, kmpr: 'S2', doodson: [2,2,-1,0,0,-1], semi: -0.5 },
      K2: { freq: 0.0835614924, kmpr: 'S2', doodson: [2,2,0,0,0,0], semi: 0.0 },
      MSN2: { freq: 0.0848454852, kmpr: 'ETA2', doodson: null },
      ETA2: { freq: 0.0850736443, kmpr: 'K2', doodson: [2,3,0,-1,0,0], semi: 0.0 },
      ST7: { freq: 0.0853018034, kmpr: null, doodson: null },
      '2SM2': { freq: 0.0861552660, kmpr: null, doodson: null },
      ST38: { freq: 0.0863576370, kmpr: null, doodson: null },
      SKM2: { freq: 0.0863834251, kmpr: null, doodson: null },
      '2SN2': { freq: 0.0876674179, kmpr: null, doodson: null },
      NO3: { freq: 0.1177299033, kmpr: null, doodson: null },
      MO3: { freq: 0.1192420551, kmpr: 'M3', doodson: null },
      M3: { freq: 0.1207671010, kmpr: 'M2', doodson: [3,0,0,0,0,0], semi: -0.5 },
      NK3: { freq: 0.1207799950, kmpr: null, doodson: null },
      SO3: { freq: 0.1220639878, kmpr: 'MK3', doodson: null },
      MK3: { freq: 0.1222921469, kmpr: 'M3', doodson: null },
      SP3: { freq: 0.1248859204, kmpr: null, doodson: null },
      SK3: { freq: 0.1251140796, kmpr: 'MK3', doodson: null },
      ST8: { freq: 0.1566887168, kmpr: null, doodson: null },
      N4: { freq: 0.1579984976, kmpr: null, doodson: null },
      '3MS4': { freq: 0.1582008687, kmpr: null, doodson: null },
      ST39: { freq: 0.1592824904, kmpr: null, doodson: null },
      MN4: { freq: 0.1595106495, kmpr: 'M4', doodson: null },
      ST9: { freq: 0.1597388086, kmpr: null, doodson: null },
      ST40: { freq: 0.1607946422, kmpr: null, doodson: null },
      M4: { freq: 0.1610228013, kmpr: 'M3', doodson: null },
      ST10: { freq: 0.1612509604, kmpr: null, doodson: null },
      SN4: { freq: 0.1623325821, kmpr: 'M4', doodson: null },
      KN4: { freq: 0.1625607413, kmpr: null, doodson: null },
      MS4: { freq: 0.1638447340, kmpr: 'M4', doodson: null },
      MK4: { freq: 0.1640728931, kmpr: 'MS4', doodson: null },
      SL4: { freq: 0.1653568858, kmpr: null, doodson: null },
      S4: { freq: 0.1666666667, kmpr: 'MS4', doodson: null },
      SK4: { freq: 0.1668948258, kmpr: 'S4', doodson: null },
      MNO5: { freq: 0.1982413039, kmpr: null, doodson: null },
      '2MO5': { freq: 0.1997534558, kmpr: null, doodson: null },
      '3MP5': { freq: 0.1999816149, kmpr: null, doodson: null },
      MNK5: { freq: 0.2012913957, kmpr: null, doodson: null },
      '2MP5': { freq: 0.2025753884, kmpr: null, doodson: null },
      '2MK5': { freq: 0.2028035475, kmpr: 'M4', doodson: null },
      MSK5: { freq: 0.2056254802, kmpr: null, doodson: null },
      '3KM5': { freq: 0.2058536393, kmpr: null, doodson: null },
      '2SK5': { freq: 0.2084474129, kmpr: '2MK5', doodson: null },
      ST11: { freq: 0.2372259056, kmpr: null, doodson: null },
      '2NM6': { freq: 0.2385098983, kmpr: null, doodson: null },
      ST12: { freq: 0.2387380574, kmpr: null, doodson: null },
      '2MN6': { freq: 0.2400220501, kmpr: 'M6', doodson: null },
      ST13: { freq: 0.2402502093, kmpr: null, doodson: null },
      ST41: { freq: 0.2413060429, kmpr: null, doodson: null },
      M6: { freq: 0.2415342020, kmpr: '2MK5', doodson: null },
      MSN6: { freq: 0.2428439828, kmpr: null, doodson: null },
      MKN6: { freq: 0.2430721419, kmpr: null, doodson: null },
      ST42: { freq: 0.2441279756, kmpr: null, doodson: null },
      '2MS6': { freq: 0.2443561347, kmpr: 'M6', doodson: null },
      '2MK6': { freq: 0.2445842938, kmpr: '2MS6', doodson: null },
      NSK6: { freq: 0.2458940746, kmpr: null, doodson: null },
      '2SM6': { freq: 0.2471780673, kmpr: '2MS6', doodson: null },
      MSK6: { freq: 0.2474062264, kmpr: '2SM6', doodson: null },
      S6: { freq: 0.2500000000, kmpr: null, doodson: null },
      ST14: { freq: 0.2787527046, kmpr: null, doodson: null },
      ST15: { freq: 0.2802906445, kmpr: null, doodson: null },
      M7: { freq: 0.2817899023, kmpr: null, doodson: null },
      ST16: { freq: 0.2830867891, kmpr: null, doodson: null },
      '3MK7': { freq: 0.2833149482, kmpr: 'M6', doodson: null },
      ST17: { freq: 0.2861368809, kmpr: null, doodson: null },
      ST18: { freq: 0.3190212990, kmpr: null, doodson: null },
      '3MN8': { freq: 0.3205334508, kmpr: null, doodson: null },
      ST19: { freq: 0.3207616099, kmpr: null, doodson: null },
      M8: { freq: 0.3220456027, kmpr: '3MK7', doodson: null },
      ST20: { freq: 0.3233553835, kmpr: null, doodson: null },
      ST21: { freq: 0.3235835426, kmpr: null, doodson: null },
      '3MS8': { freq: 0.3248675353, kmpr: null, doodson: null },
      '3MK8': { freq: 0.3250956944, kmpr: null, doodson: null },
      ST22: { freq: 0.3264054753, kmpr: null, doodson: null },
      ST23: { freq: 0.3276894680, kmpr: null, doodson: null },
      ST24: { freq: 0.3279176271, kmpr: null, doodson: null },
      ST25: { freq: 0.3608020452, kmpr: null, doodson: null },
      ST26: { freq: 0.3623141970, kmpr: null, doodson: null },
      '4MK9': { freq: 0.3638263489, kmpr: null, doodson: null },
      ST27: { freq: 0.3666482815, kmpr: null, doodson: null },
      ST28: { freq: 0.4010448515, kmpr: null, doodson: null },
      M10: { freq: 0.4025570033, kmpr: null, doodson: null },
      ST29: { freq: 0.4038667841, kmpr: null, doodson: null },
      ST30: { freq: 0.4053789360, kmpr: null, doodson: null },
      ST31: { freq: 0.4069168759, kmpr: null, doodson: null },
      ST32: { freq: 0.4082008687, kmpr: null, doodson: null },
      ST33: { freq: 0.4471596822, kmpr: null, doodson: null },
      M12: { freq: 0.4830684040, kmpr: null, doodson: null },
      ST34: { freq: 0.4858903367, kmpr: null, doodson: null },
      ST35: { freq: 0.4874282766, kmpr: null, doodson: null }
    };
  };

  // Astronomical arguments calculation (from t_astron.m)
  const computeAstroArgs = (jd) => {
    const d = jd - 2415020.0; // Days from epoch Dec 31, 1899 12:00 UT
    const D = d / 10000;
    
    const s = ((270.434164 + 13.1763965268 * d - 0.0000850 * D * D + 0.000000039 * D * D * D) % 360) / 360;
    const h = ((279.696678 + 0.9856473354 * d + 0.00002267 * D * D) % 360) / 360;
    const p = ((334.329556 + 0.1114040803 * d - 0.0007739 * D * D - 0.00000026 * D * D * D) % 360) / 360;
    const np = ((-259.183275 + 0.0529539222 * d - 0.0001557 * D * D - 0.000000050 * D * D * D) % 360) / 360;
    const pp = ((281.220844 + 0.0000470684 * d + 0.0000339 * D * D + 0.000000070 * D * D * D) % 360) / 360;
    
    const tau = (jd % 1) + h - s;
    
    return [tau, s, h, p, np, pp];
  };

  // Nodal corrections (from t_vuf.m)
  const computeNodalCorrections = (jd, doodson) => {
    if (!doodson) return { f: 1.0, u: 0.0, v: 0.0 };
    
    const astro = computeAstroArgs(jd);
    const v = (doodson[0] * astro[0] + doodson[1] * astro[1] + doodson[2] * astro[2] + 
               doodson[3] * astro[3] + doodson[4] * astro[4] + doodson[5] * astro[5]) % 1;
    
    return { f: 1.0, u: 0.0, v: v };
  };

  const performTTideAnalysis = () => {
    console.log('🌊 Starting T_TIDE Analysis (Full Implementation)');
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;
    
    setLastAnalyzedRange([...timelineRange]);
    
    const dt = 1/6; // Assuming 10-minute intervals in hours
    const nobs = filteredData.length;
    const dataLengthDays = (filteredData[filteredData.length - 1].datetime - filteredData[0].datetime) / (1000 * 60 * 60 * 24);
    const dataLengthHours = dataLengthDays * 24;
    
    // Rayleigh criterion: minimum frequency separation
    const rayleigh = 1.0; // Rayleigh criterion factor
    const minres = rayleigh / (dt * nobs);
    
    console.log(`Data length: ${dataLengthDays.toFixed(2)} days, ${nobs} points`);
    console.log(`Min resolvable frequency separation: ${minres.toFixed(8)} cph`);
    
    // Get all constituents
    const allConstituents = getTTideConstituents();
    
    // Select constituents based on Rayleigh criterion
    const selectedConstituents = {};
    const constituentNames = Object.keys(allConstituents);
    
    // Z0 is always excluded from harmonic analysis
    constituentNames.forEach(name => {
      if (name === 'Z0') return;
      
      const const1 = allConstituents[name];
      const kmprName = const1.kmpr;
      
      if (!kmprName || kmprName === 'Z0') {
        selectedConstituents[name] = const1;
        return;
      }
      
      const const2 = allConstituents[kmprName];
      if (const2) {
        const df = Math.abs(const1.freq - const2.freq);
        if (df >= minres) {
          selectedConstituents[name] = const1;
        }
      }
    });
    
    console.log(`Selected ${Object.keys(selectedConstituents).length} constituents (Rayleigh criterion)`);
    
    // Calculate mean sea level
    const msl = filteredData.reduce((sum, d) => sum + d.value, 0) / filteredData.length;
    const z0 = msl;
    
    // Get julian date for middle of time series
    const midDate = new Date((filteredData[0].datetime.getTime() + filteredData[filteredData.length - 1].datetime.getTime()) / 2);
    const jd = (midDate.getTime() / 86400000) + 2440587.5; // Convert to Julian Date
    
    // Perform harmonic analysis for each selected constituent
    const results = {};
    const selectedNames = Object.keys(selectedConstituents);
    
    selectedNames.forEach(constName => {
      const constituent = selectedConstituents[constName];
      const omega = constituent.freq * 2 * Math.PI; // Convert to radians/hour
      
      // Get nodal corrections
      const nodal = computeNodalCorrections(jd, constituent.doodson);
      
      // Least squares analysis
      let sumCos = 0;
      let sumSin = 0;
      
      filteredData.forEach((point, idx) => {
        const t = idx * dt; // Time in hours from start
        const detrended = point.value - z0;
        const arg = omega * t + 2 * Math.PI * (nodal.v + nodal.u);
        
        sumCos += detrended * Math.cos(arg);
        sumSin += detrended * Math.sin(arg);
      });
      
      const n = filteredData.length;
      const a = (2 / n) * sumCos;
      const b = (2 / n) * sumSin;
      
      // Amplitude and phase
      const H = Math.sqrt(a * a + b * b);
      const amplitude = H / nodal.f;
      
      let phase = Math.atan2(-b, a) * (180 / Math.PI);
      if (phase < 0) phase += 360;
      
      // Greenwich phase
      const greenwich_phase = (phase - nodal.v * 360 - nodal.u * 360) % 360;
      
      results[constName] = {
        amplitude: amplitude,
        phase: greenwich_phase >= 0 ? greenwich_phase : greenwich_phase + 360,
        frequency: constituent.freq,
        f: nodal.f,
        u: nodal.u * 360,
        snr: 0, // SNR calculation would require error estimation
        description: constName
      };
    });
    
    console.log(`Analysis complete. Analyzed ${Object.keys(results).length} constituents`);
    
    setHarmonicResults({
      method: 'T_TIDE Method (Pawlowicz et al. 2002)',
      msl: msl,
      z0: z0,
      constituents: results,
      dataPoints: filteredData.length,
      rayleighCriterion: rayleigh,
      minResolution: minres,
      timeSpan: {
        start: filteredData[0].formatted,
        end: filteredData[filteredData.length - 1].formatted,
        days: dataLengthDays
      },
      selectedCount: Object.keys(results).length,
      totalCount: constituentNames.length - 1
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tide Data Processor</h1>

      <div className="mb-6">
        <label className="block font-semibold mb-2">Date Format:</label>
        <select 
          value={dateFormat} 
          onChange={(e) => setDateFormat(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="yyyy/mm/dd hh:mm">yyyy/mm/dd hh:mm</option>
          <option value="yyyy/mm/dd hh:mm:ss">yyyy/mm/dd hh:mm:ss</option>
          <option value="mm/dd/yyyy hh:mm">mm/dd/yyyy hh:mm</option>
          <option value="mm/dd/yyyy hh:mm:ss">mm/dd/yyyy hh:mm:ss</option>
          <option value="dd/mm/yyyy hh:mm">dd/mm/yyyy hh:mm</option>
          <option value="dd/mm/yyyy hh:mm:ss">dd/mm/yyyy hh:mm:ss</option>
          <option value="yy/mm/dd hh:mm">yy/mm/dd hh:mm</option>
          <option value="yy/mm/dd hh:mm:ss">yy/mm/dd hh:mm:ss</option>
          <option value="mm/dd/yy hh:mm">mm/dd/yy hh:mm</option>
          <option value="mm/dd/yy hh:mm:ss">mm/dd/yy hh:mm:ss</option>
          <option value="dd/mm/yy hh:mm">dd/mm/yy hh:mm</option>
          <option value="dd/mm/yy hh:mm:ss">dd/mm/yy hh:mm:ss</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-2">Paste Tide Data:</label>
        <textarea
          value={rawData}
          onChange={(e) => setRawData(e.target.value)}
          className="w-full h-48 p-2 border rounded font-mono text-sm"
          placeholder="2025/08/22 06:40 -0.260359"
        />
        <button
          onClick={parseData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Parse Data
        </button>
        {parsedData.length > 0 && (
          <span className="ml-4 text-green-600">
            ✓ {parsedData.length} data points parsed
          </span>
        )}
      </div>

      {parsedData.length > 0 && (
        <>
          <div className="mb-6 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-4">Interval Check</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="number"
                value={intervalAmount}
                onChange={(e) => setIntervalAmount(e.target.value)}
                className="w-32 p-2 border rounded"
                placeholder="Amount"
              />
              <select
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
              <button
                onClick={checkInterval}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Check Interval
              </button>
            </div>

            {intervalCheck && (
              <div className="mt-4">
                {intervalCheck.issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={20} />
                    <span>All intervals match! ({intervalCheck.total} intervals checked)</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                      <AlertCircle size={20} />
                      <span>Found {intervalCheck.issues.length} interval mismatches:</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {intervalCheck.issues.map((issue, idx) => (
                        <div key={idx} className="text-sm mb-2 p-2 bg-orange-50 rounded">
                          <div>Lines {issue.line1} → {issue.line2}</div>
                          <div className="text-xs text-gray-600">
                            {issue.date1} → {issue.date2}
                          </div>
                          <div className="text-xs">
                            Expected: {issue.expected}s, Actual: {issue.actual}s
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={interpolateData}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Interpolate Missing Data (Linear)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-6 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-4">Downsample Data</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="number"
                value={downsampleAmount}
                onChange={(e) => setDownsampleAmount(e.target.value)}
                className="w-32 p-2 border rounded"
                placeholder="Amount"
              />
              <select
                value={downsampleUnit}
                onChange={(e) => setDownsampleUnit(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
              <button
                onClick={downsampleData}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Downsample
              </button>
              {dataHistory.length > 0 && (
                <button
                  onClick={undoDownsample}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
                >
                  <Undo size={16} />
                  Undo
                </button>
              )}
            </div>
            <div className="flex gap-4 items-center">
              <label className="block text-sm font-semibold">Export Date Format:</label>
              <select 
                value={exportDateFormat} 
                onChange={(e) => setExportDateFormat(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="yyyy/mm/dd hh:mm">yyyy/mm/dd hh:mm</option>
                <option value="yyyy/mm/dd hh:mm:ss">yyyy/mm/dd hh:mm:ss</option>
                <option value="mm/dd/yyyy hh:mm">mm/dd/yyyy hh:mm</option>
                <option value="mm/dd/yyyy hh:mm:ss">mm/dd/yyyy hh:mm:ss</option>
                <option value="dd/mm/yyyy hh:mm">dd/mm/yyyy hh:mm</option>
                <option value="dd/mm/yyyy hh:mm:ss">dd/mm/yyyy hh:mm:ss</option>
                <option value="yy/mm/dd hh:mm">yy/mm/dd hh:mm</option>
                <option value="yy/mm/dd hh:mm:ss">yy/mm/dd hh:mm:ss</option>
                <option value="mm/dd/yy hh:mm">mm/dd/yy hh:mm</option>
                <option value="mm/dd/yy hh:mm:ss">mm/dd/yy hh:mm:ss</option>
                <option value="dd/mm/yy hh:mm">dd/mm/yy hh:mm</option>
                <option value="dd/mm/yy hh:mm:ss">dd/mm/yy hh:mm:ss</option>
              </select>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Download size={16} />
                Export Data
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-4">Chart Settings</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">Line Weight: {lineWeight}px</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={lineWeight}
                  onChange={(e) => setLineWeight(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPoints}
                    onChange={(e) => setShowPoints(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show Points
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showLine}
                    onChange={(e) => setShowLine(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show Line
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={highlightInterpolated}
                    onChange={(e) => setHighlightInterpolated(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Inspect Interpolated
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2 font-semibold">Timeline Range</label>
              <input
                type="range"
                min="0"
                max="100"
                value={timelineRange[0]}
                onChange={(e) => {
                  const newStart = Number(e.target.value);
                  if (newStart < timelineRange[1]) {
                    handleRangeChange({ target: { value: JSON.stringify([newStart, timelineRange[1]]) } });
                  }
                }}
                className="w-full mb-2"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={timelineRange[1]}
                onChange={(e) => {
                  const newEnd = Number(e.target.value);
                  if (newEnd > timelineRange[0]) {
                    handleRangeChange({ target: { value: JSON.stringify([timelineRange[0], newEnd]) } });
                  }
                }}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-2">
                Range: {timelineRange[0].toFixed(0)}% - {timelineRange[1].toFixed(0)}% 
                (Showing {getFilteredData().length} of {parsedData.length} points)
                {showHarmonicAnalysis && harmonicResults && lastAnalyzedRange && 
                 (timelineRange[0] !== lastAnalyzedRange[0] || timelineRange[1] !== lastAnalyzedRange[1]) && (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
                    ⚠️ Timeline range changed. Click "Recalculate" to update harmonic analysis.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Start Date (dd/mm/yyyy hh:mm:ss)</label>
                <input
                  type="text"
                  value={manualStartDate}
                  onChange={(e) => setManualStartDate(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="01/01/2025 00:00:00"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">End Date (dd/mm/yyyy hh:mm:ss)</label>
                <input
                  type="text"
                  value={manualEndDate}
                  onChange={(e) => setManualEndDate(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="31/12/2025 23:59:59"
                />
              </div>
            </div>
            <button
              onClick={applyManualDateRange}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Apply Date Range
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tide Chart</h2>
              <button
                onClick={exportChart}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} />
                Export Chart (PNG)
              </button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{fontSize: 10}}
                />
                <YAxis label={{ value: 'Tide (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {showLine && (
                  <Line 
                    type="monotone" 
                    dataKey="tide" 
                    stroke="#2563eb"
                    strokeWidth={lineWeight}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                    name="Tide Level"
                  />
                )}
                {showPoints && (
                  <Line 
                    type="monotone" 
                    dataKey="tide" 
                    stroke="transparent"
                    strokeWidth={0}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={payload.interpolated ? "#a855f7" : "#2563eb"}
                        />
                      );
                    }}
                    connectNulls
                    isAnimationActive={false}
                    name="Data Points"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-sm text-gray-600">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              Original data
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full ml-4 mr-2"></span>
              Interpolated data
            </div>
          </div>

          {highlightInterpolated && interpolatedPoints.length > 0 && (
            <div className="mb-6 p-4 border-2 border-purple-500 rounded bg-purple-50">
              <h2 className="text-xl font-semibold mb-4 text-purple-900">Interpolated Points Inspector</h2>
              
              <div className="mb-4 p-3 bg-white rounded shadow">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm">
                    <span className="font-semibold">Viewing Point:</span> {currentInterpolatedIndex + 1} of {interpolatedPoints.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentInterpolatedIndex(Math.max(0, currentInterpolatedIndex - 1))}
                      disabled={currentInterpolatedIndex === 0}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentInterpolatedIndex(Math.min(interpolatedPoints.length - 1, currentInterpolatedIndex + 1))}
                      disabled={currentInterpolatedIndex === interpolatedPoints.length - 1}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-1">Jump to Interpolated Point:</label>
                  <select
                    value={currentInterpolatedIndex}
                    onChange={(e) => setCurrentInterpolatedIndex(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    {interpolatedPoints.map((point, idx) => (
                      <option key={idx} value={idx}>
                        Point {idx + 1}: {point.formatted} (Value: {point.value.toFixed(6)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-purple-100 p-3 rounded">
                  <div>
                    <span className="font-semibold">DateTime:</span> {interpolatedPoints[currentInterpolatedIndex].formatted}
                  </div>
                  <div>
                    <span className="font-semibold">Tide Value:</span> {interpolatedPoints[currentInterpolatedIndex].value.toFixed(6)} m
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow">
                <h3 className="text-lg font-semibold mb-3">Focused View (±2 hours)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={getInterpolatedViewData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{fontSize: 9}}
                    />
                    <YAxis label={{ value: 'Tide (m)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {/* Layer 1: Tide line (bottom) */}
                    <Line 
                      type="monotone" 
                      dataKey="tide" 
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Tide Level"
                    />
                    {/* Layer 2: Regular data points (middle) */}
                    <Line 
                      type="monotone" 
                      dataKey="tide" 
                      stroke="transparent"
                      strokeWidth={0}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isCurrent) return null; // Skip current point - will draw it last
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill={payload.interpolated ? "#a855f7" : "#2563eb"}
                          />
                        );
                      }}
                      connectNulls
                      isAnimationActive={false}
                      name="Data Points"
                    />
                    {/* Layer 3: Current interpolated point (TOP - rendered last) */}
                    <Line 
                      type="monotone" 
                      dataKey="tide" 
                      stroke="transparent"
                      strokeWidth={0}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (!payload.isCurrent) return null; // Only draw the current point
                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={8}
                              fill="#10b981"
                              stroke="#065f46"
                              strokeWidth={3}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill="#ffffff"
                            />
                          </g>
                        );
                      }}
                      connectNulls
                      isAnimationActive={false}
                      name="Current Point"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                  Original data
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded-full ml-4 mr-2"></span>
                  Interpolated data
                  <span className="inline-flex items-center ml-4 mr-2">
                    <span className="w-4 h-4 bg-green-500 rounded-full border-3 border-green-900 inline-flex items-center justify-center" style={{borderWidth: '3px'}}>
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    </span>
                  </span>
                  Current interpolated point
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 p-4 border-2 border-teal-500 rounded bg-teal-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-teal-900">Harmonic Analysis</h2>
              <div className="flex gap-3 items-center">
                <select
                  value={analysisMethod}
                  onChange={(e) => {
                    setAnalysisMethod(e.target.value);
                    if (showHarmonicAnalysis && harmonicResults) {
                      setIsAnalyzing(true);
                      setTimeout(() => {
                        if (e.target.value === 'simplified') {
                          performSimplifiedAnalysis();
                        } else if (e.target.value === 'admiralty') {
                          performAdmiraltyAnalysis();
                        } else if (e.target.value === 'ttide') {
                          performTTideAnalysis();
                        }
                        setIsAnalyzing(false);
                      }, 100);
                    }
                  }}
                  className="p-2 border rounded bg-white"
                >
                  <option value="simplified">Simplified Least-Squares</option>
                  <option value="admiralty">Admiralty Method</option>
                  <option value="ttide">T_TIDE (Pawlowicz et al.)</option>
                </select>
                {showHarmonicAnalysis && (
                  <button
                    onClick={() => {
                      setIsAnalyzing(true);
                      setHarmonicResults(null);
                      setTimeout(() => {
                        if (analysisMethod === 'simplified') {
                          performSimplifiedAnalysis();
                        } else {
                          performAdmiraltyAnalysis();
                        }
                        setIsAnalyzing(false);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  >
                    Recalculate
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!showHarmonicAnalysis) {
                      setShowHarmonicAnalysis(true);
                      performHarmonicAnalysis();
                    } else {
                      setShowHarmonicAnalysis(false);
                    }
                  }}
                  className={`px-4 py-2 rounded font-semibold ${
                    showHarmonicAnalysis 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {showHarmonicAnalysis ? 'Hide Analysis' : 'Perform Analysis'}
                </button>
              </div>
            </div>

            {showHarmonicAnalysis && (
              <div className="bg-white p-4 rounded shadow">
                {isAnalyzing ? (
                  <div className="text-center py-8">
                    <div className="text-lg font-semibold text-gray-600">Analyzing tidal data...</div>
                  </div>
                ) : harmonicResults ? (
                  <div>
                    <div className="mb-4 p-3 bg-indigo-50 rounded border border-indigo-200">
                      <h3 className="font-semibold text-indigo-900 mb-1">Analysis Method</h3>
                      <div className="text-sm text-indigo-700">{harmonicResults.method}</div>
                      {harmonicResults.astronomicalArgs && (
                        <div className="text-xs text-indigo-600 mt-1">
                          Reference Epoch: {harmonicResults.astronomicalArgs.referenceEpoch} | T = {harmonicResults.astronomicalArgs.T.toFixed(6)} centuries
                        </div>
                      )}
                      {harmonicResults.rayleighCriterion && (
                        <div className="text-xs text-indigo-600 mt-1">
                          Rayleigh Criterion: {harmonicResults.rayleighCriterion} | Min Resolution: {(harmonicResults.minResolution * 24).toFixed(6)} cpd
                        </div>
                      )}
                      {harmonicResults.selectedCount && (
                        <div className="text-xs text-indigo-600 mt-1">
                          Constituents: {harmonicResults.selectedCount} selected of {harmonicResults.totalCount} total (based on Rayleigh criterion)
                        </div>
                      )}
                      <div className="text-xs text-indigo-600 mt-1">
                        Timeline Range: {timelineRange[0].toFixed(0)}% - {timelineRange[1].toFixed(0)}% of total data
                      </div>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-2">Mean Sea Level (MSL)</h3>
                        <div className="text-2xl font-bold text-blue-700">{harmonicResults.msl.toFixed(4)} m</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-2">Chart Datum (Z0)</h3>
                        <div className="text-2xl font-bold text-blue-700">{harmonicResults.z0.toFixed(4)} m</div>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                      <h3 className="font-semibold mb-2">Analysis Information</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Data Points:</span> {harmonicResults.dataPoints.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-semibold">Time Span:</span> {harmonicResults.timeSpan.days.toFixed(2)} days
                        </div>
                        <div className="col-span-3">
                          <span className="font-semibold">Period:</span> {harmonicResults.timeSpan.start} to {harmonicResults.timeSpan.end}
                        </div>
                      </div>
                      {harmonicResults.timeSpan.days < 29 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800">
                              <strong>Warning:</strong> Your data span ({harmonicResults.timeSpan.days.toFixed(1)} days) is less than the recommended minimum of 29 days for reliable tidal harmonic analysis. 
                              Results may be inaccurate. For best results, use at least 29 days of continuous hourly data (ideally 365+ days for a full annual cycle).
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-3 text-teal-900">Tidal Constituents</h3>
                    
                    {harmonicResults.method.includes('T_TIDE') && (
                      <div className="mb-4 flex items-center gap-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="constituent-display"
                            checked={!showAllConstituents}
                            onChange={() => setShowAllConstituents(false)}
                            className="w-4 h-4"
                          />
                          <span className="font-semibold">Show Main 8 Constituents Only</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="constituent-display"
                            checked={showAllConstituents}
                            onChange={() => setShowAllConstituents(true)}
                            className="w-4 h-4"
                          />
                          <span className="font-semibold">Show All {Object.keys(harmonicResults.constituents).length} Constituents</span>
                        </label>
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white">
                            <th className="border border-teal-700 px-4 py-2 text-left">Constituent</th>
                            <th className="border border-teal-700 px-4 py-2 text-left">Description</th>
                            {harmonicResults.method.includes('T_TIDE') && (
                              <th className="border border-teal-700 px-4 py-2 text-right">Freq (cph)</th>
                            )}
                            <th className="border border-teal-700 px-4 py-2 text-right">Amplitude (m)</th>
                            <th className="border border-teal-700 px-4 py-2 text-right">Phase (°)</th>
                            {analysisMethod === 'admiralty' && (
                              <>
                                <th className="border border-teal-700 px-4 py-2 text-right">f factor</th>
                                <th className="border border-teal-700 px-4 py-2 text-right">u (°)</th>
                              </>
                            )}
                            {harmonicResults.method.includes('T_TIDE') && (
                              <th className="border border-teal-700 px-4 py-2 text-right">SNR</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const main8 = ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1'];
                            const allConstNames = Object.keys(harmonicResults.constituents);
                            const displayConstNames = (harmonicResults.method.includes('T_TIDE') && !showAllConstituents)
                              ? allConstNames.filter(name => main8.includes(name))
                              : allConstNames;
                            
                            return displayConstNames.map((constName, idx) => {
                              const constituent = harmonicResults.constituents[constName];
                              return (
                                <tr key={constName} className={idx % 2 === 0 ? 'bg-white' : 'bg-teal-50'}>
                                  <td className="border border-gray-300 px-4 py-2 font-semibold">{constName}</td>
                                  <td className="border border-gray-300 px-4 py-2 text-sm">{constituent.description}</td>
                                  {harmonicResults.method.includes('T_TIDE') && (
                                    <td className="border border-gray-300 px-4 py-2 text-right font-mono text-xs">{constituent.frequency?.toFixed(7)}</td>
                                  )}
                                  <td className="border border-gray-300 px-4 py-2 text-right font-mono">{constituent.amplitude.toFixed(4)}</td>
                                  <td className="border border-gray-300 px-4 py-2 text-right font-mono">{constituent.phase.toFixed(2)}</td>
                                  {analysisMethod === 'admiralty' && constituent.f !== undefined && (
                                    <>
                                      <td className="border border-gray-300 px-4 py-2 text-right font-mono">{constituent.f.toFixed(4)}</td>
                                      <td className="border border-gray-300 px-4 py-2 text-right font-mono">{constituent.u.toFixed(2)}</td>
                                    </>
                                  )}
                                  {harmonicResults.method.includes('T_TIDE') && (
                                    <td className="border border-gray-300 px-4 py-2 text-right font-mono">{constituent.snr?.toFixed(2) || 'N/A'}</td>
                                  )}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                      {analysisMethod === 'simplified' ? (
                        <p className="text-sm text-yellow-900">
                          <strong>Simplified Method:</strong> Uses basic Fourier analysis without nodal corrections. 
                          Good for quick estimates but less accurate than Admiralty or T_TIDE methods. 
                          For accurate harmonic analysis, use Admiralty method with at least 29 days of continuous hourly data.
                        </p>
                      ) : analysisMethod === 'ttide' ? (
                        <div className="text-sm text-yellow-900">
                          <p className="mb-2">
                            <strong>T_TIDE Method:</strong> Professional tidal harmonic analysis following Pawlowicz et al. (2002). 
                            Constituents are automatically selected based on the Rayleigh criterion - only frequencies that can be 
                            resolved given your data length are included in the analysis.
                          </p>
                          <p className="mb-2">
                            <strong>Rayleigh Criterion:</strong> Two constituents with frequencies f₁ and f₂ can be resolved if 
                            |f₁ - f₂| ≥ 1/(data length in hours). Your data length of {harmonicResults.timeSpan.days.toFixed(1)} days 
                            allows resolution of constituents separated by at least {(harmonicResults.minResolution * 24).toFixed(4)} cycles per day.
                          </p>
                          <p>
                            <strong>Recommended:</strong> At least 29 days for monthly constituents, 365+ days for annual constituents. 
                            Longer series improve accuracy and allow analysis of more constituents.
                          </p>
                          <p className="mt-2 text-xs">
                            Reference: Pawlowicz, R., B. Beardsley, and S. Lentz (2002), Classical tidal harmonic analysis including 
                            error estimates in MATLAB using T_TIDE, Computers & Geosciences, 28, 929-937.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-yellow-900">
                          <strong>Admiralty Method:</strong> Includes nodal corrections (f and u factors) based on 18.6-year lunar cycle. 
                          Phase is referenced to Greenwich equilibrium tide. 
                          At least 29 days of continuous data recommended; 365+ days ideal for better accuracy.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TideDataProcessor;