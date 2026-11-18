import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { usersCollection } from "../db.js";

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

// BetterAuth publishes its signing keys at this address
const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: clientUrl,
      audience: clientUrl,
    });

    // Find the user in the database to get the fresh role
    const userId = payload.sub;
    const user = await usersCollection.findOne({
      _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    });

    if (!user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "customer",
    };
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
}

export function verifyCustomer(req, res, next) {
  if (req.user?.role !== "customer") {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
}

export function verifyTechnician(req, res, next) {
  if (req.user?.role !== "technician") {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
}

export function verifyAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
}