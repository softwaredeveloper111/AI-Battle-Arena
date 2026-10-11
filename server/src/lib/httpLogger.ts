import { pinoHttp } from "pino-http";
import logger from "./logger.js";


const httpLogger = pinoHttp({
  logger,

  quietReqLogger: true,
  quietResLogger: true,

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,

  customErrorMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode} failed`,

  serializers: {
  res(res) {
    return { statusCode: res.statusCode };
  },
},
});

export default httpLogger;
