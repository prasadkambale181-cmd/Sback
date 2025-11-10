import express from "express";
import {
    createIssue,
    getAllIssues,
    getIssueById,
    updateIssue,
    deleteIssue,
    getMyIssues,
} from "../controllers/issueController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createIssue).get(getAllIssues);
router.get("/my-issues", protect, getMyIssues);
router
    .route("/:id")
    .get(getIssueById)
    .put(protect, admin, updateIssue)
    .delete(protect, admin, deleteIssue);

export default router;
