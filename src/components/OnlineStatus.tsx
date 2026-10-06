"use client";

import { useEffect, useState } from "react";
import { OfflineQueue } from "@/lib/offlineQueue";

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflictCount, setConflictCount] = useState(0); // For advanced conflict tracking

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const updateQueueCount = async () => {
      const count = await OfflineQueue.getQueueCount();
      setQueueCount(count);
    };

    updateQueueCount();

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await OfflineQueue.processQueue();
      // In a real scenario, here we check for returned 409 Conflicts from the server
      await updateQueueCount();
      setIsSyncing(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Poll the queue occasionally
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueCount === 0 && !isSyncing && conflictCount === 0) {
    return null; // Hidden when everything is perfect
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      
      {conflictCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="animate-pulse">⚠️</span>
          <div className="text-sm font-medium">
            <span className="font-bold">{conflictCount} Conflictos de Sincronización</span>
            <p className="text-xs text-red-200">Requiere resolución manual en Gerencia.</p>
          </div>
        </div>
      )}

      <div className={`px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm font-medium transition-all ${
        !isOnline ? "bg-amber-500 text-amber-950" : 
        isSyncing ? "bg-blue-600 text-white" : 
        "bg-zinc-800 text-white"
      }`}>
        {!isOnline && (
          <>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            <span>Estás operando Sin Conexión (Offline)</span>
            {queueCount > 0 && <span className="ml-2 px-2 py-0.5 bg-amber-600 text-white rounded text-xs">{queueCount} pend.</span>}
          </>
        )}
        
        {isOnline && isSyncing && (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Sincronizando {queueCount} operaciones...</span>
          </>
        )}

        {isOnline && !isSyncing && queueCount > 0 && (
          <>
            <span className="text-amber-400">⚠️</span>
            <span>Esperando sincronizar ({queueCount})</span>
            <button 
              onClick={async () => {
                setIsSyncing(true);
                await OfflineQueue.processQueue();
                setQueueCount(await OfflineQueue.getQueueCount());
                setIsSyncing(false);
              }}
              className="ml-2 text-xs underline hover:text-amber-200"
            >
              Forzar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
