import express from "express";
import httpLogger from  "./lib/httpLogger.js";


const app = express();


/**
 * application middlewares
 */
app.use(express.static("public"));
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(httpLogger);






/**
 * health check routes
 */
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime:process.uptime(),
        app: "AI Battle Arena API",
        version: "1.0.0",
        
    });
});



export default app;
