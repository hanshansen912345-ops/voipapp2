import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Sender SMS via 12Voip API
 * @param {string} recipient - Modtagerens nummer (f.eks. '+4512345678')
 * @param {string} message - Teksten der skal sendes
 */
async function sendSms(recipient: string, message: string) {
    // Sanitize destination number: remove all whitespace and dashes
    let cleanRecipient = recipient.replace(/[\s-]/g, '');

    // Autocorrect Danish 8-digit numbers without country code
    if (cleanRecipient.length === 8 && /^\d+$/.test(cleanRecipient)) {
        cleanRecipient = '0045' + cleanRecipient;
    } else if (cleanRecipient.startsWith('+')) {
        cleanRecipient = '00' + cleanRecipient.substring(1);
    }

    const config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '004530133857',
        to: cleanRecipient,
        text: message
    };

    const url = `https://www.12voip.com/myaccount/sendsms.php`;

    try {
        const response = await axios.get(url, { params: config });
        console.log(`[12Voip] SMS Status (to ${cleanRecipient}):`, response.data);
        return response.data;
    } catch (error) {
        console.error('[12Voip] Fejl ved afsendelse:', error);
    }
}

// In-Memory Data Store
export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  pickupAddress: string;
  dropoffAddress: string;
  dropoffLatLng?: { lat: number; lng: number } | null;
  status: 'pending' | 'en_route' | 'completed';
  etaMinutes: number | null; // Auto-calculated upon accept
  acceptedAt: number | null; // Timestamp
  driverNotifiedTwoMin: boolean;
  trackingSmsSent: boolean;
  driverLocation: { lat: number; lng: number } | null;
}

const CUSTOMER_PHONE = process.env.CUSTOMER_PHONE_NUMBER || '+4512345678';

let orders: Order[] = [];

