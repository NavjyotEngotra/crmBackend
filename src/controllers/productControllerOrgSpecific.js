import Product from "../models/ProductModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import Category from "../models/CategoryModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getUserInfo } from "../utilities/getUserInfo.js";

// Helper function for populating product fields
const populateProductFields = (query) => {
    return query
        .populate('organization_id')
        .populate('category')
        .populate('owner_id', '-password')
        .populate({
            path: 'created_by',
            model: 'Organization',
            select: '-password'
        })
        .populate({
            path: 'created_by',
            model: 'TeamMember',
            select: '-password'
        })
        .populate({
            path: 'updated_by',
            model: 'Organization',
            select: '-password'
        })
        .populate({
            path: 'updated_by',
            model: 'TeamMember',
            select: '-password'
        });
};

// Create Product (only Organization)
export const createProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const {
            name,
            code,
            category,
            price,
            description,
            owner_id,
            tax,
            stockQuantity,
            commissionRate,
            tentativeDate,
        } = req.body;

        if (tax && (tax < 0 || tax > 100)) {
            return res.status(400).json({
                success: false,
                message: "Tax percentage must be between 0 and 100",
            });
        }

        if (stockQuantity && stockQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock quantity must be greater than 0",
            });
        }

        if (commissionRate && (commissionRate < 0 || commissionRate > 100)) {
            return res.status(400).json({
                success: false,
                message: "Commission rate must be between 0 and 100",
            });
        }

        const existingProduct = await Product.findOne({
            organization_id: organizationId,
            $or: [{ name }, { code }],
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message:
                    "Product with same name or code already exists in your organization",
            });
        }

        // ✅ Validate category exists
        const validCategory = await Category.findById(category);
        if (!validCategory) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid category ID" });
        }

        const product = new Product({
            organization_id: organizationId,
            name,
            code,
            category,
            price,
            description,
            tax,
            stockQuantity,
            commissionRate,
            tentativeDate,
            owner_id: req.user.role === "team_member" ? req.user.id : owner_id,
            created_by: info.user._id,
            created_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember',
            updated_by: info.user._id,
            updated_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember'
        });

        await product.save();

        // Fetch the product with populated fields
        const populatedProduct = await populateProductFields(Product.findById(product._id));

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: populatedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const product = await Product.findOne({
            _id: req.params.id,
            organization_id: organizationId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Update the product
        const updatedProduct = await populateProductFields(
            Product.findByIdAndUpdate(
                req.params.id,
                {
                    ...req.body,
                    updated_by: info.user._id,
                    updated_by_model: info.role === 'organization' ? 'Organization' : 'TeamMember'
                },
                { new: true, runValidators: true }
            )
        );

        res.json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Soft Delete
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const product = await Product.findOne({
            _id: req.params.id,
            organization_id: organizationId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        product.status = req.body.status;
        product.updated_by = info.user._id;
        product.updated_by_model = info.role === 'organization' ? 'Organization' : 'TeamMember';

        await product.save();

        const populatedProduct = await populateProductFields(Product.findById(product._id));

        res.json({
            success: true,
            message: "Product status updated successfully",
            product: populatedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Owned Products
export const getOwnedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const products = await populateProductFields(
            Product.find({
                organization_id: organizationId,
                status: 1,
                owner_id: info.user._id
            })
        );

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Search by Category (expects ObjectId)
export const searchProductsByCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const products = await populateProductFields(
            Product.find({
                organization_id: organizationId,
                status: 1,
                category: req.params.id
            })
        );

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Search by Name
export const searchProductsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const products = await populateProductFields(
            Product.find({
                organization_id: organizationId,
                status: 1,
                name: { $regex: req.query.name, $options: "i" }
            })
        );

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get by ID
export const getProductById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const product = await populateProductFields(
            Product.findOne({
                _id: req.params.id,
                organization_id: organizationId
            })
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Deleted Products with Pagination
export const getDeletedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        const products = await populateProductFields(
            Product.find({
                organization_id: organizationId,
                status: 0
            })
        );

        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// All Products with Optional Filters
export const getProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const organizationId = info.user.organization_id || info.user._id;

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        // Filters
        const query = { organization_id: organizationId };

        // Status filter
        if (req.query.status !== undefined) {
            query.status = parseInt(req.query.status);
        } else {
            query.status = 1; // Default to active products
        }

        // Category filter
        if (req.query.category) {
            query.category = new mongoose.Types.ObjectId(req.query.category);
        }

        // Owner filter
        if (req.query.owner_id) {
            query.owner_id = new mongoose.Types.ObjectId(req.query.owner_id);
        }

        // Search by name
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: "i" };
        }

        const [products, totalCount] = await Promise.all([
            populateProductFields(Product.find(query))
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            products,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};