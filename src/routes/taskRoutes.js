import express from "express";
import {
    createTask,
    updateTask,
    getTasks,
    getTaskById,
    deleteTask,
    getMeetingsAndTasks,
    getMeetingsAndTasksByDate,
} from "../controllers/taskController.js";
import { verifyOrgOrTeamMember } from "../middlewares/combinedAuthMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

router.post("/", verifyOrgOrTeamMember, checkPermission("task.create"), createTask);
router.put("/:id", verifyOrgOrTeamMember, checkPermission("task.update"), updateTask);
router.get("/", verifyOrgOrTeamMember, checkPermission("task.read"), getTasks);
router.get("/meetings-and-tasks", checkPermission("meeting.read"), checkPermission("task.read"), verifyOrgOrTeamMember, getMeetingsAndTasks);
router.get(
    "/meetings-and-tasks-by-date",
    checkPermission("meeting.read"),
    checkPermission("task.read"),
    verifyOrgOrTeamMember,
    getMeetingsAndTasksByDate
);
router.get("/:id", verifyOrgOrTeamMember, checkPermission("task.read"), getTaskById);
router.delete("/:id", verifyOrgOrTeamMember, checkPermission("task.update"), deleteTask);

export default router;
