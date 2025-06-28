import express from "express";
import {
    createProduct,
    updateProduct,
    updateStatus,
    getProducts,
    getDeletedProducts,
    getProductById,
    searchProductsByName,
    searchProductsByCategory,
    getOwnedProducts
} from "../controllers/productControllerOrgSpecific.js";
import { verifyOrgOrTeamMember } from "../middlewares/combinedAuthMiddleware.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const router = express.Router();

/**
 * @swagger
 * /api/product:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
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
 *               - code
 *               - category
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               category:
 *                 type: string
 *                 description: Category ID (foreign key)
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               tax:
 *                 type: number
 *                 description: Tax percentage
 *               amount:
 *                 type: number
 *               stockQuantity:
 *                 type: number
 *               commissionRate:
 *                 type: number
 *               tentativeDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/",checkPermission("product.create"), verifyOrgOrTeamMember, createProduct);

/**
 * @swagger
 * /api/product:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *       401:
 *         description: Unauthorized
 */
router.get("/",checkPermission("product.read"), getProducts);

router.put("/update-status/:id" ,checkPermission("product.update"),updateStatus);
router.put("/:id", verifyOrgOrTeamMember,checkPermission("product.update"), updateProduct);
router.get("/getOwnedProducts",checkPermission("product.read"), getOwnedProducts);
router.get("/deleted",checkPermission("product.read"), getDeletedProducts);
router.get("/search",checkPermission("product.read"), searchProductsByName);
router.get("/search-by-catagory",checkPermission("product.read"), searchProductsByCategory);
router.get("/:id",checkPermission("product.read"), getProductById);

export default router;