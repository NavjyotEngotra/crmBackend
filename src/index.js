import mongoose from "mongoose";
import dotenv from "dotenv"
import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"
import { Server } from "socket.io";
import { createServer } from 'node:http';
import planRoutes from "./routes/planRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import superAdminRoute from "./routes/superAdminRoute.js"

dotenv.config({
    path:"./env"
})

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN
}))
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static("public"))
app.use(cookieParser())

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