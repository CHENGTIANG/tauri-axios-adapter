use multipart::server::Multipart;
use route_recognizer::Router;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{Cursor, Read},
    thread,
    time::Duration,
};
use tiny_http::{Header, Method, Request, Response, Server};
use url::Url;

type Handler = fn(Request, &route_recognizer::Params, HashMap<String, String>);

pub fn start_server() {
    thread::spawn(|| {
        let server = Server::http("0.0.0.0:8000").expect("Failed to start server");
        println!("Server running on http://localhost:8000");

        let mut get_router = Router::new();
        get_router.add("/get/text", handle_get_text as Handler);
        get_router.add("/get/json", handle_get_json as Handler);
        get_router.add("/redirect", handle_redirect as Handler);
        get_router.add("/delayed", handle_delayed as Handler);
        get_router.add("/download", handle_download as Handler);
        get_router.add("/error", handle_internal_error as Handler);

        let mut post_router = Router::new();
        post_router.add("/post/json", handle_post_json as Handler);
        post_router.add("/post/form", handle_post_form as Handler);
        post_router.add("/upload", handle_upload as Handler);

        for request in server.incoming_requests() {
            let url_str = request.url();
            let url = Url::parse(&format!("http://localhost{}", url_str)).unwrap();
            let query_pairs: HashMap<String, String> = url.query_pairs().into_owned().collect();
            let path = url_str.split('?').next().unwrap_or(url_str);

            match request.method() {
                &Method::Options => {
                    respond_with_cors(request);
                }
                &Method::Get => {
                    if let Ok(matched_route) = get_router.recognize(path) {
                        let handler = matched_route.handler();
                        handler(request, matched_route.params(), query_pairs);
                    } else {
                        respond_not_found(request);
                    }
                }
                &Method::Post => {
                    if let Ok(matched_route) = post_router.recognize(path) {
                        let handler = matched_route.handler();
                        handler(request, matched_route.params(), query_pairs);
                    } else {
                        respond_not_found(request);
                    }
                }
                _ => {
                    respond_not_found(request);
                }
            }
        }
    });
}

fn handle_get_text(
    request: Request,
    _params: &route_recognizer::Params,
    _query: HashMap<String, String>,
) {
    let response = create_text_response("Hello");
    request.respond(response).unwrap();
}

fn handle_get_json(
    request: Request,
    _params: &route_recognizer::Params,
    query: HashMap<String, String>,
) {
    let response_json = json!({
        "success": true,
        "args": query,
    });
    let response = create_json_response(&response_json.to_string());
    request.respond(response).unwrap();
}

fn handle_post_json(
    mut request: Request,
    _params: &route_recognizer::Params,
    query: HashMap<String, String>,
) {
    let mut content = String::new();
    request.as_reader().read_to_string(&mut content).unwrap();

    let received_data: Value = serde_json::from_str(&content).unwrap();
    let response_json = json!({
        "success": true,
        "args": query,
        "data": received_data,
    });

    let response = create_json_response(&response_json.to_string());
    request.respond(response).unwrap();
}

fn handle_post_form(
    mut request: Request,
    _params: &route_recognizer::Params,
    query: HashMap<String, String>,
) {
    let mut body = Vec::new();
    request.as_reader().read_to_end(&mut body).unwrap();
    let body_str = String::from_utf8_lossy(&body);

    let received_data: HashMap<String, String> = form_urlencoded::parse(body_str.as_bytes())
        .into_owned()
        .collect();

    let response_json = json!({
        "success": true,
        "args": query,
        "data": received_data,
    });

    let response = create_json_response(&response_json.to_string());
    request.respond(response).unwrap();
}

fn handle_redirect(
    request: Request,
    _params: &route_recognizer::Params,
    _query: HashMap<String, String>,
) {
    let mut response = Response::empty(302);
    response.add_header(Header::from_bytes(&b"Location"[..], &b"/get/text"[..]).unwrap());
    add_cors_headers(&mut response);
    request.respond(response).unwrap();
}

