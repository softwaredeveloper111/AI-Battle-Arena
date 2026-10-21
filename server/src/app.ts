import express from "express";
import httpLogger from "./lib/httpLogger.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import authRouter from "./routes/auth.route.js";
import BattleRouter from "./routes/battle.route.js"

import cors from "cors"
import config from "./config/config.js"


const app = express();


/**
 * application middlewares
 */
app.set("trust proxy", 1);
app.use(express.static("public"));
app.use(express.json({ limit: "50kb" })); //Maximum request body size 50 KB allowed hai
app.use(express.urlencoded({ extended: true, limit: "10kb" })); //Maximum request body size 10 KB allowed hai.
app.use(cookieParser());
app.use(httpLogger);
app.use(passport.initialize());



/**
 * CORS configeration
 */
const allowedOrigins = [
  "http://localhost:5173",
  config.FRONTEND_URL,
]
app.use(cors({
  origin:function(origin,callback){

    if(!origin){
      return callback(null,true);
    }
    if(allowedOrigins.includes(origin)){
      return callback(null,true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  credentials:true,
  methods:["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders:["Content-Type","Authorization"]
}));




/**
 * routes
 */
app.use("/api/auth", authRouter);
app.use("/api/battle", BattleRouter);

/**
 * health check routes
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    app: "AI Battle Arena API",
    version: "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "AI Battle Arena API is running" });
});

/**
 * global error handler
 */
app.use(errorHandler);

export default app;
