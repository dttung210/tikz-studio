
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tab, ProcessingState } from './types';
import { generateTikzFromDescription, generateSvgFromTikz, generateTikzFromImage, generateDescriptionFromImage } from './services/geminiService';

const MATH_TOPICS = [
  "Hình học phẳng",
  "Hình học không gian",
  "Bảng biến thiên và Bảng xét dấu",
  "Đồ thị hàm số",
  "Lượng giác",
  "Thống kê và Biểu đồ"
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DESC_TO_TIKZ);
  const [description, setDescription] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>(MATH_TOPICS[0]);
  const [tikzCode, setTikzCode] = useState<string>('');
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [status, setStatus] = useState<ProcessingState>({ isLoading: false, error: null });
  const [compilationStep, setCompilationStep] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deepReasoning, setDeepReasoning] = useState<boolean>(true);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState({ width: 400, height: 300, top: 100, left: 100 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMovingCrop, setIsMovingCrop] = useState(false);
  
  const [startPos, setStartPos] = useState<{ x: number; y: number; initialWidth?: number; initialHeight?: number }>({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descImageInputRef = useRef<HTMLInputElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processImageFile = useCallback(async (file: File, targetTab?: Tab) => {
    if (!file.type.startsWith('image/')) {
      setStatus({ isLoading: false, error: "Tệp không phải là hình ảnh." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      // Determine which tab to process in based on current tab or forced targetTab
      const currentOrTargetTab = targetTab || activeTab;

      if (currentOrTargetTab === Tab.DESC_TO_TIKZ) {
        setStatus({ isLoading: true, error: null });
        setCompilationStep('🔎 Đang phân tích hình ảnh thành mô tả...');
        try {
          const desc = await generateDescriptionFromImage(base64);
          setDescription(desc);
          setActiveTab(Tab.DESC_TO_TIKZ);
        } catch (err) {
          setStatus({ isLoading: false, error: "Lỗi phân tích hình ảnh." });
        } finally {
          setStatus(prev => ({ ...prev, isLoading: false }));
          setCompilationStep('');
        }
      } else {
        // Default to Image to TikZ preview
        setPreviewImage(base64);
        setActiveTab(Tab.IMAGE_TO_TIKZ);
        setStatus({ isLoading: false, error: null });
      }
    };
    reader.readAsDataURL(file);
  }, [activeTab]);

  // Handle Global Paste Event for Images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile]);

  const handleDescToTikz = async () => {
    if (!description.trim()) return;
    setStatus({ isLoading: true, error: null });
    setCompilationStep(deepReasoning ? '🧠 Đang suy luận toán học chuyên sâu...' : '⚡ Đang tạo mã TikZ...');
    try {
      const fullDescription = `Chủ đề: ${selectedTopic}. Nội dung yêu cầu: ${description}`;
      const code = await generateTikzFromDescription(fullDescription, deepReasoning);
      setTikzCode(code);
    } catch (err: any) {
      setStatus({ isLoading: false, error: "Lỗi tạo mã TikZ." });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
      setCompilationStep('');
    }
  };

  const handleTikzToSvg = async () => {
    if (!tikzCode.trim()) return;
    setStatus({ isLoading: true, error: null });
    setCompilationStep('🎨 Đang vẽ hình ảnh vector...');
    setSvgOutput(''); 
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(false);
    try {
      await generateSvgFromTikz(tikzCode, deepReasoning, (currentSvg) => {
        setSvgOutput(currentSvg);
      });
    } catch (err: any) {
      setStatus({ isLoading: false, error: "Lỗi biên dịch SVG." });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
      setCompilationStep('');
    }
  };

  const handleConfirmImageCompilation = async () => {
    if (!previewImage) return;
    setStatus({ isLoading: true, error: null });
    setCompilationStep('🤖 Đang trích xuất mã TikZ từ ảnh...');
    try {
      const code = await generateTikzFromImage(previewImage, deepReasoning);
      setTikzCode(code);
    } catch (err: any) {
      setStatus({ isLoading: false, error: "Lỗi trích xuất." });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
      setCompilationStep('');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tikzCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== Tab.TIKZ_TO_SVG || !svgOutput || isCropping) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing || isMovingCrop) return;
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsResizing(false);
    setIsMovingCrop(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (activeTab !== Tab.TIKZ_TO_SVG || !svgOutput || isCropping) return;
    e.preventDefault();
    const scaleFactor = 0.1;
    const newZoom = e.deltaY < 0 ? zoom + scaleFactor : Math.max(0.1, zoom - scaleFactor);
    setZoom(newZoom);
  };

  const startMoveCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMovingCrop(true);
    setStartPos({ x: e.clientX - cropBox.left, y: e.clientY - cropBox.top });
  };

  const startResizeCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY, initialWidth: cropBox.width, initialHeight: cropBox.height });
  };

  const onGlobalMouseMove = (e: MouseEvent) => {
    if (isMovingCrop) {
      setCropBox(prev => ({ ...prev, left: e.clientX - startPos.x, top: e.clientY - startPos.y }));
    } else if (isResizing) {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      setCropBox(prev => ({
        ...prev,
        width: Math.max(50, (startPos.initialWidth || 0) + dx),
        height: Math.max(50, (startPos.initialHeight || 0) + dy)
      }));
    }
  };

  useEffect(() => {
    if (isMovingCrop || isResizing) {
      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMovingCrop, isResizing, startPos]);

  const downloadCroppedImage = async () => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 3; 
    canvas.width = cropBox.width * scale;
    canvas.height = cropBox.height * scale;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const containerRect = svgContainerRef.current!.getBoundingClientRect();
      const cropRect = cropRef.current!.getBoundingClientRect();
      ctx.scale(scale, scale);
      const contentEl = svgContainerRef.current!.querySelector('.svg-content') as HTMLElement;
      const contentRect = contentEl.getBoundingClientRect();
      const drawX = (contentRect.left - cropRect.left);
      const drawY = (contentRect.top - cropRect.top);
      ctx.drawImage(img, drawX, drawY, contentRect.width, contentRect.height);
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `tikz_export_${Date.now()}.png`;
      downloadLink.click();
      URL.revokeObjectURL(url);
      setIsCropping(false);
    };
    img.src = url;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      {/* Navigation Header */}
      <nav className="bg-teal-900 border-b-4 border-teal-500 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-6 flex justify-between items-center h-20">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
              <span className="text-teal-900 font-black text-2xl">Σ</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">TikZ <span className="text-teal-400">Master</span></h1>
              <p className="text-[10px] font-bold text-teal-300 uppercase tracking-widest mt-1">AI Mathematical Studio</p>
            </div>
          </div>
          
          <div className="flex items-center bg-teal-800/50 p-1.5 rounded-2xl border-2 border-teal-700 shadow-inner">
            {[
              { id: Tab.DESC_TO_TIKZ, label: 'Mô tả → TikZ' },
              { id: Tab.TIKZ_TO_SVG, label: 'Biên dịch Hình' },
              { id: Tab.IMAGE_TO_TIKZ, label: 'Ảnh → TikZ' }
            ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)} 
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === t.id ? 'bg-teal-400 text-teal-950 shadow-lg scale-105' : 'text-teal-200 hover:text-white hover:bg-teal-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 bg-teal-800 px-5 py-2.5 rounded-2xl border-2 border-teal-600 shadow-sm">
              <span className={`text-[10px] font-black uppercase tracking-widest ${deepReasoning ? 'text-teal-200' : 'text-teal-500'}`}>
                {deepReasoning ? '🧠 Deep Think' : '⚡ Fast Mode'}
              </span>
              <button onClick={() => setDeepReasoning(!deepReasoning)} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ${deepReasoning ? 'bg-teal-400' : 'bg-teal-700'}`}>
                <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-lg transition-transform ${deepReasoning ? 'translate-x-6.5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* INPUT COLUMN */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white rounded-[40px] shadow-2xl border-2 border-teal-200 flex flex-col flex-1 overflow-hidden panel-card">
            <div className="px-8 py-6 bg-gradient-to-r from-teal-700 to-teal-800 flex justify-between items-center shadow-lg">
              <div className="flex items-center space-x-3 text-white">
                <div className="p-2 bg-teal-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </div>
                <h2 className="font-black uppercase tracking-[0.2em] text-[13px]">Bảng Điều Khiển Input</h2>
              </div>
              {status.isLoading && (
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce"></div>
                </div>
              )}
            </div>
            
            <div className="p-8 flex-1 flex flex-col overflow-hidden bg-teal-50/20">
              {activeTab === Tab.DESC_TO_TIKZ && (
                <div className="flex-1 flex flex-col space-y-8">
                  
                  <div className="flex flex-col w-full" ref={dropdownRef}>
                    <label className="text-[12px] font-black text-teal-900 uppercase tracking-widest mb-3 ml-2">1. Chọn chủ đề toán học</label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-full flex items-center justify-between bg-white border-4 rounded-3xl px-8 py-5 text-base font-bold transition-all shadow-xl ${isMenuOpen ? 'border-teal-600 ring-8 ring-teal-500/10' : 'border-teal-100 hover:border-teal-400'}`}
                      >
                        <span className={isMenuOpen ? 'text-teal-700' : 'text-slate-900'}>
                          {selectedTopic}
                        </span>
                        <svg className={`w-7 h-7 text-teal-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div className="absolute left-0 right-0 mt-3 bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-4 border-teal-600 z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
                          <div className="max-h-96 overflow-y-auto">
                            {MATH_TOPICS.map((topic, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedTopic(topic);
                                  setIsMenuOpen(false);
                                }}
                                className={`w-full text-left px-10 py-5 text-[15px] font-extrabold transition-all border-b border-teal-50 last:border-none ${selectedTopic === topic ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-700'}`}
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative flex-1 flex flex-col">
                    <label className="text-[12px] font-black text-teal-900 uppercase tracking-widest mb-3 ml-2 flex justify-between items-center">
                      <span>2. Mô tả yêu cầu hình vẽ</span>
                      <span className="text-[10px] text-teal-500 lowercase normal-case italic">Có thể dán ảnh từ Clipboard (Ctrl+V)</span>
                    </label>
                    <div className="relative flex-1">
                      <textarea
                        className="w-full h-full p-8 rounded-[32px] border-4 border-teal-100 bg-white focus:ring-12 focus:ring-teal-500/10 focus:border-teal-600 resize-none outline-none font-bold text-slate-900 leading-relaxed shadow-2xl transition-all placeholder:text-slate-300 input-shadow"
                        placeholder={`Nhập mô tả hoặc dán ảnh (Ctrl+V) cho ${selectedTopic.toLowerCase()}... (VD: Tam giác ABC cân tại A, đường cao AH nét liền)`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <button 
                        onClick={() => descImageInputRef.current?.click()}
                        className="absolute bottom-8 right-8 bg-teal-600 text-white p-5 rounded-3xl shadow-2xl hover:bg-teal-700 transition-all active:scale-90 border-4 border-white"
                        title="Quét từ hình ảnh"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </button>
                    </div>
                    <input type="file" ref={descImageInputRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0], Tab.DESC_TO_TIKZ)} />
                  </div>
                  
                  <button 
                    onClick={handleDescToTikz} 
                    disabled={status.isLoading || !description.trim()} 
                    className="w-full bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 text-white py-6 rounded-[32px] hover:shadow-[0_20px_40px_rgba(13,148,136,0.4)] active:scale-[0.97] disabled:opacity-40 font-black tracking-widest transition-all uppercase text-base shadow-2xl border-b-8 border-teal-900"
                  >
                    BẮT ĐẦU BIÊN DỊCH TIKZ 🚀
                  </button>
                </div>
              )}

              {activeTab === Tab.TIKZ_TO_SVG && (
                <div className="flex-1 flex flex-col">
                  <label className="text-[12px] font-black text-teal-900 uppercase tracking-widest mb-3 ml-2">Mã nguồn TikZ (Latex)</label>
                  <textarea
                    className="w-full flex-1 p-8 rounded-[32px] bg-slate-900 text-emerald-400 font-mono text-base focus:ring-12 focus:ring-teal-500/20 outline-none resize-none shadow-2xl border-4 border-slate-700 selection:bg-teal-500"
                    placeholder="% Dán mã TikZ của bạn tại đây để vẽ hình..."
                    value={tikzCode}
                    onChange={(e) => setTikzCode(e.target.value)}
                  />
                  <button onClick={handleTikzToSvg} disabled={status.isLoading || !tikzCode.trim()} className="mt-8 w-full bg-gradient-to-r from-teal-600 to-emerald-700 text-white py-6 rounded-[32px] font-black tracking-widest uppercase text-base shadow-2xl border-b-8 border-teal-900 active:scale-[0.97] transition-all">
                    VẼ HÌNH VECTOR NGAY 🎨
                  </button>
                </div>
              )}

              {activeTab === Tab.IMAGE_TO_TIKZ && (
                <div className="flex-1 flex flex-col space-y-8">
                  {!previewImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-4 border-dashed border-teal-300 rounded-[50px] flex flex-col items-center justify-center p-12 bg-white hover:border-teal-600 hover:bg-teal-50/20 transition-all cursor-pointer group shadow-2xl relative"
                    >
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])} className="hidden" />
                      <div className="w-28 h-28 bg-teal-100 rounded-full shadow-2xl flex items-center justify-center text-6xl mb-8 group-hover:scale-125 group-hover:rotate-6 transition-transform">📸</div>
                      <p className="text-teal-950 font-black text-2xl uppercase tracking-wider">TẢI HOẶC DÁN ẢNH</p>
                      <p className="text-slate-500 text-sm mt-4 font-bold text-center max-w-[320px]">Nhấp để tải hoặc Ctrl+V để dán ảnh từ clipboard</p>
                      <div className="absolute bottom-6 px-4 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Hỗ trợ dán ảnh trực tiếp</div>
                    </div>
                  ) : (
                    <>
                      <div className="relative flex-1 rounded-[50px] overflow-hidden border-8 border-white bg-slate-100 flex items-center justify-center p-8 shadow-inner shadow-2xl">
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-3xl" />
                        <button onClick={() => setPreviewImage(null)} className="absolute top-8 right-8 bg-rose-600 text-white w-14 h-14 rounded-full shadow-2xl hover:bg-rose-700 transition-all hover:scale-110 flex items-center justify-center text-xl font-black">✕</button>
                      </div>
                      <button onClick={handleConfirmImageCompilation} disabled={status.isLoading} className="w-full bg-gradient-to-r from-teal-600 to-emerald-700 text-white py-6 rounded-[32px] font-black tracking-widest uppercase shadow-2xl border-b-8 border-teal-900 transition-all active:scale-[0.97]">
                        TRÍCH XUẤT MÃ TIKZ 🤖
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white rounded-[40px] shadow-2xl border-2 border-teal-200 flex flex-col flex-1 overflow-hidden relative panel-card">
            <div className="px-8 py-6 bg-teal-900 flex justify-between items-center z-10 shadow-lg">
              <div className="flex items-center space-x-3 text-white">
                <div className="p-2 bg-teal-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
                <h2 className="font-black uppercase tracking-[0.2em] text-[13px]">
                  {activeTab === Tab.TIKZ_TO_SVG ? 'Kết quả hiển thị' : 'Kết quả mã nguồn'}
                </h2>
              </div>
              <div className="flex space-x-3">
                {tikzCode && activeTab !== Tab.TIKZ_TO_SVG && (
                  <button onClick={handleCopyCode} className={`text-[12px] font-black px-8 py-3 rounded-2xl uppercase tracking-widest transition-all border-b-4 shadow-xl ${copySuccess ? 'bg-emerald-600 text-white border-emerald-800' : 'bg-white text-teal-900 border-teal-200 hover:border-teal-400'}`}>
                    {copySuccess ? 'Xong ✓' : 'Copy Mã'}
                  </button>
                )}
                {activeTab === Tab.TIKZ_TO_SVG && svgOutput && (
                  <>
                    {!isCropping ? (
                      <button onClick={() => setIsCropping(true)} className="text-[12px] font-black bg-teal-500 text-teal-950 px-8 py-3 rounded-2xl uppercase tracking-widest hover:bg-teal-400 transition-all shadow-xl border-b-4 border-teal-700">
                        Cắt & Lưu ✂️
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setIsCropping(false)} className="text-[12px] font-black bg-white text-rose-800 px-6 py-3 rounded-2xl uppercase border-b-4 border-slate-200 hover:bg-rose-50">Hủy</button>
                        <button onClick={downloadCroppedImage} className="text-[12px] font-black bg-emerald-600 text-white px-8 py-3 rounded-2xl uppercase hover:bg-emerald-500 transition-all shadow-xl border-b-4 border-emerald-800">Lưu PNG ✓</button>
                      </>
                    )}
                    <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="text-[12px] font-black bg-teal-800 text-white px-6 py-3 rounded-2xl border-2 border-teal-600 hover:bg-teal-700 transition-all">Reset</button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50">
              {status.isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white/90 backdrop-blur-3xl z-30">
                  <div className="relative">
                    <div className="w-32 h-32 border-[12px] border-teal-100 border-t-teal-600 rounded-[40px] animate-spin shadow-2xl"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-teal-800 text-2xl">AI</div>
                  </div>
                  <p className="mt-10 text-base font-black text-teal-950 uppercase tracking-[0.6em] animate-pulse">{compilationStep}</p>
                </div>
              ) : activeTab === Tab.TIKZ_TO_SVG ? (
                <div 
                  ref={svgContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  className={`flex-1 flex items-center justify-center overflow-hidden relative bg-white ${isCropping ? 'cursor-default' : (isPanning ? 'cursor-grabbing' : svgOutput ? 'cursor-grab' : 'cursor-default')}`}
                >
                  {svgOutput ? (
                    <div 
                      className="svg-content absolute transition-transform duration-75 select-none pointer-events-none drop-shadow-2xl"
                      style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
                      dangerouslySetInnerHTML={{ __html: svgOutput }} 
                    />
                  ) : (
                    <div className="flex flex-col items-center opacity-10 select-none grayscale contrast-200">
                      <span className="text-[180px] mb-8">📐</span>
                      <p className="font-black text-5xl uppercase tracking-[1em] text-teal-950">VÙNG VẼ</p>
                    </div>
                  )}

                  {isCropping && (
                    <div className="absolute inset-0 bg-teal-950/80 z-20 pointer-events-none">
                      <div 
                        ref={cropRef}
                        className="absolute border-8 border-teal-400 bg-white/10 shadow-[0_0_0_9999px_rgba(13,148,136,0.6)] pointer-events-auto cursor-move"
                        style={{ width: `${cropBox.width}px`, height: `${cropBox.height}px`, top: `${cropBox.top}px`, left: `${cropBox.left}px` }}
                        onMouseDown={startMoveCrop}
                      >
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-teal-500 cursor-nwse-resize flex items-center justify-center shadow-2xl border-4 border-white" onMouseDown={startResizeCrop}>
                          <div className="w-6 h-6 bg-white rounded-full"></div>
                        </div>
                        <div className="absolute -top-16 left-0 bg-teal-600 text-white text-[12px] px-6 py-3 rounded-2xl font-black uppercase tracking-widest whitespace-nowrap shadow-2xl">VÙNG XUẤT ẢNH PNG</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-10 overflow-hidden bg-slate-100">
                  <div className="flex-1 relative group mb-8">
                    <textarea 
                      readOnly 
                      className="w-full h-full p-10 bg-slate-900 text-emerald-400 font-mono text-base rounded-[40px] outline-none resize-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-slate-800 selection:bg-teal-600 selection:text-white" 
                      value={tikzCode} 
                      placeholder="% Mã nguồn TikZ sẽ hiện thị tại đây..."
                    />
                  </div>
                  <div className="p-8 bg-white rounded-[40px] border-4 border-teal-200 shadow-2xl flex items-start space-x-8">
                    <div className="w-16 h-16 bg-teal-600 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-2xl">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                      <p className="text-[14px] text-teal-950 font-black uppercase tracking-[0.2em] mb-2">💡 HƯỚNG DẪN CHUẨN HÓA</p>
                      <p className="text-base text-slate-700 leading-relaxed font-bold">
                        Hệ thống tự động sử dụng <span className="text-teal-700 underline decoration-2">NÉT LIỀN (SOLID)</span> cho hình phẳng. Nếu kết quả chưa ưng ý, hãy dùng <span className="text-teal-700">Deep Think</span> để AI tính toán tọa độ chính xác hơn cho các đường cao và trung tuyến.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {status.error && (
        <div className="fixed bottom-14 right-14 bg-rose-700 text-white px-12 py-8 rounded-[40px] shadow-[0_35px_60px_-15px_rgba(190,18,60,0.4)] z-[100] animate-bounce flex items-center space-x-8 border-8 border-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black">!</div>
          <div className="flex-1">
            <p className="font-black text-xs uppercase tracking-widest opacity-80">THÔNG BÁO LỖI</p>
            <p className="font-extrabold text-lg mt-1">{status.error}</p>
          </div>
          <button onClick={() => setStatus({ ...status, error: null })} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
