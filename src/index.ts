import express from "express";
import dotenv from "dotenv";
import knex from "knex";
import { AddressInfo } from "net";
import { Request, Response } from "express";
import { IdGenerator } from "./service/IdGenerator";
import { HashManager } from "./service/HashManager";
import { UserCookenuDatabase } from "./data/UserCookenuDatabase";
import { Authenticator } from "./service/Authenticator";
import { BaseDatabase } from "./data/BaseDatabase";

dotenv.config();

const app = express();
const connection = knex({
  client: "mysql",
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
});
app.use(express.json());

app.post("/signup", async (req: Request, res: Response) => {
  try {
    if (!req.body.email || req.body.email.indexOf("@") === -1) {
      throw new Error("Invalid email");
    }

    if (!req.body.password || req.body.password.length < 6) {
      throw new Error("Invalid password");
    }

    const userData = {
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      role: req.body.role,
    };

    const id = new IdGenerator().generate();

    const hashManager = new HashManager();
    const hashPassword = await hashManager.hash(userData.password);

    const userDatabase = new UserCookenuDatabase();
    await userDatabase.createUser(
      id,
      userData.email,
      userData.name,
      hashPassword,
      userData.role
    );

    const authenticator = new Authenticator();
    const token = authenticator.generateToken({ id, role: userData.role });

    res.status(200).send({
      token,
    });

    await BaseDatabase.destroyConnection();
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  try {
    if (!req.body.email || req.body.email.indexOf("@") === -1) {
      throw new Error("Invalid email");
    }

    const userData = {
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      role: req.body.role,
    };

    const userDatabase = new UserCookenuDatabase();
    const user = await userDatabase.getUserByEmail(userData.email);

    const hashManager = new HashManager();
    const compareResult = hashManager.compare(userData.password, user.password);

    if (!compareResult) {
      throw new Error("Invalid password");
    }

    const authenticator = new Authenticator();
    const token = authenticator.generateToken({
      id: user.id,
      role: user.role,
    });

    res.status(200).send({
      token,
    });

    await BaseDatabase.destroyConnection();
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
});

app.get("/user/profile", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization as string;

    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token)

    const userDatabase = new UserCookenuDatabase();
    const user = await userDatabase.getUserById(authenticationData.id)

    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email
    })

    await BaseDatabase.destroyConnection();
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
});

const server = app.listen(process.env.PORT || 3000, () => {
  if (server) {
    const address = server.address() as AddressInfo;
    console.log(`Server is running in http://localhost:${address.port}`);
  } else {
    console.error(`Failure upon starting server.`);
  }
});
