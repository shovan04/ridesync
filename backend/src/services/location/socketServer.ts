import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../../types/socket.types.js';
import redisPubSubService from './redisPubSub.service.js';
import gapDetectionService from './gapDetection.service.js';
import { setupSocketHandlers, setupRedisHandler } from './socket.handlers.js';

/**
 * Socket.IO Server Initialization
 * Creates and configures the real-time WebSocket server
 */
class SocketServer {
  private httpServer: any;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize Socket.IO server with HTTP server
   */ 
  public initialize(httpServer?: any): Server<ClientToServerEvents, ServerToClientEvents> {
    if (this.isInitialized && this.io) {
      console.log('⚠️  Socket server already initialized');
      return this.io;
    }

    try {
      // Use provided HTTP server or create new one
      this.httpServer = httpServer || createServer();

      // Configure Socket.IO
      this.io = new Server<ClientToServerEvents, ServerToClientEvents>(this.httpServer, {
        cors: {
          origin: process.env.SOCKET_CORS_ORIGIN || '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
        maxHttpBufferSize: 1e6, // 1 MB
        transports: ['websocket', 'polling'],
        allowEIO3: true, // Support Engine.IO v3 clients
      });

      console.log('✅ Socket.IO server configured');

      // Set up Redis connection
      this.initializeRedis();

      // Set up socket event handlers
      setupSocketHandlers(this.io);

      // Set up Redis message handler for multi-server support
      setupRedisHandler(this.io);

      // Initialize gap detection service
      gapDetectionService.initialize(this.io);

      this.isInitialized = true;
      console.log('✅ Socket server fully initialized');

      return this.io;
    } catch (error) {
      console.error('❌ Failed to initialize socket server:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis Pub/Sub
   */
  private async initializeRedis(): Promise<void> {
    try {
      await redisPubSubService.initialize();
      console.log('✅ Redis Pub/Sub initialized for socket server');
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      console.warn('⚠️  Continuing without Redis (single-server mode only)');
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
    if (!this.io) {
      throw new Error('Socket server not initialized. Call initialize() first.');
    }
    return this.io;
  }

  /**
   * Get the HTTP server instance
   */
  public getHTTPServer(): any {
    return this.httpServer;
  }

  /**
   * Start listening on a port (if no HTTP server was provided)
   */
  public listen(port: number, callback?: () => void): void {
    if (!this.httpServer) {
      throw new Error('HTTP server not available');
    }

    this.httpServer.listen(port, () => {
      console.log(`🚀 Socket server listening on port ${port}`);
      if (callback) callback();
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down socket server...');

      // Stop gap detection
      gapDetectionService.stop();

      // Disconnect Redis
      await redisPubSubService.disconnect();

      // Close all socket connections
      if (this.io) {
        await this.io.close();
      }

      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.isInitialized = false;
      console.log('✅ Socket server shut down successfully');
    } catch (error) {
      console.error('❌ Error during socket server shutdown:', error);
      throw error;
    }
  }

  /**
   * Get server statistics
   */
  public async getStats(): Promise<{
    socketIO: {
      connectedClients: number;
    };
    redis: Awaited<ReturnType<typeof redisPubSubService.getStats>>;
    gapDetection: ReturnType<typeof gapDetectionService.getStatus>;
  } | null> {
    if (!this.io) return null;

    return {
      socketIO: {
        connectedClients: this.io.engine.clientsCount,
      },
      redis: await redisPubSubService.getStats(),
      gapDetection: gapDetectionService.getStatus(),
    };
  }
}

// Export singleton instance
export default new SocketServer();
