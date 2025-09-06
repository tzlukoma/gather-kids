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
import { Database, Activity, Clock, Settings, MapPin } from 'lucide-react';
import { onDebugEvent, getAllDebugEvents, clearAllDebugEvents, type AnyDebugEvent } from '@/lib/debug/bus';
import { DEBUG_LS_KEY } from '@/lib/debug/flag';

interface DataSource {
  name: string;
  active: boolean;
  count: number;
}

export function DebugPanelContent() {
  const [events, setEvents] = useState<AnyDebugEvent[]>([]);
  const [allDataSources, setAllDataSources] = useState<DataSource[]>([
    { name: 'dbAdapter', active: false, count: 0 },
    { name: 'IndexedDB', active: false, count: 0 },
    { name: 'Direct DB', active: false, count: 0 },
  ]);
  const [routeDataSources, setRouteDataSources] = useState<DataSource[]>([
    { name: 'dbAdapter', active: false, count: 0 },
    { name: 'IndexedDB', active: false, count: 0 },
    { name: 'Direct DB', active: false, count: 0 },
  ]);
  const [currentRoute, setCurrentRoute] = useState('');
  const [routeEvents, setRouteEvents] = useState<AnyDebugEvent[]>([]);
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Update current route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentRoute(window.location.pathname);
    }
  }, []);

  // Calculate data source counts from events
  const calculateDataSources = useCallback((eventsToAnalyze: AnyDebugEvent[]) => {
    const sources = [
      { name: 'dbAdapter', active: false, count: 0 },
      { name: 'IndexedDB', active: false, count: 0 },
      { name: 'Direct DB', active: false, count: 0 },
    ];

    eventsToAnalyze.forEach(event => {
      switch (event.type) {
        case 'dal:call':
          sources[0].active = true;
          sources[0].count++;
          break;
        case 'idb:op':
          sources[1].active = true;
          sources[1].count++;
          break;
        case 'fetch:direct':
          sources[2].active = true;
          sources[2].count++;
          break;
        case 'fetch:dal':
          // fetch:dal counts as dbAdapter usage since it's via DAL
          sources[0].active = true;
          sources[0].count++;
          break;
      }
    });

    return sources;
  }, []);

  // Load existing events from global store and calculate data sources
  const loadEventsFromStore = useCallback(() => {
    const storedEvents = getAllDebugEvents();
    console.log('🔍 Debug Panel: Loading events from global store, count:', storedEvents.length);
    
    setEvents(storedEvents);

    // Calculate data source states from all events
    const newAllDataSources = calculateDataSources(storedEvents);
    setAllDataSources(newAllDataSources);

    // Filter events for current route and calculate route-specific data sources
    const currentRouteEvents = storedEvents.filter(event => event.route === currentRoute);
    setRouteEvents(currentRouteEvents);
    
    const newRouteDataSources = calculateDataSources(currentRouteEvents);
    setRouteDataSources(newRouteDataSources);

    console.log('🔍 Debug Panel: Updated data sources - All:', newAllDataSources, 'Route:', newRouteDataSources);
  }, [currentRoute, calculateDataSources]);

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

  // Re-calculate route-specific data when route or events change
  useEffect(() => {
    loadEventsFromStore();
  }, [currentRoute, loadEventsFromStore]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Clear events
  const clearEvents = () => {
    clearAllDebugEvents();
    setEvents([]);
    setRouteEvents([]);
    setAllDataSources(prev => prev.map(source => ({ 
      ...source, 
      active: false, 
      count: 0 
    })));
    setRouteDataSources(prev => prev.map(source => ({ 
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
      routeDataSources: routeDataSources.filter(s => s.active),
      allDataSources: allDataSources.filter(s => s.active),
      routeEventCount: routeEvents.length,
      totalEventCount: events.length,
      routeEvents: routeEvents.slice(0, 10),
      allEvents: events.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
  };

  // Render data source badges
  const renderDataSourceBadges = (dataSources: DataSource[]) => {
    return dataSources.map(source => {
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
    });
  };

  // Render operation list
  const renderOperations = (operationEvents: AnyDebugEvent[], maxHeight = 'max-h-40') => {
    if (operationEvents.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          No operations recorded for this route yet.
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${maxHeight} overflow-y-auto`}>
        {operationEvents.map((event, index) => (
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Route Data Sources - Route Specific */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Current Route Data Sources
          </CardTitle>
          <CardDescription>
            Data sources used on: <code className="text-sm bg-muted px-1 rounded">{currentRoute}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {renderDataSourceBadges(routeDataSources)}
          </div>
          {routeDataSources.every(s => !s.active) && (
            <div className="text-center text-muted-foreground py-2 text-sm">
              No data sources active on this route yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Operations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operations @ {currentRoute}
          </CardTitle>
          <CardDescription>
            Operations performed on this route - {routeEvents.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderOperations(routeEvents, 'max-h-48')}
        </CardContent>
      </Card>

      {/* Global Data Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            All Data Sources
          </CardTitle>
          <CardDescription>
            Data sources used across all routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {renderDataSourceBadges(allDataSources)}
          </div>
        </CardContent>
      </Card>

      {/* Full Operation History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Full Operation History
          </CardTitle>
          <CardDescription>
            All operations across routes (newest first) - {events.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No operations recorded yet. Navigate around the app to see debug events.
            </div>
          ) : (
            renderOperations(events.slice(0, 50), 'max-h-64')
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
              onClick={() => console.log('Debug Events:', { routeEvents, allEvents: events })}
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