import { describe, expect, it } from "bun:test";
import { fetch } from "./src";

describe("fetch", () => {
  it("should fetch data", async () => {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await res.json();
    expect(data).toEqual({
      userId: 1,
      id: 1,
      title: "delectus aut autem",
      completed: false,
    });
  });
});

describe("fetch with curl engine", () => {
  it("should fetch data using cUrl", async () => {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1", { engine: "curl" });
    const data = await res.json();
    expect(data).toEqual({
      userId: 1,
      id: 1,
      title: "delectus aut autem",
      completed: false,
    });
  })
})

describe("fetch with interceptors", () => {
  it("should modify request using interceptors", async () => {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1", {
      interceptors: [
        (request) => {
          request.headers.set("authorization", "Bearer token");
          const newRequest = new Request(request);
          return newRequest;
        }
      ]
    });
    
    const request = res.request;

    expect(request.headers.get("authorization")).toBe("Bearer token");

  })

  it("should use multiple interceptors", async () => {
    const reses: Request[] = []
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1", {
      interceptors: [
        (request) => {
          request.headers.set("authorization", "Bearer token");
          const newRequest = new Request(request);
          reses.push(newRequest);
          return newRequest;
        },
        (request) => {
          request.headers.set("content-type", "application/json");
          const newRequest = new Request(request);
          reses.push(newRequest);
          return newRequest;
        }
      ]
    });

    const request = res.request;
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(request.headers.get("authorization")).toBe("Bearer token");
  })
})