import mongoose from "mongoose";
import dotenv from "dotenv"
import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import { Server } from "socket.io";
import { createServer } from 'node:http';
import planRoutes from "./routes/planRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import superAdminRoute from "./routes/superAdminRoute.js";
import organizationRoute from "./routes/organizationRoutes.js";
import teamMemberRoute from "./routes/teamMemberRoute.js";
import contactRoute from "./routes/contactRoutes.js";
import companyRoute from "./routes/companyRoutes.js";
import productRoute from "./routes/productRoutes.js";
import noteRoute from "./routes/noteRoutes.js";
import categortRoute from "./routes/categoryRoute.js";
import path from "path";
import { fileURLToPath } from "url";
import userDetailsRoutes from "./routes/userDetailsRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";
import stageRoutes from "./routes/stageRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import authRoute from "./routes/authRoutes.js";
import permissionRoute from "./routes/permissionRoutes.js"
import teamMemberPermissionRoute from "./routes/teamMemberPermissionRoutes.js"

// Import models to ensure they are registered
import "./models/index.js";

dotenv.config({
    path:"./env"
})

const app = express()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
    origin:process.env.CORS_ORIGIN
}))
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static("public"))
app.use(cookieParser())

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.set("views", path.join(__dirname, "view"));
app.set("view engine", "ejs");

// Create HTTP server
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN
  }
})

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


// Routes

app.use("/api/superAdmin", superAdminRoute);
app.use("/api/plan", planRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/organization", organizationRoute);
app.use("/api/team-member", teamMemberRoute);
app.use("/api/contact", contactRoute);
app.use("/api/company", companyRoute);
app.use("/api/product", productRoute);
app.use("/api/note", noteRoute);
app.use("/api/category", categortRoute);
app.use("/api/user-details", userDetailsRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/stage", stageRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/auth",authRoute);
app.use("/api/permission",permissionRoute)
app.use("/api/assignPermission",teamMemberPermissionRoute)


;(async()=>{
  try{
    const DBinstance = await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.DB_NAME}`)
    console.log("DBinstance -->",DBinstance.connection.host)
  }catch(error){
    console.log("ERROR --> ",error)
    process.exit(1)
  }
})().then(()=>{
  server.listen(process.env.PORT,()=>{
        console.log("Server \u0020\u0020\u0020 --> server is running at port", process.env.PORT)
    })
})