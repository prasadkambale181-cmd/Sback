import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import nayakRoutes from "./routes/nayakRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { escalateOverdueIssues } from "./controllers/issueController.js";

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
    socket.on('joinIssue', (issueId) => socket.join(issueId));
    socket.on('leaveIssue', (issueId) => socket.leave(issueId));
});

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests, please try again later.' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts.' });

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get("/", (req, res) => res.send("SudharNayak API is running..."));

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/nayak", nayakRoutes);

app.use(notFound);
app.use(errorHandler);

// SLA Escalation - runs every hour
setInterval(async () => {
    const count = await escalateOverdueIssues();
    if (count > 0) {
        console.log(`Escalated ${count} overdue issues`);
        io.emit('issuesEscalated', { count });
    }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
