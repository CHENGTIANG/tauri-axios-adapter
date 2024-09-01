# tauri-axios-adapter

A custom Axios adapter for Tauri v2, designed to seamlessly integrate HTTP requests within Tauri applications.

## Installation

Install the package via npm or yarn:

```bash
npm install tauri-axios-adapter
```

or

```bash
yarn add tauri-axios-adapter
```

## Usage

Here’s how you can use the tauri-axios-adapter in your Tauri project:

```typescript
import axios from "axios";
import tauriAxiosAdapter from "tauri-axios-adapter";

const apiClient = axios.create({
  adapter: tauriAxiosAdapter,
});

// Example request
apiClient
  .get("http://localhost:8000/example-endpoint")
  .then((response) => console.log(response.data))
  .catch((error) => console.error(error));
```


## License

[MIT](LICENSE)