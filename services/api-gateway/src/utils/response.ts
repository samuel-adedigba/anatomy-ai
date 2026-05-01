import { Response } from "express";
import { ApiSuccess, ApiError } from "../types";

export const successResponse = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): Response<ApiSuccess<T>> => {
  return res.status(statusCode).json({ status: true, message, data });
};

export const errorResponse = (
  res: Response,
  message = "Something went wrong",
  statusCode = 500,
  errors?: unknown
): Response<ApiError> => {
  return res.status(statusCode).json({ status: false, message, errors });
};
