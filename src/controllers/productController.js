import Product from "../models/ProductModel.js";
import TeamMember from "../models/TeamMemberModel.js";
import jwt from "jsonwebtoken";

// Create Product
export const createProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let organizationId;
        
        if (decoded.role === 'organization') {
            organizationId = decoded.id;
        } else {
            const teamMember = await TeamMember.findById(decoded.id);
            if (!teamMember || teamMember.status !== 1) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }
            organizationId = teamMember.organization_id;
        }

        const { name, code, category, price, description, owner_id } = req.body;

        // 🔒 Check for duplicate name or code in the same organization
        const existingProduct = await Product.findOne({
            organization_id: teamMember.organization_id,
            $or: [{ name }
                // , { code }
            ],
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product with the same name or code already exists in your organization",
            });
        }

        const newProduct = new Product({
            organization_id: organizationId,
            name,
            code,
            category,
            price,
            description,
            owner_id,
            createdBy: decoded.role === 'organization' ? decoded.id : decoded.id,
            updatedBy: decoded.role === 'organization' ? decoded.id : decoded.id,
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: newProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;
        const updateData = { ...req.body };

        const product = await Product.findById(id);
        if (!product || product.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // 🔒 Check for uniqueness of name and code within the same organization
        if (updateData.name || updateData.code) {
            const duplicateProduct = await Product.findOne({
                _id: { $ne: id },
                organization_id: teamMember.organization_id,
                $or: [
                    updateData.name ? { name: updateData.name } : {},
                    // updateData.code ? { code: updateData.code } : {},
                ],
            });

            if (duplicateProduct) {
                return res.status(400).json({
                    success: false,
                    message: "Another product with the same name or code already exists in your organization",
                });
            }
        }

        delete updateData.organization_id;
        delete updateData.status;

        updateData.updatedBy = teamMember._id;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

        res.json({ success: true, message: "Product updated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const organizationId = teamMember.organization_id;

        // If product ID is provided, return that product only
        const productId = req.query.id;
        if (productId) {
            const product = await Product.findOne({ _id: productId, organization_id: organizationId });
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            return res.json({ success: true, product });
        }

        // Filters and pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const status = req.query.status !== undefined ? parseInt(req.query.status) : 1; // Default to 1
        const search = req.query.search?.trim();

        const query = { organization_id: organizationId };
        if (!isNaN(status)) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            products,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Deleted Products with Pagination
export const getDeletedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            status: 0,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Product.countDocuments({
            organization_id: teamMember.organization_id,
            status: 0,
        });

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalDeletedProducts: totalCount,
            products,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Soft Delete Product
export const updateStatus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product || product.organization_id.toString() !== teamMember.organization_id.toString())
            return res.status(404).json({ success: false, message: "Product not found" });
        const {status} = req.body ;
        product.status = status;
        product.updatedBy = teamMember._id;

        await product.save();
        res.json({ success: true, message: "Product deleted", product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Product by ID
export const getProductById = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product || product.organization_id.toString() !== teamMember.organization_id.toString()) {
            return res.status(403).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search Product by Name
export const searchProductsByName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Product name is required" });
        }

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            // status: 1, // Only active products
            name: { $regex: name, $options: "i" }, // Case-insensitive search
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search Product by Category
export const searchProductsByCategory = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { category } = req.query;

        if (!category || category.trim() === "") {
            return res.status(400).json({ success: false, message: "Category is required" });
        }

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            status: 1, // Only active products
            category: { $regex: category, $options: "i" }, // Case-insensitive search
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get products Owned by Logged-In Team Member
export const getOwnedProducts = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: "Token missing" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teamMember = await TeamMember.findById(decoded.id);

        if (!teamMember || teamMember.status !== 1)
            return res.status(401).json({ success: false, message: "Unauthorized" });

        const products = await Product.find({
            organization_id: teamMember.organization_id,
            owner_id: teamMember._id,
            status: 1, // only active contacts
        });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};