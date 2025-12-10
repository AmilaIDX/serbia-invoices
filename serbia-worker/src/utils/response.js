const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", ...cors, ...(init.headers || {}) },
    status: init.status || 200,
  });

export const error = (message, status = 400, extra = {}) =>
  json({ error: message, ...extra }, { status });

export const withCors = (res) => {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "content-type,authorization");
  headers.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  return new Response(res.body, { ...res, headers });
};
