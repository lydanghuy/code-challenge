import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Simulate dedicated external server logger 
  // [NOTE: In a true production server ecosystem, this explicitly ships structural logs to Elastic Kibana, Grafana Loki, Datadog etc.]
  console.error("[PRODUCTION SYSTEM LOGGER SIMULATION EXECUTED] Critical exception intercepted: ", err.message || err);

  // Return perfectly sanitized unified generic payload natively securing stack trace obfuscation for security
  res.status(500).json({ error: "Internal server error" });
};
