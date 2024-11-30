const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const resolvers = {
  Query: {
    // user queries
    getUserInformation: async (_, __, { driver, user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }
      const session = driver.session();
      try {
        const result = await session.run(`MATCH (u:User {id: $id}) RETURN u`, {
          id: user.id,
        });
        if (result.records.length === 0) {
          throw new Error("User not found");
        }
        const userData = result.records[0].get("u").properties;
        return userData;
      } catch (error) {
        console.error("Error fetching user information:", error);
        throw new Error("Failed to fetch user information");
      } finally {
        await session.close();
      }
    },
    // recipes queries
    getRecipes: async (_, __, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(`
          MATCH (r:Recipe)
          OPTIONAL MATCH (r)-[:HAS_INGREDIENT]->(i:Ingredient)
          OPTIONAL MATCH (r)-[:BELONGS_TO]->(c:Category)
          WITH r, COLLECT(i { id: i.id, name: i.name }) AS ingredients, c { id: c.id, name: c.name } AS category
          RETURN r {
            .*,
            ingredients: ingredients,
            category: category
          } AS recipe
        `);
        return result.records.map((record) => record.get("recipe"));
      } catch (error) {
        console.error("Error fetching recipes:", error);
        throw new Error("Failed to fetch recipes");
      } finally {
        await session.close();
      }
    },

    getRecipeById: async (_, { id }, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `MATCH (r:Recipe {id: $id}) RETURN r`,
          { id }
        );
        if (result.records.length === 0) {
          throw new Error("Recipe not found");
        }
        const recipe = result.records[0].get("r");
        return {
          id: recipe.properties.id,
          title: recipe.properties.title,
          description: recipe.properties.description,
        };
      } catch (error) {
        console.error("Error fetching recipe:", error);
        throw new Error("Failed to fetch recipe");
      } finally {
        await session.close();
      }
    },

    getIngredients: async (_, __, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(`
          MATCH (i:Ingredient)
          OPTIONAL MATCH (i)<-[:HAS_INGREDIENT]-(r:Recipe)
          WITH i, COLLECT(r { id: r.id, title: r.title }) AS recipes
          RETURN i { id: i.id, name: i.name, recipes: recipes } AS ingredient
        `);
        return result.records.map((record) => record.get("ingredient"));
      } catch (error) {
        console.error("Error fetching ingredients:", error);
        throw new Error("Failed to fetch ingredients");
      } finally {
        await session.close();
      }
    },
  },

  Mutation: {
    // user mutations
    registerUser: async (_, { username, email, password }, { driver }) => {
      const encryptedPassword = await bcrypt.hash(password, 10); // Hash the password
      const session = driver.session();

      try {
        const userExists = await session.run(
          `
      MATCH (u:User {email: $email})
      RETURN u
      `,
          { email }
        );

        if (userExists.records.length) {
          throw new Error("User already exists");
        }

        const result = await session.run(
          `
  CREATE (u:User {id: randomUUID(), username: $username, email: $email, password: $password})
  RETURN u
  `,
          { username, email, password: encryptedPassword }
        );

        if (!result.records.length) {
          throw new Error("User registration failed");
        }

        const user = result.records[0].get("u").properties;

        const token = jwt.sign(
          { id: user.id, email: user.email, username: user.username },
          process.env.JWT_SECRET, // Use a secure secret key from environment variables
          { expiresIn: process.env.JWT_EXPIRY } // Set the expiry time
        );

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        };
      } catch (error) {
        throw new Error("Registration error: " + error.message);
      } finally {
        await session.close();
      }
    },

    loginUser: async (_, { email, password }, { driver }) => {
      const session = driver.session();

      try {
        const result = await session.run(
          `
      MATCH (u:User {email: $email})
      RETURN u
      `,
          { email }
        );

        if (!result.records.length) {
          throw new Error("User not found");
        }

        const user = result.records[0].get("u").properties;

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, username: user.username },
          process.env.JWT_SECRET, // Use a secure secret key from environment variables
          { expiresIn: process.env.JWT_EXPIRY } // Set the expiry time
        );

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        };
      } catch (error) {
        throw new Error("Login error: " + error.message);
      } finally {
        await session.close();
      }
    },

    // recipe mutations
    createRecipe: async (
      _,
      {
        title,
        description,
        difficulty,
        time,
        ingredients,
        category,
        createdByUserId,
      },
      { driver }
    ) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `
          CREATE (r:Recipe {id: randomUUID(), title: $title, description: $description, difficulty: $difficulty, time: $time})
          WITH r
          UNWIND $ingredients AS ingredientName
          MERGE (i:Ingredient {name: ingredientName})
          MERGE (r)-[:HAS_INGREDIENT]->(i)
          WITH r
          MERGE (c:Category {name: $category})
          MERGE (r)-[:BELONGS_TO]->(c)
          WITH r
          MERGE (u:User {id: $createdByUserId})
          MERGE (r)-[:CREATED]->(u)
          RETURN r {
            .*,
            ingredients: [(r)-[:HAS_INGREDIENT]->(i) | i.name],
            category: head([(r)-[:BELONGS_TO]->(c) | c.name]),
            createdBy: head([(r)-[:CREATED]->(u) | u.username])
          } AS recipe
          `,
          {
            title,
            description,
            difficulty,
            time,
            ingredients,
            category,
            createdByUserId,
          }
        );
        return result.records[0].get("recipe");
      } catch (error) {
        console.error("Error creating recipe:", error);
        throw new Error("Failed to create recipe");
      } finally {
        await session.close();
      }
    },

    createIngredient: async (_, { name }, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `
          MERGE (i:Ingredient {name: $name})
          RETURN i {.*} AS ingredient
          `,
          { name }
        );
        const ingredient = result.records[0].get("ingredient");
        return {
          id: ingredient.id,
          name: ingredient.name,
        };
      } catch (error) {
        console.error("Error creating ingredient:", error);
        throw new Error("Failed to create ingredient");
      } finally {
        await session.close();
      }
    },

    createCategory: async (_, { name }, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `
          MERGE (c:Category {name: $name})
          RETURN c {.*} AS category
          `,
          { name }
        );
        const category =
          result.records.length > 0 ? result.records[0].get("category") : null;
        return category ? { id: category.id, name: category.name } : null;
      } catch (error) {
        console.error("Error creating category:", error);
        throw new Error("Failed to create category");
      } finally {
        await session.close();
      }
    },

    updateRecipe: async (
      _,
      { id, title, description, difficulty, time, ingredients, category },
      { driver }
    ) => {
      const session = driver.session();
      try {
        const updateQuery = `
          MATCH (r:Recipe {id: $id})
          SET r.title = COALESCE($title, r.title),
              r.description = COALESCE($description, r.description),
              r.difficulty = COALESCE($difficulty, r.difficulty),
              r.time = COALESCE($time, r.time)
          WITH r
          OPTIONAL MATCH (r)-[ri:HAS_INGREDIENT]->(i:Ingredient)
          DELETE ri
          WITH r
          UNWIND $ingredients AS ingredientName
          MERGE (i:Ingredient {name: ingredientName})
          MERGE (r)-[:HAS_INGREDIENT]->(i)
          OPTIONAL MATCH (r)-[rc:BELONGS_TO]->(c:Category)
          DELETE rc
          WITH r
          MERGE (c:Category {name: $category})
          MERGE (r)-[:BELONGS_TO]->(c)
          RETURN r {
            .*,
            ingredients: [(r)-[:HAS_INGREDIENT]->(i) | i.name],
            category: head([(r)-[:BELONGS_TO]->(c) | c.name])
          } AS recipe
        `;
        const result = await session.run(updateQuery, {
          id,
          title,
          description,
          difficulty,
          time,
          ingredients,
          category,
        });
        const recipe = result.records[0].get("recipe");
        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          difficulty: recipe.difficulty,
          time: recipe.time,
          ingredients: recipe.ingredients,
          category: recipe.category,
        };
      } catch (error) {
        console.error("Error updating recipe:", error);
        throw new Error("Failed to update recipe");
      } finally {
        await session.close();
      }
    },

    deleteRecipe: async (_, { id }, { driver }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `MATCH (r:Recipe {id: $id}) DETACH DELETE r RETURN COUNT(r) AS deletedCount`,
          { id }
        );
        return result.records[0].get("deletedCount") > 0;
      } catch (error) {
        console.error("Error deleting recipe:", error);
        throw new Error("Failed to delete recipe");
      } finally {
        await session.close();
      }
    },
  },
};

module.exports = resolvers;