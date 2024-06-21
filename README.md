# Typed Fetch
A simple fetch wrapper that allows you to type the response of the fetch request.

## Installation
```bash
# not installable yet
npm install typed-fetch
```

## Usage
```typescript
import { fetch } from 'typed-fetch';

interface User {
  id: number;
  name: string;
}

const response = await fetch<User>('https://jsonplaceholder.typicode.com/users/1');

const user = await response.json(); // automatically typed as User

// response.text() is also typed as string
// response.blob() is also typed as Blob
// any other response method is typed as the type you provided or as `any` if no type is provided
```
### use response body multiple times
```typescript
import { fetch } from 'typed-fetch';

interface User {
  id: number;
  name: string;
}

const response = await fetch<User>('https://jsonplaceholder.typicode.com/users/1');

const user = await response.json(); // automatically typed as User
const user2 = await response.json(); // doesn't error even if body is already read
```
### Use cUrl over native fetch
```typescript
import { fetch } from 'typed-fetch';

interface User {
  id: number;
  name: string;
}

const response = await fetch<User>('https://jsonplaceholder.typicode.com/users/1', {
  engine: 'curl', // supports 'curl' and 'fetch' (default)
});

```

---
This package is highy unstable and is not recommended for production use. It might error from time to time.

