import express from "express";
import {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    updateStatus,
    getDeletedLeads,
    searchLeadsByName
} from "../controllers/leadController.js";
import { verifyOrgOrTeamMember } from "../middlewares/combinedAuthMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyOrgOrTeamMember);

/**
 * @swagger
 * /api/lead:
 *   post:
 *     tags: [Leads]
 *     summary: Create a new lead
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pipeline_id
 *               - stage_id
 *               - amount
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               pipeline_id:
 *                 type: string
 *               stage_id:
 *                 type: string
 *               assigned_to:
 *                 type: string
 *                 description: ID of the team member assigned to this lead
 *               product_id:
 *                 type: string
 *               company_id:
 *                 type: string
 *               contact_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               quantity:
 *                 type: number
 *               commission:
 *                 type: number
 *               tax:
 *                 type: number
 *               discount:
 *                 type: number
 *               meeting_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", createLead);

/**
 * @swagger
 * /api/lead:
 *   get:
 *     tags: [Leads]
 *     summary: Get all leads with pagination and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Filter by status (0 or 1)
 *       - in: query
 *         name: pipeline_id
 *         schema:
 *           type: string
 *         description: Filter by pipeline ID
 *       - in: query
 *         name: stage_id
 *         schema:
 *           type: string
 *         description: Filter by stage ID
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *         description: Filter by assigned team member ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of leads
 *       401:
 *         description: Unauthorized
 */
router.get("/", getLeads);

/**
 * @swagger
 * /api/lead/search:
 *   get:
 *     tags: [Leads]
 *     summary: Search leads by name
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name to search for
 *     responses:
 *       200:
 *         description: List of matching leads
 *       401:
 *         description: Unauthorized
 */
router.get("/search", searchLeadsByName);

/**
 * @swagger
 * /api/lead/deleted:
 *   get:
 *     tags: [Leads]
 *     summary: Get deleted leads
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted leads
 *       401:
 *         description: Unauthorized
 */
router.get("/deleted", getDeletedLeads);

/**
 * @swagger
 * /api/lead/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Get lead by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.get("/:id", getLeadById);

/**
 * @swagger
 * /api/lead/{id}:
 *   put:
 *     tags: [Leads]
 *     summary: Update lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               pipeline_id:
 *                 type: string
 *               stage_id:
 *                 type: string
 *               product_id:
 *                 type: string
 *               company_id:
 *                 type: string
 *               contact_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               tax:
 *                 type: number
 *               discount:
 *                 type: number
 *               meeting_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.put("/:id", updateLead);

/**
 * @swagger
 * /api/lead/status/{id}:
 *   put:
 *     tags: [Leads]
 *     summary: Update lead status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Lead status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.put("/status/:id", updateStatus);

export default router; 