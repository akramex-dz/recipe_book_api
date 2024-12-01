const { ApolloServer } = require("apollo-server");
const { Neo4jGraphQL } = require("@neo4j/graphql");
const jwt = require("jsonwebtoken");
const neo4j = require("neo4j-driver");
const fs = require("fs");
const path = require("path");
const resolvers = require("./resolvers");
require("dotenv").config();

// Load the GraphQL schema
const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf-8"
);

// Connect to Neo4j using environment variables
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function testConnection() {
  const session = driver.session();
  try {
    // Run a simple query to check the connection
    const result = await session.run(
      'RETURN "Connection successful" AS message'
    );
    console.log(result.records[0].get("message")); // Should print: "Connection successful"
  } catch (error) {
    console.error("Error connecting to Neo4j:", error);
  } finally {
    await session.close();
  }
}

// Test connection before starting the server
testConnection();

const neoSchema = new Neo4jGraphQL({ typeDefs, driver, resolvers });

async function startServer() {
  try {
    const schema = await neoSchema.getSchema();
    const server = new ApolloServer({
      schema,
      introspection: true,
      playground: true,
      context: ({ req }) => {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        let user = null;

        try {
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1]; // Extract token
            // Verify the token and decode user data
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = { id: decoded.id }; // Store user information (e.g., ID)
            console.log("Authenticated user:", user);
            return { driver, user }; // Return the user info in context
          } else {
            throw new Error("No Authorization header or invalid format");
          }
        } catch (error) {
          console.error("Authentication error:", error);
          throw new Error("Access denied");
        }
      },
    });

    server
      .listen({ port: process.env.PORT || 4000 })
      .then(({ url }) => {
        console.log(`🚀 GraphQL server ready at ${url}`);
      })
      .catch((error) => {
        console.error("Error starting server:", error);
      });
  } catch (error) {
    console.error("An error occurred while starting the server:", error);
  }
}

startServer();
