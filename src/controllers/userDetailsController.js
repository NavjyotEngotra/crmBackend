
import { getUserInfo } from "../utilities/getUserInfo.js";

export const getUserDetails = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized" 
            });
        }

        const userDetails = {
            name: info.user.name,
            email: info.user.email,
            phone: info.user.phone || null,
            contact_number: info.user.phone || null // Using phone as contact number since that's what's available in the schema
        };

        res.json({ 
            success: true, 
            userDetails 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};
