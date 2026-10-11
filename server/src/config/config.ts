import "dotenv/config";

if(!process.env.NODE_ENV){
    throw new Error("NODE_ENV is required in enviroment variables");
}

if(!process.env.PORT){
    throw new Error("PORT is required in enviroment variabes");
}

if(!process.env.LOG_LEVEL){
    throw new Error("LOG_LEVEL is required in enviroment variables");
}

type CONFIG = {
    NODE_ENV: string;
    PORT: number;
    LOG_LEVEL: string;
}


const config:CONFIG = { 
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
};



export default config;