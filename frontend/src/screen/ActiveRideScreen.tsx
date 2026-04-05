import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import RideMapModal from "./RideMapModel";
import type { Rider } from "../types/rider";
import { mockRiders } from "../data/rider";
import { getRideByCode, startRide, getRideParticipants, getUser } from "../services/api";
import socketService from "../services/socketService";

export default function ActiveRideScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveDot, setLiveDot] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const activeTab = getActiveTab(location.pathname);
  
  // Ride details state
  const [rideCode, setRideCode] = useState("");
  const [rideDetails, setRideDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startingRide, setStartingRide] = useState(false);
  
  // User and participants state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // 'marshal' or 'rider'
  const [participants, setParticipants] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<Map<string, {lat: number, lng: number, speed?: number}>>(new Map());
  
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLineRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<Array<L.Marker | L.CircleMarker>>([]);

  useEffect(() => {
    const interval = setInterval(() => setLiveDot((v) => !v), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Load ride code from localStorage on mount
  useEffect(() => {
    const savedRideCode = localStorage.getItem('currentRideCode');
    const userId = localStorage.getItem('userId');
    
    if (userId) {
      fetchUserDetails(userId);
    }
    
    if (savedRideCode && userId) {
      setRideCode(savedRideCode);
      fetchRideDetails(savedRideCode, userId);
    }
    
    // Cleanup socket on unmount
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);
  
  // Initialize and update map when participants or live locations change
  useEffect(() => {
    if (!mapContainer.current || !rideDetails) return;
    
    // Initialize map if not already done
    if (!mapInstance.current) {
      initializeMap();
    }
    
    // Update markers with current participants and live locations
    updateMapMarkers();
    
  }, [participants, liveLocations, rideDetails]);
  
  // Revalidate map size when modal closes (small map becomes visible again)
  useEffect(() => {
    if (!mapOpen && mapInstance.current && rideDetails) {
      // Modal just closed, revalidate map size
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
          console.log('📐 Small map revalidated after modal close');
        }
      }, 50);
    }
  }, [mapOpen]);
  
  // Get initial location for current user if not available
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || !rideDetails) return;
    
    // Check if current user already has a location
    const currentUserLocation = liveLocations.get(userId);
    if (!currentUserLocation && navigator.geolocation) {
      console.log('📍 Getting initial location for current user...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('✅ Got initial location:', { latitude, longitude });
          
          // Set initial location for current user
          setLiveLocations((prev) => {
            const newMap = new Map(prev);
            newMap.set(userId, { lat: latitude, lng: longitude });
            return newMap;
          });
        },
        (error) => {
          console.error('❌ Error getting initial location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [rideDetails]);
  
  function initializeMap() {
    if (!mapContainer.current || mapInstance.current) return;
    
    console.log('🗺️ Initializing live map...');
    
    try {
      // Default center (will be updated when we have locations)
      mapInstance.current = L.map(mapContainer.current, {
        center: [28.7041, 77.1025], // Default to Delhi
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      
      // Dark mode tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapInstance.current);
      
      console.log('✅ Map initialized successfully');
      
      // Force map to recalculate size
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
          console.log('📐 Map size invalidated');
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }
  
  function updateMapMarkers() {
    if (!mapInstance.current) {
      console.warn('⚠️ Map not initialized yet');
      return;
    }
    
    console.log('🔄 Updating map markers...', {
      participantsCount: participants.length,
      liveLocationsCount: liveLocations.size,
    });
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Draw route line from start to end
    if (rideDetails?.startPoint && rideDetails?.endPoint) {
      drawRoute(rideDetails.startPoint, rideDetails.endPoint);
    }
    
    // Create array of all riders with their locations
    const ridersWithLocations: Array<{id: string; name: string; lat: number; lng: number; role?: string}> = [];
    
    participants.forEach(participant => {
      const location = liveLocations.get(participant.userId);
      const isCurrentUser = participant.userId === localStorage.getItem('userId');
      
      // Use live location if available
      if (location) {
        ridersWithLocations.push({
          id: participant.userId,
          name: isCurrentUser ? `${participant.userName} (You)` : participant.userName,
          lat: location.lat,
          lng: location.lng,
          role: participant.role,
        });
      } else {
        console.log(`⚠️ No live location for ${participant.userName} (${participant.role})`);
      }
    });
    
    console.log(`📍 Adding ${ridersWithLocations.length} markers to map`);
    
    // Add markers for each rider
    ridersWithLocations.forEach(rider => {
      const isMarshal = rider.role === 'marshal';
      
      // Create custom icon based on role
      const iconHtml = `
        <div style="
          width: ${isMarshal ? '40px' : '32px'};
          height: ${isMarshal ? '40px' : '32px'};
          border-radius: 50%;
          background: ${isMarshal ? '#00E5FF' : '#a855f7'};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isMarshal ? '20px' : '16px'};
          animation: pulse 2s infinite;
        ">
          ${isMarshal ? '👑' : '🚴'}
        </div>
      `;
      
      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [isMarshal ? 40 : 32, isMarshal ? 40 : 32],
        iconAnchor: [isMarshal ? 20 : 16, isMarshal ? 20 : 16],
      });
      
      const marker = L.marker([rider.lat, rider.lng], { icon })
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div style="font-family: 'Barlow', sans-serif; padding: 8px;">
            <div style="color: #00E5FF; font-weight: 600; font-size: 14px;">${rider.name}</div>
            <div style="color: #888; font-size: 12px; margin-top: 4px;">
              ${isMarshal ? '<span style="color: #00E5FF;">👑 Marshal</span>' : '<span style="color: #a855f7;">🚴 Rider</span>'}
            </div>
          </div>
        `);
      
      markersRef.current[rider.id] = marker;
      console.log(`✅ Marker added for: ${rider.name} at [${rider.lat}, ${rider.lng}]`);
    });
    
    // Fit map to show all markers and route
    if (ridersWithLocations.length > 0) {
      const bounds = L.latLngBounds(ridersWithLocations.map(r => [r.lat, r.lng]));
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      console.log('🗺️ Map fitted to show all participants');
    } else if (rideDetails?.startPoint && rideDetails?.endPoint) {
      // If no riders yet, fit to route
      const [startLat, startLng] = rideDetails.startPoint.split(',').map(Number);
      const [endLat, endLng] = rideDetails.endPoint.split(',').map(Number);
      const routeBounds = L.latLngBounds([[startLat, startLng], [endLat, endLng]]);
      mapInstance.current.fitBounds(routeBounds, { padding: [100, 100] });
      console.log('🗺️ Map fitted to show route');
    } else {
      console.log('⚠️ No locations to display on map yet');
    }
  }
  
  function drawRoute(startPoint: string, endPoint: string) {
    if (!mapInstance.current) return;
    
    // Remove existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    
    // Remove existing stop markers
    stopMarkersRef.current.forEach(marker => marker.remove());
    stopMarkersRef.current = [];
    
    try {
      // Parse coordinates
      const [startLat, startLng] = startPoint.split(',').map(Number);
      const [endLat, endLng] = endPoint.split(',').map(Number);
      
      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        console.error('❌ Invalid route coordinates');
        return;
      }
      
      // Build waypoints array: start -> stops -> end
      const waypoints: [number, number][] = [[startLat, startLng]];
      
      // Add stop points if any
      // Note: We'll fetch stops separately and add them here
      
      waypoints.push([endLat, endLng]);
      
      // Draw polyline through all waypoints
      routeLineRef.current = L.polyline(
        waypoints,
        {
          color: '#00E5FF',
          weight: 5,
          opacity: 0.8,
          dashArray: '12, 10',
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(mapInstance.current);
      
      // Add start marker
      const startMarker = L.circleMarker([startLat, startLng], {
        radius: 10,
        fillColor: '#22c55e',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(mapInstance.current).bindPopup('<b>🟢 Start Point</b>');
      
      // Add end marker
      const endMarker = L.circleMarker([endLat, endLng], {
        radius: 10,
        fillColor: '#ef4444',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(mapInstance.current).bindPopup('<b>🔴 End Point</b>');
      
      console.log('✅ Route drawn with', waypoints.length, 'waypoints');
    } catch (error) {
      console.error('❌ Error drawing route:', error);
    }
  }
  
  async function fetchAndDrawStops(rideId: string) {
    try {
      // Import the API function
      const { getRideStops } = await import('../services/api');
      const stops = await getRideStops(rideId);
      
      console.log('🛑 Fetching ride stops:', stops.length);
      
      if (!mapInstance.current || stops.length === 0) {
        console.log('ℹ️ No stops to display for this ride');
        return;
      }
      
      // Clear existing stop markers
      stopMarkersRef.current.forEach(marker => marker.remove());
      stopMarkersRef.current = [];
      
      // Add markers for each stop
      stops.forEach((stop: any, index: number) => {
        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        // Different colors for different stop types
        const stopColors: Record<string, string> = {
          fuel: '#f59e0b',    // Orange
          food: '#ec4899',    // Pink
          rest: '#8b5cf6',    // Purple
          tea: '#06b6d4',     // Cyan
          other: '#6b7280',   // Gray
        };
        
        const color = stopColors[stop.stopType] || '#6b7280';
        const icons: Record<string, string> = {
          fuel: '⛽',
          food: '🍔',
          rest: '🛑',
          tea: '☕',
          other: '📍',
        };
        
        const icon = icons[stop.stopType] || '📍';
        
        const stopMarker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(mapInstance.current!).bindPopup(`
          <div style="font-family: 'Barlow', sans-serif; padding: 8px;">
            <div style="font-weight: 600; font-size: 14px; color: #00E5FF;">${icon} ${stop.title}</div>
            <div style="color: #888; font-size: 12px; margin-top: 4px;">Stop #${stop.stopOrder}</div>
            <div style="color: #666; font-size: 11px; margin-top: 2px; text-transform: uppercase;">${stop.stopType}</div>
          </div>
        `);
        
        stopMarkersRef.current.push(stopMarker);
      });
      
      console.log(`✅ Added ${stops.length} stop markers to map`);
      
      // Update route line to include stops
      if (rideDetails?.startPoint && rideDetails?.endPoint) {
        drawRouteWithStops(rideDetails.startPoint, rideDetails.endPoint, stops);
      }
    } catch (error: any) {
      // Don't break if stops endpoint doesn't exist or returns 404
      if (error.message?.includes('404')) {
        console.log('ℹ️ Ride stops endpoint not available (this is okay - no stops added yet)');
      } else {
        console.error('❌ Error fetching stops:', error);
      }
    }
  }
  
  function drawRouteWithStops(startPoint: string, endPoint: string, stops: any[]) {
    if (!mapInstance.current) return;
    
    // Remove existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    
    try {
      // Parse coordinates
      const [startLat, startLng] = startPoint.split(',').map(Number);
      const [endLat, endLng] = endPoint.split(',').map(Number);
      
      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        console.error('❌ Invalid route coordinates');
        return;
      }
      
      // Build waypoints array: start -> stops (in order) -> end
      const waypoints: [number, number][] = [[startLat, startLng]];
      
      // Add stops in order
      const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
      sortedStops.forEach((stop: any) => {
        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          waypoints.push([lat, lng]);
        }
      });
      
      waypoints.push([endLat, endLng]);
      
      // Draw polyline through all waypoints
      routeLineRef.current = L.polyline(
        waypoints,
        {
          color: '#00E5FF',
          weight: 5,
          opacity: 0.8,
          dashArray: '12, 10',
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(mapInstance.current);
      
      console.log('✅ Route drawn with', waypoints.length, 'waypoints (including stops)');
    } catch (error) {
      console.error('❌ Error drawing route with stops:', error);
    }
  }
  
  async function fetchUserDetails(userId: string) {
    try {
      const userData = await getUser(userId);
      setCurrentUser(userData);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }
  
  async function fetchRideDetails(code: string, userId?: string) {
    if (!code.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const data = await getRideByCode(code, userId);
      setRideDetails(data);
      setUserRole(data.userRole); // Set user role from response
      localStorage.setItem('currentRideCode', code);
      
      // Fetch participants if we have rideId
      if (data.rideId) {
        await fetchParticipants(data.rideId);
        
        // Fetch and draw stops
        await fetchAndDrawStops(data.rideId);
        
        // Connect to Socket.IO for real-time updates
        if (userId) {
          await connectToSocket(userId, data.rideId);
        }
      }
    } catch (err: any) {
      console.error('Error fetching ride:', err);
      setError(err.message || 'Ride not found');
      setRideDetails(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchParticipants(rideId: string) {
    try {
      const participantsData = await getRideParticipants(rideId);
      setParticipants(participantsData);
      console.log('Participants:', participantsData);
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  }
  
  async function connectToSocket(userId: string, rideId: string) {
    try {
      // Connect to socket
      await socketService.connect(userId, rideId);
      
      console.log('✅ Connected to Socket.IO');
      
      // Set up event listeners
      setupSocketListeners();
      
    } catch (err) {
      console.error('❌ Failed to connect to socket:', err);
    }
  }
  
  function setupSocketListeners() {
    // Listen for ride status updates (e.g., when marshal starts the ride)
    socketService.onRideStatusUpdate((data) => {
      console.log('📡 Ride status updated:', data);
      
      // Update ride details with new status
      setRideDetails((prev: any) => prev ? {
        ...prev,
        status: data.status
      } : null);
      
      // If ride just started, show notification
      if (data.status === 'active') {
        console.log('🚀 Ride has started!');
      }
    });
    
    // Listen for rider location updates
    socketService.onRiderLocationUpdate((data) => {
      console.log('📍 Location update received:', data);
      
      // Update live locations map with correct field names
      setLiveLocations((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          lat: data.latitude,
          lng: data.longitude,
          speed: data.speed,
        });
        return newMap;
      });
    });
    
    // Listen for participant joined
    socketService.onParticipantJoined((data) => {
      console.log('👤 Participant joined:', data);
      
      // Refresh participants list
      if (rideDetails?.rideId) {
        fetchParticipants(rideDetails.rideId);
      }
    });
    
    // Listen for participant left
    socketService.onParticipantLeft((data) => {
      console.log('👋 Participant left:', data);
      
      // Remove from live locations
      setLiveLocations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
      
      // Refresh participants list
      if (rideDetails?.rideId) {
        fetchParticipants(rideDetails.rideId);
      }
    });
  }
  
  function handleSearchRide() {
    fetchRideDetails(rideCode);
  }
  
  async function handleStartRide() {
    const userId = localStorage.getItem('userId');
    if (!userId || !rideDetails) {
      setError('User ID or ride details not found');
      return;
    }
    
    setStartingRide(true);
    setError("");
    
    try {
      await startRide(rideDetails.rideId, userId);
      // Refresh ride details to get updated status
      await fetchRideDetails(rideDetails.code, userId);
      
      // Start broadcasting location if marshal
      if (userRole === 'marshal') {
        startLocationBroadcasting(userId, rideDetails.rideId);
      }
    } catch (err: any) {
      console.error('Error starting ride:', err);
      setError(err.message || 'Failed to start ride');
    } finally {
      setStartingRide(false);
    }
  }
  
  function startLocationBroadcasting(userId: string, rideId: string) {
    console.log('🛰️ Starting location broadcasting for marshal...');
    
    // Get current location and broadcast every 5 seconds
    const broadcastInterval = setInterval(() => {
      if (!socketService.connected) {
        console.warn('Socket disconnected, stopping broadcast');
        clearInterval(broadcastInterval);
        return;
      }
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, speed, heading, accuracy } = position.coords;
            
            socketService.broadcastLocation({
              rideId,
              userId,
              latitude,
              longitude,
              speed: speed || undefined,
              heading: heading || undefined,
              accuracy: accuracy || undefined,
            });
            
            console.log('📍 Broadcasted location:', { latitude, longitude });
          },
          (error) => {
            console.error('Error getting location for broadcast:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    }, 5000); // Broadcast every 5 seconds
    
    // Store interval ID for cleanup
    (window as any).broadcastInterval = broadcastInterval;
  }

  const handleTabChange = (tab: NavTab) => {
    const routes: Record<NavTab, string> = {
      map: "/",
      group: "/session",
      safety: "/alert/off-route",
      profile: "/profile",
    };
    navigate(routes[tab]);
  };

  return (
    <div
      className="flex flex-col w-full h-screen bg-[#0A0A0A] overflow-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <button className="flex flex-col gap-1.5">
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
        </button>

        <span
          className="text-[#00E5FF] tracking-widest text-2xl"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          RideSync
        </span>

        <div className="w-9 h-9 rounded-full border border-[#00E5FF] bg-[#1a1a1a] flex items-center justify-center text-[#00E5FF] text-xs font-semibold">
          YS
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center px-5 pb-3 gap-0">
        <StatusItem label="Connection">
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] inline-block"
              style={{ opacity: liveDot ? 1 : 0.3, transition: "opacity 0.3s" }}
            />
            <span>{rideDetails ? `Live · ${rideDetails.participantCount || 0} riders` : 'No active ride'}</span>
          </span>
        </StatusItem>
        <StatusItem label="Battery">88%</StatusItem>
        <StatusItem label="Weather" last>24°C</StatusItem>
      </div>

      {/* RIDE DETAILS OR INPUT */}
      {rideDetails ? (
        // Show ride details
        <div className="mx-4 mb-4 bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex flex-col gap-3">
          {/* Ride Code Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1e1e1e]">
            <div>
              <p className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Room Code
              </p>
              <p className="text-[#00E5FF] text-2xl font-bold font-mono tracking-widest">{rideDetails.code}</p>
            </div>
            <button
              onClick={() => {
                setRideDetails(null);
                setRideCode("");
                localStorage.removeItem('currentRideCode');
              }}
              className="text-[#888] hover:text-white transition-colors text-xs px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Change
            </button>
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Start Point
              </span>
              <span className="text-white text-sm font-medium truncate" title={rideDetails.startPoint}>
                {rideDetails.startPoint}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                End Point
              </span>
              <span className="text-white text-sm font-medium truncate" title={rideDetails.endPoint}>
                {rideDetails.endPoint}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-t border-[#1e1e1e] pt-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Distance
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.distance || 0} <span className="text-xs text-[#444]">km</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pl-3 border-l border-[#1e1e1e]">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Duration
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.duration || 0} <span className="text-xs text-[#444]">min</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pl-3 border-l border-[#1e1e1e]">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Riders
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.participantCount || 0}
              </span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="pt-2 border-t border-[#1e1e1e]">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              rideDetails.status === 'active' 
                ? 'bg-green-900/20 border border-green-500' 
                : 'bg-yellow-900/20 border border-yellow-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                rideDetails.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                rideDetails.status === 'active' ? 'text-green-400' : 'text-yellow-400'
              }`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.status === 'active' ? 'Ride Active - Broadcasting' : 'Waiting to Start'}
              </span>
            </div>
          </div>
          
          {/* User Role Badge */}
          {userRole && (
            <div className="pt-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                userRole === 'marshal' 
                  ? 'bg-blue-900/20 border border-blue-500' 
                  : 'bg-purple-900/20 border border-purple-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  userRole === 'marshal' ? 'bg-blue-500' : 'bg-purple-500'
                }`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  userRole === 'marshal' ? 'text-blue-400' : 'text-purple-400'
                }`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {userRole === 'marshal' ? '👑 Marshal (Ride Leader)' : '🚴 Rider'}
                </span>
              </div>
            </div>
          )}
          
          {/* Start Ride Button (only for marshal when ride not started) */}
          {rideDetails.status !== 'active' && userRole === 'marshal' && (
            <button
              onClick={handleStartRide}
              disabled={startingRide}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all active:scale-95
                ${startingRide
                  ? "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
                  : "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px", fontSize: "16px" }}
            >
              {startingRide ? "Starting..." : "🚀 Start Ride & Broadcast Location"}
            </button>
          )}
          
          {/* Message for riders when ride not started */}
          {rideDetails.status !== 'active' && userRole === 'rider' && (
            <div className="pt-2 text-center">
              <p className="text-[#888] text-sm italic">Waiting for marshal to start the ride...</p>
            </div>
          )}
        </div>
      ) : (
        // No ride loaded - show waiting message
        <div className="mx-4 mb-4 bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <div className="text-[#444] text-6xl">📍</div>
          <div className="text-center">
            <p className="text-white text-lg font-semibold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              No Active Ride
            </p>
            <p className="text-[#666] text-sm">
              Create a ride from the Group tab to get started
            </p>
          </div>
        </div>
      )}

      {/* MAP AREA */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '300px' }}>
        {/* Live Leaflet Map - Hidden when modal is open (but kept in DOM) */}
        {rideDetails && (
          <div 
            ref={mapContainer} 
            className="absolute inset-0 bg-[#0d0d0d]"
            style={{ 
              width: '100%', 
              height: '100%',
              visibility: mapOpen ? 'hidden' : 'visible', // Hide but keep in DOM
              pointerEvents: mapOpen ? 'none' : 'auto' // Disable clicks when hidden
            }}
            onClick={() => setMapOpen(true)}
          />
        )}
        
        {/* Fallback for no ride */}
        {!rideDetails && (
          <div className="absolute inset-0 bg-[#0d0d0d] flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#444] text-6xl mb-4">🗺️</div>
              <p className="text-[#666] text-sm">Join a ride to see the live map</p>
            </div>
          </div>
        )}

        {/* Speed overlay (clickable to open full map) */}
        {rideDetails && rideDetails.status === 'active' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] text-center z-10 pointer-events-none">
            <div
              className="text-white leading-none drop-shadow-lg"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "96px", letterSpacing: "-2px" }}
            >
              82
            </div>
            <div
              className="text-[#00E5FF] text-base font-semibold tracking-[3px] -mt-2 drop-shadow-lg"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              KM/H
            </div>
          </div>
        )}
        <RideMapModal 
          riders={(() => {
            // Build riders array for modal
            const modalRiders = participants
              .map(p => {
                const location = liveLocations.get(p.userId);
                const isCurrentUser = p.userId === localStorage.getItem('userId');
                return {
                  id: p.userId,
                  name: isCurrentUser ? `${p.userName} (You)` : p.userName,
                  lat: location?.lat || 0,
                  lng: location?.lng || 0,
                  status: 'on-route' as const,
                };
              })
              .filter(r => r.lat !== 0 && r.lng !== 0); // Only show riders with locations
            
            console.log('📱 Modal showing', modalRiders.length, 'riders:', modalRiders.map(r => r.name));
            return modalRiders;
          })()}
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
        />

        {/* Rider chips */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3 pt-12 flex gap-2 items-end"
          style={{ background: "linear-gradient(to top, #0A0A0A 70%, transparent)" }}>
          {participants.length > 0 ? (
            participants.map((participant) => {
              // Find live location for this participant
              const location = liveLocations.get(participant.userId);
              const isCurrentUser = participant.userId === localStorage.getItem('userId');
              
              return (
                <RiderChip 
                  key={participant.id} 
                  rider={{
                    id: participant.userId,
                    name: isCurrentUser ? `${participant.userName} (You)` : participant.userName,
                    status: 'on-route',
                    distanceBehind: '',
                    lat: location?.lat || 0,
                    lng: location?.lng || 0,
                  }} 
                />
              );
            })
          ) : (
            // Show mock riders if no real participants yet
            mockRiders.map((rider) => (
              <RiderChip key={rider.id} rider={rider} />
            ))
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex items-center justify-between px-4 py-3 pb-8 bg-[#0A0A0A] border-t border-[#141414]">
        <button className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-[#888] text-xl font-light">
          +
        </button>

        <button className="flex items-center gap-2.5 bg-[#cc0000] rounded-full px-6 py-3 active:scale-95 transition-transform">
          <div>
            <div
              className="text-white text-xl tracking-[3px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              SOS
            </div>
            <div className="text-[9px] tracking-[1px] text-white/50 uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Hold to alert group
            </div>
          </div>
        </button>

        <button className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center relative">
          <GroupIcon />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#00E5FF] text-black text-[9px] font-bold flex items-center justify-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            5
          </span>
        </button>
        
      </div>
          <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}

/* ── Sub-components ── */

function StatusItem({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 pr-5 mr-5 ${!last ? "border-r border-[#222]" : ""}`}
    >
      <span
        className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold text-[#ccc]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {children}
      </span>
    </div>
  );
}

function RiderChip({ rider }: { rider: Rider }) {
  const isAlert = rider.status === "off-route";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 flex-1 border ${
        isAlert
          ? "bg-[#1a0a0a] border-[#ff4444]"
          : "bg-[#111] border-[#222]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isAlert ? "bg-[#ff4444]" : "bg-[#00E5FF]"
        }`}
        style={isAlert ? { animation: "pulse 0.8s infinite" } : undefined}
      />
      <div>
        <div
          className={`text-xs font-semibold whitespace-nowrap ${
            isAlert ? "text-[#ff6666]" : "text-[#ccc]"
          }`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {rider.name}
        </div>
        <div
          className={`text-[9px] whitespace-nowrap ${
            isAlert ? "text-[#993333]" : "text-[#444]"
          }`}
        >
          {isAlert ? `Off route · ${rider.distanceBehind}` : "On route"}
        </div>
      </div>
    </div>
  );
}

function TurnLeftIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 20 L8 10 L18 10" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 6 L18 10 L14 14" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6" cy="6" r="2.5" stroke="#888" strokeWidth="1.5" />
      <circle cx="12" cy="6" r="2.5" stroke="#888" strokeWidth="1.5" />
      <path d="M1 15c0-2.8 2.2-5 5-5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 15c0-2.8-2.2-5-5-5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
} 