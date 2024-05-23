const { createClient } = require('redis');

/**
 * @type {import('redis').RedisClientType}
 */
let client;
let isConnecting = false;

const connectRedis = async () => {
  if (client && client.isOpen) return client;

  if (isConnecting) {
    throw new Error('Redis connection is already in progress');
  }

  isConnecting = true;

  try {

    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    await client.connect();
    console.log('Connected to Redis');
    return client;

  } catch (error) {
    console.error('Failed to connect to Redis:', err);
    throw err;

  } finally {
    isConnecting = false;
  }
  
};

// Key for the list
const listKey = 'chat-ai-questions';


/**
 * to add item to list and save to redis
 * @param {*} item data to save
 * @param {*} key key of redis
 */
const add = async (item, key) => {
  try {
    const redis = await connectRedis();
    await redis.lPush(key, item)
  } catch (err) {
    console.error('Error adding item:', err);
  }
}


/**
 * Function to get all items
 * @param {*} key key of redis
 */
const list = async (key) => {
  try {
    const redis = await connectRedis();
    const items = redis.lRange(key, 0, -1);
    return items;
  } catch (error) {
    console.error('Error retrieving questions:', err);
    return [];
  }
}


module.exports = { listKey, add, list };