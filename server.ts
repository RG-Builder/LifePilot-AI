import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tasks.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    importance INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    deadline DATETIME,
    is_habit INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_completed_at DATETIME,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrations
const migrations = [
  "ALTER TABLE tasks ADD COLUMN deadline DATETIME",
  "ALTER TABLE tasks ADD COLUMN streak INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN last_completed_at DATETIME",
  "ALTER TABLE tasks ADD COLUMN is_habit INTEGER DEFAULT 0"
];

migrations.forEach(m => {
  try { db.exec(m); } catch (e) {}
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  const parseTaskId = (idParam: string): number | null => {
    const parsed = Number(idParam);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  };

  const validateTaskPayload = (body: any): string | null => {
    const { title, importance, duration, deadline } = body;

    if (typeof title !== "string" || title.trim().length === 0) {
      return "Title is required";
    }
    if (title.length > 120) {
      return "Title must be 120 characters or fewer";
    }
    if (typeof importance !== "number") {
      return "Importance must be a number";
    }
    if (importance < 1 || importance > 10) {
      return "Importance must be between 1 and 10";
    }
    if (typeof duration !== "number") {
      return "Duration must be a number";
    }
    if (duration <= 0 || duration > 1440) {
      return "Duration must be between 1 and 1440";
    }
    if (deadline !== undefined && deadline !== null) {
      const parsed = new Date(deadline);
      if (Number.isNaN(parsed.getTime())) {
        return "Deadline must be a valid datetime";
      }
    }
    return null;
  };

  app.use(express.json());

  // API Endpoints
  app.post("/api/tasks", (req, res) => {
    const { title, importance, duration, is_habit, deadline } = req.body;
    const validationError = validateTaskPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const stmt = db.prepare("INSERT INTO tasks (title, importance, duration, is_habit, deadline) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(title, importance, duration, is_habit ? 1 : 0, deadline || null);
    res.status(201).json({ id: info.lastInsertRowid, title, importance, duration, is_habit: Boolean(is_habit), deadline: deadline || null, status: "pending" });
  });

  app.put("/api/tasks/:id", (req, res) => {
    const parsedId = parseTaskId(req.params.id);
    if (parsedId === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const { title, importance, duration, is_habit, deadline } = req.body;

    const validationError = validateTaskPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const stmt = db.prepare("UPDATE tasks SET title = ?, importance = ?, duration = ?, is_habit = ?, deadline = ? WHERE id = ?");
    const result = stmt.run(title, importance, duration, is_habit ? 1 : 0, deadline || null, parsedId);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const parsedId = parseTaskId(req.params.id);
    if (parsedId === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
    const info = stmt.run(parsedId);
    if (info.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true });
  });

  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY status ASC, importance DESC").all();
    res.json(tasks);
  });

  app.post("/api/tasks/:id/toggle", (req, res) => {
    const parsedId = parseTaskId(req.params.id);
    if (parsedId === null) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(parsedId) as any;
    
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
        
        const stmt = db.prepare("UPDATE tasks SET status = 'completed', streak = ?, last_completed_at = ? WHERE id = ?");
        stmt.run(newStreak, now.toISOString(), parsedId);
      } else {
        const stmt = db.prepare("UPDATE tasks SET status = 'completed', last_completed_at = ? WHERE id = ?");
        stmt.run(now.toISOString(), parsedId);
      }
    } else {
      // Reverting to pending
      const stmt = db.prepare("UPDATE tasks SET status = 'pending' WHERE id = ?");
      stmt.run(parsedId);
    }
    
    res.json({ success: true, status: newStatus, streak: newStreak });
  });

  app.get("/api/analytics", (req, res) => {
    const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_habit = 0").get() as any;
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_habit = 0 AND status = 'completed'").get() as any;
    const habits = db.prepare("SELECT * FROM tasks WHERE is_habit = 1").all() as any[];
    const focusTime = db.prepare("SELECT SUM(duration) as total FROM tasks WHERE status = 'completed'").get() as any;
    
    const productivityScore = totalTasks.count > 0 ? Math.round((completedTasks.count / totalTasks.count) * 100) : 0;
    
    res.json({
      productivityScore,
      totalCompleted: completedTasks.count,
      focusTimeMinutes: focusTime.total || 0,
      habits: habits.map(h => ({ 
        id: h.id,
        title: h.title, 
        streak: h.streak,
        status: h.status
      }))
    });
  });

  app.get("/api/schedule", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'pending'").all() as any[];
    
    const now = new Date();
    
    // Advanced Scheduling Algorithm
    const scoredTasks = tasks.map(task => {
      let score = task.importance * 10; // Base score from importance
      
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 3600);
        
        if (hoursLeft < 0) {
          score += 1000; // Overdue tasks get highest priority
        } else if (hoursLeft < 24) {
          score += 500; // Due within 24h
        } else {
          score += Math.max(0, 100 - hoursLeft); // Closer deadline = higher score
        }
      }
      
      if (task.is_habit) {
        score += 50; // Habits get a consistent boost to ensure routine
      }
      
      return { ...task, score };
    });

    const sortedTasks = scoredTasks.sort((a, b) => b.score - a.score);

    let currentTime = new Date();
    // Start schedule from the next hour or 9 AM, whichever is later.
    // If it's very late (after 10 PM), start from 9 AM tomorrow.
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

      // Add a 10-min buffer for realistic distribution
      currentTime.setMinutes(currentTime.getMinutes() + 10);

      return {
        ...task,
        startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        isOverdue: Boolean(task.deadline && new Date(task.deadline) < now)
      };
    });

    res.json(schedule);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
