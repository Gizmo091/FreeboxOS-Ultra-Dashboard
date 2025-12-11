import { useEffect, useRef, useCallback, useState } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useSystemStore } from '../stores/systemStore';
import type { ConnectionStatus } from '../types/api';

interface SystemStatusData {
  temp_cpu0?: number;
  temp_cpu1?: number;
  temp_cpu2?: number;
  temp_cpu3?: number;
  temp_cpum?: number;
  temp_cpub?: number;
  temp_sw?: number;
  fan_rpm?: number;
  uptime_val?: number;
}

interface WebSocketMessage {
  type: 'connection_status' | 'system_status';
  data: ConnectionStatus | SystemStatusData;
}

interface UseConnectionWebSocketOptions {
  enabled?: boolean;
}

/**
 * Hook to manage WebSocket connection for real-time connection status updates
 * Replaces polling for /api/connection
 */
export function useConnectionWebSocket(options: UseConnectionWebSocketOptions = {}) {
  const { enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { fetchConnectionStatus } = useConnectionStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Build WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/connection`;

    console.log('[WS Client] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Client] Connected');
      setIsConnected(true);
      // Do an initial fetch to get current state immediately
      fetchConnectionStatus();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === 'connection_status' && message.data) {
          const status = message.data as ConnectionStatus;

          // Update the store directly
          useConnectionStore.setState((state) => {
            const newPoint = {
              time: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              download: Math.round(status.rate_down / 1024),
              upload: Math.round(status.rate_up / 1024)
            };

            return {
              status,
              error: null,
              history: [...state.history.slice(-59), newPoint]
            };
          });
        } else if (message.type === 'system_status' && message.data) {
          const systemData = message.data as SystemStatusData;

          // Update system store with real-time data
          useSystemStore.setState((state) => {
            // Calculate CPU temp: average of Ultra cores or use legacy cpum
            let cpuM: number | undefined;
            if (systemData.temp_cpu0 != null) {
              // Ultra: average of 4 CPU cores
              const temps = [
                systemData.temp_cpu0,
                systemData.temp_cpu1,
                systemData.temp_cpu2,
                systemData.temp_cpu3
              ].filter((t): t is number => t != null);
              cpuM = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : undefined;
            } else {
              cpuM = systemData.temp_cpum;
            }

            const newPoint = {
              time: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              cpuM,
              cpuB: systemData.temp_cpub,
              sw: systemData.temp_sw
            };

            // Update info with latest values
            const updatedInfo = state.info ? {
              ...state.info,
              temp_cpu0: systemData.temp_cpu0,
              temp_cpu1: systemData.temp_cpu1,
              temp_cpu2: systemData.temp_cpu2,
              temp_cpu3: systemData.temp_cpu3,
              temp_cpum: systemData.temp_cpum ?? cpuM,
              temp_cpub: systemData.temp_cpub,
              temp_sw: systemData.temp_sw,
              fan_rpm: systemData.fan_rpm,
              uptime_val: systemData.uptime_val ?? state.info.uptime_val
            } : null;

            return {
              info: updatedInfo,
              temperatureHistory: [...state.temperatureHistory.slice(-59), newPoint]
            };
          });
        }
      } catch (error) {
        console.error('[WS Client] Failed to parse message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS Client] Disconnected:', event.code, event.reason);
      setIsConnected(false);
      wsRef.current = null;

      // Reconnect after delay if still enabled
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS Client] Attempting reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS Client] Error:', error);
    };
  }, [enabled, fetchConnectionStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { isConnected };
}
