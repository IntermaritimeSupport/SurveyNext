// src/components/admin/BrowserInfoCard.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe, Wifi, Monitor, Cpu, Languages, Cookie, BatteryCharging, Clock, Cloud } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Interfaz para la información que recibimos del backend
interface BackendClientInfo {
  ipAddress: string;
  userAgentFromHeaders: string;
  timestamp: string;
}

// Interfaz para el estado completo en el frontend
interface BrowserInfo {
  ipAddress: string;
  userAgent: string; // Del navegador
  latencyMs: number | null; // Latencia a la API
  browserLanguage: string;
  platform: string;
  cookieEnabled: boolean;
  screenResolution: string;
  deviceMemory: string; // Ej. "4 GB"
  hardwareConcurrency: number | null;
  networkType: string; // Ej. "4g", "wifi"
  batteryLevel: string | null;
  batteryCharging: boolean | null;
  error: string | null;
}

export function BrowserInfoCard() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({
    ipAddress: 'Cargando...',
    userAgent: 'Cargando...',
    latencyMs: null,
    browserLanguage: 'Cargando...',
    platform: 'Cargando...',
    cookieEnabled: false,
    screenResolution: 'Cargando...',
    deviceMemory: 'Cargando...',
    hardwareConcurrency: null,
    networkType: 'Cargando...',
    batteryLevel: null,
    batteryCharging: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndSetBrowserInfo = async () => {
      setLoading(true);
      try {
        const startTime = performance.now(); // Marca de tiempo antes de la llamada

        const response = await fetch(`${API_BASE_URL}/api/client-info`);
        if (!response.ok) {
          throw new Error(`Error al cargar la información del cliente: ${response.status}`);
        }
        const data: BackendClientInfo = await response.json();
        
        const endTime = performance.now(); // Marca de tiempo después de la llamada
        const latency = Math.round(endTime - startTime); // Latencia aproximada

        // Información del navegador (lado cliente)
        const userAgent = navigator.userAgent;
        const browserLanguage = navigator.language;
        const platform = navigator.platform;
        const cookieEnabled = navigator.cookieEnabled;
        const screenResolution = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x)`;
        const deviceMemory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'N/A';
        const hardwareConcurrency = navigator.hardwareConcurrency;
        
        // Info de conexión (experimental y no siempre disponible)
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const networkType = connection ? (connection.effectiveType || connection.type || 'Desconocido') : 'N/A';

        // Info de batería (requiere await)
        let batteryLevel = null;
        let batteryCharging = null;
        if ('getBattery' in navigator) {
            try {
                const battery = await (navigator as any).getBattery();
                batteryLevel = (battery.level * 100).toFixed(0) + '%';
                batteryCharging = battery.charging;
            } catch (batteryErr) {
                console.warn("Could not get battery info:", batteryErr);
            }
        }


        setBrowserInfo({
          ipAddress: data.ipAddress,
          userAgent: userAgent,
          latencyMs: latency,
          browserLanguage: browserLanguage,
          platform: platform,
          cookieEnabled: cookieEnabled,
          screenResolution: screenResolution,
          deviceMemory: deviceMemory,
          hardwareConcurrency: hardwareConcurrency,
          networkType: networkType,
          batteryLevel: batteryLevel,
          batteryCharging: batteryCharging,
          error: null,
        });
      } catch (err: any) {
        console.error("Error fetching browser info:", err);
        setBrowserInfo(prev => ({ ...prev, error: err.message || "Error al cargar la información del navegador." }));
      } finally {
        setLoading(false);
      }
    };
    fetchAndSetBrowserInfo();
  }, []);

  return (
    <Card className="survey-card col-span-1 md:col-span-2 lg:col-span-2"> {/* Más ancha para más info */}
      <CardHeader>
        <CardTitle>Información de tu Navegador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            <p className="ml-2 text-sm text-slate-500">Cargando información del navegador...</p>
          </div>
        ) : browserInfo.error ? (
          <Alert variant="destructive">
            <AlertDescription>{browserInfo.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Globe className="h-4 w-4" /> IP Pública</span>
              <span className="text-sm font-medium break-all text-right max-w-[65%]">{browserInfo.ipAddress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Clock className="h-4 w-4" /> Latencia a API</span>
              <span className="text-sm font-medium">{browserInfo.latencyMs !== null ? `${browserInfo.latencyMs} ms` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Monitor className="h-4 w-4" /> Resolución</span>
              <span className="text-sm font-medium">{browserInfo.screenResolution}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Languages className="h-4 w-4" /> Idioma</span>
              <span className="text-sm font-medium">{browserInfo.browserLanguage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU Cores</span>
              <span className="text-sm font-medium">{browserInfo.hardwareConcurrency || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Wifi className="h-4 w-4" /> Tipo de Red</span>
              <span className="text-sm font-medium">{browserInfo.networkType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Cloud className="h-4 w-4" /> Memoria (estimada)</span>
              <span className="text-sm font-medium">{browserInfo.deviceMemory}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><Cookie className="h-4 w-4" /> Cookies</span>
              <span className="text-sm font-medium">{browserInfo.cookieEnabled ? 'Habilitadas' : 'Deshabilitadas'}</span>
            </div>
            {browserInfo.batteryLevel && (
                 <div className="flex items-center justify-between col-span-1">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><BatteryCharging className="h-4 w-4" /> Batería</span>
                    <span className="text-sm font-medium">{browserInfo.batteryLevel} {browserInfo.batteryCharging !== null ? (browserInfo.batteryCharging ? '(Cargando)' : '(Descargando)') : ''}</span>
                 </div>
            )}
            <div className="col-span-full">
              <p className="text-xs text-slate-500 break-all mt-3">
                <span className="font-medium">User Agent:</span> {browserInfo.userAgent}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}