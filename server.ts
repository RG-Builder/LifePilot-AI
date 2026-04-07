console.log("Starting server.ts...");
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import admin from "firebase-admin";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from 'express-rate-limit';
import axios from "axios";
import validator from "validator";
import { OpenRouter } from "@openrouter/sdk";

dotenv.config();

// Initialize Firebase Admin
let firebaseAdminInitialized = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let saString = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
      
      // Handle cases where the secret might be wrapped in quotes
      if (saString.startsWith('"') && saString.endsWith('"')) {
        saString = saString.substring(1, saString.length - 1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }

      if (!saString) {
        console.warn("FIREBASE_SERVICE_ACCOUNT secret is empty. Firebase Auth will fallback to demo mode.");
      } else if (!saString.startsWith('{')) {
        console.error("Firebase Admin initialization failed: FIREBASE_SERVICE_ACCOUNT secret does not look like a JSON object (should start with '{'). It starts with:", saString.substring(0, 20));
      } else {
        const serviceAccount = JSON.parse(saString);
        if (serviceAccount && serviceAccount.project_id && serviceAccount.private_key) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log("Firebase Admin initialized successfully for project:", serviceAccount.project_id);
          firebaseAdminInitialized = true;
        } else {
          const missing = [];
          if (!serviceAccount.project_id) missing.push('project_id');
          if (!serviceAccount.private_key) missing.push('private_key');
          console.error(`Firebase Admin initialization failed: Service account object is missing required fields: ${missing.join(', ')}. Keys found:`, Object.keys(serviceAccount || {}));
        }
      }
    } catch (e: any) {
      console.error("Firebase Admin initialization failed (JSON Parse Error):", e.message);
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
      console.error("Raw secret length:", raw.length);
      console.error("Raw secret start:", raw.substring(0, 20));
    }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT secret is missing. Firebase Auth will fallback to demo mode.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database will be initialized inside startServer

