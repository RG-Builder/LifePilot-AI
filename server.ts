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
import { GoogleGenAI } from "@google/genai";

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

const db = new Database("tasks.db");

// Initialize Database with new tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    subscription_plan TEXT DEFAULT 'trial',
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
    duration INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending',
    is_habit INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    deadline DATETIME,
    category TEXT DEFAULT 'general',
    last_completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
`);

// Migrations for existing users
const migrations = [
  "ALTER TABLE users ADD COLUMN firebase_uid TEXT",
  "ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'trial'",
  "ALTER TABLE users ADD COLUMN trial_used INTEGER DEFAULT 0",
];
migrations.forEach(m => { try { db.exec(m); } catch (e) {} });

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://picsum.photos", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'", "https://ais-dev-gwpcgulsgzjfoa24agrtun-551522318424.asia-southeast1.run.app", "https://ais-pre-gwpcgulsgzjfoa24agrtun-551522318424.asia-southeast1.run.app", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use("/api", globalLimiter);

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access denied" });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
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
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      // If Firebase Admin is not initialized, fallback to our JWT for demo purposes
      if (!firebaseAdminInitialized) {
        return authenticateToken(req, res, next);
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      let user = db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(decodedToken.uid) as any;
      
      if (!user) {
        const stmt = db.prepare("INSERT INTO users (firebase_uid, email, subscription_plan) VALUES (?, ?, ?)");
        const info = stmt.run(decodedToken.uid, decodedToken.email, 'trial');
        user = { id: info.lastInsertRowid, firebase_uid: decodedToken.uid, email: decodedToken.email, subscription_plan: 'trial' };
      }
      
      req.user = user;
      next();
    } catch (error: any) {
      console.error("Firebase token verification failed:", error);
      
      // Check for project mismatch (aud claim error)
      if (error.message && error.message.includes('incorrect "aud" (audience) claim')) {
        return res.status(401).json({ 
          error: "Project Mismatch", 
          message: "Your browser is sending a token from an old project. Please sign out and sign in again." 
        });
      }
      
      res.status(401).json({ error: "Invalid Firebase token", message: error.message });
    }
  };

  // AI Gateway Logic
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. AI features will fail.");
  }

  app.post("/api/ai/generate", verifyFirebaseToken, aiLimiter, async (req: any, res: any) => {
    let { prompt, systemInstruction } = req.body;
    const userId = req.user.id;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // Basic Input Sanitization
    prompt = String(prompt).substring(0, 2000); // Limit prompt length
    systemInstruction = String(systemInstruction || "You are a helpful assistant.").substring(0, 1000);

    // Check plan limits
    const plan = req.user.subscription_plan;
    const dailyRequests = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(request_time) = date('now')").get(userId) as any;
    
    if (plan === 'trial' && dailyRequests.count >= 3) {
      return res.status(403).json({ error: "Trial limit reached (3 requests). Please upgrade to Premium." });
    } else if (plan === 'premium' && dailyRequests.count >= 50) {
      return res.status(403).json({ error: "Daily premium limit reached (50 requests)." });
    }

    const monthlyTokens = db.prepare("SELECT SUM(tokens_used) as total FROM usage_logs WHERE user_id = ? AND strftime('%m', request_time) = strftime('%m', 'now')").get(userId) as any;
    const tokenLimit = plan === 'trial' ? 10000 : 200000;
    if ((monthlyTokens.total || 0) >= tokenLimit) {
      return res.status(403).json({ error: `Monthly token limit reached (${tokenLimit} tokens).` });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction
        }
      });

      const aiText = response.text;
      
      // Log usage (estimate tokens by length for now as SDK doesn't provide it easily)
      const estimatedTokens = Math.ceil((prompt.length + (aiText?.length || 0)) / 4);
      db.prepare("INSERT INTO usage_logs (user_id, tokens_used, cost) VALUES (?, ?, ?)").run(userId, estimatedTokens, 0);

      res.json({ text: aiText });
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  });

  app.post("/api/usage/log", verifyFirebaseToken, (req: any, res) => {
    const userId = req.user.id;
    const { tokens = 0 } = req.body;
    
    try {
      db.prepare("INSERT INTO usage_logs (user_id, tokens_used, cost) VALUES (?, ?, ?)").run(userId, tokens, 0);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to log usage:", error);
      res.status(500).json({ error: "Failed to log usage" });
    }
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

  app.post("/api/payments/verify", verifyFirebaseToken, async (req: any, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret');
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      db.prepare("UPDATE payments SET razorpay_payment_id = ?, status = 'captured' WHERE razorpay_order_id = ?").run(razorpay_payment_id, razorpay_order_id);
      db.prepare("UPDATE users SET subscription_plan = 'premium' WHERE id = ?").run(userId);
      res.json({ success: true, message: "Payment verified and plan upgraded" });
    } else {
      res.status(400).json({ error: "Invalid signature" });
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
    const { title, importance, duration, is_habit, deadline, category } = req.body;
    const userId = req.user.id;

    // Plan check: Free users can only have 10 tasks
    const user = db.prepare("SELECT subscription_plan FROM users WHERE id = ?").get(userId) as any;
    if (user.subscription_plan === 'trial') {
      const count = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'pending'").get(userId) as any;
      if (count.count >= 10) {
        return res.status(403).json({ error: "Trial users are limited to 10 pending tasks. Upgrade to Premium for unlimited tasks!" });
      }
    }

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

    const stmt = db.prepare("INSERT INTO tasks (user_id, title, importance, duration, is_habit, deadline, category) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const info = stmt.run(userId, title, importance, duration, is_habit ? 1 : 0, deadline || null, category || 'general');
    res.json({ id: info.lastInsertRowid, title, importance, duration, is_habit, deadline, category, status: "pending" });
  });

  app.put("/api/tasks/:id", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const { title, importance, duration, is_habit, deadline, category } = req.body;
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

    const stmt = db.prepare("UPDATE tasks SET title = ?, importance = ?, duration = ?, is_habit = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?");
    stmt.run(title, importance, duration, is_habit ? 1 : 0, deadline || null, category || 'general', id, userId);
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
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY status ASC, importance DESC").all(userId);
    res.json(tasks);
  });

  app.post("/api/tasks/:id/toggle", verifyFirebaseToken, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(Number(id), userId) as any;
    
    if (!task) return res.status(404).json({ error: "Task not found" });

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    let newStreak = task.streak || 0;
    const now = new Date();
    
    if (newStatus === 'completed') {
      if (task.is_habit) {
        const lastCompleted = task.last_completed_at ? new Date(task.last_completed_at) : null;
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
        
        const stmt = db.prepare("UPDATE tasks SET status = 'completed', streak = ?, last_completed_at = ? WHERE id = ? AND user_id = ?");
        stmt.run(newStreak, now.toISOString(), id, userId);
      } else {
        const stmt = db.prepare("UPDATE tasks SET status = 'completed', last_completed_at = ? WHERE id = ? AND user_id = ?");
        stmt.run(now.toISOString(), id, userId);
      }
    } else {
      const stmt = db.prepare("UPDATE tasks SET status = 'pending' WHERE id = ? AND user_id = ?");
      stmt.run(id, userId);
    }
    
    res.json({ success: true, status: newStatus, streak: newStreak });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