fn handle_delayed(
    request: Request,
    _params: &route_recognizer::Params,
    _query: HashMap<String, String>,
) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(10));
        let response = create_text_response("This is a delayed response after 10 seconds");
        request.respond(response).unwrap();
    });
}

fn handle_download(
    request: Request,
    _params: &route_recognizer::Params,
    _query: HashMap<String, String>,
) {
    let response = create_file_response();
    request.respond(response).unwrap();
}

fn handle_upload(
    mut request: Request,
    _params: &route_recognizer::Params,
    query: HashMap<String, String>,
) {
    let boundary = request
        .headers()
        .iter()
        .find(|header| header.field.as_str() == "Content-Type")
        .and_then(|header| header.value.as_str().split("boundary=").nth(1))
        .map(String::from);

    let mut response_json = json!({
        "success": true,
        "args": query,
    });

    if let Some(boundary) = boundary {
        let mut data = Vec::new();
        request.as_reader().read_to_end(&mut data).unwrap();

        let cursor = Cursor::new(data);
        let mut multipart = Multipart::with_body(cursor, boundary);
        let mut response_data = json!({});
        while let Ok(Some(mut field)) = multipart.read_entry() {
            let field_name = field.headers.name;
            let mut field_data = Vec::new();
            field.data.read_to_end(&mut field_data).unwrap();

            let value = match std::str::from_utf8(&field_data) {
                Ok(v) => v.to_string(),
                Err(_) => format!("(binary data: {} bytes)", field_data.len()),
            };
            response_data[field_name.to_string()] = Value::String(value);
        }

        response_json["data"] = response_data;

        let response = create_json_response(&response_json.to_string());
        request.respond(response).unwrap();
    } else {
        let response_json = json!({ "success": false });
        let response = create_json_response(&response_json.to_string());
        request.respond(response).unwrap();
    }
}

fn handle_internal_error(
    request: Request,
    _params: &route_recognizer::Params,
    _query: HashMap<String, String>,
) {
    let response_json = json!({
        "code": 500,
        "message": "Internal Server Error"
    });

    let response = create_json_response(&response_json.to_string())
        .with_status_code(500);
    request.respond(response).unwrap();
}

fn create_text_response(body: &str) -> Response<Cursor<Vec<u8>>> {
    let mut response = Response::from_string(body);
    response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"text/plain"[..]).unwrap());
    add_cors_headers(&mut response);
    response
}

fn create_json_response(body: &str) -> Response<Cursor<Vec<u8>>> {
    let mut response = Response::from_string(body);
    response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
    add_cors_headers(&mut response);
    response
}

fn create_file_response() -> Response<Cursor<Vec<u8>>> {
    let content = b"Hello, this is the content of the text file.";
    let mut response = Response::from_data(content.to_vec());
    response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"text/plain"[..]).unwrap());
    response.add_header(
        Header::from_bytes(
            &b"Content-Disposition"[..],
            &b"attachment; filename=\"example.txt\""[..],
        )
        .unwrap(),
    );
    add_cors_headers(&mut response);
    response
}

fn respond_with_cors(request: Request) {
    let mut response = Response::from_string("Hello from TinyHTTP with CORS!");
    response.add_header(
        Header::from_bytes(
            &b"Access-Control-Allow-Methods"[..],
            &b"GET, POST, PUT, DELETE"[..],
        )
        .unwrap(),
    );
    response.add_header(
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap(),
    );
    add_cors_headers(&mut response);
    request.respond(response).unwrap();
}
fn add_cors_headers<T>(response: &mut Response<T>)
where
    T: std::io::Read,
{
    response
        .add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
}

fn respond_not_found(request: Request) {
    let response = create_text_response("404 Not Found")
        .with_status_code(404);
    request.respond(response).unwrap();
}