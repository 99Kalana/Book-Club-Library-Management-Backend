import * as mongoose from "mongoose";

export const connectDB = async () => {
    try{
        await mongoose.connect(process.env.DB_URL as string || "")
        console.log("Connected to MongoDB")
    }catch (error){
        console.error("Error connecting database",error)
        process.exit(1)
    }
}