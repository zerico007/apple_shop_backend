const jwt = require("jsonwebtoken");
const RefreshTokenModel = require("./api/models/RefreshTokens/index");
const User = require("./api/models/users");
const moment = require("moment");

const generateToken = (payload) => {
  return new Promise((resolve) => {
    const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
      expiresIn: "5s",
    });
    resolve(token);
  });
};

const generateRefreshToken = (payload) => {
  return new Promise((resolve) => {
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "90 days",
    });
    resolve(refreshToken);
  });
};

const decodeToken = (token, isRefreshToken) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      isRefreshToken
        ? process.env.REFRESH_TOKEN_SECRET
        : process.env.TOKEN_SECRET,
      (error, decoded) => {
        if (error) {
          console.log(error);
          reject(error);
        }
        resolve(decoded);
      }
    );
  });
};

const validate = (authorization, isRefreshToken) => {
  return new Promise(async (resolve, reject) => {
    if (!authorization)
      return reject(new Error("Missing Authorization header"));
    const headerParts = authorization.split(" ");
    if (headerParts.length < 2)
      return reject(new Error("Invalid Authorization header"));
    const token = headerParts[1].toString();
    try {
      const decoded = await decodeToken(token, isRefreshToken);
      resolve(decoded);
    } catch (error) {
      console.warn("Failed to decode token");
      reject(error);
    }
  });
};

const reAuthWithExpiredAccessToken = async (expiredAccessToken) => {
  return new Promise(async (resolve, reject) => {
    const refreshTokenObjectFromDB = await RefreshTokenModel.getById(
      expiredAccessToken
    );
    const { refresh_token, is_used, is_revoked, expiry_date } =
      refreshTokenObjectFromDB;

    if (is_used || is_revoked || moment().isAfter(moment(expiry_date))) {
      return reject(new Error("Session Expired"));
    } else {
      await RefreshTokenModel.updateOne(expiredAccessToken, { is_used: true });
    }

    const authInfo = await validate(`Bearer ${refresh_token}`, true);
    const userId = authInfo.userId;
    const loggedInUser = await User.findOne({ _id: userId }).select(
      "username role email password"
    );
    const { username, password, email, role } = loggedInUser;

    const payload = {
      userId,
      username,
      password,
      email,
      role,
    };

    const token = await generateToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    const decodedRefreshToken = await decodeToken(refreshToken, true);
    const { iat, exp } = decodedRefreshToken;
    await RefreshTokenModel.add({
      _id: token,
      refresh_token: refreshToken,
      issue_date: iat * 1000,
      expiry_date: exp * 1000,
    });

    return resolve({ payload, token });
  });
};

const validationMiddleware = async (req, res, next) => {
  let expiredAccessToken;
  try {
    const authInfo = await validate(req.headers.authorization, false);
    req.authInfo = authInfo;
  } catch (error) {
    if (error.message === "jwt expired") {
      if (req.headers.authorization) {
        const headerParts = req.headers.authorization.split(" ");
        expiredAccessToken = headerParts[1].toString();
      }
    } else return res.status(401).json({ message: error.message });
  }

  if (expiredAccessToken) {
    try {
      const newAuthInfo = await reAuthWithExpiredAccessToken(
        expiredAccessToken
      );
      console.info("refresh token successful", newAuthInfo);

      const { token, payload } = newAuthInfo;

      res.header(
        "Access-Control-Expose-Headers",
        "Shop-Refreshed-Access-Token"
      );

      res.setHeader("Shop-Refreshed-Access-Token", token);

      req.authInfo = payload;
    } catch (error) {
      console.warn("Refresh token failed", error.message);
      return res.status(401).send({ error: error.message });
    }
  }

  next();
};

module.exports = {
  generateToken,
  validationMiddleware,
  generateRefreshToken,
  decodeToken,
};
