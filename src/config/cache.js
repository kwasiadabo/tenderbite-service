"use strict";
 
/**
 * config/cache.js
 * Shared LRU in-process image cache.
 * Keyed by numeric image id → { buffer, mimeType, width, height }.
 *
 * Tune maxSize to your server's available RAM.
 */
 
const { LRUCache } = require("lru-cache");
 
const imageCache = new LRUCache({
  maxSize: 256 * 1024 * 1024,              // 256 MB total budget
  sizeCalculation: ({ buffer }) => buffer.length,
  ttl: 10 * 60 * 1000,                     // evict entries idle for 10 min
  allowStale: false,
});
 
module.exports = imageCache;
 