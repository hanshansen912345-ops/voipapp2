/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { Navigation, Clock, Check, UserIcon, Map as MapIcon, Package, Send, PlusCircle, LayoutDashboard, Truck, X, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { Order } from '../server'; // Import type
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import { OpenMap, OpenMarker, OpenRouting } from './Maps';

const socket = io();

type Role = 'admin' | 'driver' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/track/')) {
      const parts = path.split('/');
      if (parts.length >= 3) {
        setTrackingOrderId(parts[2]);
      }
    }
  }, []);

  if (trackingOrderId) {
    return <CustomerTrackingView orderId={trackingOrderId} />;
  }
  
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vælg din portal</h1>
          <p className="text-gray-500 mb-8 text-sm">Hvad er din rolle i systemet?</p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setRole('admin')}
              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-blue-500 transition-colors w-full group text-left focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Administrator / Chef</h3>
                <p className="text-xs text-gray-500 mt-1">Opret ordrer og overvåg flåde</p>
              </div>
            </button>
            
            <button
              onClick={() => setRole('driver')}
              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 transition-colors w-full group text-left focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Chauffør</h3>
                <p className="text-xs text-gray-500 mt-1">Modtag ruter og navigér live</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {role === 'admin' && <AdminView onLogout={() => setRole(null)} />}
      {role === 'driver' && <DriverView onLogout={() => setRole(null)} />}
    </>
  );
}

