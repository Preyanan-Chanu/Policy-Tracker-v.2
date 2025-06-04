// app/api/policylike/route.ts
"use server";

import { NextResponse } from 'next/server';
import neo4j, { int, isInt } from 'neo4j-driver';
import driver from '@/app/lib/neo4j';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
try {
  await redis.connect(); // ✅ รอให้ connect สำเร็จก่อน
  console.log("✅ Redis connected");
} catch (err) {
  console.error("❌ Redis connect error:", err);
}
// Rate limiting constants
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;  // Max 10 requests per minute per IP
const LIKE_COOLDOWN = 5 * 1000;      // 5 seconds cooldown between likes

// ✅ Safe wrapper: redis.get
async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`❌ Redis GET error for ${key}:`, err);
    return null;
  }
}

// ✅ Safe wrapper: redis.set
async function safeSet(key: string, value: string, EX: number) {
  try {
    await redis.set(key, value, { EX });
  } catch (err) {
    console.error(`❌ Redis SET error for ${key}:`, err);
  }
}

// ✅ Safe wrapper: redis.incr
async function safeIncr(key: string) {
  try {
    await redis.incr(key);
  } catch (err) {
    console.error(`❌ Redis INCR error for ${key}:`, err);
  }
}

// ✅ Rate limiting with fallback
async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const current = await safeGet(key);

  if (!current) {
    await safeSet(key, "1", Math.floor(RATE_LIMIT_WINDOW / 1000));
    return true;
  }

  const count = parseInt(current);
  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  await safeIncr(key);
  return true;
}

// ✅ Like cooldown with fallback
async function checkLikeCooldown(fingerprint: string): Promise<boolean> {
  const key = `cooldown:${fingerprint}`;
  const exists = await safeGet(key);
  return !exists;
}

async function setLikeCooldown(fingerprint: string): Promise<void> {
  const key = `cooldown:${fingerprint}`;
  await safeSet(key, "1", Math.floor(LIKE_COOLDOWN / 1000));
}

// Helper function to get client info
function getClientInfo(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const timestamp = new Date().toISOString();

  return { ip, ua, timestamp };
}

// ✅ GET /api/policylike?id=41&fingerprint=abc123
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const fingerprint = url.searchParams.get('fingerprint');
  const { ip } = getClientInfo(request);

  if (!id) {
    return NextResponse.json({ error: 'Missing policy id' }, { status: 400 });
  }

  // Rate limiting
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Policy { id: $pid }) RETURN p.like AS like`,
      { pid: neo4j.int(parseInt(id)) }
    );

    let likeCount = 0;
    if (result.records.length > 0) {
      const raw = result.records[0].get('like');
      likeCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    }

    // ตรวจสอบสถานะการไลค์
    let isLiked = false;
    if (fingerprint) {
      // Check cache first
      const cacheKey = `liked:${fingerprint}:${id}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        isLiked = true;
      } else {
        // Check database
        const check = await session.run(
          `MATCH (f:Fingerprint { id: $fp })-[:LIKED]->(p:Policy { id: $pid }) RETURN COUNT(*) > 0 AS liked`,
          { fp: fingerprint, pid: neo4j.int(parseInt(id)) }
        );

        if (check.records.length > 0) {
          isLiked = check.records[0].get("liked");
          // Update cache if liked
          if (isLiked) {
            await redis.set(cacheKey, "true", { EX: 86400 });
          }
        }
      }
    }

    return NextResponse.json({ like: likeCount, isLiked });
  } catch (error) {
    console.error('❌ GET /api/policylike error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    await session.close();
  }
}

