interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
}

export const successResponse = <T>(data: T, meta?: Record<string, any>): ApiResponse<T> => {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...meta,
    },
  };
};

export const errorResponse = (code: string, message: string): ApiResponse<any> => {
  return {
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
    },
  };
};
