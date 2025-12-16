'use client';

import { useEffect, useRef } from 'react';

interface BrowserInfo {
  name: string;
  version: string;
}

interface OSInfo {
  name: string;
  version: string;
}

type DeviceType = 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';

// Parse browser name and version from user agent
function getBrowserInfo(userAgent: string): BrowserInfo {
  const browsers = [
    { name: 'Edge', regex: /Edg(?:e|A|iOS)?\/(\d+[\d.]*)/ },
    { name: 'Opera', regex: /(?:OPR|Opera)\/(\d+[\d.]*)/ },
    { name: 'Chrome', regex: /Chrome\/(\d+[\d.]*)/ },
    { name: 'Safari', regex: /Version\/(\d+[\d.]*).*Safari/ },
    { name: 'Firefox', regex: /Firefox\/(\d+[\d.]*)/ },
    { name: 'IE', regex: /(?:MSIE |Trident.*rv:)(\d+[\d.]*)/ },
    { name: 'Samsung Internet', regex: /SamsungBrowser\/(\d+[\d.]*)/ },
    { name: 'UC Browser', regex: /UCBrowser\/(\d+[\d.]*)/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return { name: browser.name, version: match[1] || 'Unknown' };
    }
  }

  return { name: 'Unknown', version: 'Unknown' };
}

// Parse OS name and version from user agent
function getOSInfo(userAgent: string): OSInfo {
  const osPatterns = [
    { name: 'Windows 11', regex: /Windows NT 10.*Win64/ },
    { name: 'Windows 10', regex: /Windows NT 10/ },
    { name: 'Windows 8.1', regex: /Windows NT 6\.3/ },
    { name: 'Windows 8', regex: /Windows NT 6\.2/ },
    { name: 'Windows 7', regex: /Windows NT 6\.1/ },
    { name: 'Windows Vista', regex: /Windows NT 6\.0/ },
    { name: 'Windows XP', regex: /Windows NT 5\.1/ },
    { name: 'macOS', regex: /Mac OS X (\d+[._]\d+[._]?\d*)/ },
    { name: 'iOS', regex: /(?:iPhone|iPad|iPod).*OS (\d+[._]\d+)/ },
    { name: 'Android', regex: /Android (\d+[\d.]*)/ },
    { name: 'Linux', regex: /Linux/ },
    { name: 'Chrome OS', regex: /CrOS/ },
    { name: 'Ubuntu', regex: /Ubuntu/ },
  ];

  for (const os of osPatterns) {
    const match = userAgent.match(os.regex);
    if (match) {
      let version = 'Unknown';
      if (match[1]) {
        version = match[1].replace(/_/g, '.');
      }
      return { name: os.name, version };
    }
  }

  return { name: 'Unknown', version: 'Unknown' };
}

// Detect device type
function getDeviceType(userAgent: string): DeviceType {
  // Check for tablets first (more specific)
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) {
    return 'Tablet';
  }
  
  // Check for mobile devices
  if (/Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Opera Mobi/i.test(userAgent)) {
    return 'Mobile';
  }
  
  // Default to desktop
  return 'Desktop';
}

// Get approximate RAM in GB (only works in some browsers)
function getRAMInGB(): number | null {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    return (navigator as any).deviceMemory;
  }
  return null;
}

// Get number of CPU cores
function getCPUCores(): number | null {
  if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
    return navigator.hardwareConcurrency;
  }
  return null;
}

// Collect all visitor data
function collectVisitorData() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo(userAgent);
  const osInfo = getOSInfo(userAgent);

  return {
    browserName: browserInfo.name,
    browserVersion: browserInfo.version,
    osName: osInfo.name,
    osVersion: osInfo.version,
    deviceType: getDeviceType(userAgent),
    cpuCores: getCPUCores(),
    ramGb: getRAMInGB(),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    userAgent: userAgent,
    language: navigator.language || 'Unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
    referrer: document.referrer || '',
  };
}

// Custom hook for visitor tracking
export function useVisitorTracking() {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;
    
    // Check if already tracked in this session
    const sessionKey = 'visitor_tracked';
    if (sessionStorage.getItem(sessionKey)) {
      hasTracked.current = true;
      return;
    }

    const trackVisitor = async () => {
      try {
        const visitorData = collectVisitorData();
        if (!visitorData) return;

        const response = await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(visitorData),
          credentials: 'include',
        });

        if (response.ok) {
          // Mark as tracked for this session
          sessionStorage.setItem(sessionKey, 'true');
          hasTracked.current = true;
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Visitor tracking failed:', error);
      }
    };

    // Small delay to not block initial page render
    const timeoutId = setTimeout(trackVisitor, 1000);

    return () => clearTimeout(timeoutId);
  }, []);
}

// Export helper functions for testing
export { collectVisitorData, getBrowserInfo, getOSInfo, getDeviceType };

