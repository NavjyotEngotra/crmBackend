
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
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", createProduct);

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
router.get("/", getProducts);

router.put("/update-status/:id" ,updateStatus);
router.put("/:id", updateProduct);
router.get("/getOwnedProducts", getOwnedProducts);
router.get("/deleted", getDeletedProducts);
router.get("/search", searchProductsByName);
router.get("/search-by-catagory", searchProductsByCategory);
router.get("/:id", getProductById);

export default router;
