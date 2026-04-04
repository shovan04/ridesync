import { Redis } from 'ioredis';
import { RedisMessage, BroadcastLocation } from '../../types/socket.types.js';

/**
 * Redis Pub/Sub service for multi-server scalability
 * Allows multiple server instances to share location updates
 */
class RedisPubSubService {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly channel: string = 'ride-location';
  private messageHandler: ((message: RedisMessage) => void) | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize Redis connections
   */
  public async initialize(redisUrl?: string): Promise<void> {
    try {
      const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

      // Publisher connection - for sending messages
      this.publisher = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Subscriber connection - for receiving messages (separate connection required)
      this.subscriber = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      // Test connection
      await this.publisher.ping();
      await this.subscriber.ping();

      this.isConnected = true;
      console.log('✅ Redis Pub/Sub connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Set up Redis event listeners
   */
  private setupEventListeners(): void {
    if (!this.subscriber) return;

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === this.channel && this.messageHandler) {
        try {
          const parsedMessage: RedisMessage = JSON.parse(message);
          this.messageHandler(parsedMessage);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });

    this.subscriber.on('error', (error: Error) => {
      console.error('Redis subscriber error:', error);
      this.isConnected = false;
    });

    this.subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
    });

    if (this.publisher) {
      this.publisher.on('error', (error: Error) => {
        console.error('Redis publisher error:', error);
        this.isConnected = false;
      });
    }
  }

  /**
   * Subscribe to location updates channel
   */
  public async subscribe(handler: (message: RedisMessage) => void): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }

    this.messageHandler = handler;
    
    try {
      await this.subscriber.subscribe(this.channel);
      console.log(`✅ Subscribed to Redis channel: ${this.channel}`);
    } catch (error) {
      console.error('Failed to subscribe to Redis channel:', error);
      throw error;
    }
  }

  /**
   * Publish location update to all server instances
   */
  public async publishLocationUpdate(locationData: BroadcastLocation): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      console.warn('Redis not connected, skipping publish');
      return;
    }

    try {
      const message: RedisMessage = {
        type: 'location_update',
        data: locationData,
      };

      await this.publisher.publish(this.channel, JSON.stringify(message));
    } catch (error) {
      console.error('Failed to publish location update:', error);
    }
  }

  /**
   * Publish user left event
   */
  public async publishUserLeft(userId: string, rideId: string): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      console.warn('Redis not connected, skipping publish');
      return;
    }

    try {
      const message: RedisMessage = {
        type: 'user_left',
        data: { userId, rideId },
      };

      await this.publisher.publish(this.channel, JSON.stringify(message));
    } catch (error) {
      console.error('Failed to publish user left event:', error);
    }
  }

  /**
   * Unsubscribe from channel
   */
  public async unsubscribe(): Promise<void> {
    if (!this.subscriber) return;

    try {
      await this.subscriber.unsubscribe(this.channel);
      this.messageHandler = null;
      console.log(`✅ Unsubscribed from Redis channel: ${this.channel}`);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  /**
   * Close Redis connections
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.unsubscribe();
        this.subscriber.quit();
        this.subscriber = null;
      }

      if (this.publisher) {
        this.publisher.quit();
        this.publisher = null;
      }

      this.isConnected = false;
      console.log('✅ Redis connections closed');
    } catch (error) {
      console.error('Error closing Redis connections:', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  public getConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get Redis stats (for monitoring)
   */
  public async getStats(): Promise<{
    publisherConnected: boolean;
    subscriberConnected: boolean;
    channel: string;
  } | null> {
    if (!this.publisher || !this.subscriber) {
      return null;
    }

    return {
      publisherConnected: this.publisher.status === 'ready',
      subscriberConnected: this.subscriber.status === 'ready',
      channel: this.channel,
    };
  }
}

// Export singleton instance
export default new RedisPubSubService();
