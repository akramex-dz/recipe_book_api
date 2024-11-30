const resolvers = {
    Query: {
       getRecipes: async (_, __, { driver }) => {
            const session = driver.session();
            try {
              const result = await session.run(`
                MATCH (r:Recipe)
                OPTIONAL MATCH (r)-[:HAS_INGREDIENT]->(i:Ingredient)
                OPTIONAL MATCH (r)-[:BELONGS_TO]->(c:Category)
                RETURN r {
                  .*,
                  ingredients: COLLECT(i { id: i.id, name: i.name }),
                  category: c { id: c.id, name: c.name }
                } AS recipe
              `);
          
              return result.records.map((record) => record.get('recipe'));
            } catch (error) {
              console.error('Error fetching recipes:', error);
              throw new Error('Failed to fetch recipes');
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
            throw new Error('Recipe not found');
          }
          const recipe = result.records[0].get('r');
          return {
            id: recipe.identity.id,
            title: recipe.properties.title,
            description: recipe.properties.description,
          };
        } catch (error) {
          console.error('Error fetching recipe:', error);
          throw new Error('Failed to fetch recipe');
        } finally {
          await session.close();
        }
      },
      getIngredients: async (_, __, { driver }) => {
        const session = driver.session();
        try {
            const result = await session.run(`MATCH (i:Ingredient) RETURN i.id AS id, i.name AS name`);
            return result.records.map(record => ({
              id: record.get('id'),
              name: record.get('name')
            }));
        } catch (error) {
          console.error('Error fetching ingredients:', error);
          throw new Error('Failed to fetch ingredients');
        } finally {
          await session.close();
        }
      }      
    },
  
    Mutation: {
      createRecipe: async (
        _,
        { title, description, difficulty, time, ingredients, category, createdByUserId },
        { driver }
      ) => {
        const session = driver.session();
        try {
          const result = await session.run(
            `
            MERGE (r:Recipe {title: $title, difficulty: $difficulty, time: $time})
            SET r.description = $description
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
          return result.records[0].get('recipe');
        } catch (error) {
          console.error('Error creating recipe:', error);
          throw new Error('Failed to create recipe');
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
            ON CREATE SET i.id = randomUUID()
            RETURN i { id: i.id, name: i.name } AS ingredient
            `,
            { name }
          );
          return result.records[0].get('ingredient');
        } catch (error) {
          console.error('Error creating ingredient:', error);
          throw new Error('Failed to create ingredient');
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
            ON CREATE SET c.id = randomUUID()
            RETURN c { id: c.id, name: c.name } AS category
            `,
            { name }
          );
          return result.records[0].get('category');
        } catch (error) {
          console.error('Error creating category:', error);
          throw new Error('Failed to create category');
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
          return result.records[0].get('recipe');
        } catch (error) {
          console.error('Error updating recipe:', error);
          throw new Error('Failed to update recipe');
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
          return result.records[0].get('deletedCount') > 0;
        } catch (error) {
          console.error('Error deleting recipe:', error);
          throw new Error('Failed to delete recipe');
        } finally {
          await session.close();
        }
      },
    },
  };
  
module.exports = resolvers;
  