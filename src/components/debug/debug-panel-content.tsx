/**
 * Debug panel content component
 * Displays debug information including data sources and operation history
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Database, Activity, Clock, Settings } from 'lucide-react';
import { onDebugEvent, getAllDebugEvents, clearAllDebugEvents, type AnyDebugEvent } from '@/lib/debug/bus';
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
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Update current route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentRoute(window.location.pathname);
    }
  }, []);

  // Load existing events from global store and calculate data sources
  const loadEventsFromStore = useCallback(() => {
    const storedEvents = getAllDebugEvents();
    console.log('🔍 Debug Panel: Loading events from global store, count:', storedEvents.length);
    
    setEvents(storedEvents);

    // Calculate data source states from all events
    const newDataSources = [
      { name: 'dbAdapter', active: false, count: 0 },
      { name: 'IndexedDB', active: false, count: 0 },
      { name: 'Direct DB', active: false, count: 0 },
    ];

    storedEvents.forEach(event => {
      switch (event.type) {
        case 'dal:call':
          newDataSources[0].active = true;
          newDataSources[0].count++;
          break;
        case 'idb:op':
          newDataSources[1].active = true;
          newDataSources[1].count++;
          break;
        case 'fetch:direct':
          newDataSources[2].active = true;
          newDataSources[2].count++;
          break;
        case 'fetch:dal':
          // fetch:dal counts as dbAdapter usage since it's via DAL
          newDataSources[0].active = true;
          newDataSources[0].count++;
          break;
      }
    });

    setDataSources(newDataSources);
    console.log('🔍 Debug Panel: Updated data sources from stored events:', newDataSources);
  }, []);

  // Handle new debug events
  const handleDebugEvent = useCallback((event: AnyDebugEvent) => {
    console.log('🔍 Debug Panel: Received real-time event:', event);
    
    // Reload all events from store to ensure consistency
    loadEventsFromStore();
  }, [loadEventsFromStore]);

  // Set up event subscription once and keep it stable
  useEffect(() => {
    console.log('🔍 Debug Panel: Setting up debug panel...');
    
    // Load existing events first
    loadEventsFromStore();
    
    // Set up event subscription if not already done
    if (!subscriptionRef.current) {
      console.log('🔍 Debug Panel: Setting up event subscription...');
      const unsubscribe = onDebugEvent(handleDebugEvent);
      subscriptionRef.current = unsubscribe;
      console.log('🔍 Debug Panel: Event subscription active');
    }

    // Cleanup subscription only on unmount
    return () => {
      console.log('🔍 Debug Panel: Cleaning up event subscription');
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Clear events
  const clearEvents = () => {
    clearAllDebugEvents();
    setEvents([]);
    setDataSources(prev => prev.map(source => ({ 
      ...source, 
      active: false, 
      count: 0 
    })));
    console.log('🔍 Debug Panel: Cleared all events');
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