// Current active driver location (Simplified for 1 driver system)
let currentDriverLocation: { lat: number; lng: number } | null = null;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });
  
  const PORT = 3000;

  app.use(express.json());

  const getHydratedOrders = () => {
    return orders.map(o => {
       if (o.status === 'en_route') o.driverLocation = currentDriverLocation;
       return o;
    });
  };

  const broadcastOrders = () => {
    io.emit('ordersUpdate', getHydratedOrders());
  };

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('ordersUpdate', getHydratedOrders());
  });

  // API: Get all orders
  app.get('/api/orders', (req, res) => {
    res.json(getHydratedOrders());
  });

  // API: Test SMS manually
  app.get('/api/test-sms', async (req, res) => {
      const result = await sendSms('+4530133857', 'Test fra systemet');
      res.json({ result: result });
  });

  // API: Admin creates order
  app.post('/api/orders', async (req, res) => {
    const { customerName, customerPhone, itemDescription, pickupAddress, dropoffAddress } = req.body;
    
    if (!customerName || !itemDescription || !dropoffAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let dropoffLatLng = null;
    try {
       const resp = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropoffAddress)}&limit=1`, {
           headers: { 'User-Agent': 'DispatcherApp/1.0' }
       });
       if (resp.data && resp.data.length > 0) {
           dropoffLatLng = {
               lat: parseFloat(resp.data[0].lat),
               lng: parseFloat(resp.data[0].lon)
           };
       }
    } catch(e) {
       console.error("Geocoding failed for:", dropoffAddress);
    }

    const newOrder: Order = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9),
      customerName,
      customerPhone: customerPhone || CUSTOMER_PHONE,
      itemDescription,
      pickupAddress: pickupAddress || 'Hovedkontor',
      dropoffAddress,
      dropoffLatLng,
      status: 'pending',
      etaMinutes: null,
      acceptedAt: null,
      driverNotifiedTwoMin: false,
      trackingSmsSent: false,
      driverLocation: null,
    };

    orders.push(newOrder);
    broadcastOrders();
    res.status(201).json(newOrder);
  });

  // API: Driver updates location
  app.post('/api/driver/location', (req, res) => {
    const { lat, lng } = req.body;
    if (lat && lng) {
       currentDriverLocation = { lat, lng };
       broadcastOrders();
    }
    res.json({ success: true });
  });

  // API: Driver accepts order (Uses actual ETA from Maps API and sends SMS)
  app.post('/api/orders/:id/accept', async (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'Order already taken' });

    const { etaMinutes, driverLocation } = req.body;

    order.status = 'en_route';
    order.etaMinutes = etaMinutes || (Math.floor(Math.random() * 16) + 10);
    order.acceptedAt = Date.now();
    order.driverNotifiedTwoMin = false;
    order.trackingSmsSent = true;
    
    if (driverLocation) {
        currentDriverLocation = driverLocation;
    }
    
    broadcastOrders();

    // SMS to Customer
    const host = req.headers.host || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const trackingUrl = `${process.env.APP_URL || (protocol + '://' + host)}/track/${order.id}`;
    const adminMsg = `Hej ${order.customerName},\nDin ordre (${order.itemDescription}) er på vej! Din chauffør er anslået til at ankomme om ca. ${order.etaMinutes} minutter. Du kan spore chaufføren live her: ${trackingUrl}`;
    await sendSms(order.customerPhone, adminMsg);

    res.json(order);
  });

  // API: Update ETA and optionally notify customer
  app.post('/api/orders/:id/update-eta', async (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const { etaMinutes, silent } = req.body;
    const oldEta = order.etaMinutes;
    order.etaMinutes = etaMinutes;

    // If change is significant (more than 5 mins) or it was previously null, notify
    if (!silent && oldEta !== null) {
        const diff = Math.abs(oldEta - etaMinutes);
        if (diff >= 5) {
            const host = req.headers.host || '';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const trackingUrl = `${process.env.APP_URL || (protocol + '://' + host)}/track/${order.id}`;
            const msg = `Din chauffør er opdateret: Ny anslået ankomst om ca. ${etaMinutes} minutter. Se her: ${trackingUrl}`;
            await sendSms(order.customerPhone, msg);
        }
    }

    broadcastOrders();
    res.json(order);
  });

  // API: Driver completes order
  app.post('/api/orders/:id/complete', async (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    order.status = 'completed';
    broadcastOrders();
    
    await sendSms(order.customerPhone, `Din ordre er nu leveret. Tak for handlen!`);
    
    res.json(order);
  });

  // API: Driver resends tracking link
  app.post('/api/orders/:id/resend-tracking', async (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const host = req.headers.host || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const trackingUrl = `${process.env.APP_URL || (protocol + '://' + host)}/track/${order.id}`;

    const msg = `Hej ${order.customerName},\nHer er et live-link til din levering (${order.itemDescription}). Din chauffør forventes at ankomme om ca. ${order.etaMinutes} minutter: ${trackingUrl}`;
    await sendSms(order.customerPhone, msg);
    
    order.trackingSmsSent = true;
    broadcastOrders();
    res.json({ success: true });
  });

  // API: Driver manually sends 2-minute warning
  app.post('/api/orders/:id/notify-two-min', async (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'en_route') return res.status(400).json({ error: 'Order must be en route' });
    
    if (!order.driverNotifiedTwoMin) {
        order.driverNotifiedTwoMin = true;
        broadcastOrders();
        
        const host = req.headers.host || '';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const trackingUrl = `${process.env.APP_URL || (protocol + '://' + host)}/track/${order.id}`;

        const msg = `Vigtig besked: Din chauffør ankommer om kort tid (ca. 2 minutter)! Gør dig venligst klar til at modtage din ordre. Følg med her: ${trackingUrl}`;
        await sendSms(order.customerPhone, msg);
    }
    
    res.json(order);
  });

  // Automated Job: 2-minute warning
  setInterval(async () => {
    const now = Date.now();
    for (const order of orders) {
      if (order.status === 'en_route' && order.acceptedAt && order.etaMinutes && !order.driverNotifiedTwoMin) {
        // Calculate elapsed time
        const elapsedMinutes = (now - order.acceptedAt) / 60000;
        const remainingMinutes = order.etaMinutes - elapsedMinutes;
        
        if (remainingMinutes <= 2) {
          order.driverNotifiedTwoMin = true;
          broadcastOrders();
          const msg = `Vigtig besked: Din chauffør ankommer om 2 minutter! Gør dig venligst klar til at modtage din ordre.`;
          await sendSms(order.customerPhone, msg);
        }
      }
    }
  }, 10000); // Check every 10 seconds

  // Vite Integration for frontend preview
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
