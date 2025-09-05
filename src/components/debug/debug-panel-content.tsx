/**
 * Debug panel content component
 * Displays debug information including data sources and operation history
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Database, Activity, Clock, Settings } from 'lucide-react';
import { onDebugEvent, type AnyDebugEvent } from '@/lib/debug/bus';
import { DEBUG_LS_KEY } from '@/lib/debug/flag';

interface DataSource {
  name: string;
  active: boolean;
  count: number;
}

export function DebugPanelContent() {
  const [events, setEvents] = useState<AnyDebugEvent[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { name: 'dbAdapter', active: false, count: 0 },
    { name: 'IndexedDB', active: false, count: 0 },
    { name: 'Direct DB', active: false, count: 0 },
  ]);
  const [currentRoute, setCurrentRoute] = useState('');

  // Update current route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentRoute(window.location.pathname);
    }
  }, []);

  // Handle new debug events
  const handleDebugEvent = useCallback((event: AnyDebugEvent) => {
    // Add event to history (keep last 100)
    setEvents(prev => [event, ...prev].slice(0, 100));

    // Update data source tracking
    setDataSources(prev => prev.map(source => {
      let shouldActivate = false;
      let countIncrement = 0;

      switch (event.type) {
        case 'dal:call':
          if (source.name === 'dbAdapter') {
            shouldActivate = true;
            countIncrement = 1;
          }
          break;
        case 'idb:op':
          if (source.name === 'IndexedDB') {
            shouldActivate = true;
            countIncrement = 1;
          }
          break;
        case 'fetch:direct':
          if (source.name === 'Direct DB') {
            shouldActivate = true;
            countIncrement = 1;
          }
          break;
        // fetch:dal counts as dbAdapter usage since it's via DAL
        case 'fetch:dal':
          if (source.name === 'dbAdapter') {
            shouldActivate = true;
            countIncrement = 1;
          }
          break;
      }

      return {
        ...source,
        active: source.active || shouldActivate,
        count: source.count + countIncrement,
      };
    }));
  }, []);

  // Subscribe to debug events
  useEffect(() => {
    const unsubscribe = onDebugEvent(handleDebugEvent);
    return unsubscribe;
  }, [handleDebugEvent]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Clear events
  const clearEvents = () => {
    setEvents([]);
    setDataSources(prev => prev.map(source => ({ 
      ...source, 
      active: false, 
      count: 0 
    })));
  };

  // Copy debug info to clipboard
  const copyDebugInfo = () => {
    const debugInfo = {
      route: currentRoute,
      dataSources: dataSources.filter(s => s.active),
      eventCount: events.length,
      events: events.slice(0, 10), // Last 10 events
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Current Route & Data Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources
          </CardTitle>
          <CardDescription>
            Current route: <code className="text-sm bg-muted px-1 rounded">{currentRoute}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {dataSources.map(source => {
              // Determine badge colors based on source name
              let badgeClassName = "flex items-center gap-1";
              if (source.active) {
                if (source.name === 'dbAdapter') {
                  // Green for dbAdapter
                  badgeClassName += " bg-green-500 text-white hover:bg-green-600 border-transparent";
                } else {
                  // Orange for IndexedDB and Direct DB
                  badgeClassName += " bg-orange-500 text-white hover:bg-orange-600 border-transparent";
                }
              }
              
              return (
                <Badge 
                  key={source.name}
                  variant={source.active ? 'default' : 'secondary'}
                  className={badgeClassName}
                >
                  {source.name}
                  {source.active && (
                    <span className="text-xs bg-background/20 px-1 rounded">
                      {source.count}
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operation History
          </CardTitle>
          <CardDescription>
            Recent operations (newest first) - {events.length} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No operations recorded yet. Navigate around the app to see debug events.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(0, 50).map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <code className="text-xs">{formatTime(event.timestamp)}</code>
                    <span className="font-mono">{event.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.route}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Debug Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={clearEvents}>
              Clear History
            </Button>
            <Button size="sm" variant="outline" onClick={copyDebugInfo}>
              Copy Debug Info
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => console.log('Debug Events:', events)}
            >
              Log to Console
            </Button>
          </div>
          
          <Separator />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Toggle:</strong> Set <code>{DEBUG_LS_KEY}='1'</code> in localStorage</p>
            <p><strong>Hotkey:</strong> Ctrl+Shift+D</p>
            <p><strong>Privacy:</strong> Only method names and paths are logged (no payloads)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}