// ✅ POST /api/policylike { id: number, fingerprint: string }
export async function POST(request: Request) {

  const session = driver.session();
  const transaction = session.beginTransaction();

  try {
    console.log("👉 1: checking input");
    const body = await request.json();
    const { id, fingerprint } = body as { id?: number; fingerprint?: string };
    const { ip, ua, timestamp } = getClientInfo(request);
    console.log("✅ /api/policylike success for id:", id);

    // Validate input
    if (typeof id !== 'number' || !fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Rate limiting
    console.log("👉 2: checking rate limit");
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Like cooldown check
    console.log("👉 3: checking redis.get");
    if (!(await checkLikeCooldown(fingerprint))) {
      return NextResponse.json({ error: 'Please wait before liking again' }, { status: 429 });
    }

      // ✅ Multi-layer protection checks

      // 1. Check if IP has liked this policy from any fingerprint (prevent multiple accounts from same IP)
      const ipCheck = await transaction.run(
        `
        MATCH (p:Policy { id: $pid })<-[:LIKED]-(f:Fingerprint)
        WHERE f.ip = $ip AND f.id <> $fp
        RETURN COUNT(*) > 0 AS likedByOtherFingerprint
      `,
        { pid: neo4j.int(id), ip, fp: fingerprint }
      );

      if (ipCheck.records[0].get("likedByOtherFingerprint")) {
        
        await transaction.rollback();
        return NextResponse.json({ error: "Policy already liked from this network" }, { status: 403 });
      }

      // 2. Check if fingerprint has liked this policy
      console.log("👉 3: checking redis.get");
      const cacheKey = `liked:${fingerprint}:${id}`;
      const cached = await redis.get(cacheKey);
      console.log("✅ 3 done");

      let hasLiked = false;
      if (cached) {
        hasLiked = true;
      } else {
        const check = await transaction.run(
          `MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(p:Policy { id: $pid }) RETURN COUNT(r) AS count`,
          { fp: fingerprint, pid: neo4j.int(id) }
        );
        hasLiked = check.records[0].get('count').toInt() > 0;
      }

      // 3. Check for suspicious patterns (same fingerprint liking too many policies recently)
      const suspiciousCheck = await transaction.run(
        `
        MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(:Policy)
        WHERE r.timestamp > datetime() - duration('PT1H')
        RETURN COUNT(r) AS recentLikes
      `,
        { fp: fingerprint }
      );

      const recentLikes = suspiciousCheck.records[0].get('recentLikes').toInt();
      if (recentLikes > 20) { // Max 20 likes per hour
        await transaction.rollback();
        return NextResponse.json({ error: "Suspicious activity detected" }, { status: 403 });
      }
console.log("👉 4: Neo4j check like");
      if (hasLiked) {
        // 🔁 Unlike - Remove like
        await transaction.run(
          `
          MATCH (f:Fingerprint { id: $fp })-[r:LIKED]->(p:Policy { id: $pid })
          DELETE r
          SET p.like = CASE WHEN coalesce(p.like, 0) - 1 < 0 THEN 0 ELSE p.like - 1 END
          RETURN p.like AS newCount
        `,
          { fp: fingerprint, pid: neo4j.int(id) }
        );

        // Remove from cache
        await redis.del(cacheKey);

        // Log the unlike action
        await transaction.run(
          `
          CREATE (l:LikeLog {
            action: 'unlike',
            policyId: $pid,
            fingerprint: $fp,
            ip: $ip,
            userAgent: $ua,
            timestamp: datetime()
          })
        `,
          { pid: neo4j.int(id), fp: fingerprint, ip, ua }
        );

      } else {
        // 👍 Like - Add like
        await transaction.run(
          `
          MERGE (f:Fingerprint { id: $fp })
          ON CREATE SET f.createdAt = datetime(), f.likeCount = 0
          MERGE (p:Policy { id: $pid })
          ON CREATE SET p.like = 0
          SET f.ip = $ip, 
              f.ua = $ua, 
              f.lastActivity = datetime(),
              f.likeCount = coalesce(f.likeCount, 0) + 1,
              p.like = coalesce(p.like, 0) + 1
          MERGE (f)-[:LIKED { 
            ip: $ip, 
            timestamp: datetime(), 
            ua: $ua 
          }]->(p)
        `,
          { fp: fingerprint, pid: neo4j.int(id), ip, ua }
        );

        // Cache the like
        await redis.set(cacheKey, "true", { EX: 86400 }); // Cache for 1 day

        // Set cooldown
        await setLikeCooldown(fingerprint);

        // Log the like action
        await transaction.run(
          `
          CREATE (l:LikeLog {
            action: 'like',
            policyId: $pid,
            fingerprint: $fp,
            ip: $ip,
            userAgent: $ua,
            timestamp: datetime()
          })
        `,
          { pid: neo4j.int(id), fp: fingerprint, ip, ua }
        );
      }

      // Commit transaction
      await transaction.commit();

      // ✅ Get updated like count
      const result = await session.run(
        `MATCH (p:Policy { id: $pid }) RETURN p.like AS like`,
        { pid: neo4j.int(id) }
      );

      const raw = result.records[0].get('like');
      const newCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;

      return NextResponse.json({
        like: newCount,
        action: hasLiked ? 'unliked' : 'liked'
      });

    } catch (err) {
      console.error("❌ /api/policylike error:", err);
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("⚠️ Rollback failed:", rollbackErr);
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
      await session.close();

    }
  }