// -------------------------------------------------------------
// ADMIN VIEW
// -------------------------------------------------------------
function AdminView({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Hovedkontor');
  const [dropoffAddress, setDropoffAddress] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        setOrders(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const handleUpdate = (updatedOrders: Order[]) => {
      setOrders(updatedOrders);
    };
    socket.on('ordersUpdate', handleUpdate);
    return () => {
      socket.off('ordersUpdate', handleUpdate);
    };
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName, customerPhone, itemDescription, pickupAddress, dropoffAddress
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setCustomerName(''); setCustomerPhone(''); setItemDescription(''); setDropoffAddress(''); setPickupAddress('Hovedkontor');
        fetchOrders();
      } else {
         const data = await res.json();
         alert("Fejl: " + (data.error || "Kunne ikke oprette ordren."));
      }
    } catch(err) {
      console.error(err);
      alert("Netværksfejl ved oprettelse af ordre.");
    }
  }

  const activeDrivers = orders.filter(o => o.status === 'en_route' && o.driverLocation);

  return (
    <div className="min-h-screen bg-[#f5f7f9] font-sans pb-20">
      {/* Header */}
      <div className="bg-white px-8 py-5 shadow-sm flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Dispatcher Panel</h1>
          <p className="text-xs text-gray-500 font-medium">Systemadministrator</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
            <PlusCircle className="w-4 h-4" /> Ny Ordre
          </button>
          <button onClick={onLogout} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition">
             <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Fleet Map (Right side on desktop, top on mobile) */}
          <div className="lg:col-span-1 border border-gray-200 bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <MapIcon className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">Live Kort (Flåde)</h2>
            </div>
            <div className="flex-1 bg-gray-100 relative z-0">
                 <OpenMap 
                   center={activeDrivers.length > 0 && activeDrivers[0].driverLocation ? activeDrivers[0].driverLocation : { lat: 55.676098, lng: 12.568337 }} 
                   zoom={activeDrivers.length > 0 ? 14 : 11}
                 >
                   {activeDrivers.map(order => (
                     order.driverLocation && (
                         <OpenMarker key={order.id} position={order.driverLocation} type="driver" />
                     )
                   ))}
                 </OpenMap>
               
               {/* Overlay Status */}
               <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-500">
                  <span>Aktive Ruter</span>
                  <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{activeDrivers.length}</span>
               </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="lg:col-span-2 space-y-4">
             <h2 className="font-bold text-gray-900 mb-2">Alle Ordrer</h2>
             {orders.length === 0 ? (
                <div className="bg-white border text-center border-dashed border-gray-300 rounded-3xl p-12">
                   <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                   <p className="text-gray-500 text-sm">Systemet er tomt. Opret din første ordre.</p>
                </div>
             ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                         <h3 className="font-bold text-gray-900">{order.customerName}</h3>
                         <span className={cn(
                           "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full",
                           order.status === 'pending' && "bg-gray-100 text-gray-600",
                           order.status === 'en_route' && "bg-blue-100 text-blue-700",
                           order.status === 'completed' && "bg-emerald-100 text-emerald-700"
                         )}>
                           {order.status === 'pending' ? 'Afventer' : order.status === 'en_route' ? 'Undervejs' : 'Leveret'}
                         </span>
                       </div>
                       <p className="text-sm text-gray-600 mb-1"><span className="font-semibold text-gray-900">Gave/Vare:</span> {order.itemDescription}</p>
                       <p className="text-sm text-gray-500 flex items-center gap-2"><MapIcon className="w-3.5 h-3.5"/> {order.dropoffAddress}</p>
                    </div>
                    {order.status === 'en_route' && (
                       <div className="sm:text-right bg-blue-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Anslået Ankomst</p>
                          <p className="text-2xl font-bold text-blue-600">
                             {order.acceptedAt && order.etaMinutes 
                                ? format(new Date(order.acceptedAt + order.etaMinutes * 60000), "HH:mm") 
                                : '--:--'}
                          </p>
                       </div>
                    )}
                  </div>
                ))
             )}
          </div>
        </div>
      </div>

      {/* Modal - Create Order */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateOrder} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Opret Ny Ordre</h2>
              <button type="button" onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">Kundenavn</label>
                <input required value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Kunde Navnesen" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">Telefon</label>
                <input required value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="+45 12 34 56 78" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">Levering (Indhold)</label>
                <input required value={itemDescription} onChange={e=>setItemDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="F.eks. 1x Kage, 2x Kaffe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">Afhentningsadresse</label>
                  <input
                    required
                    value={pickupAddress}
                    onChange={e => setPickupAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Hovedkontor"
                  />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">Destinationsadresse</label>
                  <input
                    required
                    value={dropoffAddress}
                    onChange={e => setDropoffAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Vejnavn 12, By"
                  />
              </div>
            </div>

            <button type="submit" className="w-full mt-6 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-sm">
              Opret & Gør Klar Til Chauffør
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// DRIVER VIEW (Split Screen)
// -------------------------------------------------------------
function DriverView({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        setOrders(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const handleUpdate = (updatedOrders: Order[]) => {
      setOrders(updatedOrders);
    };
    socket.on('ordersUpdate', handleUpdate);
    return () => {
      socket.off('ordersUpdate', handleUpdate);
    };
  }, []);

  // Geolocation Tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
       (pos) => {
         const { latitude, longitude } = pos.coords;
         setDriverLocation({ lat: latitude, lng: longitude });
         fetch('/api/driver/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude })
         }).catch(err => console.error("Could not sync location"));
       },
       (err) => console.warn(err),
       { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleAccept = async (orderId: string) => {
    if (!driverLocation) {
      alert("Vent venligst. Din GPS-lokation hentes for at kunne beregne ankomsttid til kunden...");
      return;
    }

    setIsLoading(true);
    try {
      let calcEta = 15; // default fallback
      const orderToAccept = orders.find(o => o.id === orderId);
      
      if (orderToAccept && orderToAccept.dropoffLatLng) {
          try {
              const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${orderToAccept.dropoffLatLng.lng},${orderToAccept.dropoffLatLng.lat}?overview=false`;
              const routeRes = await fetch(osrmUrl);
              const routeData = await routeRes.json();
              if (routeData.routes && routeData.routes.length > 0) {
                  calcEta = Math.round(routeData.routes[0].duration / 60);
              }
          } catch(e) {
              console.error("OSRM Routing failed", e);
          }
      }

      const response = await fetch(`/api/orders/${orderId}/accept`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            etaMinutes: calcEta,
            driverLocation: driverLocation
         })
      });
      if (response.ok) await fetchOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, { method: 'POST' });
      if (response.ok) await fetchOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotifyTwoMin = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/notify-two-min`, { method: 'POST' });
      if (response.ok) await fetchOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendTracking = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/resend-tracking`, { method: 'POST' });
      if (response.ok) await fetchOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrder = orders.find(o => o.status === 'en_route'); // Assume 1 active order at a time for UI clarity

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center text-white shrink-0">
         <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Chauffør Terminal</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">GPS Tracking Aktiv</p>
              </div>
            </div>
         </div>
         <button onClick={onLogout} className="text-gray-400 hover:text-white transition">
            <LogOut className="w-5 h-5" />
         </button>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANE: Active Route Map */}
        <div className="flex-[2] relative bg-gray-800 flex flex-col">
           {activeOrder ? (
              <>
                 <div className="absolute top-4 left-4 right-4 z-10 flex gap-4">
                    <div className="bg-gray-900/90 backdrop-blur p-4 rounded-2xl border border-gray-700 shadow-2xl flex-1 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Aktiv Rute. SMS Sendt.</p>
                          <h2 className="text-white font-bold text-lg">{activeOrder.dropoffAddress}</h2>
                          <p className="text-gray-400 text-xs mt-1">Leverer: {activeOrder.itemDescription}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Est. Tid (Auto)</p>
                          <p className="text-3xl text-white font-light">~{activeOrder.etaMinutes}<span className="text-sm text-gray-500 ml-1">m</span></p>
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 bg-gray-700 relative z-0">
                     <OpenMap center={driverLocation || { lat: 55.676098, lng: 12.568337 }} zoom={14}>
                       {driverLocation && <OpenMarker position={driverLocation} type="driver" />}
                       {activeOrder.dropoffLatLng && <OpenMarker position={activeOrder.dropoffLatLng} type="dest" />}
                       {driverLocation && activeOrder.dropoffLatLng && (
                           <OpenRouting origin={driverLocation} destination={activeOrder.dropoffLatLng} />
                        )}
                      </OpenMap>
                  </div>

                  <div className="bg-gray-900 p-4 border-t border-gray-800 shrink-0">
                    <div className="flex flex-col gap-3">
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleNotifyTwoMin(activeOrder.id)} disabled={isLoading || activeOrder.driverNotifiedTwoMin}
                                  className="bg-blue-600 text-white text-sm font-bold py-3 rounded-xl border border-blue-500 hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:bg-gray-700 disabled:border-gray-600 disabled:shadow-none flex items-center justify-center gap-2">
                             <Clock className="w-4 h-4" /> {activeOrder.driverNotifiedTwoMin ? '2-min SMS Sendt' : 'Send 2-min SMS'}
                          </button>
                          <button onClick={() => handleResendTracking(activeOrder.id)} disabled={isLoading}
                                  className="bg-gray-800 text-white text-sm font-bold py-3 rounded-xl border border-gray-700 hover:bg-gray-700 transition flex items-center justify-center gap-2">
                             <Send className="w-4 h-4" /> Gensend Tracking link
                          </button>
                       </div>
                       <div className="flex gap-4">
                          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeOrder.dropoffAddress)}`, '_blank')}
                                  className="flex-1 bg-gray-800 text-white font-bold py-4 rounded-xl border border-gray-700 hover:bg-gray-700 transition flex items-center justify-center gap-2">
                             <Navigation className="w-5 h-5" /> Åbn Nativ GPS
                          </button>
                          <button onClick={() => handleCompleteOrder(activeOrder.id)} disabled={isLoading}
                                  className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-500 transition shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center justify-center gap-2">
                             <Check className="w-5 h-5" /> Afslut Ordre (Leveret)
                          </button>
                       </div>
                    </div>
                  </div>
              </>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                 <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Navigation className="w-8 h-8 text-gray-600" />
                 </div>
                 <h2 className="text-white font-bold text-xl mb-2">Ingen Aktiv Rute</h2>
                 <p className="text-gray-400 text-sm max-w-xs">Accepter en indkommende ordre fra panelet for at starte navigation og sende ankomsttid til kunden.</p>
              </div>
           )}
        </div>

        {/* RIGHT PANE: Incoming Orders */}
        <div className="flex-[1] bg-gray-50 flex flex-col border-l border-gray-200">
           <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-gray-900 flex items-center justify-between">
                 Indkommende Ordrer
                 <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{pendingOrders.length} afventer</span>
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {pendingOrders.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-8">Ingen nye ordrer i øjeblikket.</p>
             )}
             
             {pendingOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-gray-300 transition cursor-default relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                   <div className="flex justify-between items-start mb-3">
                      <p className="font-bold text-gray-900 text-lg">{order.dropoffAddress.split(',')[0]}</p>
                      <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider bg-blue-50 px-2 py-1 rounded">NY</p>
                   </div>
                   
                   <p className="text-sm text-gray-600 mb-4 line-clamp-2">{order.itemDescription}</p>

                   <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs font-semibold text-gray-500 flex flex-col gap-1.5">
                      <div className="flex justify-between"><span className="uppercase">Kunde:</span> <span className="text-gray-900">{order.customerName}</span></div>
                      <div className="flex justify-between"><span className="uppercase">Afhentning:</span> <span className="text-gray-900 truncate ml-4">{order.pickupAddress}</span></div>
                   </div>

                   <button 
                      onClick={() => handleAccept(order.id)} disabled={isLoading || activeOrder !== undefined}
                      className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 transition flex justify-center items-center gap-2"
                   >
                     {activeOrder ? 'Du har allerede en aktiv rute' : 'Accepter Rute'}
                   </button>
                </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CUSTOMER TRACKING VIEW
// -------------------------------------------------------------
function CustomerTrackingView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then((allOrders: Order[]) => {
      setOrder(allOrders.find((o: Order) => o.id === orderId) || null);
    }).catch(console.error);

    const handleUpdate = (updatedOrders: Order[]) => {
      setOrder(updatedOrders.find((o: Order) => o.id === orderId) || null);
    };
    socket.on('ordersUpdate', handleUpdate);
    return () => {
      socket.off('ordersUpdate', handleUpdate);
    };
  }, [orderId]);

  if (!order) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <p className="text-gray-500 font-medium animate-pulse">Indlæser din ordre...</p>
  </div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
       <div className="bg-white p-6 shadow-sm border-b border-gray-100 flex-shrink-0 text-center relative z-10">
          <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Din Levering</h1>
          <p className="text-sm text-gray-500 mt-1">Hej {order.customerName}</p>
       </div>

       <div className="p-6 max-w-xl mx-auto w-full flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Status</p>
                  <h2 className="text-lg font-bold text-gray-900">
                     {order.status === 'pending' ? 'Afventer chauffør' : order.status === 'en_route' ? 'På vej til dig' : 'Leveret'}
                  </h2>
                </div>
                {order.status === 'en_route' && order.etaMinutes && (
                  <div className="text-right">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Forventet ankomst</p>
                    <p className="text-2xl font-bold text-blue-600">~{order.etaMinutes} min</p>
                  </div>
                )}
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Leveringsadresse:</p>
                <p className="text-sm font-medium text-gray-900">{order.dropoffAddress}</p>
             </div>
          </div>

          <div className="flex-1 bg-gray-200 rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative min-h-[300px] z-0">
             {order.status === 'en_route' && order.driverLocation ? (
                  <OpenMap center={order.driverLocation} zoom={15}>
                      <OpenMarker position={order.driverLocation} type="driver" />
                      {order.dropoffLatLng && <OpenMarker position={order.dropoffLatLng} type="dest" />}
                      {order.dropoffLatLng && (
                         <OpenRouting origin={order.driverLocation} destination={order.dropoffLatLng} />
                      )}
                  </OpenMap>
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-100">
                   {order.status === 'completed' ? <Check className="w-10 h-10 text-emerald-500 mb-2" /> : <Clock className="w-10 h-10 text-gray-400 mb-2" />}
                   <p className="text-sm font-medium">{order.status === 'completed' ? 'Ordre afleveret' : 'Venter på at chaufføren tager afsted'}</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
