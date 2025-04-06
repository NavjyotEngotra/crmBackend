import express from "express";
import {
    createProduct,
    updateProduct,
    updateStatus,
    getProducts,
    getDeletedProducts,
    getProductById,
    searchProductsByName,
    searchProductsByCategory
} from "../controllers/productController.js";

const router = express.Router();

router.post("/", createProduct);
router.put("/update-status/:id", updateStatus);
router.put("/:id", updateProduct);
router.get("/", getProducts);
router.get("/deleted", getDeletedProducts);
router.get("/search", searchProductsByName);
router.get("/search-by-catagory", searchProductsByCategory);
router.get("/:id", getProductById);

export default router;
