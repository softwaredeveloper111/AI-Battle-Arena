import { pinoHttp } from "pino-http";
import logger from "./logger.js";


const httpLogger = pinoHttp({
  logger,

  quietReqLogger: true,
  quietResLogger: true,

    customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },


  customSuccessMessage: (req, res) =>
     `${req.method} ${req.url} ${res.statusCode}`,

  customErrorMessage: (req, res , err) =>
   `${req.method} ${req.url} ${res.statusCode} - ${err?.message || "Request failed"}`,

  serializers: {
  res(res) {
    return { statusCode: res.statusCode };
  },
  err() {
      return undefined;
    },
},

});

export default httpLogger;
