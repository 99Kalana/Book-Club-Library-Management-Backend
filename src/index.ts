
import express from "express"
import dotenv from "dotenv"
import {connectDB} from "./db/mongo";
import rootRouter from "./routes";
import {errorHandler} from "./middlewares/errorHandler";
import cors from "cors"
import cookieParser from "cookie-parser";

dotenv.config()

const app = express()


const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
    methods:"GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders:["Content-Type", "Authorization"]
}

app.use(cors(corsOptions))

app.use(express.json())

app.use(cookieParser())


const PORT = process.env.PORT || 3000


app.use("/api" , rootRouter)

//use middleware errorhandler
app.use(errorHandler)


connectDB().then(()=>{

    app.listen(PORT, ()=>{
        console.log(`Server running on http://localhost:${PORT}`)
        console.log(`Client Origin (from .env): ${process.env.CLIENT_ORIGIN}`);
    })

}).catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
});

