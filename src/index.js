const { ApolloServer } = require('apollo-server-express');
const { Neo4jGraphQL } = require('@neo4j/graphql');
const neo4j = require('neo4j-driver');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { encrypted: 'ENCRYPTION_OFF' }
);

const typeDefs = `
  type Recipe @node {
    id: ID! @id
    name: String!
    description: String
    ingredients: [String]
  }

  type Query {
    recipes: [Recipe]
    recipeById(id: ID!): Recipe
  }

  type Mutation {
    createRecipe(name: String!, description: String, ingredients: [String]): Recipe
    updateRecipe(id: ID!, name: String, description: String, ingredients: [String]): Recipe
    deleteRecipe(id: ID!): Boolean
  }
`;

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const resolvers = {
  Query: {
    recipes: async () => {
      const session = driver.session();
      try {
        const result = await session.run('MATCH (r:Recipe) RETURN r');
        await session.close();
        return result.records.map(record => ({
          id: record.get('r').identity.low,
          name: record.get('r').properties.name,
          description: record.get('r').properties.description,
          ingredients: record.get('r').properties.ingredients
        }));
      } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      }
    },
    recipeById: async (_, { id }) => {
      const session = driver.session();
      try {
        const result = await session.run('MATCH (r:Recipe {id: $id}) RETURN r', { id });
        await session.close();
        return result.records[0]?.get('r');
      } catch (error) {
        console.error('Error fetching recipe:', error);
        throw error;
      }
    }
  },
  Mutation: {
    createRecipe: async (_, { name, description, ingredients }) => {
      const session = driver.session();
      try {
        console.log('Creating recipe with:', { name, description, ingredients });
      
        const result = await session.run(
          `CREATE (r:Recipe {name: $name, description: $description, ingredients: $ingredients}) 
           RETURN r`,
          {
            name: name,
            description: description || null,
            ingredients: ingredients || []
          }
        );
      
        await session.close();
      
        if (result.records.length === 0) {
          console.error('No records found in the result.');
          return null;
        }
      
        const createdRecipe = result.records[0].get('r');
        console.log('Created recipe:', createdRecipe);
      
        return {
          id: createdRecipe.identity.low,
          name: createdRecipe.properties.name,
          description: createdRecipe.properties.description,
          ingredients: createdRecipe.properties.ingredients
        };
      } catch (error) {
        console.error('Error creating recipe:', error);
        throw error;
      }
    },
    updateRecipe: async (_, { id, name, description, ingredients }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          'MATCH (r:Recipe {id: $id}) SET r.name = $name, r.description = $description, r.ingredients = $ingredients RETURN r',
          { id, name, description, ingredients }
        );
        await session.close();
        return result.records[0]?.get('r');
      } catch (error) {
        console.error('Error updating recipe:', error);
        throw error;
      }
    },
    deleteRecipe: async (_, { id }) => {
      const session = driver.session();
      try {
        const result = await session.run('MATCH (r:Recipe {id: $id}) DELETE r', { id });
        await session.close();
        return result.records.length > 0;
      } catch (error) {
        console.error('Error deleting recipe:', error);
        throw error;
      }
    }
  }
};

async function startServer() {
  const schema = await neoSchema.getSchema();
  const server = new ApolloServer({ schema, resolvers });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000/graphql');
  });
}

startServer().catch((err) => console.error(err));