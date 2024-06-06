const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const app = express();

app.use(express.json());

let database;

const initializeDBandServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, "todoApplication.db"),
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log(`Server is running on http://localhost:3000/`);
    });
  } catch (error) {
    console.log(`Database error is ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const hasPriorityAndStatusProperties = (requestQuery) =>
  requestQuery.priority !== undefined && requestQuery.status !== undefined;

const hasPriorityProperty = (requestQuery) =>
  requestQuery.priority !== undefined;

const hasStatusProperty = (requestQuery) => requestQuery.status !== undefined;

const hasCategoryAndStatus = (requestQuery) =>
  requestQuery.category !== undefined && requestQuery.status !== undefined;

const hasCategoryAndPriority = (requestQuery) =>
  requestQuery.category !== undefined && requestQuery.priority !== undefined;

const hasSearchProperty = (requestQuery) => requestQuery.search_q !== undefined;

const hasCategoryProperty = (requestQuery) =>
  requestQuery.category !== undefined;

const isValidPriority = (priority) =>
  ["HIGH", "MEDIUM", "LOW"].includes(priority);
const isValidStatus = (status) =>
  ["TO DO", "IN PROGRESS", "DONE"].includes(status);
const isValidCategory = (category) =>
  ["WORK", "HOME", "LEARNING"].includes(category);

const outPutResult = (dbObject) => ({
  id: dbObject.id,
  todo: dbObject.todo,
  priority: dbObject.priority,
  category: dbObject.category,
  status: dbObject.status,
  dueDate: dbObject.due_date,
});

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  if (search_q) {
    getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%'`;
    data = await database.all(getTodosQuery);
    return response.send(data.map((eachItem) => outPutResult(eachItem)));
  }

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      if (!isValidPriority(priority)) {
        return response.status(400).send("Invalid Todo Priority");
      }
      if (!isValidStatus(status)) {
        return response.status(400).send("Invalid Todo Status");
      }
      getTodosQuery = `SELECT * FROM todo WHERE status = ? AND priority = ?`;
      data = await database.all(getTodosQuery, [status, priority]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    case hasCategoryAndStatus(request.query):
      if (!isValidCategory(category)) {
        return response.status(400).send("Invalid Todo Category");
      }
      if (!isValidStatus(status)) {
        return response.status(400).send("Invalid Todo Status");
      }
      getTodosQuery = `SELECT * FROM todo WHERE category = ? AND status = ?`;
      data = await database.all(getTodosQuery, [category, status]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    case hasCategoryAndPriority(request.query):
      if (!isValidCategory(category)) {
        return response.status(400).send("Invalid Todo Category");
      }
      if (!isValidPriority(priority)) {
        return response.status(400).send("Invalid Todo Priority");
      }
      getTodosQuery = `SELECT * FROM todo WHERE category = ? AND priority = ?`;
      data = await database.all(getTodosQuery, [category, priority]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    case hasPriorityProperty(request.query):
      if (!isValidPriority(priority)) {
        return response.status(400).send("Invalid Todo Priority");
      }
      getTodosQuery = `SELECT * FROM todo WHERE priority = ?`;
      data = await database.all(getTodosQuery, [priority]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    case hasStatusProperty(request.query):
      if (!isValidStatus(status)) {
        return response.status(400).send("Invalid Todo Status");
      }
      getTodosQuery = `SELECT * FROM todo WHERE status = ?`;
      data = await database.all(getTodosQuery, [status]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    case hasCategoryProperty(request.query):
      if (!isValidCategory(category)) {
        return response.status(400).send("Invalid Todo Category");
      }
      getTodosQuery = `SELECT * FROM todo WHERE category = ?`;
      data = await database.all(getTodosQuery, [category]);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));

    default:
      getTodosQuery = `SELECT * FROM todo`;
      data = await database.all(getTodosQuery);
      return response.send(data.map((eachItem) => outPutResult(eachItem)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodosQuery = `SELECT * FROM todo WHERE id = ?`;
  const responseResult = await database.get(getTodosQuery, [todoId]);
  response.send(outPutResult(responseResult));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  if (isValid(new Date(date))) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const requestQuery = `SELECT * FROM todo WHERE due_date = ?`;
    const responseResult = await database.all(requestQuery, [newDate]);
    response.send(responseResult.map((eachItem) => outPutResult(eachItem)));
  } else {
    response.status(400).send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    if (["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
      if (["WORK", "HOME", "LEARNING"].includes(category)) {
        if (isValid(new Date(dueDate))) {
          const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postTodoQuery = `
            INSERT INTO 
              todo (id, todo, category, priority, status, due_date)
            VALUES (?, ?, ?, ?, ?, ?)`;

          await database.run(postTodoQuery, [
            id,
            todo,
            category,
            priority,
            status,
            postNewDueDate,
          ]);

          response.send("Todo Successfully Added");
        } else {
          response.status(400).send("Invalid Due Date");
        }
      } else {
        response.status(400).send("Invalid Todo Category");
      }
    } else {
      response.status(400).send("Invalid Todo Status");
    }
  } else {
    response.status(400).send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;

  const previousTodoQuery = `SELECT * FROM todo WHERE id = ?`;
  const previousTodo = await database.get(previousTodoQuery, [todoId]);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = requestBody;

  let updateTodoQuery;

  if (requestBody.status !== undefined) {
    if (["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
      updateTodoQuery = `
        UPDATE todo SET todo = ?, priority = ?, status = ?, category = ?, due_date = ?
        WHERE id = ?`;
      await database.run(updateTodoQuery, [
        todo,
        priority,
        status,
        category,
        dueDate,
        todoId,
      ]);
      response.send("Status Updated");
    } else {
      response.status(400).send("Invalid Todo Status");
    }
  } else if (requestBody.priority !== undefined) {
    if (["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      updateTodoQuery = `
        UPDATE todo SET todo = ?, priority = ?, status = ?, category = ?, due_date = ?
        WHERE id = ?`;
      await database.run(updateTodoQuery, [
        todo,
        priority,
        status,
        category,
        dueDate,
        todoId,
      ]);
      response.send("Priority Updated");
    } else {
      response.status(400).send("Invalid Todo Priority");
    }
  } else if (requestBody.todo !== undefined) {
    updateTodoQuery = `
      UPDATE todo SET todo = ?, priority = ?, status = ?, category = ?, due_date = ?
      WHERE id = ?`;
    await database.run(updateTodoQuery, [
      todo,
      priority,
      status,
      category,
      dueDate,
      todoId,
    ]);
    response.send("Todo Updated");
  } else if (requestBody.category !== undefined) {
    if (["WORK", "HOME", "LEARNING"].includes(category)) {
      updateTodoQuery = `
        UPDATE todo SET todo = ?, priority = ?, status = ?, category = ?, due_date = ?
        WHERE id = ?`;
      await database.run(updateTodoQuery, [
        todo,
        priority,
        status,
        category,
        dueDate,
        todoId,
      ]);
      response.send("Category Updated");
    } else {
      response.status(400).send("Invalid Todo Category");
    }
  } else if (requestBody.dueDate !== undefined) {
    if (isValid(new Date(dueDate))) {
      const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
      updateTodoQuery = `
        UPDATE todo SET todo = ?, priority = ?, status = ?, category = ?, due_date = ?
        WHERE id = ?`;
      await database.run(updateTodoQuery, [
        todo,
        priority,
        status,
        category,
        newDueDate,
        todoId,
      ]);
      response.send("Due Date Updated");
    } else {
      response.status(400).send("Invalid Due Date");
    }
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ?`;
  await database.run(deleteTodoQuery, [todoId]);
  response.send("Todo Deleted");
});

module.exports = app;
