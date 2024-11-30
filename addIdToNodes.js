const neo4j = require("neo4j-driver");

require("dotenv").config();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function addIdToNodesWithoutId() {
  const session = driver.session();
  try {
    // Add id to Ingredient nodes without id
    await session.run(`
      MATCH (n:Ingredient)
      WHERE n.id IS NULL
      SET n.id = randomUUID()
    `);

    // Add id to Recipe nodes without id
    await session.run(`
      MATCH (n:Recipe)
      WHERE n.id IS NULL
      SET n.id = randomUUID()
    `);

    // Add id to Category nodes without id
    await session.run(`
      MATCH (n:Category)
      WHERE n.id IS NULL
      SET n.id = randomUUID()
    `);

    // Add id to User nodes without id
    await session.run(`
      MATCH (n:User)
      WHERE n.id IS NULL
      SET n.id = randomUUID()
    `);

    console.log("Successfully added id to nodes without id");
  } catch (error) {
    console.error("Error adding id to nodes:", error);
  } finally {
    await session.close();
  }
}

addIdToNodesWithoutId()
  .then(() => driver.close())
  .catch((error) => {
    console.error("Error closing driver:", error);
  });
