# Recipe Book API Documentation

This document provides details about the GraphQL API for the Recipe Book application. The API is hosted at [https://recipebookapi.vercel.app/](https://recipebookapi.vercel.app/).

## API Overview

- **Base URL**: [https://recipebookapi.vercel.app/](https://recipebookapi.vercel.app/)
- **Endpoint**: `/`
- **Request Type**: POST
- **Content-Type**: `application/json`

The API supports the following functionality:
- User authentication (registration and login)
- Fetching user details
- CRUD operations for recipes
- Fetching ingredients and categories

---

## Quick Start Example

### Register a User

```http
POST https://recipebookapi.vercel.app/
```

**Request Body**:
```json
{
  "query": "mutation registerUser($username: String!, $email: String!, $password: String!) { registerUser(username: $username, email: $email, password: $password) { token user { id username email } } }",
  "variables": {
    "username": "",
    "email": "",
    "password": ""
  }
}
```

**Response**:
```json
{
  "data": {
    "registerUser": {
      "user": {
        "id": "",
        "username": "",
        "email": ""
      }
    }
  }
}
```

---

## Schema and Resolvers Overview

### Queries

#### **Get User Information**
Retrieve details about the authenticated user.

- **Query**:
  ```graphql
  query {
    getUserInformation {
      id
      username
      email
    }
  }
  ```
- **Headers**:
  Authorization: `Bearer <JWT_TOKEN>`

---

#### **Get All Recipes**
Retrieve all recipes, including their ingredients and related details.

- **Query**:
  ```graphql
  query {
    getRecipes {
      id
      title
      description
      difficulty
      time
      ingredients {
        id
        name
      }
      category {
        id
        name
      }
      createdBy {
        id
        username
      }
    }
  }
  ```

---

#### **Get Recipe by ID**
Retrieve a specific recipe by its ID.

- **Query**:
  ```graphql
  query getRecipeById($id: ID!) {
    getRecipeById(id: $id) {
      id
      title
      description
      difficulty
      time
      ingredients {
        id
        name
      }
      category {
        id
        name
      }
      createdBy {
        id
        username
      }
    }
  }
  ```
- **Variables**:
  ```json
  {
    "id": "RECIPE_ID"
  }
  ```

---

#### **Get All Ingredients**
Retrieve all ingredients and their associated recipes.

- **Query**:
  ```graphql
  query {
    getIngredients {
      id
      name
      recipes {
        id
        title
      }
    }
  }
  ```

---

#### **Get Ingredient by ID**
Retrieve a specific ingredient by its ID.

- **Query**:
  ```graphql
  query getIngredientById($id: ID!) {
    getIngredientById(id: $id) {
      id
      name
    }
  }
  ```
- **Variables**:
  ```json
  {
    "id": "INGREDIENT_ID"
  }
  ```

---

### Mutations

#### **Register a User**
Register a new user.

- **Mutation**:
  ```graphql
  mutation registerUser($username: String!, $email: String!, $password: String!) {
    registerUser(username: $username, email: $email, password: $password) {
      token
      user {
        id
        username
        email
      }
    }
  }
  ```
- **Variables**:
  ```json
  {
    "username": "akramo",
    "email": "akramo@example.com",
    "password": "akramo"
  }
  ```

---

#### **Login User**
Authenticate a user and retrieve a token.

- **Mutation**:
  ```graphql
  mutation loginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      user {
        id
        username
        email
      }
    }
  }
  ```
- **Variables**:
  ```json
  {
    "email": "akramo@example.com",
    "password": "akramo"
  }
  ```

---

#### **Create a Recipe**
Add a new recipe.

- **Mutation**:
  ```graphql
  mutation createRecipe(
    $title: String!,
    $description: String!,
    $difficulty: String!,
    $time: Int!,
    $ingredients: [String!]!,
    $category: String!,
    $createdByUserId: ID!
  ) {
    createRecipe(
      title: $title,
      description: $description,
      difficulty: $difficulty,
      time: $time,
      ingredients: $ingredients,
      category: $category,
      createdByUserId: $createdByUserId
    ) {
      id
      title
      description
      difficulty
      time
    }
  }
  ```
- **Variables**:
  ```json
  {
    "title": "Pasta Carbonara",
    "description": "Classic Italian dish.",
    "difficulty": "Medium",
    "time": 30,
    "ingredients": ["Pasta", "Eggs", "Cheese", "Bacon"],
    "category": "Italian",
    "createdByUserId": "USER_ID"
  }
  ```

---

## Authentication

Most queries and mutations require authentication. Use the `Authorization` header to provide your token:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Error Handling

The API returns errors in the following format:
```json
{
  "errors": [
    {
      "message": "Error message here",
      "locations": [{ "line": X, "column": Y }],
      "path": ["path", "to", "field"]
    }
  ]
}
```

---

JWT_SECRET=projectNOSQL
JWT_EXPIRY=30d
