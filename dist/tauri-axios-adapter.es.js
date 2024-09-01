import { fetch as x } from "@tauri-apps/plugin-http";
import { AxiosHeaders as P, AxiosError as m } from "axios";
import R from "axios/unsafe/core/buildFullPath.js";
import T from "axios/unsafe/helpers/buildURL.js";
import A from "axios/unsafe/core/settle.js";
const L = async (e) => {
  let {
    baseURL: o,
    url: n,
    params: l,
    paramsSerializer: p,
    method: h,
    data: u,
    timeout: r,
    responseType: a,
    headers: c,
    fetchOptions: w
  } = e;
  n = T(R(o, n), l, p), a = a ? (a + "").toLowerCase() : "text", u instanceof FormData && c.setContentType(null);
  const s = new Request(n, {
    ...w,
    method: h.toUpperCase(),
    body: u,
    headers: c.normalize(!1).toJSON()
  }), d = (async () => {
    try {
      const t = await x(s), f = await C(t, a);
      return new Promise((i, y) => {
        const b = {
          data: f,
          status: t.status,
          statusText: t.statusText,
          headers: P.from(t.headers).normalize(!1),
          config: e,
          request: s
        };
        A(i, y, b);
      });
    } catch (t) {
      throw m.from(t, t && t.code, e, s);
    }
  })();
  if (r && r > 0) {
    const t = new Promise(
      (f, i) => setTimeout(() => {
        i(new m(
          `timeout of ${r}ms exceeded`,
          m.ECONNABORTED,
          e,
          s
        ));
      }, r)
    );
    return await Promise.race([d, t]);
  } else
    return d;
};
async function C(e, o) {
  switch (o) {
    case "json":
      return e.json();
    case "blob":
      return new Blob([await e.blob()], { type: e.headers.get("content-type") ?? void 0 });
    case "arraybuffer":
      return e.arrayBuffer();
  }
  return e.text();
}
export {
  L as default
};
