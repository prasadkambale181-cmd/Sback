import express from "express";
import {
    createIssue, getAllIssues, getIssueById, updateIssue, deleteIssue,
    getMyIssues, likeIssue, upvoteIssue, aiAssist, checkDuplicates,
    getAnalytics, getHeatmapData
} from "../controllers/issueController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createIssue).get(getAllIssues);
router.get("/my-issues", protect, getMyIssues);
router.get("/analytics", protect, admin, getAnalytics);
router.get("/heatmap", getHeatmapData);
router.post("/ai-assist", aiAssist);
router.post("/check-duplicates", checkDuplicates);
router.post("/:id/like", protect, likeIssue);
router.post("/:id/upvote", protect, upvoteIssue);
router.route("/:id").get(getIssueById).put(protect, admin, updateIssue).delete(protect, admin, deleteIssue);

export default router;
