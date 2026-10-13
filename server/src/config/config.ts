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

if(!process.env.GEMINI_API_KEY){
    throw new Error("GEMINI_API_KEY is required in enviroment variables");
}

if(!process.env.MISTRAL_API_KEY){
    throw new Error("MISTRAL_API_KEY is required in enviroment variables");
}

if(!process.env.COHERE_API_KEY){
    throw new Error("COHERE_API_KEY is required in enviroment variables");
}

if(!process.env.BCRYPT_SALT_ROUNDS){
    throw new Error("BCRYPT_SALT_ROUNDS is required in enviroment variables")
}


type CONFIG = {
   readonly NODE_ENV: string;
   readonly PORT: number;
   readonly LOG_LEVEL: string;
   readonly GEMINI_API_KEY: string;
   readonly MISTRAL_API_KEY: string;
   readonly COHERE_API_KEY: string;
   readonly BCRYPT_SALT_ROUNDS: number;
}


const config:CONFIG = { 
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS)
};



export default config;