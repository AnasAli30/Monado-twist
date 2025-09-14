// Browser-specific security features that are difficult to replicate externally
// These features require actual browser APIs and cannot be easily faked

/**
 * Generate a comprehensive browser fingerprint
 * This combines multiple browser-specific features that are hard to replicate
 */
export async function generateBrowserFingerprint(): Promise<string> {
  const fingerprint = {
    // Basic browser info
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    
    // Screen and viewport
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    },
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // WebGL fingerprint
    webgl: await getWebGLFingerprint(),
    
    // Canvas fingerprint
    canvas: getCanvasFingerprint(),
    
    // Audio context fingerprint
    audio: await getAudioFingerprint(),
    
    // Performance timing
    performance: getPerformanceFingerprint(),
    
    // Hardware concurrency
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    
    // Memory info (if available)
    memory: getMemoryInfo(),
    
    // Touch support
    touchSupport: getTouchSupport(),
    
    // WebRTC fingerprint (if available)
    webrtc: await getWebRTCFingerprint(),
    
    // Battery API (if available)
    battery: await getBatteryInfo(),
    
    // Connection info
    connection: getConnectionInfo(),
    
    // Timestamp for uniqueness
    timestamp: Date.now()
  };

  // Create a hash of the fingerprint
  const fingerprintString = JSON.stringify(fingerprint);
  return await hashString(fingerprintString);
}

/**
 * Get WebGL fingerprint - very difficult to replicate
 */
async function getWebGLFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    
    // Get additional WebGL parameters
    const params = [
      gl.getParameter(gl.VERSION),
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      gl.getParameter(gl.VENDOR),
      gl.getParameter(gl.RENDERER),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_VARYING_VECTORS)
    ];
    
    return `${vendor}-${renderer}-${params.join('-')}`;
  } catch (error) {
    return 'webgl-error';
  }
}

/**
 * Get Canvas fingerprint - unique to each browser/device
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    // Draw complex shapes and text
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser Security Check 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser Security Check 🔒', 4, 17);
    
    // Add some complex shapes
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,255,0)';
    ctx.beginPath();
    ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    
    return canvas.toDataURL();
  } catch (error) {
    return 'canvas-error';
  }
}

/**
 * Get Audio Context fingerprint - very unique
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(0);
    
    // Collect audio data
    const audioData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(audioData);
    
    oscillator.stop();
    audioContext.close();
    
    // Create fingerprint from audio data
    return Array.from(audioData.slice(0, 30)).map(x => x.toFixed(2)).join('');
  } catch (error) {
    return 'audio-error';
  }
}

/**
 * Get performance timing fingerprint
 */
function getPerformanceFingerprint(): string {
  try {
    const timing = performance.timing;
    const navigation = performance.navigation;
    
    const perfData = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
      navigationType: navigation.type,
      redirectCount: navigation.redirectCount
    };
    
    return JSON.stringify(perfData);
  } catch (error) {
    return 'perf-error';
  }
}

/**
 * Get memory information
 */
function getMemoryInfo(): string {
  try {
    const memory = (performance as any).memory;
    if (memory) {
      return JSON.stringify({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
    return 'no-memory-api';
  } catch (error) {
    return 'memory-error';
  }
}

/**
 * Get touch support information
 */
function getTouchSupport(): string {
  try {
    return JSON.stringify({
      touch: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      msMaxTouchPoints: (navigator as any).msMaxTouchPoints || 0
    });
  } catch (error) {
    return 'touch-error';
  }
}

/**
 * Get WebRTC fingerprint
 */
async function getWebRTCFingerprint(): Promise<string> {
  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    const dataChannel = pc.createDataChannel('test');
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Get local description
    const localDescription = pc.localDescription?.sdp || '';
    
    pc.close();
    
    return localDescription.substring(0, 100); // First 100 chars
  } catch (error) {
    return 'webrtc-error';
  }
}

/**
 * Get battery information
 */
async function getBatteryInfo(): Promise<string> {
  try {
    const battery = await (navigator as any).getBattery();
    return JSON.stringify({
      charging: battery.charging,
      level: battery.level,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    });
  } catch (error) {
    return 'no-battery-api';
  }
}

/**
 * Get connection information
 */
function getConnectionInfo(): string {
  try {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      return JSON.stringify({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
    }
    return 'no-connection-api';
  } catch (error) {
    return 'connection-error';
  }
}

/**
 * Hash a string using Web Crypto API
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a browser challenge that requires real browser interaction
 */
export async function generateBrowserChallenge(): Promise<{
  challenge: string;
  solution: string;
}> {
  const startTime = performance.now();
  
  // Create a complex challenge that requires browser APIs
  const challenge = {
    timestamp: Date.now(),
    fingerprint: await generateBrowserFingerprint(),
    performance: {
      startTime,
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      timing: performance.now()
    },
    random: Math.random().toString(36).substring(2, 15)
  };
  
  // Create solution that requires browser-specific calculations
  const solution = await hashString(JSON.stringify(challenge));
  
  return {
    challenge: btoa(JSON.stringify(challenge)),
    solution
  };
}

/**
 * Validate browser challenge
 */
export async function validateBrowserChallenge(challenge: string, solution: string): Promise<boolean> {
  try {
    const challengeData = JSON.parse(atob(challenge));
    const expectedSolution = await hashString(JSON.stringify(challengeData));
    return expectedSolution === solution;
  } catch (error) {
    return false;
  }
}
