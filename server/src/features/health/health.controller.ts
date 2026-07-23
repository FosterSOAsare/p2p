import type { Request, Response } from "express";
import * as healthService from "./health.service";

export function getHealth(_req: Request, res: Response) {
  res.json(healthService.getHealth());
}
