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
import { RecipeDatabase } from "./data/RecipeDatabase";
import { Followers } from "./data/FollowersDatabase";

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
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
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
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.get("/user/profile", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;

    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const userDatabase = new UserCookenuDatabase();
    const user = await userDatabase.getUserById(authenticationData.id);

    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: authenticationData.role,
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.post("/recipe", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const id = new IdGenerator().generate();
    const date = new Date();

    const recipeData = {
      title: req.body.title,
      description: req.body.description,
    };

    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const recipe = new RecipeDatabase();
    recipe.createRecipe(
      id,
      recipeData.title,
      recipeData.description,
      date,
      authenticationData.id
    );

    res.status(200).send({
      message: "Success",
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.get("/recipe/:id", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const id = req.params.id;

    const recipeDatabase = new RecipeDatabase();
    const recipe = await recipeDatabase.getRecipeById(id);

    res.status(200).send({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      cratedAt: recipe.date,
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.post("/user/follow", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const userToFollowId = req.body.userToFollowId;

    if (!userToFollowId || userToFollowId === "") {
      throw new Error("User not found");
    }

    const followersDatabase = new Followers();
    await followersDatabase.createFollower(
      authenticationData.id,
      userToFollowId
    );

    res.status(200).send({
      message: "Followed successfully",
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.post("/user/unfollow", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const userToUnfollowId = req.body.userToFollowId;

    if (!userToUnfollowId || userToUnfollowId === "") {
      throw new Error("User not found");
    }

    const followersDatabase = new Followers();
    await followersDatabase.unfollow(authenticationData.id, userToUnfollowId);

    res.status(200).send({
      message: "Unfollowed successfully",
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

app.get("/user/feed", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const followersDatabase = new Followers();

    const feed = await followersDatabase.getFeed(authenticationData.id)

    res.status(200).send({
      feed,
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
});

app.get("/user/:id", async (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;

    const authenticator = new Authenticator();
    const authenticationData = authenticator.getData(token);

    const id = req.params.id

    const userDatabase = new UserCookenuDatabase();
    const user = await userDatabase.getUserById(id);

    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: authenticationData.role,
    });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
  await BaseDatabase.destroyConnection();
});

const server = app.listen(process.env.PORT || 3000, () => {
  if (server) {
    const address = server.address() as AddressInfo;
    console.log(`Server is running in http://localhost:${address.port}`);
  } else {
    console.error(`Failure upon starting server.`);
  }
});