import express from "express";
import {
    createIssue,
    getAllIssues,
    getIssueById,
    updateIssue,
    deleteIssue,
    getMyIssues,
    likeIssue,
} from "../controllers/issueController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createIssue).get(getAllIssues);
router.get("/my-issues", protect, getMyIssues);
router.post("/:id/like", protect, likeIssue);
router
    .route("/:id")
    .get(getIssueById)
    .put(protect, admin, updateIssue)
    .delete(protect, admin, deleteIssue);

export default router;
