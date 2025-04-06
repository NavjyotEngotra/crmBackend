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
} from "../controllers/productController.js";
import { isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createProduct);
router.put("/update-status/:id", isAdmin ,updateStatus);
router.put("/:id", updateProduct);
router.get("/", getProducts);
router.get("/getOwnedProducts", getOwnedProducts);
router.get("/deleted", getDeletedProducts);
router.get("/search", searchProductsByName);
router.get("/search-by-catagory", searchProductsByCategory);
router.get("/:id", getProductById);

export default router;
