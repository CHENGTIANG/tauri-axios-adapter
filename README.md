# tauri-axios-adapter

Axios adapter for [Tauri v2](https://v2.tauri.app/) that routes HTTP requests through [`@tauri-apps/plugin-http`](https://v2.tauri.app/reference/javascript/http/).

## Requirements

- Tauri v2
- [axios](https://axios-http.com/) `^1.8.3`
- [@tauri-apps/plugin-http](https://v2.tauri.app/plugin/http/) `^2.0.0`

## Installation

Install this package together with its peer dependencies:

```bash
npm install tauri-axios-adapter axios @tauri-apps/plugin-http
```

```bash
pnpm add tauri-axios-adapter axios @tauri-apps/plugin-http
```

```bash
yarn add tauri-axios-adapter axios @tauri-apps/plugin-http
```

### Register the Tauri HTTP plugin

**Rust** (`src-tauri/Cargo.toml`):

```toml
[dependencies]
tauri-plugin-http = "2"
```

**Rust** (`src-tauri/src/lib.rs`):

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

**JavaScript** (if required by your Tauri setup):

```bash
npm install @tauri-apps/plugin-http
```

### Configure HTTP permissions

Add allowed URL patterns to your capability file, for example `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "core:default",
    {
      "identifier": "http:default",
      "allow": [{ "url": "https://*.example.com/*" }]
    }
  ]
}
```

Requests to URLs outside the configured scope are rejected by Tauri.

## Usage

```typescript
import axios from "axios";
import tauriAxiosAdapter from "tauri-axios-adapter";
// or: import { tauriAxiosAdapter } from "tauri-axios-adapter";

const apiClient = axios.create({
  adapter: tauriAxiosAdapter,
  baseURL: "https://api.example.com",
  timeout: 10000,
});

const response = await apiClient.get("/users");
console.log(response.data);
```

### Tauri-specific fetch options

Tauri HTTP options can be passed through Axios `fetchOptions`:

```typescript
await apiClient.get("/users", {
  fetchOptions: {
    maxRedirections: 5,
    connectTimeout: 5000,
  },
});
```

See the [Tauri HTTP plugin docs](https://v2.tauri.app/reference/javascript/http/) for all supported options.

## Feature support

| Feature | Supported |
| --- | --- |
| `GET` / `POST` / `PUT` / `PATCH` / `DELETE` | Yes |
| `baseURL`, `params`, `paramsSerializer` | Yes |
| `timeout` | Yes |
| `signal` / request cancellation | Yes |
| `responseType`: `json`, `text`, `blob`, `arraybuffer` | Yes |
| `FormData` uploads | Yes |
| `allowAbsoluteUrls` | Yes |
| `fetchOptions` (Tauri HTTP client options) | Yes |
| `onUploadProgress` / `onDownloadProgress` | No |
| `responseType`: `stream`, `document` | No |

## License

[MIT](LICENSE)
