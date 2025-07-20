const responseSender = (res, statusCode, success, data = null, message = "") => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

export default responseSender;
