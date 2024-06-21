// benchmark between globalThis.fetch, typed-fetch and typed-fetch with curl engine

import {
  fetch as typedFetch,
  type ResponseType,
  type TRequestInit,
} from "./src";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

function baseFetch<T extends ResponseType>(
  fetcher: typeof fetch | typeof typedFetch<T>,
  options?: TRequestInit
) {
  return fetcher("https://jsonplaceholder.typicode.com/todos/1", options);
}

async function fetchWithGlobalFetch() {
  console.time("Fetch with global fetch");
  await baseFetch<Response>(globalThis.fetch);
  console.timeEnd("Fetch with global fetch");
}

async function fetchWithTypedFetch() {
  console.time("Fetch with typed fetch");
  await baseFetch<Todo>(typedFetch);
  console.timeEnd("Fetch with typed fetch");
}

async function fetchWithTypedFetchAndCurl() {
  console.time("Fetch with typed fetch and curl");
  await baseFetch<Todo>(typedFetch, { engine: "curl" });
  console.timeEnd("Fetch with typed fetch and curl");
}

async function runAndReturnTime(fn: () => Promise<void>) {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function runIterationsInChunks(iterations: number, chunkSize: number, fn: () => Promise<[number, number, number]>) {
  let total = 0;
  let totalTyped = 0;
  let totalTypedCurl = 0;
  let totalGlobal = 0;
  let i = 0;

  console.log("Running benchmark with 100 iterations...\n")

  while (i < iterations) {
    const chunk = Math.min(chunkSize, iterations - i);
    const [averageGlobal, averageTyped, averageTypedCurl] = await fn();
    [totalGlobal, totalTyped, totalTypedCurl] = [
      totalGlobal + averageGlobal,
      totalTyped + averageTyped,
      totalTypedCurl + averageTypedCurl,
    ];
    total += chunk;
    i += chunk;
  }

  console.log("Benchmark completed\n",  `Total iterations: ${total}\n`);

  return [totalGlobal, totalTyped, totalTypedCurl];
}

async function runBenchmark() {
  const iterations = 100;
  let totalAverage = 0;
  let totalAverageTyped = 0;
  let totalAverageTypedCurl = 0;
  let totalAverageGlobal = 0;
  let total = 0;

  const [averageGlobal, averageTyped, averageTypedCurl] = await runIterationsInChunks(iterations, 10, async () => {
    const averageGlobal = await runAndReturnTime(fetchWithGlobalFetch);
    const averageTyped = await runAndReturnTime(fetchWithTypedFetch);
    const averageTypedCurl = await runAndReturnTime(fetchWithTypedFetchAndCurl);

    total += (averageGlobal + averageTyped + averageTypedCurl);

    return [averageGlobal, averageTyped, averageTypedCurl];
  });

  [totalAverageGlobal, totalAverageTyped, totalAverageTypedCurl] = [
    totalAverageGlobal + averageGlobal,
    totalAverageTyped + averageTyped,
    totalAverageTypedCurl + averageTypedCurl,
  ];

  totalAverage = (totalAverageGlobal + totalAverageTyped + totalAverageTypedCurl) / 3;

  console.table({
    iterations,
    total: `${total / 1000}s`,
    "Global fetch": `${totalAverageGlobal / 1000}s`,
    "Typed fetch": `${totalAverageTyped / 1000}s`,
    "Typed fetch with curl": `${totalAverageTypedCurl / 1000}s`,
    "Average": `${Math.floor(totalAverage / 1000)}s`,
  });
}


runBenchmark().catch(console.error);