async function startServer() {
  console.log("startServer function called...");
  
  // Initialize Database inside startServer to catch errors
  let db: any;
  try {
    db = new Database("tasks.db");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_uid TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        subscription_plan TEXT DEFAULT 'trial',
        role TEXT DEFAULT 'user',
        trial_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_type TEXT,
        status TEXT,
        start_date DATETIME,
        expiry_date DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tokens_used INTEGER,
        cost REAL,
        request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS ip_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        ip_address TEXT,
        device_id TEXT,
        request_time DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        importance INTEGER DEFAULT 5,
        urgency_score INTEGER DEFAULT 5,
        estimated_effort INTEGER DEFAULT 3,
        impact_level INTEGER DEFAULT 5,
        duration INTEGER DEFAULT 30,
        status TEXT DEFAULT 'pending',
        is_habit INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        deadline DATETIME,
        category TEXT DEFAULT 'general',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        morning_person_score REAL DEFAULT 0.5,
        peak_energy_start TEXT DEFAULT '09:00',
        peak_energy_end TEXT DEFAULT '11:00',
        focus_duration_avg INTEGER DEFAULT 25,
        daily_routine_json TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'short-term',
        status TEXT DEFAULT 'active',
        target_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS focus_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id INTEGER,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        duration_minutes INTEGER,
        distractions_count INTEGER DEFAULT 0,
        efficiency_score INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS ai_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        insight_text TEXT NOT NULL,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS energy_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        energy_level INTEGER,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        frequency TEXT DEFAULT 'daily',
        goal_count INTEGER DEFAULT 1,
        streak INTEGER DEFAULT 0,
        last_completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(habit_id) REFERENCES habits(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        amount REAL,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS ai_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT UNIQUE,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations for existing users
    const migrations = [
      "ALTER TABLE users ADD COLUMN firebase_uid TEXT",
      "ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'trial'",
      "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
      "ALTER TABLE users ADD COLUMN trial_used INTEGER DEFAULT 0",
      "ALTER TABLE tasks ADD COLUMN urgency_score INTEGER DEFAULT 5",
      "ALTER TABLE tasks ADD COLUMN estimated_effort INTEGER DEFAULT 3",
      "ALTER TABLE tasks ADD COLUMN impact_level INTEGER DEFAULT 5",
    ];
    migrations.forEach(m => { try { db.exec(m); } catch (e) {} });
    console.log("Database initialized successfully.");
  } catch (e: any) {
    console.error("Database initialization failed:", e.message);
    throw e; // Re-throw to be caught by startServer().catch()
  }

  const app = express();
  const PORT = 3000;

  // Trust proxy is required when running behind a load balancer (like Cloud Run)
  // to correctly identify client IP for rate limiting.
  app.set('trust proxy', 1);

  // Global Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // AI Specific Rate Limiting
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per window
    message: { error: "Too many AI requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://*.googleapis.com", "https://*.googletagmanager.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://*.firebaseauth.com", "https://apis.google.com", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://picsum.photos", "https://lh3.googleusercontent.com", "https://*.google-analytics.com", "https://*.google.com"],
        connectSrc: [
          "'self'", 
          "https://*.run.app",
          "https://api.razorpay.com", 
          "https://lumberjack.razorpay.com",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "https://*.firebaseapp.com",
          "https://*.firebaseauth.com",
          "https://*.firebasestorage.app",
          "https://*.google-analytics.com",
          "https://*.googletagmanager.com",
          "https://*.google.com",
          "https://*.gstatic.com",
          "https://apis.google.com",
          "https://accounts.google.com"
        ],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://*.firebaseapp.com", "https://*.firebaseauth.com", "https://*.google.com", "https://accounts.google.com"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.run.app", "http://localhost:*", "https://*.firebaseapp.com", "https://*.firebaseauth.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    frameguard: false,
  }));
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.get("/manifest.json", (req, res) => {
    res.sendFile(path.join(__dirname, "manifest.json"));
  });
  app.get("/robots.txt", (req, res) => {
    res.sendFile(path.join(__dirname, "robots.txt"));
  });

  app.use("/api", globalLimiter);

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access denied" });

    jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_only', (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_only')) {
        console.error("CRITICAL SECURITY ERROR: JWT_SECRET is not set in production!");
        return res.status(500).json({ error: "Server configuration error" });
      }
      req.user = user;
      next();
    });
  };

  // Nodemailer Setup
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const sendVerificationEmail = async (email: string, token: string) => {
    const verificationUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
    const supportEmail = "lifepilotai.app@gmail.com";
    const mailOptions = {
      from: `"LifePilot AI" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify your LifePilot AI account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #f9fafb; border-radius: 16px; }
            .content { background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -0.025em; }
            .title { color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px; text-align: center; }
            .text { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
            .button-container { text-align: center; margin: 32px 0; }
            .button { background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block; transition: background-color 0.2s; }
            .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px; }
            .support { color: #6b7280; font-size: 13px; margin-top: 16px; }
            .link { color: #4f46e5; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LifePilot AI</div>
            </div>
            <div class="content">
              <h1 class="title">Verify your email</h1>
              <p class="text">Welcome to LifePilot AI! We're thrilled to have you on board. To start optimizing your productivity and mastering your schedule, please verify your email address by clicking the button below.</p>
              <div class="button-container">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p class="text" style="font-size: 14px; color: #6b7280;">If the button above doesn't work, you can also copy and paste this link into your browser:</p>
              <p class="text" style="font-size: 13px; color: #4f46e5; word-break: break-all;">${verificationUrl}</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 LifePilot AI. All rights reserved.</p>
              <p class="support">Need help? Contact us at <a href="mailto:${supportEmail}" class="link">${supportEmail}</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    await transporter.sendMail(mailOptions);
  };

  // Firebase Auth Middleware
  const verifyFirebaseToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // In production, Firebase Admin MUST be initialized
      if (process.env.NODE_ENV === 'production' && !firebaseAdminInitialized) {
        console.error("CRITICAL: Firebase Admin not initialized in production!");
        return res.status(500).json({ error: "Internal server error" });
      }

      // Fallback for development if service account is missing
      if (!firebaseAdminInitialized) {
        return authenticateToken(req, res, next);
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Fetch user from local DB using Firebase UID
      let user = db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(decodedToken.uid) as any;
      
      if (!user) {
        // Create user if they don't exist in our local DB
        const stmt = db.prepare("INSERT INTO users (firebase_uid, email, subscription_plan, role, trial_used) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(decodedToken.uid, decodedToken.email, 'trial', 'user', 0);
        user = { 
          id: info.lastInsertRowid, 
          firebase_uid: decodedToken.uid, 
          email: decodedToken.email, 
          subscription_plan: 'trial',
          role: 'user',
          trial_used: 0
        };
        console.log(`New user registered: ${decodedToken.email} (${decodedToken.uid})`);
      }
      
      req.user = user;
      next();
    } catch (error: any) {
      console.error("Auth Error:", error.message);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      }
      
      res.status(401).json({ error: "Invalid authentication" });
    }
  };

  // AI Gateway Logic (OpenRouter Multi-Model)
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  const openrouter = new OpenRouter({
    apiKey: OPENROUTER_API_KEY || ""
  });

  const AI_MODELS = {
    PRIMARY: "qwen/qwen-plus", // Qwen Plus for complex logic (resolved 'No endpoints found' error)
    FAST: "stepfun/step-3.5-flash:free"      // Step 3.5 Flash for quick responses and fallback
  };

  const handle_ai_request = async (user: any, prompt: string, taskType: 'simple' | 'complex' = 'simple', systemInstruction: string = "You are a helpful assistant.") => {
    const userId = user.id;
    const plan = user.subscription_plan;

    if (!OPENROUTER_API_KEY) {
      throw new Error("AI service configuration error: API key is missing.");
    }

    // 1. Check Caching (Optimization: minimize redundant calls)
    const promptHash = crypto.createHash('sha256').update(prompt + systemInstruction).digest('hex');
    const cachedResponse = db.prepare("SELECT response FROM ai_cache WHERE prompt_hash = ?").get(promptHash) as any;
    if (cachedResponse) {
      console.log(`AI Cache Hit for user ${userId}`);
      return { text: cachedResponse.response, cached: true };
    }

    // 2. Cost Control & Limits (Strict enforcement)
    const dailyRequests = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(request_time) = date('now')").get(userId) as any;
    const monthlyTokens = db.prepare("SELECT SUM(tokens_used) as total FROM usage_logs WHERE user_id = ? AND strftime('%m', request_time) = strftime('%m', 'now')").get(userId) as any;
    const totalRequests = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ?").get(userId) as any;

    // Free users: max 3 total. Premium: 50/day.
    const limits = plan === 'trial' 
      ? { requests: Infinity, tokens: 10000, total: 3 } 
      : { requests: 50, tokens: 200000, total: Infinity };

    if (plan === 'trial' && totalRequests.count >= limits.total) {
      throw new Error("Free tier limit reached (max 3 requests total). Please upgrade to Premium.");
    }
    if (dailyRequests.count >= limits.requests) {
      throw new Error(`Daily limit reached (50 requests/day). Please try again tomorrow.`);
    }
    if ((monthlyTokens.total || 0) >= limits.tokens) {
      throw new Error("Monthly token limit reached.");
    }

    // 3. Model Routing Logic (Cost-optimized)
    // Simple tasks -> Step Flash. Complex tasks -> Qwen 3.6.
    const selectedModel = taskType === 'simple' ? AI_MODELS.FAST : AI_MODELS.PRIMARY;

    const callAI = async (model: string) => {
      // Use streaming internally to capture reasoning tokens as per user requirement
      const stream = await (openrouter.chat as any).send({
        chatGenerationParams: {
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          stream: true,
          provider: {
            sort: "throughput"
          }
        }
      }, {
        headers: {
          "HTTP-Referer": process.env.APP_URL || "https://ai.studio/build",
          "X-Title": "AI Studio Build Applet"
        }
      });

      let responseText = "";
      let usage: any = null;
      let reasoningTokens = 0;

      for await (const chunk of (stream as any)) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          responseText += content;
        }
        if (chunk.usage) {
          usage = chunk.usage;
          if (chunk.usage.reasoningTokens) {
            reasoningTokens = chunk.usage.reasoningTokens;
            console.log(`\nReasoning tokens for user ${userId}:`, reasoningTokens);
          }
        }
      }

      return {
        text: responseText,
        usage: usage,
        model: model,
        reasoningTokens: reasoningTokens
      };
    };

    try {
      let result;
      try {
        console.log(`Calling AI Model: ${selectedModel} for user ${userId} (Task: ${taskType})`);
        result = await callAI(selectedModel);
      } catch (err: any) {
        console.error(`AI Model ${selectedModel} failed:`, err.message);
        
        // Fallback chain: PRIMARY -> FAST
        if (selectedModel === AI_MODELS.PRIMARY) {
          console.warn(`Falling back to FAST model: ${AI_MODELS.FAST}`);
          result = await callAI(AI_MODELS.FAST);
        } else {
          throw err; // Re-throw if the FAST model itself failed
        }
      }

      const aiText = result.text;
      const tokensUsed = result.usage?.total_tokens || Math.ceil((prompt.length + aiText.length) / 4);

      // 4. Log Usage & Cache
      db.prepare("INSERT INTO usage_logs (user_id, tokens_used, cost) VALUES (?, ?, ?)").run(userId, tokensUsed, 0);
      db.prepare("INSERT OR IGNORE INTO ai_cache (prompt_hash, response) VALUES (?, ?)").run(promptHash, aiText);

      return { text: aiText, cached: false, model: result.model, reasoningTokens: result.reasoningTokens };
    } catch (error: any) {
      // Handle different error structures (Axios vs SDK)
      const errorData = error.response?.data || error.data || error;
      const status = error.response?.status || error.status || error.statusCode;
      
      console.error("AI Request Handler Error:", JSON.stringify(errorData, null, 2) || error.message);
      
      let userMessage = "AI service temporarily unavailable. Please try again later.";
      
      if (status === 401) {
        userMessage = "Invalid AI API configuration. Please contact support.";
      } else if (status === 403) {
        userMessage = "AI service access forbidden. This may be due to environment restrictions or missing headers.";
      } else if (status === 402) {
        userMessage = "AI service quota exceeded. Please try again later.";
      } else if (errorData?.error?.message) {
        userMessage = `AI Error: ${errorData.error.message}`;
      } else if (error.message) {
        userMessage = `AI Error: ${error.message}`;
      }
      
      throw new Error(userMessage);
    }
  };

  app.post("/api/ai/generate", verifyFirebaseToken, aiLimiter, async (req: any, res: any) => {
    let { prompt, systemInstruction, taskType } = req.body;
    const user = req.user;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // Strict Input Sanitization
    prompt = validator.escape(String(prompt).substring(0, 2000));
    systemInstruction = validator.escape(String(systemInstruction || "You are a helpful assistant.").substring(0, 1000));

    try {
      const result = await handle_ai_request(user, prompt, taskType, systemInstruction);
      res.json(result);
    } catch (error: any) {
      res.status(error.message.includes("limit") ? 403 : 500).json({ error: error.message });
    }
  });

  // Usage logging is handled internally by AI generation endpoint
  // Removed public usage logging endpoint to prevent database pollution exploits


  app.get("/api/user/profile", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    let profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any;
    
    if (!profile) {
      db.prepare("INSERT INTO user_profiles (user_id) VALUES (?)").run(userId);
      profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
    }
    
    res.json(profile);
  });

  app.post("/api/user/profile", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const { morning_person_score, peak_energy_start, peak_energy_end, focus_duration_avg, daily_routine_json } = req.body;
    
    db.prepare(`
      UPDATE user_profiles 
      SET morning_person_score = ?, peak_energy_start = ?, peak_energy_end = ?, focus_duration_avg = ?, daily_routine_json = ?, last_updated = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).run(morning_person_score, peak_energy_start, peak_energy_end, focus_duration_avg, daily_routine_json, userId);
    
    res.json({ success: true });
  });

  app.get("/api/goals", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    res.json(goals);
  });

  app.post("/api/goals", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const { title, description, type, target_date } = req.body;
    
    const stmt = db.prepare("INSERT INTO goals (user_id, title, description, type, target_date) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(userId, title, description, type || 'short-term', target_date);
    
    res.json({ id: info.lastInsertRowid, title, description, type, target_date });
  });

  app.post("/api/focus/start", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const { task_id } = req.body;
    
    const stmt = db.prepare("INSERT INTO focus_sessions (user_id, task_id) VALUES (?, ?)");
    const info = stmt.run(userId, task_id);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/focus/end", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const { session_id, distractions_count, efficiency_score } = req.body;
    
    const session = db.prepare("SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?").get(session_id, userId) as any;
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const endTime = new Date();
    const startTime = new Date(session.start_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    db.prepare(`
      UPDATE focus_sessions 
      SET end_time = ?, duration_minutes = ?, distractions_count = ?, efficiency_score = ? 
      WHERE id = ?
    `).run(endTime.toISOString(), durationMinutes, distractions_count || 0, efficiency_score || 5, session_id);
    
    // Update user focus average
    const avgFocus = db.prepare("SELECT AVG(duration_minutes) as avg FROM focus_sessions WHERE user_id = ? AND duration_minutes > 0").get(userId) as any;
    if (avgFocus.avg) {
      db.prepare("UPDATE user_profiles SET focus_duration_avg = ? WHERE user_id = ?").run(Math.round(avgFocus.avg), userId);
    }
    
    res.json({ success: true, durationMinutes });
  });

  app.get("/api/ai/next-action", verifyFirebaseToken, async (req: any, res) => {
    const userId = req.user.id;
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND (status = 'pending' OR status = 'overdue')").all(userId) as any[];
    const profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any;
    
    if (tasks.length === 0) return res.json({ message: "No pending tasks. Time to set a new goal?" });
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Decision Engine Logic
    const scoredTasks = tasks.map(task => {
      let score = (task.importance || 5) * 2 + (task.urgency_score || 5) * 1.5 + (task.impact_level || 5) * 2;
      
      if (task.status === 'overdue') score += 100; // Overdue tasks are top priority
      
      // Energy Fit
      if (profile) {
        const peakStart = parseInt(profile.peak_energy_start.split(':')[0]);
        const peakEnd = parseInt(profile.peak_energy_end.split(':')[0]);
        const isPeak = currentHour >= peakStart && currentHour <= peakEnd;
        
        if (isPeak && task.estimated_effort >= 4) score += 10; // High effort during peak
        if (!isPeak && task.estimated_effort <= 2) score += 5; // Low effort during off-peak
      }
      
      // Deadline pressure
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 3600);
        if (hoursLeft < 24 && hoursLeft > 0) score += 20;
        if (hoursLeft < 4 && hoursLeft > 0) score += 50;
      }
      
      return { ...task, score };
    });
    
    const nextAction = scoredTasks.sort((a, b) => b.score - a.score)[0];
    
    res.json(nextAction);
  });

  app.get("/api/ai/insights", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    
    // Analyze patterns
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ?").all(userId) as any[];
    const completedToday = tasks.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length;
    const pendingHighPriority = tasks.filter(t => t.status === 'pending' && t.importance >= 8).length;
    
    let insight = "Analyzing your performance patterns... stay focused.";
    
    if (completedToday > 3) {
      insight = "Your productivity is peaking today! Keep this momentum.";
    } else if (pendingHighPriority > 2) {
      insight = "You are skipping high-priority missions. Focus on the critical path.";
    } else if (tasks.length > 0) {
      const completionRate = tasks.filter(t => t.status === 'completed').length / tasks.length;
      if (completionRate > 0.7) {
        insight = "Your completion rate is excellent. You're mastering your routine.";
      } else {
        insight = "Consistency is key. Try breaking down larger missions.";
      }
    }

    // Save insight if it's new or different from the last one
    const lastInsight = db.prepare("SELECT * FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId) as any;
    if (!lastInsight || lastInsight.insight_text !== insight) {
      db.prepare("INSERT INTO ai_insights (user_id, insight_text, type) VALUES (?, ?, ?)").run(userId, insight, 'productivity');
    }

    const insights = db.prepare("SELECT * FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").all(userId);
    res.json(insights);
  });

  app.get("/api/usage/status", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const dailyRequests = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(request_time) = date('now')").get(userId) as any;
    const monthlyTokens = db.prepare("SELECT SUM(tokens_used) as total FROM usage_logs WHERE user_id = ? AND strftime('%m', request_time) = strftime('%m', 'now')").get(userId) as any;
    
    res.json({
      plan: req.user.subscription_plan,
      dailyRequests: dailyRequests.count,
      monthlyTokens: monthlyTokens.total || 0,
      limits: req.user.subscription_plan === 'trial' ? { requests: 3, tokens: 10000 } : { requests: 50, tokens: 200000 }
    });
  });

  app.get("/api/auth/me", verifyFirebaseToken, (req: any, res) => {
    res.json(req.user);
  });

  // Razorpay Integration
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
  });

  app.post("/api/payments/create-order", verifyFirebaseToken, async (req: any, res) => {
    const { amount, currency = "INR" } = req.body;
    const userId = req.user.id;

    try {
      const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency,
        receipt: `receipt_order_${userId}_${Date.now()}`,
      };
      const order = await razorpay.orders.create(options);
      
      db.prepare("INSERT INTO payments (user_id, razorpay_order_id, amount, status) VALUES (?, ?, ?, ?)").run(userId, order.id, amount, 'created');
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Order creation failed" });
    }
  });

  // Aliases for requested endpoint names
  app.post("/api/payments/create-payment", verifyFirebaseToken, (req, res) => res.redirect(307, "/api/payments/create-order"));
  app.post("/api/payments/verify-payment", verifyFirebaseToken, (req, res) => res.redirect(307, "/api/payments/verify"));

  app.post("/api/payments/verify", verifyFirebaseToken, async (req: any, res: any) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification details" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("CRITICAL: RAZORPAY_KEY_SECRET is not set!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Server-Side Verification: Confirm payment signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      // Update subscription ONLY after verified payment
      db.transaction(() => {
        db.prepare("UPDATE payments SET razorpay_payment_id = ?, status = 'captured' WHERE razorpay_order_id = ?").run(razorpay_payment_id, razorpay_order_id);
        db.prepare("UPDATE users SET subscription_plan = 'premium' WHERE id = ?").run(userId);
      })();
      
      console.log(`Payment verified for user ${userId}: ${razorpay_payment_id}`);
      res.json({ success: true, message: "Subscription upgraded successfully" });
    } else {
      console.warn(`SUSPICIOUS: Invalid payment signature attempt for user ${userId}`);
      res.status(400).json({ error: "Payment verification failed" });
    }
  });

  app.post("/api/payments/cancel-subscription", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    db.prepare("UPDATE users SET subscription_plan = 'trial' WHERE id = ?").run(userId);
    res.json({ success: true, message: "Subscription cancelled" });
  });

  // Admin Stats
  app.get("/api/admin/stats", verifyFirebaseToken, (req: any, res) => {
    // In a real app, we'd check if req.user.isAdmin
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const premiumUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_plan = 'premium'").get() as any;
    const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks").get() as any;
    const totalPayments = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'captured'").get() as any;

    res.json({
      totalUsers: totalUsers.count,
      premiumUsers: premiumUsers.count,
      totalTasks: totalTasks.count,
      totalRevenue: totalPayments.total || 0
    });
  });

  // API Endpoints
  app.post("/api/tasks", verifyFirebaseToken, (req: any, res) => {
    let { title, importance, urgency_score, estimated_effort, impact_level, duration, is_habit, deadline, category } = req.body;
    const userId = req.user.id;

    // Strict Input Sanitization
    if (title) title = validator.escape(validator.trim(String(title)));
    if (category) category = validator.escape(validator.trim(String(category)));

    // Plan check: Free users can only have 10 tasks
    const user = db.prepare("SELECT subscription_plan FROM users WHERE id = ?").get(userId) as any;
    if (user.subscription_plan === 'trial') {
      const count = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'pending'").get(userId) as any;
      if (count.count >= 10) {
        return res.status(403).json({ error: "Trial limit reached (10 tasks)." });
      }
    }

    if (!title || typeof importance !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ error: "Invalid task data" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "Title too long" });
    }
    if (category && category.length > 50) {
      return res.status(400).json({ error: "Category is too long (max 50 characters)" });
    }
    if (importance < 1 || importance > 10) {
      return res.status(400).json({ error: "Importance must be between 1 and 10" });
    }
    if (duration <= 0) {
      return res.status(400).json({ error: "Duration must be greater than 0" });
    }

    const stmt = db.prepare("INSERT INTO tasks (user_id, title, importance, urgency_score, estimated_effort, impact_level, duration, is_habit, deadline, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(userId, title, importance, urgency_score || 5, estimated_effort || 3, impact_level || 5, duration, is_habit ? 1 : 0, deadline || null, category || 'general');
    res.json({ id: info.lastInsertRowid, title, importance, urgency_score, estimated_effort, impact_level, duration, is_habit, deadline, category, status: "pending" });
  });

  app.put("/api/tasks/:id", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const { title, importance, urgency_score, estimated_effort, impact_level, duration, is_habit, deadline, category } = req.body;
    const userId = req.user.id;
    
    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, userId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (!title || typeof importance !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "Title is too long (max 200 characters)" });
    }
    if (category && category.length > 50) {
      return res.status(400).json({ error: "Category is too long (max 50 characters)" });
    }
    if (importance < 1 || importance > 10) {
      return res.status(400).json({ error: "Importance must be between 1 and 10" });
    }
    if (duration <= 0) {
      return res.status(400).json({ error: "Duration must be greater than 0" });
    }

    const stmt = db.prepare("UPDATE tasks SET title = ?, importance = ?, urgency_score = ?, estimated_effort = ?, impact_level = ?, duration = ?, is_habit = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?");
    stmt.run(title, importance, urgency_score || 5, estimated_effort || 3, impact_level || 5, duration, is_habit ? 1 : 0, deadline || null, category || 'general', id, userId);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const stmt = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    stmt.run(id, userId);
    res.json({ success: true });
  });

  app.get("/api/tasks", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();
    
    // Update status to 'overdue' for pending tasks whose deadline has passed
    db.prepare(`
      UPDATE tasks 
      SET status = 'overdue' 
      WHERE user_id = ? AND status = 'pending' AND deadline < ?
    `).run(userId, now);

    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY status ASC, importance DESC").all(userId);
    res.json(tasks);
  });

  app.post("/api/tasks/:id/toggle", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(Number(id), userId) as any;
    
    if (!task) return res.status(404).json({ error: "Task not found" });

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const now = new Date().toISOString();
    
    if (newStatus === 'completed') {
      const stmt = db.prepare("UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ? AND user_id = ?");
      stmt.run(now, id, userId);
    } else {
      const stmt = db.prepare("UPDATE tasks SET status = 'pending', completed_at = NULL WHERE id = ? AND user_id = ?");
      stmt.run(id, userId);
    }
    
    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    res.json(updatedTask);
  });

  // Habit Endpoints
  app.get("/api/habits", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const habits = db.prepare("SELECT * FROM habits WHERE user_id = ?").all(userId) as any[];
    
    // For each habit, get completion count for the current period
    const habitsWithProgress = habits.map(habit => {
      let periodStart = new Date();
      if (habit.frequency === 'daily') {
        periodStart.setHours(0, 0, 0, 0);
      } else {
        // Weekly - start of the week (Sunday)
        const day = periodStart.getDay();
        periodStart.setDate(periodStart.getDate() - day);
        periodStart.setHours(0, 0, 0, 0);
      }
      
      const completions = db.prepare("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND completed_at >= ?")
        .get(habit.id, periodStart.toISOString()) as any;
      
      return { ...habit, current_count: completions.count };
    });
    
    res.json(habitsWithProgress);
  });

  app.post("/api/habits", verifyFirebaseToken, (req: any, res) => {
    const { title, description, frequency, goal_count } = req.body;
    const userId = req.user.id;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const stmt = db.prepare("INSERT INTO habits (user_id, title, description, frequency, goal_count) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(userId, title, description || null, frequency || 'daily', goal_count || 1);
    res.json({ id: info.lastInsertRowid, title, description, frequency, goal_count, streak: 0 });
  });

  app.put("/api/habits/:id", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const { title, description, frequency, goal_count } = req.body;
    const userId = req.user.id;

    const stmt = db.prepare("UPDATE habits SET title = ?, description = ?, frequency = ?, goal_count = ? WHERE id = ? AND user_id = ?");
    const info = stmt.run(title, description, frequency, goal_count, id, userId);
    
    if (info.changes === 0) return res.status(404).json({ error: "Habit not found" });
    res.json({ success: true });
  });

  app.delete("/api/habits/:id", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    db.prepare("DELETE FROM habit_logs WHERE habit_id = ?").run(id);
    const stmt = db.prepare("DELETE FROM habits WHERE id = ? AND user_id = ?");
    stmt.run(id, userId);
    
    res.json({ success: true });
  });

  app.post("/api/habits/:id/complete", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const habit = db.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?").get(id, userId) as any;
    
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const now = new Date();
    
    // Check if already completed today (for daily habits)
    if (habit.frequency === 'daily') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadyDone = db.prepare("SELECT id FROM habit_logs WHERE habit_id = ? AND completed_at >= ?")
        .get(id, todayStart.toISOString());
      
      if (alreadyDone) return res.status(400).json({ error: "Already completed today" });
    }

    // Insert log
    db.prepare("INSERT INTO habit_logs (habit_id, completed_at) VALUES (?, ?)").run(id, now.toISOString());

    // Update streak for daily habits
    let newStreak = habit.streak;
    if (habit.frequency === 'daily') {
      const lastCompleted = habit.last_completed_at ? new Date(habit.last_completed_at) : null;
      if (lastCompleted) {
        const diffDays = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
    }

    db.prepare("UPDATE habits SET streak = ?, last_completed_at = ? WHERE id = ?").run(newStreak, now.toISOString(), id);
    
    res.json({ success: true, streak: newStreak });
  });

  app.get("/api/habits/stats", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const habits = db.prepare("SELECT * FROM habits WHERE user_id = ?").all(userId) as any[];
    
    const stats = habits.map(habit => {
      // Get completion history for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const history = db.prepare("SELECT date(completed_at) as date, COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND completed_at >= ? GROUP BY date")
        .all(habit.id, thirtyDaysAgo.toISOString()) as any[];
      
      return {
        id: habit.id,
        title: habit.title,
        history
      };
    });
    
    res.json(stats);
  });

  app.get("/api/analytics", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const user = db.prepare("SELECT subscription_plan FROM users WHERE id = ?").get(userId) as any;

    // Premium check: Trial users get basic analytics
    const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_habit = 0").get(userId) as any;
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_habit = 0 AND status = 'completed'").get(userId) as any;
    const habits = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND is_habit = 1").all(userId) as any[];
    const focusTime = db.prepare("SELECT SUM(duration) as total FROM tasks WHERE user_id = ? AND status = 'completed'").get(userId) as any;
    
    const productivityScore = totalTasks.count > 0 ? Math.round((completedTasks.count / totalTasks.count) * 100) : 0;
    
    const basicAnalytics = {
      productivityScore,
      totalCompleted: completedTasks.count,
      focusTimeMinutes: focusTime.total || 0,
      habits: habits.map(h => ({ 
        id: h.id,
        title: h.title, 
        streak: h.streak,
        status: h.status
      }))
    };

    if (user.subscription_plan === 'trial') {
      return res.json(basicAnalytics);
    }

    // Advanced analytics for premium users
    const completionRateByDay = db.prepare(`
      SELECT date(last_completed_at) as day, COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? AND status = 'completed' AND last_completed_at IS NOT NULL
      GROUP BY day 
      ORDER BY day DESC 
      LIMIT 7
    `).all(userId);

    res.json({
      ...basicAnalytics,
      advanced: {
        completionRateByDay
      }
    });
  });

  app.get("/api/schedule", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const user = db.prepare("SELECT subscription_plan FROM users WHERE id = ?").get(userId) as any;
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND status = 'pending'").all(userId) as any[];
    
    const now = new Date();
    
    // Advanced Scheduling Algorithm
    const scoredTasks = tasks.map(task => {
      let score = task.importance * 10;
      
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 3600);
        
        if (hoursLeft < 0) {
          score += 1000;
        } else if (hoursLeft < 24) {
          score += 500;
        } else {
          score += Math.max(0, 100 - hoursLeft);
        }
      }
      
      if (task.is_habit) {
        score += 50;
      }
      
      return { ...task, score };
    });

    // Premium feature: Smart Prioritization
    if (user.subscription_plan === 'premium') {
      // Add more complex scoring for premium
      scoredTasks.forEach(t => {
        if (t.duration > 60) t.score += 20; // Prioritize deep work
      });
    }

    const sortedTasks = scoredTasks.sort((a, b) => b.score - a.score);

    // Premium feature: Custom Start Time (Trial users start at 9 AM)
    let currentTime = new Date();
    if (currentTime.getHours() >= 22) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(9, 0, 0, 0);
    } else if (currentTime.getHours() < 9) {
      currentTime.setHours(9, 0, 0, 0);
    } else {
      currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);
    }

    const schedule = sortedTasks.map(task => {
      const startTime = new Date(currentTime);
      currentTime.setMinutes(currentTime.getMinutes() + task.duration);
      const endTime = new Date(currentTime);

      // Premium feature: Adaptive Buffer (Trial users get fixed 10m)
      const buffer = user.subscription_plan === 'premium' ? 5 : 10;
      currentTime.setMinutes(currentTime.getMinutes() + buffer);

      return {
        ...task,
        startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        isOverdue: task.deadline && new Date(task.deadline) < now
      };
    });

    res.json(schedule);
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Creating Vite server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      console.log("Vite server created successfully.");
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to create Vite server:", e);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  }).on('error', (err: any) => {
    console.error("Server failed to start (listen error):", err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    }
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

startServer().catch(err => {
  console.error("Critical error in startServer execution:", err);
});
