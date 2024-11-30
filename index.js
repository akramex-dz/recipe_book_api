const { ApolloServer } = require('apollo-server');
const { Neo4jGraphQL } = require('@neo4j/graphql');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers'); 
require('dotenv').config();

// Load the GraphQL schema
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8');

// Connect to Neo4j using environment variables
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Create a Neo4jGraphQL instance
const neoSchema = new Neo4jGraphQL({ typeDefs, driver, resolvers });

async function startServer() {
  try {
    const schema = await neoSchema.getSchema();

    const server = new ApolloServer({
      schema,
      context: ({ req }) => {
        return { driver };
      },
    });

    server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
      console.log(`🚀 GraphQL server ready at ${url}`);
    }).catch(error => {
      console.error('Error starting server:', error);
    });
  } catch (error) {
    console.error('An error occurred while starting the server:', error);
  }
}

startServer();