const { createClient } = require("redis");

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("error", (err) => console.error("Redis Client Error"));

(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error("Error connecting to Redis:");
  }
})();

module.exports = {
  client,
  getCache,
  setCache
};

async function getCache(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Error getting cache:");
    return null;
  }
}

function setCache(key, value) {
	const expireTime = 24 * 60 * 60; // 24시간
  try {
    client.setEx(key, expireTime, JSON.stringify(value));
  } catch (error) {
    console.error("Error setting cache:");
  }
}