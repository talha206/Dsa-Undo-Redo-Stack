#include "editor.h"
#include "httplib.h"
#include "json.hpp"
#include "syntax.h"

#include <iostream>
#include <string>

using json = nlohmann::json;

static void setCors(httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

static json bufferStateJson(EditorBuffer &buf) {
    json j;
    j["text"] = buf.getText();
    j["undoSize"] = buf.undoSize();
    j["redoSize"] = buf.redoSize();
    j["undoStack"] = json::array();
    j["redoStack"] = json::array();
    for (const auto &s : buf.undoStackPreviews(5, 20)) {
        j["undoStack"].push_back(s);
    }
    for (const auto &s : buf.redoStackPreviews(5, 20)) {
        j["redoStack"].push_back(s);
    }
    return j;
}

static json bracketTraceJson(const std::vector<BracketTraceEntry> &trace) {
    json arr = json::array();
    for (const auto &e : trace) {
        json o;
        o["bracket"] = std::string(1, e.bracket);
        o["position"] = e.position;
        o["matched"] = e.matched;
        o["pairPosition"] = e.pairPosition;
        arr.push_back(std::move(o));
    }
    return arr;
}

int main() {
    httplib::Server svr;
    EditorBuffer buffer;
    SyntaxChecker syntax;

    svr.set_default_headers({{"Access-Control-Allow-Origin", "*"},
                             {"Access-Control-Allow-Methods", "GET, POST, OPTIONS"},
                             {"Access-Control-Allow-Headers", "Content-Type"}});

    svr.Options(".*", [](const httplib::Request &, httplib::Response &res) {
        setCors(res);
        res.status = 204;
    });

    svr.Post("/type", [&](const httplib::Request &req, httplib::Response &res) {
        setCors(res);
        try {
            auto body = json::parse(req.body.empty() ? "{}" : req.body);
            std::string text = body.value("text", "");
            buffer.type(text);
            res.set_content(bufferStateJson(buffer).dump(), "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            json err;
            err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/undo", [&](const httplib::Request &, httplib::Response &res) {
        setCors(res);
        buffer.undo();
        res.set_content(bufferStateJson(buffer).dump(), "application/json");
    });

    svr.Post("/redo", [&](const httplib::Request &, httplib::Response &res) {
        setCors(res);
        buffer.redo();
        res.set_content(bufferStateJson(buffer).dump(), "application/json");
    });

    svr.Get("/state", [&](const httplib::Request &, httplib::Response &res) {
        setCors(res);
        res.set_content(bufferStateJson(buffer).dump(), "application/json");
    });

    svr.Post("/check", [&](const httplib::Request &req, httplib::Response &res) {
        setCors(res);
        try {
            auto body = json::parse(req.body.empty() ? "{}" : req.body);
            std::string code = body.value("code", "");
            bool ok = syntax.checkBrackets(code);
            std::string msg = syntax.getDetailedResult(code);
            auto trace = syntax.getBracketTrace(code);
            json out;
            out["balanced"] = ok;
            out["message"] = msg;
            out["brackets"] = bracketTraceJson(trace);
            res.set_content(out.dump(), "application/json");
        } catch (const std::exception &e) {
            res.status = 400;
            json err;
            err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    std::cout << "DSA Editor backend listening on http://127.0.0.1:8080\n";
    if (!svr.listen("0.0.0.0", 8080)) {
        std::cerr << "Failed to bind port 8080\n";
        return 1;
    }
    return 0;
}
