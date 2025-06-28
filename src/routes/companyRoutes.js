import express from "express";
import {
    createCompany,
    getCompanies,
    getCompanyById,
    getDeletedCompanies,
    searchCompaniesByName,
    updateCompany,
    updateStatus,
    getOwnedCompanies
} from "../controllers/companyController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

/**
 * @swagger
 * /api/company:
 *   post:
 *     tags: [Companies]
 *     summary: Create a new company
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/",checkPermission("company.create"), createCompany);

/**
 * @swagger
 * /api/company:
 *   get:
 *     tags: [Companies]
 *     summary: Get all companies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies
 *       401:
 *         description: Unauthorized
 */
router.get("/",checkPermission("company.read"), getCompanies);

/**
 * @swagger
 * /api/company/search:
 *   get:
 *     tags: [Companies]
 *     summary: Search companies by name
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: List of matching companies
 *       401:
 *         description: Unauthorized
 */
router.get("/search",checkPermission("company.read"), searchCompaniesByName);

/**
 * @swagger
 * /api/company/deleted:
 *   get:
 *     tags: [Companies]
 *     summary: Get deleted companies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted companies
 *       401:
 *         description: Unauthorized
 */
router.get("/deleted",checkPermission("company.read"), getDeletedCompanies);

/**
 * @swagger
 * /api/company/getOwnedCompanies:
 *   get:
 *     tags: [Companies]
 *     summary: Get companies owned by user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of owned companies
 *       401:
 *         description: Unauthorized
 */
router.get("/getOwnedCompanies",checkPermission("company.read"), getOwnedCompanies);

/**
 * @swagger
 * /api/company/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Get company by ID
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
 *         description: Company details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */
router.get("/:id",checkPermission("company.read"), getCompanyById);

/**
 * @swagger
 * /api/company/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Update company
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
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */
router.put("/:id",checkPermission("company.update"), updateCompany);

/**
 * @swagger
 * /api/company/update-status/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Update company status (Admin only)
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
 *               status:
 *                 type: number
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put("/update-status/:id",checkPermission("company.update"), isAdmin, updateStatus);


export default router;
