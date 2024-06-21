import { fetch } from "../src";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

function loggerInterceptor(request: Request) {
  console.log(request);
  return request;
}

async function createTodos() {
  console.time("Fetch with curl")
  // fetch todos
  const response = await fetch<Todo[]>("https://jsonplaceholder.typicode.com/todos/1", {
    //    ^?
    // interceptors: loggerInterceptor,
    engine: 'curl'
  });
  // get todos
  const todos = response.json();
  //    ^?
  console.timeEnd("Fetch with curl")

  return todos;
}

createTodos().then(console.log).catch(console.error);