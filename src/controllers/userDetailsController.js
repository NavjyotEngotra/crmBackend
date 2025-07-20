import { getUserInfo } from "../utilities/getUserInfo.js";
import responseSender from "../utilities/responseSender.js";

export const getUserDetails = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const info = await getUserInfo(token);

        if (!info || info.user.status !== 1) {
            return responseSender(res, 401, false, null, "Unauthorized");
        }

        const userDetails = {
            name: info.user.name,
            email: info.user.email,
            phone: info.user.phone || null,
            contact_number: info.user.phone || null
        };

        return responseSender(res, 200, true, userDetails, "User details fetched successfully");
    } catch (error) {
        return responseSender(res, 500, false, null, error.message || "Server error");
    }
};
